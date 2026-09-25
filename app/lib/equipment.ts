// SIM-VIS-01 device → illustration mapping (Agent M-D — FreeBuff).
//
// Presentation only. This module never derives power, energy, or on/off state
// from a device type or a nominal rating — an unknown runtime state stays
// unknown and is labelled unavailable. Framework agnostic and dependency free
// so it can be exercised outside a browser.

import type { Device } from "./inventory";
import type { DeviceState } from "./sim-state";

export type GlyphKind =
  | "light"
  | "fan"
  | "ac"
  | "projector"
  | "display"
  | "refrigerator"
  | "microwave"
  | "workstation"
  | "generic";

const GLYPH_BY_TYPE: Record<string, GlyphKind> = {
  lighting: "light",
  fan: "fan",
  ac: "ac",
  projector: "projector",
  computer: "display",
  refrigerator: "refrigerator",
  microwave: "microwave",
  workstation_group: "workstation",
};

/** Map a contract device_type to an original illustration. Unknown → generic. */
export function glyphKindFor(deviceType: string): GlyphKind {
  return GLYPH_BY_TYPE[deviceType] ?? "generic";
}

/** Human-readable name of the drawn equipment, used as a text alternative. */
export const GLYPH_LABEL: Record<GlyphKind, string> = {
  light: "ceiling light",
  fan: "ceiling fan",
  ac: "air-conditioning unit",
  projector: "projector",
  display: "computer",
  refrigerator: "refrigerator",
  microwave: "microwave",
  workstation: "workstation desk",
  generic: "device",
};

export interface DeviceVisualState {
  /** True only when the backend supplied a runtime reading for this device. */
  known: boolean;
  on: boolean;
  /** A manual override is currently active (backend-reported). */
  overridden: boolean;
  /** Always-on exception taken from the inventory policy flag. */
  alwaysOn: boolean;
}

/**
 * Resolve what may be drawn for a device. Missing runtime data is "unknown",
 * never "off": an unknown device is drawn neutral and labelled unavailable.
 */
export function visualStateFor(
  runtime: DeviceState | null | undefined,
  alwaysOn = false,
): DeviceVisualState {
  if (!runtime) {
    return { known: false, on: false, overridden: false, alwaysOn };
  }
  return {
    known: true,
    on: runtime.on === true,
    overridden: runtime.override !== null && runtime.override.active === true,
    alwaysOn,
  };
}

/**
 * Short state word for the map and legend. Colour is never the only signal:
 * this label is always rendered or exposed as accessible text.
 */
export function stateLabel(state: DeviceVisualState): string {
  if (!state.known) return "unavailable";
  if (state.on) return state.overridden ? "on (manual)" : "on";
  return "off";
}

/**
 * How many decorative desks to draw for a workstation group. This is a drawing
 * count only — it is never used to multiply nominal power, and each desk is
 * bound to the same single group device.
 */
export function decorativeUnitCount(quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.min(Math.round(quantity), 8);
}

/**
 * Inventory summary for a device. nominal_power_w is already the whole-group
 * rating, so it is shown as-is and never multiplied by quantity again.
 */
export function groupSummary(device: Device): string {
  if (device.quantity > 1) {
    return `${device.quantity} units · ${device.nominal_power_w} W group total`;
  }
  return `${device.nominal_power_w} W nominal`;
}

/**
 * Split a room's devices into ones the plan can place and ones it cannot, so a
 * real device is never silently dropped from the map.
 */
export function partitionPlaceable<T>(
  devices: readonly Device[],
  placement: (deviceId: string) => T | null,
): { placed: Array<{ device: Device; at: T }>; unplaced: Device[] } {
  const placed: Array<{ device: Device; at: T }> = [];
  const unplaced: Device[] = [];
  for (const device of devices) {
    const at = placement(device.device_id);
    if (at === null) unplaced.push(device);
    else placed.push({ device, at });
  }
  return { placed, unplaced };
}
