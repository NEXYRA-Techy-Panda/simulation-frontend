"use client";

// Accessible Recent-Values Table (SIM-CHART-01).
// Provides tabular, screen-reader friendly telemetry records.

import { formatKolkataTimestamp, type ChartSample } from "../../lib/chart-buffer";
import { formatPower } from "./power-chart";
import { formatEnergy } from "./energy-chart";

export interface AccessibleTableProps {
  samples: ChartSample[];
  scopeName: string;
  className?: string;
}

export default function AccessibleTable({
  samples,
  scopeName,
  className = "",
}: AccessibleTableProps) {
  // Show most recent 15 samples, newest first
  const recent = [...samples].reverse().slice(0, 15);

  return (
    <div
      className={`overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-800 ${className}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-200">
          Recent Telemetry Readings — {scopeName}
        </h4>
        <span className="text-xs text-zinc-400">
          Showing latest {recent.length} samples
        </span>
      </div>

      <table className="w-full text-left text-xs font-mono text-zinc-300">
        <caption className="sr-only">
          Recent simulated power and cumulative energy telemetry readings for {scopeName}
        </caption>
        <thead className="border-b border-zinc-800 text-[11px] text-zinc-400 uppercase">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">
              Sim Time (Kolkata)
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Seq
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Power
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Cumulative Energy
            </th>
            <th scope="col" className="py-2 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {recent.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-center text-zinc-400">
                No telemetry samples collected yet.
              </td>
            </tr>
          ) : (
            recent.map((s, idx) => (
              <tr key={`row-${s.seq}-${idx}`} className="hover:bg-zinc-900/40">
                <td className="py-2 pr-4 text-zinc-200">
                  {formatKolkataTimestamp(s.sim_time_utc)}
                </td>
                <td className="py-2 pr-4 text-zinc-400">
                  #{s.seq}
                </td>
                <td className="py-2 pr-4 font-semibold text-cyan-400">
                  {formatPower(s.power_w)}
                </td>
                <td className="py-2 pr-4 text-amber-400">
                  {formatEnergy(s.energy_kwh)}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.2 text-[10px] uppercase ${
                      s.status === "running"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                        : s.status === "paused"
                        ? "bg-zinc-800 text-zinc-300"
                        : "bg-amber-950 text-amber-400 border border-amber-800/50"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
