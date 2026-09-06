package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"PMB/router"
	"PMB/server"
)

func main() {
	port := flag.String("port", "4222", "TCP port for broker")
	retrySec := flag.Int("retry", 2, "ACK retry timeout in seconds")
	flag.Parse()

	addr := ":" + *port
	r := router.New(nil)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go r.StartRetryMonitor(ctx, time.Duration(*retrySec)*time.Second)

	srv := server.New(addr, r, nil)
	if err := srv.Start(); err != nil {
		log.Fatalf("failed to start server on %s: %v", addr, err)
	}

	fmt.Println("=====================================================")
	fmt.Printf(" Persistent Message Broker (PMB) running on port %s\n", *port)
	fmt.Printf(" ACK Retry Interval: %ds | Ready for connections\n", *retrySec)
	fmt.Println("=====================================================")

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	fmt.Println("\nShutting down broker...")
	cancel()
	_ = srv.Stop()
	fmt.Println("Broker stopped gracefully.")
}
