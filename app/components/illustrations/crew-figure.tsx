// SIM-VIS-01 original crew figure (Agent M-D — FreeBuff).
//
// Original small top-down office figures — deliberately NOT modelled on any
// existing game or licensed character set. They carry no identity, role or
// individual intelligence: only a palette accent chosen deterministically.

export const CREW_PALETTES = [
  { suit: "#3f5f8f", trim: "#a8c6ee", visor: "#0f1c33" },
  { suit: "#2f7f76", trim: "#93ded1", visor: "#0b211f" },
  { suit: "#8a6a2f", trim: "#e6c987", visor: "#241a07" },
  { suit: "#7d3f52", trim: "#e2a2b6", visor: "#2a0f18" },
] as const;

export type CrewVariant = 0 | 1 | 2 | 3;

export default function CrewFigure({
  x,
  y,
  scale = 1,
  variant = 0,
  dimmed = false,
}: {
  x: number;
  y: number;
  scale?: number;
  variant?: number;
  /** Drawn faded while the reported occupancy is stale/unconfirmed. */
  dimmed?: boolean;
}) {
  const palette = CREW_PALETTES[variant % CREW_PALETTES.length];
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={dimmed ? 0.45 : 1}
      aria-hidden="true"
    >
      <ellipse cx={0} cy={2} rx={11} ry={5} fill="#05070f" opacity={0.35} />
      {/* Torso */}
      <path
        d="M -9 -2 Q -9 -16 0 -16 Q 9 -16 9 -2 Q 4 2 0 2 Q -4 2 -9 -2 Z"
        fill={palette.suit}
        stroke="#060a14"
        strokeWidth={1.6}
      />
      {/* Shoulder trim */}
      <path
        d="M -8 -9 Q 0 -13 8 -9"
        fill="none"
        stroke={palette.trim}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Head + visor */}
      <circle cx={0} cy={-19} r={6} fill={palette.suit} stroke="#060a14" strokeWidth={1.5} />
      <path d="M -4 -20 A 4.6 4.6 0 0 1 4 -20 Z" fill={palette.visor} />
      {/* Badge */}
      <circle cx={0} cy={-6} r={1.8} fill={palette.trim} />
    </g>
  );
}
