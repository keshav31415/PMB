package storage

import (
	"fmt"
	"testing"
)

// BUG 1: writeLine doesn't clean up the stale handle on write error.
// We simulate a broken fd by closing it from underneath the WAL.
// After the first failure, every subsequent write to that topic also fails
// because the dead handle stays in w.files.
func TestBug1_BrokenHandleNotCleared(t *testing.T) {
	defer setup(t)()
	w := New()

	if err := w.Append("topic", "1", "payload"); err != nil {
		t.Fatal(err)
	}

	// Close the fd externally — simulates what happens after a real disk error
	w.mu.Lock()
	if f, ok := w.files["topic"]; ok {
		f.Close()
	}
	w.mu.Unlock()

	// First write will fail (bad fd) — that's expected
	err := w.Append("topic", "2", "payload2")
	if err == nil {
		// On some platforms the write might succeed even on a closed fd.
		// In that case the test is environment-dependent; just log and skip.
		t.Log("write to closed fd succeeded on this platform; bug not triggered")
		return
	}

	// The bug: broken handle is still in w.files, so the NEXT write also fails
	err2 := w.Append("topic", "3", "payload3")
	if err2 != nil {
		t.Logf("BUG CONFIRMED: error1=%v  error2=%v", err, err2)
		t.Log("Broken handle left in w.files — all future writes on this topic fail permanently.")
		t.Fail()
	}
}

// BUG 2: GC closes the write handle even when nothing is pruned (pruned==0).
// An active topic with no ACKed messages still loses its open handle,
// forcing a reopen on the next write — defeating the whole optimisation.
func TestBug2_GCClosesHandleEvenWhenNothingPruned(t *testing.T) {
	defer setup(t)()
	w := New()

	w.Append("stream", "1", "data")

	// Grab handle pointer before GC
	w.mu.Lock()
	before := w.files["stream"]
	w.mu.Unlock()

	if before == nil {
		t.Fatal("expected an open handle before GC")
	}

	pruned, err := w.GC("stream") // nothing is acked → should prune nothing
	if err != nil {
		t.Fatal(err)
	}
	if pruned != 0 {
		t.Fatalf("expected 0 pruned, got %d", pruned)
	}

	w.mu.Lock()
	after := w.files["stream"]
	w.mu.Unlock()

	if after == nil {
		fmt.Println("BUG CONFIRMED: GC closed the write handle even though pruned=0.")
		fmt.Println("The next write will reopen the file, wasting the optimisation benefit.")
		t.Fail()
	}
}
