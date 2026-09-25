"use client";

// K004-FAST1 fast-days panel (Agent M-C — Claude Code). Self-contained: it
// polls GET /state itself (single flight, bounded timeout, responses that
// started before a command are discarded) and never runs a clock of its own.
// Shows PROCESSED simulated time only; the advance target is labelled as a
// target. "Advance this run" and "Generate history (separate run)" are
// separate sections because they are different operations.

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeOrigin } from "../lib/health";
import { createSingleFlight, describeInstant, SimApiError } from "../lib/sim-state";
import {
  ADVANCE_PRESETS, MAX_ADVANCE_DAYS, RECORDING_INTERVALS, type FastState, type HistoryJob, type RecordingInterval,
  checkDays, createHistoryJob, fetchFastState, fetchHistoryJob, historyJobBody, isTerminal, resetWithRecording,
  startAdvance, stopAdvance,
} from "../lib/fast-days";

const btn = "sim-fast-btn";
const primary = "sim-fast-btn sim-fast-btn-primary";
const ghost = "sim-fast-btn sim-fast-btn-ghost";
const card = "sim-panel sim-fast-panel";
const label = "sim-panel-title";

const local = (utc: string | null | undefined): string => {
  if (!utc) return "—";
  const v = describeInstant(utc);
  return v ? `${v.datePart} ${v.timePart} ${v.tzAbbrev}` : utc;
};
const message = (err: unknown): string => (err instanceof SimApiError || err instanceof Error ? err.message : "Request failed.");
const pct = (f: number): string => `${Math.min(100, Math.max(0, f * 100)).toFixed(1)}%`;

export interface FastDaysPanelProps {
  /** Same backend URL SimLive uses (deployment-config). */
  backendUrl: string;
  /** Called after a successful command so the host can force its own state poll. */
  onChanged?: () => void;
}

