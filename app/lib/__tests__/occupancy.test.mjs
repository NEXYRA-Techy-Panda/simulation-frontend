// SIM-VIS-01 occupancy checks (Agent M-D — FreeBuff).
// Run: npm test (node --test, no dependencies).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SLOTS,
  occupantSlots,
  occupancyView,
} from "../occupancy.ts";
import { animateMockOccupancy, scenarioState } from "../visual-fixtures.ts";

const BOX = { x: 20, y: 350, w: 620, h: 320 };

describe("occupantSlots", () => {
  it("is deterministic for the same room key and box", () => {
    const a = occupantSlots("room-open-workspace", BOX);
    const b = occupantSlots("room-open-workspace", BOX);
    assert.deepEqual(a, b);
  });

  it("produces a stable, different layout for a different room", () => {
    const a = occupantSlots("room-open-workspace", BOX);
    const b = occupantSlots("room-meeting", BOX);
    assert.notDeepEqual(a, b);
  });

  it("keeps every slot inside the supplied box", () => {
    const slots = occupantSlots("room-open-workspace", BOX);
    assert.equal(slots.length, MAX_SLOTS);
    for (const slot of slots) {
      assert.ok(slot.x >= BOX.x && slot.x <= BOX.x + BOX.w, `x ${slot.x}`);
      assert.ok(slot.y >= BOX.y && slot.y <= BOX.y + BOX.h, `y ${slot.y}`);
    }
  });

  it("does not shuffle when called repeatedly across polls", () => {
    const first = occupantSlots("room-pantry", BOX, 6);
    for (let i = 0; i < 5; i += 1) {
      assert.deepEqual(occupantSlots("room-pantry", BOX, 6), first);
    }
  });
});

describe("occupancyView", () => {
  const slots = occupantSlots("room-meeting", BOX);

  it("treats a missing reading as unavailable, not as an empty room", () => {
    assert.equal(occupancyView(undefined, slots).kind, "unavailable");
    assert.equal(occupancyView(null, slots).kind, "unavailable");
  });

  it("treats a negative or non-finite reading as unavailable", () => {
    assert.equal(occupancyView(-1, slots).kind, "unavailable");
    assert.equal(occupancyView(Number.NaN, slots).kind, "unavailable");
  });

  it("reports empty only when zero was actually reported", () => {
    const view = occupancyView(0, slots);
    assert.equal(view.kind, "empty");
    assert.ok(!("figures" in view));
  });

  it("draws exactly the reported count of figures", () => {
    const view = occupancyView(3, slots);
    assert.equal(view.kind, "present");
    if (view.kind === "present") {
      assert.equal(view.count, 3);
      assert.equal(view.figures.length, 3);
    }
  });

  it("never draws more figures than there are stable slots", () => {
    const view = occupancyView(40, slots);
    assert.equal(view.kind, "present");
    if (view.kind === "present") {
      assert.equal(view.count, 40);
      assert.equal(view.figures.length, slots.length);
    }
  });

  it("does not present capacity as occupancy", () => {
    const view = occupancyView(2, slots);
    assert.equal(view.kind, "present");
    if (view.kind === "present") {
      assert.equal(view.count, 2);
      assert.ok(view.label.includes("2"));
    }
  });
});

describe("visual preview fixtures", () => {
  it("uses unavailable telemetry rather than fabricated zeroes for the unknown scenario", () => {
    assert.equal(scenarioState("unavailable"), null);
  });

  it("keeps the always-on refrigerator on in the empty-room fixture", () => {
    const state = scenarioState("empty");
    assert.ok(state);
    assert.ok(state.rooms.every((room) => room.occupancy === 0));
    assert.ok(state.devices.filter((device) => device.device_id.includes("fridge")).every((device) => device.on));
    assert.ok(state.devices.filter((device) => !device.device_id.includes("fridge")).every((device) => !device.on));
  });

  it("moves preview occupants between rooms without changing device readings", () => {
    const base = scenarioState("occupied");
    assert.ok(base);
    const moved = animateMockOccupancy(base, 1);
    const totalBefore = base.rooms.reduce((sum, room) => sum + room.occupancy, 0);
    const totalAfter = moved.rooms.reduce((sum, room) => sum + room.occupancy, 0);
    assert.equal(totalAfter, totalBefore);
    assert.notDeepEqual(moved.rooms.map((room) => room.occupancy), base.rooms.map((room) => room.occupancy));
    assert.deepEqual(moved.devices, base.devices);
    assert.deepEqual(moved.office, base.office);
  });

  it("keeps mock room and office readings equal to their contained devices", () => {
    const state = scenarioState("occupied");
    assert.ok(state);
    for (const room of state.rooms) {
      const devices = state.devices.filter((device) => device.room_id === room.room_id);
      assert.equal(room.power_w, devices.reduce((sum, device) => sum + device.power_w, 0));
      assert.ok(Math.abs(room.energy_kwh - devices.reduce((sum, device) => sum + device.energy_kwh, 0)) < 1e-9);
    }
    assert.equal(state.office.power_w, state.devices.reduce((sum, device) => sum + device.power_w, 0));
    assert.ok(Math.abs(state.office.energy_kwh - state.devices.reduce((sum, device) => sum + device.energy_kwh, 0)) < 1e-9);
  });
});
