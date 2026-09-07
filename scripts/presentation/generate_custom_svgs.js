const fs = require('fs');
const path = require('path');

// Color constants matching PMB deep tech theme
const BG = '#131B2B';
const CARD_BG = '#1A2438';
const CARD_DARK = '#0F172A';
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

    <path d="M 190 130 L 190 155" stroke="${BORDER_CYAN}" stroke-width="2" marker-end="url(#arrow-cyan)"/>

    <!-- Box 2: Lock-Free Atomic Treiber Stack -->
    <rect x="25" y="160" width="330" height="75" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="185" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">2. Lock-Free Atomic Queue</text>
    <text x="40" y="206" fill="${BORDER_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">sync/atomic CAS Ingress (No Mutex)</text>
    <text x="40" y="224" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Zero lock contention across 50+ microVM producers</text>

    <path d="M 190 235 L 190 260" stroke="${BORDER_CYAN}" stroke-width="2" marker-end="url(#arrow-cyan)"/>

    <!-- Box 3: Dynamic Group Commit -->
    <rect x="25" y="265" width="330" height="75" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="290" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">3. Dynamic Group Commit Coordinator</text>
    <text x="40" y="311" fill="${BORDER_AMBER}" font-family="Arial" font-size="11" font-weight="bold">Leader/Follower Batching Barrier</text>
    <text x="40" y="329" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Coalesces N incoming writes into 1 hardware fsync()</text>

    <path d="M 190 340 L 190 365" stroke="${BORDER_CYAN}" stroke-width="2" marker-end="url(#arrow-cyan)"/>

    <!-- Box 4: Routing Table & pendingAcks -->
    <rect x="25" y="370" width="330" height="75" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="40" y="395" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">4. Thread-Safe Route Table</text>
    <text x="40" y="416" fill="${BORDER_PURPLE}" font-family="Arial" font-size="11" font-weight="bold">pendingAcks Map &amp; 2-Second Retransmit</text>
    <text x="40" y="434" fill="${TEXT_MUTED}" font-family="Arial" font-size="11">Immediate offset truncation upon subscriber ACK</text>

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
  <path d="M 305 210 L 350 210" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-cyan)"/>
  <rect x="290" y="188" width="80" height="20" rx="4" fill="#0F172A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="296" y="202" fill="${BORDER_CYAN}" font-family="Arial" font-size="10" font-weight="bold">1. TCP PUB</text>

  <path d="M 740 330 L 780 370" stroke="${BORDER_EMERALD}" stroke-width="2.5" marker-end="url(#arrow-emerald)"/>
  <rect x="710" y="340" width="95" height="20" rx="4" fill="#0F172A" stroke="${BORDER_EMERALD}" stroke-width="1"/>
  <text x="716" y="354" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">2. Hard f.Sync()</text>

  <path d="M 740 400 L 770 400 L 770 200 L 780 200" stroke="${BORDER_PURPLE}" stroke-width="2.5" fill="none" marker-end="url(#arrow-purple)"/>
  <rect x="705" y="260" width="100" height="20" rx="4" fill="#0F172A" stroke="${BORDER_PURPLE}" stroke-width="1"/>
  <text x="711" y="274" fill="${BORDER_PURPLE}" font-family="Arial" font-size="10" font-weight="bold">3. Guaranteed MSG</text>

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

  <rect width="1100" height="360" fill="${BG}"/>

  <!-- ROUTE A -->
  <g transform="translate(20, 15)">
    <rect width="1060" height="150" rx="10" fill="url(#routeAGrad)" stroke="${BORDER_RED}" stroke-width="1.5"/>
    <rect x="15" y="10" width="460" height="24" rx="4" fill="#4C1D24"/>
    <text x="25" y="26" fill="${TEXT_RED}" font-family="Arial" font-size="11.5" font-weight="bold">ROUTE A: HEAVY ENTERPRISE BROKERS (Kafka, RabbitMQ, ActiveMQ)</text>

    <g transform="translate(25, 45)">
      <rect width="160" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">MicroVM Ingress</text>
      <text x="15" y="45" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">Heavy Client SDK</text>
      <text x="15" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Thick client libraries</text>
    </g>

    <path d="M 190 88 L 220 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(225, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="${BORDER_RED}" stroke-width="1.2"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">JVM / BEAM Runtime</text>
      <text x="12" y="45" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">500MB – 1.5GB Idle RAM</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Exceeds edge memory cap</text>
    </g>

    <path d="M 415 88 L 445 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(450, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">Cluster Quorum</text>
      <text x="12" y="45" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5">ZooKeeper / KRaft</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">15–45s boot delay</text>
    </g>

    <path d="M 640 88 L 670 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(675, 45)">
      <rect width="180" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">Static Retention</text>
      <text x="12" y="45" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5">7-Day Log Segments</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Fills /var root disk</text>
    </g>

    <path d="M 860 88 L 890 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(895, 45)">
      <rect width="145" height="85" rx="6" fill="#58151C" stroke="${BORDER_RED}" stroke-width="1.5"/>
      <text x="12" y="25" fill="${TEXT_RED}" font-family="Arial" font-size="12" font-weight="bold">CRITICAL FAIL</text>
      <text x="12" y="45" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Host OOM Panic</text>
      <text x="12" y="65" fill="${TEXT_RED}" font-family="Arial" font-size="10">&amp; Disk Exhaustion</text>
    </g>
  </g>

  <!-- ROUTE B -->
  <g transform="translate(20, 185)">
    <rect width="1060" height="150" rx="10" fill="url(#routeBGrad)" stroke="${BORDER_AMBER}" stroke-width="1.5"/>
    <rect x="15" y="10" width="460" height="24" rx="4" fill="#4A2612"/>
    <text x="25" y="26" fill="${TEXT_AMBER}" font-family="Arial" font-size="11.5" font-weight="bold">ROUTE B: EPHEMERAL IN-MEMORY IPC (Redis Pub/Sub, ZeroMQ, Nanomsg)</text>

    <g transform="translate(25, 45)">
      <rect width="160" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">MicroVM Ingress</text>
      <text x="15" y="45" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5">Raw POSIX Socket</text>
      <text x="15" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Fast socket write</text>
    </g>

    <path d="M 190 88 L 220 88" stroke="${BORDER_AMBER}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(225, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">User-Space Ring Buffer</text>
      <text x="12" y="45" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5">Ephemeral Memory</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">High throughput, 0 disk</text>
    </g>

    <path d="M 415 88 L 445 88" stroke="${BORDER_AMBER}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(450, 45)">
      <rect width="185" height="85" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="25" fill="${TEXT_WHITE}" font-family="Arial" font-size="12" font-weight="bold">Unsynchronized Heap</text>
      <text x="12" y="45" fill="${TEXT_RED}" font-family="Arial" font-size="10.5">No fsync() Barrier</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Bytes sit in dirty pages</text>
    </g>

    <path d="M 640 88 L 670 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <g transform="translate(675, 45)">
      <rect width="180" height="85" rx="6" fill="#3D1A1A" stroke="${BORDER_RED}" stroke-width="1.2"/>
      <text x="12" y="25" fill="${TEXT_AMBER}" font-family="Arial" font-size="12" font-weight="bold">⚡ Sudden Power Cut</text>
      <text x="12" y="45" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">Host Panic / Reboot</text>
      <text x="12" y="65" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Hypervisor node drop</text>
    </g>

    <path d="M 860 88 L 890 88" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

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
// =========================================================================
function generateSlide3SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 380" width="100%" height="100%">
  <defs>
    <marker id="arrow-pipe" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_CYAN}"/>
    </marker>
    <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#142236"/>
      <stop offset="100%" stop-color="#0B131F"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="380" fill="${BG}"/>

  <rect x="20" y="15" width="1060" height="350" rx="10" fill="url(#pipeGrad)" stroke="#233A5E" stroke-width="1.5"/>
  <rect x="35" y="8" width="560" height="24" rx="4" fill="#1A2D4A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="45" y="24" fill="${BORDER_CYAN}" font-family="Arial" font-size="11.5" font-weight="bold" letter-spacing="0.5">PMB CORE DATA PATHWAY: FROM RAW BYTES TO HARDWARE FSYNC &amp; COMPACTION</text>

  <!-- Stage 1 -->
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

  <path d="M 220 155 L 245 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 2 -->
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

  <path d="M 435 155 L 460 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 3 -->
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

  <path d="M 655 155 L 680 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 4 -->
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

  <path d="M 870 155 L 895 155" stroke="${BORDER_CYAN}" stroke-width="2.5" marker-end="url(#arrow-pipe)"/>

  <!-- Stage 5 -->
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

