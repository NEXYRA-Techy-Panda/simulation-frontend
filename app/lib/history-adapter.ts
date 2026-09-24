// Telemetry History and Recorded Interval Adapter (SIM-CHART-01).
// Normalizes historical recorded interval readings from contract v1.0.1
// exports or batch history jobs into chart-ready series without falsifying peaks.

export interface RecordedInterval {
  interval_start_utc: string;
  interval_end_utc: string;
  interval_seconds: number;
  avg_power_w: number;
  max_power_w?: number;
  energy_kwh: number;
  cumulative_kwh?: number;
  policy_ref?: string;
  partial?: boolean;
}

export interface HistoricalChartPoint {
  time_start_utc: string;
  time_end_utc: string;
  time_ms: number;
  avg_power_w: number | null;
  max_power_w: number | null;
  interval_energy_kwh: number | null;
  cumulative_kwh: number | null;
  is_gap: boolean;
  is_partial: boolean;
}

export interface HistoricalSeries {
  scopeId: string;
  points: HistoricalChartPoint[];
  totalEnergyKwh: number;
  maxRecordedPowerW: number | null;
  hasGaps: boolean;
  intervalSeconds: number;
}

/** Converts an array of sorted recorded intervals into chart-ready points, preserving breaks where intervals are non-contiguous. */
export function adaptRecordedIntervals(
  scopeId: string,
  intervals: RecordedInterval[]
): HistoricalSeries {
  if (intervals.length === 0) {
    return {
      scopeId,
      points: [],
      totalEnergyKwh: 0,
      maxRecordedPowerW: null,
      hasGaps: false,
      intervalSeconds: 60,
    };
  }

  const points: HistoricalChartPoint[] = [];
  let totalEnergy = 0;
  let peakPower: number | null = null;
  let hasGaps = false;
  let lastEndMs: number | null = null;
  const nominalSeconds = intervals[0]?.interval_seconds ?? 60;

  for (let i = 0; i < intervals.length; i++) {
    const inv = intervals[i];
    const startMs = new Date(inv.interval_start_utc).getTime();
    const endMs = new Date(inv.interval_end_utc).getTime();

    // Check for discontinuity / missing intervals
    if (lastEndMs !== null && startMs > lastEndMs) {
      hasGaps = true;
      // Insert explicit gap boundary point
      points.push({
        time_start_utc: new Date(lastEndMs).toISOString(),
        time_end_utc: inv.interval_start_utc,
        time_ms: lastEndMs,
        avg_power_w: null,
        max_power_w: null,
        interval_energy_kwh: null,
        cumulative_kwh: null,
        is_gap: true,
        is_partial: false,
      });
    }

    const avgP = typeof inv.avg_power_w === "number" ? inv.avg_power_w : null;
    const maxP = typeof inv.max_power_w === "number" ? inv.max_power_w : avgP;
    const energy = typeof inv.energy_kwh === "number" ? inv.energy_kwh : 0;

    if (avgP !== null && (peakPower === null || (maxP ?? avgP) > peakPower)) {
      peakPower = maxP ?? avgP;
    }
    totalEnergy += energy;

    points.push({
      time_start_utc: inv.interval_start_utc,
      time_end_utc: inv.interval_end_utc,
      time_ms: startMs,
      avg_power_w: avgP,
      max_power_w: maxP,
      interval_energy_kwh: energy,
      cumulative_kwh: inv.cumulative_kwh ?? null,
      is_gap: false,
      is_partial: Boolean(inv.partial),
    });

    lastEndMs = endMs;
  }

  return {
    scopeId,
    points,
    totalEnergyKwh: totalEnergy,
    maxRecordedPowerW: peakPower,
    hasGaps,
    intervalSeconds: nominalSeconds,
  };
}
