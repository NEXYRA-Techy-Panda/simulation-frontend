"use client";

// Office floor plan + inventory inspection (P005 / S10-A, Agent A — OpenCode).
// Reads GET /api/v1/inventory only. No clocks, commands, sockets, occupants,
// dots, switches, charts, or export. Contract v1.0.1, read-only.

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  INVENTORY_TIMEOUT_MS,
  fetchInventory,
  groupDevicesByRoom,
  policyForDevice,
  type Inventory,
  type Room,
} from "../lib/inventory";
import {
  CORRIDOR,
  GEOMETRY,
  graceSeconds,
  officeHoursSummary,
  powerLabel,
  resolveSelection,
} from "../lib/office-map";
import { sanitizeOrigin } from "../lib/health";

type Phase = "loading" | "loaded" | "error";

export default function OfficeMap({ backendUrl }: { backendUrl: string }) {
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
        "Backend URL is missing or invalid. Set NEXT_PUBLIC_SIMULATION_BACKEND_URL to an http(s) origin.",
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

  const grouped = inventory ? groupDevicesByRoom(inventory) : null;
  const selectedRoom: Room | null =
    inventory?.rooms.find((r) => r.room_id === selectedRoomId) ?? null;
  const selectedDevices = selectedRoom
    ? (grouped?.byRoom.get(selectedRoom.room_id) ?? [])
    : [];
  const stale = phase === "loaded" && error !== null;
  const knownRooms =
    inventory?.rooms.filter((r) => GEOMETRY[r.room_id]) ?? [];
  const unknownRooms =
    inventory?.rooms.filter((r) => !GEOMETRY[r.room_id]) ?? [];
  const hours = inventory ? officeHoursSummary(inventory) : null;

  const selectRoom = (roomId: string) => setSelectedRoomId(roomId);

  const onRoomKey = (e: KeyboardEvent, roomId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectRoom(roomId);
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Office inventory
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Refresh inventory
        </button>
      </div>

      {phase === "loading" && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Loading inventory from the backend…
        </p>
      )}

      {phase === "error" && !inventory && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-950">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Inventory unavailable
          </p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            Check that the backend is running, then use Refresh inventory.
          </p>
        </div>
      )}

      {inventory && inventory.rooms.length === 0 && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          The backend returned an empty inventory — no rooms to display.
        </p>
      )}

      {stale && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Showing stale data from{" "}
          {lastSuccessIso ? new Date(lastSuccessIso).toLocaleString() : "—"}.
          Refresh failed: {error}
        </p>
      )}

      {inventory && inventory.rooms.length > 0 && (
        <>
          <svg
            viewBox="0 0 640 440"
            role="img"
            aria-label="Top-down office floor plan. Use the room list below for keyboard selection."
            className="mt-4 w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <rect
              x={CORRIDOR.x}
              y={CORRIDOR.y}
              width={CORRIDOR.w}
              height={CORRIDOR.h}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              className="stroke-zinc-400 dark:stroke-zinc-600"
            />
            <text
              x={CORRIDOR.x + CORRIDOR.w / 2}
              y={CORRIDOR.y + CORRIDOR.h / 2 + 5}
              textAnchor="middle"
              className="fill-zinc-500 text-sm dark:fill-zinc-400"
            >
              Corridor
            </text>
            {knownRooms.map((room) => {
              const g = GEOMETRY[room.room_id];
              const selected = room.room_id === selectedRoomId;
              return (
                <g
                  key={room.room_id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${room.name}, capacity ${room.capacity}`}
                  aria-pressed={selected}
                  className="office-room"
                  onClick={() => selectRoom(room.room_id)}
                  onKeyDown={(e) => onRoomKey(e, room.room_id)}
                >
                  <rect
                    x={g.x}
                    y={g.y}
                    width={g.w}
                    height={g.h}
                    strokeWidth={selected ? 3 : 1.5}
                    className={
                      selected
                        ? "fill-blue-100 stroke-blue-700 dark:fill-blue-950 dark:stroke-blue-300"
                        : "fill-white stroke-zinc-500 dark:fill-zinc-900 dark:stroke-zinc-400"
                    }
                  />
                  <text
                    x={g.x + 12}
                    y={g.y + 28}
                    className="fill-zinc-900 text-base font-semibold dark:fill-zinc-50"
                  >
                    {room.name}
                  </text>
                  <text
                    x={g.x + 12}
                    y={g.y + 50}
                    className="fill-zinc-500 text-sm dark:fill-zinc-400"
                  >
                    Capacity {room.capacity}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Rooms
            </h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {inventory.rooms.map((room) => (
                <li key={room.room_id}>
                  <button
                    type="button"
                    aria-pressed={room.room_id === selectedRoomId}
                    onClick={() => selectRoom(room.room_id)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      room.room_id === selectedRoomId
                        ? "border-blue-700 bg-blue-100 text-blue-900 dark:border-blue-300 dark:bg-blue-950 dark:text-blue-100"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {room.name}
                  </button>
                </li>
              ))}
            </ul>
            {unknownRooms.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {unknownRooms.length} room(s) have no fixed plan position and
                appear in this list only.
              </p>
            )}
          </div>

          {selectedRoom ? (
            <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {selectedRoom.name}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Capacity: {selectedRoom.capacity} people (capacity, not current
                occupancy)
              </p>
              {hours && (
                <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  Building hours: {hours}
                </p>
              )}
              <h4 className="mt-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Devices ({selectedDevices.length})
              </h4>
              {selectedDevices.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  No devices listed for this room.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {selectedDevices.map((device) => {
                    const policy = policyForDevice(inventory, device.device_id);
                    const grace = policy
                      ? graceSeconds(policy.rules)
                      : null;
                    return (
                      <li
                        key={device.device_id}
                        className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900"
                      >
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {device.name}{" "}
                          <span className="font-normal text-zinc-500 dark:text-zinc-400">
                            ({device.device_type})
                          </span>
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {powerLabel(device)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          Nominal group power — not multiplied further, not
                          measured power.
                        </p>
                        {device.always_on && (
                          <p className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            Always-on exception
                          </p>
                        )}
                        {policy && (
                          <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            Schedule: {policy.kind} v{policy.version}
                            {grace !== null &&
                              ` · vacancy grace ${grace} s`}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {grouped && grouped.unassigned.length > 0 && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {grouped.unassigned.length} inventoried device(s) reference
                  an unknown room and are listed separately on request — none
                  hidden.
                </p>
              )}
              <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Current occupancy, live consumption, and on/off state:{" "}
                  <span className="font-medium">Not available yet</span> (no
                  runtime data in this assignment).
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Select a room to see its details.
            </p>
          )}
        </>
      )}
    </section>
  );
}
