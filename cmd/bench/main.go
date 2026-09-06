package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

func main() {
	addr := flag.String("addr", "localhost:4222", "Broker TCP address")
	topic := flag.String("topic", "bench.topic", "Topic for benchmark")
	total := flag.Int("n", 10000, "Total number of messages to publish")
	concurrency := flag.Int("c", 10, "Number of concurrent publisher connections")
	flag.Parse()

	// 1. Start a fast subscriber to drain messages
	subConn, err := net.Dial("tcp", *addr)
	if err != nil {
		log.Fatalf("failed to connect subscriber: %v", err)
	}
	defer subConn.Close()

	if _, err := subConn.Write([]byte(fmt.Sprintf("SUB %s bench_sub AT_MOST_ONCE\n", *topic))); err != nil {
		log.Fatalf("failed to subscribe: %v", err)
	}

	var received uint64
	doneSub := make(chan struct{})
	go func() {
		r := bufio.NewReader(subConn)
		for {
			line, err := r.ReadString('\n')
			if err != nil {
				return
			}
			if len(line) > 4 && line[:4] == "MSG " {
				if atomic.AddUint64(&received, 1) == uint64(*total) {
					close(doneSub)
					return
				}
			}
		}
	}()

	time.Sleep(50 * time.Millisecond) // Warmup

	fmt.Println("=====================================================")
	fmt.Printf(" Running Benchmark: %d messages across %d workers\n", *total, *concurrency)
	fmt.Printf(" Broker: %s | Topic: %s\n", *addr, *topic)
	fmt.Println("=====================================================")

	msgsPerWorker := *total / *concurrency
	var wg sync.WaitGroup
	var pubCount uint64

	start := time.Now()

	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			conn, err := net.Dial("tcp", *addr)
			if err != nil {
				log.Printf("worker %d dial failed: %v", workerID, err)
				return
			}
			defer conn.Close()

			buf := bufio.NewWriter(conn)
			for j := 0; j < msgsPerWorker; j++ {
				_, _ = buf.WriteString(fmt.Sprintf("PUB %s bench_payload_%d_%d\n", *topic, workerID, j))
				atomic.AddUint64(&pubCount, 1)
			}
			_ = buf.Flush()
		}(i)
	}

	wg.Wait()
	pubElapsed := time.Since(start)

	// Wait briefly for subscriber to finish receiving all messages
	select {
	case <-doneSub:
	case <-time.After(2 * time.Second):
	}
	totalElapsed := time.Since(start)

	recCount := atomic.LoadUint64(&received)

	fmt.Println("\n--- Benchmark Results ---")
	fmt.Printf("Published:  %d messages in %v (%.2f msg/sec)\n",
		pubCount, pubElapsed, float64(pubCount)/pubElapsed.Seconds())
	fmt.Printf("Delivered:  %d messages in %v (%.2f msg/sec)\n",
		recCount, totalElapsed, float64(recCount)/totalElapsed.Seconds())
	fmt.Println("=====================================================")
}
