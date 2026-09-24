"use client";

// Lifecycle + speed controls (P009 / S10-A). Buttons reflect actual backend
// status; nothing is optimistically enabled. No start-date configuration.
//
// SIM-VIS-01 restyles these controls for the navy theme and fixes the known
// 375 px problems: the action buttons wrap instead of overflowing and Reset
// stays reachable. Behaviour is unchanged.

import { SPEEDS, type Lifecycle, type Speed } from "../lib/sim-state";

export type PendingOp =
  | "start"
  | "pause"
  | "resume"
  | "reset"
  | "speed"
  | "device"
  | null;

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
    <section className="sim-panel" aria-label="Simulation lifecycle controls">
      <div className="sim-panel-head">
        <h2 className="sim-panel-title">Lifecycle &amp; speed</h2>
        <span className="sim-pill">{status ?? "unknown"}</span>
      </div>

      <div className="sim-lifecycle-speeds" role="group" aria-label="Simulation speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === speed}
            disabled={busy}
            onClick={() => onSpeed(s)}
            className={`sim-btn ${s === speed ? "sim-btn-active" : ""}`}
          >
            {s}×
          </button>
        ))}
      </div>

      <div className="sim-lifecycle-actions" role="group" aria-label="Run controls">
        <button
          type="button"
          disabled={busy || running}
          onClick={onStart}
          title={running ? "Already running" : "Start a run (or resume a paused one)"}
          className="sim-btn sim-btn-primary"
        >
          {pending === "start" ? "Starting…" : "Start"}
        </button>
        <button
          type="button"
          disabled={busy || !running}
          onClick={onPause}
          className="sim-btn"
        >
          {pending === "pause" ? "Pausing…" : "Pause"}
        </button>
        <button
          type="button"
          disabled={busy || !paused}
          onClick={onResume}
          className="sim-btn"
        >
          {pending === "resume" ? "Resuming…" : "Resume"}
        </button>
        <button
          type="button"
          disabled={busy || !hasRun}
          onClick={onReset}
          className="sim-btn"
        >
          {pending === "reset" ? "Resetting…" : "Reset"}
        </button>
      </div>

      <p className="sim-small sim-muted" style={{ marginTop: "0.6rem" }}>
        Reset starts a new run and preserves previous backend history. The
        displayed run is replaced only after the backend confirms the reset.
      </p>

      {commandError && (
        <p className="sim-error" role="alert" style={{ marginTop: "0.6rem" }}>
          {commandError}
        </p>
      )}
    </section>
  );
}
