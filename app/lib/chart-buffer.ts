// Bounded telemetry buffer for live simulation graphs (SIM-CHART-01).
// Pure data structures and math for scrolling ECG-style live telemetry.
// Type-strippable TypeScript syntax for node:test compatibility.

import type { Lifecycle, SimState } from "./sim-state";

export type ScopeType = "office" | "room" | "device";

export interface ChartSample {
  sim_time_utc: string;
  sim_time_ms: number;
  seq: number;
  power_w: number | null;
  energy_kwh: number | null;
  status: Lifecycle | "stale" | "unknown";
}

export interface ScopeSeries {
  scope: ScopeType;
  id: string; // "office", or room_id, or device_id
  name: string;
  samples: ChartSample[];
  lastSeq: number;
  lastTimeUtc: string | null;
  latestPowerW: number | null;
  latestEnergyKwh: number | null;
  minPowerW: number | null;
  maxPowerW: number | null;
  hasGaps: boolean;
}

export interface TelemetryBuffer {
  runId: string | null;
  maxSamples: number;
  series: Map<string, ScopeSeries>;
}

export const DEFAULT_MAX_SAMPLES = 600;

export function makeScopeKey(scope: ScopeType, id: string): string {
  return `${scope}:${id}`;
}

export function createTelemetryBuffer(maxSamples: number = DEFAULT_MAX_SAMPLES): TelemetryBuffer {
  return {
    runId: null,
    maxSamples: Math.max(2, maxSamples),
    series: new Map<string, ScopeSeries>(),
  };
}

