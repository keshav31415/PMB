# Persistent Message Broker - Hackathon Architecture & Master Contract

## 1. The Exact Problem Statement
**Project Area:** Persistent Message Broker (NATS)
**Detailed Information:** 
Bring in your ideas in building a Message Broker with a Pub-Sub model. The delivery guarantees include as per client need: Max Once, At least once. Provide a mechanism to retain messages for a certain duration or based on certain capability.

---

## 2. The Master Agent Constraint (Phase 0)
**Human Instruction:** Before generating any code, every team member must paste this exact prompt into their Antigravity IDE agent chat. Do not proceed until the agent acknowledges these rules.

> **SYSTEM PROMPT:** We are building a custom, lightweight Persistent Message Broker from scratch, inspired by NATS JetStream, for a 48-hour hackathon. 
> 
> **Constraint 1:** Use strictly standard libraries (e.g., standard `socket`, `threading`/`selectors`, `os` modules). Do not use external web frameworks, heavy message queues, or database ORMs.
> **Constraint 2:** The network protocol will be plain text over raw TCP (newline-delimited).
> **Constraint 3:** Persistence must be implemented via a custom append-only Write-Ahead Log (WAL) directly to the file system using standard file I/O operations and manual OS flushes.
> **Constraint 4:** Keep all variable names short and concise throughout the codebase (e.g., use `msg` instead of `message_payload`, `fd` instead of `file_descriptor`). Do not over-document with excessive inline comments.
> **Constraint 5:** Ensure cross-platform compatibility where possible, but prioritize WSL2 Ubuntu/Linux system behaviors for file descriptors and non-blocking I/O.
> 
> Await my command for specific component implementation.

---

## 3. The ASCII Wire Protocol (Detailed Specification)
All network communication over the TCP socket uses newline-delimited (`\n`) ASCII strings. The parser must buffer incoming bytes until a `\n` is encountered to prevent sticky TCP packets.

### Client -> Server Commands
* **Publish:** `PUB <topic> <payload>\n`
  * *Example:* `PUB orders.india {"id": 1042, "status": "pending"}\n`
* **Subscribe:** `SUB <topic> <client_id> <mode>\n` 
  * *Modes:* `AT_MOST_ONCE` (fire and forget) or `AT_LEAST_ONCE` (requires ACK).
  * *Example:* `SUB orders.india worker_node_1 AT_LEAST_ONCE\n`
* **Acknowledge:** `ACK <topic> <client_id> <msg_id>\n`
  * *Example:* `ACK orders.india worker_node_1 501\n`
* **Health Check:** `PING\n`

### Server -> Client Responses
* **Message Dispatch:** `MSG <topic> <msg_id> <payload>\n`
  * *Example:* `MSG orders.india 501 {"id": 1042, "status": "pending"}\n`
* **Health Response:** `PONG\n`
* **Error/Disconnect:** `ERR <reason>\n`

---

## 4. Division of Labor & Execution Prompts

### Member 1: The Doorman (Network Layer & CLI)
**Role:** Manage the TCP server loop, handle socket connections, parse the raw byte stream into clean protocol strings, and build the testing tools.

**What is Fixed (Must-Haves):**
* The server must listen on a raw TCP port (e.g., 4222).
* Must implement a safe read buffer that handles chunked TCP streams and splits precisely on `\n`.
* Must provide two thin CLI scripts (`publisher` and `subscriber`) for the live demo.
* Must wrap all socket operations in robust try/except blocks to prevent `BrokenPipeError` crashes when clients disconnect unexpectedly.

**What is Open-Ended (Creative Freedom):**
* How you handle concurrent connections (Thread per connection vs. Event loop).
* How you structure the internal API that hands off parsed strings to Member 2.

**Ideas for Innovation (How to Impress Judges):**
* **I/O Multiplexing:** Instead of spawning threads, use the `epoll` system call (via Python `selectors` or native C++) to run a single-threaded event loop capable of juggling 10,000+ idle socket connections with near-zero memory footprint.
* **Firehose Benchmarking:** Build a high-performance C++ or Python benchmarking CLI that blasts 100,000 requests to calculate exact throughput and latency metrics for the demo.

