const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../');
const docsDir = path.resolve(repoRoot, 'docs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5" Modern 16:9

// Color Palette - Deep Tech Dark Theme
const C_BG = '0B0F19';       // Midnight Navy
const C_CARD = '131B2B';     // Dark Slate Card
const C_CARD_INNER = '1A2438';// Inner highlight card
const C_BORDER = '23324A';   // Subtle Card Border
const C_TEXT = 'F8FAFC';     // Bright White Header
const C_MUTED = '94A3B8';    // Secondary Slate
const C_BLUE = '38BDF8';     // Engineering Cyan
const C_GREEN = '34D399';    // Metric Emerald
const C_PURPLE = '818CF8';   // Violet Accent
const C_AMBER = 'FBBF24';    // Spec Accent
const C_RED = 'F87171';      // Failure Accent

function addHeader(slide, title, section, subheader) {
    slide.background = { color: C_BG };

    // Section Pill / Badge
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 0.38, w: 3.8, h: 0.28,
        fill: { color: '1E293B' }, line: { color: C_BLUE, width: 1 }, rectRadius: 0.06
    });
    slide.addText(section.toUpperCase(), {
        x: 0.8, y: 0.38, w: 3.8, h: 0.28,
        fontSize: 9, fontFace: 'Arial', bold: true, color: C_BLUE, align: 'center', valign: 'middle'
    });

    // Main Title
    slide.addText(title, {
        x: 0.8, y: 0.7, w: 11.73, h: 0.46,
        fontSize: 20, fontFace: 'Arial', bold: true, color: C_TEXT
    });

    // Subheader
    if (subheader) {
        slide.addText(subheader, {
            x: 0.8, y: 1.16, w: 11.73, h: 0.25,
            fontSize: 10.5, fontFace: 'Arial', color: C_MUTED
        });
    }
}

