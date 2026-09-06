package main

import (
	"fmt"

	"PMB/router"
)

type noopStorage struct{}

func (s *noopStorage) MarkAcked(topic, msgID string) error {
	return nil
}

func main() {
	fmt.Println("Running smoketest (disposable integration check)")

	store := &noopStorage{}
	r := router.New(store)

	out := make(chan string, 5)
	r.Subscribe("test-topic", "test-client", router.ModeAtLeastOnce, out)

	r.Route("test-topic", "msg-123", "hello world")

	msg := <-out
	fmt.Printf("Received msg: %q\n", msg)

	if pending := r.PendingAcksCount(); pending != 1 {
		panic(fmt.Sprintf("Expected 1 pending ack, got %d", pending))
	}
	fmt.Println("Message added to pending ACKs correctly.")

	r.ProcessAck("test-topic", "test-client", "msg-123")

	if pending := r.PendingAcksCount(); pending != 0 {
		panic(fmt.Sprintf("Expected 0 pending acks after ProcessAck, got %d", pending))
	}
	fmt.Println("Pending ACK cleared correctly.")

	fmt.Println("Smoketest completed successfully.")
}
