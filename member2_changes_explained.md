# Member 2 Changes Explained: The Message Router

Welcome! If you're new to Go or just catching up on the Persistent Message Broker (PMB) project, this guide will walk you through exactly what was built by "Member 2", why it was built, and how it works under the hood.

As Member 2, our job was to build the **Router** (the traffic cop). The router is responsible for taking messages from publishers and handing them out to the right subscribers. It also has to make sure that messages are redelivered if a subscriber promises to acknowledge (ACK) them but fails to do so.

Here is a file-by-file, function-by-function breakdown of what was created and why.

---

## 1. `router/router.go` (The Core Logic)

This file contains the actual routing engine.

### The `Subscriber` Struct
**What it is:** Represents a single connected client that wants to receive messages.
**What we did:** 
- We gave it an ID, a Topic, and a Mode (`AT_MOST_ONCE` or `AT_LEAST_ONCE`).
- We gave it a channel (`out`) to send messages through, a `closed` boolean, and a `sync.Mutex` (a lock).
**Why we did it this way:** 
In Go, channels are like pipes. If you try to push data into a closed pipe, your program crashes (panics). The Go "Race Detector" caught a bug where the router was trying to send a message at the exact same millisecond that a client was disconnecting and closing its channel. To fix this, we made the channel private (`out`) and added the `mu sync.Mutex`. Now, the `Subscriber` owns its own pipe and uses the lock to ensure it never tries to send and close at the same time.
- **`send(msg string)`:** A safe way to push a message into the pipe. If the pipe is closed, it gracefully ignores the message.
- **`close()`:** Safely marks the pipe as closed and actually closes it, ensuring it only happens once.

### The `Router` Struct
**What it is:** The main engine that holds everything together.
**What we did:** It contains `subs` (a map of who is subscribed to what) and `pendingAcks` (a map of messages waiting for an ACK). Both maps have their own Mutex locks (`mu` and `ackMu`).
**Why we did it this way:** Maps in Go are not safe to read and write to at the same time from different goroutines. Since many clients will be subscribing, unsubscribing, and acking at the same time, the locks prevent the program from crashing due to concurrent map writes.

### `Subscribe(topic, clientID, mode, out)`
**What it is:** Registers a new client.
**What we did:** It locks the map, creates a new `Subscriber`, and adds it to the list for that specific topic.

### `Unsubscribe(topic, clientID)`
**What it is:** Removes a client when they disconnect.
**What we did:** It locks the map, finds the client, calls `sub.close()` to shut down their channel, and deletes them from the map. Crucially, it also scans the `pendingAcks` map and deletes any unacknowledged messages for that client.
**Why we did it this way:** If we didn't purge the `pendingAcks`, the router would keep trying to resend messages to a ghost client forever!

### `Route(topic, msgID, payload)`
**What it is:** Broadcasts a message to everyone listening to a topic.
**What we did:** It takes a snapshot of all active subscribers. For each one:
- If they are `AT_LEAST_ONCE`, it saves a copy of the message in `pendingAcks` along with the current time.
- It calls `sub.send(msg)` to deliver the message.

### `ProcessAck(topic, clientID, msgID)`
**What it is:** Handles a client saying "I got the message!"
**What we did:** It deletes the message from the `pendingAcks` map so we stop trying to redeliver it. Then, it forwards the ACK to the `StorageEngine` (which Member 3 is building) so the message can eventually be deleted from disk.

### `StartRetryMonitor(ctx, timeout)` & `sweep(timeout)`
**What it is:** A background worker that constantly checks for lost messages.
**What we did:** It wakes up periodically and loops through the `pendingAcks` map. If a message has been sitting there longer than the timeout:
- It increments the `attempts` counter.
- If `attempts` is greater than `MaxRetries` (which is 5), it gives up, deletes the message, and prints a warning.
- Otherwise, it pushes the message back down the client's channel and updates the timestamp to reset the clock.
**Why we did it this way:** Networks are flaky. If a message is lost, the router needs to try again. But if the client is completely frozen and hasn't officially disconnected, we need a "MaxRetries" cap so the router doesn't get stuck retrying infinitely and wasting memory.

---

## 2. `router/router_test.go` (The Unit Tests)

**What it is:** Automated tests that prove the router works.
**What we did:** We wrote tests for every scenario (FanOut, AtMostOnce, AtLeastOnce, Unsubscribe, etc.).
- **`TestRouter_RaceClose`:** This test specifically tries to trigger the concurrency crash we talked about earlier. It spans multiple goroutines that rapidly send messages and unsubscribe at the exact same time. It proves our `Subscriber.close()` fix works because the test passes with zero data races.
- **`TestRouter_RetryGivesUp`:** This test simulates a frozen client and forces the `sweep()` function to run 6 times. It proves that exactly on the 6th try, the router gives up and drops the message.

---

## 3. `cmd/smoketest/main.go` (The Integration Test)

**What it is:** A "throwaway" script that runs the whole system in a fake environment.
**Why we did it:** Member 1 is still building the TCP network, and Member 3 is still building the file storage. We couldn't actually *run* the router as a real server yet. So, we wrote a quick script that pretends to be a network client and pretends to be a hard drive.
**What it does:** 
1. Subscribes a fake worker.
2. Sends a message.
3. Pretends the worker ACK'd it.
4. Sends a *second* message, but this time the fake worker stays silent.
5. Proves that the Retry Monitor kicks in 500 milliseconds later and resends the message.
6. Unsubscribes the worker and proves the channel safely closes.

This script allows anyone to just type `go run ./cmd/smoketest/main.go` and watch the router do its job in real-time, proving the core logic is 100% complete and ready for the other members to connect to!