**Agent Prompt for Member 1:**
> "Phase 1: Build the core TCP server and text-based parser. Implement an event-driven non-blocking server (e.g., using `selectors` / `epoll`). Implement a robust read buffer that handles sticky TCP packets and yields complete commands split by `\n`. Expose a clean interface `dispatch_command(cmd_args, socket_fd)` that Member 2 will hook into. Write two minimal CLI scripts (`publisher` and `subscriber`) to test standard socket communication."

---

### Member 2: The Traffic Cop (Routing & Delivery)
**Role:** Maintain the in-memory data structures linking active sockets to topics, and implement the safety net for guaranteed message delivery.

**What is Fixed (Must-Haves):**
* Must maintain a map of `topic -> list_of_sockets`.
* Must implement the "At-Most-Once" broadcast logic (immediate forward, no tracking).
* Must implement the "At-Least-Once" tracker: store `msg_id` and a timestamp when sent, wait for `ACK`, and automatically re-queue if an ACK is not received within a timeout threshold (e.g., 2 seconds).

**What is Open-Ended (Creative Freedom):**
* How unacknowledged messages are stored in memory and how the retry loop is architected without blocking the main router.
* How to handle subscribers that reconnect after crashing.

**Ideas for Innovation (How to Impress Judges):**
* **Stateful Consumer Offsets:** Instead of blindly retransmitting timeouts, track the exact `last_acked_msg_id` for every unique `client_id` in a hash map. If a client disconnects and reconnects 10 minutes later, instantly stream the precise backlog of missed messages from their saved offset.
* **Lock-Free Concurrency:** If operating in a multi-threaded context, use lock-free queues or atomic operations to manage the routing table, mimicking high-frequency trading architectures.

**Agent Prompt for Member 2:**
> "Phase 2: Implement core routing and 'At-Least-Once' tracking. Create a state manager mapping topics to active clients. Implement `PUB` logic to fan out messages. For 'At-Least-Once' clients, maintain a `pending_acks` dictionary tracking `msg_id` and timestamps. Implement `ACK` logic to remove these IDs. Run a background monitor that re-queues messages older than 2 seconds without an ACK. Expose `route(topic, payload)` and `process_ack(topic, client_id, msg_id)` methods."

---

### Member 3: The Archivist (Storage & Retention)
**Role:** Guarantee persistence by safely writing data to the physical disk and implementing the retention engine to prevent disk overflow.

**What is Fixed (Must-Haves):**
* Must append incoming messages to a `.log` file on disk before Member 2 broadcasts them.
* Must enforce an immediate OS-level disk flush (e.g., `fsync`) to survive a hard power cut.
* Must implement a boot-up function that reads the logs to recover the current state.
* Must implement a retention mechanism (capability or time-based) to delete old logs.

**What is Open-Ended (Creative Freedom):**
* The physical format of the log file (Text vs. Binary).
* The trigger logic for the retention engine.

**Ideas for Innovation (How to Impress Judges):**
* **Interest-Based Retention:** Fulfill the prompt's "based on certain capability" requirement by innovating on storage. Hook into Member 2's ACK system. The absolute microsecond that all active, durable consumers have ACKed a specific message block, instantly truncate or delete that file segment to reclaim space.
* **Binary Logging:** Bypass text encoding entirely. Write raw binary structs to disk (e.g., 4-byte length header, 8-byte sequence ID, raw payload) using native file descriptors to maximize write throughput.

**Agent Prompt for Member 3:**
> "Phase 3: Implement the Write-Ahead Log (WAL) and retention policy. Create a storage engine appending to `<topic>.log`. Format: `[Timestamp] [msg_id] [Payload]\n`. Call `fsync` immediately after every write to commit to disk. Write a recovery function to parse these files on server boot. Implement an 'Interest-Based' retention cleanup function that deletes a log file only when triggered by the router confirming all active consumers have acknowledged the data."

---

## 5. Status Update: Member 2 (The Traffic Cop) — Routing & Delivery

**Status: Complete, tested, and pushed.** This section documents what was built, what
changed along the way, and exactly what Member 1 and Member 3 need to know before
integrating against this package.

### What was built

The `router` package (`router/router.go`) implements the full Phase 2 spec:

- A concurrency-safe `topic -> clientID -> Subscriber` map.
- `AT_MOST_ONCE`: immediate fan-out, no tracking, no retries.
- `AT_LEAST_ONCE`: messages are tracked in a `pendingAcks` map keyed by
  `(topic, clientID, msgID)` until acknowledged.