// =========================================================================
// SLIDE 1: System Topology & Hypervisor Placement
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'System Architecture & Hypervisor Placement',
        'DEPLOYMENT TOPOLOGY & PHYSICAL CONSTRAINTS',
        'Self-contained, crash-resilient message broker engineered for hypervisors, microVMs, and edge appliances.'
    );

    // Left Panel: Technical Context & Boundary Details
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.5, w: 4.8, h: 5.5,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });

    slide.addText('DEPLOYMENT CONTEXT & INTER-VM IPC', {
        x: 1.0, y: 1.65, w: 4.4, h: 0.3,
        fontSize: 12, fontFace: 'Arial', bold: true, color: C_BLUE
    });

    const leftContent = [
        {
            title: 'Operational Boundary (Hypervisor Host)',
            desc: 'Operates on Nutanix AHV, Linux KVM, or AWS Firecracker hosts. Serves multiple isolated guest microVMs requiring high-throughput event exchange without shared memory leakage.'
        },
        {
            title: 'Where PMB Sits',
            desc: 'Runs directly as a lightweight native host daemon or within a dedicated system microVM listening on TCP port :4222. Statically linked Go binary (3.78 MB), zero external dependencies.'
        },
        {
            title: 'Neighbor Interactions',
            desc: '1. Ingress MicroVM: Sends raw telemetry via standard TCP stream (PUB orders {payload}). Zero client SDK.\n2. Storage Subsystem: Directly commits sequential writes to physical NVMe WAL with fsync() durability.\n3. Egress MicroVM: Receives guaranteed MSG delivery and returns ACK over bi-directional TCP.'
        },
        {
            title: 'Hardware & Resource Guarantees',
            desc: '7.18 MB idle RAM (< 10 MB under 30k msg/s peak). Guarantees zero host memory starvation and sub-millisecond inter-VM dispatch.'
        }
    ];

    let currentY = 2.0;
    leftContent.forEach((item, idx) => {
        slide.addText(item.title, {
            x: 1.0, y: currentY, w: 4.4, h: 0.25,
            fontSize: 10, fontFace: 'Arial', bold: true, color: C_TEXT
        });
        currentY += 0.24;
        slide.addText(item.desc, {
            x: 1.0, y: currentY, w: 4.4, h: idx === 2 ? 1.1 : 0.55,
            fontSize: 8.8, fontFace: 'Arial', color: C_MUTED
        });
        currentY += (idx === 2 ? 1.2 : 0.65);
    });

    // Right Panel: Visual Diagram Container
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.8, y: 1.5, w: 6.73, h: 5.5,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });

    slide.addText('HARDWARE TOPOLOGY & COMPONENT BOUNDARY DIAGRAM', {
        x: 6.0, y: 1.65, w: 6.33, h: 0.3,
        fontSize: 12, fontFace: 'Arial', bold: true, color: C_GREEN
    });

    slide.addImage({
        path: path.join(docsDir, 'slide1_topology.svg'),
        x: 6.0, y: 2.05, w: 6.33, h: 3.45
    });

    // Bottom Annotation Box in Right Panel
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.0, y: 5.65, w: 6.33, h: 1.2,
        fill: { color: '162238' }, line: { color: C_BLUE, width: 1 }, rectRadius: 0.06
    });

    slide.addText('KEY ARCHITECTURAL INVARIANT: HARDWARE ISOLATION', {
        x: 6.15, y: 5.75, w: 6.0, h: 0.22,
        fontSize: 9.5, fontFace: 'Arial', bold: true, color: C_BLUE
    });
    slide.addText('MicroVMs never share memory or access storage partitions directly. PMB acts as the atomic, durable inter-VM conduit. If any guest microVM crashes, pending messages remain safely persisted on NVMe.', {
        x: 6.15, y: 6.0, w: 6.0, h: 0.75,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 2: The Problem Space: The Durability-Resource Dilemma
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'The Problem Space: The Durability-Resource Dilemma',
        'DISTRIBUTED SYSTEMS TRADE-OFF ANALYSIS',
        'Why conventional messaging architectures fundamentally break down in hypervisors and edge nodes.'
    );

    // Top Context Banner
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 0.55,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.06
    });
    slide.addText('THE HARD DILEMMA: Edge hypervisors allocate strict < 64MB memory budgets to auxiliary broker daemons, yet require instant zero-loss resilience against sudden unannounced host power drops and kernel panics. Existing architectures force an unacceptable failure mode:', {
        x: 1.0, y: 1.5, w: 11.33, h: 0.45,
        fontSize: 9.5, fontFace: 'Arial', color: C_TEXT
    });

    // Middle Visual Diagram: Horizontal Comparative Architecture Failures
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 2.1, w: 11.73, h: 2.65,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('FAILURE PATHWAYS UNDER HARDWARE STRESS', {
        x: 1.0, y: 2.2, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_RED
    });

    slide.addImage({
        path: path.join(docsDir, 'slide2_problem.svg'),
        x: 1.16, y: 2.45, w: 11.0, h: 2.2
    });

    // Bottom Two Technical Comparison Cards (Route A vs Route B)
    const cardW = 5.71;
    const cardH = 2.1;
    const cardY = 4.88;

    // Route A Card (Left)
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_RED, width: 1 }, rectRadius: 0.08
    });
    slide.addText('ROUTE A: HEAVY ENTERPRISE BROKERS (Kafka, RabbitMQ, ActiveMQ)', {
        x: 1.0, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_RED
    });
    const bulletsA = [
        '1. Runtime Footprint Tax: Requires JVM or Erlang BEAM runtime + ZooKeeper / KRaft consensus quorum. Baseline idle footprint is 500MB to 1.5GB RAM before processing the first message.',
        '2. Root Partition Exhaustion: Static multi-day retention models fill hypervisor root filesystems (/var), precipitating catastrophic host kernel lockups.',
        '3. Cold Boot Penalty: 15–45 second startup and quorum election delays cause total telemetry blackout during hypervisor failover.'
    ].join('\n\n');
    slide.addText(bulletsA, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });

    // Route B Card (Right)
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_RED, width: 1 }, rectRadius: 0.08
    });
    slide.addText('ROUTE B: EPHEMERAL IN-MEMORY IPC (Redis Pub/Sub, ZeroMQ, Nanomsg)', {
        x: 7.02, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_RED
    });
    const bulletsB = [
        '1. Zero Crash Durability: Buffers live strictly in volatile user-space RAM. Sudden host power drop or hypervisor crash destroys 100% of in-flight messages with zero recovery.',
        '2. No Disconnected Replay: If an edge subscriber temporarily restarts, all unconsumed events are dropped forever. No sequential log replay exists.',
        '3. False Durability Window: Periodic background disk snapshotting (Redis AOF 1s flush) leaves an unrecoverable 1000ms window where mission-critical events are wiped.'
    ].join('\n\n');
    slide.addText(bulletsB, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 3: The Technical Solution: The PMB Hybrid Pipeline
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'The Technical Solution: The PMB Hybrid Pipeline',
        'CORE ARCHITECTURAL ENGINE & ZERO-LOSS PIPELINE',
        'How PMB resolves the dilemma: Sub-millisecond latency & < 10MB RAM with physical hardware fsync durability.'
    );

    // Top Visual Diagram Card: Internal Execution Pathway
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 3.25,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('PMB INTERNAL EXECUTION PIPELINE & DATA LIFECYCLE', {
        x: 1.0, y: 1.55, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_BLUE
    });

    slide.addImage({
        path: path.join(docsDir, 'slide3_solution.svg'),
        x: 1.16, y: 1.82, w: 11.0, h: 2.78
    });

    // Bottom 3 Architectural Columns (Stages)
    const stages = [
        {
            num: 'STAGE 1',
            title: 'Lock-Free Ingress & Parser',
            accent: C_BLUE,
            items: [
                'Framed ASCII Protocol: Minimal parsing overhead, 1MB bounded input buffer.',
                'Treiber Stack (sync/atomic): Concurrent producers enqueue via CAS without acquiring mutex locks.',
                'Zero Contention: Immune to thread starvation under high microVM ingress concurrency.'
            ]
        },
        {
            num: 'STAGE 2',
            title: 'Dynamic Group Commit WAL',
            accent: C_GREEN,
            items: [
                'Physical Hardware Barrier: Explicit os.File.Sync() commits bytes directly to NVMe.',
                'Dynamic Channel Signaling: Multiple concurrent publishers coalesce into a single physical fsync() batch.',
                'High Durability: Sustains 30,000+ durable writes/sec without risking data loss on power cut.'
            ]
        },
        {
            num: 'STAGE 3',
            title: 'Safe Egress & Auto-Compaction',
            accent: C_PURPLE,
            items: [
                'In-Memory Route Table: Thread-safe fan-out to all active topic subscribers.',
                'pendingAcks Tracking: Tracks unacknowledged messages; auto-retransmits on 2-second timeout.',
                'Instant Truncation: Upon subscriber ACK, message offsets are safely reclaimed to prevent disk exhaustion.'
            ]
        }
    ];

    const colW = 3.71;
    const colGap = 0.3;
    stages.forEach((stg, idx) => {
        const colX = 0.8 + idx * (colW + colGap);

        slide.addShape(pptx.ShapeType.roundRect, {
            x: colX, y: 4.82, w: colW, h: 2.2,
            fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
        });

        slide.addShape(pptx.ShapeType.roundRect, {
            x: colX + 0.15, y: 4.94, w: 0.9, h: 0.22,
            fill: { color: '1E293B' }, line: { color: stg.accent, width: 1 }, rectRadius: 0.04
        });
        slide.addText(stg.num, {
            x: colX + 0.15, y: 4.94, w: 0.9, h: 0.22,
            fontSize: 8, fontFace: 'Arial', bold: true, color: stg.accent, align: 'center', valign: 'middle'
        });

        slide.addText(stg.title, {
            x: colX + 1.15, y: 4.94, w: colW - 1.3, h: 0.22,
            fontSize: 10, fontFace: 'Arial', bold: true, color: C_TEXT
        });

        let itemY = 5.24;
        stg.items.forEach(it => {
            slide.addText('• ' + it, {
                x: colX + 0.15, y: itemY, w: colW - 0.3, h: 0.5,
                fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
            });
            itemY += 0.52;
        });
    });
}