// =========================================================================
// SVG 4: Lock-Free Atomic Treiber Stack vs Mutex Convoy (Slide 4)
// =========================================================================
function generateSlide4SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" width="100%" height="100%">
  <defs>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_RED}"/>
    </marker>
    <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_EMERALD}"/>
    </marker>
    <linearGradient id="badGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#24141E"/>
      <stop offset="100%" stop-color="#140A10"/>
    </linearGradient>
    <linearGradient id="goodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#102520"/>
      <stop offset="100%" stop-color="#091714"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="360" fill="${BG}"/>

  <!-- LEFT PANEL: Traditional Mutex Lock Convoy -->
  <g transform="translate(20, 15)">
    <rect width="520" height="330" rx="10" fill="url(#badGrad)" stroke="${BORDER_RED}" stroke-width="1.5"/>
    <rect x="15" y="12" width="340" height="24" rx="4" fill="#4C1D24"/>
    <text x="25" y="28" fill="${TEXT_RED}" font-family="Arial" font-size="11.5" font-weight="bold">TRADITIONAL MUTEX CONTENTION (Lock Convoy)</text>

    <!-- 3 Producers trying to lock -->
    <g transform="translate(25, 55)">
      <rect width="120" height="42" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="26" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">MicroVM 1</text>

      <rect y="60" width="120" height="42" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="86" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">MicroVM 2</text>

      <rect y="120" width="120" height="42" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="146" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">MicroVM 3</text>
    </g>

    <!-- Mutex Barrier Box -->
    <g transform="translate(180, 75)">
      <rect width="140" height="120" rx="8" fill="#38151D" stroke="${BORDER_RED}" stroke-width="1.5"/>
      <text x="18" y="30" fill="${TEXT_RED}" font-family="Arial" font-size="11" font-weight="bold">OS Mutex Lock</text>
      <text x="18" y="52" fill="${TEXT_WHITE}" font-family="monospace" font-size="10">sync.Mutex.Lock()</text>
      <rect x="12" y="68" width="116" height="40" rx="4" fill="#58151C"/>
      <text x="18" y="86" fill="${TEXT_AMBER}" font-family="Arial" font-size="9.5" font-weight="bold">LOCK CONVOY</text>
      <text x="18" y="100" fill="${TEXT_RED}" font-family="Arial" font-size="9">Threads sleep in kernel</text>
    </g>

    <!-- Connecting Arrows into Mutex -->
    <path d="M 145 76 L 175 105" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>
    <path d="M 145 135 L 175 135" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>
    <path d="M 145 196 L 175 165" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Bottleneck Output -->
    <path d="M 320 135 L 355 135" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>
    <g transform="translate(360, 95)">
      <rect width="135" height="80" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="24" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">Serialized Ingress</text>
      <text x="12" y="44" fill="${TEXT_RED}" font-family="Arial" font-size="9.5">Max ~8,000 ops/s</text>
      <text x="12" y="62" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Severe tail latency</text>
    </g>

    <!-- Bottom summary box -->
    <rect x="20" y="235" width="480" height="80" rx="6" fill="#1A0D14" stroke="#4C1D24" stroke-width="1"/>
    <text x="32" y="258" fill="${TEXT_RED}" font-family="Arial" font-size="10" font-weight="bold">THE HYPERVISOR PENALTY: THREAD INVERSION</text>
    <text x="32" y="278" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">When hypervisor overcommits vCPUs, a descheduled lock-holding</text>
    <text x="32" y="295" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">thread blocks all other guest microVMs, multiplying tail latency 10x-50x.</text>
  </g>

  <!-- RIGHT PANEL: PMB Lock-Free Atomic Treiber Stack -->
  <g transform="translate(560, 15)">
    <rect width="520" height="330" rx="10" fill="url(#goodGrad)" stroke="${BORDER_EMERALD}" stroke-width="1.5"/>
    <rect x="15" y="12" width="370" height="24" rx="4" fill="#0E382B"/>
    <text x="25" y="28" fill="${TEXT_EMERALD}" font-family="Arial" font-size="11.5" font-weight="bold">PMB ATOMIC TREIBER STACK (sync/atomic CAS)</text>

    <!-- 3 Concurrent MicroVMs -->
    <g transform="translate(25, 55)">
      <rect width="120" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
      <text x="15" y="26" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">MicroVM 1</text>

      <rect y="60" width="120" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
      <text x="15" y="86" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">MicroVM 2</text>

      <rect y="120" width="120" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
      <text x="15" y="146" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">MicroVM 3</text>
    </g>

    <!-- CAS Ingress Box -->
    <g transform="translate(180, 65)">
      <rect width="155" height="140" rx="8" fill="#0B2B20" stroke="${BORDER_EMERALD}" stroke-width="1.5"/>
      <text x="14" y="24" fill="${TEXT_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">Lock-Free Treiber CAS</text>
      <text x="14" y="44" fill="${TEXT_CYAN}" font-family="monospace" font-size="9.5">node.next = oldHead</text>
      <text x="14" y="62" fill="${TEXT_CYAN}" font-family="monospace" font-size="9.5">CAS(&amp;head, old, node)</text>
      <rect x="10" y="78" width="135" height="50" rx="4" fill="#133D2F"/>
      <text x="16" y="96" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5" font-weight="bold">HARDWARE ATOMIC</text>
      <text x="16" y="112" fill="${TEXT_EMERALD}" font-family="Arial" font-size="9">Single CPU cycle swap</text>
      <text x="16" y="124" fill="${TEXT_MUTED}" font-family="Arial" font-size="8.5">Zero kernel context switches</text>
    </g>

    <!-- Connecting Arrows into CAS -->
    <path d="M 145 76 L 175 105" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-emerald)"/>
    <path d="M 145 135 L 175 135" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-emerald)"/>
    <path d="M 145 196 L 175 165" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-emerald)"/>

    <!-- Lock-free Output -->
    <path d="M 335 135 L 365 135" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-emerald)"/>
    <g transform="translate(370, 85)">
      <rect width="130" height="100" rx="6" fill="#1E293B" stroke="${BORDER_EMERALD}" stroke-width="1"/>
      <text x="12" y="24" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">Atomic Linked List</text>
      <text x="12" y="44" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">30,000+ ops/sec</text>
      <text x="12" y="64" fill="${BORDER_CYAN}" font-family="Arial" font-size="9">O(1) Push Time</text>
      <text x="12" y="84" fill="${TEXT_MUTED}" font-family="Arial" font-size="8.5">Flusher atomically</text>
      <text x="12" y="95" fill="${TEXT_MUTED}" font-family="Arial" font-size="8.5">drains head to nil</text>
    </g>

    <!-- Bottom summary box -->
    <rect x="20" y="235" width="480" height="80" rx="6" fill="#0B1C16" stroke="#133D2D" stroke-width="1"/>
    <text x="32" y="258" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">PMB ADVANTAGE: INDEPENDENT CPU PROGRESS</text>
    <text x="32" y="278" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">Producers never sleep. If a collision occurs, CPU retries the 2-cycle CAS</text>
    <text x="32" y="295" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">immediately. Scales perfectly across 50+ concurrent microVM streams.</text>
  </g>
