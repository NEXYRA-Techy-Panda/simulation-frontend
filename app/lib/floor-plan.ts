// SIM-VIS-01 visual floor-plan geometry (Agent M-D — FreeBuff).
//
// The plan is keyed by the five stable contract room IDs. Nothing here invents
// rooms or device IDs: geometry is presentation only, and every equipment
// placement references a real device_id from the backend inventory. Framework
// agnostic and dependency free so it can be checked outside a browser.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoomGeometry extends Rect {
  /** Interior floor accent token; resolved to CSS in the renderer. */
  accent: RoomAccent;
}

export type RoomAccent =
  | "workspace"
  | "meeting"
  | "pantry"
  | "reception"
  | "cabin";

/** Fixed viewBox of the illustrated plan. */
export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 700;

/**
 * The five constructor-level room IDs the plan can draw. A room returned by the
 * backend that is not listed here is never dropped: it stays selectable in the
 * room list and is reported as having no fixed plan position.
 */
export const ROOM_GEOMETRY: Record<string, RoomGeometry> = {
  "room-manager-cabin": { x: 24, y: 24, w: 228, h: 206, accent: "cabin" },
  "room-meeting": { x: 272, y: 24, w: 376, h: 206, accent: "meeting" },
  "room-reception": { x: 668, y: 24, w: 308, h: 206, accent: "reception" },
  "room-open-workspace": { x: 24, y: 348, w: 620, h: 328, accent: "workspace" },
  "room-pantry": { x: 664, y: 348, w: 312, h: 328, accent: "pantry" },
};

export const CORRIDOR: Rect = { x: 24, y: 250, w: 952, h: 78 };

export const KNOWN_ROOM_IDS: string[] = Object.keys(ROOM_GEOMETRY);

export interface Doorway {
  room_id: string;
  /** Wall of the room the opening is cut into. */
  wall: "top" | "bottom" | "left" | "right";
  /** Start coordinate along the wall (x for horizontal walls, y otherwise). */
  from: number;
  width: number;
}

/** Door openings that connect each room to the corridor. */
export const DOORWAYS: Doorway[] = [
  { room_id: "room-manager-cabin", wall: "bottom", from: 96, width: 66 },
  { room_id: "room-meeting", wall: "bottom", from: 398, width: 78 },
  { room_id: "room-reception", wall: "bottom", from: 782, width: 66 },
  { room_id: "room-open-workspace", wall: "top", from: 96, width: 96 },
  { room_id: "room-pantry", wall: "top", from: 742, width: 66 },
];

export interface WindowSlot {
  /** Wall of the building outline the window sits on. */
  wall: "top" | "bottom" | "left" | "right";
  from: number;
  width: number;
}

/** Windows on the exterior shell. Decorative only — not a device. */
export const WINDOWS: WindowSlot[] = [
  { wall: "top", from: 300, width: 96 },
  { wall: "top", from: 560, width: 96 },
  { wall: "top", from: 700, width: 72 },
  { wall: "left", from: 380, width: 84 },
  { wall: "left", from: 560, width: 84 },
  { wall: "bottom", from: 120, width: 120 },
  { wall: "bottom", from: 380, width: 120 },
  { wall: "bottom", from: 720, width: 120 },
  { wall: "right", from: 80, width: 84 },
  { wall: "right", from: 420, width: 84 },
];

export type DecorKind =
  | "desk"
  | "chair"
  | "meeting-table"
  | "counter"
  | "plant"
  | "reception-desk"
  | "shelf"
  | "screen"
  | "rug";

export interface DecorPlacement {
  kind: DecorKind;
  x: number;
  y: number;
  scale?: number;
  /** Stable rotation/step hint so a repeated piece does not look cloned. */
  variant?: number;
}

/**
 * Purely decorative furniture. It never carries a device_id and therefore can
 * never imply separately metered equipment or contribute energy.
 */
export const ROOM_DECOR: Record<string, DecorPlacement[]> = {
  "room-open-workspace": [
    { kind: "rug", x: 330, y: 520, scale: 1.1 },
    { kind: "desk", x: 96, y: 402, variant: 0 },
    { kind: "chair", x: 128, y: 470, variant: 0 },
    { kind: "desk", x: 96, y: 532, variant: 1 },
    { kind: "chair", x: 128, y: 600, variant: 1 },
    { kind: "desk", x: 300, y: 402, variant: 2 },
    { kind: "chair", x: 332, y: 470, variant: 2 },
    { kind: "desk", x: 300, y: 532, variant: 3 },
    { kind: "chair", x: 332, y: 600, variant: 3 },
    { kind: "plant", x: 596, y: 612 },
    { kind: "shelf", x: 480, y: 396 },
  ],
  "room-meeting": [
    { kind: "meeting-table", x: 336, y: 78 },
    { kind: "chair", x: 330, y: 142, variant: 0 },
    { kind: "chair", x: 420, y: 142, variant: 1 },
    { kind: "chair", x: 510, y: 142, variant: 2 },
    { kind: "plant", x: 606, y: 178 },
    { kind: "screen", x: 398, y: 34 },
  ],
  "room-pantry": [
    { kind: "counter", x: 686, y: 388 },
    { kind: "plant", x: 900, y: 620 },
    { kind: "chair", x: 740, y: 566, variant: 0 },
    { kind: "chair", x: 830, y: 566, variant: 1 },
  ],
  "room-reception": [
    { kind: "reception-desk", x: 760, y: 96 },
    { kind: "plant", x: 912, y: 190 },
    { kind: "chair", x: 700, y: 172, variant: 0 },
  ],
  "room-manager-cabin": [
    { kind: "desk", x: 76, y: 92 },
    { kind: "chair", x: 96, y: 160, variant: 0 },
    { kind: "plant", x: 210, y: 190 },
  ],
};

