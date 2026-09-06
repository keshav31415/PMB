package storage

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"
	"unsafe"
)

const logDir = "logs"

type Msg struct {
	ID      string
	Topic   string
	Payload string
	Ts      float64
}

type writeNode struct {
	line  string
	errCh chan error
	next  *writeNode
}

type commitGroup struct {
	head     unsafe.Pointer // *writeNode (atomic Treiber stack)
	flushing int32          // 1 if active leader flusher, 0 otherwise
}

type WAL struct {
	mu     sync.Mutex
	locks  map[string]*sync.Mutex
	groups map[string]*commitGroup
	files  map[string]*os.File
}

func New() *WAL {
	os.MkdirAll(logDir, 0755)
	return &WAL{
		locks:  make(map[string]*sync.Mutex),
		groups: make(map[string]*commitGroup),
		files:  make(map[string]*os.File),
	}
}

func (w *WAL) getLock(topic string) *sync.Mutex {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.locks[topic] == nil {
		w.locks[topic] = &sync.Mutex{}
	}
	return w.locks[topic]
}

func (w *WAL) getGroup(topic string) *commitGroup {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.groups[topic] == nil {
		w.groups[topic] = &commitGroup{}
	}
	return w.groups[topic]
}

func logPath(topic string) string {
	safe := strings.NewReplacer("/", "_", ".", "_").Replace(topic)
	return filepath.Join(logDir, safe+".log")
}

func (w *WAL) Append(topic, msgID, payload string) error {
	ts := strconv.FormatFloat(float64(time.Now().UnixNano())/1e9, 'f', 6, 64)

	// Escape both | and \n so any payload survives our line-based format.
	// Bug fix: without \n escaping, a payload with a newline silently
	// corrupts the log — Recover reads it as two separate broken records.
	escaped := strings.ReplaceAll(payload, "|", "\\|")
	escaped = strings.ReplaceAll(escaped, "\n", "\\n")

	line := "W|" + msgID + "|" + ts + "|" + topic + "|" + escaped + "\n"
	return w.writeLine(topic, line)
}

func (w *WAL) MarkAcked(topic, msgID string) error {
	ts := strconv.FormatFloat(float64(time.Now().UnixNano())/1e9, 'f', 6, 64)
	line := "A|" + msgID + "|" + topic + "|" + ts + "\n"
	return w.writeLine(topic, line)
}

func (w *WAL) writeLine(topic, line string) error {
	grp := w.getGroup(topic)
	node := &writeNode{
		line:  line,
		errCh: make(chan error, 1),
	}

	// 1. Lock-free Treiber stack push using atomic CAS (Wait-Free Ingress)
	for {
		oldHead := atomic.LoadPointer(&grp.head)
		node.next = (*writeNode)(oldHead)
		if atomic.CompareAndSwapPointer(&grp.head, oldHead, unsafe.Pointer(node)) {
			break
		}
	}

	// 2. Lock-free leader election: only one goroutine acts as flusher leader
	if !atomic.CompareAndSwapInt32(&grp.flushing, 0, 1) {
		// Follower waits on its dedicated channel
		return <-node.errCh
	}

	// 3. Leader loop: steals entire accumulated queue and writes in epoch batches
	for {
		headPtr := atomic.SwapPointer(&grp.head, nil)
		if headPtr == nil {
			atomic.StoreInt32(&grp.flushing, 0)
			// Close potential race window between Swap and Store
			if atomic.LoadPointer(&grp.head) != nil && atomic.CompareAndSwapInt32(&grp.flushing, 0, 1) {
				continue
			}
			break
		}

		var batchLines []string
		var batchChans []chan error
		curr := (*writeNode)(headPtr)
		for curr != nil {
			batchLines = append(batchLines, curr.line)
			batchChans = append(batchChans, curr.errCh)
			curr = curr.next
		}

		// Reverse linked-list to maintain strict FIFO arrival order
		for i, j := 0, len(batchLines)-1; i < j; i, j = i+1, j-1 {
			batchLines[i], batchLines[j] = batchLines[j], batchLines[i]
			batchChans[i], batchChans[j] = batchChans[j], batchChans[i]
		}

		err := w.flushBatch(topic, batchLines)
		for _, ch := range batchChans {
			ch <- err
		}
	}

	return <-node.errCh
}

func (w *WAL) flushBatch(topic string, lines []string) error {
	lk := w.getLock(topic)
	lk.Lock()
	defer lk.Unlock()

	w.mu.Lock()
	f, ok := w.files[topic]
	if !ok {
		var err error
		f, err = os.OpenFile(logPath(topic), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			w.mu.Unlock()
			return fmt.Errorf("wal open %s: %w", topic, err)
		}
		w.files[topic] = f
	}
	w.mu.Unlock()

	for _, l := range lines {
		if _, err := f.WriteString(l); err != nil {
			// Evict the broken handle so the next call reopens a fresh fd.
			w.mu.Lock()
			delete(w.files, topic)
			w.mu.Unlock()
			return fmt.Errorf("wal write %s: %w", topic, err)
		}
	}

	// Forces the OS to physically flush data to disk before returning.
	if err := f.Sync(); err != nil {
		w.mu.Lock()
		delete(w.files, topic)
		w.mu.Unlock()
		return fmt.Errorf("wal sync %s: %w", topic, err)
	}

	return nil
}

