"use client";

// Live Power Trend Chart (SIM-CHART-01).
// Continuous scrolling ECG-style SVG telemetry with straight segments,
// latest-point beacon, and hover inspection.

import { useState } from "react";
import {
  formatKolkataDate,
  formatKolkataTime,
  formatKolkataTimestamp,
  generateSvgPath,
  type ScopeSeries,
} from "../../lib/chart-buffer";

export interface PowerChartProps {
  series: ScopeSeries | null;
  scopeName?: string;
  statusText?: string;
  isStale?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function formatPower(watts: number | null): string {
  if (watts === null || isNaN(watts)) return "-- W";
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${Math.round(watts)} W`;
}

export default function PowerChart({
  series,
  scopeName,
  statusText,
  isStale = false,
  emptyMessage = "Collecting live telemetry samples...",
  className = "",
}: PowerChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const samples = series?.samples ?? [];
  const latestPower = series?.latestPowerW ?? null;
  const minPower = series?.minPowerW ?? null;
  const maxPower = series?.maxPowerW ?? null;
  const hasGaps = series?.hasGaps ?? false;
  const showDateContext = samples.length > 1
    && formatKolkataDate(samples[0].sim_time_utc) !== formatKolkataDate(samples[samples.length - 1].sim_time_utc);
  const formatAxisTime = (isoUtc: string) => showDateContext
    ? formatKolkataTimestamp(isoUtc)
    : formatKolkataTime(isoUtc);

  const width = 580;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 55 };

  const svgResult = generateSvgPath(samples, "power", width, height, padding);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Horizontal grid lines (4 lines)
  const yTicks = [0, 0.33, 0.66, 1.0];
  const maxValDisplay =
    maxPower !== null && maxPower > 0
      ? Math.max(maxPower * 1.15, maxPower + 10)
      : 100;

  // Selected hover point
  const activePoint =
    hoveredIdx !== null && svgResult.points[hoveredIdx]
      ? svgResult.points[hoveredIdx]
      : null;

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-zinc-100 shadow-sm dark:border-zinc-800 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse motion-reduce:animate-none" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
              Live Power Trend
            </h3>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {scopeName ?? series?.name ?? "No Scope"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Sampled live readings (not interval average)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isStale && (
            <span className="rounded border border-amber-600/40 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
              Stale Data
            </span>
          )}
          {hasGaps && (
            <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              Gaps Detected
            </span>
          )}
          {statusText && (
            <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs font-mono text-zinc-300">
              {statusText}
            </span>
          )}
          <div className="text-right">
            <div className="text-xl font-bold font-mono tracking-tight text-cyan-400">
              {formatPower(latestPower)}
            </div>
            <div className="text-[10px] text-zinc-400">
              Sampled min: {formatPower(minPower)} | Sampled max: {formatPower(maxPower)}
            </div>
          </div>
        </div>
      </div>

      {/* SVG Plot */}
      <div className="relative mt-3 w-full overflow-hidden">
        {samples.length < 2 ? (
          <div className="flex h-[220px] flex-col items-center justify-center text-sm text-zinc-400">
            <div className="h-6 w-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin motion-reduce:animate-none" />
            <span className="mt-2">{emptyMessage}</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            aria-label="Live power trend graph"
            tabIndex={0}
          >
            <defs>
              <linearGradient id="powerGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid background */}
            <rect
              x={padding.left}
              y={padding.top}
              width={plotWidth}
              height={plotHeight}
              fill="#09090b"
              stroke="#27272a"
              strokeWidth="1"
            />

            {/* Horizontal Ticks & Lines */}
            {yTicks.map((pct, idx) => {
              const y = padding.top + plotHeight * (1 - pct);
              const labelWatts = Math.round(pct * maxValDisplay);
              return (
                <g key={`y-${idx}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + plotWidth}
                    y2={y}
                    stroke="#18181b"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-zinc-400 font-mono"
                  >
                    {labelWatts >= 1000
                      ? `${(labelWatts / 1000).toFixed(1)}k`
                      : labelWatts}
                  </text>
                </g>
              );
            })}

            {/* X-axis time labels */}
            {samples.length > 0 && (
              <>
                <text
                  x={padding.left}
                  y={height - 10}
                  textAnchor="start"
                  className="text-[10px] fill-zinc-400 font-mono"
                >
                  {formatAxisTime(samples[0].sim_time_utc)}
                </text>
                <text
                  x={padding.left + plotWidth}
                  y={height - 10}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 font-mono"
                >
                  {formatAxisTime(samples[samples.length - 1].sim_time_utc)}
                </text>
              </>
            )}

            {/* Polyline Path Segments (breaks on null gaps) */}
            {svgResult.segments.map((segD, sIdx) => (
              <path
                key={`seg-${sIdx}`}
                d={segD}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Latest point pulsing beacon */}
            {svgResult.latestPoint && (
              <g>
                <circle
                  cx={svgResult.latestPoint.x}
                  cy={svgResult.latestPoint.y}
                  r="6"
                  fill="#06b6d4"
                  opacity="0.3"
                  className="animate-ping motion-reduce:animate-none"
                />
                <circle
                  cx={svgResult.latestPoint.x}
                  cy={svgResult.latestPoint.y}
                  r="3.5"
                  fill="#22d3ee"
                  stroke="#083344"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Hover inspection points & crosshair */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padding.top}
                  x2={activePoint.x}
                  y2={padding.top + plotHeight}
                  stroke="#38bdf8"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="4"
                  fill="#38bdf8"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Transparent hover hit boxes */}
            {svgResult.points.map((pt, pIdx) => (
              <rect
                key={`hit-${pIdx}`}
                x={pt.x - 5}
                y={padding.top}
                width={10}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(pIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-crosshair"
              />
            ))}
          </svg>
        )}

        {/* Hover Readout Tooltip */}
        {activePoint && (
          <div
            className="pointer-events-none absolute top-2 right-2 rounded border border-cyan-800 bg-zinc-900/90 px-2 py-1 text-xs shadow-md backdrop-blur-sm"
          >
            <span className="font-mono text-zinc-400">
              {showDateContext ? formatKolkataTimestamp(activePoint.timeUtc) : formatKolkataTime(activePoint.timeUtc)}
            </span>
            <span className="ml-2 font-mono font-bold text-cyan-300">
              {formatPower(activePoint.val)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
