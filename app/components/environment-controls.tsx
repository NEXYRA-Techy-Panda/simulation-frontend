"use client";

// Reusable room environment controls (K004-PREP3, Agent K-B — FreeBuff).
//
// Backend dependency: simulation-backend branch `kishore/k004-environment-prep`
// (commit 13d59b6) — contract `POST /api/v1/environment`. This component only
// sends the prescribed room climate and displays what the backend confirms; it
// never computes power, energy or readings, never calls Python/the auditor, and
// never resets a run.
//
// Deliberately NOT mounted anywhere yet: the main page / map / live-state
// coordinator are untouched (K003 owns them in parallel). See
// docs/K004_ENVIRONMENT_UI_PREP_EVIDENCE.md §Parent integration for the small
// mounting change.

import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormEvent } from "react";
import {
  ENVIRONMENT_TIMEOUT_MS,
  ENV_RH_PCT_MAX,
  ENV_RH_PCT_MIN,
  ENV_TEMP_MAX,
  ENV_TEMP_MIN,
  applyRoomEnvironment,
  createEnvironmentController,
  type EnvironmentCommandResult,
  type EnvironmentControllerState,
  type FetchLike,
  type RoomClimate,
} from "../lib/environment";
import { sanitizeOrigin } from "../lib/health";

export interface SelectedRoomRef {
  room_id: string;
  name?: string | null;
}

export interface EnvironmentControlsProps {
  /** Deployment base (may include the public /sim prefix); sanitized here. */
  backendUrl: string;
  /** Room selected in the parent's existing selection. */
  selectedRoom: SelectedRoomRef | null;
  /** Run the parent is currently displaying; null when no run exists. */
  runId: string | null;
  /** Recorded AC power model from GET /api/v1/state; null/absent = unsupported. */
  acPowerModel?: string | null;
  /** Backend-confirmed climate for the selected room, when the parent has it. */
  confirmedClimate?: RoomClimate | null;
  /** True while the parent's connection is stale/unreachable. */
  stale?: boolean;
  /** Injected for tests; defaults to the global fetch. */
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Called after a confirmed accept so the parent can refresh authoritatively. */
  onApplied?: (result: EnvironmentCommandResult) => void;
  /** Optional authoritative refresh of the confirmed climate (e.g. a state read). */
  refreshConfirmed?: (roomId: string) => Promise<RoomClimate | null>;
}

function capabilityNotice(state: EnvironmentControllerState, roomName: string): string | null {
  if (state.capability === "no-run") {
    return "No simulation run exists yet. Start or reset a run to prescribe room climate — this panel never starts or resets a run for you.";
  }
  if (state.capability === "unsupported") {
    return "This run was created before the environment model (or by an older backend), so it keeps its flat-rated AC power. Reset to create a new environment-capable run — existing readings stay unchanged.";
  }
  if (state.roomId === null) return "Select a room to prescribe its climate.";
  if (state.stale) return `Climate controls are disabled while the connection is stale (${roomName}).`;
  return null;
}