func (w *WAL) Recover(topic string) ([]Msg, error) {
	path := logPath(topic)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, nil
	}

	lk := w.getLock(topic)
	lk.Lock()
	defer lk.Unlock()

	w.mu.Lock()
	if f, ok := w.files[topic]; ok {
		f.Close()
		delete(w.files, topic)
	}
	w.mu.Unlock()

	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	written := map[string]Msg{}
	acked := map[string]bool{}

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 5)
		if len(parts) < 2 {
			continue
		}
		switch parts[0] {
		case "W":
			if len(parts) < 5 {
				continue
			}
			ts, _ := strconv.ParseFloat(parts[2], 64)
			// Unescape symmetrically — must match the escaping in Append.
			payload := strings.ReplaceAll(parts[4], "\\|", "|")
			payload = strings.ReplaceAll(payload, "\\n", "\n")

			// Reconstruct payload if deduplicated via @ref during compaction
			if strings.HasPrefix(payload, "@ref:") {
				refID := strings.TrimPrefix(payload, "@ref:")
				if refMsg, ok := written[refID]; ok {
					payload = refMsg.Payload
				}
			}

			written[parts[1]] = Msg{
				ID:      parts[1],
				Topic:   parts[3],
				Payload: payload,
				Ts:      ts,
			}
		case "A":
			acked[parts[1]] = true
		}
	}

	if err = sc.Err(); err != nil {
		fmt.Printf("[storage] partial read on '%s': %v\n", topic, err)
	}

	var out []Msg
	for id, m := range written {
		if !acked[id] {
			out = append(out, m)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

func (w *WAL) RecoverAll() (map[string][]Msg, error) {
	os.MkdirAll(logDir, 0755)
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return nil, fmt.Errorf("read logdir: %w", err)
	}
	result := map[string][]Msg{}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".log") {
			continue
		}
		topic := strings.TrimSuffix(e.Name(), ".log")
		msgs, err := w.Recover(topic)
		if err != nil {
			fmt.Printf("[storage] recover error '%s': %v\n", topic, err)
			continue
		}
		if len(msgs) > 0 {
			result[topic] = msgs
		}
	}
	return result, nil
}

// GC rewrites a topic log keeping only unacked W records (ACK-based retention).
// Only closes the write handle when it actually has to replace the file.
func (w *WAL) GC(topic string) (int, error) {
	path := logPath(topic)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return 0, nil
	}

	lk := w.getLock(topic)
	lk.Lock()
	defer lk.Unlock()

	// Read first — don't touch the write handle unless compaction is needed.
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}

	rawLines := map[string]string{}
	acked := map[string]bool{}

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		raw := sc.Text()
		parts := strings.SplitN(raw, "|", 3)
		if len(parts) < 2 {
			continue
		}
		switch parts[0] {
		case "W":
			rawLines[parts[1]] = raw + "\n"
		case "A":
			acked[parts[1]] = true
		}
	}
	f.Close()

	pruned := 0
	var keep []string
	for id := range rawLines {
		if acked[id] {
			pruned++
		} else {
			keep = append(keep, id)
		}
	}

	if pruned == 0 {
		return 0, nil
	}

	return w.compact(topic, path, func(id string) bool {
		return !acked[id] // keep only unacked
	}, rawLines)
}

// GCByAge prunes W records older than maxAge regardless of ack status.
// This handles AT_MOST_ONCE topics (no ACKs) and dead subscribers that
// will never ACK, preventing unbounded log growth.
//
// It also drops the corresponding A records for pruned messages so they
// don't accumulate as orphans. A-records for kept messages are preserved
// so a subsequent GC() call can still clean them up normally.
func (w *WAL) GCByAge(topic string, maxAge time.Duration) (int, error) {
	path := logPath(topic)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return 0, nil
	}

	lk := w.getLock(topic)
	lk.Lock()
	defer lk.Unlock()

	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}

	cutoff := float64(time.Now().Add(-maxAge).UnixNano()) / 1e9

	type wRec struct {
		raw string
		ts  float64
	}
	wRecords := map[string]wRec{}
	aRecords := map[string]string{} // msgID -> raw line

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		raw := sc.Text()
		parts := strings.SplitN(raw, "|", 5)
		if len(parts) < 2 {
			continue
		}
		switch parts[0] {
		case "W":
			if len(parts) < 5 {
				continue
			}
			ts, _ := strconv.ParseFloat(parts[2], 64)
			wRecords[parts[1]] = wRec{raw: raw + "\n", ts: ts}
		case "A":
			aRecords[parts[1]] = raw + "\n"
		}
	}
	f.Close()

	pruned := 0
	var keepLines []string
	for id, rec := range wRecords {
		if rec.ts < cutoff {
			// Drop this W record — also drop its A record so it doesn't
			// accumulate as a dangling orphan that GC() can never clean.
			pruned++
		} else {
			keepLines = append(keepLines, rec.raw)
			// Preserve the A record so a follow-up GC() run can prune it.
			if aLine, ok := aRecords[id]; ok {
				keepLines = append(keepLines, aLine)
			}
		}
	}

	if pruned == 0 {
		return 0, nil
	}

	sort.Strings(keepLines) // stable ordering for deterministic output
	compressedLines := deduplicateLines(keepLines)
	return w.replaceLog(topic, path, compressedLines)
}

