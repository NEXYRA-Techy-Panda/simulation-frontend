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
import { useMapFullscreen } from "./map-fullscreen";

export interface LiveData {
  devices: Map<string, DeviceState>;
  rooms: Map<string, RoomState>;
}

export interface OfficeSelection {
  roomId: string | null;
  roomName: string | null;
  deviceId: string | null;
  deviceName: string | null;
}

type Phase = "loading" | "loaded" | "error";

export default function OfficeMapPanel({
  backendUrl,
  live = null,
  mutateDisabled = false,
  devicePendingId = null,
  onDeviceCommand = null,
  onSelectionChange = null,
}: {
  backendUrl: string;
  live?: LiveData | null;
  mutateDisabled?: boolean;
  devicePendingId?: string | null;
  onDeviceCommand?:
    | ((deviceId: string, control: "on" | "off" | "clear") => void)
    | null;
  onSelectionChange?: ((selection: OfficeSelection) => void) | null;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessIso, setLastSuccessIso] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const selectedRoomRef = useRef<string | null>(null);
  const inventoryRef = useRef<Inventory | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const { fullscreen, toggleFullscreen } = useMapFullscreen();

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
    if (!inventoryRef.current) setPhase("loading");
    try {
      const r = await fetchInventory(
        origin,
        (url, init) => fetch(url, { ...init, signal: controller.signal }),
        INVENTORY_TIMEOUT_MS,
      );
      if (!mounted.current) return;
      if (r.ok) {
        inventoryRef.current = r.inventory;
        setInventory(r.inventory);
        setLastSuccessIso(r.fetchedAtIso);
        setError(null);
        setPhase("loaded");
        const nextRoomId = resolveSelection(
          r.inventory.rooms.map((room) => room.room_id),
          selectedRoomRef.current,
        );
        selectedRoomRef.current = nextRoomId;
        setSelectedRoomId(nextRoomId);
        setSelectedDeviceId((previous) => {
          const device = previous
            ? r.inventory.devices.find((candidate) => candidate.device_id === previous)
            : null;
          return device && device.room_id === nextRoomId ? previous : null;
        });
      } else {
        // Keep previous data visible but labelled stale; fresh error otherwise.
        setError(r.error);
        if (!inventoryRef.current) setPhase("error");
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [backendUrl]);

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
  const selectedDevice = selectedDeviceId
    ? inventory?.devices.find((device) => device.device_id === selectedDeviceId) ?? null
    : null;
  const stale = phase === "loaded" && error !== null;
  const hours = inventory ? officeHoursSummary(inventory) : null;

  const selectRoom = useCallback((roomId: string) => {
    selectedRoomRef.current = roomId;
    setSelectedRoomId(roomId);
    setSelectedDeviceId(null);
  }, []);

  useEffect(() => {
    onSelectionChange?.({
      roomId: selectedRoom?.room_id ?? null,
      roomName: selectedRoom?.name ?? null,
      deviceId: selectedDevice?.device_id ?? null,
      deviceName: selectedDevice?.name ?? null,
    });
  }, [onSelectionChange, selectedDevice, selectedRoom]);

  return (
    <section
      className={`sim-map-panel ${fullscreen ? "sim-map-panel-fullscreen" : ""}`}
      aria-label="Office map"
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen ? true : undefined}
    >
      <div className="sim-panel-head">
        <h2 className="sim-panel-title">Office map</h2>
        <div className="sim-panel-actions">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={fullscreen}
            className="sim-btn sim-btn-ghost"
          >
            {fullscreen ? "Exit full screen" : "Full screen map"}
          </button>
          <button type="button" onClick={() => void refresh()} className="sim-btn sim-btn-ghost">
            Refresh inventory
          </button>
        </div>
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
              onSelectRoom={selectRoom}
            />

            <div className="sim-roomlist" role="group" aria-label="Room list">
              {inventory.rooms.map((room) => (
                <button
                  key={room.room_id}
                  type="button"
                  aria-pressed={room.room_id === selectedRoomId}
                  onClick={() => selectRoom(room.room_id)}
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
               selectedDeviceId={selectedDeviceId}
               onSelectDevice={setSelectedDeviceId}
            />
          </div>
        </div>
      )}
    </section>
  );
}