- A background retry monitor (`StartRetryMonitor`) that re-sends unacknowledged
  messages after a configurable timeout, with a bounded retry cap (`MaxRetries = 5`)
  so a client that vanishes without disconnecting cleanly doesn't get retried forever.
- Clean subscriber lifecycle: `Unsubscribe` safely closes a client's channel exactly
  once and purges any of its pending acks, with no possibility of a send/close race
  (see "Bugs found and fixed" below).

### Public API (what Member 1 and Member 3 build against)

```go
router.New(store StorageEngine) *Router

(r *Router) Subscribe(topic, clientID, mode string, out chan<- string)
(r *Router) Unsubscribe(topic, clientID string)
(r *Router) Route(topic, msgID, payload string)
(r *Router) ProcessAck(topic, clientID, msgID string)
(r *Router) StartRetryMonitor(ctx context.Context, timeout time.Duration)

type StorageEngine interface {
    MarkAcked(topic, msgID string) error
}
```

### What this means for Member 1 (Doorman)

- On every new `SUB <topic> <client_id> <mode>`, call `router.Subscribe(...)` with a
  channel you own the receiving end of. The router only ever sends into it.
- On **every** disconnect — clean or abrupt (dropped socket, `BrokenPipeError`, etc.) —
  call `router.Unsubscribe(topic, clientID)`. **Do not close the channel yourself.**
  The router closes it internally as part of `Unsubscribe`, under its own lock, to
  guarantee it can never race with an in-flight `Route()` send. Closing it externally
  reintroduces a real data race we hit and fixed during development (see below).
- On `ACK <topic> <client_id> <msg_id>`, call `router.ProcessAck(...)`.
- On `PUB <topic> <payload>`, generate a `msg_id` and call `router.Route(topic, msgID, payload)`.
- A working, runnable example of this entire lifecycle exists at
  `cmd/smoketest/main.go` — run `go run ./cmd/smoketest` to see subscribe → publish →
  deliver → ack → retry-on-no-ack → unsubscribe → channel-closed happen end-to-end
  with an in-memory stand-in for your connection and Member 3's storage.

### What this means for Member 3 (Archivist)

- Implement `StorageEngine.MarkAcked(topic, msgID string) error` on your WAL. This is
  the only method the router calls into your code — it's invoked from `ProcessAck`
  right after a message is confirmed delivered, so it's your hook for the
  "Interest-Based Retention" idea (this is the trigger you can use to check whether
  all active consumers have now acked a segment).
- Currently `ProcessAck` swallows any error `MarkAcked` returns (best-effort, logged
  nowhere yet). Flag if you want that to surface differently (e.g. logged, or
  retried) before the demo.

### Bugs found and fixed along the way (for context, not action needed)

1. **`ackKey` didn't scope by topic** — could collide if `msgID`s aren't globally
   unique across topics. Fixed by keying on `(topic, clientID, msgID)`.
2. **`pendingAcks` wasn't cleaned up on `Unsubscribe`** — a disconnected client's
   unacked messages would retry forever. Fixed: `Unsubscribe` now purges them.
3. **Data race on subscriber channel close** — an earlier version relied on
   `recover()` to survive a send-on-closed-channel panic. The Go race detector
   (`go test -race`) correctly flagged this as unsafe regardless of the recover,
   since concurrent close/send on the same channel is undefined behavior. Fixed
   properly: `Subscriber` now owns its channel privately, guarded by its own mutex,
   with `send()`/`close()` methods that can never race. This is why `Subscriber.Out`
   is no longer a public field — **any code that used to touch it directly needs to
   go through `Router` methods instead.**
4. **Unbounded retries** — added `MaxRetries` cap with a log line when a message is
   finally given up on.

### Testing

- `go test -v -race ./router` — 8 tests, 0 data races (verified across 10 consecutive
  runs).
- `go run ./cmd/smoketest` — full manual lifecycle verification, safe to delete once
  real Member 1 / Member 3 code exists and is integrated.

### Still open (not blocking, worth a heads-up)

- Retry cap (`MaxRetries`) is a hardcoded constant, not configurable via `New()` yet.
- No stateful consumer offsets (the "Innovation" stretch goal) implemented yet —
  possible if time allows after core integration.