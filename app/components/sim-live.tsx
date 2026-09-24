"use client";

// Live simulation state owner (P009 / S10-A, Agent A — OpenCode).
// HTTP polling ~1/s while visible: bounded timeout, no overlap, stale-seq
// tracking with per-run reset, backoff, manual retry, resume on visibility.
// Last-known readings are preserved and labelled stale on failure; a network
// failure is never presented as a stopped simulation.

import { useCallback, useEffect, useRef, useState } from "react";
import Clocks from "./clocks";
import LifecycleControls, { type PendingOp } from "./lifecycle-controls";
import OfficeMap from "./office-map";
import {
  POLL_INTERVAL_MS,
  STATE_TIMEOUT_MS,
  backoffForFailures,
  commandDevice,
  createSingleFlight,
  fetchSimState,
  pauseRun,
  resetRun,
  resumeRun,
  setSpeed,
  shouldApplyUpdate,
  startRun,
  SimApiError,
  type DeviceState,
  type RoomState,
  type SimState,
  type Speed,
  type TrackedState,
} from "../lib/sim-state";
import { sanitizeOrigin } from "../lib/health";

export default function SimLive({ backendUrl }: { backendUrl: string }) {
  const [sim, setSim] = useState<SimState | null>(null);
  const [stale, setStale] = useState(false);
  const [lastSuccessIso, setLastSuccessIso] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [pendingOp, setPendingOp] = useState<PendingOp>(null);
  const [devicePendingId, setDevicePendingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const tracked = useRef<TrackedState>({ run_id: null, seq: null });
  const failCount = useRef(0);
  const nextAllowedAt = useRef(0);
  const flight = useRef(createSingleFlight());
  const pollAbort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const pendingRef = useRef<PendingOp>(null);
  const simRef = useRef<SimState | null>(null);

  // Effect-synced mirror for callbacks (ref writes belong here, not render).
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);

  const poll = useCallback(
    async (force = false) => {
      const origin = sanitizeOrigin(backendUrl);
      if (!origin) return;
      if (typeof document !== "undefined" && document.hidden && !force) return;
      if (Date.now() < nextAllowedAt.current && !force) return;
      if (!flight.current.tryAcquire()) return; // never overlap polls
      const controller = new AbortController();
      pollAbort.current = controller;
      try {
        const state = await fetchSimState(
          origin,
          (url, init) => fetch(url, { ...init, signal: controller.signal }),
          STATE_TIMEOUT_MS,
        );
        if (!mounted.current) return;
        const decision = shouldApplyUpdate(tracked.current, {
          run_id: state.run_id,
          seq: state.seq,
        });
        if (decision.apply) {
          tracked.current = decision.tracked;
          setSim(state);
        }
        failCount.current = 0;
        nextAllowedAt.current = 0;
        setStale(false);
        setLoadError(null);
        setLastSuccessIso(new Date().toISOString());
      } catch {
        if (!mounted.current) return;
        // Preserve last-known readings; label stale. Never claim stopped.
        failCount.current += 1;
        nextAllowedAt.current =
          Date.now() + backoffForFailures(failCount.current);
        if (sim) {
          setStale(true);
        } else {
          setLoadError(
            "Backend state is unreachable. Retry when the backend is running.",
          );
        }
      } finally {
        flight.current.release();
        if (pollAbort.current === controller) pollAbort.current = null;
      }
    },
    [backendUrl, sim],
  );

  // Command errors need sim/stale context: simRef is synced in an effect above.
  const runCommand = useCallback(
    async (
      op: Exclude<PendingOp, null>,
      label: string,
      fn: (origin: string) => Promise<{
        run_id: string | null;
        seq: number | null;
      }>,
      deviceId?: string,
    ) => {
      if (pendingRef.current) return; // prevent duplicate submissions
      const origin = sanitizeOrigin(backendUrl);
      if (!origin) {
        setCommandError("Backend URL is missing or invalid.");
        return;
      }
      pendingRef.current = op;
      setPendingOp(op);
      if (deviceId) setDevicePendingId(deviceId);
      setCommandError(null);
      try {
        const summary = await fn(origin);
        if (!mounted.current) return;
        // Adopt the authoritative run/seq from the confirmed response, then
        // fetch full state. Displayed readings change only via fetched state.
        const decision = shouldApplyUpdate(tracked.current, {
          run_id: summary.run_id,
          seq: summary.seq,
        });
        if (decision.apply) tracked.current = decision.tracked;
        failCount.current = 0;
        nextAllowedAt.current = 0;
        await poll(true);
      } catch (err) {
        if (!mounted.current) return;
        setCommandError(
          err instanceof SimApiError
            ? `${label} failed: ${err.message}`
            : `${label} failed with an unknown error.`,
        );
      } finally {
        if (mounted.current) {
          pendingRef.current = null;
          setPendingOp(null);
          setDevicePendingId(null);
        }
      }
    },
    [backendUrl, poll],
  );

  useEffect(() => {
    mounted.current = true;
    // Defer past the effect body (same pattern as the other panels).
    const start = setTimeout(() => {
      void poll(true); // initial fetch
    }, 0);
    const timer = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      clearTimeout(start);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      pollAbort.current?.abort();
    };
  }, [poll]);

  const mutateDisabled = stale || pendingOp !== null;
  const speed: Speed = sim?.speed ?? 1;

  const live = sim
    ? {
        devices: new Map<string, DeviceState>(
          sim.devices.map((d) => [d.device_id, d]),
        ),
        rooms: new Map<string, RoomState>(
          sim.rooms.map((r) => [r.room_id, r]),
        ),
      }
    : null;

  const handleDeviceCommand = useCallback(
    (deviceId: string, control: "on" | "off" | "clear") => {
      void runCommand(
        "device",
        "Device command",
        (origin) =>
          commandDevice(origin, deviceId, control, fetch).then((r) => ({
            run_id: simRef.current?.run_id ?? null,
            seq: r.seq,
          })),
        deviceId,
      );
    },
    [runCommand],
  );

  return (
    <div className="flex flex-col gap-6">
      <Clocks simTimeUtc={sim?.sim_time_utc ?? null} />

      <LifecycleControls
        status={sim?.status ?? null}
        speed={speed}
        pending={pendingOp}
        disabled={stale}
        commandError={commandError}
        onStart={() => void runCommand("start", "Start", (o) => startRun(o, speed, fetch))}
        onPause={() => void runCommand("pause", "Pause", (o) => pauseRun(o, fetch))}
        onResume={() => void runCommand("resume", "Resume", (o) => resumeRun(o, fetch))}
        onReset={() => void runCommand("reset", "Reset", (o) => resetRun(o, fetch))}
        onSpeed={(s) => void runCommand("speed", "Speed change", (o) => setSpeed(o, s, fetch))}
      />

      <section
        aria-label="Office live readings"
        className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Office live readings
          </h2>
          {stale && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Stale — connection lost
            </span>
          )}
        </div>
        {sim?.office ? (
          <dl className="mt-3 space-y-1 font-mono text-sm">
            <div className="flex gap-2">
              <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">
                Current power
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {sim.office.power_w} W
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">
                Cumulative energy
              </dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {sim.office.energy_kwh} kWh
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {loadError ??
              (stale
                ? "No readings yet and the last check failed — retry when the backend is reachable."
                : "Waiting for the first backend state…")}
          </p>
        )}
        {(stale || loadError) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                failCount.current = 0;
                nextAllowedAt.current = 0;
                setLoadError(null);
                void poll(true);
              }}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Retry now
            </button>
            {lastSuccessIso && (
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                last success {new Date(lastSuccessIso).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </section>

      <OfficeMap
        backendUrl={backendUrl}
        live={live}
        mutateDisabled={mutateDisabled}
        devicePendingId={devicePendingId}
        onDeviceCommand={handleDeviceCommand}
      />
    </div>
  );
}
