# PMB Technical Presentation & Architecture Deck Specification

> **For the Next Engineer & Coding Agent**:
> This document is your comprehensive handover guide for generating the official **Persistent Message Broker (PMB)** presentation pitch deck. It preserves the complete architectural context, design rules, iterative workflow, and slide-by-slide spatial wireframes.

---

## 1. Core Presentation Philosophy & Guidelines

1. **Self-Explanatory for Evaluators & Judges**:
   - The presentation must explain **what the system is, where it sits, and how data flows** in terms that any software engineer or technical hackathon judge can immediately understand—without requiring deep specialization in low-level hypervisor kernels.
   - Avoid impenetrable jargon walls. Focus on **clear component interactions**, **arrows showing causality**, and **concrete numbers** (e.g. `3.78 MB binary`, `< 10 MB RAM`, `30,000+ durable writes/sec`).

2. **Visually Appealing & High Contrast (Deep Tech Dark Theme)**:
   - **Background**: Midnight Navy (`#0B0F19`)
   - **Card Containers**: Dark Slate (`#131B2B` or `#1E293B`) with subtle glowing borders (`#23324A`, `#38BDF8`)
   - **Accent Colors**:
     - Cyan (`#38BDF8`): System boundaries, ports, protocols, primary components
     - Emerald (`#34D399`): Durability, physical NVMe, success metrics
     - Violet (`#818CF8`): Consumer / subscriber egress, routing
     - Amber (`#FBBF24`): Warnings, timing invariants, hardware limits
     - Coral Red (`#F87171`): Failure states, bottlenecks, crashes
   - **Zero Dark/Black Invisible Text**: NEVER allow text to default to black (`#000000`) or dark navy (`#1E293B`) on dark backgrounds. All text must be explicitly colored: pure white (`#FFFFFF`) for primary labels/titles, slate silver (`#94A3B8`) for descriptions, or explicit bright accents.

3. **Avoid Wireframe Rectangles & Spaghetti Clutter**:
   - Do NOT use hollow, border-only rectangles. Every component must be a solid, elevated card with rounded corners (`rx="6"` to `8`), distinct header pills, and clear visual hierarchy.
   - Keep connector lines clean and orthogonal. Label arrows with pill badges (e.g., `1. TCP PUB`, `2. Hard f.Sync()`) rather than overlapping text.

4. **No Redundant Diagrams**:
   - Ensure every diagram serves a distinct purpose. For example:
     - **Slide 1**: Shows *physical hypervisor placement* (Host OS, Guest MicroVMs, Physical NVMe, inter-VM network sockets).
     - **Slide 3**: Shows the *internal data execution lifecycle* (TCP parser -> atomic CAS queue -> group commit fsync -> route table -> ACK compaction).

---

## 2. Technical Stack & Development Workflow

Do **NOT** generate plain, unstyled PowerPoint files using basic bullet points. We use programmatic generation with custom vector rendering and automated headless visual verification.

### Tooling Architecture
```
+-------------------------------------------------------------------------+
| DEVELOPMENT & VISUAL VERIFICATION PIPELINE                              |
|                                                                         |
|  1. Custom SVG Generation   -->   2. PPTX Generation (pptxgenjs)        |
|     (docs/*.svg)                     (Modern 16:9 LAYOUT_WIDE)          |
|     • Solid gradient cards           • 13.33" x 7.5" canvas             |
|     • Explicit hex text colors       • Precision card positioning       |
|     • High-contrast badges           • Embeds vector SVGs & text cards  |
|                                              |                          |
|                                              v                          |
|  4. Visual Quality Review   <--   3. Headless PNG Export                |
|     (Agent / Human inspects)         (PowerPoint COM Automation)        |
|     • docs/preview_slide_X.png       • powershell export_slides.ps1     |
|     • Verifies layout & contrast     • Renders crisp 1080p slide PNGs   |
+-------------------------------------------------------------------------+
```

