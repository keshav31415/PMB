const fs = require('fs');

// Color constants
const BG = '#131B2B';
const CARD_BG = '#1A2438';
const CARD_HOVER = '#202D45';
const BORDER_CYAN = '#38BDF8';
const BORDER_EMERALD = '#34D399';
const BORDER_PURPLE = '#818CF8';
const BORDER_AMBER = '#FBBF24';
const BORDER_RED = '#F87171';
const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = '#94A3B8';
const TEXT_CYAN = '#38BDF8';
const TEXT_EMERALD = '#34D399';
const TEXT_RED = '#FCA5A5';
const TEXT_AMBER = '#FDE68A';

// =========================================================================
// SVG 1: Physical Hypervisor Topology & Placement (Slide 1)
// =========================================================================
function generateSlide1SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 600" width="100%" height="100%">
  <defs>
    <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_CYAN}"/>
    </marker>
    <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_EMERALD}"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_PURPLE}"/>
    </marker>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#141E2E"/>
    </linearGradient>
    <linearGradient id="pmbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#162D4A"/>
      <stop offset="100%" stop-color="#0E1D30"/>
    </linearGradient>
    <linearGradient id="nvmeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#13362A"/>
      <stop offset="100%" stop-color="#0B2119"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1100" height="600" fill="${BG}"/>

  <!-- Outer Boundary: Hypervisor Host Platform -->
  <rect x="20" y="20" width="1060" height="560" rx="12" fill="#0C1422" stroke="#253A5A" stroke-width="2"/>
  <rect x="35" y="10" width="480" height="24" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
  <text x="50" y="26" fill="${BORDER_CYAN}" font-family="Arial" font-size="12" font-weight="bold" letter-spacing="1">HOST HYPERVISOR PLATFORM (Nutanix AHV / Linux KVM / Firecracker)</text>

  <!-- Guest MicroVM #1 (Left) -->
  <g transform="translate(45, 70)">
    <rect width="260" height="340" rx="10" fill="url(#cardGrad)" stroke="${BORDER_PURPLE}" stroke-width="2"/>
    <rect x="15" y="15" width="230" height="30" rx="6" fill="#261E42"/>
    <text x="25" y="35" fill="#C4B5FD" font-family="Arial" font-size="13" font-weight="bold">GUEST MICROVM #1 (INGRESS)</text>
    <text x="25" y="70" fill="${TEXT_WHITE}" font-family="Arial" font-size="14" font-weight="bold">Telemetry Producer</text>
    <text x="25" y="90" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Edge Ingestion Daemon</text>

    <rect x="20" y="120" width="220" height="90" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="32" y="145" fill="${BORDER_CYAN}" font-family="Arial" font-size="11" font-weight="bold">Zero-SDK TCP Socket</text>
    <text x="32" y="168" fill="${TEXT_WHITE}" font-family="Arial" font-size="11">Standard POSIX socket write</text>
    <text x="32" y="188" fill="${TEXT_MUTED}" font-family="monospace" font-size="11">PUB orders {"id":101}</text>

    <rect x="20" y="230" width="220" height="85" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="32" y="255" fill="${BORDER_AMBER}" font-family="Arial" font-size="11" font-weight="bold">Hardware Isolation</text>
    <text x="32" y="278" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">• No shared host memory</text>
    <text x="32" y="296" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">• Isolated guest user-space</text>
  </g>

  <!-- Center: PMB Broker Engine -->
  <g transform="translate(360, 60)">
    <rect width="380" height="490" rx="10" fill="url(#pmbGrad)" stroke="${BORDER_CYAN}" stroke-width="2.5"/>
    <rect x="20" y="15" width="340" height="32" rx="6" fill="#132F52"/>
    <text x="35" y="36" fill="${TEXT_CYAN}" font-family="Arial" font-size="13" font-weight="bold">PMB BROKER PROCESS (:4222) - NATIVE GO</text>
    
    <!-- Box 1: TCP Server Ingress -->
    <rect x="25" y="65" width="330" height="65" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="90" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">1. TCP Ingress (:4222)</text>
    <text x="40" y="112" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Non-blocking net.Conn reader • 1MB input buffer</text>

    <!-- Arrow down -->
    <path d="M 190 130 L 190 155" stroke="${BORDER_CYAN}" stroke-width="2" marker-end="url(#arrow-cyan)"/>

    <!-- Box 2: Lock-Free Atomic Treiber Stack -->
    <rect x="25" y="160" width="330" height="75" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="185" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">2. Lock-Free Atomic Queue</text>
    <text x="40" y="206" fill="${BORDER_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">sync/atomic CAS Ingress (No Mutex)</text>
    <text x="40" y="224" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Zero lock contention across 50+ microVM producers</text>

    <!-- Arrow down -->
    <path d="M 190 235 L 190 260" stroke="${BORDER_CYAN}" stroke-width="2" marker-end="url(#arrow-cyan)"/>

    <!-- Box 3: Dynamic Group Commit -->
    <rect x="25" y="265" width="330" height="75" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="290" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">3. Dynamic Group Commit Coordinator</text>
    <text x="40" y="311" fill="${BORDER_AMBER}" font-family="Arial" font-size="11" font-weight="bold">Leader/Follower Batching Barrier</text>
    <text x="40" y="329" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Coalesces N incoming writes into 1 hardware fsync()</text>

    <!-- Arrow down -->
    <path d="M 190 340 L 190 365" stroke="${BORDER_CYAN}" stroke-width="2" marker-end="url(#arrow-cyan)"/>

    <!-- Box 4: Routing Table & pendingAcks -->
    <rect x="25" y="370" width="330" height="75" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="395" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">4. Thread-Safe Route Table</text>
    <text x="40" y="416" fill="${BORDER_PURPLE}" font-family="Arial" font-size="11" font-weight="bold">pendingAcks Map &amp; 2-Second Retransmit</text>
    <text x="40" y="434" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Immediate offset truncation upon subscriber ACK</text>

    <!-- Footer specs chip -->
    <rect x="25" y="455" width="330" height="22" rx="4" fill="#0C1B2E"/>
    <text x="45" y="470" fill="${BORDER_CYAN}" font-family="Arial" font-size="10.5" font-weight="bold">BINARY: 3.78 MB  |  IDLE RESIDENT RAM: 7.18 MB</text>
  </g>

  <!-- Guest MicroVM #2 (Right Top) -->
  <g transform="translate(790, 70)">
    <rect width="265" height="210" rx="10" fill="url(#cardGrad)" stroke="${BORDER_PURPLE}" stroke-width="2"/>
    <rect x="15" y="15" width="235" height="30" rx="6" fill="#261E42"/>
    <text x="25" y="35" fill="#C4B5FD" font-family="Arial" font-size="13" font-weight="bold">GUEST MICROVM #2 (EGRESS)</text>
    
    <text x="25" y="70" fill="${TEXT_WHITE}" font-family="Arial" font-size="14" font-weight="bold">Subscriber Worker</text>
    <text x="25" y="90" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Idempotent Event Consumer</text>

    <rect x="20" y="110" width="225" height="85" rx="6" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="32" y="132" fill="${BORDER_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">At-Least-Once Delivery</text>
    <text x="32" y="152" fill="${TEXT_WHITE}" font-family="monospace" font-size="11">MSG orders 1 {"id":101}</text>
    <text x="32" y="172" fill="${TEXT_MUTED}" font-family="monospace" font-size="11">ACK orders 1</text>
  </g>

  <!-- Physical Storage Subsystem (Right Bottom) -->
  <g transform="translate(790, 310)">
    <rect width="265" height="240" rx="10" fill="url(#nvmeGrad)" stroke="${BORDER_EMERALD}" stroke-width="2"/>
    <rect x="15" y="15" width="235" height="30" rx="6" fill="#133D2D"/>
    <text x="25" y="35" fill="${TEXT_EMERALD}" font-family="Arial" font-size="13" font-weight="bold">PHYSICAL STORAGE SUBSYSTEM</text>

    <text x="25" y="70" fill="${TEXT_WHITE}" font-family="Arial" font-size="14" font-weight="bold">Hardware NVMe / SSD</text>
    <text x="25" y="90" fill="${BORDER_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">Direct Kernel os.File.Sync()</text>

    <rect x="20" y="110" width="225" height="110" rx="6" fill="#0B1A14" stroke="#1F4D3B" stroke-width="1"/>
    <text x="32" y="132" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">Sequential Append-Only WAL</text>
    <text x="32" y="154" fill="${TEXT_MUTED}" font-family="monospace" font-size="10.5">data/logs/&lt;topic&gt;.log</text>
    <text x="32" y="180" fill="${BORDER_AMBER}" font-family="Arial" font-size="10.5" font-weight="bold">Zero Host Buffer Cache Delay</text>
    <text x="32" y="198" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">Survives sudden AHV power drops</text>
  </g>

  <!-- Connectors -->
  <!-- 1. PUB stream from VM1 to PMB -->
  <path d="M 305 210 L 350 210" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-cyan)"/>
  <rect x="290" y="188" width="80" height="20" rx="4" fill="#0F172A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="296" y="202" fill="${BORDER_CYAN}" font-family="Arial" font-size="10" font-weight="bold">1. TCP PUB</text>

  <!-- 2. fsync to NVMe -->
  <path d="M 740 330 L 780 370" stroke="${BORDER_EMERALD}" stroke-width="2.5" marker-end="url(#arrow-emerald)"/>
  <rect x="710" y="340" width="95" height="20" rx="4" fill="#0F172A" stroke="${BORDER_EMERALD}" stroke-width="1"/>
  <text x="716" y="354" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">2. Hard f.Sync()</text>

  <!-- 3. MSG dispatch to VM2 -->
  <path d="M 740 400 L 770 400 L 770 200 L 780 200" stroke="${BORDER_PURPLE}" stroke-width="2.5" fill="none" marker-end="url(#arrow-purple)"/>
  <rect x="705" y="260" width="100" height="20" rx="4" fill="#0F172A" stroke="${BORDER_PURPLE}" stroke-width="1"/>
  <text x="711" y="274" fill="${BORDER_PURPLE}" font-family="Arial" font-size="10" font-weight="bold">3. Guaranteed MSG</text>

  <!-- 4. ACK back to PMB -->
  <path d="M 790 230 L 750 230" stroke="${BORDER_CYAN}" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#arrow-cyan)"/>
  <rect x="720" y="215" width="70" height="18" rx="4" fill="#0F172A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="726" y="228" fill="${BORDER_CYAN}" font-family="Arial" font-size="9.5" font-weight="bold">4. Stream ACK</text>
