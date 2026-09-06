package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	addr := flag.String("addr", "localhost:4222", "Broker TCP address")
	topic := flag.String("topic", "demo.topic", "Topic to subscribe to")
	id := flag.String("id", "sub1", "Unique client ID")
	mode := flag.String("mode", "AT_LEAST_ONCE", "Delivery mode (AT_LEAST_ONCE or AT_MOST_ONCE)")
	autoAck := flag.Bool("autoack", true, "Automatically send ACK for received messages in AT_LEAST_ONCE mode")
	flag.Parse()

	m := strings.ToUpper(*mode)
	if m != "AT_LEAST_ONCE" && m != "AT_MOST_ONCE" {
		log.Fatalf("invalid mode %q: must be AT_LEAST_ONCE or AT_MOST_ONCE", *mode)
	}

	conn, err := net.Dial("tcp", *addr)
	if err != nil {
		log.Fatalf("failed to connect to broker at %s: %v", *addr, err)
	}
	defer conn.Close()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		fmt.Println("\nDisconnecting subscriber...")
		_ = conn.Close()
		os.Exit(0)
	}()

	subCmd := fmt.Sprintf("SUB %s %s %s\n", *topic, *id, m)
	if _, err := conn.Write([]byte(subCmd)); err != nil {
		log.Fatalf("failed to send SUB: %v", err)
	}

	fmt.Println("=====================================================")
	fmt.Printf(" Subscriber [%s] listening on topic [%s]\n", *id, *topic)
	fmt.Printf(" Mode: %s | Auto-ACK: %v | Waiting for messages...\n", m, *autoAck)
	fmt.Println("=====================================================")

	processedMsgs := make(map[string]bool)
	r := bufio.NewReader(conn)
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				fmt.Println("\nBroker closed connection.")
			} else {
				log.Printf("read error: %v", err)
			}
			break
		}

		line = strings.TrimRight(line, "\r\n")
		if strings.HasPrefix(line, "MSG ") {
			parts := strings.SplitN(line, " ", 4)
			if len(parts) >= 4 {
				top := parts[1]
				msgID := parts[2]
				payload := parts[3]

				if processedMsgs[msgID] {
					fmt.Printf("\n[MSG #%s (DUPLICATE DETECTED)] on [%s]: %s (Idempotently skipped)\n", msgID, top, payload)
					if m == "AT_LEAST_ONCE" && *autoAck {
						ackCmd := fmt.Sprintf("ACK %s %s %s\n", top, *id, msgID)
						if _, err := conn.Write([]byte(ackCmd)); err == nil {
							fmt.Printf("  -> [Re-sent ACK for duplicate msg #%s]\n", msgID)
						}
					}
					continue
				}
				processedMsgs[msgID] = true

				var meta struct {
					TS int64 `json:"ts"`
				}
				latencyStr := ""
				if strings.Contains(payload, "\"ts\":") {
					if err := json.Unmarshal([]byte(payload), &meta); err == nil && meta.TS > 0 {
						diff := time.Since(time.Unix(0, meta.TS))
						if diff >= 0 {
							latencyStr = fmt.Sprintf(" [Latency: %d µs / %.2f ms]", diff.Microseconds(), float64(diff.Microseconds())/1000.0)
						}
					}
				}

				fmt.Printf("\n[MSG #%s] on [%s]%s: %s\n", msgID, top, latencyStr, payload)

				if m == "AT_LEAST_ONCE" && *autoAck {
					ackCmd := fmt.Sprintf("ACK %s %s %s\n", top, *id, msgID)
					if _, err := conn.Write([]byte(ackCmd)); err != nil {
						log.Printf("failed to send ACK: %v", err)
					} else {
						fmt.Printf("  -> [ACK sent for msg #%s]\n", msgID)
					}
				}
			} else {
				fmt.Printf("Received: %s\n", line)
			}
		} else {
			fmt.Printf("Received: %s\n", line)
		}
	}
}
