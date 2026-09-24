// K004-PREP3 room-environment checks (Agent K-B — FreeBuff).
// Run: npm test  (node --test, no dependencies).
// Backend-shaped fixtures live in tests only — never production data.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ENV_RH_PCT_MAX,
  ENV_RH_PCT_MIN,
  ENV_TEMP_MAX,
  ENV_TEMP_MIN,
  EnvironmentApiError,
  SUPPORTED_AC_POWER_MODEL,
  applyRoomEnvironment,
  createEnvironmentController,
  environmentCapability,
  environmentCommandBody,
  fetchEnvironmentStateExtras,
  parseEnvironmentCommandResult,
  parseEnvironmentStateExtras,
  parseRoomClimate,
  validateClimateInputs,
} from "../environment.ts";

const ACCEPTED = {
  room_id: "room-a",
  seq: 12,
  temp_c: 27,
  rh_pct: 45,
  sim_time_utc: "2025-12-31T18:35:00Z",
  applies_from: "next_step",
};

const envelope = (data) => ({ data });
const respond = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const errorResponse = (status, code, message, field) =>
  respond(status, { error: { code, message, ...(field ? { field } : {}) } });

/** Records calls and replays queued responses. */
function mockFetch(responses) {
  const calls = [];
  const queue = [...responses];
  const impl = async (url, init) => {
    calls.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(init.body) : undefined });
    const next = queue.shift();
    if (!next) throw new Error("mock fetch: no queued response");
    return typeof next === "function" ? next(url, init) : next;
  };
  return { impl, calls };
}

/** A fetch that never answers until the signal aborts. */
function hangingFetch() {
  const calls = [];
  const impl = (url, init) => {
    calls.push({ url, method: init?.method ?? "GET", aborted: false });
    const record = calls[calls.length - 1];
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        record.aborted = true;
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
  };
  return { impl, calls };
}

function controllerHarness({ applyCommand, refreshConfirmed, roomId = "room-a", acPowerModel = SUPPORTED_AC_POWER_MODEL, runId = "run-1", confirmed = { temp_c: 26, rh_pct: 55 }, stale = false } = {}) {
  const states = [];
  const controller = createEnvironmentController({
    applyCommand,
    refreshConfirmed,
    onChange: (s) => states.push(s),
  });
  controller.setContext({ roomId, runId, acPowerModel, confirmed, stale });
  return { controller, states };
}

describe("environment adapter", () => {
  it("posts the exact contract body to the base URL, keeping the public /sim prefix", async () => {
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
        res.end(JSON.stringify(envelope(ACCEPTED)));
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const origin = `http://127.0.0.1:${server.address().port}/sim`;
      const result = await applyRoomEnvironment(origin, "room-a", 27, 45, fetch, 5000);
      assert.deepEqual(seen, [
        { method: "POST", url: "/sim/api/v1/environment", body: { room_id: "room-a", temp_c: 27, rh_pct: 45 } },
      ]);
      assert.deepEqual(result, ACCEPTED);
    } finally {
      server.close();
    }
  });

  it("builds only the three contract fields", () => {
    assert.deepEqual(Object.keys(environmentCommandBody("room-a", 0, 0)).sort(), ["rh_pct", "room_id", "temp_c"]);
    assert.deepEqual(environmentCommandBody("room-a", 0, 0), { room_id: "room-a", temp_c: 0, rh_pct: 0 });
  });

  it("accepts a bare body as well as the envelope and requires every field", () => {
    assert.deepEqual(parseEnvironmentCommandResult(ACCEPTED), ACCEPTED);
    assert.deepEqual(parseEnvironmentCommandResult(envelope(ACCEPTED)), ACCEPTED);
    for (const key of ["room_id", "seq", "temp_c", "rh_pct", "sim_time_utc", "applies_from"]) {
      assert.equal(parseEnvironmentCommandResult({ ...ACCEPTED, [key]: undefined }), null, `${key} is required`);
    }
    assert.equal(parseEnvironmentCommandResult({ ...ACCEPTED, applies_from: "immediately" }), null);
    assert.equal(parseEnvironmentCommandResult({ ...ACCEPTED, sim_time_utc: "nope" }), null);
    assert.equal(parseEnvironmentCommandResult({ ...ACCEPTED, seq: -1 }), null);
    assert.equal(parseEnvironmentCommandResult({ ...ACCEPTED, temp_c: 99 }), null);
    assert.equal(parseEnvironmentCommandResult(null), null);
  });

  it("maps 400/404/409 with the field, without inventing success", async () => {
    const cases = [
      [400, "VALIDATION_ERROR", "temp_c must be within [-30, 60] °C", "temp_c"],
      [404, "NOT_FOUND", 'Room "room-nope" is not part of the current run', "room_id"],
      [409, "CONFLICT", "No simulation run exists; start or reset first", undefined],
    ];
    for (const [status, code, message, field] of cases) {
      const { impl } = mockFetch([errorResponse(status, code, message, field)]);
      await assert.rejects(applyRoomEnvironment("http://x", "room-a", 27, 45, impl, 1000), (err) => {
        assert.ok(err instanceof EnvironmentApiError);
        assert.equal(err.status, status);
        assert.equal(err.code, code);
        assert.equal(err.field, field);
        assert.equal(err.message, message);
        return true;
      });
    }
  });

  it("rejects a mismatched or malformed 2xx acknowledgement", async () => {
    const { impl } = mockFetch([respond(200, envelope({ ...ACCEPTED, room_id: "room-b" }))]);
    await assert.rejects(applyRoomEnvironment("http://x", "room-a", 27, 45, impl, 1000), (err) => {
      assert.equal(err.code, "BAD_RESPONSE");
      return true;
    });
  });

  it("times out with a bounded abort instead of hanging", async () => {
    const { impl, calls } = hangingFetch();
    await assert.rejects(applyRoomEnvironment("http://x", "room-a", 27, 45, impl, 5), (err) => {
      assert.equal(err.code, "TIMEOUT");
      assert.equal(err.status, null);
      return true;
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].aborted, true);
  });
});

