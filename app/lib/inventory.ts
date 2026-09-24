// Inventory loading for the office-map screen (P005 / S10-A, Agent A — OpenCode).
// Contract v1.0.1 record shapes. Framework-agnostic (no React imports) so the
// pure functions can be exercised outside a browser.

export interface Room {
  room_id: string;
  name: string;
  room_type: string;
  capacity: number;
  floor_area_m2?: number;
}

export interface Device {
  device_id: string;
  name: string;
  room_id: string;
  device_type: string;
  quantity: number;
  /** Nominal power in W. For grouped equipment this is already the GROUP total. */
  nominal_power_w: number;
  standby_power_w?: number;
  power_factor: number;
  always_on: boolean;
  control: string;
  controls?: string[];
}

export interface Policy {
  policy_id: string;
  version: number;
  applies_to: string;
  kind: string;
  effective_from_utc: string;
  rules: Record<string, unknown>;
}

export interface Inventory {
  rooms: Room[];
  devices: Device[];
  policies: Policy[];
}

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type InventoryOutcome =
  | { ok: true; inventory: Inventory; fetchedAtIso: string }
  | { ok: false; error: string; fetchedAtIso: string };

/** Bounded request time. No polling exists anywhere in S10-A. */
export const INVENTORY_TIMEOUT_MS = 8000;

