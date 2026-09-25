"use client";

// SIM-VIS-01 illustrated office floor plan (Agent M-D — FreeBuff).
//
// The map is the dominant element. It reads the existing authoritative state
// and inventory only: no polling, no clock, no local simulation, no energy
// calculation, and no command submission. Every drawn device is bound to a real
// inventory device ID; decorative furniture carries no device binding.

import type { KeyboardEvent } from "react";
import {
  PLAN_HEIGHT,
  PLAN_WIDTH,
  ROOM_DECOR,
  ROOM_GEOMETRY,
  interiorOf,
  placementForDevice,
} from "../lib/floor-plan";
import type { Inventory, Room } from "../lib/inventory";
import type { DeviceState, RoomState } from "../lib/sim-state";
import {
  decorativeUnitCount,
  glyphKindFor,
  partitionPlaceable,
  visualStateFor,
} from "../lib/equipment";
import { occupantSlots, occupancyView } from "../lib/occupancy";
import CrewFigure from "./illustrations/crew-figure";
import Decor from "./illustrations/decor";
import EquipmentGlyph from "./illustrations/equipment";
import { BuildingShell, RoomShell } from "./illustrations/building";

export interface LiveData {
  devices: Map<string, DeviceState>;
  rooms: Map<string, RoomState>;
}

export default function OfficeFloorPlan({
  inventory,
  live,
  stale,
  selectedRoomId,
  focusedRoomId = null,
  onSelectRoom,
  onExitFocus,
}: {
  inventory: Inventory;
  live: LiveData | null;
  stale: boolean;
  selectedRoomId: string | null;
  focusedRoomId?: string | null;
  onSelectRoom: (roomId: string) => void;
  onExitFocus?: () => void;
}) {
  const knownRooms = inventory.rooms.filter((r) => ROOM_GEOMETRY[r.room_id]);
  const unknownRooms = inventory.rooms.filter((r) => !ROOM_GEOMETRY[r.room_id]);
  const focusGeometry = focusedRoomId ? ROOM_GEOMETRY[focusedRoomId] : null;
  const visibleRooms = focusedRoomId
    ? knownRooms.filter((room) => room.room_id === focusedRoomId)
    : knownRooms;
  const mapViewBox = focusGeometry
    ? `${focusGeometry.x - 28} ${focusGeometry.y - 28} ${focusGeometry.w + 56} ${focusGeometry.h + 56}`
    : `0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`;

  const onRoomKey = (e: KeyboardEvent, roomId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectRoom(roomId);
    }
  };

  return (
    <div className="sim-map-frame">
      <svg
        viewBox={mapViewBox}
        role="group"
        aria-label={
          focusedRoomId
            ? `Focused illustrated view of ${knownRooms.find((room) => room.room_id === focusedRoomId)?.name ?? "selected room"}.`
            : "Top-down illustrated office floor plan. Rooms are also selectable from the room list below the map."
        }
        className={`sim-map-svg ${focusedRoomId ? "sim-map-svg-focused" : ""}`}
      >
        <BuildingShell />
        {visibleRooms.map((room) => (
          <RoomLayer
            key={room.room_id}
            room={room}
            inventory={inventory}
            live={live}
            stale={stale}
            selected={room.room_id === selectedRoomId}
            onSelect={() => onSelectRoom(room.room_id)}
            onKeyDown={(e) => onRoomKey(e, room.room_id)}
          />
        ))}
      </svg>

      {focusedRoomId && (
        <div className="sim-map-focus-bar">
          <span>Room focus: {knownRooms.find((room) => room.room_id === focusedRoomId)?.name ?? "selected room"}</span>
          {onExitFocus && (
            <button type="button" className="sim-btn sim-btn-ghost" onClick={onExitFocus}>
              Show all rooms
            </button>
          )}
        </div>
      )}

      <div className="sim-map-legend" aria-label="Map legend">
        <LegendSwatch className="sim-chip-present" label="People reported" />
        <LegendSwatch className="sim-chip-on" label="Equipment on" />
        <LegendSwatch className="sim-chip-off" label="Equipment off" />
        <LegendSwatch className="sim-chip-unknown" label="State unavailable" />
        <LegendSwatch className="sim-chip-selected" label="Selected room" />
      </div>

      {unknownRooms.length > 0 && (
        <p className="sim-map-note">
          {unknownRooms.length} room(s) returned by the backend have no fixed
          plan position and appear in the room list only:{" "}
          {unknownRooms.map((r) => r.name).join(", ")}.
        </p>
      )}
    </div>
  );
}

