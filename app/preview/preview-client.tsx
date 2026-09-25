"use client";

// SIM-VIS-01 isolated visual preview (Agent M-D — FreeBuff).
//
// Renders the real map/inspector components against clearly labelled MOCK data
// for visual review and screenshots. This route is reachable only in a
// non-production build (see page.tsx) and never contacts any backend.

import { useState, useSyncExternalStore } from "react";
import OfficeFloorPlan from "../components/office-floor-plan";
import RoomInspector from "../components/room-inspector";
import StatusStrip from "../components/status-strip";
import { officeHoursSummary } from "../lib/office-map";
import type { DeviceState, RoomState } from "../lib/sim-state";
import {
  MOCK_INVENTORY,
  SCENARIO_LABEL,
  scenarioState,
  type VisualScenario,
} from "../lib/visual-fixtures";

const SCENARIOS: VisualScenario[] = ["occupied", "empty", "stale", "unavailable"];

export default function PreviewClient() {
  const search = useSyncExternalStore(subscribeLocation, locationSearch, () => "");
  const params = new URLSearchParams(search);
  const requestedScenario = params.get("scenario");
  const requestedRoom = params.get("room");
  const initialScenario = SCENARIOS.includes(requestedScenario as VisualScenario)
    ? (requestedScenario as VisualScenario)
    : "occupied";
  const initialRoom = MOCK_INVENTORY.rooms.some((r) => r.room_id === requestedRoom)
    ? requestedRoom!
    : "room-open-workspace";
  const [scenarioOverride, setScenarioOverride] =
    useState<VisualScenario | null>(null);
  const [roomOverride, setRoomOverride] = useState<string | null>(null);
  const scenario = scenarioOverride ?? initialScenario;
  const selectedRoomId = roomOverride ?? initialRoom;

  const sim = scenarioState(scenario);
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
  const stale = scenario === "stale";
  const room =
    MOCK_INVENTORY.rooms.find((r) => r.room_id === selectedRoomId) ?? null;

  return (
    <div className="sim-shell">
      <header className="sim-header">
        <div className="sim-brand">
          <span className="sim-brand-mark" aria-hidden="true">
            N
          </span>
          <div>
            <h1 className="sim-brand-title">NEXYRA Office Simulator</h1>
            <p className="sim-brand-sub">
              Isolated visual preview — task-owned mock state
            </p>
          </div>
        </div>
        <p className="sim-synthetic">
          MOCK PREVIEW — fabricated readings, no backend, no simulation clock.
        </p>
      </header>

      <main className="sim-main">
        <div className="sim-inline" role="group" aria-label="Preview scenario">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === scenario}
              onClick={() => setScenarioOverride(s)}
              className={`sim-btn ${s === scenario ? "sim-btn-active" : ""}`}
            >
              {SCENARIO_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="sim-live">
          <StatusStrip sim={sim} stale={stale} />

          <section className="sim-map-panel" aria-label="Office map">
            <div className="sim-panel-head">
              <h2 className="sim-panel-title">Office map</h2>
              <span className="sim-pill">mock · {SCENARIO_LABEL[scenario]}</span>
            </div>
            <div className="sim-map-grid">
              <div className="sim-map-main">
                <OfficeFloorPlan
                  inventory={MOCK_INVENTORY}
                  live={live}
                  stale={stale}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setRoomOverride}
                />
                <div className="sim-roomlist" role="group" aria-label="Room list">
                  {MOCK_INVENTORY.rooms.map((r) => (
                    <button
                      key={r.room_id}
                      type="button"
                      aria-pressed={r.room_id === selectedRoomId}
                      onClick={() => setRoomOverride(r.room_id)}
                      className={`sim-chip ${
                        r.room_id === selectedRoomId ? "sim-chip-active" : ""
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sim-map-side">
                <RoomInspector
                  inventory={MOCK_INVENTORY}
                  room={room}
                  live={live}
                  buildingHours={officeHoursSummary(MOCK_INVENTORY)}
                  mutateDisabled
                  devicePendingId={null}
                  onDeviceCommand={null}
                   selectedDeviceId={null}
                   onSelectDevice={() => undefined}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function locationSearch(): string {
  return window.location.search;
}

function subscribeLocation(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
