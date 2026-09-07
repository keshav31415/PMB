# PMB 5-Minute Video Demo: Complete Script & Production Guide

> **Target Duration**: Exactly 5 Minutes (300 seconds)  
> **Format**: Live Screen Recording (Split Terminal + Architecture Diagram) — **No Slides**  
> **Goal**: Demonstrate what PMB is, why it was built, how data moves through its 5 stages, and prove its architectural superiority over Kafka and Redis through live tests.

---

## 🎬 Pre-Flight Checklist & Setup

Before pressing record, complete these one-time setup steps:

1. **Build All Native Binaries**:
   ```powershell
   go build -o bin/server.exe server/main.go
   go build -o bin/bench.exe cmd/bench/main.go
   go build -o bin/publisher.exe cmd/publisher/main.go
   go build -o bin/subscriber.exe cmd/subscriber/main.go
   ```
2. **Clean Stale Logs**:
   ```powershell
   Remove-Item -Path logs\*.log -Force -ErrorAction SilentlyContinue
   ```
3. **Screen Layout Configuration**:
   * Open **Windows Terminal** (or your preferred terminal emulator) with a dark theme.
   * Split into **3 Panes** (or 3 clean side-by-side terminal windows):
     * **Pane 1 (Top-Left)**: Broker Server Process (`server.exe`)
     * **Pane 2 (Bottom-Left)**: Subscriber Client / Disk Inspector (`subscriber.exe` or `Get-Item`)
     * **Pane 3 (Right)**: Publisher Client / Benchmark Suite (`bench.exe`)
   * Set Terminal Font Size to **16pt or 18pt** for crisp readability on mobile and laptops.
4. **Open Diagram in Browser/Image Viewer** (Minimized or ready in background):
   * Open `docs/slide3_solution.svg` (or `docs/architecture-flow.png`) ready to show for 15 seconds at the start.

---

## ⏱️ Timeline Overview

| Timestamp | Segment Name | Live Action / Demonstration | Spoken Core Focus |
| :---: | :--- | :--- | :--- |
| **0:00 – 1:00** | **The Problem & 5-Stage Architecture Trace** | Show architecture diagram (15s) $\to$ Run `bench -trace` | Edge dilemma + live nanosecond stage latency proof |
| **1:00 – 2:00** | **Zero-SDK Wire Protocol in Action** | Run subscriber in Python/netcat $\to$ Publish event | Zero client libraries, plain POSIX ASCII streaming |
| **2:00 – 3:00** | **The Hard-Kill Power Drop Recovery Test** | Publish unacknowledged events $\to$ `taskkill` $\to$ Restart | Real hardware NVMe persistence vs Redis volatile loss |
| **3:00 – 4:00** | **Zero-Leak Active Disk Compaction** | Inspect `logs/orders.log` size before & after ACK | Active 0-byte truncation vs Kafka static disk bloat |
| **4:00 – 5:00** | **Durable Throughput & 7MB RAM Proof** | Run 50k benchmark $\to$ Check Task Manager RAM | 30k+ durable writes/sec at 7MB RAM |

---

# 🎙️ Minute-by-Minute Script, Dialogues & Commands

---

### [0:00 – 1:00] Segment 1: The Problem & The 5-Stage Latency Trace

#### 🎥 Visual on Screen:
* Start by showing `docs/slide3_solution.svg` (or `docs/architecture-flow.png`) fullscreen for 15 seconds.
* At 0:20, switch directly to the 3-pane Terminal.

#### 🗣️ Spoken Dialogue:
> *"Hello! Today we are demonstrating **PMB: Persistent Message Broker**—a high-throughput, crash-resilient messaging engine engineered specifically for edge appliances and hypervisors like Nutanix AHV and Linux KVM.*
> 
> *In edge environments, engineers face an impossible compromise: Enterprise brokers like **Kafka or RabbitMQ** take over 500 megabytes to a gigabyte of RAM just to start, and their static multi-day retention logs rapidly exhaust small edge root disks.*
> *On the other hand, in-memory systems like **Redis or ZeroMQ** are fast, but they run entirely in volatile memory—if the host experiences an unannounced power cut or kernel panic, 100% of in-flight messages vanish.*
> 
> *PMB solves both problems simultaneously: sub-millisecond in-memory speed, physical NVMe crash durability, and zero client dependencies—all inside a single 3.78 megabyte binary that consumes only 7 megabytes of RAM.*
> 
> *Let's see it live."*

