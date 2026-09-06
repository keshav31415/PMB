package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"time"
)

func formatPayload(text string, lat bool) string {
	if !lat {
		return text
	}
	b, _ := json.Marshal(map[string]any{
		"ts":  time.Now().UnixNano(),
		"msg": text,
	})
	return string(b)
}

func main() {
	addr := flag.String("addr", "localhost:4222", "Broker TCP address")
	topic := flag.String("topic", "demo.topic", "Topic to publish to")
	msg := flag.String("msg", "", "Message payload (if omitted, interactive mode is used)")
	lat := flag.Bool("lat", false, "Attach nanosecond timestamp for latency tracking")
	flag.Parse()

	conn, err := net.Dial("tcp", *addr)
	if err != nil {
		log.Fatalf("failed to connect to broker at %s: %v", *addr, err)
	}
	defer conn.Close()

	payload := *msg
	if len(flag.Args()) > 0 {
		if payload != "" {
			payload += " "
		}
		payload += strings.Join(flag.Args(), " ")
	}

	if payload != "" {
		finalPayload := formatPayload(payload, *lat)
		line := fmt.Sprintf("PUB %s %s\n", *topic, finalPayload)
		if _, err := conn.Write([]byte(line)); err != nil {
			log.Fatalf("failed to send: %v", err)
		}
		fmt.Printf("Published to [%s]: %s\n", *topic, finalPayload)
		return
	}

	fmt.Printf("Connected to broker at %s (Topic: %s)\n", *addr, *topic)
	fmt.Println("Type message and press Enter to publish (Ctrl+C to quit):")
	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("> ")
		if !scanner.Scan() {
			break
		}
		text := strings.TrimSpace(scanner.Text())
		if text == "" {
			continue
		}
		finalPayload := formatPayload(text, *lat)
		line := fmt.Sprintf("PUB %s %s\n", *topic, finalPayload)
		if _, err := conn.Write([]byte(line)); err != nil {
			log.Fatalf("connection lost: %v", err)
		}
		fmt.Printf("✓ Sent to [%s]\n", *topic)
	}
}
