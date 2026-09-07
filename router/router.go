package router

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

const (
	ModeAtMostOnce  = "AT_MOST_ONCE"
	ModeAtLeastOnce = "AT_LEAST_ONCE"
	MaxRetries      = 5
)

type Subscriber struct {
	ID    string
	Topic string
	Mode  string

	mu     sync.Mutex
	out    chan<- string // Non-blocking buffered channel for raw MSG strings
	closed bool
}

func (s *Subscriber) send(msg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.closed {
		return
	}
	select {
	case s.out <- msg:
	default:
	}
}

func (s *Subscriber) close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.closed {
		s.closed = true
		close(s.out)
	}
}

// StorageEngine defines the storage interface needed for ACK persistence.
type StorageEngine interface {
	MarkAcked(topic, msgID string) error
}

type pendingAck struct {
	sub      *Subscriber
	msgID    string
	payload  string
	sentTime time.Time
	attempts int
}

type ackKey struct {
	topic    string
	clientID string
	msgID    string
}

type Router struct {
	mu   sync.RWMutex
	subs map[string]map[string]*Subscriber // topic -> clientID -> Subscriber

	ackMu       sync.Mutex
	pendingAcks map[ackKey]pendingAck

	store StorageEngine
}

func New(store StorageEngine) *Router {
	return &Router{
		subs:        make(map[string]map[string]*Subscriber),
		pendingAcks: make(map[ackKey]pendingAck),
		store:       store,
	}
}

func (r *Router) Subscribe(topic, clientID, mode string, out chan<- string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.subs[topic]; !ok {
		r.subs[topic] = make(map[string]*Subscriber)
	}

	r.subs[topic][clientID] = &Subscriber{
		ID:    clientID,
		Topic: topic,
		Mode:  mode,
		out:   out,
	}
}

func (r *Router) Unsubscribe(topic, clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if subs, ok := r.subs[topic]; ok {
		if sub, exists := subs[clientID]; exists {
			sub.close()
			delete(subs, clientID)
			if len(subs) == 0 {
				delete(r.subs, topic)
			}
		}
	}

	r.ackMu.Lock()
	for k := range r.pendingAcks {
		if k.topic == topic && k.clientID == clientID {
			delete(r.pendingAcks, k)
		}
	}
	r.ackMu.Unlock()
}


func (r *Router) HasSubscribers(topic string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.subs[topic]) > 0
}

func (r *Router) Route(topic, msgID, payload string) {

	r.mu.RLock()
	subs, ok := r.subs[topic]
	// Snapshot active subscribers to avoid lock contention during channel dispatch
	active := make([]*Subscriber, 0, len(subs))
	for _, sub := range subs {
		active = append(active, sub)
	}
	r.mu.RUnlock()

	if !ok {
		return
	}

	msg := fmt.Sprintf("MSG %s %s %s\n", topic, msgID, payload)

	for _, sub := range active {
		if sub.Mode == ModeAtLeastOnce {
			r.ackMu.Lock()
			r.pendingAcks[ackKey{topic, sub.ID, msgID}] = pendingAck{
				sub:      sub,
				msgID:    msgID,
				payload:  payload,
				sentTime: time.Now(),
			}
			r.ackMu.Unlock()
		}

		sub.send(msg)
	}
}

// PendingAcksCount is an exported test helper to check the number of pending ACKs.
func (r *Router) PendingAcksCount() int {
	r.ackMu.Lock()
	defer r.ackMu.Unlock()
	return len(r.pendingAcks)
}

func (r *Router) ProcessAck(topic, clientID, msgID string) {
	r.ackMu.Lock()
	delete(r.pendingAcks, ackKey{topic, clientID, msgID})
	r.ackMu.Unlock()

	if r.store != nil {
		_ = r.store.MarkAcked(topic, msgID) // Best-effort write to WAL persistence
	}
}

func (r *Router) StartRetryMonitor(ctx context.Context, timeout time.Duration) {
	// Sweep periodically (e.g. half the timeout interval) to ensure prompt delivery
	tk := time.NewTicker(timeout / 2)
	defer tk.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-tk.C:
			r.sweep(timeout)
		}
	}
}

func (r *Router) sweep(timeout time.Duration) {
	now := time.Now()
	var retries []pendingAck

	r.ackMu.Lock()
	for k, p := range r.pendingAcks {
		if now.Sub(p.sentTime) >= timeout {
			p.attempts++
			if p.attempts > MaxRetries {
				log.Printf("router: giving up on msg %s for client %s on topic %s after %d attempts\n", p.msgID, p.sub.ID, p.sub.Topic, p.attempts)
				delete(r.pendingAcks, k)
				continue
			}
			p.sentTime = now
			r.pendingAcks[k] = p // Update sentTime immediately to avoid tight retry loops
			retries = append(retries, p)
		}
	}
	r.ackMu.Unlock()

	for _, p := range retries {
		msg := fmt.Sprintf("MSG %s %s %s\n", p.sub.Topic, p.msgID, p.payload)
		p.sub.send(msg)
	}
}
