package router

import (
	"context"
	"strings"
	"testing"
	"time"
)

type stubStorage struct {
	calls int
}

func (s *stubStorage) MarkAcked(topic, msgID string) error {
	s.calls++
	return nil
}

func TestRouter_Route_FanOut(t *testing.T) {
	r := New(&stubStorage{})
	out1 := make(chan string, 1)
	out2 := make(chan string, 1)

	r.Subscribe("test", "client1", ModeAtMostOnce, out1)
	r.Subscribe("test", "client2", ModeAtMostOnce, out2)

	r.Route("test", "msg1", "hello")

	select {
	case msg := <-out1:
		if !strings.Contains(msg, "hello") {
			t.Errorf("expected hello in msg, got %s", msg)
		}
	default:
		t.Error("client1 did not receive message")
	}

	select {
	case msg := <-out2:
		if !strings.Contains(msg, "hello") {
			t.Errorf("expected hello in msg, got %s", msg)
		}
	default:
		t.Error("client2 did not receive message")
	}
}

func TestRouter_AtMostOnce(t *testing.T) {
	r := New(&stubStorage{})
	out := make(chan string, 1)

	r.Subscribe("test", "client1", ModeAtMostOnce, out)
	r.Route("test", "msg1", "payload")

	if r.PendingAcksCount() != 0 {
		t.Errorf("expected 0 pending acks for AT_MOST_ONCE, got %d", r.PendingAcksCount())
	}
}

func TestRouter_AtLeastOnce(t *testing.T) {
	store := &stubStorage{}
	r := New(store)
	out := make(chan string, 1)

	r.Subscribe("test", "client1", ModeAtLeastOnce, out)
	r.Route("test", "msg1", "payload")

	if r.PendingAcksCount() != 1 {
		t.Errorf("expected 1 pending ack for AT_LEAST_ONCE, got %d", r.PendingAcksCount())
	}

	r.ProcessAck("test", "client1", "msg1")

	if r.PendingAcksCount() != 0 {
		t.Errorf("expected 0 pending acks after ProcessAck, got %d", r.PendingAcksCount())
	}
	if store.calls != 1 {
		t.Errorf("expected 1 call to storage, got %d", store.calls)
	}
}

func TestRouter_StartRetryMonitor(t *testing.T) {
	r := New(&stubStorage{})
	out := make(chan string, 2)

	r.Subscribe("test", "client1", ModeAtLeastOnce, out)
	
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	go r.StartRetryMonitor(ctx, 50*time.Millisecond)

	r.Route("test", "msg1", "payload")
	
	<-out // Consume original send

	select {
	case <-out:
		// Retry successful
	case <-time.After(150 * time.Millisecond):
		t.Error("timed out waiting for retry")
	}
}

func TestRouter_Unsubscribe(t *testing.T) {
	r := New(&stubStorage{})
	out := make(chan string, 1)

	r.Subscribe("test", "client1", ModeAtLeastOnce, out)
	r.Route("test", "msg1", "payload")
	
	if r.PendingAcksCount() != 1 {
		t.Errorf("expected 1 pending ack, got %d", r.PendingAcksCount())
	}

	r.Unsubscribe("test", "client1")

	if r.PendingAcksCount() != 0 {
		t.Errorf("expected 0 pending acks after unsubscribe, got %d", r.PendingAcksCount())
	}
}

func TestRouter_RaceClose(t *testing.T) {
	// Note: must be run with `go test -race` to be meaningful.
	r := New(&stubStorage{})
	out := make(chan string, 1)
	
	r.Subscribe("test", "client1", ModeAtLeastOnce, out)

	done := make(chan struct{})

	go func() {
		for i := 0; i < 1000; i++ {
			r.Route("test", "msg1", "payload")
		}
		close(done)
	}()

	go func() {
		for i := 0; i < 1000; i++ {
			r.sweep(0)
		}
	}()

	time.Sleep(1 * time.Millisecond)
	close(out)

	<-done
}
