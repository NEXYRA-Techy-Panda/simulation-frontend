// P009 simulator state checks (Agent A — OpenCode).
// Run: npm test  (node --test, no dependencies).
// Contract/P004-shaped fixtures live in tests only — never production data.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  backoffForFailures,
  commandDevice,
  createSingleFlight,
  describeInstant,
  deviceBody,
  fetchSimState,
  isSpeedValue,
  parseCommandSummary,
  parseDeviceCommandResult,
  parseSpeedCommandResult,
  parseSimState,
  resetRun,
  pauseBody,
  resetBody,
  resumeBody,
  setSpeed,
  shouldApplyUpdate,
  speedBody,
  startBody,
  ENGINE_START_UTC,
} from "../sim-state.ts";
import { SimApiError } from "../sim-state.ts";

const RUNNING = {
  data: {
    status: "running",
    speed: 60,
    run_id: "run-abc",
    seq: 42,
    sim_time_utc: "2025-12-31T18:35:00Z",
    step_seconds: 10,
    rooms: [
      { room_id: "room-a", occupancy: 3, power_w: 672, energy_kwh: 0.05 },
      { room_id: "room-b", occupancy: 0, power_w: 150, energy_kwh: 0.01 },
    ],
    devices: [
      { device_id: "light-a", room_id: "room-a", on: true, power_w: 600, override: null, energy_kwh: 0.04 },
      { device_id: "fridge-b", room_id: "room-b", on: true, power_w: 150, override: { active: true, on: true }, energy_kwh: 0.01 },
      { device_id: "ghost-x", room_id: "room-nowhere", on: false, power_w: 0, override: null, energy_kwh: 0 },
    ],
    office: { power_w: 822, energy_kwh: 0.06 },
    partial_interval: { start_utc: "2025-12-31T18:35:00Z", covered_seconds: 20 },
  },
};

const NO_RUN = {
  data: {
    status: "not_initialized",
    speed: 1,
    run_id: null,
    seq: null,
    sim_time_utc: null,
    rooms: [],
    devices: [],
    office: null,
  },
};

describe("state parsing", () => {
  it("parses a running state with readings", () => {
    const s = parseSimState(RUNNING);
    assert.ok(s);
    assert.equal(s.run_id, "run-abc");
    assert.equal(s.seq, 42);
    assert.equal(s.rooms[0].occupancy, 3);
    assert.equal(s.devices[1].override?.on, true);
    assert.equal(s.office?.power_w, 822);
  });

  it("keeps unknown runtime devices instead of crashing", () => {
    const s = parseSimState(RUNNING);
    assert.ok(s?.devices.some((d) => d.device_id === "ghost-x"));
  });

  it("parses the no-run shape with nulls (never zeros)", () => {
    const s = parseSimState(NO_RUN);
    assert.ok(s);
    assert.equal(s.run_id, null);
    assert.equal(s.seq, null);
    assert.equal(s.sim_time_utc, null);
    assert.deepEqual(s.rooms, []);
    assert.equal(s.office, null);
  });

  it("rejects malformed states", () => {
    assert.equal(parseSimState({ data: { ...NO_RUN.data, status: "flying" } }), null);
    assert.equal(parseSimState({ data: { ...NO_RUN.data, speed: 5 } }), null);
    assert.equal(parseSimState({ data: { ...RUNNING.data, sim_time_utc: null } }), null);
    assert.equal(parseSimState({ data: { ...RUNNING.data, rooms: [{ room_id: "x" }] } }), null);
    assert.equal(
      parseSimState({ data: { ...RUNNING.data, devices: [{ ...RUNNING.data.devices[0], on: "yes" }] } }),
      null,
    );
    assert.equal(parseSimState({ nope: true }), null);
    assert.equal(parseSimState(null), null);
  });

  it("accepts bare bodies as well as envelopes", () => {
    assert.ok(parseSimState(NO_RUN.data));
    assert.ok(parseSimState(RUNNING.data)?.office);
  });

  it("validates speeds strictly", () => {
    assert.ok(isSpeedValue(1000) && !isSpeedValue(5) && !isSpeedValue("60"));
  });
});

describe("command shapes", () => {
  it("builds exact P004 bodies", () => {
    assert.deepEqual(startBody(60), { speed: 60 });
    assert.deepEqual(resumeBody(), {});
    assert.deepEqual(pauseBody(), {});
    assert.deepEqual(resetBody(), {});
    assert.deepEqual(speedBody(100), { speed: 100 });
    assert.deepEqual(deviceBody("on"), { manual_state: "on" });
    assert.deepEqual(deviceBody("off"), { manual_state: "off" });
    assert.deepEqual(deviceBody("clear"), { clear_override: true });
  });

  it("parses lifecycle and speed-only command summaries", () => {
    const s = parseCommandSummary({
      data: { run_id: "r", seq: 1, sim_time_utc: ENGINE_START_UTC, status: "running", speed: 60 },
    });
    assert.ok(s && s.run_id === "r" && s.speed === 60);
    const speedOnly = parseSpeedCommandResult({ data: { speed: 60 } });
    assert.ok(speedOnly && speedOnly.speed === 60);
    assert.equal(parseCommandSummary({ data: { speed: 60 } }), null);
    assert.equal(parseCommandSummary({ data: { run_id: "r" } }), null);
    assert.equal(
      parseCommandSummary({
        data: { run_id: "r", seq: 1, sim_time_utc: ENGINE_START_UTC, status: "running" },
      }),
      null,
    );
    assert.equal(
      parseCommandSummary({
        data: { run_id: null, seq: 0, sim_time_utc: ENGINE_START_UTC, status: "paused", speed: 1 },
      }),
      null,
    );
    assert.equal(parseSpeedCommandResult({ data: { speed: 60 } }, 1), null);
    const d = parseDeviceCommandResult({
      data: { device_id: "light-a", override: { active: true, on: true }, seq: 7, sim_time_utc: ENGINE_START_UTC },
    });
    assert.ok(d && d.override?.on === true);
    const cleared = parseDeviceCommandResult({
      data: { device_id: "light-a", override: null, seq: 8, sim_time_utc: ENGINE_START_UTC },
    });
    assert.ok(cleared && cleared.override === null);
  });
});