</svg>`;
}

// =========================================================================
// SVG 2: The Problem Space Dilemma (Slide 2)
// =========================================================================
function generateSlide2SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" width="100%" height="100%">
  <defs>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_RED}"/>
    </marker>
    <linearGradient id="routeAGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2D151E"/>
      <stop offset="100%" stop-color="#190C12"/>
    </linearGradient>
    <linearGradient id="routeBGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2D1A15"/>
      <stop offset="100%" stop-color="#1A0D0A"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1100" height="360" fill="${BG}"/>

  <!-- ================= PIPELINE A ================= -->
  <g transform="translate(20, 15)">
    <!-- Container -->
    <rect width="1060" height="150" rx="10" fill="url(#routeAGrad)" stroke="${BORDER_RED}" stroke-width="1.5"/>
    <rect x="15" y="10" width="460" height="24" rx="4" fill="#4C1D24"/>
    <text x="25" y="26" fill="${TEXT_RED}" font-family="Arial" font-size="11.5" font-weight="bold">ROUTE A: HEAVY ENTERPRISE BROKERS (Kafka, RabbitMQ, ActiveMQ)</text>

    <!-- Step 1: Producer -->
    <g transform="translate(25, 45)">
      <rect width="160" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">MicroVM Ingress</text>
      <text x="15" y="45" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">Heavy Client SDK</text>
      <text x="15" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Thick client libraries</text>
    </g>

    <!-- Arrow 1 -> 2 -->
    <path d="M 190 88 L 220 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 2: Runtime Bloat -->
    <g transform="translate(225, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="${BORDER_RED}" stroke-width="1.2"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">JVM / BEAM Runtime</text>
      <text x="12" y="45" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">500MB – 1.5GB Idle RAM</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Exceeds edge memory cap</text>
    </g>

    <!-- Arrow 2 -> 3 -->
    <path d="M 415 88 L 445 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 3: Quorum Election -->
    <g transform="translate(450, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">Cluster Quorum</text>
      <text x="12" y="45" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5">ZooKeeper / KRaft</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">15–45s boot delay</text>
    </g>

    <!-- Arrow 3 -> 4 -->
    <path d="M 640 88 L 670 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 4: Static Retention -->
    <g transform="translate(675, 45)">
      <rect width="180" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">Static Retention</text>
      <text x="12" y="45" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5">7-Day Log Segments</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Fills /var root disk</text>
    </g>

    <!-- Arrow 4 -> 5 -->
    <path d="M 860 88 L 890 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 5: Failure Outcome -->
    <g transform="translate(895, 45)">
      <rect width="145" height="85" rx="6" fill="#58151C" stroke="${BORDER_RED}" stroke-width="1.5"/>
      <text x="12" y="25" fill="${TEXT_RED}" font-family="Arial" font-size="12" font-weight="bold">CRITICAL FAIL</text>
      <text x="12" y="45" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Host OOM Panic</text>
      <text x="12" y="65" fill="${TEXT_RED}" font-family="Arial" font-size="10">&amp; Disk Exhaustion</text>
    </g>
  </g>

  <!-- ================= PIPELINE B ================= -->
  <g transform="translate(20, 185)">
    <!-- Container -->
    <rect width="1060" height="150" rx="10" fill="url(#routeBGrad)" stroke="${BORDER_AMBER}" stroke-width="1.5"/>
    <rect x="15" y="10" width="460" height="24" rx="4" fill="#4A2612"/>
    <text x="25" y="26" fill="${TEXT_AMBER}" font-family="Arial" font-size="11.5" font-weight="bold">ROUTE B: EPHEMERAL IN-MEMORY IPC (Redis Pub/Sub, ZeroMQ, Nanomsg)</text>

    <!-- Step 1: Producer -->
    <g transform="translate(25, 45)">
      <rect width="160" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">MicroVM Ingress</text>
      <text x="15" y="45" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">Raw POSIX Socket</text>
      <text x="15" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Fast socket write</text>
    </g>

    <!-- Arrow 1 -> 2 -->
    <path d="M 190 88 L 220 88" stroke="${BORDER_AMBER}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 2: Volatile Buffer -->
    <g transform="translate(225, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">User-Space Ring Buffer</text>
      <text x="12" y="45" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5">Ephemeral Memory</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">High throughput, 0 disk</text>
    </g>

    <!-- Arrow 2 -> 3 -->
    <path d="M 415 88 L 445 88" stroke="${BORDER_AMBER}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 3: Unsynchronized RAM Heap -->
    <g transform="translate(450, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">Unsynchronized Heap</text>
      <text x="12" y="45" fill="${TEXT_RED}" font-family="Arial" font-size="10.5">No fsync() Barrier</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Bytes sit in dirty pages</text>
    </g>

    <!-- Arrow 3 -> 4 -->
    <path d="M 640 88 L 670 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 4: Host Crash Event -->
    <g transform="translate(675, 45)">
      <rect width="180" height="85" rx="6" fill="#3D1A1A" stroke="${BORDER_RED}" stroke-width="1.2"/>
      <text x="12" y="25" fill="${TEXT_AMBER}" font-family="Arial" font-size="12" font-weight="bold">⚡ Sudden Power Cut</text>
      <text x="12" y="45" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">Host Panic / Reboot</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Hypervisor node drop</text>
    </g>

    <!-- Arrow 4 -> 5 -->
    <path d="M 860 88 L 890 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 5: Failure Outcome -->
    <g transform="translate(895, 45)">
      <rect width="145" height="85" rx="6" fill="#58151C" stroke="${BORDER_RED}" stroke-width="1.5"/>
      <text x="12" y="25" fill="${TEXT_RED}" font-family="Arial" font-size="12" font-weight="bold">CRITICAL FAIL</text>
      <text x="12" y="45" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">100% In-Flight Loss</text>
      <text x="12" y="65" fill="${TEXT_RED}" font-family="Arial" font-size="10">Zero Data Recovery</text>
    </g>
  </g>
</svg>`;
}

