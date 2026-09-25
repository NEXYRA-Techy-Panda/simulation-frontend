"use client";

// Live simulation state owner (P009 / S10-A, Agent A — OpenCode).
// HTTP polling ~1/s while visible: bounded timeout, no overlap, stale-seq
// tracking with per-run reset, backoff, manual retry, resume on visibility.
// Last-known readings are preserved and labelled stale on failure; a network
// failure is never presented as a stopped simulation.
//
// SIM-VIS-01 (Agent M-D — FreeBuff) recomposes the presentation around the
// dominant office map. The polling, command, stale-state and lifecycle logic
// below is unchanged; only the JSX layout and the visual components differ.

import { useCallback, useEffect, useRef, useState } from "react";
import HistoricalExportPanel from "./historical-export";
import LifecycleControls, { type PendingOp } from "./lifecycle-controls";
import LiveCharts from "./charts/live-charts";
import OfficeMapPanel, { type OfficeSelection } from "./office-map-panel";
import StatusStrip from "./status-strip";
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
  const [chartSelection, setChartSelection] = useState<OfficeSelection>({
    roomId: null,
    roomName: null,
    deviceId: null,
    deviceName: null,
  });

  const tracked = useRef<TrackedState>({ run_id: null, seq: null });
  const failCount = useRef(0);
  const nextAllowedAt = useRef(0);
  const flight = useRef(createSingleFlight());
  const pollAbort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const pendingRef = useRef<PendingOp>(null);
  const simRef = useRef<SimState | null>(null);
  const pollRef = useRef<((force?: boolean) => Promise<void>) | null>(null);
  const commandEpoch = useRef(0);
  const commandInFlight = useRef(false);
  const queuedForcedPoll = useRef(false);

  // Effect-synced mirror for callbacks (ref writes belong here, not render).
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);

  const poll = useCallback(
    async (force = false) => {
      const origin = sanitizeOrigin(backendUrl);
      if (!origin) return;
      if (commandInFlight.current) {
        if (force) queuedForcedPoll.current = true;
        return;
      }
      if (typeof document !== "undefined" && document.hidden && !force) return;
      if (Date.now() < nextAllowedAt.current && !force) return;
      if (!flight.current.tryAcquire()) {
        // A forced refresh after a command must not be silently lost while a
        // poll is finishing. Queue exactly one follow-up refresh.
        if (force) queuedForcedPoll.current = true;
        return;
      }
      const epoch = commandEpoch.current;
      const controller = new AbortController();
      pollAbort.current = controller;
      try {
        const state = await fetchSimState(
          origin,
          (url, init) => {
            const signal = init?.signal
              ? AbortSignal.any([init.signal, controller.signal])
              : controller.signal;
            return fetch(url, { ...init, signal });
          },
          STATE_TIMEOUT_MS,
        );
        // A command may have invalidated this response while it was in flight.
        // Never let a pre-command poll overwrite the post-command state.
        if (!mounted.current || epoch !== commandEpoch.current) return;
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
        // An aborted/superseded poll is expected during a mutation. Do not
        // turn it into a user-visible stale/error state.
        if (!mounted.current || epoch !== commandEpoch.current) return;
        // Preserve last-known readings; label stale. Never claim stopped.
        failCount.current += 1;
        nextAllowedAt.current =
          Date.now() + backoffForFailures(failCount.current);
        if (simRef.current) {
          setStale(true);
        } else {
          setLoadError(
            "Backend state is unreachable. Retry when the backend is running.",
          );
        }
      } finally {
        flight.current.release();
        if (pollAbort.current === controller) pollAbort.current = null;
        if (queuedForcedPoll.current && mounted.current) {
          queuedForcedPoll.current = false;
          window.setTimeout(() => {
            if (mounted.current) void pollRef.current?.(true);
          }, 0);
        }
      }
    },
    [backendUrl],
  );

  // Keep a stable callback reference for a forced poll queued by a finishing
  // request, without making the polling callback depend on itself.
  useEffect(() => {
    pollRef.current = poll;
    return () => {
      if (pollRef.current === poll) pollRef.current = null;
    };
  }, [poll]);

  // Command errors need sim/stale context: simRef is synced in an effect above.
  const runCommand = useCallback(
    async (
      op: Exclude<PendingOp, null>,
      label: string,
      fn: (origin: string) => Promise<{
        run_id?: string | null;
        seq?: number | null;
        speed?: Speed;
      }>,
      deviceId?: string,
    ) => {
      if (pendingRef.current) return; // prevent duplicate submissions
      const origin = sanitizeOrigin(backendUrl);
      if (!origin) {
        setCommandError("Backend URL is missing or invalid.");
        return;
      }
      // Invalidate any in-flight poll before a mutation. Otherwise a poll
      // that started before reset can finish afterward and restore the old run.
      commandEpoch.current += 1;
      commandInFlight.current = true;
      pollAbort.current?.abort();
      pendingRef.current = op;
      setPendingOp(op);
      if (deviceId) setDevicePendingId(deviceId);
      setCommandError(null);
      try {
        const summary = await fn(origin);
        commandInFlight.current = false;
        if (!mounted.current) return;
        // Adopt the authoritative run/seq when the control route returns a
        // lifecycle summary. The speed route intentionally returns only speed;
        // in that case the forced state poll below is the authoritative update.
        if (summary.run_id !== undefined && summary.seq !== undefined) {
          const decision = shouldApplyUpdate(tracked.current, {
            run_id: summary.run_id,
            seq: summary.seq,
          });
          if (decision.apply) tracked.current = decision.tracked;
        }
        failCount.current = 0;
        nextAllowedAt.current = 0;
        await poll(true);
      } catch (err) {
        commandInFlight.current = false;
        if (!mounted.current) return;

        // A transport/response-shape failure can happen after the backend has
        // already applied a mutation. Reconcile before reporting it, especially
        // for reset, so the UI does not immediately show stale pre-reset data.
        if (
          err instanceof SimApiError &&
          (err.code === "BAD_RESPONSE" ||
            err.code === "TIMEOUT" ||
            err.code === "UNREACHABLE")
        ) {
          await poll(true);
        }

        const detail =
          err instanceof SimApiError
            ? err.message
            : "unknown error.";
        const prefix = `${label} failed`;
        setCommandError(
          detail.startsWith(`${prefix}:`) ? detail : `${prefix}: ${detail}`,
        );
      } finally {
        commandInFlight.current = false;
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

  const handleSelectionChange = useCallback((selection: OfficeSelection) => {
    setChartSelection(selection);
  }, []);

  const chartRoom = chartSelection.roomId
    ? {
        room_id: chartSelection.roomId,
        name: chartSelection.roomName ?? chartSelection.roomId,
      }
    : null;
  const chartDevice = chartSelection.deviceId
    ? {
        device_id: chartSelection.deviceId,
        name: chartSelection.deviceName ?? chartSelection.deviceId,
      }
    : null;

  return (
    <div className="sim-live">
      <StatusStrip sim={sim} stale={stale} />

      {loadError && !sim && (
        <div className="sim-warn" role="alert">
          <p>{loadError}</p>
          <div className="sim-inline">
            <button
              type="button"
              onClick={() => {
                failCount.current = 0;
                nextAllowedAt.current = 0;
                setLoadError(null);
                void poll(true);
              }}
              className="sim-btn sim-btn-primary"
            >
              Retry now
            </button>
            {lastSuccessIso && (
              <span className="sim-mono sim-small">
                last success {new Date(lastSuccessIso).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

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

      <OfficeMapPanel
        backendUrl={backendUrl}
        live={live}
        mutateDisabled={mutateDisabled}
        devicePendingId={devicePendingId}
        onDeviceCommand={handleDeviceCommand}
        onSelectionChange={handleSelectionChange}
      />

      <LiveCharts
        state={sim}
        isStale={stale}
        selectedRoom={chartRoom}
        selectedDevice={chartDevice}
      />

      <HistoricalExportPanel
        backendUrl={backendUrl}
        currentRunId={sim?.run_id ?? null}
      />
    </div>
  );
}
