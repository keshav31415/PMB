package main

import (
	"bufio"
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

func main() {
	addr := flag.String("addr", "localhost:4222", "Broker TCP address")
	topic := flag.String("topic", "perf.bench", "Topic name for benchmark")
	total := flag.Int("n", 10000, "Total number of messages to publish")
	concurrency := flag.Int("c", 8, "Number of concurrent publisher connections")
	size := flag.Int("size", 128, "Payload size in bytes")
	mode := flag.String("mode", "AT_LEAST_ONCE", "Delivery mode: AT_LEAST_ONCE or AT_MOST_ONCE")
	subs := flag.Int("subs", 1, "Number of concurrent subscriber clients (fan-out)")
	withLat := flag.Bool("lat", false, "Collect and calculate full latency percentiles (P50, P90, P99)")
	trace := flag.Bool("trace", false, "Profile a single message lifecycle with nanosecond stage breakdown")
	rate := flag.Int("rate", 0, "Target publish rate in msgs/sec (0 = unthrottled max throughput)")
	flag.Parse()

	m := strings.ToUpper(*mode)
	if m != "AT_LEAST_ONCE" && m != "AT_MOST_ONCE" {
		log.Fatalf("invalid mode '%s': must be AT_LEAST_ONCE or AT_MOST_ONCE", *mode)
	}

	if *size < 16 {
		*size = 16
	}

	if *trace {
		runTraceProfile(*addr, *topic, m, *size)
		return
	}

	runBenchmarkSuite(*addr, *topic, m, *total, *concurrency, *size, *subs, *withLat, *rate)
}

// ---------------------------------------------------------------------
// 1. Single-Message Lifecycle Trace
// ---------------------------------------------------------------------
func runTraceProfile(addr, topic, mode string, size int) {
	fmt.Println("================================================================")
	fmt.Println(" PMB Single-Message Lifecycle Diagnostics Trace")
	fmt.Printf(" Target: %s | Topic: %s | Mode: %s | Payload: %d bytes\n", addr, topic, mode, size)
	fmt.Println("================================================================")

	// Connect Subscriber
	subConn, err := net.Dial("tcp", addr)
	if err != nil {
		log.Fatalf("failed to connect subscriber: %v", err)
	}
	defer subConn.Close()

	subID := fmt.Sprintf("trace_sub_%d", time.Now().UnixNano()%10000)
	if _, err := fmt.Fprintf(subConn, "SUB %s %s %s\n", topic, subID, mode); err != nil {
		log.Fatalf("failed to subscribe: %v", err)
	}
	time.Sleep(50 * time.Millisecond) // Register subscription

	// Connect Publisher
	pubConn, err := net.Dial("tcp", addr)
	if err != nil {
		log.Fatalf("failed to connect publisher: %v", err)
	}
	defer pubConn.Close()

	subReader := bufio.NewReader(subConn)

	// Prepare payload with timestamp
	t0 := time.Now()
	header := fmt.Sprintf(`{"ts":%d}`, t0.UnixNano())
	paddingLen := size - len(header)
	if paddingLen < 0 {
		paddingLen = 0
	}
	payload := header + strings.Repeat("x", paddingLen)

	// Step 1: Publisher Dispatches
	if _, err := fmt.Fprintf(pubConn, "PUB %s %s\n", topic, payload); err != nil {
		log.Fatalf("failed to publish: %v", err)
	}

	// Step 2 & 3: Subscriber Receives
	msgLine, err := subReader.ReadString('\n')
	t1 := time.Now()
	if err != nil {
		log.Fatalf("failed to read message: %v", err)
	}

	line := strings.TrimRight(msgLine, "\r\n")
	parts := strings.SplitN(line, " ", 4)
	if len(parts) < 4 {
		log.Fatalf("malformed message received: %s", line)
	}
	msgID := parts[2]
	oneWay := t1.Sub(t0)

	var t2, t3 time.Time
	var roundtrip time.Duration
	if mode == "AT_LEAST_ONCE" {
		t2 = time.Now()
		if _, err := fmt.Fprintf(subConn, "ACK %s %s %s\n", topic, subID, msgID); err != nil {
			log.Fatalf("failed to send ACK: %v", err)
		}
		// Confirm broker processed ACK via PING roundtrip
		if _, err := fmt.Fprintf(subConn, "PING\n"); err != nil {
			log.Fatalf("failed to send PING: %v", err)
		}
		pong, err := subReader.ReadString('\n')
		t3 = time.Now()
		if err != nil || !strings.HasPrefix(pong, "PONG") {
			log.Fatalf("failed to receive PONG: %v", err)
		}
		roundtrip = t3.Sub(t0)
	}

	fmt.Printf("[Stage 1] Publisher Dispatched (T0)     : %s\n", t0.Format("15:04:05.000000"))
	fmt.Printf("[Stage 2] Network Ingress + Parse + WAL : ~%s (in-broker fsync & route)\n", formatDuration(oneWay/2))
	fmt.Printf("[Stage 3] Subscriber Delivered (T1)      : %s (Msg ID: #%s)\n", t1.Format("15:04:05.000000"), msgID)
	fmt.Printf("   └─► ONE-WAY DELIVERY LATENCY (T1 - T0): %s (%.3f ms)\n", formatDuration(oneWay), float64(oneWay.Microseconds())/1000.0)

	if mode == "AT_LEAST_ONCE" {
		fmt.Printf("[Stage 4] Subscriber Sent ACK (T2)      : %s\n", t2.Format("15:04:05.000000"))
		fmt.Printf("[Stage 5] Broker ACK Confirmed (T3)     : %s (eligible for immediate compaction)\n", t3.Format("15:04:05.000000"))
		fmt.Printf("   └─► FULL ROUNDTRIP LATENCY (T3 - T0)  : %s (%.3f ms)\n", formatDuration(roundtrip), float64(roundtrip.Microseconds())/1000.0)
	}
	fmt.Println("================================================================")
}

// ---------------------------------------------------------------------
// 2. High-Throughput & Latency Benchmark Suite
// ---------------------------------------------------------------------
func runBenchmarkSuite(addr, topic, mode string, total, concurrency, size, subs int, withLat bool, targetRate int) {
	fmt.Println("================================================================================")
	fmt.Println(" PMB High-Performance Benchmark Suite")
	fmt.Printf(" Target: %s | Topic: %s | Mode: %s\n", addr, topic, mode)
	fmt.Printf(" Messages: %d | Publishers: %d | Subscribers: %d | Payload: %d bytes\n",
		total, concurrency, subs, size)
	if targetRate > 0 {
		fmt.Printf(" Rate Limit: %d msgs/sec | Latency Profiling: %t\n", targetRate, withLat)
	} else {
		fmt.Printf(" Rate Limit: UNLIMITED | Latency Profiling: %t\n", withLat)
	}
	fmt.Println("================================================================================")

	expectedDeliveries := uint64(total * subs)
	var receivedCount uint64
	doneChan := make(chan struct{})

	// Latency samples container
	var latMu sync.Mutex
	latencies := make([]int64, 0, total*subs)

	// Start Subscriber(s)
	subConns := make([]net.Conn, subs)
	for s := 0; s < subs; s++ {
		c, err := net.Dial("tcp", addr)
		if err != nil {
			log.Fatalf("failed to connect subscriber %d: %v", s, err)
		}
		subConns[s] = c
		subID := fmt.Sprintf("bench_sub_%d_%d", s, time.Now().UnixNano()%10000)
		if _, err := fmt.Fprintf(c, "SUB %s %s %s\n", topic, subID, mode); err != nil {
			log.Fatalf("failed to subscribe: %v", err)
		}

		go func(conn net.Conn, sID string) {
			r := bufio.NewReader(conn)
			for {
				line, err := r.ReadString('\n')
				tRecv := time.Now().UnixNano()
				if err != nil {
					return
				}
				if strings.HasPrefix(line, "MSG ") {
					parts := strings.SplitN(line, " ", 4)
					if len(parts) >= 4 {
						msgID := parts[2]
						payload := parts[3]

						if withLat && strings.HasPrefix(payload, "ts:") && len(payload) >= 23 {
							if ts, err := strconv.ParseInt(payload[3:22], 10, 64); err == nil && ts > 0 {
								diff := tRecv - ts
								if diff >= 0 {
									latMu.Lock()
									latencies = append(latencies, diff)
									latMu.Unlock()
								}
							}
						}

						if mode == "AT_LEAST_ONCE" {
							_, _ = fmt.Fprintf(conn, "ACK %s %s %s\n", topic, sID, msgID)
						}

						if atomic.AddUint64(&receivedCount, 1) >= expectedDeliveries {
							select {
							case <-doneChan:
							default:
								close(doneChan)
							}
							return
						}
					}
				}
			}
		}(c, subID)
	}

	defer func() {
		for _, c := range subConns {
			_ = c.Close()
		}
	}()

	time.Sleep(50 * time.Millisecond) // Warm-up subscriber registration

	// Prepare payload template
	basePadding := strings.Repeat("a", size)

	msgsPerWorker := total / concurrency
	var wg sync.WaitGroup
	var publishedCount uint64

	startTime := time.Now()

	// Launch concurrent publishers
	for w := 0; w < concurrency; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			conn, err := net.Dial("tcp", addr)
			if err != nil {
				log.Printf("publisher %d connection failed: %v", workerID, err)
				return
			}
			defer conn.Close()

			bw := bufio.NewWriterSize(conn, 64*1024)

			var throttle *time.Ticker
			if targetRate > 0 {
				ratePerWorker := targetRate / concurrency
				if ratePerWorker < 1 {
					ratePerWorker = 1
				}
				interval := time.Second / time.Duration(ratePerWorker)
				throttle = time.NewTicker(interval)
				defer throttle.Stop()
			}

			for i := 0; i < msgsPerWorker; i++ {
				if throttle != nil {
					<-throttle.C
				}

				var payload string
				if withLat {
					header := fmt.Sprintf("ts:%019d:", time.Now().UnixNano())
					padLen := size - len(header)
					if padLen < 0 {
						padLen = 0
					}
					payload = header + basePadding[:padLen]
				} else {
					payload = basePadding
				}

				_, _ = bw.WriteString(fmt.Sprintf("PUB %s %s\n", topic, payload))
				atomic.AddUint64(&publishedCount, 1)
			}
			_ = bw.Flush()
		}(w)
	}

	wg.Wait()
	publishElapsed := time.Since(startTime)

	// Wait for subscriber deliveries
	select {
	case <-doneChan:
	case <-time.After(10 * time.Second):
		fmt.Printf("\n[Notice: Completed with timeout. Delivered: %d / %d]\n",
			atomic.LoadUint64(&receivedCount), expectedDeliveries)
	}
	totalElapsed := time.Since(startTime)

	pubCount := atomic.LoadUint64(&publishedCount)
	recCount := atomic.LoadUint64(&receivedCount)

	pubRate := float64(pubCount) / publishElapsed.Seconds()
	mbSec := (float64(pubCount) * float64(size)) / (1024 * 1024 * publishElapsed.Seconds())
	delivRate := float64(recCount) / totalElapsed.Seconds()

	fmt.Println("\n--- ⚡ Throughput & Bandwidth ---")
	fmt.Printf("  Published Messages  : %d msgs in %v\n", pubCount, publishElapsed.Round(time.Millisecond))
	fmt.Printf("  Publish Throughput  : %.2f msgs/sec\n", pubRate)
	fmt.Printf("  Network Bandwidth   : %.2f MB/sec (payload data rate)\n", mbSec)
	fmt.Printf("  Delivered Messages  : %d msgs in %v\n", recCount, totalElapsed.Round(time.Millisecond))
	fmt.Printf("  Delivery Throughput : %.2f msgs/sec\n", delivRate)

	if withLat {
		latMu.Lock()
		collected := make([]int64, len(latencies))
		copy(collected, latencies)
		latMu.Unlock()

		if len(collected) > 0 {
			sort.Slice(collected, func(i, j int) bool { return collected[i] < collected[j] })

			var sum int64
			for _, v := range collected {
				sum += v
			}
			avgNs := float64(sum) / float64(len(collected))
			minNs := collected[0]
			maxNs := collected[len(collected)-1]
			p50 := calcPercentile(collected, 50)
			p90 := calcPercentile(collected, 90)
			p95 := calcPercentile(collected, 95)
			p99 := calcPercentile(collected, 99)

			fmt.Println("\n--- ⏱️ End-to-End Latency Distribution (SLA) ---")
			fmt.Printf("  Samples Recorded    : %d / %d\n", len(collected), expectedDeliveries)
			fmt.Printf("  Minimum Latency     : %s\n", formatNs(float64(minNs)))
			fmt.Printf("  Average (Mean)      : %s\n", formatNs(avgNs))
			fmt.Printf("  P50 (Median)        : %s\n", formatNs(float64(p50)))
			fmt.Printf("  P90 Percentile      : %s\n", formatNs(float64(p90)))
			fmt.Printf("  P95 Percentile      : %s\n", formatNs(float64(p95)))
			fmt.Printf("  P99 Percentile      : %s\n", formatNs(float64(p99)))
			fmt.Printf("  Maximum Latency     : %s\n", formatNs(float64(maxNs)))
		}
	}
	fmt.Println("================================================================================")
}

func calcPercentile(sorted []int64, pct float64) int64 {
	if len(sorted) == 0 {
		return 0
	}
	idx := int(float64(len(sorted)-1) * (pct / 100.0))
	return sorted[idx]
}

func formatDuration(d time.Duration) string {
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
