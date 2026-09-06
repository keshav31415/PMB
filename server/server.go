package server

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"PMB/router"
)

type Storage interface {
	Append(topic, msgID, payload string) error
	MarkAcked(topic, msgID string) error
}

type subKey struct {
	topic    string
	clientID string
}

type Server struct {
	addr   string
	ln     net.Listener
	r      *router.Router
	store  Storage
	seq    uint64
	closed int32
	wg     sync.WaitGroup
	ctx    context.Context
	cancel context.CancelFunc
}

func New(addr string, r *router.Router, store Storage) *Server {
	ctx, cancel := context.WithCancel(context.Background())
	return &Server{
		addr:   addr,
		r:      r,
		store:  store,
		ctx:    ctx,
		cancel: cancel,
	}
}

func (s *Server) Start() error {
	ln, err := net.Listen("tcp", s.addr)
	if err != nil {
		return err
	}
	s.ln = ln

	s.wg.Add(1)
	go s.acceptLoop()
	return nil
}

func (s *Server) Addr() string {
	if s.ln != nil {
		return s.ln.Addr().String()
	}
	return s.addr
}

func (s *Server) acceptLoop() {
	defer s.wg.Done()

	for {
		conn, err := s.ln.Accept()
		if err != nil {
			if atomic.LoadInt32(&s.closed) == 1 {
				return
			}
			log.Printf("srv: accept err: %v", err)
			return
		}
		s.wg.Add(1)
		go s.handleConn(conn)
	}
}

func (s *Server) handleConn(conn net.Conn) {
	defer s.wg.Done()
	defer conn.Close()

	out := make(chan string, 256)
	done := make(chan struct{})

	// Writer goroutine: serializes writes to conn to prevent interleaving and BrokenPipe panics
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		for {
			select {
			case <-done:
				return
			case msg, ok := <-out:
				if !ok {
					return
				}
				_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if _, err := conn.Write([]byte(msg)); err != nil {
					return
				}
			}
		}
	}()

	var (
		mu   sync.Mutex
		subs = make(map[subKey]chan struct{}) // Tracks active subscriptions for this conn
	)

	cleanupSubs := func() {
		mu.Lock()
		defer mu.Unlock()
		for k, stopCh := range subs {
			close(stopCh)
			s.r.Unsubscribe(k.topic, k.clientID)
		}
		subs = make(map[subKey]chan struct{})
	}
	defer cleanupSubs()
	defer close(done)

	r := bufio.NewReader(conn)

	for {
		line, err := r.ReadString('\n')
		if err != nil {
			if err != io.EOF && atomic.LoadInt32(&s.closed) == 0 {
				// Client disconnected or reset
			}
			return
		}

		cmd, err := ParseLine(line)
		if err != nil {
			s.sendMsg(out, fmt.Sprintf("ERR %s\n", err.Error()))
			continue
		}

		s.dispatch(cmd, out, &mu, subs)
	}
}

func (s *Server) SetSeq(seq uint64) {
	atomic.StoreUint64(&s.seq, seq)
}

func (s *Server) dispatch(cmd *Command, out chan<- string, mu *sync.Mutex, subs map[subKey]chan struct{}) {
	switch cmd.Type {
	case CmdPing:
		s.sendMsg(out, "PONG\n")

	case CmdPub:
		id := strconv.FormatUint(atomic.AddUint64(&s.seq, 1), 10)
		if s.store != nil {
			if err := s.store.Append(cmd.Topic, id, cmd.Payload); err != nil {
				s.sendMsg(out, fmt.Sprintf("ERR wal_append_failed: %v\n", err))
				return
			}
		}
		s.r.Route(cmd.Topic, id, cmd.Payload)

	case CmdSub:
		key := subKey{topic: cmd.Topic, clientID: cmd.ClientID}
		mu.Lock()
		if _, exists := subs[key]; exists {
			mu.Unlock()
			return
		}

		ch := make(chan string, 128)
		stopCh := make(chan struct{})
		subs[key] = stopCh
		mu.Unlock()

		s.r.Subscribe(cmd.Topic, cmd.ClientID, cmd.Mode, ch)

		// Forward messages from router channel to conn writer
		s.wg.Add(1)
		go func(c <-chan string, stop <-chan struct{}) {
			defer s.wg.Done()
			for {
				select {
				case <-stop:
					return
				case msg, ok := <-c:
					if !ok {
						return
					}
					s.sendMsg(out, msg)
				}
			}
		}(ch, stopCh)

	case CmdAck:
		s.r.ProcessAck(cmd.Topic, cmd.ClientID, cmd.MsgID)
	}
}

func (s *Server) sendMsg(out chan<- string, msg string) {
	select {
	case out <- msg:
	default:
		// Queue full, drop or wait to prevent blocking
	}
}

func (s *Server) Stop() error {
	if !atomic.CompareAndSwapInt32(&s.closed, 0, 1) {
		return nil
	}
	s.cancel()
	var err error
	if s.ln != nil {
		err = s.ln.Close()
	}
	s.wg.Wait()
	return err
}