### Complete Production Pipeline
1. **SVG Assets**: `scripts/presentation/generate_custom_svgs.js` generates `docs/slide1_topology.svg` through `docs/slide8_wire_protocol.svg`.
2. **Deck Generator**: `scripts/presentation/generate_all_slides.js` builds all 10 slides cleanly into `PMB_Architecture_Pitch.pptx` using `pptxgenjs` with `LAYOUT_WIDE`.
3. **Execution**:
   ```powershell
   npm --prefix scripts/presentation run build
   ```
4. **Slide Visual Exports**: Verified 1080p slide renders are exported to `docs/deck_slide_1.png` through `docs/deck_slide_10.png`.

---

## 3. Deck Structure: Slide-by-Slide Blueprint & Spatial Layouts

Below is the complete 10-slide blueprint with spatial ASCII wireframes for every slide.

---

### Slide 1: System Topology & Hypervisor Placement
* **Purpose**: Explain *where PMB sits* in the datacenter/edge hardware stack and how microVMs communicate with it without shared memory.
* **Key Takeaway**: PMB is an ultra-lightweight (3.78MB), zero-dependency broker running on the hypervisor host to bridge isolated guest microVMs over standard TCP with hardware NVMe durability.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [DEPLOYMENT TOPOLOGY & PHYSICAL CONSTRAINTS]                                                      |
| System Architecture & Hypervisor Placement                                                        |
| Self-contained, crash-resilient message broker engineered for hypervisors, microVMs, & edge nodes |
+----------------------------------------------------+----------------------------------------------+
| LEFT PANEL: DEPLOYMENT CONTEXT & INTER-VM IPC      | RIGHT PANEL: HARDWARE TOPOLOGY DIAGRAM       |
| (w: 4.8", h: 5.5")                                 | (w: 6.73", h: 5.5")                          |
|                                                    |                                              |
| • Operational Boundary:                            | +------------------------------------------+ |
|   Nutanix AHV / Linux KVM host running isolated    | | HOST HYPERVISOR (AHV / KVM / Firecracker)| |
|   guest microVMs with zero shared host memory.     | |                                          | |
|                                                    | |  [MicroVM 1] ---TCP PUB---> [PMB Core]  | |
| • Where PMB Sits:                                  | |  (Producer)                 (:4222)     | |
|   Native Go daemon on port :4222. Statically       | |                              |   |       | |
|   linked binary (3.78 MB), 7.18 MB idle RAM.       | |                      f.Sync  |   | MSG   | |
|                                                    | |                              v   v       | |
| • Neighbor Interactions:                           | |                          [NVMe] [MicroVM2]| |
|   - VM #1 Ingress: Raw TCP PUB (Zero-SDK).         | |                          (WAL)  (Consumer) | |
|   - NVMe Subsystem: Hardware fsync() barrier.      | +------------------------------------------+ |
|   - VM #2 Egress: Guaranteed MSG + Stream ACK.     |                                              |
|                                                    | +------------------------------------------+ |
| • Hardware & Resource Guarantees:                  | | INVARIANT: HARDWARE ISOLATION            | |
|   < 10 MB RAM peak. Prevents host starvation.      | | MicroVMs remain isolated; broker owns    | |
|                                                    | | disk sync and sub-millisecond dispatch.  | |
|                                                    | +------------------------------------------+ |
+----------------------------------------------------+----------------------------------------------+
```

---

### Slide 2: The Problem Space: The Durability-Resource Dilemma
* **Purpose**: Clearly explain *why* traditional message queues and IPC layers fail in hypervisors and edge appliances.
* **Key Takeaway**: Enterprise brokers consume too much memory and exhaust root disks; in-memory queues lose 100% of data on power cuts.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [DISTRIBUTED SYSTEMS TRADE-OFF ANALYSIS]                                                          |
| The Problem Space: The Durability-Resource Dilemma                                                |
| Why conventional messaging architectures break down in hypervisors and edge nodes                 |
+---------------------------------------------------------------------------------------------------+
| TOP CONTEXT BANNER:                                                                               |
| Edge hypervisors allocate strict < 64MB memory budgets to auxiliary daemons, yet face sudden      |
| unannounced power drops and host panics. Traditional tools force an unacceptable failure mode:   |
+---------------------------------------------------------------------------------------------------+
| MIDDLE DIAGRAM: COMPARATIVE FAILURE PATHWAYS (Horizontal SVG)                                     |
|                                                                                                   |
| ROUTE A (Enterprise Queue):                                                                       |
| [MicroVM Ingress] -> [JVM/BEAM Runtime (500MB+ RAM)] -> [ZooKeeper] -> [7-Day Log] -> [CRITICAL OOM] |
|                                                                                                   |
| ROUTE B (In-Memory IPC):                                                                          |
| [MicroVM Ingress] -> [Socket Buffer] -> [Unsynchronized RAM Heap] -> [⚡ Power Drop] -> [100% DATA LOSS]|
+--------------------------------------------------+------------------------------------------------+
| LEFT CARD: ROUTE A (Kafka / RabbitMQ)            | RIGHT CARD: ROUTE B (Redis PubSub / ZeroMQ)    |
| (w: 5.71", h: 2.1")                              | (w: 5.71", h: 2.1")                            |
| • 500MB - 1.5GB base runtime footprint tax.      | • Buffers live purely in volatile user RAM.    |
| • Static 7-day retention fills /var root disk.   | • Power drop = 100% in-flight message loss.    |
| • 15–45s boot quorum halts failovers.            | • 1-second AOF flush still loses 1000ms data.  |
+--------------------------------------------------+------------------------------------------------+
```

