// Simulator state + control logic (P009 / S9/K1-UI, Agent A — OpenCode).
// Shapes follow the accepted P004 implementation (backend commit 93da205)
// and contract v1.0.1. Framework-agnostic and dependency-free so the pure
// functions run under node:test (type-strippable syntax only).

export type Lifecycle = "not_initialized" | "paused" | "running";
export type Speed = 1 | 2 | 10 | 60 | 100 | 1000;

export const SPEEDS: Speed[] = [1, 2, 10, 60, 100, 1000];
export const BUILDING_TIMEZONE = "Asia/Kolkata";
/** Fixed P004 engine start instant (2026-01-01 00:00 Asia/Kolkata). */
export const ENGINE_START_UTC = "2025-12-31T18:30:00Z";

export const STATE_TIMEOUT_MS = 8000;
export const COMMAND_TIMEOUT_MS = 15000;
export const POLL_INTERVAL_MS = 1000;
export const MAX_BACKOFF_MS = 15000;

export interface DeviceState {
  device_id: string;
  room_id: string;
  on: boolean;
  power_w: number;
  override: { active: boolean; on: boolean } | null;
  energy_kwh: number;
}

export interface RoomState {
  room_id: string;
  occupancy: number;
  power_w: number;
  energy_kwh: number;
}

export interface OfficeState {
  power_w: number;
  energy_kwh: number;
}

export interface SimState {
  status: Lifecycle;
  speed: Speed;
  run_id: string | null;
  seq: number | null;
  sim_time_utc: string | null;
  rooms: RoomState[];
  devices: DeviceState[];
  office: OfficeState | null;
}

/** HTTP or transport failure. Never fabricated as successful state. */
export class SimApiError extends Error {
  status: number | null;
  code: string | null;
  field?: string;

  constructor(
    message: string,
    status: number | null,
    code: string | null = null,
    field?: string,
  ) {
    super(message);
    this.name = "SimApiError";
    this.status = status;
    this.code = code;
    if (field !== undefined) this.field = field;
  }
}

export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: BodyInit | null;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Accept a bare body or a { data } envelope (P004 uses the envelope). */
function unwrap(json: unknown): Record<string, unknown> | null {
  if (!isRecord(json)) return null;
  if (isRecord(json.data)) return json.data;
  return json;
}

