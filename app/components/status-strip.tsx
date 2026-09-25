"use client";

// SIM-VIS-01 status strip (Agent M-D — FreeBuff).
//
// Prominent simulation time, lifecycle status, speed and energy. All values
// come from the same authoritative backend poll that already feeds the page;
// nothing is derived, advanced or recomputed here.

import Clocks from "./clocks";
import type { SimState } from "../lib/sim-state";

const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const energyFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function formatPower(value: number | undefined): string {
  return value === undefined ? "—" : `${integerFormatter.format(value)} W`;
}

function formatEnergy(value: number | undefined): string {
  return value === undefined ? "—" : `${energyFormatter.format(value)} kWh`;
}

function shortRunId(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length > 24 ? `${value.slice(0, 21)}…` : value;
}

export default function StatusStrip({
  sim,
  stale,
}: {
  sim: SimState | null;
  stale: boolean;
}) {
  return (
    <section className="sim-strip" aria-label="Simulation status">
      <div className="sim-strip-clock">
        <Clocks simTimeUtc={sim?.sim_time_utc ?? null} variant="strip" />
      </div>

      <dl className="sim-strip-facts">
        <Fact label="Status">
          <span className={`sim-status sim-status-${sim?.status ?? "unknown"}`}>
            {sim?.status ?? "unknown"}
          </span>
          {stale && <span className="sim-stale-flag">stale</span>}
        </Fact>
        <Fact label="Speed">{sim ? `${sim.speed}×` : "—"}</Fact>
        <Fact label="Office power">
          {formatPower(sim?.office?.power_w)}
        </Fact>
        <Fact label="Cumulative energy">
          {formatEnergy(sim?.office?.energy_kwh)}
        </Fact>
        <Fact label="Run">
          <span className="sim-mono sim-small sim-run-value" title={sim?.run_id ?? undefined}>
            {shortRunId(sim?.run_id)}
          </span>
        </Fact>
      </dl>
    </section>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sim-fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
