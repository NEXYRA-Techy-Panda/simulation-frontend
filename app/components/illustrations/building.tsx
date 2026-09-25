// SIM-VIS-01 building shell (Agent M-D — FreeBuff).
//
// Original top-down office shell: navy structural walls, distinct floor
// treatments per room, visible doorways and exterior windows. Decorative only
// — no device, reading or energy meaning is attached to any of it.

import {
  CORRIDOR,
  DOORWAYS,
  PLAN_HEIGHT,
  PLAN_WIDTH,
  ROOM_GEOMETRY,
  WINDOWS,
  type RoomAccent,
} from "../../lib/floor-plan";

const WALL = 8;

const ACCENT: Record<RoomAccent, { floor: string; trim: string; pattern: string }> = {
  workspace: { floor: "#16233c", trim: "#3f7fc4", pattern: "#1d2c4a" },
  meeting: { floor: "#1c1e3d", trim: "#7a6cf0", pattern: "#252758" },
  pantry: { floor: "#142b28", trim: "#33a37d", pattern: "#1b3a34" },
  reception: { floor: "#152436", trim: "#3a95dc", pattern: "#1d3149" },
  cabin: { floor: "#2a1c2b", trim: "#c06fa4", pattern: "#382538" },
};

/** Static shell: background, corridor, exterior wall and windows. */
export function BuildingShell() {
  const cx = CORRIDOR.x;
  const cy = CORRIDOR.y;
  const cw = CORRIDOR.w;
  const ch = CORRIDOR.h;
  return (
    <g aria-hidden="true">
      <rect
        x={0}
        y={0}
        width={PLAN_WIDTH}
        height={PLAN_HEIGHT}
        rx={18}
        fill="#080d19"
      />
      {/* Corridor floor */}
      <rect x={cx} y={cy} width={cw} height={ch} fill="#1b2740" />
      <g opacity={0.5}>
        {Array.from({ length: Math.floor(cw / 40) }, (_, i) => (
          <line
            key={i}
            x1={cx + i * 40}
            y1={cy}
            x2={cx + i * 40}
            y2={cy + ch}
            stroke="#2b3d61"
            strokeWidth={1}
          />
        ))}
      </g>
      <text
        x={cx + 14}
        y={cy + ch - 12}
        fontSize={16}
        fill="#7e93bb"
        fontWeight={600}
        letterSpacing={3}
      >
        CORRIDOR
      </text>

      {/* Exterior wall */}
      <rect
        x={12}
        y={12}
        width={PLAN_WIDTH - 24}
        height={PLAN_HEIGHT - 24}
        rx={16}
        fill="none"
        stroke="#0c1424"
        strokeWidth={24}
      />
      <rect
        x={12}
        y={12}
        width={PLAN_WIDTH - 24}
        height={PLAN_HEIGHT - 24}
        rx={16}
        fill="none"
        stroke="#33456b"
        strokeWidth={3}
      />

      {/* Exterior windows */}
      {WINDOWS.map((w, i) => {
        const len = w.width;
        const t = 6;
        if (w.wall === "top") {
          return (
            <g key={i}>
              <rect x={w.from} y={12 - t} width={len} height={t * 2} fill="#7fd4ff" opacity={0.75} />
              <rect x={w.from} y={12 - t} width={len} height={t * 2} fill="none" stroke="#0c1424" strokeWidth={2} />
            </g>
          );
        }
        if (w.wall === "bottom") {
          const y = PLAN_HEIGHT - 12 - t;
          return (
            <g key={i}>
              <rect x={w.from} y={y} width={len} height={t * 2} fill="#7fd4ff" opacity={0.75} />
              <rect x={w.from} y={y} width={len} height={t * 2} fill="none" stroke="#0c1424" strokeWidth={2} />
            </g>
          );
        }
        if (w.wall === "left") {
          return (
            <g key={i}>
              <rect x={12 - t} y={w.from} width={t * 2} height={len} fill="#7fd4ff" opacity={0.75} />
              <rect x={12 - t} y={w.from} width={t * 2} height={len} fill="none" stroke="#0c1424" strokeWidth={2} />
            </g>
          );
        }
        const x = PLAN_WIDTH - 12 - t;
        return (
          <g key={i}>
            <rect x={x} y={w.from} width={t * 2} height={len} fill="#7fd4ff" opacity={0.75} />
            <rect x={x} y={w.from} width={t * 2} height={len} fill="none" stroke="#0c1424" strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
}

/** One room's floor, walls and doorway opening. */
export function RoomShell({
  roomId,
  selected,
}: {
  roomId: string;
  selected: boolean;
}) {
  const g = ROOM_GEOMETRY[roomId];
  if (!g) return null;
  const accent = ACCENT[g.accent];
  const door = DOORWAYS.find((d) => d.room_id === roomId) ?? null;

  return (
    <g aria-hidden="true">
      <rect x={g.x} y={g.y} width={g.w} height={g.h} fill={accent.floor} />
      {/* Floor pattern */}
      <g opacity={0.55}>
        {Array.from({ length: Math.floor(g.h / 46) }, (_, i) => (
          <line
            key={`h${i}`}
            x1={g.x}
            y1={g.y + 46 * (i + 1)}
            x2={g.x + g.w}
            y2={g.y + 46 * (i + 1)}
            stroke={accent.pattern}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: Math.floor(g.w / 46) }, (_, i) => (
          <line
            key={`v${i}`}
            x1={g.x + 46 * (i + 1)}
            y1={g.y}
            x2={g.x + 46 * (i + 1)}
            y2={g.y + g.h}
            stroke={accent.pattern}
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Walls */}
      <rect
        x={g.x}
        y={g.y}
        width={g.w}
        height={g.h}
        fill="none"
        stroke="#0c1424"
        strokeWidth={WALL + 6}
      />
      <rect
        x={g.x}
        y={g.y}
        width={g.w}
        height={g.h}
        fill="none"
        stroke={selected ? accent.trim : "#3a4d72"}
        strokeWidth={selected ? 5 : 3.5}
      />

      {/* Doorway: cut the wall and draw a threshold + jambs */}
      {door && <Doorway roomId={roomId} />}
    </g>
  );
}

function Doorway({ roomId }: { roomId: string }) {
  const g = ROOM_GEOMETRY[roomId];
  const door = DOORWAYS.find((d) => d.room_id === roomId);
  if (!g || !door) return null;
  const cut = WALL + 10;
  if (door.wall === "bottom") {
    const y = g.y + g.h;
    return (
      <g>
        <rect x={door.from} y={y - cut / 2} width={door.width} height={cut} fill="#1b2740" />
        <line x1={door.from} y1={y} x2={door.from} y2={y + 12} stroke="#0c1424" strokeWidth={3} />
        <line x1={door.from + door.width} y1={y} x2={door.from + door.width} y2={y + 12} stroke="#0c1424" strokeWidth={3} />
      </g>
    );
  }
  if (door.wall === "top") {
    const y = g.y;
    return (
      <g>
        <rect x={door.from} y={y - cut / 2} width={door.width} height={cut} fill="#1b2740" />
        <line x1={door.from} y1={y} x2={door.from} y2={y - 12} stroke="#0c1424" strokeWidth={3} />
        <line x1={door.from + door.width} y1={y} x2={door.from + door.width} y2={y - 12} stroke="#0c1424" strokeWidth={3} />
      </g>
    );
  }
  return null;
}
