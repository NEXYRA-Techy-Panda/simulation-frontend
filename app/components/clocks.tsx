// Analogue + digital clocks from one backend instant (P009 / S10-A).
// Both render ONLY describeInstant(sim_time_utc). No computer time as
// simulation time, no independent advancement, frozen while paused.

import {
  BUILDING_TIMEZONE,
  describeInstant,
} from "../lib/sim-state";

function Hand({
  angle,
  length,
  width,
  label,
}: {
  angle: number;
  length: number;
  width: number;
  label: string;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return (
    <line
      x1={70}
      y1={70}
      x2={70 + length * Math.cos(rad)}
      y2={70 + length * Math.sin(rad)}
      strokeWidth={width}
      strokeLinecap="round"
      className="stroke-zinc-900 dark:stroke-zinc-100"
      aria-hidden="true"
    >
      <title>{label}</title>
    </line>
  );
}

export default function Clocks({ simTimeUtc }: { simTimeUtc: string | null }) {
  if (!simTimeUtc) {
    return (
      <section
        aria-label="Simulation clocks"
        className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Simulation time
        </h2>
        <p className="mt-2 text-lg text-zinc-900 dark:text-zinc-50">
          No simulation started
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Start a run to see the backend simulation time. The real-world clock
          is never shown as simulation time.
        </p>
      </section>
    );
  }

  const view = describeInstant(simTimeUtc);
  if (!view) {
    return (
      <section
        aria-label="Simulation clocks"
        className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Simulation time
        </h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Unparseable simulation timestamp from backend.
        </p>
      </section>
    );
  }

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const rad = ((i * 30 - 90) * Math.PI) / 180;
    return {
      x1: 70 + 58 * Math.cos(rad),
      y1: 70 + 58 * Math.sin(rad),
      x2: 70 + 64 * Math.cos(rad),
      y2: 70 + 64 * Math.sin(rad),
    };
  });

  return (
    <section
      aria-label="Simulation clocks"
      className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Simulation time
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-6">
        <svg
          viewBox="0 0 140 140"
          width={140}
          height={140}
          role="img"
          aria-label={`Analogue simulation clock showing ${view.timePart} ${BUILDING_TIMEZONE}`}
        >
          <circle
            cx={70}
            cy={70}
            r={66}
            fill="none"
            strokeWidth={2}
            className="stroke-zinc-400 dark:stroke-zinc-600"
          />
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={i % 3 === 0 ? 3 : 1.5}
              className="stroke-zinc-500 dark:stroke-zinc-400"
            />
          ))}
          <Hand angle={view.hourAngle} length={32} width={5} label="Hour hand" />
          <Hand
            angle={view.minuteAngle}
            length={48}
            width={3.5}
            label="Minute hand"
          />
          <Hand
            angle={view.secondAngle}
            length={54}
            width={1.5}
            label="Second hand"
          />
          <circle cx={70} cy={70} r={4} className="fill-zinc-900 dark:fill-zinc-100" />
        </svg>
        <div>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {view.datePart}
          </p>
          <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {view.timePart}
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400">
            {BUILDING_TIMEZONE}
            {view.tzAbbrev ? ` (${view.tzAbbrev})` : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            backend {view.isoUtc}
          </p>
        </div>
      </div>
    </section>
  );
}
