// SIM-VIS-01 visual fixtures (Agent M-D — FreeBuff).
//
// MOCK DATA. These fixtures exist ONLY to render the illustrated map in known
// occupied/on/off/stale/unavailable states for visual review and screenshots.
// They are imported only by the isolated `app/preview` route, which returns 404
// in a production build, so they never run in the production simulator. They
// are never submitted to any backend and never advance a simulation clock.
//
// Room IDs, names and capacities mirror the real contract demo inventory so the
// preview exercises the same shapes as production. Device IDs match the demo
// inventory, but the readings below are fabricated for display only.

import type { Inventory } from "./inventory";
import type { SimState } from "./sim-state";

export const MOCK_INVENTORY: Inventory = {
  rooms: [
    { room_id: "room-open-workspace", name: "Open workspace", room_type: "open_workspace", capacity: 12 },
    { room_id: "room-meeting", name: "Meeting room", room_type: "meeting_room", capacity: 6 },
    { room_id: "room-pantry", name: "Pantry/dining", room_type: "pantry", capacity: 4 },
    { room_id: "room-reception", name: "Reception", room_type: "reception", capacity: 2 },
    { room_id: "room-manager-cabin", name: "Manager's cabin", room_type: "manager_cabin", capacity: 2 },
  ],
  devices: [
    { device_id: "dev-open-light-a", name: "Lighting zone A", room_id: "room-open-workspace", device_type: "lighting", quantity: 1, nominal_power_w: 72, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-open-light-b", name: "Lighting zone B", room_id: "room-open-workspace", device_type: "lighting", quantity: 1, nominal_power_w: 72, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-open-ac", name: "AC", room_id: "room-open-workspace", device_type: "ac", quantity: 1, nominal_power_w: 1500, power_factor: 0.95, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-open-fan", name: "Fan", room_id: "room-open-workspace", device_type: "fan", quantity: 1, nominal_power_w: 75, power_factor: 0.8, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-open-workstations", name: "Workstation group", room_id: "room-open-workspace", device_type: "workstation_group", quantity: 8, nominal_power_w: 960, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-meeting-light", name: "Lighting group", room_id: "room-meeting", device_type: "lighting", quantity: 1, nominal_power_w: 72, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-meeting-ac", name: "AC", room_id: "room-meeting", device_type: "ac", quantity: 1, nominal_power_w: 1500, power_factor: 0.95, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-meeting-projector", name: "Projector", room_id: "room-meeting", device_type: "projector", quantity: 1, nominal_power_w: 300, standby_power_w: 5, power_factor: 0.9, always_on: false, control: "manual", controls: ["switch"] },
    { device_id: "dev-pantry-light", name: "Lighting group", room_id: "room-pantry", device_type: "lighting", quantity: 1, nominal_power_w: 72, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-pantry-fan", name: "Fan", room_id: "room-pantry", device_type: "fan", quantity: 1, nominal_power_w: 75, power_factor: 0.8, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-pantry-fridge", name: "Refrigerator", room_id: "room-pantry", device_type: "refrigerator", quantity: 1, nominal_power_w: 150, power_factor: 1, always_on: true, control: "always_on", controls: [] },
    { device_id: "dev-pantry-microwave", name: "Microwave", room_id: "room-pantry", device_type: "microwave", quantity: 1, nominal_power_w: 1200, standby_power_w: 3, power_factor: 1, always_on: false, control: "manual", controls: ["switch"] },
    { device_id: "dev-reception-light", name: "Lighting group", room_id: "room-reception", device_type: "lighting", quantity: 1, nominal_power_w: 72, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-reception-fan", name: "Fan", room_id: "room-reception", device_type: "fan", quantity: 1, nominal_power_w: 75, power_factor: 0.8, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-reception-pc", name: "Reception computer", room_id: "room-reception", device_type: "computer", quantity: 1, nominal_power_w: 150, standby_power_w: 5, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-manager-light", name: "Lighting group", room_id: "room-manager-cabin", device_type: "lighting", quantity: 1, nominal_power_w: 72, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-manager-ac", name: "AC", room_id: "room-manager-cabin", device_type: "ac", quantity: 1, nominal_power_w: 1500, power_factor: 0.95, always_on: false, control: "scheduled", controls: ["switch"] },
    { device_id: "dev-manager-pc", name: "Computer", room_id: "room-manager-cabin", device_type: "computer", quantity: 1, nominal_power_w: 150, standby_power_w: 5, power_factor: 0.9, always_on: false, control: "scheduled", controls: ["switch"] },
  ],
  policies: [
    { policy_id: "pol-office-hours", version: 1, applies_to: "building:nexyra-demo-office", kind: "office_hours", effective_from_utc: "2000-01-01T00:00:00Z", rules: { working_days_iso: [1, 2, 3, 4, 5], open_local: "09:00", close_local: "18:00", overnight: false } },
    { policy_id: "pol-open-light-a", version: 1, applies_to: "device:dev-open-light-a", kind: "lighting_schedule", effective_from_utc: "2000-01-01T00:00:00Z", rules: { on_during_hours: true, vacancy_grace_seconds: 300 } },
    { policy_id: "pol-pantry-fridge", version: 1, applies_to: "device:dev-pantry-fridge", kind: "always_on", effective_from_utc: "2000-01-01T00:00:00Z", rules: { always_on_exception: true } },
  ],
};

export type VisualScenario = "occupied" | "empty" | "stale" | "unavailable";

export const SCENARIO_LABEL: Record<VisualScenario, string> = {
  occupied: "Occupied · equipment on",
  empty: "Empty · controllable equipment off",
  stale: "Stale · last-known state",
  unavailable: "No runtime data · unavailable",
};

const DEVICE_IDS = [
  "dev-open-light-a",
  "dev-open-light-b",
  "dev-open-ac",
  "dev-open-fan",
  "dev-open-workstations",
  "dev-meeting-light",
  "dev-meeting-ac",
  "dev-meeting-projector",
  "dev-pantry-light",
  "dev-pantry-fan",
  "dev-pantry-fridge",
  "dev-pantry-microwave",
  "dev-reception-light",
  "dev-reception-fan",
  "dev-reception-pc",
  "dev-manager-light",
  "dev-manager-ac",
  "dev-manager-pc",
];

const ROOM_OF: Record<string, string> = Object.fromEntries(
  MOCK_INVENTORY.devices.map((d) => [d.device_id, d.room_id]),
);

const NOMINAL: Record<string, number> = Object.fromEntries(
  MOCK_INVENTORY.devices.map((d) => [d.device_id, d.nominal_power_w]),
);

/** Fabricated but internally consistent mock state for the preview only. */
export function scenarioState(scenario: VisualScenario): SimState | null {
  if (scenario === "unavailable") {
    return null;
  }

  const occupied = scenario !== "empty";
  const onFor = (id: string): boolean => {
    if (id.includes("fridge")) return true;
    if (!occupied) return false;
    if (id.includes("microwave")) return false;
    if (id.includes("projector")) return true;
    return id.includes("light") || id.includes("fan") || id.includes("ac") || id.includes("pc") || id.includes("workstations");
  };

  const devices = DEVICE_IDS.map((id, i) => {
    const on = onFor(id);
    return {
      device_id: id,
      room_id: ROOM_OF[id],
      on,
      power_w: on ? NOMINAL[id] : 0,
      energy_kwh: Number(((i + 1) * (on ? 0.01 : 0.002)).toFixed(3)),
      override:
        id === "dev-meeting-projector" && on
          ? { active: true as const, on: true }
          : null,
    };
  });

  const rooms = MOCK_INVENTORY.rooms.map((room) => ({
    room_id: room.room_id,
    occupancy: occupied
      ? {
          "room-open-workspace": 9,
          "room-meeting": 4,
          "room-pantry": 2,
          "room-reception": 1,
          "room-manager-cabin": 1,
        }[room.room_id] ?? 0
      : 0,
    power_w: devices
      .filter((d) => d.room_id === room.room_id)
      .reduce((sum, d) => sum + d.power_w, 0),
    energy_kwh: Number(
      devices
        .filter((d) => d.room_id === room.room_id)
        .reduce((sum, d) => sum + d.energy_kwh, 0)
        .toFixed(3),
    ),
  }));

  return {
    status: "running",
    speed: 60,
    run_id: "preview-run-mock",
    seq: 42,
    sim_time_utc: "2026-01-01T04:30:00Z",
    rooms,
    devices,
    office: {
      power_w: devices.reduce((sum, d) => sum + d.power_w, 0),
      energy_kwh: Number(
        devices.reduce((sum, d) => sum + d.energy_kwh, 0).toFixed(3),
      ),
    },
  };
}
