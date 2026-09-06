package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func setup(t *testing.T) func() {
	t.Helper()
	orig, _ := os.Getwd()
	dir, err := os.MkdirTemp("", "wal-*")
	if err != nil {
		t.Fatal(err)
	}
	os.Chdir(dir)
	return func() {
		os.Chdir(orig)
		os.RemoveAll(dir)
	}
}

func TestAppendAndRecover(t *testing.T) {
	defer setup(t)()
	w := New()

	w.Append("orders", "1", `{"item":"book"}`)
	w.Append("orders", "2", `{"item":"pen"}`)

	msgs, err := w.Recover("orders")
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 2 {
		t.Fatalf("want 2 msgs, got %d", len(msgs))
	}
	if msgs[0].ID != "1" || msgs[1].ID != "2" {
		t.Fatalf("wrong IDs: %+v", msgs)
	}
}

func TestMarkAckedFiltersOnRecover(t *testing.T) {
	defer setup(t)()
	w := New()

	w.Append("payments", "10", "pay1")
	w.Append("payments", "11", "pay2")
	w.Append("payments", "12", "pay3")
	w.MarkAcked("payments", "11")

	msgs, _ := w.Recover("payments")
	if len(msgs) != 2 {
		t.Fatalf("want 2 pending, got %d", len(msgs))
	}
	for _, m := range msgs {
		if m.ID == "11" {
			t.Fatal("acked msg 11 showed up in recovery")
		}
	}
}

func TestCrashRecovery(t *testing.T) {
	defer setup(t)()
	w := New()

	for i := 1; i <= 5; i++ {
		w.Append("topic_a", fmt.Sprintf("%d", i), fmt.Sprintf("p%d", i))
		w.Append("topic_b", fmt.Sprintf("%d", i), fmt.Sprintf("p%d", i))
	}
	w.MarkAcked("topic_a", "2")
	w.MarkAcked("topic_b", "4")
	w.MarkAcked("topic_b", "5")

	w2 := New()
	result, err := w2.RecoverAll()
	if err != nil {
		t.Fatal(err)
	}

	if len(result["topic_a"]) != 4 {
		t.Errorf("topic_a: want 4 pending, got %d", len(result["topic_a"]))
	}
	if len(result["topic_b"]) != 3 {
		t.Errorf("topic_b: want 3 pending, got %d", len(result["topic_b"]))
	}
}

func TestGCPrunesAckedRecords(t *testing.T) {
	defer setup(t)()
	w := New()

	for i := 1; i <= 10; i++ {
		w.Append("stream", fmt.Sprintf("%d", i), "data")
	}
	for i := 1; i <= 7; i++ {
		w.MarkAcked("stream", fmt.Sprintf("%d", i))
	}

	before := fileSize(t, "stream")
	pruned, err := w.GC("stream")
	if err != nil {
		t.Fatal(err)
	}
	if pruned != 7 {
		t.Errorf("want 7 pruned, got %d", pruned)
	}
	if fileSize(t, "stream") >= before {
		t.Error("file should shrink after GC")
	}

	msgs, _ := w.Recover("stream")
	if len(msgs) != 3 {
		t.Errorf("want 3 msgs after GC, got %d", len(msgs))
	}
}

func TestConcurrentAppends(t *testing.T) {
	defer setup(t)()
	w := New()

	done := make(chan struct{}, 20)
	for i := 0; i < 20; i++ {
		go func(id int) {
			w.Append("concurrent", fmt.Sprintf("%d", id), fmt.Sprintf("p%d", id))
			done <- struct{}{}
		}(i)
	}
	for i := 0; i < 20; i++ {
		<-done
	}

	msgs, err := w.Recover("concurrent")
	if err != nil {
		t.Fatal(err)
	}
	if len(msgs) != 20 {
		t.Errorf("want 20 msgs after concurrent writes, got %d", len(msgs))
	}
}

func TestPayloadWithPipes(t *testing.T) {
	defer setup(t)()
	w := New()

	orig := `{"key":"a|b|c","val":"|pipe|"}`
	w.Append("edge", "99", orig)

	msgs, _ := w.Recover("edge")
	if len(msgs) != 1 {
		t.Fatal("want 1 msg")
	}
	if msgs[0].Payload != orig {
		t.Errorf("payload roundtrip failed\ngot:  %s\nwant: %s", msgs[0].Payload, orig)
	}
}

// New: payload containing literal newlines (pretty-printed JSON, multiline text).
// This was the first bug from the reviewer — without \n escaping, Recover
// would read the second line as a separate (corrupt) record and lose data.
func TestPayloadWithNewlines(t *testing.T) {
	defer setup(t)()
	w := New()

	orig := "{\n  \"key\": \"value\",\n  \"foo\": \"bar\"\n}"
	w.Append("edge", "100", orig)

	msgs, _ := w.Recover("edge")
	if len(msgs) != 1 {
		t.Fatalf("want 1 msg, got %d — newline in payload broke the record", len(msgs))
	}
	if msgs[0].Payload != orig {
		t.Errorf("newline payload roundtrip failed\ngot:  %q\nwant: %q", msgs[0].Payload, orig)
	}
}

