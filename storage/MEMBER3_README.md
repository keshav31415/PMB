# Member 3 — Persistence Layer (Write-Ahead Log)

**Role:** Accountant — ensures **no message is ever lost**, even if the broker
crashes mid-flight.

---

## Table of Contents

1. [What this package does](#what-this-package-does)
2. [Architecture](#architecture)
3. [Files in this package](#files-in-this-package)
4. [API — for Member 1 (TCP Server)](#api--for-member-1-tcp-server)
5. [Integration contract — for Member 2 (Router)](#integration-contract--for-member-2-router)
6. [How to run the tests](#how-to-run-the-tests)
7. [How to run the full broker (once Member 1 is ready)](#how-to-run-the-full-broker)
8. [Log file format](#log-file-format)
9. [Retention policy](#retention-policy)
10. [Design decisions](#design-decisions)

---

## What this package does

When a publisher sends a message to the broker, Member 3 writes it to a
**Write-Ahead Log (WAL)** on disk *before* the router delivers it to any
subscriber. If the broker crashes after writing but before delivery, the
message is recovered on the next startup and re-delivered — **zero data loss**.

Two retention strategies are supported (satisfying the "duration or capability"
requirement in the project spec):

| Strategy | Trigger | What gets pruned |
|----------|---------|-----------------|
| **ACK-based** (`GC`) | Subscriber sends `ACK` | Messages that have been ACKed |
| **Age-based** (`GCByAge`) | Background timer | Messages older than a configured threshold |

---

## Architecture

```
Publisher
   │  PUB <topic> <msgID> <payload>
   ▼
Member 1 (TCP Server)   ← NOT YET IMPLEMENTED
   │
   ├─► storage.Append(topic, msgID, payload)   ← writes W record + fsync
   │
   └─► router.Route(topic, msgID, payload)
            │
            └─► Subscriber(s)
                    │
                    └── ACK <topic> <msgID>
                              │
                    Member 1 receives ACK
                              │
                    router.ProcessAck(topic, clientID, msgID)
                              │
                    storage.MarkAcked(topic, msgID)  ← writes A record + fsync
```

On **startup**:
```
storage.RecoverAll() → map[topic][]Msg (all unacked messages)
   │
   └─► router.Route(topic, msg.ID, msg.Payload)   re-queue for delivery
```

---

## Files in this package

| File | Purpose |
|------|---------|
| `storage.go` | Production WAL implementation |
| `storage_test.go` | Core unit tests (roundtrip, crash recovery, GC, concurrency) |
| `bug_test.go` | Regression tests for specific bugs found during development |
| `MEMBER3_README.md` | This file |

Log files are written to a `logs/` directory relative to wherever the broker
binary is run from. Each topic gets its own file, e.g. `logs/orders.log`.

---

## API — for Member 1 (TCP Server)

Import path: `PMB/storage`

### Startup sequence

```go
import "PMB/storage"

// 1. Create the WAL (creates logs/ dir if it doesn't exist)
store := storage.New()

// 2. Recover any messages that weren't ACKed before last crash
pending, err := store.RecoverAll()
if err != nil {
    log.Fatal(err)
}

// 3. Re-queue recovered messages into the router
for topic, msgs := range pending {
    for _, m := range msgs {
        router.Route(topic, m.ID, m.Payload)
    }
}

// 4. Start GC daemon — runs every 60s, age-prunes anything older than 5min
gc := storage.NewGCDaemon(store, 60*time.Second, 5*time.Minute)
gc.Start()
defer gc.Stop()

// 5. Wire store into the router
r := router.New(store)

// 6. Now start your TCP listener...
```

### On receiving a PUB command

```go
// MUST call Append BEFORE calling router.Route
// If Append fails, return an error to the publisher — do NOT route the message
if err := store.Append(topic, msgID, payload); err != nil {
    // send ERR to client
    return
}
router.Route(topic, msgID, payload)
```

### On receiving an ACK command

```go
// The router handles this — it internally calls store.MarkAcked
router.ProcessAck(topic, clientID, msgID)
```

### The Msg type (returned by RecoverAll / Recover)

```go
type Msg struct {
    ID      string   // message ID (same string you passed to Append)
    Topic   string
    Payload string   // fully unescaped, safe to use as-is
    Ts      float64  // Unix timestamp as float64 (seconds since epoch)
}
```

---

## Integration contract — for Member 2 (Router)

**Nothing changes for Member 2.** The `WAL` already satisfies the
`router.StorageEngine` interface you defined:

```go
// router.go — your interface
type StorageEngine interface {
    MarkAcked(topic, msgID string) error
}

// storage.go — our implementation (automatically satisfies it)
func (w *WAL) MarkAcked(topic, msgID string) error { ... }
```

Wire it in your `New()` call via Member 1:

```go
store := storage.New()
r := router.New(store)   // passes WAL as StorageEngine — done
```

**The stub in `cmd/smoketest/main.go` can now be replaced** with the real WAL:

```go
// Before (stub):
stub := &stubEngine{}
r := router.New(stub)

// After (real WAL):
store := storage.New()
r := router.New(store)
```

---

## How to run the tests

Requires Go 1.21+. Make sure Go is on your PATH:

```bash
# Check Go is installed
go version
```

### Run all tests (storage only)

```bash
cd storage/
go test ./...
```

### Run with verbose output (see each test name)

```bash
go test ./... -v
```

### Run with the race detector (catches concurrency bugs)

```bash
go test ./... -race
```

### Run the entire project's test suite

```bash
# From the repo root
go test ./... -race -v
```

### Run a specific test by name

```bash
go test -run TestGCByAge_PrunesOldRecords -v ./...
go test -run TestCrashRecovery -v ./...
```

### Expected output (all passing)

```
=== RUN   TestAppendAndRecover
--- PASS: TestAppendAndRecover
=== RUN   TestMarkAckedFiltersOnRecover
--- PASS: TestMarkAckedFiltersOnRecover
=== RUN   TestCrashRecovery
--- PASS: TestCrashRecovery
=== RUN   TestGCPrunesAckedRecords
--- PASS: TestGCPrunesAckedRecords
=== RUN   TestConcurrentAppends
--- PASS: TestConcurrentAppends
=== RUN   TestPayloadWithPipes
--- PASS: TestPayloadWithPipes
=== RUN   TestPayloadWithNewlines
--- PASS: TestPayloadWithNewlines
=== RUN   TestGCByAge_PrunesOldRecords
--- PASS: TestGCByAge_PrunesOldRecords
=== RUN   TestGCByAge_DropsOrphanAckRecords
--- PASS: TestGCByAge_DropsOrphanAckRecords
=== RUN   TestBug1_BrokenHandleNotCleared
--- PASS: TestBug1_BrokenHandleNotCleared
=== RUN   TestBug2_GCClosesHandleEvenWhenNothingPruned
--- PASS: TestBug2_GCClosesHandleEvenWhenNothingPruned
PASS
ok  PMB/storage  ~2s
```

---

## How to run the full broker

> ⚠️ Requires Member 1's TCP server to be implemented first.

Once Member 1 adds `cmd/server/main.go`:

```bash
# From repo root
go run ./cmd/server/

# The broker will:
# 1. Recover any unacked messages from logs/
# 2. Start the GC daemon
# 3. Listen for TCP connections on port 4222
```

To test manually with netcat:

```bash
# Terminal 1 — subscribe
nc localhost 4222
SUB orders client1 AT_LEAST_ONCE

# Terminal 2 — publish
nc localhost 4222
PUB orders msg-001 hello-world

# Terminal 1 should print:
# MSG orders msg-001 hello-world

# ACK it:
ACK orders msg-001
```

---

## Log file format

All logs live in `logs/` relative to the binary's working directory.

```
logs/
  orders.log
  payments.log
  orders_india.log     ← slashes and dots replaced with underscores
```

Each line in a log file is one of two record types:

```
W|<msgID>|<unix_ts_float>|<topic>|<payload>
A|<msgID>|<topic>|<unix_ts_float>
```

**Payload escaping:** `|` → `\|` and `\n` → `\n` (literal backslash-n).
This means any payload — including JSON with newlines or pipes — survives
the log format without corruption.

Example log file:

```
W|msg-001|1757264400.123456|orders|{"item":"book","qty":2}
W|msg-002|1757264401.654321|orders|{"item":"pen","qty":5}
A|msg-001|orders|1757264402.000000
```

On recovery: `msg-002` is returned (no matching A record). `msg-001` is skipped.

---

## Retention policy

### ACK-based (GC)
A message is removed from the log once its subscriber sends an `ACK`.
Suitable for `AT_LEAST_ONCE` subscribers.

### Age-based (GCByAge)
A message is removed after it exceeds a configured maximum age, regardless
of whether it was ACKed. This prevents unbounded log growth for:
- `AT_MOST_ONCE` topics (no ACKs ever sent)
- Topics where the subscriber has died permanently

The GC daemon runs both strategies in the same sweep. Configure the age
threshold when creating the daemon:

```go
// Sweep every 60 seconds, discard messages older than 5 minutes
gc := storage.NewGCDaemon(store, 60*time.Second, 5*time.Minute)
```

---

## Design decisions

| Decision | Reason |
|----------|--------|
| `f.Sync()` on every write | Forces OS to physically flush to disk. Without this, a power cut between `write()` and the OS buffer flush silently loses the record. |
| One file per topic | Topics don't serialize behind a single file lock. Concurrent publishers on different topics get full parallelism. |
| Per-topic `sync.Mutex` | Same reason — map access is safe without one global lock. |
| Atomic GC (`.tmp` + `os.Rename`) | `os.Rename` is atomic on Linux. If the process dies mid-GC, the original log is untouched. No corruption possible. |
| File handle kept open | Opening/closing on every write is expensive. Handle is cached per topic, evicted only when GC replaces the file or a write error occurs. |
| Pipe + newline escaping | Our delimiter is `|` and records are newline-separated. Payloads containing either character must be escaped or they silently corrupt the log. |