describe("environment capability and state extras", () => {
  it("treats missing capability as unsupported, never as assumed support", () => {
    assert.equal(environmentCapability(null, SUPPORTED_AC_POWER_MODEL), "no-run");
    assert.equal(environmentCapability("run-1", SUPPORTED_AC_POWER_MODEL), "supported");
    assert.equal(environmentCapability("run-1", null), "unsupported");
    assert.equal(environmentCapability("run-1", undefined), "unsupported");
    assert.equal(environmentCapability("run-1", "ac-demand-v2"), "unsupported");
  });

  it("reads per-room climate and the model id from a state payload", async () => {
    const legacy = {
      data: {
        status: "paused",
        run_id: "run-old",
        ac_power_model: null,
        rooms: [{ room_id: "room-a", climate: null }],
      },
    };
    const extras = parseEnvironmentStateExtras(legacy);
    assert.ok(extras);
    assert.equal(extras.ac_power_model, null);
    assert.equal(extras.rooms.get("room-a"), null);

    const modern = {
      data: {
        status: "paused",
        run_id: "run-1",
        ac_power_model: SUPPORTED_AC_POWER_MODEL,
        rooms: [
          { room_id: "room-a", climate: { temp_c: 0, rh_pct: 0 } },
          { room_id: "room-b" },
          { room_id: "room-c", climate: { temp_c: 61, rh_pct: 55 } },
        ],
      },
    };
    const parsed = parseEnvironmentStateExtras(modern);
    assert.equal(parsed.ac_power_model, SUPPORTED_AC_POWER_MODEL);
    assert.deepEqual(parsed.rooms.get("room-a"), { temp_c: 0, rh_pct: 0 });
    assert.equal(parsed.rooms.get("room-b"), null);
    assert.equal(parsed.rooms.get("room-c"), null, "out-of-range climate is not reported as a value");

    assert.equal(parseEnvironmentStateExtras({ data: { status: "paused" } }), null);
    assert.deepEqual(parseRoomClimate({ temp_c: ENV_TEMP_MIN, rh_pct: ENV_RH_PCT_MAX }), {
      temp_c: ENV_TEMP_MIN,
      rh_pct: ENV_RH_PCT_MAX,
    });
  });

  it("fetches state extras through the bounded adapter", async () => {
    const { impl, calls } = mockFetch([
      respond(200, envelope({ status: "paused", ac_power_model: SUPPORTED_AC_POWER_MODEL, rooms: [{ room_id: "room-a", climate: ACCEPTED }] })),
    ]);
    const extras = await fetchEnvironmentStateExtras("http://x/sim", impl, 1000);
    assert.equal(calls[0].url, "http://x/sim/api/v1/state");
    assert.deepEqual(extras.rooms.get("room-a"), { temp_c: 27, rh_pct: 45 });
  });
});

