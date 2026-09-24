// Room environment controls logic (K004-PREP3, Agent K-B — FreeBuff).
//
// Backend dependency: simulation-backend branch `kishore/k004-environment-prep`
// (commit 13d59b6) — contract `POST /api/v1/environment` with the closed body
// { room_id, temp_c, rh_pct } (all three required) and a success envelope whose
// data carries { room_id, seq, temp_c, rh_pct, sim_time_utc, applies_from }.
//
// Framework-agnostic and dependency-free (like sim-state.ts / health.ts) so the
// pure functions AND the controller state machine run under node:test. Because
// node's type stripping resolves real file paths, this module deliberately has
// no relative imports — it defines its own error type instead of importing
// SimApiError, and the caller passes the sanitized backend origin in.
//
// It never calls Python or the auditor, never computes power/energy/readings,
// and never invents a seq, timestamp or climate value.

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

/** Contract bounds for room climate (dataset.schema.json / migration 001). */
export const ENV_TEMP_MIN = -30;
export const ENV_TEMP_MAX = 60;
export const ENV_RH_PCT_MIN = 0;
export const ENV_RH_PCT_MAX = 100;

/** Bounded request time for the command (same bound as the other commands). */
export const ENVIRONMENT_TIMEOUT_MS = 15000;

/** The only AC power model this UI may claim support for. Missing = unsupported. */
export const SUPPORTED_AC_POWER_MODEL = "ac-demand-v1";

/** The backend applies a climate command from the next simulated step. */
export const ENVIRONMENT_APPLIES_FROM = "next_step";

export interface RoomClimate {
  temp_c: number;
  rh_pct: number;
}

export interface EnvironmentCommandResult {
  room_id: string;
  seq: number;
  temp_c: number;
  rh_pct: number;
  sim_time_utc: string;
  applies_from: string;
}

/** Per-room climate + model capability read from GET /api/v1/state. */
export interface EnvironmentStateExtras {
  ac_power_model: string | null;
  /** room_id -> confirmed climate, or null when the backend reported none. */
  rooms: Map<string, RoomClimate | null>;
}

export type EnvironmentCapability = "no-run" | "unsupported" | "supported";
export type EnvironmentField = "temp_c" | "rh_pct";

export interface EnvironmentFieldError {
  field: EnvironmentField;
  message: string;
}

export type ClimateValidation =
  | { ok: true; temp_c: number; rh_pct: number }
  | { ok: false; errors: EnvironmentFieldError[] };

/** HTTP/transport failure for environment commands. Never fabricated as success. */
export class EnvironmentApiError extends Error {
  status: number | null;
  code: string | null;
  field?: string;

