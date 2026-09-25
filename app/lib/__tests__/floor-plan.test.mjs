// SIM-VIS-01 floor-plan geometry checks (Agent M-D — FreeBuff).
// Run: npm test (node --test, no dependencies).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DOORWAYS,
  EQUIPMENT_PLACEMENTS,
  PLAN_HEIGHT,
  PLAN_WIDTH,
  ROOM_DECOR,
  ROOM_GEOMETRY,
  decorBounds,
  interiorOf,
  placementForDevice,
  roomCenter,
} from "../floor-plan.ts";

/** The five stable room IDs from the contract demo inventory. */
const CONTRACT_ROOM_IDS = [
  "room-open-workspace",
  "room-meeting",
  "room-pantry",
  "room-reception",
  "room-manager-cabin",
];

describe("room geometry", () => {
  it("draws exactly the five contract room IDs", () => {
    assert.deepEqual(Object.keys(ROOM_GEOMETRY).sort(), [...CONTRACT_ROOM_IDS].sort());
  });

  it("keeps every room inside the plan bounds without overlapping the corridor", () => {
    for (const [id, g] of Object.entries(ROOM_GEOMETRY)) {
      assert.ok(g.x >= 0 && g.y >= 0, `${id} origin`);
      assert.ok(g.x + g.w <= PLAN_WIDTH, `${id} right edge`);
      assert.ok(g.y + g.h <= PLAN_HEIGHT, `${id} bottom edge`);
    }
    // Corridor sits between the top and bottom room rows.
    const topRowBottom = ROOM_GEOMETRY["room-meeting"].y + ROOM_GEOMETRY["room-meeting"].h;
    const bottomRowTop = ROOM_GEOMETRY["room-open-workspace"].y;
    assert.ok(topRowBottom < bottomRowTop, "rows are separated");
  });

  it("centres an interior that stays inside the room", () => {
    for (const id of CONTRACT_ROOM_IDS) {
      const i = interiorOf(id);
      const g = ROOM_GEOMETRY[id];
      const c = roomCenter(id);
      assert.ok(i && c);
      assert.ok(i.x > g.x && i.y > g.y);
      assert.ok(i.x + i.w < g.x + g.w && i.y + i.h < g.y + g.h);
      assert.ok(c.x > g.x && c.x < g.x + g.w && c.y > g.y && c.y < g.y + g.h);
    }
  });

  it("returns null for an unknown room", () => {
    assert.equal(interiorOf("room-nowhere"), null);
    assert.equal(roomCenter("room-nowhere"), null);
  });
});

describe("doorways and windows", () => {
  it("cuts a door into the corridor-facing wall of each room", () => {
    assert.equal(DOORWAYS.length, CONTRACT_ROOM_IDS.length);
    for (const door of DOORWAYS) {
      const g = ROOM_GEOMETRY[door.room_id];
      assert.ok(g, `room ${door.room_id}`);
      assert.ok(["top", "bottom"].includes(door.wall));
      assert.ok(door.width > 0 && door.width < g.w);
      assert.ok(door.from > g.x && door.from + door.width < g.x + g.w);
    }
  });
});

describe("decorative furniture", () => {
  it("belongs only to known rooms", () => {
    for (const id of Object.keys(ROOM_DECOR)) {
      assert.ok(ROOM_GEOMETRY[id], `unknown room ${id}`);
    }
  });

  it("stays within its own room and never carries a device binding", () => {
    for (const [roomId, pieces] of Object.entries(ROOM_DECOR)) {
      const g = ROOM_GEOMETRY[roomId];
      for (const piece of pieces) {
        assert.ok(
          !("device_id" in piece),
          `${roomId} decor must not bind a device`,
        );
        const b = decorBounds(piece);
        assert.ok(b.x >= g.x, `${roomId}/${piece.kind} left ${b.x}`);
        assert.ok(b.y >= g.y, `${roomId}/${piece.kind} top ${b.y}`);
        assert.ok(b.x + b.w <= g.x + g.w, `${roomId}/${piece.kind} right`);
        assert.ok(b.y + b.h <= g.y + g.h, `${roomId}/${piece.kind} bottom`);
      }
    }
  });
});

describe("equipment placements", () => {
  it("references each device at most once and inside the plan", () => {
    const ids = EQUIPMENT_PLACEMENTS.map((p) => p.device_id);
    assert.equal(new Set(ids).size, ids.length, "duplicate device placement");
    for (const p of EQUIPMENT_PLACEMENTS) {
      assert.ok(p.x >= 0 && p.x <= PLAN_WIDTH, `${p.device_id} x`);
      assert.ok(p.y >= 0 && p.y <= PLAN_HEIGHT, `${p.device_id} y`);
    }
  });

  it("resolves known device IDs and reports unknown ones as unplaced", () => {
    const first = EQUIPMENT_PLACEMENTS[0];
    assert.deepEqual(placementForDevice(first.device_id), first);
    assert.equal(placementForDevice("dev-not-in-the-plan"), null);
  });
});