describe("clocks from one instant", () => {
  it("drives analogue angles and digital text from the same instant", () => {
    const v = describeInstant("2025-12-31T18:35:00Z");
    assert.ok(v);
    // 18:35Z = 00:05 IST next day: hour hand just past 12, minute at 1.
    assert.ok(Math.abs(v.hourAngle - ((0 + 5 / 60) * 30)) < 1e-9);
    assert.ok(Math.abs(v.minuteAngle - 30) < 1e-9);
    assert.equal(v.secondAngle, 0);
    assert.match(v.timePart, /^00:05:00$/);
  });

  it("rolls the calendar date over in Asia/Kolkata", () => {
    const v = describeInstant(ENGINE_START_UTC);
    assert.ok(v);
    assert.equal(v.datePart, "Thu, 01 Jan 2026");
    assert.equal(v.timePart, "00:00:00");
    assert.ok(v.tzAbbrev.length > 0); // ICU-dependent ("GMT+5:30" here); zone shown from BUILDING_TIMEZONE
  });

  it("is deterministic and rejects garbage", () => {
    const a = describeInstant(ENGINE_START_UTC);
    const b = describeInstant(ENGINE_START_UTC);
    assert.deepEqual(a, b);
    assert.equal(describeInstant("not-a-time"), null);
  });
});

describe("poll tracking", () => {
  it("ignores older sequences within a run", () => {
    const t0 = { run_id: "r", seq: 10 };
    assert.equal(shouldApplyUpdate(t0, { run_id: "r", seq: 9 }).apply, false);
    assert.equal(shouldApplyUpdate(t0, { run_id: "r", seq: 10 }).apply, true);
    assert.equal(shouldApplyUpdate(t0, { run_id: "r", seq: 11 }).apply, true);
  });

  it("resets tracking on run change without cross-run comparison", () => {
    const r = shouldApplyUpdate({ run_id: "old", seq: 9999 }, { run_id: "new", seq: 0 });
    assert.equal(r.apply, true);
    assert.deepEqual(r.tracked, { run_id: "new", seq: 0 });
  });

  it("backs off exponentially with a cap", () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5, 9].map(backoffForFailures),
      [1000, 2000, 4000, 8000, 15000, 15000, 15000],
    );
  });

  it("single-flight prevents overlap", () => {
    const g = createSingleFlight();
    assert.equal(g.tryAcquire(), true);
    assert.equal(g.tryAcquire(), false);
    g.release();
    assert.equal(g.tryAcquire(), true);
    g.release();
  });
});

describe("mock fetch behaviour", () => {
  it("maps 404/409/400 codes without fake state", async () => {
    const notFound = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: "NOT_FOUND", message: "nope" } }),
    });
    await assert.rejects(commandDevice("http://x", "dev-nope", "on", notFound, 1000), (e) => {
      assert.ok(e instanceof SimApiError && e.status === 404 && e.code === "NOT_FOUND");
      return true;
    });
    const bad = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: "VALIDATION_ERROR", message: "bad", field: "speed" } }),
    });
    await assert.rejects(setSpeed("http://x", 60, bad, 1000), (e) => {
      assert.ok(e instanceof SimApiError && e.code === "VALIDATION_ERROR" && e.field === "speed");
      return true;
    });
  });

  it("does not accept a speed-only acknowledgement for reset", async () => {
    const response = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { speed: 60 } }),
    });
    await assert.rejects(resetRun("http://x", response, 1000), (e) => {
      assert.ok(e instanceof SimApiError && e.status === 200 && e.code === "BAD_RESPONSE");
      return true;
    });
  });

  it("refused connections throw, never return partial state", async () => {
    const down = async () => {
      throw new TypeError("fetch failed");
    };
    await assert.rejects(fetchSimState("http://x", down, 1000), (e) => {
      assert.ok(e instanceof SimApiError && e.code === "UNREACHABLE");
      return true;
    });
  });

  it("wires exact URLs and JSON bodies end to end (temp-port mock)", async () => {
    const { default: http } = await import("node:http");
    const seen = [];
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => {
        raw += c;
      });
      req.on("end", () => {
        seen.push({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : undefined });
        res.writeHead(200, { "content-type": "application/json" });
        if (req.url === "/api/v1/control/speed") {
          // The live contract intentionally returns only the changed speed.
          res.end(JSON.stringify({ data: { speed: 60 } }));
        } else {
          res.end(JSON.stringify(RUNNING));
        }
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const s = await setSpeed(origin, 60, fetch, 5000);
      assert.equal(s.speed, 60);
      const st = await fetchSimState(origin, fetch, 5000);
      assert.equal(st.run_id, "run-abc");
      assert.deepEqual(
        seen.map((x) => [x.method, x.url]),
        [
          ["POST", "/api/v1/control/speed"],
          ["GET", "/api/v1/state"],
        ],
      );
      assert.deepEqual(seen[0].body, { speed: 60 });
    } finally {
      server.close();
    }
  });
});