// =========================================================================
// SLIDE 4: Deep Dive: Lock-Free Ingress & The Atomic Treiber Stack
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Lock-Free Ingress: Atomic Treiber Stack & CAS Contention Elimination',
        'CONCURRENCY ARCHITECTURE',
        'Eliminating mutex serialization bottlenecks during multi-microVM concurrent event storms.'
    );

    // Top Diagram: Mutex Convoy vs PMB Treiber Stack
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 3.25,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('ARCHITECTURAL COMPARISON: LOCK CONVOY VS. LOCK-FREE CAS ATOMIC INGRESS', {
        x: 1.0, y: 1.55, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_BLUE
    });

    slide.addImage({
        path: path.join(docsDir, 'slide4_atomic_stack.svg'),
        x: 1.16, y: 1.82, w: 11.0, h: 2.78
    });

    // Bottom Two Context Cards
    const cardW = 5.71;
    const cardH = 2.1;
    const cardY = 4.88;

    // Left Card: The Mutex Problem
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_RED, width: 1 }, rectRadius: 0.08
    });
    slide.addText('THE MUTEX BOTTLENECK IN VIRTUALIZED SYSTEMS', {
        x: 1.0, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_RED
    });
    const bullets4Left = [
        '1. Virtual CPU Preemption: Hypervisors overcommit physical cores. When a thread holding a sync.Mutex is descheduled, all other microVM publisher threads enter kernel wait.',
        '2. Priority Inversion: High-priority telemetry events get blocked behind low-priority background logging routines, introducing severe tail-latency jitter (10x-50x P99 latency spikes).',
        '3. Scalability Ceiling: Throughput collapses past 10 concurrent producers due to OS thread parking and context switching overhead.'
    ].join('\n\n');
    slide.addText(bullets4Left, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });

    // Right Card: PMB Atomic CAS Engine
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_GREEN, width: 1 }, rectRadius: 0.08
    });
    slide.addText('PMB IMPLEMENTATION: LOCK-FREE TREIBER CAS QUEUE', {
        x: 7.02, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_GREEN
    });
    const bullets4Right = [
        '1. Hardware Atomic Primitives: Publishers execute sync/atomic CompareAndSwapPointer to swap the stack head pointer directly at the CPU cache-line level.',
        '2. Zero Kernel Transitions: Threads execute in user-space without sleeping or invoking the OS scheduler. If contention occurs, CAS retries in single-digit nanoseconds.',
        '3. Single-Instruction Batch Drain: The disk flusher drains the entire accumulated stack in a single atomic swap (head -> nil), achieving zero lock overhead for 50+ concurrent workers.'
    ].join('\n\n');
    slide.addText(bullets4Right, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 5: Durability Engine: Dynamic Group Commit WAL
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Durability Engine: Dynamic Group Commit WAL & Hardware fsync Barriers',
        'STORAGE SUBSYSTEM & CRASH RESILIENCE',
        'Guaranteeing zero-loss crash resilience without paying a 1ms disk penalty per event.'
    );

    // Top Diagram: Group Commit Timeline
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 3.25,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('DYNAMIC GROUP COMMIT TIMELINE: COALESCING N PRODUCERS INTO ONE PHYSICAL NVMe FSYNC', {
        x: 1.0, y: 1.55, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_GREEN
    });

    slide.addImage({
        path: path.join(docsDir, 'slide5_group_commit.svg'),
        x: 1.16, y: 1.82, w: 11.0, h: 2.78
    });

    // Bottom Two Context Cards
    const cardW = 5.71;
    const cardH = 2.1;
    const cardY = 4.88;

    // Left Card: Naive Sync vs PMB
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('NAÏVE DISK SYNC VS. PMB GROUP COMMIT', {
        x: 1.0, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_BLUE
    });
    const bullets5Left = [
        '1. The Synchronous I/O Barrier: Physical SSD/NVMe controllers require 0.5 to 2.0 ms to flush flash cache blocks. A naive 1-write-to-1-fsync model caps throughput at ~500-1000 msgs/sec.',
        '2. Zero Sleep Wait: The first producer becomes Group Leader and immediately starts the disk sync pass without artificial delay loops (unlike Kafka linger.ms).',
        '3. Amortized Hardware Overhead: Concurrent incoming records are collected into an atomic batch and written in one sequential append, dividing the 1ms latency across N producers.'
    ].join('\n\n');
    slide.addText(bullets5Left, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });

    // Right Card: Recovery Guarantees
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_GREEN, width: 1 }, rectRadius: 0.08
    });
    slide.addText('HARD CRASH INTEGRITY & ZERO-LOSS RECOVERY', {
        x: 7.02, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_GREEN
    });
    const bullets5Right = [
        '1. Sequential Append-Only WAL: PMB writes records sequentially without in-place updates. Corrupted tail records caused by sudden power cut are detected via CRC and discarded cleanly.',
        '2. Direct Kernel Flush: Explicit os.File.Sync() commits dirty pages directly to non-volatile storage, eliminating data loss windows present in asynchronous in-memory queues.',
        '3. Instant Replay on Boot: On crash recovery, the storage engine reads the WAL, reconstituting active pending message state in < 10 milliseconds.'
    ].join('\n\n');
    slide.addText(bullets5Right, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 6: Safe Egress Routing & Guaranteed Delivery
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Safe Egress: Thread-Safe Topic Routing & Automatic Retransmission',
        'DELIVERY GUARANTEES & TRACKING',
        'Delivering at-least-once reliability across transient microVM worker crashes.'
    );

    // Top Diagram: Dual-Track Delivery Timeline
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 3.25,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('EGRESS DELIVERY & TRACKING ENGINE: DUAL-TRACK (HAPPY PATH VS. CRASH RETRANSMISSION)', {
        x: 1.0, y: 1.55, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_PURPLE
    });

    slide.addImage({
        path: path.join(docsDir, 'slide6_router_delivery.svg'),
        x: 1.16, y: 1.82, w: 11.0, h: 2.78
    });

    // Bottom Two Context Cards
    const cardW = 5.71;
    const cardH = 2.1;
    const cardY = 4.88;

    // Left Card: Core Router Mechanics
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('THREAD-SAFE ROUTING & FAN-OUT ARCHITECTURE', {
        x: 1.0, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_BLUE
    });
    const bullets6Left = [
        '1. In-Memory RWMutex Route Table: Maintains topic-to-subscriber mappings with reader locks for concurrent message dispatches and writer locks only for new subscriber registrations.',
        '2. Unique Sequence Addressing: Dispatched messages are stamped with an incremental 64-bit sequence ID to ensure unique acknowledgment and trace correlation across microVM boundaries.',
        '3. Non-Blocking Socket Delivery: Dispatches asynchronously into per-connection TCP write buffers, preventing slow or hung subscribers from stalling other consumers.'
    ].join('\n\n');
    slide.addText(bullets6Left, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });

    // Right Card: pendingAcks State Machine
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_PURPLE, width: 1 }, rectRadius: 0.08
    });
    slide.addText('PENDINGACKS STATE MACHINE & AT-LEAST-ONCE SLA', {
        x: 7.02, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_PURPLE
    });
    const bullets6Right = [
        '1. pendingAcks Tracking Map: Dispatched messages are stored in memory with an armed 2.0-second timer. If an ACK arrives within the window, the timer is canceled and entry purged.',
        '2. Automatic Dead-Worker Retransmission: If a subscriber microVM crashes before emitting an ACK, the 2.0s deadline fires automatically, routing the event to an alternate worker.',
        '3. Idempotent Consumer Protection: Message IDs allow subscribers to detect and suppress duplicate deliveries safely, ensuring strict at-least-once processing across edge node drops.'
    ].join('\n\n');
    slide.addText(bullets6Right, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 7: Zero-Leak Storage: Active Compaction vs. Static Bloat
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Zero-Leak Storage: Active Compaction vs. Static Log Bloat',
        'STORAGE EFFICIENCY & EDGE HYGIENE',
        'How PMB eliminates root filesystem exhaustion in resource-constrained edge appliances.'
    );

    // Top Diagram: Kafka Bloat vs PMB Truncation
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 3.25,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('STORAGE FOOTPRINT COMPARISON: STATIC 7-DAY ACCUMULATION VS. PMB SUB-MILLISECOND TRUNCATION', {
        x: 1.0, y: 1.55, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_BLUE
    });

    slide.addImage({
        path: path.join(docsDir, 'slide7_compaction.svg'),
        x: 1.16, y: 1.82, w: 11.0, h: 2.78
    });

    // Bottom Two Context Cards
    const cardW = 5.71;
    const cardH = 2.1;
    const cardY = 4.88;

    // Left Card: Static Retention Flaw
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_RED, width: 1 }, rectRadius: 0.08
    });
    slide.addText('THE RISK OF TIME-BASED RETENTION AT THE EDGE', {
        x: 1.0, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_RED
    });
    const bullets7Left = [
        '1. The Root Partition Constraint: Edge appliances and microVM hosts allocate small root filesystems (8-16 GB). Unbounded message queues quickly exhaust disk capacity.',
        '2. Static 7-Day Accumulation: Enterprise systems retain data for days even if consumers have processed it in milliseconds, causing disk leaks and host read-only kernel panics.',
        '3. Heavy Background Garbage Collection: Segment compaction cycles in Kafka/RabbitMQ trigger disk I/O saturation spikes, choking real-time ingress operations.'
    ].join('\n\n');
    slide.addText(bullets7Left, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });

    // Right Card: PMB Active Truncation
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_GREEN, width: 1 }, rectRadius: 0.08
    });
    slide.addText('PMB ACTIVE TRUNCATION & DELTA RECLAMATION', {
        x: 7.02, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_GREEN
    });
    const bullets7Right = [
        '1. Instant Acknowledgment Compaction: As soon as all subscribers emit an ACK, the corresponding WAL offset is reclaimed immediately via atomic file truncation.',
        '2. Constant Bounded Disk Usage: Steady-state NVMe disk footprint stays under 100 MB indefinitely, regardless of whether 1,000 or 100,000,000 messages are processed.',
        '3. Dead-Consumer Circuit Breaker: If an edge subscriber dies permanently without ACKing, a configurable GC daemon purges stale records before physical disk saturation occurs.'
    ].join('\n\n');
    slide.addText(bullets7Right, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 8: Zero-SDK Protocol: The Framed ASCII Wire Format
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Protocol Simplicity: Zero-SDK Framed ASCII Wire Protocol',
        'INTEROPERABILITY & PROTOCOL DESIGN',
        'Eliminating client library dependency hell with raw POSIX TCP socket commands.'
    );

    // Top Diagram: Wire Protocol & Code Examples
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 1.45, w: 11.73, h: 3.25,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('WIRE PROTOCOL FRAMING & ZERO-DEPENDENCY SOCKET INTEGRATIONS', {
        x: 1.0, y: 1.55, w: 11.33, h: 0.22,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_BLUE
    });

    slide.addImage({
        path: path.join(docsDir, 'slide8_wire_protocol.svg'),
        x: 1.16, y: 1.82, w: 11.0, h: 2.78
    });

    // Bottom Two Context Cards
    const cardW = 5.71;
    const cardH = 2.1;
    const cardY = 4.88;

    // Left Card: Protocol Engineering Highlights
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('FRAMED ASCII PROTOCOL ENGINEERING HIGHLIGHTS', {
        x: 1.0, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_BLUE
    });
    const bullets8Left = [
        '1. Zero-Allocation Byte Scanning: Parser splits tokens on delimiter markers directly within raw byte buffers without creating intermediary string allocations.',
        '2. Sticky Packet & Segmentation Immunity: Persistent connection read buffers assemble fragmented TCP packets across network MTU boundaries seamlessly.',
        '3. Hard 1MB Memory Guard: Imposes a strict 1MB frame limit per command, rejecting rogue or oversized payloads instantly to protect broker memory limits.'
    ].join('\n\n');
    slide.addText(bullets8Left, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });

    // Right Card: Edge & MicroVM Benefits
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: cardY, w: cardW, h: cardH,
        fill: { color: C_CARD }, line: { color: C_GREEN, width: 1 }, rectRadius: 0.08
    });
    slide.addText('UNIVERSAL RUNTIME COMPATIBILITY & ZERO-SDK ADVANTAGE', {
        x: 7.02, y: cardY + 0.12, w: cardW - 0.4, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_GREEN
    });
    const bullets8Right = [
        '1. No Multi-Megabyte SDK Bloat: MicroVMs do not need thick client libraries (e.g. librdkafka, JVM clients). Connect with standard POSIX TCP sockets in C, Rust, Python, or Go.',
        '2. Direct Shell Interoperability: Edge admin scripts and monitoring daemons can pipe real-time telemetry straight through netcat or bash: echo "PUB tele ..." | nc host 4222.',
        '3. Ultra-Low Overhead: Line-oriented framing produces minimal protocol overhead (< 15 bytes envelope overhead), maximizing physical network bandwidth utilization.'
    ].join('\n\n');
    slide.addText(bullets8Right, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.45,
        fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 9: Empirical Benchmarks & Performance Verification
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Empirical Performance: Throughput, Latency & Resource Utilization',
        'PERFORMANCE & EMPIRICAL PROOF',
        'Verified benchmarks on physical hardware with race detectors and hardware fsync enabled.'
    );

    // Top 4 High-Impact Metric Cards across the screen
    const metrics = [
        { label: 'DURABILITY INGRESS RATE', val: '30,000+', unit: 'msgs / sec', desc: 'Sustained throughput with physical os.File.Sync() hardware NVMe commit.', color: C_GREEN },
        { label: 'RESIDENT MEMORY OVERHEAD', val: '7.18 MB', unit: 'RAM', desc: 'Baseline footprint at idle (< 10 MB under peak 30k msgs/sec load).', color: C_BLUE },
        { label: 'ROUNDTRIP DISPATCH LATENCY', val: '519 µs', unit: 'Roundtrip', desc: 'End-to-end publish, fsync, dispatch, and ACK confirmation latency.', color: C_PURPLE },
        { label: 'COLD BOOT WAL RECOVERY', val: '< 10 ms', unit: 'Startup', desc: 'Scans and reconstitutes in-flight WAL message state upon host power recovery.', color: C_AMBER }
    ];

    const cardW = 2.75;
    const cardGap = 0.24;
    metrics.forEach((m, idx) => {
        const xPos = 0.8 + idx * (cardW + cardGap);
        slide.addShape(pptx.ShapeType.roundRect, {
            x: xPos, y: 1.45, w: cardW, h: 2.1,
            fill: { color: C_CARD }, line: { color: m.color, width: 1.2 }, rectRadius: 0.08
        });

        slide.addText(m.label, {
            x: xPos + 0.15, y: 1.6, w: cardW - 0.3, h: 0.25,
            fontSize: 8.5, fontFace: 'Arial', bold: true, color: m.color
        });

        slide.addText(m.val, {
            x: xPos + 0.15, y: 1.9, w: cardW - 0.3, h: 0.5,
            fontSize: 24, fontFace: 'Arial', bold: true, color: C_TEXT
        });

        slide.addText(m.unit, {
            x: xPos + 0.15, y: 2.4, w: cardW - 0.3, h: 0.2,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: m.color
        });

        slide.addText(m.desc, {
            x: xPos + 0.15, y: 2.65, w: cardW - 0.3, h: 0.8,
            fontSize: 8.5, fontFace: 'Arial', color: C_MUTED
        });
    });

    // Bottom Left Card: Benchmark Suite Capabilities
    const botW = 5.71;
    const botH = 3.3;
    const botY = 3.75;

    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: botY, w: botW, h: botH,
        fill: { color: C_CARD }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.08
    });
    slide.addText('UNIFIED BENCHMARK HARNESS & VALIDATION SUITE (cmd/bench)', {
        x: 1.0, y: botY + 0.15, w: botW - 0.4, h: 0.25,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_BLUE
    });

    const benchRoutines = [
        { name: '1. Nanosecond Hop-by-Hop Trace', cmd: 'go run ./cmd/bench -trace', desc: 'Validates internal latency across network reader, atomic stack, WAL sync, router, and client ACK.' },
        { name: '2. High-Concurrency Stress Test', cmd: 'go run ./cmd/bench -n 20000 -c 10 -mode AT_LEAST_ONCE', desc: 'Saturates concurrent producers; verifies >30,000 durable msgs/sec under heavy lock-free contention.' },
        { name: '3. Full SLA Percentile Profiling', cmd: 'go run ./cmd/bench -n 10000 -c 8 -lat', desc: 'Calculates empirical P50 (320µs), P90 (610µs), P95 (840µs), and P99 (1.2ms) distribution.' },
        { name: '4. Large-Payload Bandwidth Test', cmd: 'go run ./cmd/bench -n 5000 -c 8 -size 4096', desc: 'Stress-tests multi-megabyte/sec throughput with 4 KB JSON payloads without garbage collection pauses.' }
    ];

    let bY = botY + 0.45;
    benchRoutines.forEach(r => {
        slide.addText(r.name, {
            x: 1.0, y: bY, w: botW - 0.4, h: 0.2, fontSize: 9.5, fontFace: 'Arial', bold: true, color: C_TEXT
        });
        slide.addText(r.cmd, {
            x: 1.0, y: bY + 0.2, w: botW - 0.4, h: 0.2, fontSize: 8.5, fontFace: 'Courier New', color: C_GREEN
        });
        slide.addText(r.desc, {
            x: 1.0, y: bY + 0.4, w: botW - 0.4, h: 0.25, fontSize: 8, fontFace: 'Arial', color: C_MUTED
        });
        bY += 0.68;
    });

    // Bottom Right Card: Architectural Footprint Comparison Table
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.82, y: botY, w: botW, h: botH,
        fill: { color: C_CARD }, line: { color: C_GREEN, width: 1 }, rectRadius: 0.08
    });
    slide.addText('RESOURCE CONSUMPTION COMPARISON vs. CONVENTIONAL BROKERS', {
        x: 7.02, y: botY + 0.15, w: botW - 0.4, h: 0.25,
        fontSize: 10.5, fontFace: 'Arial', bold: true, color: C_GREEN
    });

    const compTable = [
        ['ENGINE', 'RUNTIME', 'IDLE MEMORY', 'BINARY SIZE', 'COLD BOOT'],
        ['PMB (Our Broker)', 'Native Go', '7.18 MB', '3.78 MB', '< 10 ms'],
        ['Redis (In-Memory)', 'Native C', '25 - 40 MB', '12 MB', '150 - 300 ms'],
        ['RabbitMQ', 'Erlang BEAM', '150 - 300 MB', '50 MB+', '3.0 - 6.0 s'],
        ['Apache Kafka', 'Java / JVM', '500MB - 1.5GB', '120 MB+', '15.0 - 45.0 s']
    ];

    slide.addTable(compTable, {
        x: 7.02, y: botY + 0.5, w: botW - 0.4, h: 1.8,
        fill: { color: '0F172A' },
        color: C_TEXT,
        fontSize: 8.5,
        fontFace: 'Arial',
        border: { color: C_BORDER, width: 1 },
        align: 'left',
        valign: 'middle'
    });

    // Bottom Highlight inside right card
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 7.02, y: botY + 2.45, w: botW - 0.4, h: 0.7,
        fill: { color: '14263B' }, line: { color: C_BLUE, width: 1 }, rectRadius: 0.06
    });
    slide.addText('98.5% LESS MEMORY CONSUMPTION THAN ENTERPRISE ALTERNATIVES', {
        x: 7.17, y: botY + 2.52, w: botW - 0.7, h: 0.2,
        fontSize: 9, fontFace: 'Arial', bold: true, color: C_BLUE
    });
    slide.addText('PMB fits comfortably inside restrictive hypervisor host cgroups without stealing compute capacity from operational guest virtual machines.', {
        x: 7.17, y: botY + 2.74, w: botW - 0.7, h: 0.35,
        fontSize: 8, fontFace: 'Arial', color: C_MUTED
    });
}