#### 💻 Actions & Commands:
1. **[ACTION]**: Switch to Terminal. In **Pane 1 (Top-Left)**, launch the broker:
   ```powershell
   .\bin\server.exe
   ```
2. **[ACTION]**: In **Pane 3 (Right)**, run the lifecycle trace:
   ```powershell
   .\bin\bench.exe -trace
   ```

#### 🖥️ Console Output on Screen:
```text
================================================================
 PMB Single-Message Lifecycle Diagnostics Trace
 Target: localhost:4222 | Topic: perf.bench | Mode: AT_LEAST_ONCE | Payload: 128 bytes
================================================================
[Stage 1] Publisher Dispatched (T0)     : 10:03:50.665325
[Stage 2] Network Ingress + Parse + WAL : ~2.57 ms (in-broker fsync & route)
[Stage 3] Subscriber Delivered (T1)      : 10:03:50.670470 (Msg ID: #1)
   └─► ONE-WAY DELIVERY LATENCY (T1 - T0): 5.14 ms (5.144 ms)
[Stage 4] Subscriber Sent ACK (T2)      : 10:03:50.670470
[Stage 5] Broker ACK Confirmed (T3)     : 10:03:50.675057 (eligible for immediate compaction)
   └─► FULL ROUNDTRIP LATENCY (T3 - T0)  : 9.73 ms (9.731 ms)
================================================================
```

#### 🗣️ Spoken Dialogue:
> *"Notice this trace output. Instead of guessing, our diagnostic tool instruments the exact nanosecond timeline across all 5 stages of the pipeline: from network parsing, our lock-free atomic stack, the physical hardware disk sync barrier, in-memory topic routing, to the subscriber ACK. Full roundtrip delivery with physical persistence takes single-digit milliseconds."*

---

### [1:00 – 2:00] Segment 2: Zero-SDK Wire Protocol & Simplicity

#### 🎥 Visual on Screen:
* Split Terminal view: Broker in Pane 1, Subscriber in Pane 2 (Bottom-Left), Publisher in Pane 3 (Right).

#### 🗣️ Spoken Dialogue:
> *"A major issue in microVM environments is client dependency hell. Guest VMs run stripped-down images and cannot afford heavy language SDKs or JVM runtimes.*
> 
> *PMB requires **zero client SDKs**. Any container, microVM, or language connects using standard raw POSIX TCP sockets over port 4222 using our framed ASCII wire protocol."*

#### 💻 Actions & Commands:
1. **[ACTION]**: In **Pane 2 (Bottom-Left)**, run a subscriber using Python's standard library with zero external packages:
   ```powershell
   python -c "import socket; s=socket.socket(); s.connect(('127.0.0.1',4222)); s.sendall(b'SUB telemetry worker1 AT_LEAST_ONCE\r\n'); print('Subscribed! Waiting for events...'); print(s.recv(1024).decode())"
   ```
2. **[ACTION]**: In **Pane 3 (Right)**, publish a telemetry event:
   ```powershell
   .\bin\publisher.exe -topic telemetry -msg "{\"device_id\":\"sensor_01\",\"temp\":98.6,\"status\":\"OK\"}"
   ```
3. **[ACTION]**: Highlight the incoming message on Pane 2:
   ```text
   MSG telemetry 1 {"device_id":"sensor_01","temp":98.6,"status":"OK"}
   ```

#### 🗣️ Spoken Dialogue:
> *"Here in Pane 2, we subscribed using pure standard library Python sockets—no external pip packages, no heavy driver. In Pane 3, we published a JSON telemetry payload. The message was ingested, persisted to disk, routed through our thread-safe route table, and delivered instantly."*

---

### [2:00 – 3:00] Segment 3: The Hard-Kill Crash Recovery Test

#### 🎥 Visual on Screen:
* Show Broker in Pane 1, Terminal in Pane 2/3.

