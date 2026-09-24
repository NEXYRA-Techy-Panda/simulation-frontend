// Pure office-map helpers (P005 / S10-A, Agent A — OpenCode). No React
// imports so they can be exercised outside a browser. Contract v1.0.1.

import type { Device, Inventory } from "./inventory";

export interface RoomGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fixed SVG geometry keyed by known room ID. Unknown rooms render as list. */
export const GEOMETRY: Record<string, RoomGeometry> = {
  "room-open-workspace": { x: 20, y: 270, w: 380, h: 130 },
  "room-pantry": { x: 420, y: 270, w: 180, h: 130 },
  "room-meeting": { x: 220, y: 20, w: 200, h: 150 },
  "room-reception": { x: 440, y: 20, w: 160, h: 130 },
  "room-manager-cabin": { x: 20, y: 20, w: 180, h: 130 },
};

export const CORRIDOR: RoomGeometry = { x: 20, y: 190, w: 600, h: 50 };

/** The five stable room IDs from the contract inventory. */
export const KNOWN_ROOM_IDS = Object.keys(GEOMETRY);

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function graceSeconds(
  rules: Record<string, unknown>,
): number | null {
  const v = rules.vacancy_grace_seconds;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function officeHoursSummary(inv: Inventory): string | null {
  const policy = inv.policies.find((p) => p.kind === "office_hours") ?? null;
  if (!policy) return null;
  const days = policy.rules.working_days_iso;
  const open = policy.rules.open_local;
  const close = policy.rules.close_local;
  if (
    !Array.isArray(days) ||
    !days.every((d) => typeof d === "number") ||
    typeof open !== "string" ||
    typeof close !== "string"
  ) {
    return `${policy.policy_id} v${policy.version}`;
  }
  const names = (days as number[])
    .filter((d) => d >= 1 && d <= 7)
    .map((d) => WEEKDAYS[d - 1])
    .join(", ");
  return `${names} ${open}–${close} (${policy.policy_id} v${policy.version})`;
}

/**
 * Display power for a device. nominal_power_w is already the GROUP total for
 * grouped equipment — it is shown as-is and never multiplied by quantity.
 * Nominal power is not measured power.
 */
export function powerLabel(device: Device): string {
  if (device.quantity > 1) {
    return `${device.nominal_power_w} W group total · ${device.quantity} units`;
  }
  return `${device.nominal_power_w} W nominal`;
}

/**
 * Selection resolution across refresh: preserve the previous room when it
 * still exists, otherwise fall back to the first room, else null.
 */
export function resolveSelection(
  roomIds: string[],
  prevId: string | null,
): string | null {
  if (prevId && roomIds.includes(prevId)) return prevId;
  return roomIds[0] ?? null;
}