---

### Slide 3: The Technical Solution: The PMB Hybrid Pipeline
* **Purpose**: Show the *internal data execution lifecycle* of how PMB achieves sub-millisecond latency and < 10 MB RAM with physical hardware durability.
* **Key Takeaway**: A 5-stage lock-free and batched execution pipeline bridges high-speed memory ingress with physical NVMe crash protection.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [CORE ARCHITECTURAL ENGINE & ZERO-LOSS PIPELINE]                                                  |
| The Technical Solution: The PMB Hybrid Pipeline                                                   |
| How PMB resolves the dilemma: Sub-millisecond latency & < 10MB RAM with physical fsync durability  |
+---------------------------------------------------------------------------------------------------+
| TOP DIAGRAM: PMB INTERNAL EXECUTION PIPELINE & DATA LIFECYCLE (Horizontal 5-Stage SVG)             |
|                                                                                                   |
| +-----------+     +-----------+     +-----------+     +-----------+     +-----------+             |
| |  STAGE 1  | --> |  STAGE 2  | --> |  STAGE 3  | --> |  STAGE 4  | --> |  STAGE 5  |             |
| |  Ingress  |     |  Atomic   |     |Durability |     | Dispatch  |     |  Reclaim  |             |
| |Zero-Copy  |     |Treiber CAS|     |Group Commit     |Route Table|     |ACK Compact|             |
| |Framed 1MB |     |sync/atomic|     |NVMe fsync |     |pendingAcks|     |Truncate 0B|             |
| +-----------+     +-----------+     +-----------+     +-----------+     +-----------+             |
|                                                                                                   |
| [BOTTOM HIGHLIGHT: PMB reclaims disk blocks upon subscriber ACK, keeping disk < 100MB indefinitely]|
+--------------------------+--------------------------------+---------------------------------------+
| STAGE 1: INGRESS & PARSER| STAGE 2: DYNAMIC GROUP COMMIT  | STAGE 3: SAFE EGRESS & COMPACTION     |
| (w: 3.71", h: 2.2")      | (w: 3.71", h: 2.2")            | (w: 3.71", h: 2.2")                   |
| • Framed ASCII parser.   | • Hardware fsync() barrier.    | • In-memory route table fan-out.      |
| • 1MB input buffer limit.| • Dynamic channel batching.    | • pendingAcks 2-second retry timer.   |
| • Lock-free CAS enqueue. | • 30,000+ durable writes/sec.  | • Instant offset truncation on ACK.   |
+--------------------------+--------------------------------+---------------------------------------+
```

---

### Slide 4: Deep Dive: Lock-Free Ingress & The Atomic Treiber Stack
* **Purpose**: Explain how PMB eliminates lock contention when dozens of microVMs publish concurrently.
* **Key Takeaway**: Mutex locks cause thread priority inversion under hypervisor CPU scheduling; PMB uses a lock-free CAS stack for zero-contention ingestion.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [CONCURRENCY ARCHITECTURE]                                                                        |
| Lock-Free Ingress: Atomic Treiber Stack & CAS Contention Elimination                              |
| Eliminating mutex serialization bottlenecks during multi-microVM concurrent event storms          |
+---------------------------------------------------+-----------------------------------------------+
| LEFT PANEL: THE MUTEX CONTENTION PROBLEM          | RIGHT PANEL: PMB'S ATOMIC TREIBER STACK       |
|                                                   |                                               |
| +-----------------------------------------------+ | +-------------------------------------------+ |
| | Traditional Mutex Contention:                 | | | PMB sync/atomic Pointer Ingress:          | |
| |                                               | | |                                           | |
| | VM1 -> [Lock Wait] \                          | | | VM1 \                                     | |
| | VM2 -> [Lock Wait] -- [MUTEX SERIALIZATION]   | | | VM2 -- CAS(Head, Old, New) -> [Atomic     | |
| | VM3 -> [Lock Wait] /                          | | | VM3 /                         Queue]      | |
| |                                               | | |                                           | |
| | Result: OS context switches, thread stalls,   | | | Result: Zero locks, hardware CAS retry,   | |
| | tail latency spikes under hypervisor steal.   | | | sub-microsecond throughput scalability.   | |
| +-----------------------------------------------+ | +-------------------------------------------+ |
|                                                   |                                               |
| Core Mechanics:                                   | Implementation Details:                       |
| • Hypervisors overcommit CPU cores.               | • struct Node { msg Message; next *Node }     |
| • Mutexes cause lock convoying and priority       | • atomic.CompareAndSwapPointer(&head, old, new)|
|   inversion across guest VM threads.              | • Benchmark: Scaled to 50 concurrent workers  |
|                                                   |   with zero lock contention.                  |
+---------------------------------------------------+-----------------------------------------------+
```

