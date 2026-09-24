"use client";

// Lifecycle + speed controls (P009 / S10-A). Buttons reflect actual backend
// status; nothing is optimistically enabled. No start-date configuration.

import { SPEEDS, type Lifecycle, type Speed } from "../lib/sim-state";

export type PendingOp =
  | "start"
  | "pause"
  | "resume"
  | "reset"
  | "speed"
  | "device"
  | null;

const btn =
  "rounded-full px-5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const primary =
  "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";
const ghost =
  "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

export default function LifecycleControls({
  status,
  speed,
  pending,
  disabled,
  commandError,
  onStart,
  onPause,
  onResume,
  onReset,
  onSpeed,
}: {
  status: Lifecycle | null;
  speed: Speed;
  pending: PendingOp;
  disabled: boolean;
  commandError: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeed: (speed: Speed) => void;
}) {
  const hasRun = status !== null && status !== "not_initialized";
  const running = status === "running";
  const paused = status === "paused";
  const busy = pending !== null || disabled;

  return (
    <section
      aria-label="Simulation lifecycle controls"
      className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Lifecycle
        </h2>
        <span className="rounded-full bg-zinc-200 px-3 py-1 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {status ?? "unknown"}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Speed
        </p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Simulation speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === speed}
              disabled={busy}
              onClick={() => onSpeed(s)}
              className={`${btn} ${s === speed ? primary : ghost}`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || running}
          onClick={onStart}
          title={running ? "Already running" : "Start a run (or resume a paused one)"}
          className={`${btn} ${primary}`}
        >
          {pending === "start" ? "Starting…" : "Start"}
        </button>
        <button
          type="button"
          disabled={busy || !running}
          onClick={onPause}
          className={`${btn} ${ghost}`}
        >
          {pending === "pause" ? "Pausing…" : "Pause"}
        </button>
        <button
          type="button"
          disabled={busy || !paused}
          onClick={onResume}
          className={`${btn} ${ghost}`}
        >
          {pending === "resume" ? "Resuming…" : "Resume"}
        </button>
        <button
          type="button"
          disabled={busy || !hasRun}
          onClick={onReset}
          className={`${btn} ${ghost}`}
        >
          {pending === "reset" ? "Resetting…" : "Reset"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Reset starts a new run and preserves previous backend history. The
        displayed run is replaced only after the backend confirms the reset.
      </p>

      {commandError && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {commandError}
        </p>
      )}
    </section>
  );
}
