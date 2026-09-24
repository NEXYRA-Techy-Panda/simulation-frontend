// Tests for bounded telemetry buffer and history adapter (SIM-CHART-01).
// Pure node:test checks without external test runners or browser dependencies.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createTelemetryBuffer,
  ingestSimState,
  getScopeSeries,
  formatKolkataTime,
  calculateChartBounds,
  generateSvgPath,
} from "../chart-buffer.ts";
import { adaptRecordedIntervals } from "../history-adapter.ts";

function createMockState(overrides = {}) {
  return {
    status: "running",
    speed: 1,
    run_id: "run-test-01",
    seq: 1,
    sim_time_utc: "2026-01-01T04:30:00Z", // 10:00:00 Asia/Kolkata
    rooms: [
      {
        room_id: "room-meeting",
        occupancy: 2,
        power_w: 120,
        energy_kwh: 0.002,
      },
    ],
    devices: [
      {
        device_id: "dev-meeting-light",
        room_id: "room-meeting",
        on: true,
        power_w: 72,
        override: null,
        energy_kwh: 0.0012,
      },
    ],
    office: {
      power_w: 240,
      energy_kwh: 0.004,
    },
    ...overrides,
  };
}

test("1. Correct units and timestamps in Asia/Kolkata", () => {
  // UTC 2026-01-01 04:30:00Z + 05:30 = 10:00:00
  const timeFormatted = formatKolkataTime("2026-01-01T04:30:00Z");
  assert.equal(timeFormatted, "10:00:00");

  const invalidTime = formatKolkataTime("invalid-timestamp");
  assert.equal(invalidTime, "--:--:--");
});

test("2. Run change resets series", () => {
  const buffer = createTelemetryBuffer(10);
  const state1 = createMockState({ run_id: "run-A", seq: 1 });
  ingestSimState(buffer, state1);

  let series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 1);
  assert.equal(buffer.runId, "run-A");

  // Ingest state from new run
  const state2 = createMockState({ run_id: "run-B", seq: 1 });
  ingestSimState(buffer, state2);

  assert.equal(buffer.runId, "run-B");
  series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 1);
  assert.equal(series?.samples[0].seq, 1);
});

test("3. Out-of-order and duplicate samples are ignored", () => {
  const buffer = createTelemetryBuffer(10);
  ingestSimState(buffer, createMockState({ seq: 5, sim_time_utc: "2026-01-01T04:30:00Z" }));
  
  // Duplicate seq
  ingestSimState(buffer, createMockState({ seq: 5, sim_time_utc: "2026-01-01T04:30:10Z" }));
  // Older seq
  ingestSimState(buffer, createMockState({ seq: 4, sim_time_utc: "2026-01-01T04:30:10Z" }));

  const series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 1);
  assert.equal(series?.lastSeq, 5);
});

test("4. Same-time sequence update updates latest point without creating zero-duration duplicate", () => {
  const buffer = createTelemetryBuffer(10);
  ingestSimState(
    buffer,
    createMockState({ seq: 10, sim_time_utc: "2026-01-01T04:30:00Z", office: { power_w: 200, energy_kwh: 0.01 } })
  );

  // Same timestamp, newer sequence (e.g. command state update at boundary)
  ingestSimState(
    buffer,
    createMockState({ seq: 11, sim_time_utc: "2026-01-01T04:30:00Z", office: { power_w: 500, energy_kwh: 0.01 } })
  );

  const series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 1); // Not duplicated
  assert.equal(series?.latestPowerW, 500);
  assert.equal(series?.lastSeq, 11);
});

test("5. Null vs zero: missing readings remain null (gaps), never zero", () => {
  const buffer = createTelemetryBuffer(10);
  ingestSimState(
    buffer,
    createMockState({
      seq: 1,
      sim_time_utc: "2026-01-01T04:30:00Z",
      office: { power_w: 200, energy_kwh: 0.01 },
    })
  );

  // Office state with missing power
  ingestSimState(
    buffer,
    createMockState({
      seq: 2,
      sim_time_utc: "2026-01-01T04:30:10Z",
      office: { power_w: null, energy_kwh: null },
    })
  );

  const series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 2);
  assert.equal(series?.samples[1].power_w, null);
  assert.notEqual(series?.samples[1].power_w, 0);
  assert.equal(series?.hasGaps, true);

  // SVG path breaks on null gap
  const svg = generateSvgPath(series.samples, "power", 500, 200, { top: 10, right: 10, bottom: 10, left: 10 });
  assert.equal(svg.hasGaps, true);
});