/** Formats a UTC ISO timestamp as HH:mm:ss in Asia/Kolkata (deterministic). */
export function formatKolkataTime(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return "--:--:--";
  // Asia/Kolkata is UTC+05:30 fixed
  const kolkataOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const kolkataDate = new Date(d.getTime() + kolkataOffsetMs);
  const hours = String(kolkataDate.getUTCHours()).padStart(2, "0");
  const minutes = String(kolkataDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(kolkataDate.getUTCSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

export function formatKolkataDate(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (isNaN(d.getTime())) return "----------";
  const kolkataDate = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
  return `${kolkataDate.getUTCFullYear()}-${String(kolkataDate.getUTCMonth() + 1).padStart(2, "0")}-${String(kolkataDate.getUTCDate()).padStart(2, "0")}`;
}

export function formatKolkataTimestamp(isoUtc: string): string {
  return `${formatKolkataDate(isoUtc)} ${formatKolkataTime(isoUtc)}`;
}

/** Ingests an authoritative SimState sample into the telemetry buffer. */
export function ingestSimState(
  buffer: TelemetryBuffer,
  state: SimState,
  isStale: boolean = false,
  selectedRoomId?: string | null,
  selectedDeviceId?: string | null,
  names?: { rooms?: Record<string, string>; devices?: Record<string, string> }
): TelemetryBuffer {
  const currentRunId = state.run_id ?? null;

  // Run change starts a fresh series for all scopes
  if (buffer.runId !== currentRunId) {
    buffer.runId = currentRunId;
    buffer.series.clear();
    if (!currentRunId) {
      return buffer;
    }
  }

  if (!state.sim_time_utc || state.seq === null) {
    return buffer;
  }

  const timeUtc = state.sim_time_utc;
  const timeMs = new Date(timeUtc).getTime();
  if (isNaN(timeMs)) return buffer;

  const seq = state.seq;
  const status = isStale ? "stale" : state.status;

  // 1. Office scope
  const officePower = state.office?.power_w ?? null;
  const officeEnergy = state.office?.energy_kwh ?? null;
  appendScopeSample(buffer, "office", "office", "Whole Office", {
    sim_time_utc: timeUtc,
    sim_time_ms: timeMs,
    seq,
    power_w: officePower,
    energy_kwh: officeEnergy,
    status,
  });

  // 2. Room scopes (all active rooms in state)
  for (const r of state.rooms) {
    const roomName = names?.rooms?.[r.room_id] ?? r.room_id;
    appendScopeSample(buffer, "room", r.room_id, roomName, {
      sim_time_utc: timeUtc,
      sim_time_ms: timeMs,
      seq,
      power_w: r.power_w ?? null,
      energy_kwh: r.energy_kwh ?? null,
      status,
    });
  }

  // 3. Device scopes (retain every observed device so scope changes do not
  // erase history; the bounded per-series cap below controls retention)
  for (const d of state.devices) {
    const devName = names?.devices?.[d.device_id] ?? d.device_id;
    appendScopeSample(buffer, "device", d.device_id, devName, {
      sim_time_utc: timeUtc,
      sim_time_ms: timeMs,
      seq,
      power_w: d.power_w ?? null,
      energy_kwh: d.energy_kwh ?? null,
      status,
    });
  }

  // Mark every previously observed scope missing from the authoritative state
  // as an explicit null sample. This keeps missing telemetry distinct from a
  // real zero, including scopes that are not currently selected. Include the
  // selected IDs so a selected scope is checked even when its first observation
  // is delayed.
  const roomIds = new Set(state.rooms.map((room) => room.room_id));
  const deviceIds = new Set(state.devices.map((device) => device.device_id));
  const missingRoomIds = new Set(
    [...buffer.series.values()]
      .filter((series) => series.scope === "room" && !roomIds.has(series.id))
      .map((series) => series.id),
  );
  const missingDeviceIds = new Set(
    [...buffer.series.values()]
      .filter((series) => series.scope === "device" && !deviceIds.has(series.id))
      .map((series) => series.id),
  );
  if (selectedRoomId && !roomIds.has(selectedRoomId)) missingRoomIds.add(selectedRoomId);
  if (selectedDeviceId && !deviceIds.has(selectedDeviceId)) missingDeviceIds.add(selectedDeviceId);

  for (const roomId of missingRoomIds) {
    const series = buffer.series.get(makeScopeKey("room", roomId));
    if (!series) continue;
    appendScopeSample(buffer, "room", roomId, series.name, {
      sim_time_utc: timeUtc,
      sim_time_ms: timeMs,
      seq,
      power_w: null,
      energy_kwh: null,
      status,
    });
  }
  for (const deviceId of missingDeviceIds) {
    const series = buffer.series.get(makeScopeKey("device", deviceId));
    if (!series) continue;
    appendScopeSample(buffer, "device", deviceId, series.name, {
      sim_time_utc: timeUtc,
      sim_time_ms: timeMs,
      seq,
      power_w: null,
      energy_kwh: null,
      status,
    });
  }

  return buffer;
}

function appendScopeSample(
  buffer: TelemetryBuffer,
  scope: ScopeType,
  id: string,
  name: string,
  sample: ChartSample
): void {
  const key = makeScopeKey(scope, id);
  let series = buffer.series.get(key);

  if (!series) {
    series = {
      scope,
      id,
      name,
      samples: [],
      lastSeq: -1,
      lastTimeUtc: null,
      latestPowerW: sample.power_w,
      latestEnergyKwh: sample.energy_kwh,
      minPowerW: sample.power_w,
      maxPowerW: sample.power_w,
      hasGaps: sample.power_w === null || sample.energy_kwh === null,
    };
    buffer.series.set(key, series);
  }

  // A stale poll is a graph gap, not a zero-valued telemetry point. Keep the
  // last processed instant visible as stale, but remove its metric values so
  // the SVG path breaks until a fresh sample arrives.
  const point: ChartSample = sample.status === "stale"
    ? { ...sample, power_w: null, energy_kwh: null }
    : sample;

  if (sample.sim_time_utc === series.lastTimeUtc && series.samples.length > 0) {
    if (sample.seq < series.lastSeq) return;
    const previous = series.samples[series.samples.length - 1];

    if (sample.status === "stale") {
      // Repeated stale polls do not create duplicate points; a newer stale
      // sequence still replaces the current point's status.
      if (previous.status !== "stale" || sample.seq > series.lastSeq) {
        series.samples[series.samples.length - 1] = point;
        series.lastSeq = sample.seq;
        series.latestPowerW = point.power_w;
        series.latestEnergyKwh = point.energy_kwh;
        recomputeExtrema(series);
      }
      return;
    }

    if (previous.status === "stale") {
      // Recovery may carry the same sequence because the backend state did not
      // advance while the connection recovered. Append after the explicit gap
      // rather than replacing it and reconnecting the line across the outage.
      if (sample.seq < series.lastSeq) return;
      series.samples.push(point);
      series.lastSeq = sample.seq;
      series.latestPowerW = point.power_w;
      series.latestEnergyKwh = point.energy_kwh;
    } else if (sample.seq > series.lastSeq) {
      series.samples[series.samples.length - 1] = point;
      series.lastSeq = sample.seq;
      series.latestPowerW = point.power_w;
      series.latestEnergyKwh = point.energy_kwh;
    } else {
      return;
    }

    if (series.samples.length > buffer.maxSamples) {
      series.samples.splice(0, series.samples.length - buffer.maxSamples);
    }
    recomputeExtrema(series);
    return;
  }

  // Out-of-order or duplicate seq check: ignore if seq <= lastSeq
  if (sample.seq <= series.lastSeq) {
    return;
  }

  // Add a new sample. Stale points are normalized to null above.
  series.samples.push(point);
  series.lastSeq = point.seq;
  series.lastTimeUtc = point.sim_time_utc;
  series.latestPowerW = point.power_w;
  series.latestEnergyKwh = point.energy_kwh;

  // Bounded buffer eviction
  if (series.samples.length > buffer.maxSamples) {
    series.samples.splice(0, series.samples.length - buffer.maxSamples);
  }

  recomputeExtrema(series);
}

function recomputeExtrema(series: ScopeSeries): void {
  let minP: number | null = null;
  let maxP: number | null = null;
  let hasGaps = false;

  for (const s of series.samples) {
    if (s.power_w === null || s.energy_kwh === null) {
      hasGaps = true;
    }
    if (s.power_w !== null) {
      if (minP === null || s.power_w < minP) minP = s.power_w;
      if (maxP === null || s.power_w > maxP) maxP = s.power_w;
    }
  }

  series.minPowerW = minP;
  series.maxPowerW = maxP;
  series.hasGaps = hasGaps;
}

export function getScopeSeries(
  buffer: TelemetryBuffer,
  scope: ScopeType,
  id: string
): ScopeSeries | null {
  return buffer.series.get(makeScopeKey(scope, id)) ?? null;
}

export interface ChartBounds {
  minVal: number;
  maxVal: number;
  currentVal: number | null;
  minTimeMs: number;
  maxTimeMs: number;
  hasData: boolean;
}

export function calculateChartBounds(
  samples: ChartSample[],
  metric: "power" | "energy"
): ChartBounds {
  if (samples.length === 0) {
    return {
      minVal: 0,
      maxVal: metric === "power" ? 100 : 1,
      currentVal: null,
      minTimeMs: 0,
      maxTimeMs: 1,
      hasData: false,
    };
  }

  let minVal: number | null = null;
  let maxVal: number | null = null;
  let currentVal: number | null = null;
  let minTimeMs = samples[0].sim_time_ms;
  let maxTimeMs = samples[samples.length - 1].sim_time_ms;

  for (const s of samples) {
    const val = metric === "power" ? s.power_w : s.energy_kwh;
    if (val !== null) {
      if (minVal === null || val < minVal) minVal = val;
      if (maxVal === null || val > maxVal) maxVal = val;
      currentVal = val;
    }
    if (s.sim_time_ms < minTimeMs) minTimeMs = s.sim_time_ms;
    if (s.sim_time_ms > maxTimeMs) maxTimeMs = s.sim_time_ms;
  }

  // Handle all nulls
  if (minVal === null || maxVal === null) {
    return {
      minVal: 0,
      maxVal: metric === "power" ? 100 : 1,
      currentVal: null,
      minTimeMs,
      maxTimeMs: maxTimeMs === minTimeMs ? minTimeMs + 60000 : maxTimeMs,
      hasData: false,
    };
  }

  // Time range safety
  if (maxTimeMs === minTimeMs) {
    maxTimeMs = minTimeMs + 60000; // default 1 min window
  }

  // Value range safety: avoid divide-by-zero for flat lines
  if (metric === "power") {
    // Power baseline is 0 unless minVal is high
    const yMin = 0;
    const yMax = maxVal === 0 ? 100 : Math.max(maxVal * 1.15, maxVal + 10);
    return {
      minVal: yMin,
      maxVal: yMax,
      currentVal,
      minTimeMs,
      maxTimeMs,
      hasData: true,
    };
  } else {
    // Energy: cumulative non-negative
    const yMin = 0;
    const yMax = maxVal === 0 ? 0.05 : maxVal * 1.15;
    return {
      minVal: yMin,
      maxVal: yMax,
      currentVal,
      minTimeMs,
      maxTimeMs,
      hasData: true,
    };
  }
}

export interface SvgPathResult {
  segments: string[]; // List of SVG path data "M ... L ..." breaking at null gaps
  points: Array<{ x: number; y: number; val: number; timeUtc: string }>;
  latestPoint: { x: number; y: number; val: number } | null;
  hasGaps: boolean;
}

/** Generates straight SVG polyline segments for crisp ECG-style visualization without fake curve overshoot. */
export function generateSvgPath(
  samples: ChartSample[],
  metric: "power" | "energy",
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  bounds?: ChartBounds
): SvgPathResult {
  const chartBounds = bounds ?? calculateChartBounds(samples, metric);
  const plotWidth = Math.max(10, width - padding.left - padding.right);
  const plotHeight = Math.max(10, height - padding.top - padding.bottom);

  const timeRange = chartBounds.maxTimeMs - chartBounds.minTimeMs;
  const valRange = chartBounds.maxVal - chartBounds.minVal;

  const segments: string[] = [];
  const points: Array<{ x: number; y: number; val: number; timeUtc: string }> = [];
  let currentSegment: string[] = [];
  let latestPoint: { x: number; y: number; val: number } | null = null;
  let hasGaps = false;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const val = metric === "power" ? s.power_w : s.energy_kwh;

    if (val === null) {
      hasGaps = true;
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(" "));
        currentSegment = [];
      }
      continue;
    }

    const tNorm = timeRange > 0 ? (s.sim_time_ms - chartBounds.minTimeMs) / timeRange : 1;
    const vNorm = valRange > 0 ? (val - chartBounds.minVal) / valRange : 0;

    const x = padding.left + tNorm * plotWidth;
    const y = padding.top + (1 - vNorm) * plotHeight;

    points.push({ x, y, val, timeUtc: s.sim_time_utc });
    latestPoint = { x, y, val };

    if (currentSegment.length === 0) {
      currentSegment.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else {
      currentSegment.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(" "));
  }

  return {
    segments,
    points,
    latestPoint,
    hasGaps,
  };
}