// =========================================================================
// SVG 3: Internal Engine Micro-Architecture & Data Life Cycle (Slide 3)
// (COMPLETELY DIFFERENT FROM SLIDE 1 TOPOLOGY!)
// =========================================================================
function generateSlide3SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 380" width="100%" height="100%">
  <defs>
    <marker id="arrow-pipe" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_CYAN}"/>
    </marker>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_EMERALD}"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_PURPLE}"/>
    </marker>
    <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#142236"/>
      <stop offset="100%" stop-color="#0B131F"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1100" height="380" fill="${BG}"/>

  <!-- Outer Boundary Container -->
  <rect x="20" y="15" width="1060" height="350" rx="10" fill="url(#pipeGrad)" stroke="#233A5E" stroke-width="1.5"/>
  <rect x="35" y="8" width="560" height="24" rx="4" fill="#1A2D4A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="45" y="24" fill="${BORDER_CYAN}" font-family="Arial" font-size="11.5" font-weight="bold" letter-spacing="0.5">PMB CORE DATA PATHWAY: FROM RAW BYTES TO HARDWARE FSYNC &amp; COMPACTION</text>

  <!-- Stage 1: Network Ingress & Framed Parser -->
  <g transform="translate(35, 45)">
    <rect width="180" height="220" rx="8" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
    <rect x="10" y="10" width="160" height="24" rx="4" fill="#0C344E"/>
    <text x="18" y="26" fill="${TEXT_CYAN}" font-family="Arial" font-size="11" font-weight="bold">STAGE 1: INGRESS</text>

    <text x="15" y="58" fill="${TEXT_WHITE}" font-family="Arial" font-size="13" font-weight="bold">Zero-Copy Parser</text>
    <text x="15" y="76" fill="${BORDER_CYAN}" font-family="Arial" font-size="10.5" font-weight="bold">Framed ASCII Engine</text>

    <rect x="10" y="95" width="160" height="110" rx="4" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="18" y="115" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• 1MB Bounded Buffer</text>
    <text x="18" y="135" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• Streaming tokenizer</text>
    <text x="18" y="155" fill="${TEXT_MUTED}" font-family="monospace" font-size="10">PUB topic bytes\r\n</text>
    <text x="18" y="175" fill="${TEXT_MUTED}" font-family="monospace" font-size="10">&lt;raw payload&gt;\r\n</text>
    <text x="18" y="195" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10">O(1) memory alloc</text>
  </g>

  <!-- Flow Arrow 1 -> 2 -->
  <path d="M 220 155 L 245 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 2: Lock-Free Atomic Queue -->
  <g transform="translate(250, 45)">
    <rect width="180" height="220" rx="8" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
    <rect x="10" y="10" width="160" height="24" rx="4" fill="#0C344E"/>
    <text x="18" y="26" fill="${TEXT_CYAN}" font-family="Arial" font-size="11" font-weight="bold">STAGE 2: ATOMIC</text>

    <text x="15" y="58" fill="${TEXT_WHITE}" font-family="Arial" font-size="13" font-weight="bold">Treiber CAS Stack</text>
    <text x="15" y="76" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10.5" font-weight="bold">sync/atomic Pointer</text>

    <rect x="10" y="95" width="160" height="110" rx="4" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="18" y="115" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• CompareAndSwap()</text>
    <text x="18" y="135" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• Zero lock contention</text>
    <text x="18" y="155" fill="${BORDER_CYAN}" font-family="Arial" font-size="10.5">• Multi-producer safe</text>
    <text x="18" y="175" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Immune to thread</text>
    <text x="18" y="193" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">starvation spikes</text>
  </g>

  <!-- Flow Arrow 2 -> 3 -->
  <path d="M 435 155 L 460 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 3: Dynamic Group Commit -->
  <g transform="translate(465, 45)">
    <rect width="185" height="220" rx="8" fill="#1E293B" stroke="${BORDER_EMERALD}" stroke-width="1.5"/>
    <rect x="10" y="10" width="165" height="24" rx="4" fill="#0E3D2D"/>
    <text x="18" y="26" fill="${TEXT_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">STAGE 3: DURABILITY</text>

    <text x="15" y="58" fill="${TEXT_WHITE}" font-family="Arial" font-size="13" font-weight="bold">Group Commit WAL</text>
    <text x="15" y="76" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10.5" font-weight="bold">Hardware fsync Barrier</text>

    <rect x="10" y="95" width="165" height="110" rx="4" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="18" y="115" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• Leader drains batch</text>
    <text x="18" y="135" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10.5">• 1 physical NVMe write</text>
    <text x="18" y="155" fill="${BORDER_AMBER}" font-family="Arial" font-size="10.5">• os.File.Sync() barrier</text>
    <text x="18" y="175" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• 30,000+ writes/sec</text>
    <text x="18" y="195" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Zero-loss power drops</text>
  </g>

  <!-- Flow Arrow 3 -> 4 -->
  <path d="M 655 155 L 680 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 4: Routing & pendingAcks -->
  <g transform="translate(685, 45)">
    <rect width="180" height="220" rx="8" fill="#1E293B" stroke="${BORDER_PURPLE}" stroke-width="1.5"/>
    <rect x="10" y="10" width="160" height="24" rx="4" fill="#291F47"/>
    <text x="18" y="26" fill="#C4B5FD" font-family="Arial" font-size="11" font-weight="bold">STAGE 4: DISPATCH</text>

    <text x="15" y="58" fill="${TEXT_WHITE}" font-family="Arial" font-size="13" font-weight="bold">Route &amp; Tracking</text>
    <text x="15" y="76" fill="${BORDER_PURPLE}" font-family="Arial" font-size="10.5" font-weight="bold">sync.RWMutex Fan-Out</text>

    <rect x="10" y="95" width="160" height="110" rx="4" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="18" y="115" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• In-memory fan-out</text>
    <text x="18" y="135" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• Assign unique MsgID</text>
    <text x="18" y="155" fill="${BORDER_PURPLE}" font-family="Arial" font-size="10.5">• pendingAcks map</text>
    <text x="18" y="175" fill="${BORDER_AMBER}" font-family="Arial" font-size="10.5">• 2-sec auto-retry timer</text>
    <text x="18" y="195" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">At-least-once guarantee</text>
  </g>

  <!-- Flow Arrow 4 -> 5 -->
  <path d="M 870 155 L 895 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 5: ACK Compaction & Truncation -->
  <g transform="translate(900, 45)">
    <rect width="165" height="220" rx="8" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
    <rect x="10" y="10" width="145" height="24" rx="4" fill="#0C344E"/>
    <text x="18" y="26" fill="${TEXT_CYAN}" font-family="Arial" font-size="11" font-weight="bold">STAGE 5: RECLAIM</text>

    <text x="15" y="58" fill="${TEXT_WHITE}" font-family="Arial" font-size="13" font-weight="bold">ACK Compaction</text>
    <text x="15" y="76" fill="${BORDER_CYAN}" font-family="Arial" font-size="10.5" font-weight="bold">Instant Log Truncation</text>

    <rect x="10" y="95" width="145" height="110" rx="4" fill="#0F172A" stroke="#334155" stroke-width="1"/>
    <text x="18" y="115" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• Client sends ACK</text>
    <text x="18" y="135" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5">• Timer canceled</text>
    <text x="18" y="155" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10.5">• Offset reclaimed</text>
    <text x="18" y="175" fill="${BORDER_AMBER}" font-family="Arial" font-size="10.5">• Truncate to 0 bytes</text>
    <text x="18" y="195" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Zero disk leaks</text>
  </g>

  <!-- Bottom Annotation Bar -->
  <rect x="35" y="285" width="1030" height="70" rx="6" fill="#0F1B2D" stroke="#253D63" stroke-width="1"/>
  <text x="50" y="308" fill="${BORDER_CYAN}" font-family="Arial" font-size="11.5" font-weight="bold">ARCHITECTURAL HIGHLIGHT: ZERO RUNTIME STORAGE LEAKS</text>
  <text x="50" y="328" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">Unlike Kafka/RabbitMQ which accumulate static 7-day logs until hypervisor root partitions exhaust,</text>
  <text x="50" y="344" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">PMB reclaims physical NVMe log blocks the exact microsecond all subscribers ACK, keeping disk footprint bounded.</text>
</svg>`;
}

const path = require('path');
const docsDir = path.resolve(__dirname, '../../docs');

fs.writeFileSync(path.join(docsDir, 'slide1_topology.svg'), generateSlide1SVG());
fs.writeFileSync(path.join(docsDir, 'slide2_problem.svg'), generateSlide2SVG());
fs.writeFileSync(path.join(docsDir, 'slide3_solution.svg'), generateSlide3SVG());

console.log('Successfully generated slide1_topology.svg, slide2_problem.svg, slide3_solution.svg in docs/');