</svg>`;
}

// =========================================================================
// SVG 5: Dynamic Group Commit WAL Architecture (Slide 5)
// =========================================================================
function generateSlide5SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" width="100%" height="100%">
  <defs>
    <marker id="arrow-commit" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_EMERALD}"/>
    </marker>
    <marker id="arrow-cyan" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_CYAN}"/>
    </marker>
    <linearGradient id="gcGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#14263B"/>
      <stop offset="100%" stop-color="#0D1826"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="360" fill="${BG}"/>

  <rect x="20" y="15" width="1060" height="330" rx="10" fill="url(#gcGrad)" stroke="#233A5E" stroke-width="1.5"/>
  <rect x="35" y="10" width="560" height="24" rx="4" fill="#1A2D4A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="45" y="26" fill="${BORDER_CYAN}" font-family="Arial" font-size="11.5" font-weight="bold">DYNAMIC GROUP COMMIT: AMORTIZING HARDWARE FSYNC ACROSS N WRITERS</text>

  <!-- Concurrent Writers on Left -->
  <g transform="translate(35, 50)">
    <text x="0" y="18" fill="${TEXT_MUTED}" font-family="Arial" font-size="10.5" font-weight="bold">CONCURRENT PUBLISHERS</text>

    <!-- Writer 1 -->
    <rect y="30" width="180" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="12" y="48" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Publisher 1</text>
    <text x="12" y="63" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">PUB orders {"id":1}</text>

    <!-- Writer 2 -->
    <rect y="82" width="180" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="12" y="100" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Publisher 2</text>
    <text x="12" y="115" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">PUB orders {"id":2}</text>

    <!-- Writer 3 -->
    <rect y="134" width="180" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="12" y="152" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Publisher 3</text>
    <text x="12" y="167" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">PUB orders {"id":3}</text>

    <!-- Writer N -->
    <rect y="186" width="180" height="42" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="12" y="204" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Publisher N (Up to 50)</text>
    <text x="12" y="219" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">PUB orders {"id":N}</text>
  </g>

  <!-- Arrows from writers into Group Leader -->
  <path d="M 220 100 L 260 145" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
  <path d="M 220 152 L 260 152" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
  <path d="M 220 205 L 260 160" stroke="${BORDER_CYAN}" stroke-width="1.5"/>

  <!-- Center-Left: Group Commit Coordinator -->
  <g transform="translate(265, 75)">
    <rect width="260" height="180" rx="8" fill="#16253B" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
    <rect x="12" y="12" width="236" height="24" rx="4" fill="#0F3354"/>
    <text x="20" y="28" fill="${TEXT_CYAN}" font-family="Arial" font-size="11" font-weight="bold">LEADER/FOLLOWER BARRIER</text>

    <text x="16" y="60" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">• Leader Goroutine:</text>
    <text x="26" y="76" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">First writer acquires sync lock,</text>
    <text x="26" y="90" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">drains atomic queue in 1 shot.</text>

    <text x="16" y="115" fill="${BORDER_AMBER}" font-family="Arial" font-size="11" font-weight="bold">• Follower Goroutines:</text>
    <text x="26" y="131" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Park on completion channel (doneChan);</text>
    <text x="26" y="145" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">zero CPU burn while waiting.</text>

    <text x="16" y="168" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">Single physical I/O write for all N</text>
  </g>

  <!-- Arrow to Physical Storage -->
  <path d="M 530 165 L 575 165" stroke="${BORDER_EMERALD}" stroke-width="2.5" marker-end="url(#arrow-commit)"/>

  <!-- Center-Right: NVMe Storage Subsystem -->
  <g transform="translate(580, 65)">
    <rect width="250" height="200" rx="8" fill="#0C251C" stroke="${BORDER_EMERALD}" stroke-width="2"/>
    <rect x="12" y="12" width="226" height="24" rx="4" fill="#133D2D"/>
    <text x="22" y="28" fill="${TEXT_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">PHYSICAL NVMe STORAGE</text>

    <text x="16" y="60" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">Direct Kernel Barrier</text>
    <rect x="12" y="70" width="226" height="32" rx="4" fill="#0B1A14" stroke="${BORDER_EMERALD}" stroke-width="1"/>
    <text x="20" y="90" fill="${TEXT_WHITE}" font-family="monospace" font-size="11" font-weight="bold">f.Sync() / fsync()</text>

    <text x="16" y="124" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Sequential WAL Append:</text>
    <rect x="12" y="134" width="226" height="50" rx="4" fill="#143324"/>
    <text x="20" y="152" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">[#1 | 48B] [#2 | 52B] [#3 | 48B]</text>
    <text x="20" y="170" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">1 Hardware Sync = N Records</text>
  </g>

  <!-- Notification back to all writers -->
  <path d="M 700 270 L 700 295 L 125 295 L 125 285" stroke="${BORDER_EMERALD}" stroke-width="2" stroke-dasharray="4,4" fill="none"/>
  <rect x="330" y="285" width="250" height="20" rx="4" fill="#0F2B20" stroke="${BORDER_EMERALD}" stroke-width="1"/>
  <text x="340" y="299" fill="${TEXT_EMERALD}" font-family="Arial" font-size="9.5" font-weight="bold">Simultaneous doneChan Broadcast (close)</text>

  <!-- Rightmost: Performance Outcome Card -->
  <g transform="translate(850, 65)">
    <rect width="210" height="200" rx="8" fill="#162235" stroke="${BORDER_CYAN}" stroke-width="1.5"/>
    <rect x="10" y="10" width="190" height="22" rx="4" fill="#1F324D"/>
    <text x="18" y="25" fill="${BORDER_CYAN}" font-family="Arial" font-size="10" font-weight="bold">BENCHMARK VERIFICATION</text>

    <text x="15" y="55" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">Individual fsync rate:</text>
    <text x="15" y="74" fill="${TEXT_RED}" font-family="Arial" font-size="12" font-weight="bold">~500 - 1,000 writes/s</text>

    <text x="15" y="102" fill="${TEXT_MUTED}" font-family="Arial" font-size="10">PMB Group Commit rate:</text>
    <text x="15" y="125" fill="${TEXT_EMERALD}" font-family="Arial" font-size="18" font-weight="bold">30,000+ writes/s</text>

    <rect x="12" y="145" width="186" height="42" rx="4" fill="#0C1B2E"/>
    <text x="18" y="162" fill="${BORDER_CYAN}" font-family="Arial" font-size="9" font-weight="bold">Durability Guarantee:</text>
    <text x="18" y="177" fill="${TEXT_WHITE}" font-family="Arial" font-size="8.5">Zero records lost on pull plug</text>
  </g>
</svg>`;
}

