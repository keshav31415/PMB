package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

type LatencyPayload struct {
	TS   int64  `json:"ts"`
	Seq  int    `json:"seq"`
	Data string `json:"data"`
}

func main() {
	addr := flag.String("addr", "localhost:4222", "Broker TCP address")
	topic := flag.String("topic", "perf.test", "Topic for latency test")
	single := flag.Bool("single", false, "Profile a single message lifecycle with stage breakdown")
	n := flag.Int("n", 1000, "Number of messages for statistical analysis (ignored if -single is set)")
	c := flag.Int("c", 4, "Number of concurrent publisher connections for batch test")
	mode := flag.String("mode", "AT_LEAST_ONCE", "Delivery mode: AT_LEAST_ONCE or AT_MOST_ONCE")
	msg := flag.String("msg", "ping_payload", "Custom message payload for single mode")
	flag.Parse()

	m := strings.ToUpper(*mode)
	if m != "AT_LEAST_ONCE" && m != "AT_MOST_ONCE" {
		log.Fatalf("invalid mode %s: must be AT_LEAST_ONCE or AT_MOST_ONCE", *mode)
	}

	if *single || *n == 1 {
		runSingleProfile(*addr, *topic, m, *msg)
		return
	}

	runBatchStatisticalTest(*addr, *topic, m, *n, *c)
}

func runSingleProfile(addr, topic, mode, msg string) {
	fmt.Println("================================================================")
	fmt.Printf(" Single-Message Lifecycle Latency Profile\n")
	fmt.Printf(" Target: %s | Topic: %s | Mode: %s\n", addr, topic, mode)
	fmt.Println("================================================================")

	// Step 1: Connect subscriber
	subConn, err := net.Dial("tcp", addr)
	if err != nil {
		log.Fatalf("failed to connect subscriber: %v", err)
	}
	defer subConn.Close()

	subID := fmt.Sprintf("lat_sub_%d", time.Now().UnixNano()%10000)
	if _, err := fmt.Fprintf(subConn, "SUB %s %s %s\n", topic, subID, mode); err != nil {
		log.Fatalf("failed to subscribe: %v", err)
	}
	time.Sleep(50 * time.Millisecond) // Ensure broker registered subscription

	// Step 2: Connect publisher
	pubConn, err := net.Dial("tcp", addr)
	if err != nil {
		log.Fatalf("failed to connect publisher: %v", err)
	}
	defer pubConn.Close()

	subReader := bufio.NewReader(subConn)

	// Step 3: Send message with nanosecond timestamp
	t0Send := time.Now()
	payloadObj := LatencyPayload{
		TS:   t0Send.UnixNano(),
		Seq:  1,
		Data: msg,
	}
	payloadBytes, _ := json.Marshal(payloadObj)
	payloadStr := string(payloadBytes)

	if _, err := fmt.Fprintf(pubConn, "PUB %s %s\n", topic, payloadStr); err != nil {
		log.Fatalf("failed to publish: %v", err)
	}

	// Step 4: Subscriber reads message
	msgLine, err := subReader.ReadString('\n')
	t1Recv := time.Now()
	if err != nil {
		log.Fatalf("failed to read MSG: %v", err)
	}

	// Parse message line: MSG <topic> <msg_id> <payload>
	line := strings.TrimRight(msgLine, "\r\n")
	parts := strings.SplitN(line, " ", 4)
	if len(parts) < 4 {
		log.Fatalf("malformed MSG received: %s", line)
	}
	msgID := parts[2]
	recvPayload := parts[3]

	var receivedObj LatencyPayload
	_ = json.Unmarshal([]byte(recvPayload), &receivedObj)

	deliveryLatency := t1Recv.Sub(t0Send)

	var ackDuration time.Duration
	var roundtripDuration time.Duration
	var t2AckSent time.Time
	var t3AckConfirmed time.Time

	if mode == "AT_LEAST_ONCE" {
		t2AckSent = time.Now()
		if _, err := fmt.Fprintf(subConn, "ACK %s %s %s\n", topic, subID, msgID); err != nil {
			log.Fatalf("failed to send ACK: %v", err)
		}
		// Ping broker to establish roundtrip confirmation of ACK delivery
		if _, err := fmt.Fprintf(subConn, "PING\n"); err != nil {
			log.Fatalf("failed to send PING: %v", err)
		}
		pongLine, err := subReader.ReadString('\n')
		t3AckConfirmed = time.Now()
		if err != nil || !strings.HasPrefix(pongLine, "PONG") {
			log.Fatalf("failed to receive PONG confirmation: %v", err)
		}
		ackDuration = t3AckConfirmed.Sub(t2AckSent)
		roundtripDuration = t3AckConfirmed.Sub(t0Send)
	}

	// Print detailed stage breakdown
	fmt.Printf("[Stage 1] Publisher Dispatched (T0)     : %s\n", t0Send.Format("15:04:05.000000"))
	fmt.Printf("[Stage 2] Network Ingress + Parse + Route: ~%s (in-broker hop)\n", formatDur(deliveryLatency/2))
	fmt.Printf("[Stage 3] Subscriber Delivered (T1)      : %s (Msg ID: #%s)\n", t1Recv.Format("15:04:05.000000"), msgID)
	fmt.Printf("   ├─ Payload: %s\n", receivedObj.Data)
	fmt.Printf("   └─► ONE-WAY DELIVERY LATENCY (T1 - T0): %s (%.3f ms)\n", formatDur(deliveryLatency), float64(deliveryLatency.Microseconds())/1000.0)

	if mode == "AT_LEAST_ONCE" {
		fmt.Printf("[Stage 4] Subscriber Sent ACK (T2)      : %s\n", t2AckSent.Format("15:04:05.000000"))
		fmt.Printf("[Stage 5] Broker ACK Processed (T3)     : %s\n", t3AckConfirmed.Format("15:04:05.000000"))
		fmt.Printf("   ├─ ACK Ingress & Processing Latency   : %s\n", formatDur(ackDuration))
		fmt.Printf("   └─► FULL ROUNDTRIP LATENCY (T3 - T0)  : %s (%.3f ms)\n", formatDur(roundtripDuration), float64(roundtripDuration.Microseconds())/1000.0)
	}
	fmt.Println("================================================================")
}