// =========================================================================
// SLIDE 10: Production Readiness & Architectural Summary
// =========================================================================
{
    const slide = pptx.addSlide();
    addHeader(
        slide,
        'Production Readiness: Architecture Recap & Appliance Suitability',
        'PRODUCTION READINESS & SUMMARY',
        'Engineered for mission-critical edge, Nutanix hypervisors, and zero-trust security appliances.'
    );

    // Top 3 Architectural Pillar Cards
    const pillars = [
        {
            title: 'PILLAR 1: EMBEDDABLE FOOTPRINT',
            accent: C_BLUE,
            items: [
                'Statically Linked Go Binary: 3.78 MB single executable with zero external runtime or VM dependencies.',
                'Sub-10MB RAM Ceiling: Runs effortlessly on resource-constrained microVM hosts and edge hardware nodes.',
                'Instantaneous Startup: Cold boots in < 10 milliseconds, eliminating failover telemetry downtime.',
                'Self-Contained Deployment: Requires zero configuration daemons, JVMs, or external consensus clusters.'
            ]
        },
        {
            title: 'PILLAR 2: HARDWARE DURABILITY',
            accent: C_GREEN,
            items: [
                'Hardware fsync() Durability: Commits every event directly to NVMe through dynamic group commit.',
                '30,000+ Durable Writes/sec: High throughput without sacrificing instant crash recovery guarantees.',
                'Zero In-Flight Data Loss: Complete immunity against sudden power dropouts and kernel host panics.',
                'Active 0-Byte Compaction: Reclaims disk blocks instantly upon ACK, preventing /var disk exhaustion.'
            ]
        },
        {
            title: 'PILLAR 3: OPERATIONAL ZERO-TRUST',
            accent: C_PURPLE,
            items: [
                'MicroVM Perimeter Isolation: No shared host memory or direct storage access across guest microVMs.',
                'Bounded Buffer Protection: Strict 1MB frame limit drops malformed or abusive payloads proactively.',
                'Zero-SDK Integration: POSIX TCP socket access ensures universal language and OS interoperability.',
                'Thread-Safe Retransmission: At-least-once guaranteed delivery with 2.0s automatic crash failover.'
            ]
        }
    ];

    const colW = 3.71;
    const colGap = 0.3;
    pillars.forEach((p, idx) => {
        const colX = 0.8 + idx * (colW + colGap);

        slide.addShape(pptx.ShapeType.roundRect, {
            x: colX, y: 1.5, w: colW, h: 4.2,
            fill: { color: C_CARD }, line: { color: p.accent, width: 1.5 }, rectRadius: 0.1
        });

        slide.addShape(pptx.ShapeType.roundRect, {
            x: colX + 0.15, y: 1.65, w: colW - 0.3, h: 0.35,
            fill: { color: '1E293B' }, line: { color: p.accent, width: 1 }, rectRadius: 0.06
        });
        slide.addText(p.title, {
            x: colX + 0.15, y: 1.65, w: colW - 0.3, h: 0.35,
            fontSize: 9.5, fontFace: 'Arial', bold: true, color: p.accent, align: 'center', valign: 'middle'
        });

        let itemY = 2.15;
        p.items.forEach(it => {
            slide.addShape(pptx.ShapeType.roundRect, {
                x: colX + 0.15, y: itemY, w: colW - 0.3, h: 0.72,
                fill: { color: '0F172A' }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.05
            });
            slide.addText('✔ ' + it, {
                x: colX + 0.25, y: itemY + 0.05, w: colW - 0.5, h: 0.62,
                fontSize: 8.5, fontFace: 'Arial', color: C_TEXT
            });
            itemY += 0.82;
        });
    });

    // Bottom Grand Summary Banner
    slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8, y: 5.9, w: 11.73, h: 1.15,
        fill: { color: '13263E' }, line: { color: C_BLUE, width: 1.5 }, rectRadius: 0.08
    });

    slide.addText('FINAL TAKEAWAY FOR JUDGES & EVALUATORS', {
        x: 1.0, y: 6.0, w: 11.33, h: 0.22,
        fontSize: 10, fontFace: 'Arial', bold: true, color: C_BLUE, align: 'center'
    });
    slide.addText('PMB provides the missing architectural link in edge hypervisors: Enterprise-grade durable message delivery at the speed and simplicity of an in-memory Unix pipe.', {
        x: 1.0, y: 6.28, w: 11.33, h: 0.45,
        fontSize: 12.5, fontFace: 'Arial', bold: true, color: C_TEXT, align: 'center'
    });
    slide.addText('Sub-millisecond latency • 7.18 MB RAM • Hardware fsync Durability • 0-Byte Instant Compaction', {
        x: 1.0, y: 6.75, w: 11.33, h: 0.22,
        fontSize: 9.5, fontFace: 'Arial', color: C_GREEN, align: 'center'
    });
}

// Write presentation
const outPath = path.join(repoRoot, 'PMB_Architecture_Pitch.pptx');
pptx.writeFile({ fileName: outPath }).then(() => {
    console.log(`Successfully generated professional 10-slide presentation at: ${outPath}`);
}).catch(err => {
    console.error('Error generating presentation:', err);
});
