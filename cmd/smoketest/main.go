// This is a manual integration smoke test, not part of the production build. 
// Safe to delete once Member 1's real TCP layer and Member 3's real WAL exist.
package main

import (
	"context"
	"fmt"
	"time"

	"PMB/router"
)

type stubEngine struct{}

func (s *stubEngine) MarkAcked(topic, msgID string) error {
	fmt.Printf("[Stub WAL] MarkAcked called with topic=%s, msgID=%s\n", topic, msgID)
	return nil
}

func main() {
	fmt.Println("[Init] Starting smoke test...")
	stub := &stubEngine{}
	r := router.New(stub)

	ch := make(chan string, 10)
	
	fmt.Println("[1] Subscribing worker1 to orders.india (AT_LEAST_ONCE)")
	r.Subscribe("orders.india", "worker1", router.ModeAtLeastOnce, ch)

	fmt.Println("[2] Sending message 501...")
	r.Route("orders.india", "501", `{"id":1042,"status":"pending"}`)

	fmt.Println("[3] Reading from channel...")
	select {
	case msg := <-ch:
		fmt.Printf("[3] Received: %q\n", msg)
	case <-time.After(1 * time.Second):
		fmt.Println("[3] Timeout waiting for message!")
	}

	fmt.Printf("[4] Pending ACKs before ProcessAck: %d\n", r.PendingAcksCount())
	fmt.Println("[4] Calling ProcessAck for message 501...")
	r.ProcessAck("orders.india", "worker1", "501")
	fmt.Printf("[4] Pending ACKs after ProcessAck: %d\n", r.PendingAcksCount())

	fmt.Println("[5] Starting RetryMonitor with 500ms timeout...")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go r.StartRetryMonitor(ctx, 500*time.Millisecond)

	fmt.Println("[6] Sending message 502 (without ACK)...")
	r.Route("orders.india", "502", `{"id":1043,"status":"pending"}`)

	// Drain the first delivery immediately so the buffer is clear for retry
	select {
	case msg := <-ch:
		fmt.Printf("[6] Received first delivery of 502: %q\n", msg)
	case <-time.After(1 * time.Second):
		fmt.Println("[6] Timeout waiting for first delivery!")
	}

	fmt.Println("[7] Waiting for retry (should take ~500ms)...")
	select {
	case msg := <-ch:
		fmt.Printf("[7] Received REDELIVERY of 502: %q\n", msg)
	case <-time.After(2 * time.Second):
		fmt.Println("[7] ERROR: Timeout waiting for redelivery!")
	}

	fmt.Println("[8] Unsubscribing worker1...")
	r.Unsubscribe("orders.india", "worker1")

	fmt.Println("[9] Checking if channel is closed...")
	select {
	case msg, ok := <-ch:
		if !ok {
			fmt.Println("[9] Confirmed: Channel is properly closed.")
		} else {
			fmt.Printf("[9] ERROR: Channel still open, received unexpected message: %q\n", msg)
		}
	case <-time.After(500 * time.Millisecond):
		fmt.Println("[9] ERROR: Timeout waiting for channel close/read (channel not closed).")
	}

	fmt.Println("[Done] Smoke test complete.")
}
