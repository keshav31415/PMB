package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"PMB/router"
	"PMB/server"
	"PMB/storage"
)

func main() {
	port := flag.String("port", "4222", "TCP port for broker")
	retrySec := flag.Int("retry", 2, "ACK retry timeout in seconds")
	gcInterval := flag.Int("gc-interval", 60, "GC sweep interval in seconds")
	gcMaxAge := flag.Int("gc-maxage", 300, "GC maximum message age retention in seconds")
	flag.Parse()

	addr := ":" + *port

	// 1. Initialize WAL storage engine
	store := storage.New()

	// 2. Recover unacknowledged messages from disk logs (Crash Recovery)
	pending, err := store.RecoverAll()
	if err != nil {
		log.Printf("wal recovery warning: %v", err)
	}

	var maxSeq uint64
	var recoveredCount int
	for _, msgs := range pending {
		for _, m := range msgs {
			recoveredCount++
			if idNum, err := strconv.ParseUint(m.ID, 10, 64); err == nil {
				if idNum > maxSeq {
					maxSeq = idNum
				}
			}
		}
	}

	// 3. Start GC Retention Daemon
	gc := storage.NewGCDaemon(store, time.Duration(*gcInterval)*time.Second, time.Duration(*gcMaxAge)*time.Second)
	gc.Start()
	defer gc.Stop()

	// 4. Initialize Router with WAL store wired in
	r := router.New(store)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go r.StartRetryMonitor(ctx, time.Duration(*retrySec)*time.Second)

	// 5. Initialize TCP Server
	srv := server.New(addr, r, store)
	if maxSeq > 0 {
		srv.SetSeq(maxSeq)
	}

	if err := srv.Start(); err != nil {
		log.Fatalf("failed to start server on %s: %v", addr, err)
	}

	// 6. Re-queue recovered messages into the router
	for _, msgs := range pending {
		for _, m := range msgs {
			r.Route(m.Topic, m.ID, m.Payload)
		}
	}

	fmt.Println("=====================================================")
	fmt.Printf(" Persistent Message Broker (PMB) running on port %s\n", *port)
	fmt.Printf(" Storage Engine    : Write-Ahead Log (WAL) with fsync\n")
	fmt.Printf(" Crash Recovery    : %d unacked messages recovered\n", recoveredCount)
	fmt.Printf(" ACK Retry Monitor : %ds | GC Daemon: every %ds\n", *retrySec, *gcInterval)
	fmt.Println("=====================================================")

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	fmt.Println("\nShutting down broker...")
	cancel()
	_ = srv.Stop()
	fmt.Println("Broker stopped gracefully.")
}