export default function FastDaysPanel({ backendUrl, onChanged }: FastDaysPanelProps) {
  const [state, setState] = useState<FastState | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [days, setDays] = useState<string>("1");
  const [interval, setIntervalChoice] = useState<RecordingInterval>(3600);
  const [confirmNewRun, setConfirmNewRun] = useState(false);
  const [month, setMonth] = useState("2026-01");
  const [jobInterval, setJobInterval] = useState<RecordingInterval>(3600);
  const [seed, setSeed] = useState("");
  const [job, setJob] = useState<HistoryJob | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "advance" | "stop" | "newrun" | "job">(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  const flight = useRef(createSingleFlight());
  const epoch = useRef(0);
  const mounted = useRef(true);
  const jobRef = useRef<HistoryJob | null>(null);
  const stateRef = useRef<FastState | null>(null);
  useEffect(() => { jobRef.current = job; }, [job]);
  useEffect(() => { stateRef.current = state; }, [state]);

  const poll = useCallback(async () => {
    const origin = sanitizeOrigin(backendUrl);
    if (!origin || !flight.current.tryAcquire()) return;
    const started = epoch.current;
    try {
      const s = await fetchFastState(origin, fetch);
      if (mounted.current && started === epoch.current) { setState(s); setStateError(null); }
      const j = jobRef.current;
      if (j && !isTerminal(j)) {
        const next = await fetchHistoryJob(origin, j.job_id, fetch);
        if (mounted.current) { setJob(next); setJobError(null); }
      }
    } catch (err) {
      if (mounted.current && started === epoch.current) setStateError(message(err));
    } finally {
      flight.current.release();
    }
  }, [backendUrl]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async (): Promise<void> => {
      await poll();
      if (!mounted.current) return;
      const busy = stateRef.current?.advance?.active || (jobRef.current !== null && !isTerminal(jobRef.current));
      timer = setTimeout(() => { void loop(); }, busy ? 1000 : 5000);
    };
    void loop();
    return () => { mounted.current = false; if (timer) clearTimeout(timer); };
  }, [poll]);

  const run = useCallback(async (op: NonNullable<typeof pending>, fn: (origin: string) => Promise<void>) => {
    const origin = sanitizeOrigin(backendUrl);
    if (!origin) { setCommandError("Backend URL is not valid."); return; }
    epoch.current += 1; // results of polls that started before this command are discarded
    setPending(op);
    setCommandError(null);
    try {
      await fn(origin);
      onChanged?.();
    } catch (err) {
      if (op === "job") setJobError(message(err)); else setCommandError(message(err));
    } finally {
      if (mounted.current) setPending(null);
      void poll();
    }
  }, [backendUrl, onChanged, poll]);

  const adv = state?.advance ?? null;
  const active = adv?.active === true;
  const unsupported = state !== null && !state.supported;
  const checkedDays = checkDays(days);
  const canAdvance = !unsupported && state?.status === "paused" && !active && checkedDays !== null && pending === null;
  const canNewRun = !unsupported && !active && state?.status !== "running" && pending === null;

  return (
    <section aria-label="Fast days and history generation" className={card}>
      <h2 className={label}>Fast days</h2>
      {stateError && <p role="alert" className="sim-inline-warning">State unavailable: {stateError}</p>}
      {unsupported && (
        <p role="status" className="sim-inline-warning">
          The connected backend does not report advance support (K004-FAST1 not deployed there). Controls are disabled.
        </p>
      )}

      {/* ---------------------------------------------------------- advance this run */}
      <div className="mt-4">
        <h3 className="sim-fast-heading">Advance this run</h3>
        <p className="sim-muted sim-small">
          Moves the current run forward (≈1 simulated day per second). Commands still apply; it pauses when done.
          {" "}Recording: {state?.recording_interval_seconds ? `${state.recording_interval_seconds} s` : "not reported"}.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Days to advance">
          {ADVANCE_PRESETS.map((d) => (
            <button key={d} type="button" aria-pressed={days === String(d)} disabled={active || pending !== null}
              onClick={() => setDays(String(d))} className={`${btn} ${days === String(d) ? primary : ghost}`}>
              {d} {d === 1 ? "day" : "days"}
            </button>
          ))}
          <label className="sim-inline-field-label">
            Custom
            <input type="number" inputMode="numeric" min={1} max={MAX_ADVANCE_DAYS} step={1} value={days} disabled={active || pending !== null}
              onChange={(e) => setDays(e.target.value)} aria-invalid={checkedDays === null}
              className="sim-input sim-number-input" />
          </label>
        </div>
        {checkedDays === null && <p className="sim-inline-error">Whole days from 1 to {MAX_ADVANCE_DAYS}.</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" className={`${btn} ${primary}`} disabled={!canAdvance}
            onClick={() => void run("advance", async (o) => { await startAdvance(o, checkedDays!, fetch); })}>
            {pending === "advance" ? "Starting…" : "Start advance"}
          </button>
          <button type="button" className={`${btn} ${ghost}`} disabled={!active || pending !== null}
            onClick={() => void run("stop", async (o) => { await stopAdvance(o, fetch); })}>
            {pending === "stop" ? "Stopping…" : "Stop"}
          </button>
        </div>
        {state?.status === "running" && !active && (
          <p className="sim-inline-warning">Pause the clock to advance (one runner per run).</p>
        )}
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2"><dt className="sim-fast-term">Processed time</dt><dd className="font-mono">{local(state?.sim_time_utc)}</dd></div>
          {active && adv?.current && (
            <>
              <div className="flex gap-2"><dt className="sim-fast-term">Target (not yet reached)</dt><dd className="font-mono">{local(adv.current.target_sim_utc)}</dd></div>
              <div className="flex gap-2"><dt className="sim-fast-term">Progress</dt>
                <dd className="font-mono">{adv.current.processed_steps.toLocaleString()} / {adv.current.expected_steps.toLocaleString()} steps ({pct(adv.current.fraction)})</dd></div>
              <div className="sim-progress-track" role="progressbar"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(adv.current.fraction * 100)}>
                <div className="sim-progress-value" style={{ width: pct(adv.current.fraction) }} />
              </div>
            </>
          )}
          {!active && adv?.last && (
            <div className="flex gap-2"><dt className="sim-fast-term">Last advance</dt>
              <dd>{adv.last.outcome} at {local(adv.last.end_sim_utc)} ({pct(adv.last.fraction)} of {adv.last.requested_days} d)</dd></div>
          )}
        </dl>
        {commandError && <p role="alert" className="sim-inline-error">{commandError}</p>}
      </div>

      {/* ---------------------------------------------------------- new run recording */}
      <div className="sim-fast-divider mt-6 pt-4">
        <h3 className="sim-fast-heading">New run recording</h3>
        <p className="sim-muted sim-small">Ends the current run and starts a new paused run. An existing run&apos;s interval never changes.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Recording interval for a new run">
          {RECORDING_INTERVALS.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={interval === s} className={`${btn} ${interval === s ? primary : ghost}`}
              disabled={pending !== null} onClick={() => { setIntervalChoice(s); setConfirmNewRun(false); }}>
              {s === 60 ? "Per minute" : "Hourly"}
            </button>
          ))}
          <button type="button" className={`${btn} ${ghost}`} disabled={!canNewRun}
            onClick={() => {
              if (!confirmNewRun) { setConfirmNewRun(true); return; }
              setConfirmNewRun(false);
              void run("newrun", async (o) => { await resetWithRecording(o, interval, fetch); });
            }}>
            {confirmNewRun ? "Confirm: end current run" : "Start new run"}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- generate history (separate run) */}
      <div className="sim-fast-divider mt-6 pt-4">
        <h3 className="sim-fast-heading">Generate history (separate run)</h3>
        <p className="sim-muted sim-small">
          Builds a calendar month as an independent synthetic run. The current run is not changed or advanced.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sim-inline-field-label">Month
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={pending !== null}
              className="sim-input sim-month-input" />
          </label>
          <label className="sim-inline-field-label">Recording
            <select value={jobInterval} onChange={(e) => setJobInterval(Number(e.target.value) as RecordingInterval)} disabled={pending !== null}
              className="sim-select">
              <option value={3600}>Hourly</option>
              <option value={60}>Per minute</option>
            </select>
          </label>
          <label className="sim-inline-field-label">Seed
            <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="auto" inputMode="numeric" disabled={pending !== null}
              className="sim-input sim-seed-input" />
          </label>
          <button type="button" className={`${btn} ${primary}`} disabled={pending !== null || (job !== null && !isTerminal(job))}
            onClick={() => {
              const body = historyJobBody(month, jobInterval, seed);
              if (typeof body === "string") { setJobError(body); return; }
              void run("job", async (o) => { setJob(await createHistoryJob(o, body, fetch)); setJobError(null); });
            }}>
            {pending === "job" ? "Submitting…" : "Generate"}
          </button>
        </div>
        {jobError && <p role="alert" className="sim-inline-error">{jobError}</p>}
        {job && (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2"><dt className="sim-fast-term">Job</dt><dd className="font-mono">{job.status}</dd></div>
            <div className="flex gap-2"><dt className="sim-fast-term">Committed</dt>
              <dd className="font-mono">{job.completed_intervals.toLocaleString()} / {job.expected_intervals.toLocaleString()} intervals
                {job.committed_through_utc ? ` (through ${local(job.committed_through_utc)})` : ""}</dd></div>
            {job.status === "succeeded" && job.complete && (
              <div className="flex gap-2"><dt className="sim-fast-term">Generated run</dt><dd className="break-all font-mono">{job.result_ref}</dd></div>
            )}
            {job.status === "failed" && (
              <div className="flex gap-2"><dt className="sim-fast-term">Incomplete</dt>
                <dd>{job.failure?.code}: {job.failure?.message} — partial data is not a complete month.</dd></div>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}