func runBatchStatisticalTest(addr, topic, mode string, totalMsgs, concurrency int) {
	fmt.Println("================================================================")
	fmt.Printf(" Multi-Sample Latency & Statistical Analysis\n")
	fmt.Printf(" Messages: %d | Workers: %d | Mode: %s\n", totalMsgs, concurrency, mode)
	fmt.Printf(" Broker: %s | Topic: %s\n", addr, topic)
	fmt.Println("================================================================")

	subConn, err := net.Dial("tcp", addr)
	if err != nil {
		log.Fatalf("failed to connect subscriber: %v", err)
	}
	defer subConn.Close()

	subID := fmt.Sprintf("bench_sub_%d", time.Now().UnixNano()%10000)
	if _, err := fmt.Fprintf(subConn, "SUB %s %s %s\n", topic, subID, mode); err != nil {
		log.Fatalf("failed to subscribe: %v", err)
	}

	latencies := make([]int64, 0, totalMsgs)
	var latMu sync.Mutex
	var receivedCount uint64
	doneChan := make(chan struct{})

	// Subscriber reader goroutine
	go func() {
		r := bufio.NewReader(subConn)
		for {
			line, err := r.ReadString('\n')
			tRecv := time.Now().UnixNano()
			if err != nil {
				return
			}
			line = strings.TrimRight(line, "\r\n")
			if strings.HasPrefix(line, "MSG ") {
				parts := strings.SplitN(line, " ", 4)
				if len(parts) >= 4 {
					msgID := parts[2]
					payload := parts[3]

					// Extract timestamp
					var p LatencyPayload
					if err := json.Unmarshal([]byte(payload), &p); err == nil && p.TS > 0 {
						diff := tRecv - p.TS
						if diff >= 0 {
							latMu.Lock()
							latencies = append(latencies, diff)
							latMu.Unlock()
						}
					}

					if mode == "AT_LEAST_ONCE" {
						_, _ = fmt.Fprintf(subConn, "ACK %s %s %s\n", topic, subID, msgID)
					}

					if atomic.AddUint64(&receivedCount, 1) >= uint64(totalMsgs) {
						close(doneChan)
						return
					}
				}
			}
		}
	}()

	time.Sleep(50 * time.Millisecond) // Warmup

	// Concurrent publishers
	msgsPerWorker := totalMsgs / concurrency
	var wg sync.WaitGroup
	startTime := time.Now()

	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			conn, err := net.Dial("tcp", addr)
			if err != nil {
				log.Printf("worker %d connection failed: %v", workerID, err)
				return
			}
			defer conn.Close()

			bw := bufio.NewWriter(conn)
			for i := 0; i < msgsPerWorker; i++ {
				p := LatencyPayload{
					TS:   time.Now().UnixNano(),
					Seq:  workerID*msgsPerWorker + i,
					Data: "bench",
				}
				data, _ := json.Marshal(p)
				_, _ = bw.WriteString(fmt.Sprintf("PUB %s %s\n", topic, string(data)))
			}
			_ = bw.Flush()
		}(w)
	}

	wg.Wait()
	pubElapsed := time.Since(startTime)

	select {
	case <-doneChan:
	case <-time.After(5 * time.Second):
		fmt.Printf("\n[Timeout waiting for all messages. Received %d / %d]\n", atomic.LoadUint64(&receivedCount), totalMsgs)
	}
	totalElapsed := time.Since(startTime)

	latMu.Lock()
	collected := make([]int64, len(latencies))
	copy(collected, latencies)
	latMu.Unlock()

	if len(collected) == 0 {
		fmt.Println("No latency samples collected.")
		return
	}

	sort.Slice(collected, func(i, j int) bool { return collected[i] < collected[j] })

	var sum int64
	for _, v := range collected {
		sum += v
	}
	avgNs := float64(sum) / float64(len(collected))
	minNs := collected[0]
	maxNs := collected[len(collected)-1]
	p50Ns := percentile(collected, 50)
	p90Ns := percentile(collected, 90)
	p95Ns := percentile(collected, 95)
	p99Ns := percentile(collected, 99)

	throughput := float64(len(collected)) / totalElapsed.Seconds()

	fmt.Println("\n------------------- Latency Distribution -------------------")
	fmt.Printf("Samples Collected : %d / %d\n", len(collected), totalMsgs)
	fmt.Printf("Throughput        : %.2f msgs/sec (Publish duration: %v)\n", throughput, pubElapsed)
	fmt.Println("------------------------------------------------------------")
	fmt.Printf("  Minimum Latency : %s\n", formatNs(float64(minNs)))
	fmt.Printf("  Average (Mean)  : %s\n", formatNs(avgNs))
	fmt.Printf("  P50 (Median)    : %s\n", formatNs(float64(p50Ns)))
	fmt.Printf("  P90 Percentile  : %s\n", formatNs(float64(p90Ns)))
	fmt.Printf("  P95 Percentile  : %s\n", formatNs(float64(p95Ns)))
	fmt.Printf("  P99 Percentile  : %s\n", formatNs(float64(p99Ns)))
	fmt.Printf("  Maximum Latency : %s\n", formatNs(float64(maxNs)))
	fmt.Println("================================================================")
}

func percentile(sorted []int64, pct float64) int64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(float64(len(sorted)-1) * (pct / 100.0))
	return sorted[idx]
}

func formatDur(d time.Duration) string {
	if d < time.Millisecond {
		return fmt.Sprintf("%d µs", d.Microseconds())
	}
	return fmt.Sprintf("%.2f ms", float64(d.Microseconds())/1000.0)
}

func formatNs(ns float64) string {
	us := ns / 1000.0
	ms := us / 1000.0
	if ms >= 1.0 {
		return fmt.Sprintf("%.3f ms (%d µs)", ms, int64(us))
	}
	return fmt.Sprintf("%.2f µs (%d ns)", us, int64(ns))
}

// Ensure unused strconv is silenced if needed
var _ = strconv.Itoa