describe("input validation", () => {
  it("accepts in-range values including zero and the exact bounds", () => {
    assert.deepEqual(validateClimateInputs("0", "0"), { ok: true, temp_c: 0, rh_pct: 0 });
    assert.deepEqual(validateClimateInputs("26.5", "55"), { ok: true, temp_c: 26.5, rh_pct: 55 });
    assert.deepEqual(validateClimateInputs(String(ENV_TEMP_MIN), String(ENV_RH_PCT_MIN)), {
      ok: true,
      temp_c: ENV_TEMP_MIN,
      rh_pct: ENV_RH_PCT_MIN,
    });
    assert.deepEqual(validateClimateInputs(String(ENV_TEMP_MAX), String(ENV_RH_PCT_MAX)), {
      ok: true,
      temp_c: ENV_TEMP_MAX,
      rh_pct: ENV_RH_PCT_MAX,
    });
  });

  it("rejects blank, non-finite and out-of-range values without clamping", () => {
    for (const [t, rh, field] of [
      ["", "55", "temp_c"],
      ["   ", "55", "temp_c"],
      ["26", "", "rh_pct"],
      ["abc", "55", "temp_c"],
      ["Infinity", "55", "temp_c"],
      ["NaN", "55", "temp_c"],
      ["60.5", "55", "temp_c"],
      ["-30.5", "55", "temp_c"],
      ["26", "100.1", "rh_pct"],
      ["26", "-1", "rh_pct"],
    ]) {
      const result = validateClimateInputs(t, rh);
      assert.equal(result.ok, false, `${t} / ${rh}`);
      assert.equal(result.errors[0].field, field);
      assert.equal(result.errors.some((e) => typeof e.message === "string" && e.message.length > 10), true);
      assert.equal("temp_c" in result, false, "no clamped value is returned on failure");
    }
  });
});