// =========================================================================
// SVG 6: Safe Egress Routing & Retransmission Dual-Track (Slide 6)
// =========================================================================
function generateSlide6SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" width="100%" height="100%">
  <defs>
    <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_EMERALD}"/>
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_AMBER}"/>
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="${BORDER_PURPLE}"/>
    </marker>
    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#191B2E"/>
      <stop offset="100%" stop-color="#0E0F1D"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="360" fill="${BG}"/>

  <!-- Outer Container -->
  <rect x="20" y="15" width="1060" height="330" rx="10" fill="url(#routeGrad)" stroke="#312E5C" stroke-width="1.5"/>
  <rect x="35" y="10" width="580" height="24" rx="4" fill="#241E45" stroke="${BORDER_PURPLE}" stroke-width="1"/>
  <text x="45" y="26" fill="#C4B5FD" font-family="Arial" font-size="11.5" font-weight="bold">DUAL-TRACK EGRESS ENGINE: HAPPY PATH VS. WORKER CRASH TIMEOUT</text>

  <!-- Track A: Normal Delivery (Happy Path) -->
  <g transform="translate(35, 45)">
    <rect width="1030" height="135" rx="8" fill="#122521" stroke="${BORDER_EMERALD}" stroke-width="1.2"/>
    <rect x="15" y="10" width="220" height="22" rx="4" fill="#0E382A"/>
    <text x="22" y="25" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10.5" font-weight="bold">TRACK A: HAPPY PATH (NORMAL ACK)</text>

    <!-- Step 1: Dispatch -->
    <g transform="translate(25, 42)">
      <rect width="190" height="70" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
      <text x="12" y="22" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">1. Broker Dispatch</text>
      <text x="12" y="40" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">MSG orders 101 {"item"}</text>
      <text x="12" y="58" fill="${TEXT_CYAN}" font-family="Arial" font-size="9">Inserts into pendingAcks</text>
    </g>

    <path d="M 220 77 L 260 77" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-green)"/>

    <!-- Step 2: Consumer Receives -->
    <g transform="translate(265, 42)">
      <rect width="200" height="70" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="12" y="22" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">2. MicroVM Consumer</text>
      <text x="12" y="40" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5">Processes payload in user-space</text>
      <text x="12" y="58" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Execution duration: ~0.5ms</text>
    </g>

    <path d="M 470 77 L 510 77" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-green)"/>

    <!-- Step 3: ACK Returned -->
    <g transform="translate(515, 42)">
      <rect width="210" height="70" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
      <text x="12" y="22" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">3. Consumer Sends ACK</text>
      <text x="12" y="40" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">ACK orders 101\r\n</text>
      <text x="12" y="58" fill="${BORDER_EMERALD}" font-family="Arial" font-size="9">Returns via socket stream</text>
    </g>

    <path d="M 730 77 L 770 77" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-green)"/>

    <!-- Step 4: Reclaim Offset -->
    <g transform="translate(775, 42)">
      <rect width="230" height="70" rx="6" fill="#0C251C" stroke="${BORDER_EMERALD}" stroke-width="1.5"/>
      <text x="12" y="22" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10.5" font-weight="bold">4. Map Delete &amp; Timer Kill</text>
      <text x="12" y="40" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5">delete(pendingAcks, 101)</text>
      <text x="12" y="58" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Reclaims offset in memory instantly</text>
    </g>
  </g>

  <!-- Track B: Worker Crash & Auto-Retry -->
  <g transform="translate(35, 190)">
    <rect width="1030" height="145" rx="8" fill="#24151B" stroke="${BORDER_RED}" stroke-width="1.2"/>
    <rect x="15" y="10" width="310" height="22" rx="4" fill="#4A181D"/>
    <text x="22" y="25" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">TRACK B: FAULT RECOVERY (WORKER CRASH / TIMEOUT)</text>

    <!-- Step 1: Dispatched with Timer -->
    <g transform="translate(25, 42)">
      <rect width="190" height="80" rx="6" fill="#1E293B" stroke="${BORDER_CYAN}" stroke-width="1"/>
      <text x="12" y="20" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">1. Dispatched with Timer</text>
      <text x="12" y="38" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">MSG orders 202 {"item"}</text>
      <text x="12" y="56" fill="${BORDER_AMBER}" font-family="Arial" font-size="9" font-weight="bold">2.000s Deadline Armed</text>
      <text x="12" y="72" fill="${TEXT_MUTED}" font-family="Arial" font-size="8.5">time.AfterFunc(2*time.Second)</text>
    </g>

    <path d="M 220 82 L 260 82" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-red)"/>

    <!-- Step 2: Consumer Crash -->
    <g transform="translate(265, 42)">
      <rect width="200" height="80" rx="6" fill="#3D1217" stroke="${BORDER_RED}" stroke-width="1.5"/>
      <text x="12" y="20" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">⚡ Consumer VM Crashes</text>
      <text x="12" y="38" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5">OOM panic or host failover</text>
      <text x="12" y="56" fill="${TEXT_AMBER}" font-family="Arial" font-size="9">Socket breaks abruptly</text>
      <text x="12" y="72" fill="${TEXT_RED}" font-family="Arial" font-size="8.5">NO ACK emitted to broker</text>
    </g>

    <path d="M 470 82 L 510 82" stroke="${BORDER_AMBER}" stroke-width="2" marker-end="url(#arrow-amber)"/>

    <!-- Step 3: Timer Fires -->
    <g transform="translate(515, 42)">
      <rect width="210" height="80" rx="6" fill="#2E2012" stroke="${BORDER_AMBER}" stroke-width="1.5"/>
      <text x="12" y="20" fill="${TEXT_AMBER}" font-family="Arial" font-size="10.5" font-weight="bold">3. 2.0s Timer Fires</text>
      <text x="12" y="38" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5">pendingAcks detect missing ACK</text>
      <text x="12" y="56" fill="${BORDER_AMBER}" font-family="Arial" font-size="9">Selects healthy standby worker</text>
      <text x="12" y="72" fill="${TEXT_MUTED}" font-family="Arial" font-size="8.5">or waits for client reconnect</text>
    </g>

    <path d="M 730 82 L 770 82" stroke="${BORDER_PURPLE}" stroke-width="2" marker-end="url(#arrow-purple)"/>

    <!-- Step 4: Redelivery -->
    <g transform="translate(775, 42)">
      <rect width="230" height="80" rx="6" fill="#1C1838" stroke="${BORDER_PURPLE}" stroke-width="1.5"/>
      <text x="12" y="20" fill="#C4B5FD" font-family="Arial" font-size="10.5" font-weight="bold">4. Automatic Redelivery</text>
      <text x="12" y="38" fill="${TEXT_WHITE}" font-family="monospace" font-size="9.5">MSG orders 202 (Retry)</text>
      <text x="12" y="56" fill="${TEXT_EMERALD}" font-family="Arial" font-size="9" font-weight="bold">At-Least-Once Guarantee</text>
      <text x="12" y="72" fill="${TEXT_MUTED}" font-family="Arial" font-size="8.5">Client suppresses dupes idempotently</text>
    </g>
  </g>
