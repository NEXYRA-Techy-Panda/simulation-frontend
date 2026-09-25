// SIM-VIS-01 decorative furniture (Agent M-D — FreeBuff).
//
// Purely decorative pieces. They carry no device binding and therefore can
// never imply separately metered equipment, contribute energy, or be read as a
// reading. Operational equipment is drawn only by EquipmentGlyph from a real
// device ID.

import type { DecorKind } from "../../lib/floor-plan";

const OUTLINE = "#060a14";

export default function Decor({
  kind,
  x,
  y,
  scale = 1,
  variant = 0,
}: {
  kind: DecorKind;
  x: number;
  y: number;
  scale?: number;
  variant?: number;
}) {
  const seat = ["#3f5f8f", "#2f7f76", "#8a6a2f", "#7d3f52"][variant % 4];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden="true">
      {kind === "desk" && (
        <g>
          <rect x={-40} y={-16} width={80} height={32} rx={4} fill="#7d5f3d" stroke={OUTLINE} strokeWidth={2} />
          <rect x={-34} y={-11} width={68} height={22} rx={3} fill="#9a7a52" />
          <rect x={-46} y={-40} width={30} height={20} rx={2} fill="#1b2740" stroke={OUTLINE} strokeWidth={1.6} />
          <rect x={-42} y={-36} width={22} height={12} rx={1.5} fill="#2f3f5e" />
        </g>
      )}

      {kind === "chair" && (
        <g>
          <ellipse cx={0} cy={4} rx={11} ry={5} fill="#05070f" opacity={0.3} />
          <circle cx={0} cy={0} r={11} fill={seat} stroke={OUTLINE} strokeWidth={1.8} />
          <path d="M -9 -5 Q 0 -12 9 -5" fill="none" stroke="#cfe0f7" strokeWidth={2} strokeLinecap="round" />
        </g>
      )}

      {kind === "meeting-table" && (
        <g>
          <rect x={0} y={0} width={300} height={104} rx={26} fill="#6f5233" stroke={OUTLINE} strokeWidth={2.5} />
          <rect x={12} y={12} width={276} height={80} rx={20} fill="#8f6c45" />
          <ellipse cx={150} cy={52} rx={38} ry={18} fill="#a8834f" opacity={0.7} />
        </g>
      )}

      {kind === "counter" && (
        <g>
          <rect x={0} y={0} width={280} height={52} rx={5} fill="#3c4a63" stroke={OUTLINE} strokeWidth={2} />
          <rect x={0} y={0} width={280} height={14} rx={4} fill="#c9d6e8" />
          <rect x={18} y={26} width={54} height={20} rx={3} fill="#2a3550" />
          <rect x={96} y={26} width={54} height={20} rx={3} fill="#2a3550" />
        </g>
      )}

      {kind === "reception-desk" && (
        <g>
          <path d="M -70 30 L -70 -14 Q 0 -34 70 -14 L 70 30 Z" fill="#3c4a63" stroke={OUTLINE} strokeWidth={2.4} />
          <path d="M -70 22 L -70 -8 Q 0 -26 70 -8 L 70 22 Z" fill="#55648a" />
          <circle cx={0} cy={-38} r={13} fill="#2f7f76" stroke={OUTLINE} strokeWidth={1.6} />
          <text x={0} y={-34} textAnchor="middle" fontSize={11} fontWeight={700} fill="#d8fff6">
            N
          </text>
        </g>
      )}

      {kind === "shelf" && (
        <g>
          <rect x={0} y={0} width={110} height={34} rx={3} fill="#4b5a78" stroke={OUTLINE} strokeWidth={1.8} />
          <rect x={6} y={6} width={16} height={22} rx={2} fill="#7d3f52" />
          <rect x={26} y={6} width={16} height={22} rx={2} fill="#2f7f76" />
          <rect x={46} y={6} width={16} height={22} rx={2} fill="#8a6a2f" />
          <rect x={66} y={6} width={16} height={22} rx={2} fill="#3f5f8f" />
        </g>
      )}

      {kind === "screen" && (
        <g>
          <rect x={0} y={0} width={124} height={68} rx={4} fill="#e8eef8" stroke={OUTLINE} strokeWidth={2.2} />
          <path d="M 8 60 L 46 22 L 74 46 L 116 10" fill="none" stroke="#2f7f76" strokeWidth={3.5} strokeLinecap="round" />
          <rect x={10} y={8} width={34} height={6} rx={3} fill="#8fa3c4" />
        </g>
      )}

      {kind === "plant" && (
        <g>
          <ellipse cx={0} cy={14} rx={14} ry={5} fill="#05070f" opacity={0.3} />
          <path d="M -12 12 L 12 12 L 8 26 L -8 26 Z" fill="#8a5a35" stroke={OUTLINE} strokeWidth={1.6} />
          <circle cx={-8} cy={0} r={10} fill="#2f7f5e" stroke={OUTLINE} strokeWidth={1.4} />
          <circle cx={7} cy={-3} r={11} fill="#3a9a72" stroke={OUTLINE} strokeWidth={1.4} />
          <circle cx={0} cy={-12} r={9} fill="#48b184" stroke={OUTLINE} strokeWidth={1.4} />
        </g>
      )}

      {kind === "rug" && (
        <ellipse cx={0} cy={0} rx={150} ry={86} fill="#22304d" opacity={0.55} stroke="#3d557f" strokeWidth={2} />
      )}
    </g>
  );
}