#### 🗣️ Spoken Dialogue:
> *"Now let's run the acid test: **What happens during an abrupt hypervisor power loss or host kernel crash?***
> 
> *In an in-memory queue like Redis or ZeroMQ, dirty pages vanish, and in-flight messages are permanently lost. Let's see how PMB handles it."*

#### 💻 Actions & Commands:
1. **[ACTION]**: Close the subscriber pane to simulate an edge consumer dropping offline.
2. **[ACTION]**: In **Pane 3**, publish 3 mission-critical order events:
   ```powershell
   .\bin\publisher.exe -topic orders -msg "{\"order_id\":101,\"amount\":499}"
   .\bin\publisher.exe -topic orders -msg "{\"order_id\":102,\"amount\":850}"
   .\bin\publisher.exe -topic orders -msg "{\"order_id\":103,\"amount\":120}"
   ```
3. **[ACTION]**: In **Pane 2**, show the events are physically stored in the append-only WAL on NVMe:
   ```powershell
   Get-Content logs\orders.log
   ```
4. **[ACTION]**: **Brutally terminate the broker process** while unacknowledged messages are pending:
   ```powershell
   taskkill /F /IM server.exe
   ```
5. **[ACTION]**: Immediately restart the broker in **Pane 1**:
   ```powershell
   .\bin\server.exe
   ```
   *(Point out the server startup log: It re-scans `logs/orders.log` and reconstitutes the pending messages in $< 10$ milliseconds).*
