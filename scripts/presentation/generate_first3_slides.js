const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../');
const docsDir = path.resolve(repoRoot, 'docs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333" x 7.5" Modern 16:9

// Deep Tech Color Palette
const C_BG = '0B0F19';       // Midnight Navy
const C_CARD = '131B2B';     // Dark Slate Card
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
        x: 0.8, y: 0.4, w: 3.6, h: 0.28,
        fill: { color: '1E293B' }, line: { color: C_BLUE, width: 1 }, rectRadius: 0.06
    });
    slide.addText(section.toUpperCase(), {
        x: 0.8, y: 0.4, w: 3.6, h: 0.28,
        fontSize: 9, fontFace: 'Arial', bold: true, color: C_BLUE, align: 'center', valign: 'middle'
    });

    // Main Title
    slide.addText(title, {
        x: 0.8, y: 0.72, w: 11.73, h: 0.48,
        fontSize: 20, fontFace: 'Arial', bold: true, color: C_TEXT
    });

    // Subheader
    if (subheader) {
        slide.addText(subheader, {
            x: 0.8, y: 1.18, w: 11.73, h: 0.26,
            fontSize: 11, fontFace: 'Arial', color: C_MUTED
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
            desc: '• Ingress MicroVM: Sends raw telemetry via standard TCP stream (PUB <topic> <payload>). Zero client SDK required.\n• Storage Subsystem: Directly commits sequential writes to physical NVMe WAL (logs/<topic>.log) with fsync() durability.\n• Egress MicroVM: Receives guaranteed MSG delivery and returns ACK over bi-directional TCP connection.'
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
            x: 1.0, y: currentY, w: 4.4, h: idx === 2 ? 1.05 : 0.55,
            fontSize: 9, fontFace: 'Arial', color: C_MUTED
        });
        currentY += (idx === 2 ? 1.15 : 0.65);
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

    // Embed Custom SVG Diagram 1 (1100 x 600 -> 1.833:1 ratio)
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
// SLIDE 2: The Problem Space: Trade-off Dilemma
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

    // Embed Custom SVG Diagram 2 (1100 x 360 -> 3.055:1 ratio)
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
        '• Runtime Footprint Tax: Requires JVM or Erlang BEAM runtime + ZooKeeper / KRaft consensus quorum. Baseline idle footprint is 500MB to 1.5GB RAM before processing the first message.',
        '• Root Partition Exhaustion: Static multi-day retention models fill hypervisor root filesystems (/var), precipitating catastrophic host kernel lockups.',
        '• Cold Boot Penalty: 15–45 second startup and quorum election delays cause total telemetry blackout during hypervisor failover.'
    ].join('\n');
    slide.addText(bulletsA, {
        x: 1.0, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.5,
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
        '• Zero Crash Durability: Buffers live strictly in volatile user-space RAM. Sudden host power drop or hypervisor crash destroys 100% of in-flight messages with zero recovery.',
        '• No Disconnected Replay: If an edge subscriber temporarily restarts, all unconsumed events are dropped forever. No sequential log replay exists.',
        '• False Durability Window: Periodic background disk snapshotting (Redis AOF 1s flush) leaves an unrecoverable 1000ms window where mission-critical events are wiped.'
    ].join('\n');
    slide.addText(bulletsB, {
        x: 7.02, y: cardY + 0.38, w: cardW - 0.4, h: cardH - 0.5,
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

    // Embed Custom SVG Diagram 3 (1100 x 380 -> 2.894:1 ratio)
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

// Write presentation
const outPath = path.join(repoRoot, 'PMB_Architecture_Pitch.pptx');
pptx.writeFile({ fileName: outPath }).then(() => {
    console.log(`Successfully generated presentation at: ${outPath}`);
}).catch(err => {
    console.error('Error generating presentation:', err);
});
