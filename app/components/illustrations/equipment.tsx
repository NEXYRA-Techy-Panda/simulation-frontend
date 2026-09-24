// SIM-VIS-01 original equipment illustrations (Agent M-D — FreeBuff).
//
// Original SVG drawings for the real contract inventory device types. Nothing
// here reads or invents a reading: the caller passes an explicit visual state,
// and an unknown state is drawn neutral with a dashed outline and is always
// accompanied by the word "unavailable".

import type { GlyphKind } from "../../lib/equipment";

export interface GlyphState {
  known: boolean;
  on: boolean;
  overridden: boolean;
  alwaysOn: boolean;
}

const ON = "#f6c866";
const ON_SOFT = "#ffdf9b";
const OFF = "#3a4a63";
const UNKNOWN = "#232e45";
const OUTLINE = "#060a14";
const METAL = "#8fa3c4";

function stroke(state: GlyphState): string {
  return state.known ? OUTLINE : "#7c8db0";
}

function surface(state: GlyphState): string {
  if (!state.known) return UNKNOWN;
  return state.on ? ON_SOFT : OFF;
}

export default function EquipmentGlyph({
  kind,
  x,
  y,
  scale = 1,
  flip = false,
  state,
  units = 1,
}: {
  kind: GlyphKind;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  state: GlyphState;
  /** Decorative desk count for a workstation group (drawing only). */
  units?: number;
}) {
  const dash = state.known ? undefined : "4 3";
  const outline = stroke(state);
  const body = surface(state);

  return (
    <g
      transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}
      aria-hidden="true"
    >
      {(kind === "light" || kind === "fan") && (
        <ellipse cx={0} cy={0} rx={22} ry={9} fill="#05070f" opacity={0.28} />
      )}

      {kind === "light" && (
        <g>
          {state.known && state.on && (
            <circle className="sim-glow" cx={0} cy={0} r={30} fill={ON} opacity={0.22} />
          )}
          <rect
            x={-26}
            y={-9}
            width={52}
            height={18}
            rx={3}
            fill={body}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <rect x={-20} y={-5} width={40} height={10} rx={2} fill={state.on ? ON : "#2a3550"} />
          {state.overridden && (
            <circle cx={22} cy={-9} r={4.5} fill="#f97362" stroke={OUTLINE} strokeWidth={1.2} />
          )}
        </g>
      )}

      {kind === "fan" && (
        <g>
          <g className={state.known && state.on ? "sim-spin" : undefined}>
            {[0, 120, 240].map((angle) => (
              <path
                key={angle}
                d="M 0 0 Q 13 -6 21 -1 Q 13 5 0 0 Z"
                fill={state.on ? "#c9d8f2" : "#6d7f9e"}
                stroke={outline}
                strokeWidth={1.2}
                transform={`rotate(${angle})`}
              />
            ))}
          </g>
          <circle cx={0} cy={0} r={6} fill={METAL} stroke={outline} strokeWidth={1.6} />
          <circle cx={0} cy={0} r={2} fill={outline} />
        </g>
      )}

      {kind === "ac" && (
        <g>
          <rect
            x={-32}
            y={-14}
            width={64}
            height={28}
            rx={5}
            fill={body}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <rect x={-26} y={-6} width={52} height={7} rx={2} fill="#20304d" />
          <circle cx={26} cy={4} r={3} fill={state.on ? "#7ef0a8" : "#44536e"} />
          {state.known && state.on && (
            <g className="sim-airflow">
              {[0, 1, 2].map((i) => (
                <path
                  key={i}
                  d={`M ${-18 + i * 18} 16 q 8 ${10 + i * 2} 0 ${20 + i * 3}`}
                  fill="none"
                  stroke="#9fd8ff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.75}
                />
              ))}
            </g>
          )}
        </g>
      )}

      {kind === "projector" && (
        <g>
          <rect
            x={-22}
            y={-10}
            width={44}
            height={20}
            rx={4}
            fill={body}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <circle cx={16} cy={0} r={5} fill={state.on ? "#bfe6ff" : "#3c4a66"} stroke={outline} strokeWidth={1.4} />
          {state.known && state.on && (
            <path d="M 20 0 L 120 26 L 120 -26 Z" fill="#bfe6ff" opacity={0.16} className="sim-beam" />
          )}
        </g>
      )}

      {kind === "display" && (
        <g>
          <rect
            x={-19}
            y={-14}
            width={38}
            height={26}
            rx={3}
            fill={state.known ? "#1b2740" : UNKNOWN}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <rect x={-15} y={-10} width={30} height={18} rx={2} fill={state.on ? "#8fd0ff" : "#2a3550"} />
          {state.on && <rect x={-13} y={-8} width={12} height={4} rx={1} fill="#ffffff" opacity={0.55} />}
          <rect x={-3} y={12} width={6} height={6} fill={METAL} />
          <rect x={-10} y={18} width={20} height={3} rx={1.5} fill={METAL} stroke={outline} strokeWidth={1} />
        </g>
      )}

      {kind === "refrigerator" && (
        <g>
          <rect
            x={-17}
            y={-26}
            width={34}
            height={52}
            rx={4}
            fill={state.known ? "#dbe6f5" : UNKNOWN}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <line x1={-17} y1={-6} x2={17} y2={-6} stroke={outline} strokeWidth={1.4} />
          <rect x={10} y={-20} width={3} height={10} rx={1.5} fill={METAL} />
          <rect x={10} y={2} width={3} height={14} rx={1.5} fill={METAL} />
          {state.alwaysOn && (
            <g>
              <rect x={-30} y={18} width={26} height={12} rx={6} fill="#2f7f76" stroke={OUTLINE} strokeWidth={1.2} />
              <text x={-17} y={27} textAnchor="middle" fontSize={8} fill="#d8fff6" fontWeight={700}>
                ALWAYS
              </text>
            </g>
          )}
        </g>
      )}

      {kind === "microwave" && (
        <g>
          <rect
            x={-22}
            y={-14}
            width={44}
            height={28}
            rx={3}
            fill={state.known ? "#c9d6e8" : UNKNOWN}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <rect x={-17} y={-9} width={24} height={18} rx={2} fill={state.on ? "#ffd98a" : "#2b3a55"} />
          <circle cx={14} cy={-4} r={2.6} fill="#44536e" />
          <circle cx={14} cy={4} r={2.6} fill="#44536e" />
        </g>
      )}

      {kind === "workstation" && (
        <g>
          {Array.from({ length: Math.max(1, Math.min(units, 8)) }, (_, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            return (
              <g key={i} transform={`translate(${col * 62} ${row * 78})`}>
                <rect
                  x={-26}
                  y={-12}
                  width={52}
                  height={22}
                  rx={3}
                  fill={state.known ? "#8a6a45" : UNKNOWN}
                  stroke={outline}
                  strokeWidth={1.8}
                  strokeDasharray={dash}
                />
                <rect
                  x={-16}
                  y={-26}
                  width={32}
                  height={18}
                  rx={2}
                  fill={state.known ? "#1b2740" : UNKNOWN}
                  stroke={outline}
                  strokeWidth={1.6}
                />
                <rect x={-12} y={-22} width={24} height={12} rx={1.5} fill={state.on ? "#8fd0ff" : "#2a3550"} />
                <circle cx={0} cy={20} r={7} fill="#3a4a63" stroke={outline} strokeWidth={1.4} />
              </g>
            );
          })}
        </g>
      )}

      {kind === "generic" && (
        <g>
          <rect
            x={-18}
            y={-14}
            width={36}
            height={28}
            rx={4}
            fill={body}
            stroke={outline}
            strokeWidth={2}
            strokeDasharray={dash}
          />
          <circle cx={0} cy={0} r={4} fill={state.on ? ON : "#55648a"} />
        </g>
      )}
    </g>
  );
}