/**
 * Half-extents of each decorative piece around its anchor, so containment can
 * be checked without duplicating the renderer's geometry.
 */
export const DECOR_EXTENT: Record<
  DecorKind,
  { offsetX: number; offsetY: number; halfW: number; halfH: number }
> = {
  desk: { offsetX: -3, offsetY: -12, halfW: 43, halfH: 28 },
  chair: { offsetX: 0, offsetY: 0, halfW: 11, halfH: 11 },
  "meeting-table": { offsetX: 150, offsetY: 52, halfW: 150, halfH: 52 },
  counter: { offsetX: 140, offsetY: 26, halfW: 140, halfH: 26 },
  plant: { offsetX: 0, offsetY: 7, halfW: 14, halfH: 19 },
  "reception-desk": { offsetX: 0, offsetY: -2, halfW: 70, halfH: 32 },
  shelf: { offsetX: 55, offsetY: 17, halfW: 55, halfH: 17 },
  screen: { offsetX: 62, offsetY: 34, halfW: 62, halfH: 34 },
  rug: { offsetX: 0, offsetY: 0, halfW: 150, halfH: 86 },
};

/** Axis-aligned bounds of a decorative placement on the plan. */
export function decorBounds(placement: DecorPlacement): Rect {
  const e = DECOR_EXTENT[placement.kind];
  const scale = placement.scale ?? 1;
  const cx = placement.x + e.offsetX * scale;
  const cy = placement.y + e.offsetY * scale;
  const halfW = e.halfW * scale;
  const halfH = e.halfH * scale;
  return { x: cx - halfW, y: cy - halfH, w: halfW * 2, h: halfH * 2 };
}

export interface EquipmentPlacement {
  device_id: string;
  x: number;
  y: number;
  scale?: number;
  /**
   * Draw the illustration mirrored horizontally. Lighting sits on the ceiling
   * plane and window-mounted units face inward.
   */
  flip?: boolean;
}

/**
 * Equipment positions keyed to real device IDs from the demo inventory. A
 * placement whose device is absent from the loaded inventory simply draws
 * nothing; a device without a placement falls back to the room's unplaced row
 * so no real device is ever hidden.
 */
export const EQUIPMENT_PLACEMENTS: EquipmentPlacement[] = [
  // Open workspace
  { device_id: "dev-open-light-a", x: 200, y: 380 },
  { device_id: "dev-open-light-b", x: 470, y: 380 },
  { device_id: "dev-open-ac", x: 610, y: 372, flip: true },
  { device_id: "dev-open-fan", x: 300, y: 452 },
  { device_id: "dev-open-workstations", x: 120, y: 448, scale: 1 },
  // Meeting room
  { device_id: "dev-meeting-light", x: 300, y: 40 },
  { device_id: "dev-meeting-ac", x: 600, y: 40, flip: true },
  { device_id: "dev-meeting-projector", x: 330, y: 60 },
  // Pantry
  { device_id: "dev-pantry-light", x: 780, y: 368 },
  { device_id: "dev-pantry-fan", x: 900, y: 420 },
  { device_id: "dev-pantry-fridge", x: 700, y: 470 },
  { device_id: "dev-pantry-microwave", x: 790, y: 430 },
  // Reception
  { device_id: "dev-reception-light", x: 790, y: 40 },
  { device_id: "dev-reception-fan", x: 900, y: 60 },
  { device_id: "dev-reception-pc", x: 748, y: 118 },
  // Manager cabin
  { device_id: "dev-manager-light", x: 120, y: 40 },
  { device_id: "dev-manager-ac", x: 232, y: 40, flip: true },
  { device_id: "dev-manager-pc", x: 92, y: 116 },
];

const EQUIPMENT_BY_ID: Map<string, EquipmentPlacement> = new Map(
  EQUIPMENT_PLACEMENTS.map((p) => [p.device_id, p]),
);

export function placementForDevice(
  deviceId: string,
): EquipmentPlacement | null {
  return EQUIPMENT_BY_ID.get(deviceId) ?? null;
}

export function roomCenter(roomId: string): { x: number; y: number } | null {
  const g = ROOM_GEOMETRY[roomId];
  if (!g) return null;
  return { x: g.x + g.w / 2, y: g.y + g.h / 2 };
}

/** Interior rectangle inset from a room's outer wall by the wall thickness. */
export function interiorOf(roomId: string): Rect | null {
  const g = ROOM_GEOMETRY[roomId];
  if (!g) return null;
  const t = 10;
  return { x: g.x + t, y: g.y + t, w: g.w - t * 2, h: g.h - t * 2 };
}