---

### Slide 5: Durability Engine: Dynamic Group Commit WAL
* **Purpose**: Explain how PMB achieves 30,000+ durable disk writes/sec without stalling every publisher on physical SSD write cycles.
* **Key Takeaway**: Leader/Follower group commit amortizes the 1–5ms hardware `fsync()` penalty across concurrent writes.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [STORAGE SUBSYSTEM & CRASH RESILIENCE]                                                            |
| Durability Engine: Dynamic Group Commit WAL & Hardware fsync Barriers                             |
| Guaranteeing zero-loss crash resilience without paying a 1ms disk penalty per event               |
+---------------------------------------------------------------------------------------------------+
| TOP DIAGRAM: GROUP COMMIT BATCHING TIMELINE (Spatial Visual)                                      |
|                                                                                                   |
| Time --->                                                                                         |
| Publisher 1: ---PUB msg1---\                                                                      |
| Publisher 2: ---PUB msg2----+--> [Leader Goroutine Collects Batch] --> [os.File.Sync() to NVMe]   |
| Publisher 3: ---PUB msg3---/                                                |                     |
|                                                    All 3 Publishers Notified| simultaneously      |
+---------------------------------------------------+-----------------------------------------------+
| LEFT CARD: NAÏVE SYNC VS. PMB GROUP COMMIT        | RIGHT CARD: RECOVERY GUARANTEES               |
|                                                   |                                               |
| • Naïve Approach: 1 fsync per write               | • Append-Only Structure:                      |
|   1,000 ms / 2ms disk latency = Max 500 writes/sec|   Never overwrites sectors in-place.          |
| • PMB Group Commit: Dynamic batching              | • Zero-Loss Crash Replay:                     |
|   Coalesces up to 500 messages per sync barrier.  |   On power loss recovery, PMB scans WAL file  |
| • Measured Rate: 30,000+ durable writes/sec.      |   and reconstitutes pending unacknowledged    |
| • NVMe Direct: Bypasses OS dirty-page delays.     |   messages in < 10 milliseconds.              |
+---------------------------------------------------+-----------------------------------------------+
```

---

### Slide 6: Egress Routing & Guaranteed Delivery
* **Purpose**: Explain how PMB reliably delivers messages to consumers and handles network disconnects and retries.
* **Key Takeaway**: At-least-once delivery backed by an in-memory route table, tracking offsets, and an automatic 2-second retransmission timer.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [DELIVERY GUARANTEES & TRACKING]                                                                  |
| Safe Egress: Thread-Safe Topic Routing & Automatic Retransmission                                |
| Delivering at-least-once reliability across transient microVM worker crashes                      |
+---------------------------------------------------+-----------------------------------------------+
| LEFT PANEL: ROUTING & DELIVERY TIMELINE           | RIGHT PANEL: pendingAcks LIFECYCLE            |
|                                                   |                                               |
| +-----------------------------------------------+ | +-------------------------------------------+ |
| | PMB Broker                   Subscriber VM    | | | pendingAcks Map State Machine:            | |
| |     |                             |           | | |                                           | |
| |     | ----- MSG topic 1 payload ->|           | | | [Msg Dispatched] -> Added to pendingAcks  | |
| |     |       (Start 2s Timer)      |           | | |       |                                   | |
| |     |                             |           | | |       +--> ACK Received: Cancel timer &   | |
| |     | <---- ACK topic 1 --------- |           | | |       |    delete from map.               | |
| |     |       (Delete from map)     |           | | |       v                                   | |
| |     |                             |           | | | [2-Second Timeout]: Auto-retransmit MSG   | |
| |     |  [If Worker Crashes: No ACK]|           | | | to next healthy topic subscriber.         | |
| |     | ----- MSG topic 1 (Retry) ->|           | | +-------------------------------------------+ |
| +-----------------------------------------------+ |                                               |
|                                                   | Key Features:                                 |
| Core Mechanics:                                   | • In-Memory RWMutex Route Table               |
| • Tracks each dispatched message by unique ID.    | • Epoll/Goroutine-per-conn socket management  |
| • Recovers automatically from worker drops.       | • Backpressure grace period (50ms)            |
+---------------------------------------------------+-----------------------------------------------+
```

