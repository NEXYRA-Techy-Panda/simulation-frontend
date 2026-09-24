"use client";

// Live Cumulative Energy Trend Chart (SIM-CHART-01).
// Monotonic cumulative energy visualization in kWh on a dedicated scale.

import { useState } from "react";
import {
  calculateChartBounds,
  formatKolkataDate,
  formatKolkataTime,
  formatKolkataTimestamp,
  generateSvgPath,
  type ScopeSeries,
} from "../../lib/chart-buffer";

export interface EnergyChartProps {
  series: ScopeSeries | null;
  scopeName?: string;
  statusText?: string;
  isStale?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function formatEnergy(kwh: number | null): string {
  if (kwh === null || isNaN(kwh)) return "-- kWh";
  if (kwh < 0.01 && kwh > 0) {
    return `${kwh.toFixed(4)} kWh`;
  }
  return `${kwh.toFixed(3)} kWh`;
}

export default function EnergyChart({
  series,
  scopeName,
  statusText,
  isStale = false,
  emptyMessage = "Collecting energy accumulation points...",
  className = "",
}: EnergyChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const samples = series?.samples ?? [];
  const latestEnergy = series?.latestEnergyKwh ?? null;
  const hasGaps = series?.hasGaps ?? false;
  const showDateContext = samples.length > 1
    && formatKolkataDate(samples[0].sim_time_utc) !== formatKolkataDate(samples[samples.length - 1].sim_time_utc);
  const formatAxisTime = (isoUtc: string) => showDateContext
    ? formatKolkataTimestamp(isoUtc)
    : formatKolkataTime(isoUtc);

  const width = 580;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 60 };

  // Use the same retained-sample bounds as the SVG path. The latest value may
  // legitimately decrease after a reset/command correction; the axis must still
  // contain the full retained series rather than silently clipping it.
  const energyBounds = calculateChartBounds(samples, "energy");
  const svgResult = generateSvgPath(samples, "energy", width, height, padding, energyBounds);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxEnergyDisplay = energyBounds.maxVal;

  const yTicks = [0, 0.33, 0.66, 1.0];

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
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <h3 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase">
              Cumulative Energy
            </h3>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {scopeName ?? series?.name ?? "No Scope"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Simulated elapsed energy accumulation (kWh)
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
            <div className="text-xl font-bold font-mono tracking-tight text-amber-400">
              {formatEnergy(latestEnergy)}
            </div>
            <div className="text-[10px] text-zinc-400">
              Accumulated Total
            </div>
          </div>
        </div>
      </div>

      {/* SVG Plot */}
      <div className="relative mt-3 w-full overflow-hidden">
        {samples.length < 2 ? (
          <div className="flex h-[220px] flex-col items-center justify-center text-sm text-zinc-400">
            <div className="h-6 w-6 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin motion-reduce:animate-none" />
            <span className="mt-2">{emptyMessage}</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            aria-label="Cumulative energy trend graph"
            tabIndex={0}
          >
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
              const labelKwh = pct * maxEnergyDisplay;
              return (
                <g key={`ey-${idx}`}>
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
                    {labelKwh >= 1
                      ? labelKwh.toFixed(1)
                      : labelKwh >= 0.01
                      ? labelKwh.toFixed(2)
                      : labelKwh.toFixed(3)}
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

            {/* Polyline Path Segments */}
            {svgResult.segments.map((segD, sIdx) => (
              <path
                key={`eseg-${sIdx}`}
                d={segD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Latest point dot */}
            {svgResult.latestPoint && (
              <g>
                <circle
                  cx={svgResult.latestPoint.x}
                  cy={svgResult.latestPoint.y}
                  r="5"
                  fill="#f59e0b"
                  opacity="0.4"
                />
                <circle
                  cx={svgResult.latestPoint.x}
                  cy={svgResult.latestPoint.y}
                  r="3.5"
                  fill="#fbbf24"
                  stroke="#451a03"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Hover crosshair */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padding.top}
                  x2={activePoint.x}
                  y2={padding.top + plotHeight}
                  stroke="#f59e0b"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="4"
                  fill="#fbbf24"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Transparent hover hit boxes */}
            {svgResult.points.map((pt, pIdx) => (
              <rect
                key={`ehit-${pIdx}`}
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
            className="pointer-events-none absolute top-2 right-2 rounded border border-amber-800 bg-zinc-900/90 px-2 py-1 text-xs shadow-md backdrop-blur-sm"
          >
            <span className="font-mono text-zinc-400">
              {showDateContext ? formatKolkataTimestamp(activePoint.timeUtc) : formatKolkataTime(activePoint.timeUtc)}
            </span>
            <span className="ml-2 font-mono font-bold text-amber-300">
              {formatEnergy(activePoint.val)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