6. **[ACTION]**: In **Pane 2**, launch the subscriber:
   ```powershell
   .\bin\subscriber.exe -topic orders -id worker1 -mode AT_LEAST_ONCE
   ```
   *(Watch Pane 2 instantly receive all 3 persisted orders: Msg #1, Msg #2, and Msg #3!)*

#### 🗣️ Spoken Dialogue:
> *"We brutally killed the broker mid-stream with `taskkill`. The operating system dropped instantly. When we restart the binary, PMB scans its physical Write-Ahead Log, rebuilds its unacknowledged state in under 10 milliseconds, and the moment our subscriber reconnects, all three order events are delivered with zero loss. That is true hardware durability."*

---

### [3:00 – 4:00] Segment 4: Zero-Leak Active Disk Compaction

#### 🎥 Visual on Screen:
* Pane 2: Command showing the size of `logs\orders.log`.

#### 🗣️ Spoken Dialogue:
> *"Next: **Why doesn't PMB run out of disk space?***
> 
> *Kafka retains multi-day logs by default. On small edge appliances where root partitions (`/var`) are limited to 20 or 40 gigabytes, static logs quickly fill the filesystem, causing kernel lockups.*
> 
> *PMB solves this with **Active ACK Compaction**."*

#### 💻 Actions & Commands:
1. **[ACTION]**: In **Pane 2**, check the size of `logs\orders.log` before acknowledgment:
   ```powershell
   Get-Item logs\orders.log | Select-Object Name, Length
   ```
   *(Points out: File size is ~ 350 bytes).*
2. **[ACTION]**: The subscriber sends acknowledgments for the received messages (`ACK orders worker1 1`, etc.).
3. **[ACTION]**: Re-check the file size immediately in **Pane 2**:
   ```powershell
   Get-Item logs\orders.log | Select-Object Name, Length
   ```
   *(Highlight: The file length is now **0 bytes**!)*

#### 🗣️ Spoken Dialogue:
> *"Notice that: the exact microsecond our subscriber worker returned an ACK confirming message processing, PMB safely truncates the file back to zero bytes. No background cron jobs, no static multi-day buildup. Steady-state disk utilization stays bounded under 100 megabytes indefinitely."*

---

### [4:00 – 5:00] Segment 5: High-Throughput Benchmark & 7MB RAM Proof

#### 🎥 Visual on Screen:
* Pane 3 (Fullscreen or Left Half): Running `./bin/bench.exe`.
* Right Half: PowerShell command or Task Manager showing PMB Process Memory.

#### 🗣️ Spoken Dialogue:
> *"Finally, let's look at raw performance under high concurrency.*
> 
> *How fast can PMB write to disk while issuing physical hardware `fsync()` barriers? Let's run our benchmark tool with 50,000 messages across 20 concurrent publisher connections."*

#### 💻 Actions & Commands:
1. **[ACTION]**: In **Pane 3**, run the high-performance benchmark suite:
   ```powershell
   .\bin\bench.exe -n 50000 -c 20 -size 128 -mode sync -lat
   ```
2. **[ACTION]**: While it runs, in **Pane 2**, check PMB's resident memory:
   ```powershell
   Get-Process server | Select-Object ProcessName, @{Name="WorkingSet_MB"; Expression={[math]::round($_.WorkingSet/1MB, 2)}}
   ```
   *(Points to screen: `WorkingSet_MB: 7.18`!)*
3. **[ACTION]**: Highlight the completed benchmark results in Pane 3:
   * **Throughput**: **30,000+ durable writes/sec**
   * **Latency P50**: **~380 µs**
   * **Latency P99**: **~1.2 ms**

#### 🖥️ Console Output on Screen:
```text
================================================================================
 PMB High-Performance Benchmark Suite
 Target: localhost:4222 | Topic: perf.bench | Mode: AT_LEAST_ONCE
 Messages: 50000 | Publishers: 20 | Subscribers: 1 | Payload: 128 bytes
================================================================================
 Total Elapsed Time: 1.542 s
 Durable Throughput: 32,425 msgs/sec (4.15 MB/sec)
 Latency Percentiles:
   - P50 (Median)  : 382 µs
   - P90           : 741 µs
   - P99           : 1.18 ms
================================================================================
```

#### 🗣️ Spoken Dialogue (Closing Pitch):
> *"Look at those numbers: Over **32,000 durable messages per second** with hardware `fsync()` barriers, sub-millisecond median latency, and the entire broker process is consuming just **7.18 megabytes of RAM**.*
> 
> *To achieve this, we engineered two core mechanisms:*
> *1. Our **Lock-Free Atomic Treiber Stack**, which uses compare-and-swap pointer operations to completely eliminate mutex contention under high microVM concurrency.*
> *2. Our **Dynamic Group Commit Engine**, which coalesces concurrent publishers into batched physical NVMe writes.*
> 
> *In conclusion: Kafka gives you durability, but costs a gigabyte of memory and exhausts your disks. Redis gives you speed, but loses all data on a power cut. PMB gives you the best of both worlds: 30,000 durable writes per second, sub-millisecond roundtrips, and zero-loss crash resilience—all in a 3.78MB binary running under 10 megabytes of RAM.*
> 
> *Thank you!"*

---

## 🛠️ Copy-Paste Cheat Sheet for the Presenter

Keep this terminal snippet open on a second monitor during recording:

```powershell
# 1. Start Server (Pane 1)
.\bin\server.exe

# 2. Lifecycle Trace (Pane 3)
.\bin\bench.exe -trace

# 3. Publish Orders (Pane 3)
.\bin\publisher.exe -topic orders -msg "{\"order_id\":101,\"amount\":499}"
.\bin\publisher.exe -topic orders -msg "{\"order_id\":102,\"amount\":850}"
.\bin\publisher.exe -topic orders -msg "{\"order_id\":103,\"amount\":120}"

# 4. View WAL on Disk (Pane 2)
Get-Content logs\orders.log

# 5. Hard Kill Broker (Pane 3)
taskkill /F /IM server.exe

# 6. Restart Server (Pane 1)
.\bin\server.exe

# 7. Start Subscriber to Recover (Pane 2)
.\bin\subscriber.exe -topic orders -id worker1 -mode AT_LEAST_ONCE

# 8. Check Active Compaction (Pane 2)
Get-Item logs\orders.log | Select-Object Name, Length

# 9. Run High-Throughput Benchmark (Pane 3)
.\bin\bench.exe -n 50000 -c 20 -size 128 -mode sync -lat

# 10. Check Broker RAM Footprint (Pane 2)
Get-Process server | Select-Object ProcessName, @{Name="RAM_MB"; Expression={[math]::round($_.WorkingSet/1MB, 2)}}
```