</svg>`;
}

// =========================================================================
// SVG 7: Storage Compaction: Kafka Static Bloat vs PMB Active Truncation (Slide 7)
// =========================================================================
function generateSlide7SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" width="100%" height="100%">
  <defs>
    <marker id="arrow-down-red" viewBox="0 0 10 10" refX="5" refY="6" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 1 0 L 5 10 L 9 0 z" fill="${BORDER_RED}"/>
    </marker>
    <marker id="arrow-down-green" viewBox="0 0 10 10" refX="5" refY="6" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 1 0 L 5 10 L 9 0 z" fill="${BORDER_EMERALD}"/>
    </marker>
    <linearGradient id="compBad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#261219"/>
      <stop offset="100%" stop-color="#14090D"/>
    </linearGradient>
    <linearGradient id="compGood" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0F241C"/>
      <stop offset="100%" stop-color="#071410"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="360" fill="${BG}"/>

  <!-- LEFT: Kafka/Enterprise Static Retention -->
  <g transform="translate(20, 15)">
    <rect width="520" height="330" rx="10" fill="url(#compBad)" stroke="${BORDER_RED}" stroke-width="1.5"/>
    <rect x="15" y="12" width="360" height="24" rx="4" fill="#4A181D"/>
    <text x="25" y="28" fill="${TEXT_RED}" font-family="Arial" font-size="11.5" font-weight="bold">TRADITIONAL BROKERS: STATIC TIME RETENTION</text>

    <!-- Log Accumulation Stack -->
    <g transform="translate(25, 50)">
      <rect width="470" height="34" rx="4" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="22" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Day 1: Segment 0000000000.log</text>
      <text x="350" y="22" fill="${TEXT_MUTED}" font-family="monospace" font-size="10">500 MB RAM/Disk</text>

      <rect y="42" width="470" height="34" rx="4" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="64" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Day 2: Segment 0000000500.log</text>
      <text x="350" y="64" fill="${TEXT_MUTED}" font-family="monospace" font-size="10">500 MB RAM/Disk</text>

      <rect y="84" width="470" height="34" rx="4" fill="#1E293B" stroke="#475569" stroke-width="1"/>
      <text x="15" y="106" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Day 3: Segment 0000001000.log</text>
      <text x="350" y="106" fill="${TEXT_MUTED}" font-family="monospace" font-size="10">500 MB RAM/Disk</text>

      <rect y="126" width="470" height="34" rx="4" fill="#3D1217" stroke="${BORDER_RED}" stroke-width="1"/>
      <text x="15" y="148" fill="${TEXT_RED}" font-family="Arial" font-size="10.5" font-weight="bold">Day 7: Cumulative Static Accumulation</text>
      <text x="350" y="148" fill="${TEXT_RED}" font-family="monospace" font-size="10" font-weight="bold">3.5 GB Accumulation</text>
    </g>

    <!-- Arrow down to disaster -->
    <path d="M 260 215 L 260 230" stroke="${BORDER_RED}" stroke-width="2" marker-end="url(#arrow-down-red)"/>

    <!-- Failure Box -->
    <rect x="25" y="235" width="470" height="80" rx="6" fill="#450F15" stroke="${BORDER_RED}" stroke-width="1.5"/>
    <text x="40" y="258" fill="${TEXT_RED}" font-family="Arial" font-size="11" font-weight="bold">CRITICAL OUTCOME: /var ROOT PARTITION RUNS OUT</text>
    <text x="40" y="278" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5">Hypervisor hosts reserve limited root flash (e.g. 8-16 GB).</text>
    <text x="40" y="295" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">Retaining already-acknowledged messages triggers host read-only lockouts.</text>
  </g>

  <!-- RIGHT: PMB Active Compaction Engine -->
  <g transform="translate(560, 15)">
    <rect width="520" height="330" rx="10" fill="url(#compGood)" stroke="${BORDER_EMERALD}" stroke-width="1.5"/>
    <rect x="15" y="12" width="370" height="24" rx="4" fill="#0E382A"/>
    <text x="25" y="28" fill="${TEXT_EMERALD}" font-family="Arial" font-size="11.5" font-weight="bold">PMB ACTIVE RECLAMATION: ZERO STORAGE LEAKS</text>

    <!-- Compaction Steps -->
    <g transform="translate(25, 50)">
      <!-- Step 1 -->
      <rect width="470" height="48" rx="6" fill="#162E25" stroke="${BORDER_EMERALD}" stroke-width="1"/>
      <text x="15" y="22" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Step 1: Write to Append-Only Active WAL</text>
      <text x="15" y="38" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">Incoming events commit sequential NVMe blocks (&lt;topic&gt;.log)</text>

      <!-- Step 2 -->
      <rect y="56" width="470" height="48" rx="6" fill="#162E25" stroke="${BORDER_EMERALD}" stroke-width="1"/>
      <text x="15" y="78" fill="${TEXT_WHITE}" font-family="Arial" font-size="10.5" font-weight="bold">Step 2: Microsecond Subscriber ACK Trigger</text>
      <text x="15" y="94" fill="${BORDER_CYAN}" font-family="Arial" font-size="9.5">All registered subscribers confirm delivery; offset confirmed clean</text>

      <!-- Step 3 -->
      <rect y="112" width="470" height="48" rx="6" fill="#162E25" stroke="${BORDER_EMERALD}" stroke-width="1"/>
      <text x="15" y="134" fill="${TEXT_EMERALD}" font-family="Arial" font-size="10.5" font-weight="bold">Step 3: Instant OS Truncation to 0 Bytes</text>
      <text x="15" y="150" fill="${TEXT_WHITE}" font-family="monospace" font-size="9.5">os.Truncate(walPath, 0) via atomic rewrite</text>
    </g>

    <!-- Arrow down to success -->
    <path d="M 260 215 L 260 230" stroke="${BORDER_EMERALD}" stroke-width="2" marker-end="url(#arrow-down-green)"/>

    <!-- Outcome Box -->
    <rect x="25" y="235" width="470" height="80" rx="6" fill="#0B261D" stroke="${BORDER_EMERALD}" stroke-width="1.5"/>
    <text x="40" y="258" fill="${TEXT_EMERALD}" font-family="Arial" font-size="11" font-weight="bold">STEADY-STATE DISK FOOTPRINT: &lt; 100 MB INDEFINITELY</text>
    <text x="40" y="278" fill="${TEXT_WHITE}" font-family="Arial" font-size="9.5">No cron jobs, no background segment compaction stalls.</text>
    <text x="40" y="295" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">Physical disk blocks are reclaimed the exact microsecond work is done.</text>
  </g>
</svg>`;
}

