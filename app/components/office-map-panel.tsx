"use client";

// SIM-VIS-01 map panel (Agent M-D — FreeBuff).
//
// Owns the existing single inventory fetch (bounded timeout, no polling, no
// duplicate request) and composes the illustrated plan, the keyboard room list
// and the selected-room inspector. All functional behaviour of the previous
// P005 map panel is preserved; only the presentation changed.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  INVENTORY_TIMEOUT_MS,
  fetchInventory,
  type Inventory,
  type Room,
} from "../lib/inventory";
import { officeHoursSummary, resolveSelection } from "../lib/office-map";
import { sanitizeOrigin } from "../lib/health";
import type { DeviceState, RoomState } from "../lib/sim-state";
import OfficeFloorPlan from "./office-floor-plan";
import RoomInspector from "./room-inspector";

export interface LiveData {
  devices: Map<string, DeviceState>;
  rooms: Map<string, RoomState>;
}

type Phase = "loading" | "loaded" | "error";

export default function OfficeMapPanel({
  backendUrl,
  live = null,
  mutateDisabled = false,
  devicePendingId = null,
  onDeviceCommand = null,
}: {
  backendUrl: string;
  live?: LiveData | null;
  mutateDisabled?: boolean;
  devicePendingId?: string | null;
  onDeviceCommand?:
    | ((deviceId: string, control: "on" | "off" | "clear") => void)
    | null;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessIso, setLastSuccessIso] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (inFlight.current) return; // never duplicate an outstanding request
    const origin = sanitizeOrigin(backendUrl);
    if (!origin) {
      setError(
        "Backend API URL is missing or invalid. Verify the deployment configuration.",
      );
      setPhase("error");
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    if (!inventory) setPhase("loading");
    try {
      const r = await fetchInventory(
        origin,
        (url, init) => fetch(url, { ...init, signal: controller.signal }),
        INVENTORY_TIMEOUT_MS,
      );
      if (!mounted.current) return;
      if (r.ok) {
        setInventory(r.inventory);
        setLastSuccessIso(r.fetchedAtIso);
        setError(null);
        setPhase("loaded");
        setSelectedRoomId((prev) =>
          resolveSelection(
            r.inventory.rooms.map((room) => room.room_id),
            prev,
          ),
        );
      } else {
        // Keep previous data visible but labelled stale; fresh error otherwise.
        setError(r.error);
        if (!inventory) setPhase("error");
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [backendUrl, inventory]);

  useEffect(() => {
    mounted.current = true;
    const t = setTimeout(() => {
      void refresh(); // initial load
    }, 0);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [refresh]);

  const selectedRoom: Room | null =
    inventory?.rooms.find((r) => r.room_id === selectedRoomId) ?? null;
  const stale = phase === "loaded" && error !== null;
  const hours = inventory ? officeHoursSummary(inventory) : null;

  return (
    <section className="sim-map-panel" aria-label="Office map">
      <div className="sim-panel-head">
        <h2 className="sim-panel-title">Office map</h2>
        <button type="button" onClick={() => void refresh()} className="sim-btn sim-btn-ghost">
          Refresh inventory
        </button>
      </div>

      {phase === "loading" && (
        <p className="sim-muted">Loading inventory from the backend…</p>
      )}

      {phase === "error" && !inventory && (
        <div className="sim-error" role="alert">
          <p>
            <strong>Inventory unavailable.</strong> {error}
          </p>
          <p className="sim-small">
            Check that the backend is running, then use Refresh inventory.
          </p>
        </div>
      )}

      {stale && (
        <p className="sim-warn" role="status">
          Showing stale inventory from{" "}
          {lastSuccessIso ? new Date(lastSuccessIso).toLocaleString() : "—"}.
          Refresh failed: {error}
        </p>
      )}

      {inventory && inventory.rooms.length === 0 && (
        <p className="sim-muted">
          The backend returned an empty inventory — no rooms to display.
        </p>
      )}

      {inventory && inventory.rooms.length > 0 && (
        <div className="sim-map-grid">
          <div className="sim-map-main">
            <OfficeFloorPlan
              inventory={inventory}
              live={live}
              stale={stale}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />

            <div className="sim-roomlist" role="group" aria-label="Room list">
              {inventory.rooms.map((room) => (
                <button
                  key={room.room_id}
                  type="button"
                  aria-pressed={room.room_id === selectedRoomId}
                  onClick={() => setSelectedRoomId(room.room_id)}
                  className={`sim-chip ${
                    room.room_id === selectedRoomId ? "sim-chip-active" : ""
                  }`}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>

          <div className="sim-map-side">
            <RoomInspector
              inventory={inventory}
              room={selectedRoom}
              live={live}
              buildingHours={hours}
              mutateDisabled={mutateDisabled}
              devicePendingId={devicePendingId}
              onDeviceCommand={onDeviceCommand}
            />
          </div>
        </div>
      )}
    </section>
  );
}
