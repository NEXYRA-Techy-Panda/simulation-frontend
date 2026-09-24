"use client";

// Master Live Telemetry Charts Coordinator (SIM-CHART-01).
// Integrates live power & cumulative energy charts with scope selection
// (Office, Selected Room, Selected Device) and accessible data table view.

import { useEffect, useReducer, useRef, useState } from "react";
import type { SimState } from "../../lib/sim-state";
import {
  createTelemetryBuffer,
  getScopeSeries,
  ingestSimState,
  type ScopeType,
  type TelemetryBuffer,
} from "../../lib/chart-buffer";
import PowerChart from "./power-chart";
import EnergyChart from "./energy-chart";
import AccessibleTable from "./accessible-table";

export interface LiveChartsProps {
  state: SimState | null;
  initialHistory?: SimState[];
  isStale?: boolean;
  selectedRoom?: { room_id: string; name: string } | null;
  selectedDevice?: { device_id: string; name: string } | null;
  roomNames?: Record<string, string>;
  deviceNames?: Record<string, string>;
  className?: string;
}

export default function LiveCharts({
  state,
  initialHistory,
  isStale = false,
  selectedRoom,
  selectedDevice,
  roomNames,
  deviceNames,
  className = "",
}: LiveChartsProps) {
  // Scope selection: "office" | "room" | "device"
  const [activeScope, setActiveScope] = useState<ScopeType>("office");
  const [viewMode, setViewMode] = useState<"charts" | "table">("charts");

  // Persistent bounded buffer. It is deliberately separate from the transient
  // scope/view controls so changing scope never discards samples.
  const [buffer] = useState<TelemetryBuffer>(() => {
    const buf = createTelemetryBuffer(600);
    if (initialHistory && initialHistory.length > 0) {
      for (const h of initialHistory) {
        ingestSimState(
          buf,
          h,
          isStale,
          selectedRoom?.room_id,
          selectedDevice?.device_id,
          { rooms: roomNames, devices: deviceNames },
        );
      }
    }
    return buf;
  });
  const lastSampleKey = useRef("");
  const [, forceBufferRender] = useReducer((revision: number) => revision + 1, 0);

  // Ingest after commit rather than mutating a stateful buffer during render.
  // The explicit revision makes the newly ingested sample visible immediately
  // without relying on a second polling loop or a render-phase setState.
  useEffect(() => {
    if (!state) return;
    const currentKey = `${state.run_id ?? ""}:${state.seq ?? ""}:${state.sim_time_utc ?? ""}:${isStale}:${selectedRoom?.room_id ?? ""}:${selectedDevice?.device_id ?? ""}`;
    if (currentKey === lastSampleKey.current) return;
    lastSampleKey.current = currentKey;
    ingestSimState(
      buffer,
      state,
      isStale,
      selectedRoom?.room_id,
      selectedDevice?.device_id,
      { rooms: roomNames, devices: deviceNames },
    );
    forceBufferRender();
  }, [buffer, deviceNames, isStale, roomNames, selectedDevice?.device_id, selectedRoom?.room_id, state]);

  // Derived effective scope (fallback to office if selected room/device is absent)
  const effectiveScope: ScopeType =
    activeScope === "room" && !selectedRoom
      ? "office"
      : activeScope === "device" && !selectedDevice
      ? "office"
      : activeScope;

  // Determine active target ID & name
  let targetId = "office";
  let targetName = "Whole Office";

  if (effectiveScope === "room" && selectedRoom) {
    targetId = selectedRoom.room_id;
    targetName = selectedRoom.name;
  } else if (effectiveScope === "device" && selectedDevice) {
    targetId = selectedDevice.device_id;
    targetName = selectedDevice.name;
  }

  const activeSeries = getScopeSeries(buffer, effectiveScope, targetId);

  // Empty state when no run has started
  if (!state || state.status === "not_initialized" || !state.run_id) {
    return (
      <section
        aria-label="Simulation live telemetry graphs"
        className={`rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-zinc-900 uppercase dark:text-zinc-50">
              Live Energy Telemetry
            </h2>
            <p className="text-xs text-zinc-400">
              Real-time scrolling power and cumulative energy trend lines
            </p>
          </div>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-400 dark:bg-zinc-900">
            Standby
          </span>
        </div>
        <div className="flex h-36 flex-col items-center justify-center text-center text-sm text-zinc-400">
          <p>No active simulation run detected.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Start a simulation run to begin streaming live ECG-style power and energy telemetry.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6 ${className}`}
      aria-label="Simulation live telemetry graphs"
    >
      {/* Scope and Mode Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-zinc-900 uppercase dark:text-zinc-50">
            Live Energy Telemetry
          </h2>
          <p className="text-xs text-zinc-400">
            Continuous scrolling telemetry — {targetName}
          </p>
        </div>

        {/* Scope Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900 text-xs">
            <button
              type="button"
              onClick={() => setActiveScope("office")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                activeScope === "office"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Office
            </button>
            <button
              type="button"
              disabled={!selectedRoom}
              onClick={() => selectedRoom && setActiveScope("room")}
              aria-pressed={activeScope === "room" && Boolean(selectedRoom)}
              className={`rounded-md px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                activeScope === "room" && selectedRoom
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Room: {selectedRoom?.name ?? "select in map"}
            </button>
            <button
              type="button"
              disabled={!selectedDevice}
              onClick={() => selectedDevice && setActiveScope("device")}
              aria-pressed={activeScope === "device" && Boolean(selectedDevice)}
              className={`rounded-md px-3 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                activeScope === "device" && selectedDevice
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Device: {selectedDevice?.name ?? "select in map"}
            </button>
          </div>

          {/* Toggle between Chart View and Accessible Table View */}
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("charts")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                viewMode === "charts"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Graphs
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Data Table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-4">
        {viewMode === "charts" ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PowerChart
              series={activeSeries}
              statusText={state.status}
              isStale={isStale}
            />
            <EnergyChart
              series={activeSeries}
              statusText={state.status}
              isStale={isStale}
            />
          </div>
        ) : (
          <AccessibleTable
            samples={activeSeries?.samples ?? []}
            scopeName={targetName}
          />
        )}
      </div>
    </section>
  );
}