const DEVICE_TYPES = new Set([
  "lighting",
  "ac",
  "fan",
  "refrigerator",
  "microwave",
  "projector",
  "computer",
  "workstation_group",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function reqString(
  o: Record<string, unknown>,
  key: string,
): string | null {
  const v = o[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function reqInt(
  o: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | null {
  const v = o[key];
  return typeof v === "number" &&
    Number.isInteger(v) &&
    v >= min &&
    v <= max
    ? v
    : null;
}

function reqNum(
  o: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | null {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : null;
}

function reqBool(o: Record<string, unknown>, key: string): boolean | null {
  const v = o[key];
  return typeof v === "boolean" ? v : null;
}

function optNum(
  o: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): number | undefined {
  const v = o[key];
  if (v === undefined) return undefined;
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : undefined;
}

function validateRoom(v: unknown): Room | null {
  if (!isRecord(v)) return null;
  const room_id = reqString(v, "room_id");
  const name = reqString(v, "name");
  const room_type = reqString(v, "room_type");
  const capacity = reqInt(v, "capacity", 0, 500);
  if (!room_id || !name || !room_type || capacity === null) return null;
  const floor = optNum(v, "floor_area_m2", 0, 100000);
  if (v.floor_area_m2 !== undefined && floor === undefined) return null;
  return floor === undefined
    ? { room_id, name, room_type, capacity }
    : { room_id, name, room_type, capacity, floor_area_m2: floor };
}

function validateDevice(v: unknown): Device | null {
  if (!isRecord(v)) return null;
  const device_id = reqString(v, "device_id");
  const name = reqString(v, "name");
  const room_id = reqString(v, "room_id");
  const device_type = reqString(v, "device_type");
  const quantity = reqInt(v, "quantity", 1, 1000);
  const nominal_power_w = reqNum(v, "nominal_power_w", 0, 100000);
  const power_factor = reqNum(v, "power_factor", 0.1, 1.0);
  const always_on = reqBool(v, "always_on");
  const control = reqString(v, "control");
  if (
    !device_id ||
    !name ||
    !room_id ||
    !device_type ||
    quantity === null ||
    nominal_power_w === null ||
    power_factor === null ||
    always_on === null ||
    !control
  ) {
    return null;
  }
  if (!DEVICE_TYPES.has(device_type)) return null;
  if (control !== "manual" && control !== "scheduled" && control !== "always_on") {
    return null;
  }
  const standby = optNum(v, "standby_power_w", 0, 100000);
  if (v.standby_power_w !== undefined && standby === undefined) return null;
  let controls: string[] | undefined;
  if (v.controls !== undefined) {
    if (
      !Array.isArray(v.controls) ||
      !v.controls.every((c) => typeof c === "string")
    ) {
      return null;
    }
    controls = v.controls as string[];
  }
  return {
    device_id,
    name,
    room_id,
    device_type,
    quantity,
    nominal_power_w,
    ...(standby === undefined ? {} : { standby_power_w: standby }),
    power_factor,
    always_on,
    control,
    ...(controls === undefined ? {} : { controls }),
  };
}

function validatePolicy(v: unknown): Policy | null {
  if (!isRecord(v)) return null;
  const policy_id = reqString(v, "policy_id");
  const version = reqInt(v, "version", 1, 1000000);
  const applies_to = reqString(v, "applies_to");
  const kind = reqString(v, "kind");
  const effective_from_utc = reqString(v, "effective_from_utc");
  if (
    !policy_id ||
    version === null ||
    !applies_to ||
    !kind ||
    !effective_from_utc
  ) {
    return null;
  }
  if (
    kind !== "office_hours" &&
    kind !== "lighting_schedule" &&
    kind !== "device_schedule" &&
    kind !== "always_on" &&
    kind !== "occupancy"
  ) {
    return null;
  }
  if (!isRecord(v.rules)) return null;
  return {
    policy_id,
    version,
    applies_to,
    kind,
    effective_from_utc,
    rules: v.rules,
  };
}

/**
 * Validate a GET /api/v1/inventory success envelope:
 * { data: { rooms[], devices[], policies[] }, meta? }.
 * Returns null for HTTP-error-shaped bodies, missing collections, invalid
 * records, or duplicate room/device IDs. Devices that reference an unknown
 * room are KEPT (grouped as unassigned) — they must stay accessible.
 */
export function parseInventoryResponse(json: unknown): Inventory | null {
  if (!isRecord(json)) return null;
  const data = json.data;
  if (!isRecord(data)) return null;
  if (!Array.isArray(data.rooms) || !Array.isArray(data.devices)) return null;
  if (!Array.isArray(data.policies)) return null;
  const rooms: Room[] = [];
  for (const r of data.rooms) {
    const room = validateRoom(r);
    if (!room) return null;
    rooms.push(room);
  }
  const devices: Device[] = [];
  for (const d of data.devices) {
    const device = validateDevice(d);
    if (!device) return null;
    devices.push(device);
  }
  const policies: Policy[] = [];
  for (const p of data.policies) {
    const policy = validatePolicy(p);
    if (!policy) return null;
    policies.push(policy);
  }
  if (new Set(rooms.map((r) => r.room_id)).size !== rooms.length) return null;
  if (new Set(devices.map((d) => d.device_id)).size !== devices.length) {
    return null;
  }
  return { rooms, devices, policies };
}

export interface GroupedInventory {
  byRoom: Map<string, Device[]>;
  /** Devices whose room_id matches no known room. Never dropped. */
  unassigned: Device[];
}

export function groupDevicesByRoom(inv: Inventory): GroupedInventory {
  const byRoom = new Map<string, Device[]>();
  const known = new Set(inv.rooms.map((r) => r.room_id));
  for (const room of inv.rooms) byRoom.set(room.room_id, []);
  const unassigned: Device[] = [];
  for (const device of inv.devices) {
    if (known.has(device.room_id)) {
      byRoom.get(device.room_id)?.push(device);
    } else {
      unassigned.push(device);
    }
  }
  return { byRoom, unassigned };
}

/** Find the device-level policy for a device, if the response resolves one. */
export function policyForDevice(
  inv: Inventory,
  device_id: string,
): Policy | null {
  const ref = `device:${device_id}`;
  return inv.policies.find((p) => p.applies_to === ref) ?? null;
}

/** Find the office-hours policy, if the response resolves one. */
export function officeHoursPolicy(inv: Inventory): Policy | null {
  return inv.policies.find((p) => p.kind === "office_hours") ?? null;
}

export async function fetchInventory(
  origin: string,
  fetchImpl: FetchLike,
  timeoutMs: number = INVENTORY_TIMEOUT_MS,
): Promise<InventoryOutcome> {
  const fetchedAtIso = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/api/v1/inventory`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Inventory request answered HTTP ${res.status}; expected a 2xx response.`,
        fetchedAtIso,
      };
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return {
        ok: false,
        error: "Inventory response was not valid JSON.",
        fetchedAtIso,
      };
    }
    const inventory = parseInventoryResponse(json);
    if (!inventory) {
      return {
        ok: false,
        error:
          "Inventory payload did not match the contract shape (data.rooms/devices/policies with valid records).",
        fetchedAtIso,
      };
    }
    return { ok: true, inventory, fetchedAtIso };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      error: aborted
        ? `Inventory request timed out or was aborted after ${timeoutMs} ms.`
        : err instanceof Error
          ? `Inventory request failed: ${err.message}`
          : "Inventory request failed with an unknown error.",
      fetchedAtIso,
    };
  } finally {
    clearTimeout(timer);
  }
}
