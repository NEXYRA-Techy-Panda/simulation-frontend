// SIM-VIS-01 device → illustration mapping checks (Agent M-D — FreeBuff).
// Run: npm test (node --test, no dependencies). Fixtures live in tests only.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  decorativeUnitCount,
  glyphKindFor,
  groupSummary,
  isSwitchControllable,
  partitionPlaceable,
  stateLabel,
  visualStateFor,
} from "../equipment.ts";

describe("glyphKindFor", () => {
  it("maps every contract device type to an original illustration", () => {
    assert.equal(glyphKindFor("lighting"), "light");
    assert.equal(glyphKindFor("fan"), "fan");
    assert.equal(glyphKindFor("ac"), "ac");
    assert.equal(glyphKindFor("projector"), "projector");
    assert.equal(glyphKindFor("computer"), "display");
    assert.equal(glyphKindFor("refrigerator"), "refrigerator");
    assert.equal(glyphKindFor("microwave"), "microwave");
    assert.equal(glyphKindFor("workstation_group"), "workstation");
  });

  it("falls back to a generic glyph for an unknown device type", () => {
    assert.equal(glyphKindFor("sensor"), "generic");
    assert.equal(glyphKindFor(""), "generic");
  });
});

describe("visualStateFor / stateLabel", () => {
  it("treats a missing reading as unavailable, never as off", () => {
    const state = visualStateFor(null);
    assert.equal(state.known, false);
    assert.equal(state.on, false);
    assert.equal(stateLabel(state), "unavailable");
  });

  it("distinguishes a reported off from an unknown state", () => {
    const off = visualStateFor({
      device_id: "d",
      room_id: "r",
      on: false,
      power_w: 0,
      energy_kwh: 0,
      override: null,
    });
    assert.equal(off.known, true);
    assert.equal(stateLabel(off), "off");
  });

  it("marks a manual override in the state word", () => {
    const on = visualStateFor({
      device_id: "d",
      room_id: "r",
      on: true,
      power_w: 72,
      energy_kwh: 0.1,
      override: { active: true, on: true },
    });
    assert.equal(stateLabel(on), "on (manual)");
    assert.equal(on.overridden, true);
  });

  it("an inactive override is not treated as overridden", () => {
    const on = visualStateFor({
      device_id: "d",
      room_id: "r",
      on: true,
      power_w: 72,
      energy_kwh: 0.1,
      override: null,
    });
    assert.equal(stateLabel(on), "on");
  });

  it("carries the always-on policy flag through an unknown reading", () => {
    const state = visualStateFor(undefined, true);
    assert.equal(state.known, false);
    assert.equal(state.alwaysOn, true);
  });
});

describe("switch controls", () => {
  it("allows AC and other backend-declared switch devices", () => {
    assert.equal(isSwitchControllable({ controls: ["switch"] }), true);
    assert.equal(isSwitchControllable({ controls: [] }), false);
    assert.equal(isSwitchControllable({}), false);
  });
});

describe("group quantity handling", () => {
  it("caps the decorative desk count without changing the group rating", () => {
    assert.equal(decorativeUnitCount(8), 8);
    assert.equal(decorativeUnitCount(20), 8);
    assert.equal(decorativeUnitCount(0), 1);
    assert.equal(decorativeUnitCount(Number.NaN), 1);
  });

  it("shows the group total as-is and never multiplies it by quantity", () => {
    const summary = groupSummary({
      device_id: "dev-open-workstations",
      name: "Workstation group",
      room_id: "room-open-workspace",
      device_type: "workstation_group",
      quantity: 8,
      nominal_power_w: 960,
      power_factor: 0.9,
      always_on: false,
      control: "scheduled",
    });
    assert.equal(summary, "8 units · 960 W group total");
    assert.ok(!summary.includes("7680"));
  });

  it("labels a single unit as nominal", () => {
    const summary = groupSummary({
      device_id: "dev-pantry-fridge",
      name: "Refrigerator",
      room_id: "room-pantry",
      device_type: "refrigerator",
      quantity: 1,
      nominal_power_w: 150,
      power_factor: 1,
      always_on: true,
      control: "always_on",
    });
    assert.equal(summary, "150 W nominal");
  });
});

describe("partitionPlaceable", () => {
  const devices = [
    { device_id: "known-a" },
    { device_id: "unknown-b" },
    { device_id: "known-c" },
  ];
  const placement = (id) => (id.startsWith("known") ? { x: 1, y: 2 } : null);

  it("keeps unplaced devices instead of dropping them", () => {
    const { placed, unplaced } = partitionPlaceable(devices, placement);
    assert.equal(placed.length, 2);
    assert.equal(unplaced.length, 1);
    assert.equal(unplaced[0].device_id, "unknown-b");
    assert.equal(placed.length + unplaced.length, devices.length);
  });
});