// GCByAge prunes records older than maxAge regardless of ACK status.
// Critical for AT_MOST_ONCE topics where no ACKs ever arrive.
func TestGCByAge_PrunesOldRecords(t *testing.T) {
	defer setup(t)()
	w := New()

	w.Append("feed", "old1", "stale data")
	w.Append("feed", "old2", "stale data")

	// Make the timestamps look old by back-dating the log entries
	// (we test the age logic by using a very small maxAge)
	time.Sleep(20 * time.Millisecond)

	// These two arrive "now"
	w.Append("feed", "new1", "fresh data")
	w.Append("feed", "new2", "fresh data")

	// Prune anything older than 10ms — that should be old1+old2
	pruned, err := w.GCByAge("feed", 10*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	if pruned != 2 {
		t.Errorf("want 2 pruned, got %d", pruned)
	}

	msgs, _ := w.Recover("feed")
	if len(msgs) != 2 {
		t.Errorf("want 2 msgs surviving, got %d", len(msgs))
	}
	for _, m := range msgs {
		if m.ID == "old1" || m.ID == "old2" {
			t.Errorf("old record %s survived age-GC", m.ID)
		}
	}
}

// GCByAge should also drop the A records for pruned messages so they
// don't accumulate as orphans that GC() can never clean.
func TestGCByAge_DropsOrphanAckRecords(t *testing.T) {
	defer setup(t)()
	w := New()

	w.Append("q", "1", "data")
	w.MarkAcked("q", "1")

	time.Sleep(20 * time.Millisecond)
	w.Append("q", "2", "data")

	// Age-prune msg1 (and its A record)
	pruned, err := w.GCByAge("q", 10*time.Millisecond)
	if err != nil {
		t.Fatal(err)
	}
	if pruned != 1 {
		t.Errorf("want 1 pruned, got %d", pruned)
	}

	// msg2 should still be there
	msgs, _ := w.Recover("q")
	if len(msgs) != 1 || msgs[0].ID != "2" {
		t.Errorf("wrong msgs after age-prune: %+v", msgs)
	}

	// Running GC now should prune nothing (no acked W records left)
	gcPruned, _ := w.GC("q")
	if gcPruned != 0 {
		t.Errorf("GC should find nothing after GCByAge cleaned up orphan A records, got %d", gcPruned)
	}
}

func fileSize(t *testing.T, topic string) int64 {
	t.Helper()
	info, err := os.Stat(filepath.Join(logDir, topic+".log"))
	if err != nil {
		t.Fatal(err)
	}
	return info.Size()
}

func TestGroupCommit_ConcurrentScale(t *testing.T) {
	defer setup(t)()
	w := New()

	const workers = 50
	const msgsPerWorker = 20
	const totalMsgs = workers * msgsPerWorker

	var wg sync.WaitGroup
	errCh := make(chan error, totalMsgs)

	start := time.Now()
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(wID int) {
			defer wg.Done()
			for j := 0; j < msgsPerWorker; j++ {
				id := fmt.Sprintf("w%d_m%d", wID, j)
				if err := w.Append("scale_topic", id, "payload"); err != nil {
					errCh <- err
					return
				}
			}
		}(i)
	}
	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Fatalf("concurrent append error: %v", err)
	}

	t.Logf("Group Commit wrote %d durable msgs in %v", totalMsgs, time.Since(start))

	recovered, err := w.Recover("scale_topic")
	if err != nil {
		t.Fatalf("recover error: %v", err)
	}
	if len(recovered) != totalMsgs {
		t.Fatalf("expected %d recovered messages, got %d", totalMsgs, len(recovered))
	}
}

func TestGC_DeltaDeduplication(t *testing.T) {
	defer setup(t)()
	w := New()

	const repeatedPayload = `{"service":"nutanix-acropolis","status":"healthy","cluster_id":"c-9821"}`

	// Write 5 messages: 3 identical repeated telemetry payloads, 2 unique
	w.Append("telemetry", "1", repeatedPayload)
	w.Append("telemetry", "2", repeatedPayload)
	w.Append("telemetry", "3", repeatedPayload)
	w.Append("telemetry", "4", "unique_payload_alpha")
	w.Append("telemetry", "5", "unique_payload_beta")

	// ACK message 5 so GC triggers compaction
	w.MarkAcked("telemetry", "5")

	pruned, err := w.GC("telemetry")
	if err != nil {
		t.Fatalf("gc error: %v", err)
	}
	if pruned != 1 {
		t.Fatalf("expected 1 pruned, got %d", pruned)
	}

	// Verify all 4 remaining messages recover with full original payloads
	recovered, err := w.Recover("telemetry")
	if err != nil {
		t.Fatalf("recover error: %v", err)
	}
	if len(recovered) != 4 {
		t.Fatalf("expected 4 recovered messages, got %d", len(recovered))
	}

	for _, m := range recovered {
		if m.ID == "1" || m.ID == "2" || m.ID == "3" {
			if m.Payload != repeatedPayload {
				t.Fatalf("msg %s payload mismatch: got %q, want %q", m.ID, m.Payload, repeatedPayload)
			}
		}
	}

	// Verify the log file on disk actually contains @ref:1
	rawLog, _ := os.ReadFile(logPath("telemetry"))
	if !strings.Contains(string(rawLog), "@ref:1") {
		t.Fatalf("expected log file to contain @ref:1 deduplication reference, got:\n%s", string(rawLog))
	}
	t.Logf("Compacted log with Delta Deduplication:\n%s", string(rawLog))
}