function reqString(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function reqFinite(
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

function reqBool(o: Record<string, unknown>, key: string): boolean | null {
  const v = o[key];
  return typeof v === "boolean" ? v : null;
}

function isLifecycle(v: unknown): v is Lifecycle {
  return v === "not_initialized" || v === "paused" || v === "running";
}

export function isSpeedValue(v: unknown): v is Speed {
  return v === 1 || v === 2 || v === 10 || v === 60 || v === 100 || v === 1000;
}

function parseOverride(v: unknown): DeviceState["override"] | undefined {
  if (v === null) return null;
  if (!isRecord(v)) return undefined;
  if (v.active !== true || typeof v.on !== "boolean") return undefined;
  return { active: true, on: v.on };
}

function parseDevice(v: unknown): DeviceState | null {
  if (!isRecord(v)) return null;
  const device_id = reqString(v, "device_id");
  const room_id = reqString(v, "room_id");
  const on = reqBool(v, "on");
  const power_w = reqFinite(v, "power_w", 0, 1e9);
  const energy_kwh = reqFinite(v, "energy_kwh", 0, 1e12);
  const override = parseOverride(v.override);
  if (
    !device_id ||
    !room_id ||
    on === null ||
    power_w === null ||
    power_w < 0 ||
    energy_kwh === null ||
    energy_kwh < 0 ||
    override === undefined
  ) {
    return null;
  }
  return { device_id, room_id, on, power_w, override, energy_kwh };
}

function parseRoom(v: unknown): RoomState | null {
  if (!isRecord(v)) return null;
  const room_id = reqString(v, "room_id");
  const occupancy = reqInt(v, "occupancy", 0, 1000);
  const power_w = reqFinite(v, "power_w", 0, 1e9);
  const energy_kwh = reqFinite(v, "energy_kwh", 0, 1e12);
  if (
    !room_id ||
    occupancy === null ||
    power_w === null ||
    power_w < 0 ||
    energy_kwh === null ||
    energy_kwh < 0
  ) {
    return null;
  }
  return { room_id, occupancy, power_w, energy_kwh };
}

/**
 * Validate a GET /api/v1/state body. No-run shape requires null run/seq/time
 * with empty rooms/devices and null office. With a run, sim_time_utc/seq and
 * all record fields are required. Unknown runtime rooms/devices are KEPT
 * (the UI discloses mismatches instead of crashing). Missing values are never
 * defaulted to zero — the whole payload is rejected instead.
 */
export function parseSimState(json: unknown): SimState | null {
  const o = unwrap(json);
  if (!o) return null;
  const status = o.status;
  if (!isLifecycle(status)) return null;
  if (!isSpeedValue(o.speed)) return null;
  const run_id = o.run_id === null ? null : reqString(o, "run_id");
  if (run_id === null && o.run_id !== null) return null;
  const seq =
    o.seq === null ? null : typeof o.seq === "number" && Number.isInteger(o.seq) && o.seq >= 0 ? o.seq : null;
  if (seq === null && o.seq !== null) return null;
  const sim_time_utc =
    o.sim_time_utc === null ? null : reqString(o, "sim_time_utc");
  if (sim_time_utc === null && o.sim_time_utc !== null) return null;
  if (!Array.isArray(o.rooms) || !Array.isArray(o.devices)) return null;
  if (run_id === null) {
    if (
      seq !== null ||
      sim_time_utc !== null ||
      o.rooms.length !== 0 ||
      o.devices.length !== 0 ||
      o.office !== null
    ) {
      return null;
    }
    return {
      status,
      speed: o.speed,
      run_id,
      seq,
      sim_time_utc,
      rooms: [],
      devices: [],
      office: null,
    };
  }
  if (seq === null || sim_time_utc === null) return null;
  if (Number.isNaN(Date.parse(sim_time_utc))) return null;
  const rooms: RoomState[] = [];
  for (const r of o.rooms) {
    const room = parseRoom(r);
    if (!room) return null;
    rooms.push(room);
  }
  const devices: DeviceState[] = [];
  for (const d of o.devices) {
    const device = parseDevice(d);
    if (!device) return null;
    devices.push(device);
  }
  if (!isRecord(o.office)) return null;
  const power_w = reqFinite(o.office, "power_w", 0, 1e9);
  const energy_kwh = reqFinite(o.office, "energy_kwh", 0, 1e12);
  if (power_w === null || power_w < 0 || energy_kwh === null || energy_kwh < 0) {
    return null;
  }
  return {
    status,
    speed: o.speed,
    run_id,
    seq,
    sim_time_utc,
    rooms,
    devices,
    office: { power_w, energy_kwh },
  };
}

// ------------------------------------------------------------------ commands

export type DeviceControlBody =
  | { manual_state: "on" | "off" }
  | { clear_override: true };

export function startBody(speed: Speed): { speed: Speed } {
  return { speed };
}

export function resumeBody(): Record<string, never> {
  return {};
}

export function pauseBody(): Record<string, never> {
  return {};
}

export function resetBody(): Record<string, never> {
  return {};
}

export function speedBody(speed: Speed): { speed: Speed } {
  return { speed };
}

export function deviceBody(on: "on" | "off" | "clear"): DeviceControlBody {
  return on === "clear" ? { clear_override: true } : { manual_state: on };
}

export async function readErrorBody(res: {
  status: number;
  json: () => Promise<unknown>;
}): Promise<{ code?: string; message?: string; field?: string }> {
  try {
    const body = await res.json();
    const err = isRecord(body) && isRecord(body.error) ? body.error : body;
    if (!isRecord(err)) return {};
    return {
      code: typeof err.code === "string" ? err.code : undefined,
      message: typeof err.message === "string" ? err.message : undefined,
      field: typeof err.field === "string" ? err.field : undefined,
    };
  } catch {
    return {};
  }
}

export async function postJson(
  origin: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
  timeoutMs: number,
  fallback: string,
): Promise<{ data: Record<string, unknown>; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await readErrorBody(res);
      throw new SimApiError(
        detail.message ?? `${fallback} (HTTP ${res.status}).`,
        res.status,
        detail.code ?? null,
        detail.field,
      );
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new SimApiError(
        `${fallback}: response was not valid JSON.`,
        res.status,
        "BAD_RESPONSE",
      );
    }
    const data = unwrap(json);
    if (!data) {
      throw new SimApiError(
        `${fallback}: response body was malformed.`,
        res.status,
        "BAD_RESPONSE",
      );
    }
    return { data, status: res.status };
  } catch (err) {
    if (err instanceof SimApiError) throw err;
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new SimApiError(
      aborted
        ? `${fallback}: timed out or aborted after ${timeoutMs} ms.`
        : err instanceof Error
          ? `${fallback}: ${err.message}`
          : `${fallback}: unknown error.`,
      null,
      aborted ? "TIMEOUT" : "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
  }
}

export interface CommandSummary {
  run_id: string | null;
  seq: number | null;
  sim_time_utc: string | null;
  status: Lifecycle;
  speed: Speed;
}

/** The speed endpoint intentionally returns only the changed speed. */
export interface SpeedCommandResult {
  speed: Speed;
}

/** Parse the full lifecycle summary returned by start/pause/resume/reset. */
export function parseCommandSummary(json: unknown): CommandSummary | null {
  const o = unwrap(json);
  if (!o) return null;
  if (o.run_id === undefined || o.seq === undefined || o.sim_time_utc === undefined || o.status === undefined) {
    return null;
  }

  const run_id = reqString(o, "run_id");
  const seq = reqInt(o, "seq", 0, Number.MAX_SAFE_INTEGER);
  const sim_time_utc = reqString(o, "sim_time_utc");
  if (!run_id || seq === null || !sim_time_utc) return null;
  if (Number.isNaN(Date.parse(sim_time_utc))) return null;
  if (!isLifecycle(o.status) || !isSpeedValue(o.speed)) return null;

  return {
    run_id,
    seq,
    sim_time_utc,
    status: o.status,
    speed: o.speed,
  };
}

/** Parse the intentionally lightweight speed acknowledgement. */
export function parseSpeedCommandResult(
  json: unknown,
  expectedSpeed?: Speed,
): SpeedCommandResult | null {
  const o = unwrap(json);
  if (!o || !isSpeedValue(o.speed)) return null;
  if (expectedSpeed !== undefined && o.speed !== expectedSpeed) return null;
  return { speed: o.speed };
}

export interface DeviceCommandResult {
  device_id: string;
  override: { active: boolean; on: boolean } | null;
  seq: number;
  sim_time_utc: string;
}

export function parseDeviceCommandResult(json: unknown): DeviceCommandResult | null {
  const o = unwrap(json);
  if (!o) return null;
  const device_id = reqString(o, "device_id");
  const override = parseOverride(o.override);
  const seq = reqInt(o, "seq", 0, Number.MAX_SAFE_INTEGER);
  const sim_time_utc = reqString(o, "sim_time_utc");
  if (!device_id || override === undefined || seq === null || !sim_time_utc) {
    return null;
  }
  return { device_id, override, seq, sim_time_utc };
}

async function sendCommand(
  origin: string,
  path: string,
  body: unknown,
  fetchImpl: FetchLike,
  timeoutMs: number,
  fallback: string,
): Promise<CommandSummary> {
  const { data, status } = await postJson(
    origin,
    path,
    body,
    fetchImpl,
    timeoutMs,
    fallback,
  );
  const parsed = parseCommandSummary(data);
  if (!parsed) {
    throw new SimApiError(
      `${fallback}: response body was malformed.`,
      status,
      "BAD_RESPONSE",
    );
  }
  return parsed;
}

async function sendSpeedCommand(
  origin: string,
  speed: Speed,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<SpeedCommandResult> {
  const { data, status } = await postJson(
    origin,
    "/api/v1/control/speed",
    speedBody(speed),
    fetchImpl,
    timeoutMs,
    "Speed change failed",
  );
  const parsed = parseSpeedCommandResult(data, speed);
  if (!parsed) {
    throw new SimApiError(
      "Speed change failed: response body was malformed.",
      status,
      "BAD_RESPONSE",
    );
  }
  return parsed;
}

export function startRun(origin: string, speed: Speed, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return sendCommand(origin, "/api/v1/control/start", startBody(speed), fetchImpl, timeoutMs, "Start failed");
}
export function pauseRun(origin: string, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return sendCommand(origin, "/api/v1/control/pause", pauseBody(), fetchImpl, timeoutMs, "Pause failed");
}
export function resumeRun(origin: string, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return sendCommand(origin, "/api/v1/control/resume", resumeBody(), fetchImpl, timeoutMs, "Resume failed");
}
export function resetRun(origin: string, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return sendCommand(origin, "/api/v1/control/reset", resetBody(), fetchImpl, timeoutMs, "Reset failed");
}
export function setSpeed(origin: string, speed: Speed, fetchImpl: FetchLike, timeoutMs = COMMAND_TIMEOUT_MS) {
  return sendSpeedCommand(origin, speed, fetchImpl, timeoutMs);
}

export async function commandDevice(
  origin: string,
  deviceId: string,
  control: "on" | "off" | "clear",
  fetchImpl: FetchLike,
  timeoutMs = COMMAND_TIMEOUT_MS,
): Promise<DeviceCommandResult> {
  const { data, status } = await postJson(
    origin,
    `/api/v1/devices/${encodeURIComponent(deviceId)}`,
    deviceBody(control),
    fetchImpl,
    timeoutMs,
    "Device command failed",
  );
  const parsed = parseDeviceCommandResult(data);
  if (!parsed || parsed.device_id !== deviceId) {
    throw new SimApiError(
      "Device command answered 2xx but the body was malformed.",
      status,
      "BAD_RESPONSE",
    );
  }
  return parsed;
}

export async function fetchSimState(
  origin: string,
  fetchImpl: FetchLike,
  timeoutMs: number = STATE_TIMEOUT_MS,
): Promise<SimState> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/api/v1/state`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await readErrorBody(res);
      throw new SimApiError(
        detail.message ?? `State request answered HTTP ${res.status}.`,
        res.status,
        detail.code ?? null,
        detail.field,
      );
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new SimApiError("State response was not valid JSON.", res.status, "BAD_RESPONSE");
    }
    const parsed = parseSimState(json);
    if (!parsed) {
      throw new SimApiError(
        "State payload did not match the contract shape.",
        res.status,
        "BAD_RESPONSE",
      );
    }
    return parsed;
  } catch (err) {
    if (err instanceof SimApiError) throw err;
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new SimApiError(
      aborted
        ? `State request timed out or aborted after ${timeoutMs} ms.`
        : err instanceof Error
          ? `State request failed: ${err.message}`
          : "State request failed with an unknown error.",
      null,
      aborted ? "TIMEOUT" : "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------ poll tracking

export interface TrackedState {
  run_id: string | null;
  seq: number | null;
}

/**
 * Decide whether an incoming state replaces the displayed one.
 * - A different run_id always applies and resets sequence tracking (sequences
 *   are per-run counters and are never compared across runs).
 * - Within a run, only seq >= last applied seq applies (equal covers
 *   no-op refetches).
 */
export function shouldApplyUpdate(
  tracked: TrackedState,
  incoming: { run_id: string | null; seq: number | null },
): { apply: boolean; tracked: TrackedState } {
  if (incoming.run_id !== tracked.run_id) {
    return { apply: true, tracked: { run_id: incoming.run_id, seq: incoming.seq } };
  }
  if (incoming.seq === null || tracked.seq === null) {
    return { apply: true, tracked: { run_id: incoming.run_id, seq: incoming.seq } };
  }
  if (incoming.seq >= tracked.seq) {
    return { apply: true, tracked: { run_id: incoming.run_id, seq: incoming.seq } };
  }
  return { apply: false, tracked };
}

/** Backoff delay after n consecutive failures (1s base, 15s cap). */
export function backoffForFailures(failures: number): number {
  if (failures <= 0) return POLL_INTERVAL_MS;
  return Math.min(POLL_INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS);
}

/**
 * Single-flight guard so polls and commands never overlap themselves.
 * Returns true when the caller owns the slot; call release() when done.
 */
export function createSingleFlight(): {
  tryAcquire: () => boolean;
  release: () => void;
} {
  let busy = false;
  return {
    tryAcquire: () => {
      if (busy) return false;
      busy = true;
      return true;
    },
    release: () => {
      busy = false;
    },
  };
}

// ------------------------------------------------------------------- clocks

export interface InstantView {
  isoUtc: string;
  /** e.g. "Thu, 01 Jan 2026" (Asia/Kolkata calendar date). */
  datePart: string;
  /** e.g. "00:00:00" (Asia/Kolkata wall time). */
  timePart: string;
  /** e.g. "IST". */
  tzAbbrev: string;
  hour24: number;
  minute: number;
  second: number;
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
}

/**
 * Describe one backend instant for BOTH clocks. Pure function of the input —
 * the UI never uses computer time as simulation time and never advances the
 * display independently. Returns null for unparseable input.
 */
export function describeInstant(isoUtc: string): InstantView | null {
  const t = Date.parse(isoUtc);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUILDING_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(d);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour24 = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  if (![hour24, minute, second].every((n) => Number.isInteger(n))) return null;
  return {
    isoUtc,
    datePart: `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`,
    timePart: `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
    tzAbbrev: get("timeZoneName"),
    hour24,
    minute,
    second,
    hourAngle: ((hour24 % 12) + minute / 60 + second / 3600) * 30,
    minuteAngle: (minute + second / 60) * 6,
    secondAngle: second * 6,
  };
}
