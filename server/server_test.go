package server

import (
	"bufio"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	"PMB/router"
)

func TestParseLine(t *testing.T) {
	tests := []struct {
		input   string
		wantCmd string
		wantErr bool
	}{
		{"PING\n", CmdPing, false},
		{"PING\r\n", CmdPing, false},
		{"PUB orders.in {\"id\": 1042, \"item\": \"book\"}\n", CmdPub, false},
		{"SUB orders.in worker1 AT_LEAST_ONCE\n", CmdSub, false},
		{"SUB orders.in worker1 AT_MOST_ONCE\n", CmdSub, false},
		{"ACK orders.in worker1 501\n", CmdAck, false},
		{"", "", true},
		{"UNKNOWN arg\n", "", true},
		{"PUB\n", "", true},
		{"SUB orders.in worker1 INVALID_MODE\n", "", true},
		{"ACK orders.in\n", "", true},
	}

	for _, tt := range tests {
		cmd, err := ParseLine(tt.input)
		if tt.wantErr {
			if err == nil {
				t.Errorf("ParseLine(%q) expected error, got nil", tt.input)
			}
			continue
		}
		if err != nil {
			t.Errorf("ParseLine(%q) unexpected error: %v", tt.input, err)
			continue
		}
		if cmd.Type != tt.wantCmd {
			t.Errorf("ParseLine(%q) got cmd %s, want %s", tt.input, cmd.Type, tt.wantCmd)
		}
	}
}

func TestServer_PingPong(t *testing.T) {
	r := router.New(nil)
	srv := New("127.0.0.1:0", r, nil)
	if err := srv.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}
	defer srv.Stop()

	conn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial server: %v", err)
	}
	defer conn.Close()

	if _, err := conn.Write([]byte("PING\n")); err != nil {
		t.Fatalf("failed to write PING: %v", err)
	}

	reader := bufio.NewReader(conn)
	resp, err := reader.ReadString('\n')
	if err != nil {
		t.Fatalf("failed to read response: %v", err)
	}

	if resp != "PONG\n" {
		t.Errorf("expected PONG\\n, got %q", resp)
	}
}

func TestServer_StickyPackets(t *testing.T) {
	r := router.New(nil)
	srv := New("127.0.0.1:0", r, nil)
	if err := srv.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}
	defer srv.Stop()

	conn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial: %v", err)
	}
	defer conn.Close()

	// Send 3 commands in one single TCP packet
	if _, err := conn.Write([]byte("PING\nPING\nPING\n")); err != nil {
		t.Fatalf("failed to write sticky packets: %v", err)
	}

	reader := bufio.NewReader(conn)
	for i := 0; i < 3; i++ {
		resp, err := reader.ReadString('\n')
		if err != nil {
			t.Fatalf("read %d failed: %v", i, err)
		}
		if resp != "PONG\n" {
			t.Errorf("packet %d: expected PONG\\n, got %q", i, resp)
		}
	}
}

func TestServer_PubSubAck(t *testing.T) {
	r := router.New(nil)
	srv := New("127.0.0.1:0", r, nil)
	if err := srv.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}
	defer srv.Stop()

	// Subscriber client
	subConn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial sub: %v", err)
	}
	defer subConn.Close()

	subReader := bufio.NewReader(subConn)
	if _, err := subConn.Write([]byte("SUB orders.in worker1 AT_LEAST_ONCE\n")); err != nil {
		t.Fatalf("failed to write SUB: %v", err)
	}
	time.Sleep(50 * time.Millisecond)

	// Publisher client
	pubConn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial pub: %v", err)
	}
	defer pubConn.Close()

	payload := `{"order_id": 42, "item": "laptop"}`
	if _, err := pubConn.Write([]byte("PUB orders.in " + payload + "\n")); err != nil {
		t.Fatalf("failed to write PUB: %v", err)
	}

	// Subscriber receives MSG
	msgLine, err := subReader.ReadString('\n')
	if err != nil {
		t.Fatalf("failed to read MSG line: %v", err)
	}

	if !strings.HasPrefix(msgLine, "MSG orders.in ") || !strings.Contains(msgLine, payload) {
		t.Fatalf("unexpected MSG format: %q", msgLine)
	}

	parts := strings.Split(strings.TrimRight(msgLine, "\n"), " ")
	msgID := parts[2]

	if r.PendingAcksCount() != 1 {
		t.Fatalf("expected 1 pending ack, got %d", r.PendingAcksCount())
	}

	// Subscriber sends ACK
	if _, err := subConn.Write([]byte("ACK orders.in worker1 " + msgID + "\n")); err != nil {
		t.Fatalf("failed to write ACK: %v", err)
	}

	time.Sleep(50 * time.Millisecond)
	if r.PendingAcksCount() != 0 {
		t.Fatalf("expected 0 pending acks after ACK, got %d", r.PendingAcksCount())
	}
}

func TestServer_ClientDisconnectCleanup(t *testing.T) {
	r := router.New(nil)
	srv := New("127.0.0.1:0", r, nil)
	if err := srv.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}
	defer srv.Stop()

	subConn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial: %v", err)
	}

	if _, err := subConn.Write([]byte("SUB chat clientA AT_MOST_ONCE\n")); err != nil {
		t.Fatalf("failed to write SUB: %v", err)
	}
	time.Sleep(30 * time.Millisecond)

	// Disconnect client abruptly
	subConn.Close()
	time.Sleep(50 * time.Millisecond)

	// Publishing should not panic or fail
	pubConn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("failed to dial pub: %v", err)
	}
	defer pubConn.Close()

	if _, err := pubConn.Write([]byte("PUB chat hello\n")); err != nil {
		t.Fatalf("failed to write PUB: %v", err)
	}
}

func TestServer_OOMProtection_LargePayload(t *testing.T) {
	r := router.New(nil)
	srv := New("127.0.0.1:0", r, nil)
	srv.SetMaxLineLen(256)
	if err := srv.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}
	defer srv.Stop()

	conn, err := net.Dial("tcp", srv.Addr())
	if err != nil {
		t.Fatalf("dial failed: %v", err)
	}
	defer conn.Close()

	// Stream 5000 bytes without any \n to fill bufio buffer and exceed line limit
	hugeChunk := make([]byte, 5000)
	for i := range hugeChunk {
		hugeChunk[i] = 'A'
	}
	_, _ = conn.Write(hugeChunk)

	reader := bufio.NewReader(conn)
	resp, err := reader.ReadString('\n')
	if err != nil && err != io.EOF {
		t.Fatalf("unexpected read error: %v", err)
	}
	if !strings.Contains(resp, "ERR payload_too_large") {
		t.Fatalf("expected ERR payload_too_large, got %q (err=%v)", resp, err)
	}
}
