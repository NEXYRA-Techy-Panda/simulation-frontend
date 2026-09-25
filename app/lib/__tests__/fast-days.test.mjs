// K004-FAST1 fast-days adapter checks (Agent M-C — Claude Code). Run: npm test.
// Fixtures mirror the backend branch mohan/k005-history-prep responses; tests only.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkDays,
  createHistoryJob,
  fetchFastState,
  historyJobBody,
  isTerminal,
  parseFastState,
  parseHistoryJob,
  resetWithRecording,
  startAdvance,
  stopAdvance,
} from "../fast-days.ts";
import { SimApiError } from "../sim-state.ts";

const ADVANCING = {
  data: {
    status: "running", run_id: "run-1", sim_time_utc: "2025-12-31T18:50:00Z", recording_interval_seconds: 3600,
    advance: {
      active: true, requested_days: 1, start_sim_utc: "2025-12-31T18:30:00Z", target_sim_utc: "2026-01-01T18:30:00Z",
      processed_steps: 120, expected_steps: 8640, fraction: 120 / 8640, last: null,
    },
  },
  meta: { request_id: "r" },
};

function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    return { ok: next.status < 400, status: next.status, json: async () => next.body };
  };
  return { fn, calls };
}

describe("advance days", () => {
  it("accepts whole days 1..31 only (30 days is a duration, not a month)", () => {
    assert.equal(checkDays(1), 1);
    assert.equal(checkDays("30"), 30);
    assert.equal(checkDays(31), 31);
    for (const bad of [0, 32, 1.5, "7.5", "", "-1", null]) assert.equal(checkDays(bad), null, String(bad));
  });

  it("parses processed progress and keeps the target separate from processed time", () => {
    const s = parseFastState(ADVANCING);
    assert.equal(s.sim_time_utc, "2025-12-31T18:50:00Z");
    assert.equal(s.advance.active, true);
    assert.equal(s.advance.current.target_sim_utc, "2026-01-01T18:30:00Z");
    assert.equal(s.advance.current.processed_steps, 120);
    assert.equal(s.recording_interval_seconds, 3600);
    assert.equal(s.supported, true);
  });

  it("marks a backend without advance support as unsupported and rejects a malformed active advance", () => {
    const old = parseFastState({ data: { status: "paused", run_id: "run-1", sim_time_utc: "2025-12-31T18:30:00Z" } });
    assert.equal(old.supported, false);
    assert.equal(old.advance, null);
    assert.equal(parseFastState({ data: { ...ADVANCING.data, advance: { active: true } } }), null);
    const last = parseFastState({ data: { ...ADVANCING.data, status: "paused", advance: { active: false, last: { ...ADVANCING.data.advance, outcome: "completed", end_sim_utc: "2026-01-01T18:30:00Z" } } } });
    assert.equal(last.advance.last.outcome, "completed");
  });

  it("posts the documented bodies and surfaces backend errors", async () => {
    const f = fakeFetch([
      { status: 200, body: { data: { run_id: "run-1", seq: 3, sim_time_utc: "2025-12-31T18:30:00Z", status: "running", speed: 1 } } },
      { status: 200, body: { data: { run_id: "run-1", seq: 4, sim_time_utc: "2025-12-31T18:50:00Z", status: "paused", speed: 1 } } },
      { status: 200, body: { data: { run_id: "run-2", seq: 0, sim_time_utc: "2025-12-31T18:30:00Z", status: "paused", speed: 1 } } },
      { status: 409, body: { error: { code: "CONFLICT", message: "The clock is running; pause it before advancing (one runner per run)" } } },
    ]);
    await startAdvance("http://x", 7, f.fn);
    await stopAdvance("http://x", f.fn);
    await resetWithRecording("http://x", 3600, f.fn);
    assert.deepEqual(f.calls.map((c) => [c.url, c.init.body]), [
      ["http://x/api/v1/control/advance", '{"days":7}'],
      ["http://x/api/v1/control/advance/stop", "{}"],
      ["http://x/api/v1/control/reset", '{"interval_seconds":3600}'],
    ]);
    await assert.rejects(startAdvance("http://x", 1, f.fn), (e) => e instanceof SimApiError && e.status === 409 && /pause it/.test(e.message));
    await assert.rejects(startAdvance("http://x", 40, f.fn), (e) => e instanceof SimApiError && e.field === "days");
  });

  it("fetches state through GET /api/v1/state", async () => {
    const f = fakeFetch([{ status: 200, body: ADVANCING }]);
    const s = await fetchFastState("http://x", f.fn);
    assert.equal(f.calls[0].url, "http://x/api/v1/state");
    assert.equal(s.advance.current.expected_steps, 8640);
  });
});

describe("history generation (separate run)", () => {
  const JOB = {
    data: {
      job_id: "hist-1", status: "running", result_ref: null, run_id: "run-h",
      requested: { from_utc: "2025-12-31T18:30:00Z", to_utc: "2026-01-31T18:30:00Z", interval_seconds: 3600, month: "2026-01" },
      progress: { committed_through_utc: "2026-01-02T18:30:00Z", completed_steps: 17280, expected_steps: 267840, completed_intervals: 48, expected_intervals: 744, fraction: 48 / 744 },
      coverage: { complete: false, from_utc: "2025-12-31T18:30:00Z", to_utc: "2026-01-02T18:30:00Z" },
      failure: null, synthetic: true,
    },
  };

  it("builds a month job body and validates seed", () => {
    assert.deepEqual(historyJobBody("2026-01", 3600, ""), { month: "2026-01", interval_seconds: 3600 });
    assert.deepEqual(historyJobBody("2026-02", 60, "42"), { month: "2026-02", interval_seconds: 60, seed: 42 });
    assert.equal(typeof historyJobBody("2026-13", 3600), "string");
    assert.equal(typeof historyJobBody("2026-01", 3600, "1.5"), "string");
  });

  it("parses progress honestly; only a verified success is complete", () => {
    const running = parseHistoryJob(JOB);
    assert.deepEqual([running.status, running.completed_intervals, running.expected_intervals, running.complete, isTerminal(running)], ["running", 48, 744, false, false]);
    const failed = parseHistoryJob({ data: { ...JOB.data, status: "failed", failure: { code: "JOB_INTERRUPTED", message: "stopped" } } });
    assert.deepEqual([failed.complete, failed.failure.code, isTerminal(failed)], [false, "JOB_INTERRUPTED", true]);
    const ok = parseHistoryJob({ data: { ...JOB.data, status: "succeeded", result_ref: "run-h", coverage: { ...JOB.data.coverage, complete: true } } });
    assert.equal(ok.complete, true);
    assert.equal(parseHistoryJob({ data: { job_id: "x", status: "done" } }), null);
  });

  it("creates a job with POST /api/v1/history/jobs", async () => {
    const f = fakeFetch([{ status: 202, body: { data: { ...JOB.data, status: "queued" } } }]);
    const job = await createHistoryJob("http://x", { month: "2026-01", interval_seconds: 3600 }, f.fn);
    assert.equal(f.calls[0].url, "http://x/api/v1/history/jobs");
    assert.equal(job.status, "queued");
  });
});