// =========================================================================
// SVG 8: Zero-SDK Framed ASCII Wire Protocol (Slide 8)
// =========================================================================
function generateSlide8SVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 360" width="100%" height="100%">
  <defs>
    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#142138"/>
      <stop offset="100%" stop-color="#0C1524"/>
    </linearGradient>
  </defs>

  <rect width="1100" height="360" fill="${BG}"/>

  <rect x="20" y="15" width="1060" height="330" rx="10" fill="url(#wireGrad)" stroke="#233B61" stroke-width="1.5"/>
  <rect x="35" y="10" width="560" height="24" rx="4" fill="#182C4A" stroke="${BORDER_CYAN}" stroke-width="1"/>
  <text x="45" y="26" fill="${BORDER_CYAN}" font-family="Arial" font-size="11.5" font-weight="bold">ZERO-SDK POSIX PROTOCOL: WORKS OUT OF THE BOX WITH RAW SOCKETS</text>

  <!-- Left: Command Frame Format Table -->
  <g transform="translate(35, 45)">
    <rect width="500" height="275" rx="8" fill="#131F33" stroke="${BORDER_CYAN}" stroke-width="1"/>
    <text x="18" y="24" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">PROTOCOL FRAME SPECIFICATION (PORT :4222)</text>

    <!-- Command 1: PUB -->
    <g transform="translate(15, 38)">
      <rect width="470" height="48" rx="4" fill="#1E2D47"/>
      <rect x="8" y="8" width="55" height="20" rx="3" fill="#0284C7"/>
      <text x="20" y="22" fill="${TEXT_WHITE}" font-family="monospace" font-size="10" font-weight="bold">PUB</text>
      <text x="75" y="22" fill="${BORDER_CYAN}" font-family="monospace" font-size="10.5">&lt;topic&gt; &lt;raw_payload&gt;\\r\\n</text>
      <text x="75" y="38" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Publishes event to topic; creates WAL entry on disk.</text>
    </g>

    <!-- Command 2: SUB -->
    <g transform="translate(15, 94)">
      <rect width="470" height="48" rx="4" fill="#1E2D47"/>
      <rect x="8" y="8" width="55" height="20" rx="3" fill="#4F46E5"/>
      <text x="20" y="22" fill="${TEXT_WHITE}" font-family="monospace" font-size="10" font-weight="bold">SUB</text>
      <text x="75" y="22" fill="#C4B5FD" font-family="monospace" font-size="10.5">&lt;topic&gt;\\r\\n</text>
      <text x="75" y="38" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Registers socket stream for real-time dispatch.</text>
    </g>

    <!-- Command 3: MSG -->
    <g transform="translate(15, 150)">
      <rect width="470" height="48" rx="4" fill="#1E2D47"/>
      <rect x="8" y="8" width="55" height="20" rx="3" fill="#059669"/>
      <text x="18" y="22" fill="${TEXT_WHITE}" font-family="monospace" font-size="10" font-weight="bold">MSG</text>
      <text x="75" y="22" fill="${TEXT_EMERALD}" font-family="monospace" font-size="10.5">&lt;topic&gt; &lt;msgID&gt; &lt;payload&gt;\\r\\n</text>
      <text x="75" y="38" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Broker delivers message to subscriber with unique ID.</text>
    </g>

    <!-- Command 4: ACK -->
    <g transform="translate(15, 206)">
      <rect width="470" height="48" rx="4" fill="#1E2D47"/>
      <rect x="8" y="8" width="55" height="20" rx="3" fill="#D97706"/>
      <text x="18" y="22" fill="${TEXT_WHITE}" font-family="monospace" font-size="10" font-weight="bold">ACK</text>
      <text x="75" y="22" fill="${BORDER_AMBER}" font-family="monospace" font-size="10.5">&lt;topic&gt; &lt;msgID&gt;\\r\\n</text>
      <text x="75" y="38" fill="${TEXT_MUTED}" font-family="Arial" font-size="9">Acknowledges receipt; deletes from pendingAcks map.</text>
    </g>
  </g>

  <!-- Right: Zero-SDK Client Integration Examples -->
  <g transform="translate(560, 45)">
    <rect width="500" height="275" rx="8" fill="#131F33" stroke="${BORDER_EMERALD}" stroke-width="1"/>
    <text x="18" y="24" fill="${TEXT_WHITE}" font-family="Arial" font-size="11" font-weight="bold">CONNECT FROM ANY TOOL WITHOUT INSTALLING PACKAGES</text>

    <!-- Bash / Netcat -->
    <g transform="translate(15, 38)">
      <rect width="470" height="60" rx="4" fill="#0D1624" stroke="#1E2E47" stroke-width="1"/>
      <text x="12" y="20" fill="${BORDER_CYAN}" font-family="Arial" font-size="10" font-weight="bold">Bash / Netcat (Single-line publish):</text>
      <text x="12" y="42" fill="${TEXT_WHITE}" font-family="monospace" font-size="10">echo "PUB telemetry {\\"temp\\":22}" | nc host 4222</text>
    </g>

    <!-- Python standard socket -->
    <g transform="translate(15, 108)">
      <rect width="470" height="85" rx="4" fill="#0D1624" stroke="#1E2E47" stroke-width="1"/>
      <text x="12" y="20" fill="${BORDER_EMERALD}" font-family="Arial" font-size="10" font-weight="bold">Python (Standard library socket - No pip dependencies):</text>
      <text x="12" y="40" fill="${TEXT_MUTED}" font-family="monospace" font-size="9.5">import socket</text>
      <text x="12" y="56" fill="${TEXT_WHITE}" font-family="monospace" font-size="9.5">s = socket.create_connection(('127.0.0.1', 4222))</text>
      <text x="12" y="72" fill="${TEXT_WHITE}" font-family="monospace" font-size="9.5">s.sendall(b"SUB telemetry\\r\\n")</text>
    </g>

    <!-- C / Rust / Embedded -->
    <g transform="translate(15, 203)">
      <rect width="470" height="55" rx="4" fill="#0D1624" stroke="#1E2E47" stroke-width="1"/>
      <text x="12" y="20" fill="${BORDER_PURPLE}" font-family="Arial" font-size="10" font-weight="bold">C / Rust / Go / Microcontrollers:</text>
      <text x="12" y="40" fill="${TEXT_MUTED}" font-family="Arial" font-size="9.5">Plain POSIX write() &amp; read(). No Kafka .jar, no librdkafka C bindings!</text>
    </g>
  </g>
</svg>`;
}

// Generate all SVGs to docs/
const docsDir = path.resolve(__dirname, '../../docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(path.join(docsDir, 'slide1_topology.svg'), generateSlide1SVG());
fs.writeFileSync(path.join(docsDir, 'slide2_problem.svg'), generateSlide2SVG());
fs.writeFileSync(path.join(docsDir, 'slide3_solution.svg'), generateSlide3SVG());
fs.writeFileSync(path.join(docsDir, 'slide4_atomic_stack.svg'), generateSlide4SVG());
fs.writeFileSync(path.join(docsDir, 'slide5_group_commit.svg'), generateSlide5SVG());
fs.writeFileSync(path.join(docsDir, 'slide6_router_delivery.svg'), generateSlide6SVG());
fs.writeFileSync(path.join(docsDir, 'slide7_compaction.svg'), generateSlide7SVG());
fs.writeFileSync(path.join(docsDir, 'slide8_wire_protocol.svg'), generateSlide8SVG());

console.log('Successfully generated slide1 to slide8 custom SVGs in docs/');