describe("controller", () => {
  it("sends the command and reports only backend-confirmed values", async () => {
    const { impl, calls } = mockFetch([respond(200, envelope(ACCEPTED))]);
    const refreshCalls = [];
    const { controller } = controllerHarness({
      applyCommand: (roomId, temp_c, rh_pct, signal) => applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 1000, signal),
      refreshConfirmed: async (roomId) => {
        refreshCalls.push(roomId);
        return { temp_c: 27, rh_pct: 45 };
      },
    });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    assert.equal(controller.getState().canApply, true);

    const confirmed = await controller.apply();
    assert.equal(confirmed, true);
    assert.deepEqual(calls, [{ url: "http://x/api/v1/environment", method: "POST", body: { room_id: "room-a", temp_c: 27, rh_pct: 45 } }]);
    assert.deepEqual(refreshCalls, ["room-a"]);

    const state = controller.getState();
    assert.equal(state.phase, "accepted");
    assert.deepEqual(state.accepted, ACCEPTED, "the accepted values come from the backend response verbatim");
    assert.equal(state.dirty, false);
    assert.equal(state.tempText, "27");
    assert.equal(state.rhText, "45");
    assert.equal(state.confirmed.temp_c, 27);
    assert.match(state.message, /applies from the next simulated step/);
    assert.match(state.message, /2025-12-31T18:35:00Z/);
  });

  it("does not invent a climate reading when no refresh is available", async () => {
    const { impl } = mockFetch([respond(200, envelope(ACCEPTED))]);
    const { controller } = controllerHarness({
      applyCommand: (roomId, temp_c, rh_pct, signal) => applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 1000, signal),
    });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    await controller.apply();
    const state = controller.getState();
    assert.equal(state.phase, "accepted");
    assert.deepEqual(state.confirmed, { temp_c: 26, rh_pct: 55 }, "parent-provided confirmed climate is unchanged");
  });

  it("prevents duplicate submissions", async () => {
    let release;
    const gate = new Promise((r) => {
      release = r;
    });
    const calls = [];
    const { controller } = controllerHarness({
      applyCommand: async (roomId, temp_c, rh_pct) => {
        calls.push({ roomId, temp_c, rh_pct });
        await gate;
        return ACCEPTED;
      },
    });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    const first = controller.apply();
    const second = controller.apply();
    assert.equal(await second, false, "the second submission is refused while one is pending");
    assert.equal(controller.getState().phase, "pending");
    assert.equal(controller.getState().canApply, false);
    release();
    assert.equal(await first, true);
    assert.equal(calls.length, 1);
  });

  it("validates before sending and preserves entered values", async () => {
    const { impl, calls } = mockFetch([]);
    const { controller } = controllerHarness({
      applyCommand: (roomId, temp_c, rh_pct, signal) => applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 1000, signal),
    });
    controller.setInput("temp_c", "");
    controller.setInput("rh_pct", "55");
    assert.equal(await controller.apply(), false);
    assert.equal(calls.length, 0);
    assert.equal(controller.getState().errors[0].field, "temp_c");
    assert.equal(controller.getState().tempText, "");
    assert.equal(controller.getState().rhText, "55", "the other field keeps its value");

    controller.setInput("temp_c", "0");
    controller.setInput("rh_pct", "0");
    assert.deepEqual(controller.getState().errors, []);
    assert.equal(controller.getState().dirty, true);
  });

  it("refuses to apply with no run, a legacy run, or a stale connection", async () => {
    const calls = [];
    const applyCommand = async () => {
      calls.push(1);
      return ACCEPTED;
    };
    const { controller } = controllerHarness({ applyCommand });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");

    controller.setContext({ runId: null, acPowerModel: null });
    assert.equal(controller.getState().capability, "no-run");
    assert.equal(controller.getState().canApply, false);
    assert.equal(await controller.apply(), false);

    controller.setContext({ runId: "run-old", acPowerModel: null });
    assert.equal(controller.getState().capability, "unsupported");
    assert.equal(controller.getState().canApply, false);
    assert.equal(await controller.apply(), false);

    controller.setContext({ runId: "run-1", acPowerModel: SUPPORTED_AC_POWER_MODEL, stale: true });
    assert.equal(controller.getState().canApply, false);
    assert.equal(await controller.apply(), false);

    controller.setContext({ stale: false });
    assert.equal(controller.getState().canApply, true);
    assert.equal(calls.length, 0, "nothing was sent while unsupported");
  });

  it("drops a late response after the room changes (including A → B → A)", async () => {
    const pending = [];
    const applyCommand = (roomId, temp_c, rh_pct) =>
      new Promise((resolve) => {
        pending.push({ roomId, resolve: () => resolve({ ...ACCEPTED, room_id: roomId, temp_c, rh_pct }) });
      });
    const { controller } = controllerHarness({ applyCommand });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    const inFlight = controller.apply();

    controller.setContext({ roomId: "room-b", confirmed: { temp_c: 21, rh_pct: 60 } });
    assert.equal(controller.getState().tempText, "21", "inputs follow the newly selected room");
    assert.equal(controller.getState().phase, "idle", "the superseded request no longer shows as pending");

    // Back to the first room before the original answer arrives: still stale.
    controller.setContext({ roomId: "room-a", confirmed: { temp_c: 26, rh_pct: 55 } });
    pending[0].resolve();
    assert.equal(await inFlight, false);
    const state = controller.getState();
    assert.equal(state.accepted, null, "a late answer never becomes the accepted command");
    assert.equal(state.message, null);
    assert.equal(state.phase, "idle");
    assert.equal(state.roomId, "room-a");
    assert.equal(state.tempText, "26");
  });

  it("drops a late response after the run changes", async () => {
    const pending = [];
    const applyCommand = (roomId, temp_c, rh_pct) =>
      new Promise((resolve) => {
        pending.push(() => resolve({ ...ACCEPTED, room_id: roomId, temp_c, rh_pct }));
      });
    const { controller } = controllerHarness({ applyCommand });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    const inFlight = controller.apply();
    controller.setContext({ runId: "run-2", confirmed: { temp_c: 24, rh_pct: 50 } });
    pending[0]();
    assert.equal(await inFlight, false);
    assert.equal(controller.getState().accepted, null);
    assert.equal(controller.getState().runId, "run-2");
  });

  it("explains 400/404/409 failures and never retries automatically", async () => {
    for (const [status, code, expected] of [
      [400, "VALIDATION_ERROR", /backend detail \(field: temp_c\)/],
      [404, "NOT_FOUND", /not part of the current run/],
      [409, "CONFLICT", /no environment capability/],
    ]) {
      const { impl, calls } = mockFetch([errorResponse(status, code, "backend detail", status === 400 ? "temp_c" : "room_id")]);
      const { controller } = controllerHarness({
        applyCommand: (roomId, temp_c, rh_pct, signal) => applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 1000, signal),
      });
      controller.setInput("temp_c", "27");
      controller.setInput("rh_pct", "45");
      assert.equal(await controller.apply(), false);
      const state = controller.getState();
      assert.equal(state.phase, "error");
      assert.match(state.message, expected);
      assert.equal(state.tempText, "27", "entered values survive a failure");
      assert.equal(state.rhText, "45");
      assert.equal(calls.length, 1, "no automatic retry");
    }
  });

  it("reports timeout uncertainty and asks for a refresh before retrying", async () => {
    const { impl, calls } = hangingFetch();
    const { controller } = controllerHarness({
      applyCommand: (roomId, temp_c, rh_pct, signal) => applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 5, signal),
    });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    assert.equal(await controller.apply(), false);
    const state = controller.getState();
    assert.equal(state.phase, "error");
    assert.match(state.message, /may not have reached the backend/);
    assert.match(state.message, /No automatic retry was sent/);
    assert.match(state.message, /refresh the state/);
    assert.equal(calls.length, 1);
  });

  it("aborts in flight work on dispose and drops its result", async () => {
    const { impl, calls } = hangingFetch();
    const { controller } = controllerHarness({
      applyCommand: (roomId, temp_c, rh_pct, signal) => applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 10_000, signal),
    });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");
    const inFlight = controller.apply();
    controller.dispose();
    assert.equal(await inFlight, false);
    assert.equal(calls[0].aborted, true);
    assert.equal(controller.getState().accepted, null);
    assert.equal(controller.getState().phase, "idle");
  });

  it("keeps unsaved input when the same room's confirmed climate refreshes", () => {
    const { controller } = controllerHarness({});
    controller.setContext({ confirmed: { temp_c: 26, rh_pct: 55 } });
    assert.equal(controller.getState().tempText, "26");
    controller.setInput("temp_c", "29");
    assert.equal(controller.getState().dirty, true);
    controller.setContext({ confirmed: { temp_c: 26, rh_pct: 55 } });
    assert.equal(controller.getState().tempText, "29", "an unsaved edit is not clobbered by a refresh");
  });
});

