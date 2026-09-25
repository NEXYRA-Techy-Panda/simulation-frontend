// SIM-VIS-01 deterministic occupant placement (Agent M-D — FreeBuff).
//
// Figures are drawn only from a confirmed backend room occupancy. The layout is
// a stable decorative function of the room key, so people do not shuffle on
// every poll. Capacity is never presented as occupancy, a missing occupancy is
// "unavailable" (not an empty room), and a reported zero is a genuinely empty
// room. Self-contained (no cross-module imports) so node:test can strip types.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OccupantSlot {
  x: number;
  y: number;
  /** Palette/facing hint so repeated figures are not identical clones. */
  variant: number;
}

/** The contract's largest demo capacity; more figures are never drawn at once. */
export const MAX_SLOTS = 12;

function hashKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * A stable list of figure positions inside a room's interior box. The same key
 * and box always produce the same slots, on every render and every machine.
 */
export function occupantSlots(
  key: string,
  box: Box,
  count: number = MAX_SLOTS,
): OccupantSlot[] {
  const rand = lcg(hashKey(key));
  const slots: OccupantSlot[] = [];
  const columns = 4;
  const rows = Math.ceil(count / columns);
  const padX = 34;
  const padY = 30;
  const cellW = Math.max(1, (box.w - padX * 2) / Math.max(1, columns - 1));
  const cellH = Math.max(1, (box.h - padY * 2) / Math.max(1, rows - 1));
  for (let i = 0; i < count; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const jitterX = (rand() - 0.5) * Math.min(18, cellW * 0.3);
    const jitterY = (rand() - 0.5) * Math.min(14, cellH * 0.3);
    slots.push({
      x: box.x + padX + col * cellW + jitterX,
      y: box.y + padY + row * cellH + jitterY,
      variant: Math.floor(rand() * 4),
    });
  }
  return slots;
}

export type OccupancyView =
  | { kind: "unavailable"; label: string }
  | { kind: "empty"; label: string }
  | { kind: "present"; count: number; label: string; figures: OccupantSlot[] };

/**
 * Resolve what may be drawn for a room.
 *
 * - no reading            → unavailable (explicitly NOT an empty room)
 * - a reported zero       → empty
 * - a positive reading    → that many figures at deterministic positions
 *
 * A negative or non-finite reading is treated as unavailable rather than
 * fabricated as zero.
 */
export function occupancyView(
  occupancy: number | null | undefined,
  slots: OccupantSlot[],
): OccupancyView {
  if (
    occupancy === null ||
    occupancy === undefined ||
    !Number.isFinite(occupancy) ||
    occupancy < 0
  ) {
    return { kind: "unavailable", label: "occupancy unavailable" };
  }
  if (occupancy === 0) {
    return { kind: "empty", label: "no people reported" };
  }
  const count = Math.round(occupancy);
  const figures = slots.slice(0, Math.min(count, slots.length));
  const capped =
    count > slots.length ? `${slots.length}+ shown, ${count} reported` : `${count}`;
  return {
    kind: "present",
    count,
    label: `${capped} ${count === 1 ? "person" : "people"} reported`,
    figures,
  };
}