export default function EnvironmentControls({
  backendUrl,
  selectedRoom,
  runId,
  acPowerModel = null,
  confirmedClimate = null,
  stale = false,
  fetchImpl,
  timeoutMs = ENVIRONMENT_TIMEOUT_MS,
  onApplied,
  refreshConfirmed,
}: EnvironmentControlsProps) {
  // One controller per mount. It is an external store: React subscribes to it
  // via useSyncExternalStore instead of this component mirroring it in an
  // effect (so no ref writes during render and no setState in an effect body).
  const [controller] = useState(() => createEnvironmentController());
  const view: EnvironmentControllerState = useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState,
  );

  const origin = sanitizeOrigin(backendUrl) ?? "";
  const roomId = selectedRoom ? selectedRoom.room_id : null;

  // Handlers are kept pointed at the current props after each render; the
  // controller itself is never re-created (that would drop its state).
  useEffect(() => {
    controller.configure({
      applyCommand: (room, temp_c, rh_pct, signal) => {
        if (!origin) {
          return Promise.reject(new Error("Backend API URL is missing or invalid."));
        }
        return applyRoomEnvironment(origin, room, temp_c, rh_pct, fetchImpl ?? fetch, timeoutMs, signal);
      },
      refreshConfirmed: (room) => refreshConfirmed?.(room) ?? Promise.resolve(null),
    });
  }, [controller, origin, fetchImpl, timeoutMs, refreshConfirmed]);

  useEffect(() => {
    controller.setContext({
      roomId,
      runId,
      acPowerModel,
      confirmed: confirmedClimate,
      stale,
    });
  }, [controller, roomId, runId, acPowerModel, confirmedClimate, stale]);

  // Abort anything in flight on unmount; the controller stays inert afterwards.
  useEffect(() => () => controller.dispose(), [controller]);

  const roomName = selectedRoom ? selectedRoom.name ?? selectedRoom.room_id : null;
  const notice = capabilityNotice(view, roomName ?? "no room selected");
  const tempError = view.errors.find((e) => e.field === "temp_c") ?? null;
  const rhError = view.errors.find((e) => e.field === "rh_pct") ?? null;
  const disabled = !view.canApply;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void controller.apply().then((confirmed) => {
      if (!confirmed) return;
      const accepted = controller.getState().accepted;
      if (accepted) onApplied?.(accepted);
    });
  };

  const confirmedLabel = view.confirmed
    ? `${view.confirmed.temp_c} °C and ${view.confirmed.rh_pct} % RH`
    : "Not reported by the backend yet";

  return (
    <section
      aria-labelledby="environment-controls-heading"
      className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2
        id="environment-controls-heading"
        className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        Room environment (prescribed)
      </h2>

      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        Room: <span className="font-medium">{roomName ?? "No room selected"}</span>
      </p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Backend-confirmed climate: <span className="font-mono">{confirmedLabel}</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Prescribed values are inputs this demo simulates with. They are not
        physical sensor measurements, and no reading is calculated in the
        browser.
      </p>

      {notice && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {notice}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="environment-temp" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Prescribed temperature (°C)
          </label>
          <input
            id="environment-temp"
            name="temp_c"
            type="number"
            inputMode="decimal"
            step="any"
            min={ENV_TEMP_MIN}
            max={ENV_TEMP_MAX}
            value={view.tempText}
            disabled={view.phase === "pending"}
            aria-invalid={tempError ? true : undefined}
            aria-describedby={tempError ? "environment-temp-error" : undefined}
            onChange={(e) => controller.setInput("temp_c", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 sm:w-32"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {ENV_TEMP_MIN} to {ENV_TEMP_MAX} °C
          </span>
          {tempError && (
            <span id="environment-temp-error" className="text-xs text-red-700 dark:text-red-300">
              {tempError.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="environment-rh" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Prescribed relative humidity (%)
          </label>
          <input
            id="environment-rh"
            name="rh_pct"
            type="number"
            inputMode="decimal"
            step="any"
            min={ENV_RH_PCT_MIN}
            max={ENV_RH_PCT_MAX}
            value={view.rhText}
            disabled={view.phase === "pending"}
            aria-invalid={rhError ? true : undefined}
            aria-describedby={rhError ? "environment-rh-error" : undefined}
            onChange={(e) => controller.setInput("rh_pct", e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 sm:w-32"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {ENV_RH_PCT_MIN} to {ENV_RH_PCT_MAX} %
          </span>
          {rhError && (
            <span id="environment-rh-error" className="text-xs text-red-700 dark:text-red-300">
              {rhError.message}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300 sm:w-auto"
        >
          {view.phase === "pending" ? "Applying…" : "Apply climate"}
        </button>
      </form>

      <div className="mt-3 space-y-1">
        {view.dirty && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Unsaved input — not sent to the backend yet.
          </p>
        )}
        <p
          role={view.phase === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            view.phase === "error"
              ? "text-sm text-red-700 dark:text-red-300"
              : "text-sm text-emerald-700 dark:text-emerald-300"
          }
        >
          {view.message ?? ""}
        </p>
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        Humidity is recorded per room for the readings, but it does not affect
        this demo&apos;s AC power model — only the prescribed temperature and
        occupancy do. The AC keeps following its schedule.
      </p>
    </section>
  );
}