// The UI consumes the controller as an external store (useSyncExternalStore), so
// these seams are part of the contract with the component.
describe("controller store seams", () => {
  it("serves a stable snapshot between changes and notifies subscribers", () => {
    const { controller } = controllerHarness({});
    const first = controller.getState();
    assert.equal(controller.getState(), first, "the snapshot is stable until something changes");

    let notifications = 0;
    const unsubscribe = controller.subscribe(() => {
      notifications += 1;
    });
    controller.setInput("temp_c", "29");
    assert.equal(notifications, 1);
    const second = controller.getState();
    assert.notEqual(second, first, "a change produces a new snapshot");
    assert.equal(first.tempText, "26", "an earlier snapshot is never mutated afterwards");
    assert.equal(second.tempText, "29");

    unsubscribe();
    controller.setInput("rh_pct", "45");
    assert.equal(notifications, 1, "no notifications are delivered after unsubscribe");
  });

  it("configure swaps the request handler while the controller keeps its state", async () => {
    const { impl, calls } = mockFetch([respond(200, envelope(ACCEPTED))]);
    const controller = createEnvironmentController();
    controller.setContext({ roomId: "room-a", runId: "run-1", acPowerModel: SUPPORTED_AC_POWER_MODEL });
    controller.setInput("temp_c", "27");
    controller.setInput("rh_pct", "45");

    assert.equal(await controller.apply(), false);
    assert.equal(calls.length, 0, "with no handler nothing is sent and nothing is faked");
    assert.equal(controller.getState().phase, "error");

    controller.configure({
      applyCommand: (roomId, temp_c, rh_pct, signal) =>
        applyRoomEnvironment("http://x", roomId, temp_c, rh_pct, impl, 1000, signal),
    });
    assert.equal(controller.getState().tempText, "27", "configure keeps the values already entered");
    assert.equal(await controller.apply(), true);
    assert.deepEqual(calls, [
      { url: "http://x/api/v1/environment", method: "POST", body: { room_id: "room-a", temp_c: 27, rh_pct: 45 } },
    ]);
    assert.equal(controller.getState().phase, "accepted");
  });

  it("stays quiet after dispose and reads as inert", () => {
    const controller = createEnvironmentController();
    controller.setContext({ roomId: "room-a", runId: "run-1", acPowerModel: SUPPORTED_AC_POWER_MODEL });
    let notifications = 0;
    controller.subscribe(() => {
      notifications += 1;
    });
    controller.dispose();
    assert.equal(notifications, 0, "nothing is emitted once disposed");
    assert.equal(controller.getState().canApply, false);
  });
});