// deduplicateLines performs payload delta-referencing during GC compaction.
// If identical or repetitive payloads appear within the compaction window,
// it stores a lightweight @ref:<msgID> pointer, saving flash storage and write cycles.
func deduplicateLines(lines []string) []string {
	seen := map[string]string{}
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		if !strings.HasPrefix(l, "W|") {
			out = append(out, l)
			continue
		}
		parts := strings.SplitN(strings.TrimRight(l, "\r\n"), "|", 5)
		if len(parts) < 5 {
			out = append(out, l)
			continue
		}
		msgID := parts[1]
		ts := parts[2]
		topic := parts[3]
		payload := parts[4]

		if refID, exists := seen[payload]; exists && len(payload) > 12 {
			out = append(out, fmt.Sprintf("W|%s|%s|%s|@ref:%s\n", msgID, ts, topic, refID))
		} else {
			seen[payload] = msgID
			out = append(out, l)
		}
	}
	return out
}

// compact is the shared helper for GC: closes the write handle, writes a
// filtered log to a tmp file, and atomically renames it into place.
func (w *WAL) compact(topic, path string, keep func(id string) bool, rawLines map[string]string) (int, error) {
	var keepList []string
	pruned := 0
	for id, raw := range rawLines {
		if keep(id) {
			keepList = append(keepList, raw)
		} else {
			pruned++
		}
	}
	sort.Strings(keepList)
	compressedList := deduplicateLines(keepList)
	return pruned, w.doReplaceLog(topic, path, compressedList)
}

func (w *WAL) replaceLog(topic, path string, lines []string) (int, error) {
	return len(lines), w.doReplaceLog(topic, path, lines)
}

// doReplaceLog closes the write handle, writes lines to a .tmp file,
// and atomically renames it to path. Power-failure safe.
func (w *WAL) doReplaceLog(topic, path string, lines []string) error {
	// Close and evict the write handle before replacing the file on disk.
	w.mu.Lock()
	if wf, ok := w.files[topic]; ok {
		wf.Close()
		delete(w.files, topic)
	}
	w.mu.Unlock()

	tmp := path + ".tmp"
	out, err := os.OpenFile(tmp, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("gc tmp open: %w", err)
	}

	bw := bufio.NewWriter(out)
	for _, l := range lines {
		bw.WriteString(l)
	}
	bw.Flush()
	out.Sync()
	out.Close()

	if err = os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return fmt.Errorf("gc rename: %w", err)
	}
	return nil
}

// GCDaemon runs both GC (ACK-based) and GCByAge (time-based) in the background.
// This satisfies the project spec: "duration or capability" retention.
type GCDaemon struct {
	wal      *WAL
	interval time.Duration
	maxAge   time.Duration
	stop     chan struct{}
}

func NewGCDaemon(wal *WAL, interval, maxAge time.Duration) *GCDaemon {
	return &GCDaemon{
		wal:      wal,
		interval: interval,
		maxAge:   maxAge,
		stop:     make(chan struct{}),
	}
}

func (g *GCDaemon) Start() { go g.run() }
func (g *GCDaemon) Stop()  { close(g.stop) }

func (g *GCDaemon) run() {
	tk := time.NewTicker(g.interval)
	defer tk.Stop()
	for {
		select {
		case <-g.stop:
			return
		case <-tk.C:
			g.sweep()
		}
	}
}

func (g *GCDaemon) sweep() {
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".log") {
			continue
		}
		topic := strings.TrimSuffix(e.Name(), ".log")

		if n, err := g.wal.GC(topic); err != nil {
			fmt.Printf("[gc] ack-prune error on '%s': %v\n", topic, err)
		} else if n > 0 {
			fmt.Printf("[gc] '%s': ack-pruned %d records\n", topic, n)
		}

		if n, err := g.wal.GCByAge(topic, g.maxAge); err != nil {
			fmt.Printf("[gc] age-prune error on '%s': %v\n", topic, err)
		} else if n > 0 {
			fmt.Printf("[gc] '%s': age-pruned %d records older than %v\n", topic, n, g.maxAge)
		}
	}
}