---

### Slide 7: Zero-Leak Storage: Instant Compaction vs. Static Bloat
* **Purpose**: Highlight the critical operational advantage of PMB over Kafka/RabbitMQ regarding disk space.
* **Key Takeaway**: Edge nodes have tiny root disks (`/var`); PMB truncates acknowledged messages instantly rather than retaining multi-day static logs.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [STORAGE EFFICIENCY & EDGE HYGIENE]                                                               |
| Zero-Leak Storage: Active Compaction vs. Static Log Bloat                                         |
| How PMB eliminates root filesystem exhaustion in resource-constrained edge appliances             |
+--------------------------------------------------+------------------------------------------------+
| LEFT PANEL: TRADITIONAL BROKER DISK ACCUMULATION | RIGHT PANEL: PMB ACTIVE TRUNCATION             |
|                                                  |                                                |
| +----------------------------------------------+ | +--------------------------------------------+ |
| | Traditional Static Retention (Kafka / Pulsar)| | | PMB Active Compaction Engine:              | |
| |                                              | | |                                            | |
| | Day 1: [ Log Segment 1 (500 MB) ]            | | | Step 1: Append incoming events to WAL.     | |
| | Day 2: [ Log Segment 2 (500 MB) ]            | | | Step 2: Subscribers process & ACK messages.| |
| | Day 3: [ Log Segment 3 (500 MB) ]            | | | Step 3: PMB immediately truncates file     | |
| |                                              | | |         offsets back to 0 bytes!           | |
| | Result: Hypervisor /var partition fills up.  | | |                                            | |
| | Kernel panics when disk reaches 100%.        | | | Result: Steady-state disk footprint remains| |
| +----------------------------------------------+ | |         < 100 MB indefinitely!             | |
|                                                  | +--------------------------------------------+ |
| Comparison Metric:                               | Key Operational Invariants:                   |
| • Kafka: Retains data based on time (7 days).    | • No cron jobs or scheduled cleanups needed.   |
| • PMB: Retains data based on subscriber state.   | • Direct file truncation via os.Truncate().    |
+--------------------------------------------------+------------------------------------------------+
```

---

### Slide 8: Zero-SDK Protocol: The Framed ASCII Wire Format
* **Purpose**: Show how simple and accessible the broker is to any language or microVM.
* **Key Takeaway**: MicroVMs connect using plain raw TCP sockets; no heavy multi-megabyte language SDKs are needed.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [INTEROPERABILITY & PROTOCOL DESIGN]                                                              |
| Protocol Simplicity: Zero-SDK Framed ASCII Wire Protocol                                          |
| Eliminating client library dependency hell with raw POSIX TCP socket commands                     |
+---------------------------------------------------+-----------------------------------------------+
| LEFT PANEL: WIRE PROTOCOL COMMAND SPEC            | RIGHT PANEL: CODE EXAMPLES (Zero SDK)         |
|                                                   |                                               |
| +-----------------------------------------------+ | Bash / Netcat (1 Line):                       |
| | 1. Publish Event:                             | | ```bash                                       |
| |    PUB <topic> <payload>\r\n                  | | echo "PUB telemetry {\"temp\":22}" | nc host 4222
| |                                               | | ```                                         |
| | 2. Subscribe to Topic:                        | |                                               |
| |    SUB <topic>\r\n                            | | Python (Standard Library Only):               |
| |                                               | | ```python                                     |
| | 3. Message Delivery (Broker -> Client):       | | s = socket.socket()                           |
| |    MSG <topic> <msgID> <payload>\r\n          | | s.connect(("127.0.0.1", 4222))                |
| |                                               | | s.sendall(b"SUB telemetry\r\n")               |
| | 4. Acknowledge Receipt:                       | | ```                                         |
| |    ACK <topic> <msgID>\r\n                    | |                                               |
| +-----------------------------------------------+ | C / Rust / Go / Embedded:                     |
|                                                   | Pure socket writes; zero third-party packages!|
+---------------------------------------------------+-----------------------------------------------+
```

