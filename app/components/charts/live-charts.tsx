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

  // Do not expose the previous run's samples during the one commit before the
  // effect has ingested the new run and cleared the buffer.
  const activeSeries =
    buffer.runId === (state?.run_id ?? null)
      ? getScopeSeries(buffer, effectiveScope, targetId)
      : null;
  const emptyMessage =
    buffer.runId !== (state?.run_id ?? null)
      ? "Preparing the new run series..."
      : effectiveScope !== "office" && !activeSeries
        ? "Selected scope has no runtime sample yet."
        : undefined;

  // Empty state when no run has started
  if (!state || state.status === "not_initialized" || !state.run_id) {
    return (
      <section
        aria-label="Simulation live telemetry graphs"
        className={`sim-panel sim-telemetry-panel ${className}`}
      >
        <div className="sim-panel-head">
          <div>
            <h2 className="sim-panel-title">Live energy telemetry</h2>
            <p className="sim-panel-description">
              Real-time scrolling power and cumulative energy trend lines
            </p>
          </div>
          <span className="sim-pill">Standby</span>
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
      className={`sim-panel sim-telemetry-panel ${className}`}
      aria-label="Simulation live telemetry graphs"
    >
      {/* Scope and Mode Controls */}
      <div className="sim-panel-head sim-telemetry-head">
        <div>
          <h2 className="sim-panel-title">Live energy telemetry</h2>
          <p className="sim-panel-description">
            Continuous scrolling telemetry — {targetName}
          </p>
        </div>

        {/* Scope Selector Tabs */}
        <div className="sim-telemetry-actions">
          <div className="sim-segmented" role="group" aria-label="Telemetry scope">
            <button
              type="button"
              aria-pressed={effectiveScope === "office"}
              onClick={() => setActiveScope("office")}
              className={`sim-segment ${activeScope === "office" ? "sim-segment-active" : ""}`}
            >
              Office
            </button>
            <button
              type="button"
              disabled={!selectedRoom}
              onClick={() => selectedRoom && setActiveScope("room")}
              aria-pressed={activeScope === "room" && Boolean(selectedRoom)}
              className={`sim-segment ${activeScope === "room" && selectedRoom ? "sim-segment-active" : ""}`}
            >
              Room: {selectedRoom?.name ?? "select in map"}
            </button>
            <button
              type="button"
              disabled={!selectedDevice}
              onClick={() => selectedDevice && setActiveScope("device")}
              aria-pressed={activeScope === "device" && Boolean(selectedDevice)}
              className={`sim-segment ${activeScope === "device" && selectedDevice ? "sim-segment-active" : ""}`}
            >
              Device: {selectedDevice?.name ?? "select in map"}
            </button>
          </div>

          {/* Toggle between Chart View and Accessible Table View */}
          <div className="sim-segmented" role="group" aria-label="Telemetry display mode">
            <button
              type="button"
              aria-pressed={viewMode === "charts"}
              onClick={() => setViewMode("charts")}
              className={`sim-segment ${viewMode === "charts" ? "sim-segment-active" : ""}`}
            >
              Graphs
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "table"}
              onClick={() => setViewMode("table")}
              className={`sim-segment ${viewMode === "table" ? "sim-segment-active" : ""}`}
            >
              Data table
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="sim-telemetry-content">
        {viewMode === "charts" ? (
          <div className="sim-telemetry-grid">
            <PowerChart
              series={activeSeries}
              scopeName={targetName}
              statusText={state.status}
              isStale={isStale}
              emptyMessage={emptyMessage}
            />
            <EnergyChart
              series={activeSeries}
              scopeName={targetName}
              statusText={state.status}
              isStale={isStale}
              emptyMessage={emptyMessage}
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
