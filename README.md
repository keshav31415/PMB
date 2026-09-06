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
> "Phase 2: Implement core routing and 'At-Least-Once' tracking. Create a state manager mapping topics to active clients. Implement `PUB` logic to fan out messages. For 'At-Least-Once' clients, maintain a `pending_acks` dictionary tracking `msg_id` and timestamps. Implement `ACK` logic to remove these IDs. Run a background monitor that re-queues messages older than 2 seconds without an ACK. Expose `route(topic, payload)` and `process_ack(topic, msg_id)` methods."

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