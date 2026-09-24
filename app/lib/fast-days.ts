// K004-FAST1 fast-days + history adapters (Agent M-C — Claude Code).
// Two DIFFERENT operations, kept apart on purpose:
//   - Advance days: moves the CURRENT interactive run forward (POST
//     /api/v1/control/advance). Commands keep working; time shown is processed
//     time only; the target is never shown as reached before it is processed.
//   - Generate history: creates a SEPARATE batch run via the K005 job API
//     (POST/GET /api/v1/history/jobs). The current run is not changed.
// Feature detection: a backend without these routes/fields is reported as
// "not supported", never simulated in the browser.

import { COMMAND_TIMEOUT_MS, type FetchLike, SimApiError, STATE_TIMEOUT_MS, postJson, readErrorBody } from "./sim-state.ts";

export const ADVANCE_PRESETS = [1, 7, 30] as const;
export const MAX_ADVANCE_DAYS = 31;
export const RECORDING_INTERVALS = [60, 3600] as const;
export type RecordingInterval = (typeof RECORDING_INTERVALS)[number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Whole days 1..31 (a "30 days" duration is not a calendar month). */
export function checkDays(v: unknown): number | null {
  const n = typeof v === "string" && /^\d+$/.test(v.trim()) ? Number(v.trim()) : v;
  return Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_ADVANCE_DAYS ? (n as number) : null;
}

export interface AdvanceProgress {
  requested_days: number;
  start_sim_utc: string;
  target_sim_utc: string;
  processed_steps: number;
  expected_steps: number;
  fraction: number;
}
export interface AdvanceView {
  active: boolean;
  current: AdvanceProgress | null;
  last: (AdvanceProgress & { outcome: string; end_sim_utc: string }) | null;
}

function parseProgress(o: Record<string, unknown>): AdvanceProgress | null {
  const p = {
    requested_days: num(o.requested_days), start_sim_utc: str(o.start_sim_utc), target_sim_utc: str(o.target_sim_utc),
    processed_steps: num(o.processed_steps), expected_steps: num(o.expected_steps), fraction: num(o.fraction),
  };
  return Object.values(p).every((x) => x !== null) ? (p as AdvanceProgress) : null;
}

/** Subset of GET /state this panel needs. `supported` is false when the backend has no advance support. */
export interface FastState {
  status: string | null;
  run_id: string | null;
  sim_time_utc: string | null;
  recording_interval_seconds: number | null;
  advance: AdvanceView | null;
  supported: boolean;
}

export function parseFastState(json: unknown): FastState | null {
  const d = isRecord(json) && isRecord(json.data) ? json.data : null;
  if (!d) return null;
  let advance: AdvanceView | null = null;
  if (isRecord(d.advance) && typeof d.advance.active === "boolean") {
    const a = d.advance;
    const current = a.active ? parseProgress(a) : null;
    let last: AdvanceView["last"] = null;
    if (isRecord(a.last)) {
      const lp = parseProgress(a.last);
      const outcome = str(a.last.outcome);
      const end = str(a.last.end_sim_utc);
      if (lp && outcome && end) last = { ...lp, outcome, end_sim_utc: end };
    }
    if (a.active && !current) return null; // active but malformed: refuse rather than guess
    advance = { active: a.active === true, current, last };
  }
  return {
    status: str(d.status), run_id: str(d.run_id), sim_time_utc: str(d.sim_time_utc),
    recording_interval_seconds: num(d.recording_interval_seconds), advance,
    supported: advance !== null || d.run_id === null,
  };
}

async function getJson(origin: string, path: string, fetchImpl: FetchLike, timeoutMs: number, fallback: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}${path}`, { signal: controller.signal });
    if (!res.ok) {
      const detail = await readErrorBody(res);
      throw new SimApiError(detail.message ?? `${fallback} (HTTP ${res.status}).`, res.status, detail.code ?? null, detail.field);
    }
    return await res.json();
  } catch (err) {
    if (err instanceof SimApiError) throw err;
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new SimApiError(aborted ? `${fallback}: timed out after ${timeoutMs} ms.` : `${fallback}: unreachable.`, null, aborted ? "TIMEOUT" : "UNREACHABLE");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFastState(origin: string, fetchImpl: FetchLike, timeoutMs = STATE_TIMEOUT_MS): Promise<FastState> {
  const json = await getJson(origin, "/api/v1/state", fetchImpl, timeoutMs, "State request failed");
  const parsed = parseFastState(json);
  if (!parsed) throw new SimApiError("State response was malformed.", 200, "BAD_RESPONSE");
  return parsed;
}

export async function startAdvance(origin: string, days: number, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  const checked = checkDays(days);
  if (checked === null) throw new SimApiError(`days must be a whole number from 1 to ${MAX_ADVANCE_DAYS}.`, null, "VALIDATION_ERROR", "days");
  return (await postJson(origin, "/api/v1/control/advance", { days: checked }, fetchImpl, timeoutMs, "Advance failed")).data;
}

export async function stopAdvance(origin: string, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return (await postJson(origin, "/api/v1/control/advance/stop", {}, fetchImpl, timeoutMs, "Stop failed")).data;
}

/** Ends the current run and creates a NEW paused run with the chosen recording interval (existing runs never change). */
export async function resetWithRecording(origin: string, interval: RecordingInterval, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return (await postJson(origin, "/api/v1/control/reset", { interval_seconds: interval }, fetchImpl, timeoutMs, "New run failed")).data;
}

// ------------------------------------------------------------------ history jobs (K005)

export interface HistoryJobRequest {
  month: string;
  interval_seconds: RecordingInterval;
  seed?: number;
}

export function historyJobBody(month: string, interval: RecordingInterval, seed?: string): HistoryJobRequest | string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return "Choose a month (YYYY-MM).";
  const body: HistoryJobRequest = { month, interval_seconds: interval };
  if (seed !== undefined && seed.trim() !== "") {
    const n = Number(seed.trim());
    if (!Number.isInteger(n) || n < 0 || n > 4294967295) return "Seed must be a whole number from 0 to 4294967295.";
    body.seed = n;
  }
  return body;
}

export interface HistoryJob {
  job_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  run_id: string | null;
  result_ref: string | null;
  interval_seconds: number | null;
  from_utc: string | null;
  to_utc: string | null;
  completed_intervals: number;
  expected_intervals: number;
  committed_through_utc: string | null;
  complete: boolean;
  failure: { code: string; message: string } | null;
}

export function parseHistoryJob(json: unknown): HistoryJob | null {
  const d = isRecord(json) && isRecord(json.data) ? json.data : null;
  if (!d || typeof d.job_id !== "string") return null;
  const status = d.status;
  if (status !== "queued" && status !== "running" && status !== "succeeded" && status !== "failed") return null;
  const p = isRecord(d.progress) ? d.progress : null;
  const r = isRecord(d.requested) ? d.requested : null;
  const c = isRecord(d.coverage) ? d.coverage : null;
  const done = num(p?.completed_intervals);
  const expected = num(p?.expected_intervals);
  if (done === null || expected === null || expected <= 0) return null;
  const f = isRecord(d.failure) ? d.failure : null;
  return {
    job_id: d.job_id, status, run_id: str(d.run_id), result_ref: str(d.result_ref),
    interval_seconds: num(r?.interval_seconds), from_utc: str(r?.from_utc), to_utc: str(r?.to_utc),
    completed_intervals: done, expected_intervals: expected, committed_through_utc: str(p?.committed_through_utc),
    complete: c?.complete === true && status === "succeeded",
    failure: f && typeof f.code === "string" ? { code: f.code, message: str(f.message) ?? "" } : null,
  };
}

export const isTerminal = (j: HistoryJob): boolean => j.status === "succeeded" || j.status === "failed";

export async function createHistoryJob(origin: string, body: HistoryJobRequest, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS): Promise<HistoryJob> {
  const { data, status } = await postJson(origin, "/api/v1/history/jobs", body, fetchImpl, timeoutMs, "History job failed");
  const job = parseHistoryJob({ data });
  if (!job) throw new SimApiError("History job response was malformed.", status, "BAD_RESPONSE");
  return job;
}

export async function fetchHistoryJob(origin: string, jobId: string, fetchImpl: FetchLike, timeoutMs = STATE_TIMEOUT_MS): Promise<HistoryJob> {
  const json = await getJson(origin, `/api/v1/history/jobs/${encodeURIComponent(jobId)}`, fetchImpl, timeoutMs, "History job request failed");
  const job = parseHistoryJob(json);
  if (!job) throw new SimApiError("History job response was malformed.", 200, "BAD_RESPONSE");
  return job;
}