---

### Slide 9: Empirical Benchmarks & Performance Verification
* **Purpose**: Present verified empirical benchmark data proving PMB's real-world efficiency.
* **Key Takeaway**: PMB sustains > 30,000 durable msg/s with sub-millisecond roundtrip latency at < 10 MB RAM.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [PERFORMANCE & EMPIRICAL PROOF]                                                                   |
| Empirical Performance: Throughput, Latency & Resource Utilization                                 |
| Verified benchmarks on physical hardware with race detectors and hardware fsync enabled           |
+---------------------+---------------------+---------------------+---------------------------------+
| METRIC CARD 1       | METRIC CARD 2       | METRIC CARD 3       | METRIC CARD 4                   |
| DURABILITY RATE     | RESIDENT MEMORY     | ROUNDTRIP LATENCY   | RECOVERY SPEED                  |
| 30,000+ msg/s       | 7.18 MB             | 519 µs              | < 10 ms                         |
| Hard fsync() to NVMe| Under idle / active | Roundtrip with ACK  | Cold boot WAL replay            |
+---------------------+---------------------+---------------------+---------------------------------+
| BOTTOM LEFT: BENCHMARK SUITE CAPABILITY           | BOTTOM RIGHT: RESOURCE FOOTPRINT COMPARISON   |
|                                                   |                                               |
| • Unified CLI Tool: `cmd/bench/main.go`           | Memory Consumption Comparison:                |
| • Modular flags:                                  | PMB (Go):       [■ 7.18 MB]                   |
|   -n (message count), -c (concurrency)            | Redis:          [■■■ 25-40 MB (Ephemeral)]   |
|   -size (payload bytes), -mode (sync/async)       | RabbitMQ (BEAM):[■■■■■■■■■■ 150-300 MB]       |
|   -subs (subscriber fan-out), -lat (percentiles)  | Kafka (JVM):    [■■■■■■■■■■■■■■■■■■■ 500MB-1GB|
+---------------------------------------------------+-----------------------------------------------+
```

---

### Slide 10: Production Readiness & Architectural Summary
* **Purpose**: Conclude with production readiness, zero-trust hypervisor suitability, and key architectural recap.
* **Key Takeaway**: PMB is the ideal drop-in messaging backbone for modern edge computing, hypervisor appliances, and defense-in-depth zero-trust systems.

#### Spatial Layout Wireframe:
```
+---------------------------------------------------------------------------------------------------+
| [PRODUCTION READINESS & SUMMARY]                                                                  |
| Production Readiness: Architecture Recap & Appliance Suitability                                  |
| Engineered for mission-critical edge, Nutanix hypervisors, and zero-trust security appliances     |
+----------------------------------+----------------------------------+-----------------------------+
| PILLAR 1: EMBEDDABLE FOOTPRINT   | PILLAR 2: HARDWARE DURABILITY    | PILLAR 3: OPERATIONAL ZERO-TRUST
|                                  |                                  |                             |
| • 3.78 MB static binary.         | • Sequential append-only WAL.    | • Isolated microVM perimeter.
| • Zero external dependencies.    | • Explicit hardware fsync().     | • Strict 1MB frame bounding.
| • Self-contained Go executable.  | • Immediate crash recovery.      | • Zero shared memory leakage.
| • Starts in < 10 milliseconds.   | • Zero data loss on power drops. | • Memory-safe execution.    |
+----------------------------------+----------------------------------+-----------------------------+
| BOTTOM BANNER: FINAL TAKEAWAY FOR JUDGES & EVALUATORS                                             |
| PMB provides the missing architectural link in edge hypervisors: Enterprise-grade durable         |
| message delivery at the speed and simplicity of an in-memory Unix pipe.                           |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. Helper Script Inventory & File Locations

All generation scripts and assets are stored and ready in the repository:

1. **`docs/`**:
   - `slide1_topology.svg` to `slide8_wire_protocol.svg`: Custom high-contrast vector diagrams
   - `deck_slide_1.png` to `deck_slide_10.png`: Exported 1080p slide renders
2. **`scripts/presentation/`**:
   - `generate_custom_svgs.js`: Generates all SVG assets with proper colors and cards
   - `generate_all_slides.js`: Uses `pptxgenjs` with `LAYOUT_WIDE` to generate `PMB_Architecture_Pitch.pptx`
   - `export_slides.ps1`: Headless PowerPoint COM script that exports all 10 slides to 1080p PNGs
3. **Presentation Output**:
   - `PMB_Architecture_Pitch.pptx`: The generated PowerPoint file in the project root