  constructor(message: string, status: number | null, code: string | null = null, field?: string) {
    super(message);
    this.name = "EnvironmentApiError";
    this.status = status;
    this.code = code;
    if (field !== undefined) this.field = field;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Accept a bare body or a { data } envelope (the backend uses the envelope). */
function unwrap(json: unknown): Record<string, unknown> | null {
  if (!isRecord(json)) return null;
  if (isRecord(json.data)) return json.data;
  return json;
}

function finiteInRange(map: Record<string, unknown>, key: string, min: number, max: number): number | null {
  const v = map[key];
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/** Strict parse of one per-room climate; null when absent or out of bounds. */
export function parseRoomClimate(value: unknown): RoomClimate | null {
  if (!isRecord(value)) return null;
  const temp_c = finiteInRange(value, "temp_c", ENV_TEMP_MIN, ENV_TEMP_MAX);
  const rh_pct = finiteInRange(value, "rh_pct", ENV_RH_PCT_MIN, ENV_RH_PCT_MAX);
  if (temp_c === null || rh_pct === null) return null;
  return { temp_c, rh_pct };
}

/**
 * Capability of the displayed run. A missing/unknown model id means the feature
 * is NOT available — never assume support for an older backend or a legacy run.
 */
export function environmentCapability(runId: unknown, acPowerModel: unknown): EnvironmentCapability {
  if (typeof runId !== "string" || runId.length === 0) return "no-run";
  if (acPowerModel !== SUPPORTED_AC_POWER_MODEL) return "unsupported";
  return "supported";
}

/** Read the additive environment fields out of a GET /api/v1/state payload. */
export function parseEnvironmentStateExtras(json: unknown): EnvironmentStateExtras | null {
  const o = unwrap(json);
  if (!o) return null;
  if (!Array.isArray(o.rooms)) return null;
  const rooms = new Map<string, RoomClimate | null>();
  for (const entry of o.rooms) {
    if (!isRecord(entry) || typeof entry.room_id !== "string" || entry.room_id.length === 0) continue;
    rooms.set(entry.room_id, parseRoomClimate(entry.climate));
  }
  return {
    ac_power_model: typeof o.ac_power_model === "string" ? o.ac_power_model : null,
    rooms,
  };
}

/**
 * Validate one room's temperature/humidity text. Blank, non-finite and
 * out-of-range values are REJECTED with an actionable message — never clamped
 * and never coerced. Zero is a valid value for both fields.
 */
export function validateClimateInputs(tempText: unknown, rhText: unknown): ClimateValidation {
  const errors: EnvironmentFieldError[] = [];
  const parse = (text: unknown, field: EnvironmentField, min: number, max: number, unit: string): number | null => {
    if (typeof text !== "string") {
      errors.push({ field, message: `${field} is required (${min}–${max} ${unit}).` });
      return null;
    }
    const trimmed = text.trim();
    if (trimmed === "") {
      errors.push({ field, message: `Enter a value for ${field} (${min}–${max} ${unit}); blank is not accepted.` });
      return null;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value)) {
      errors.push({ field, message: `${field} must be a finite number (${min}–${max} ${unit}).` });
      return null;
    }
    if (value < min || value > max) {
      errors.push({ field, message: `${field} must be within ${min}–${max} ${unit}; got ${value}. Values are not clamped.` });
      return null;
    }
    return value;
  };
  const temp_c = parse(tempText, "temp_c", ENV_TEMP_MIN, ENV_TEMP_MAX, "°C");
  const rh_pct = parse(rhText, "rh_pct", ENV_RH_PCT_MIN, ENV_RH_PCT_MAX, "%");
  if (temp_c === null || rh_pct === null) return { ok: false, errors };
  return { ok: true, temp_c, rh_pct };
}

/** Exact contract request body: all three fields, nothing else. */
export function environmentCommandBody(
  roomId: string,
  temp_c: number,
  rh_pct: number,
): { room_id: string; temp_c: number; rh_pct: number } {
  return { room_id: roomId, temp_c, rh_pct };
}

/** Strict parse of the command acknowledgement (every field is required). */
export function parseEnvironmentCommandResult(json: unknown): EnvironmentCommandResult | null {
  const o = unwrap(json);
  if (!o) return null;
  const room_id = typeof o.room_id === "string" && o.room_id.length > 0 ? o.room_id : null;
  const seq = typeof o.seq === "number" && Number.isInteger(o.seq) && o.seq >= 0 ? o.seq : null;
  const temp_c = finiteInRange(o, "temp_c", ENV_TEMP_MIN, ENV_TEMP_MAX);
  const rh_pct = finiteInRange(o, "rh_pct", ENV_RH_PCT_MIN, ENV_RH_PCT_MAX);
  const sim_time_utc = typeof o.sim_time_utc === "string" && !Number.isNaN(Date.parse(o.sim_time_utc))
    ? o.sim_time_utc
    : null;
  const applies_from = o.applies_from === ENVIRONMENT_APPLIES_FROM ? o.applies_from : null;
  if (!room_id || seq === null || temp_c === null || rh_pct === null || !sim_time_utc || !applies_from) {
    return null;
  }
  return { room_id, seq, temp_c, rh_pct, sim_time_utc, applies_from };
}

async function readErrorBody(res: { status: number; json: () => Promise<unknown> }): Promise<{
  code?: string;
  message?: string;
  field?: string;
}> {
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

function combineSignals(timeoutSignal: AbortSignal, external?: AbortSignal): AbortSignal {
  return external ? AbortSignal.any([timeoutSignal, external]) : timeoutSignal;
}

/**
 * POST /api/v1/environment. `origin` is the sanitized backend base (it may carry
 * the public /sim prefix — route paths are appended to it, never rewritten).
 * Bounded timeout; an aborted external signal is reported as ABORTED, a local
 * timeout as TIMEOUT, so callers can explain the difference honestly.
 */
export async function applyRoomEnvironment(
  origin: string,
  roomId: string,
  temp_c: number,
  rh_pct: number,
  fetchImpl: FetchLike,
  timeoutMs: number = ENVIRONMENT_TIMEOUT_MS,
  externalSignal?: AbortSignal,
): Promise<EnvironmentCommandResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = combineSignals(controller.signal, externalSignal);
  try {
    const res = await fetchImpl(`${origin}/api/v1/environment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(environmentCommandBody(roomId, temp_c, rh_pct)),
      signal,
    });
    if (!res.ok) {
      const detail = await readErrorBody(res);
      throw new EnvironmentApiError(
        detail.message ?? `Environment command answered HTTP ${res.status}.`,
        res.status,
        detail.code ?? null,
        detail.field,
      );
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new EnvironmentApiError("Environment command answered 2xx but the body was not valid JSON.", res.status, "BAD_RESPONSE");
    }
    const parsed = parseEnvironmentCommandResult(json);
    if (!parsed || parsed.room_id !== roomId) {
      throw new EnvironmentApiError("Environment command answered 2xx but the body was malformed.", res.status, "BAD_RESPONSE");
    }
    return parsed;
  } catch (err) {
    if (err instanceof EnvironmentApiError) throw err;
    const name = err instanceof Error ? err.name : "";
    if (externalSignal?.aborted) {
      throw new EnvironmentApiError("Environment command was superseded or cancelled.", null, "ABORTED");
    }
    if (name === "AbortError") {
      throw new EnvironmentApiError(`Environment command timed out or was aborted after ${timeoutMs} ms.`, null, "TIMEOUT");
    }
    throw new EnvironmentApiError(
      err instanceof Error ? `Environment command failed: ${err.message}` : "Environment command failed with an unknown error.",
      null,
      "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Bounded GET /api/v1/state read of the additive environment fields only. */
export async function fetchEnvironmentStateExtras(
  origin: string,
  fetchImpl: FetchLike,
  timeoutMs: number = ENVIRONMENT_TIMEOUT_MS,
): Promise<EnvironmentStateExtras> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${origin}/api/v1/state`, { signal: controller.signal });
    if (!res.ok) {
      const detail = await readErrorBody(res);
      throw new EnvironmentApiError(
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
      throw new EnvironmentApiError("State response was not valid JSON.", res.status, "BAD_RESPONSE");
    }
    const extras = parseEnvironmentStateExtras(json);
    if (!extras) {
      throw new EnvironmentApiError("State payload did not carry the expected rooms array.", res.status, "BAD_RESPONSE");
    }
    return extras;
  } catch (err) {
    if (err instanceof EnvironmentApiError) throw err;
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new EnvironmentApiError(
      aborted ? `State request timed out or aborted after ${timeoutMs} ms.` : "State request failed.",
      null,
      aborted ? "TIMEOUT" : "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------------ controller

export type EnvironmentPhase = "idle" | "pending" | "accepted" | "error";

export interface EnvironmentContext {
  roomId: string | null;
  runId: string | null;
  acPowerModel: unknown;
  confirmed: RoomClimate | null;
  stale: boolean;
}

export interface EnvironmentControllerState {
  roomId: string | null;
  runId: string | null;
  capability: EnvironmentCapability;
  stale: boolean;
  confirmed: RoomClimate | null;
  tempText: string;
  rhText: string;
  /** True when the inputs differ from the last confirmed/accepted values. */
  dirty: boolean;
  phase: EnvironmentPhase;
  errors: EnvironmentFieldError[];
  message: string | null;
  accepted: EnvironmentCommandResult | null;
  canApply: boolean;
}

export interface EnvironmentControllerDeps {
  /** Performs the command; tests inject a mock. */
  applyCommand?: (roomId: string, temp_c: number, rh_pct: number, signal: AbortSignal) => Promise<EnvironmentCommandResult>;
  /** Authoritative refresh of the confirmed climate for a room. */
  refreshConfirmed?: (roomId: string) => Promise<RoomClimate | null>;
  onChange?: (state: EnvironmentControllerState) => void;
}

/** Handlers the UI keeps current after mount (origin, fetch, timeout, refresh). */
export interface EnvironmentControllerHandlers {
  applyCommand?: EnvironmentControllerDeps["applyCommand"];
  refreshConfirmed?: EnvironmentControllerDeps["refreshConfirmed"];
}

export interface EnvironmentController {
  /** Latest immutable snapshot; stable between changes (useSyncExternalStore). */
  getState: () => EnvironmentControllerState;
  /** Notifies listeners after every visible change; returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void;
  /** Room/run/capability/confirmed/stale updates from the parent. */
  setContext: (patch: Partial<EnvironmentContext>) => void;
  setInput: (field: EnvironmentField, text: string) => void;
  /** Returns true only when the backend confirmed the command for this context. */
  apply: () => Promise<boolean>;
  /**
   * Replaces the injected handlers without re-creating the controller, so a
   * caller can keep them pointed at its current props while the controller
   * keeps its state. Nothing is emitted.
   */
  configure: (patch: EnvironmentControllerHandlers) => void;
  dispose: () => void;
}

const formatValue = (n: number): string => String(n);

/**
 * Explicit state machine for the environment controls. It owns: capability
 * gating, validation, duplicate prevention, request cancellation, stale-response
 * rejection across room/run changes (including A→B→A) and honest error text.
 * It never retries automatically and never invents backend values.
 */
export function createEnvironmentController(deps: EnvironmentControllerDeps = {}): EnvironmentController {
  const state: EnvironmentControllerState = {
    roomId: null,
    runId: null,
    capability: "no-run",
    stale: false,
    confirmed: null,
    tempText: "",
    rhText: "",
    dirty: false,
    phase: "idle",
    errors: [],
    message: null,
    accepted: null,
    canApply: false,
  };

  let epoch = 0;
  let inFlight: AbortController | null = null;
  let disposed = false;
  /** Raw capability field as supplied by the parent; never assumed. */
  let acPowerModelRaw: unknown = null;

  const snapshotOf = (s: EnvironmentControllerState): EnvironmentControllerState => ({
    ...s,
    errors: [...s.errors],
  });
  /** Cached snapshot: the same object until something actually changed. */
  let snapshot = snapshotOf(state);
  const listeners = new Set<() => void>();
  const handlers: EnvironmentControllerHandlers = {
    applyCommand: deps.applyCommand,
    refreshConfirmed: deps.refreshConfirmed,
  };

  const emit = () => {
    state.canApply =
      state.capability === "supported" && !state.stale && state.roomId !== null && state.phase !== "pending";
    snapshot = snapshotOf(state);
    if (disposed) return;
    deps.onChange?.(snapshot);
    for (const listener of listeners) listener();
  };

  const applyConfirmedToInputs = (force: boolean) => {
    if (!force && state.dirty) return;
    state.tempText = state.confirmed ? formatValue(state.confirmed.temp_c) : "";
    state.rhText = state.confirmed ? formatValue(state.confirmed.rh_pct) : "";
    state.dirty = false;
  };

  const cancelInFlight = () => {
    inFlight?.abort();
    inFlight = null;
    if (state.phase === "pending") state.phase = "idle";
  };

  const setContext = (patch: Partial<EnvironmentContext>) => {
    const previousRoom = state.roomId;
    const previousRun = state.runId;
    if (patch.roomId !== undefined) state.roomId = patch.roomId;
    if (patch.runId !== undefined) state.runId = patch.runId;
    if (patch.acPowerModel !== undefined) acPowerModelRaw = patch.acPowerModel;
    if (patch.confirmed !== undefined) state.confirmed = patch.confirmed;
    if (patch.stale !== undefined) state.stale = patch.stale;
    state.capability = environmentCapability(state.runId, acPowerModelRaw);

    const roomChanged = state.roomId !== previousRoom;
    const runChanged = state.runId !== previousRun;
    if (roomChanged || runChanged) {
      // A new room or run makes every in-flight answer obsolete: abort it and
      // drop its result, so an old response can never overwrite fresh inputs.
      epoch += 1;
      cancelInFlight();
      state.errors = [];
      state.message = null;
      state.accepted = null;
      applyConfirmedToInputs(true);
    } else if (patch.confirmed !== undefined) {
      applyConfirmedToInputs(false);
    }
    emit();
  };

  const setInput = (field: EnvironmentField, text: string) => {
    if (field === "temp_c") state.tempText = text;
    else state.rhText = text;
    state.dirty = true;
    state.errors = state.errors.filter((e) => e.field !== field);
    if (state.phase === "error") {
      state.phase = "idle";
      state.message = null;
    }
    emit();
  };

  const apply = async (): Promise<boolean> => {
    if (state.capability !== "supported" || state.stale || state.roomId === null) return false;
    if (state.phase === "pending") return false; // duplicate submission guard
    const roomId = state.roomId;
    const validation = validateClimateInputs(state.tempText, state.rhText);
    if (!validation.ok) {
      state.errors = validation.errors;
      state.phase = "idle";
      state.message = null;
      emit();
      return false;
    }
    const execute = handlers.applyCommand;
    if (!execute) {
      state.phase = "error";
      state.message = "Environment command is not wired to a backend URL.";
      emit();
      return false;
    }

    const requestEpoch = epoch;
    const controller = new AbortController();
    inFlight = controller;
    state.phase = "pending";
    state.errors = [];
    state.message = null;
    emit();

    try {
      const result = await execute(roomId, validation.temp_c, validation.rh_pct, controller.signal);
      if (disposed || requestEpoch !== epoch || result.room_id !== state.roomId) return false;
      state.accepted = result;
      state.dirty = false;
      state.tempText = formatValue(result.temp_c);
      state.rhText = formatValue(result.rh_pct);
      state.phase = "accepted";
      state.message = `Accepted at simulated ${result.sim_time_utc} (seq ${result.seq}) — applies from the next simulated step.`;
      emit();

      const refresh = handlers.refreshConfirmed;
      if (refresh) {
        try {
          const refreshed = await refresh(roomId);
          if (!disposed && requestEpoch === epoch && refreshed && state.roomId === roomId) {
            state.confirmed = refreshed;
            applyConfirmedToInputs(false);
            emit();
          }
        } catch {
          // A refresh failure is not a command failure; the accepted result stands.
        }
      }
      return true;
    } catch (err) {
      // A superseded/unmounted request must not touch the current context.
      if (disposed || requestEpoch !== epoch) return false;
      if (err instanceof EnvironmentApiError && err.code === "ABORTED") {
        state.phase = "idle";
        emit();
        return false;
      }
      state.phase = "error";
      state.message = describeApplyFailure(err);
      emit();
      return false;
    } finally {
      if (inFlight === controller) inFlight = null;
    }
  };

  emit();
  return {
    getState: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setContext,
    setInput,
    apply,
    configure: (patch) => {
      if (patch.applyCommand !== undefined) handlers.applyCommand = patch.applyCommand;
      if (patch.refreshConfirmed !== undefined) handlers.refreshConfirmed = patch.refreshConfirmed;
    },
    dispose: () => {
      disposed = true;
      epoch += 1;
      inFlight?.abort();
      inFlight = null;
      // Nothing is emitted after dispose; keep the readable state coherent.
      if (state.phase === "pending") state.phase = "idle";
      state.canApply = false;
      snapshot = snapshotOf(state);
    },
  };
}

/** Honest, actionable failure text. Uncertainty is never hidden. */
export function describeApplyFailure(err: unknown): string {
  if (err instanceof EnvironmentApiError) {
    const detail = err.message;
    if (err.code === "TIMEOUT") {
      return `Apply may not have reached the backend: ${detail} No automatic retry was sent — refresh the state, check the confirmed climate, and retry only if it did not change.`;
    }
    if (err.code === "UNREACHABLE") {
      return `Apply did not reach the backend: ${detail} The command was not confirmed; refresh before retrying.`;
    }
    if (err.status === 409) {
      return `${detail} This run has no environment capability (no run, or a run created before the environment model). Start or reset to create an environment-capable run — this panel never resets the run for you.`;
    }
    if (err.status === 404) {
      return `${detail} The selected room is not part of the current run; select another room.`;
    }
    if (err.status === 400) {
      return `${detail}${err.field ? ` (field: ${err.field})` : ""}`;
    }
    return detail;
  }
  return err instanceof Error ? `Apply failed: ${err.message}` : "Apply failed with an unknown error.";
}
