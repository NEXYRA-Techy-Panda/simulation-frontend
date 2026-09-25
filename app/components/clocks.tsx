// Analogue + digital clocks from one backend instant (P009 / S10-A).
// Both render ONLY describeInstant(sim_time_utc). No computer time as
// simulation time, no independent advancement, frozen while paused.
//
// SIM-VIS-01 keeps both clocks and adds a "strip" variant so they can sit in
// the prominent status strip without their own card. The panel variant is the
// original presentation and is unchanged.

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
  const coordinate = (value: number) => Number(value.toFixed(4));
  return (
    <line
      x1={70}
      y1={70}
      x2={coordinate(70 + length * Math.cos(rad))}
      y2={coordinate(70 + length * Math.sin(rad))}
      strokeWidth={width}
      strokeLinecap="round"
      className="stroke-zinc-900 dark:stroke-zinc-100"
      aria-hidden="true"
    >
      <title>{label}</title>
    </line>
  );
}

function AnalogClock({ view }: { view: NonNullable<ReturnType<typeof describeInstant>> }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const rad = ((i * 30 - 90) * Math.PI) / 180;
    const coordinate = (value: number) => Number(value.toFixed(4));
    return {
      x1: coordinate(70 + 58 * Math.cos(rad)),
      y1: coordinate(70 + 58 * Math.sin(rad)),
      x2: coordinate(70 + 64 * Math.cos(rad)),
      y2: coordinate(70 + 64 * Math.sin(rad)),
    };
  });
  return (
    <svg
      viewBox="0 0 140 140"
      width={140}
      height={140}
      role="img"
      aria-label={`Analogue simulation clock showing ${view.timePart} ${BUILDING_TIMEZONE}`}
      className="sim-clock-face"
    >
      <circle cx={70} cy={70} r={66} fill="none" strokeWidth={2} className="stroke-zinc-400 dark:stroke-zinc-600" />
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
      <Hand angle={view.minuteAngle} length={48} width={3.5} label="Minute hand" />
      <Hand angle={view.secondAngle} length={54} width={1.5} label="Second hand" />
      <circle cx={70} cy={70} r={4} className="fill-zinc-900 dark:fill-zinc-100" />
    </svg>
  );
}

export default function Clocks({
  simTimeUtc,
  variant = "panel",
}: {
  simTimeUtc: string | null;
  variant?: "panel" | "strip";
}) {
  const strip = variant === "strip";
  const Wrap = strip ? "div" : "section";

  if (!simTimeUtc) {
    return (
      <Wrap
        aria-label="Simulation clocks"
        className={strip ? "sim-clocks sim-clocks-strip" : "rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"}
      >
        {!strip && (
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Simulation time
          </h2>
        )}
        <p className={strip ? "sim-clock-idle" : "mt-2 text-lg text-zinc-900 dark:text-zinc-50"}>
          {strip ? "No run started" : "No simulation started"}
        </p>
        {!strip && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Start a run to see the backend simulation time. The real-world clock
            is never shown as simulation time.
          </p>
        )}
      </Wrap>
    );
  }

  const view = describeInstant(simTimeUtc);
  if (!view) {
    return (
      <Wrap
        aria-label="Simulation clocks"
        className={strip ? "sim-clocks sim-clocks-strip" : "rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"}
      >
        {!strip && (
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Simulation time
          </h2>
        )}
        <p className={strip ? "sim-clock-error" : "mt-2 text-sm text-red-700 dark:text-red-300"}>
          Unparseable simulation timestamp from backend.
        </p>
      </Wrap>
    );
  }

  return (
    <Wrap
      aria-label="Simulation clocks"
      className={strip ? "sim-clocks sim-clocks-strip" : "rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"}
    >
      {!strip && (
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Simulation time
        </h2>
      )}
      <div className={strip ? "sim-clocks-body" : "mt-3 flex flex-wrap items-center gap-6"}>
        <AnalogClock view={view} />
        <div>
          <p className={strip ? "sim-clock-digital" : "text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"}>
            {view.timePart}
          </p>
          <p className={strip ? "sim-clock-date" : "text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"}>
            {view.datePart}
          </p>
          <p className={strip ? "sim-clock-tz" : "mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400"}>
            {BUILDING_TIMEZONE}
            {view.tzAbbrev ? ` (${view.tzAbbrev})` : ""}
          </p>
          <p className={strip ? "sim-clock-backend" : "mt-1 font-mono text-xs text-zinc-400 dark:text-zinc-500"}>
            backend {view.isoUtc}
          </p>
        </div>
      </div>
    </Wrap>
  );
}