test("6. Paused state does not create fake elapsed time stretch", () => {
  const buffer = createTelemetryBuffer(10);
  ingestSimState(
    buffer,
    createMockState({
      status: "paused",
      seq: 1,
      sim_time_utc: "2026-01-01T04:30:00Z",
    })
  );

  // Poll while paused with same time & seq
  ingestSimState(
    buffer,
    createMockState({
      status: "paused",
      seq: 1,
      sim_time_utc: "2026-01-01T04:30:00Z",
    })
  );

  const series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 1);
});

test("7. Bounded buffer does not exceed maxSamples", () => {
  const buffer = createTelemetryBuffer(5); // Bound to 5
  for (let i = 1; i <= 10; i++) {
    ingestSimState(
      buffer,
      createMockState({
        seq: i,
        sim_time_utc: new Date(Date.UTC(2026, 0, 1, 4, 30, i * 10)).toISOString(),
      })
    );
  }

  const series = getScopeSeries(buffer, "office", "office");
  assert.equal(series?.samples.length, 5);
  // Retains only latest 5
  assert.equal(series?.samples[0].seq, 6);
  assert.equal(series?.samples[4].seq, 10);
});

test("8. Scope isolation: office, room, and device series do not cross-pollinate", () => {
  const buffer = createTelemetryBuffer(10);
  ingestSimState(
    buffer,
    createMockState({
      office: { power_w: 1000, energy_kwh: 0.1 },
      rooms: [{ room_id: "room-meeting", occupancy: 2, power_w: 300, energy_kwh: 0.03 }],
      devices: [{ device_id: "dev-meeting-light", room_id: "room-meeting", on: true, power_w: 72, override: null, energy_kwh: 0.007 }],
    }),
    false,
    "room-meeting",
    "dev-meeting-light"
  );

  const office = getScopeSeries(buffer, "office", "office");
  const room = getScopeSeries(buffer, "room", "room-meeting");
  const device = getScopeSeries(buffer, "device", "dev-meeting-light");

  assert.equal(office?.latestPowerW, 1000);
  assert.equal(room?.latestPowerW, 300);
  assert.equal(device?.latestPowerW, 72);
});

test("9. Flat and zero series do not cause divide-by-zero or NaN in bounds and SVG", () => {
  const bounds = calculateChartBounds(
    [
      { sim_time_utc: "2026-01-01T00:00:00Z", sim_time_ms: 1000, seq: 1, power_w: 0, energy_kwh: 0, status: "running" },
      { sim_time_utc: "2026-01-01T00:00:10Z", sim_time_ms: 2000, seq: 2, power_w: 0, energy_kwh: 0, status: "running" },
    ],
    "power"
  );

  assert.equal(bounds.hasData, true);
  assert.equal(bounds.minVal, 0);
  assert.equal(bounds.maxVal > 0, true);
  assert.equal(isNaN(bounds.maxVal), false);

  const svg = generateSvgPath(
    [
      { sim_time_utc: "2026-01-01T00:00:00Z", sim_time_ms: 1000, seq: 1, power_w: 0, energy_kwh: 0, status: "running" },
      { sim_time_utc: "2026-01-01T00:00:10Z", sim_time_ms: 2000, seq: 2, power_w: 0, energy_kwh: 0, status: "running" },
    ],
    "power",
    500,
    200,
    { top: 10, right: 10, bottom: 10, left: 10 },
    bounds
  );

  assert.equal(svg.segments.length, 1);
  assert.equal(svg.segments[0].includes("NaN"), false);
});

test("10. History adapter distinguishes interval average from peak and respects gaps", () => {
  const intervals = [
    {
      interval_start_utc: "2026-01-01T00:00:00Z",
      interval_end_utc: "2026-01-01T00:01:00Z",
      interval_seconds: 60,
      avg_power_w: 150,
      max_power_w: 300,
      energy_kwh: 0.0025,
      cumulative_kwh: 0.0025,
    },
    // Missing 00:01:00 to 00:02:00 interval (gap)
    {
      interval_start_utc: "2026-01-01T00:02:00Z",
      interval_end_utc: "2026-01-01T00:03:00Z",
      interval_seconds: 60,
      avg_power_w: 150,
      max_power_w: 150,
      energy_kwh: 0.0025,
      cumulative_kwh: 0.005,
    },
  ];

  const adapted = adaptRecordedIntervals("dev-test", intervals);
  assert.equal(adapted.hasGaps, true);
  assert.equal(adapted.maxRecordedPowerW, 300);
  assert.equal(adapted.points.some((p) => p.is_gap), true);
  assert.equal(adapted.totalEnergyKwh, 0.005);
});