function LegendSwatch({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="sim-legend-item">
      <span className={`sim-swatch ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function deviceTooltip(
  device: Inventory["devices"][number],
  runtime: DeviceState | null,
): string {
  if (!runtime) {
    return `${device.name} · state unavailable · live power unavailable · voltage/current unavailable from the state API`;
  }
  const mode = runtime.on ? "on" : "off";
  return `${device.name} · ${mode} · ${runtime.power_w} W · ${runtime.energy_kwh} kWh · voltage/current unavailable from the state API`;
}

function RoomLayer({
  room,
  inventory,
  live,
  stale,
  selected,
  onSelect,
  onKeyDown,
}: {
  room: Room;
  inventory: Inventory;
  live: LiveData | null;
  stale: boolean;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}) {
  const g = ROOM_GEOMETRY[room.room_id];
  const interior = interiorOf(room.room_id);
  const devices = inventory.devices.filter((d) => d.room_id === room.room_id);
  const { placed, unplaced } = partitionPlaceable(devices, placementForDevice);
  const roomLive = live?.rooms.get(room.room_id) ?? null;
  const occupancy = occupancyView(
    roomLive ? roomLive.occupancy : undefined,
    interior ? occupantSlots(room.room_id, interior) : [],
  );
  const decor = ROOM_DECOR[room.room_id] ?? [];

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${room.name}, capacity ${room.capacity}. ${occupancy.label}.`}
      aria-pressed={selected}
      className="office-room"
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <RoomShell roomId={room.room_id} selected={selected} />

      {decor.map((d, i) => (
        <Decor key={i} kind={d.kind} x={d.x} y={d.y} scale={d.scale} variant={d.variant} />
      ))}

      {placed.map(({ device, at }) => {
        const runtime = live?.devices.get(device.device_id) ?? null;
        const state = visualStateFor(runtime, device.always_on);
        return (
          <EquipmentGlyph
            key={device.device_id}
            kind={glyphKindFor(device.device_type)}
            x={at.x}
            y={at.y}
            scale={at.scale}
            flip={at.flip}
            state={state}
            units={decorativeUnitCount(device.quantity)}
            tooltip={deviceTooltip(device, runtime)}
          />
        );
      })}

      {/* Devices without a fixed plan slot are still drawn, never hidden. */}
      {unplaced.map((device, i) => {
        const runtime = live?.devices.get(device.device_id) ?? null;
        const state = visualStateFor(runtime, device.always_on);
        return (
          <EquipmentGlyph
            key={device.device_id}
            kind={glyphKindFor(device.device_type)}
            x={g.x + 60 + i * 56}
            y={g.y + g.h - 32}
            scale={0.62}
            state={state}
            units={decorativeUnitCount(device.quantity)}
            tooltip={deviceTooltip(device, runtime)}
          />
        );
      })}

      {occupancy.kind === "present" &&
        occupancy.figures.map((slot, i) => (
          <CrewFigure
            key={i}
            x={slot.x}
            y={slot.y}
            variant={slot.variant}
            dimmed={stale}
          />
        ))}

      <text x={g.x + 14} y={g.y + 30} fontSize={21} fontWeight={700} fill="#eaf1ff">
        {room.name}
      </text>
      <text x={g.x + 14} y={g.y + 52} fontSize={14} fill="#9db0d4">
        capacity {room.capacity} · {devices.length} device
        {devices.length === 1 ? "" : "s"}
      </text>
      <text
        x={g.x + g.w - 14}
        y={g.y + 30}
        fontSize={14}
        textAnchor="end"
        fill={occupancyFill(occupancy.kind)}
        fontWeight={600}
      >
        {occupancyShort(occupancy.kind, occupancy)}
      </text>
    </g>
  );
}

function occupancyFill(kind: string): string {
  if (kind === "present") return "#79e0b6";
  if (kind === "empty") return "#9db0d4";
  return "#e2b866";
}

function occupancyShort(
  kind: string,
  view: ReturnType<typeof occupancyView>,
): string {
  if (kind === "present" && view.kind === "present") {
    return `● ${view.count} reported`;
  }
  if (kind === "empty") return "○ none reported";
  return "? unavailable";
}
