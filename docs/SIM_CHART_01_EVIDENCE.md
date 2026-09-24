# SIM-CHART-01 Evidence — Live Simulator Graphs (Milestone 1)

- **Developer:** Kishore Kumar
- **Agent:** K-C — Antigravity Gemini
- **Assignment:** SIM-CHART-01
- **Layer:** Live telemetry chart components & bounded buffer
- **Branch:** `kishore/sim-chart-01`
- **Base Commit:** `dbcbee9b935a3f6777f7a8bfca097d258e02e652`
- **Status:** Completed (review pending)
- **Timestamp:** 2026-09-25 03:00:00 +05:30 (IST)

---

## 1. Overview & Architecture

SIM-CHART-01 delivers continuous scrolling, ECG-style monitoring graphs for live simulation telemetry:
- **Live Power Trend (W / kW):** Continuous SVG telemetry with straight segments, glowing cyan beam, min/max window extrema, hover crosshair, and latest-point pulsing beacon.
- **Cumulative Energy Trend (kWh):** Dedicated independent scale displaying monotonic energy accumulation with amber line and latest-value badge.
- **Scope Support:** Seamless switching between **Whole Office**, **Selected Room**, and **Selected Device** without mutating simulation state.
- **Accessible Data Table:** Optional toggle between live graphical telemetry and tabular screen-reader accessible readings with timestamps in `Asia/Kolkata`.

---

## 2. Component & Helper Paths

| Path | Role |
|---|---|
| `app/lib/chart-buffer.ts` | Bounded sliding ring buffer (`TelemetryBuffer`), out-of-order & duplicate seq filtering, same-time sequence updates, null gap tracking, Asia/Kolkata date formatters, and straight SVG path generator. |
| `app/lib/history-adapter.ts` | Normalizes recorded interval data (from contract v1.0.1 exports or history jobs) without conflating interval averages with instantaneous peaks. |
| `app/components/charts/live-charts.tsx` | Master telemetry chart coordinator with scope tabs, view toggles, empty/standby states, and responsive layout. |
| `app/components/charts/power-chart.tsx` | Live power trend SVG chart with Y-axis auto-ticks, X-axis timestamps, latest-point beacon, and hover tooltips. |
| `app/components/charts/energy-chart.tsx` | Cumulative energy SVG chart with dedicated kWh scale and monotonic trend display. |
| `app/components/charts/accessible-table.tsx` | Screen-reader accessible table of recent telemetry readings. |
| `app/lib/__tests__/chart-buffer.test.mjs` | 10 focused unit tests covering buffer boundedness, timestamps, run transitions, gaps, and zero/flat-line safety. |

---

## 3. Exact Integration Interface (For K-A / OpenCode)

To integrate into `app/components/sim-live.tsx` or any office layout container:

```tsx
import LiveCharts from "./charts/live-charts";

// Inside SimLive or parent component:
<LiveCharts
  state={sim}
  isStale={stale}
  selectedRoom={selectedRoom ? { room_id: selectedRoom.room_id, name: selectedRoom.name } : null}
  selectedDevice={selectedDevice ? { device_id: selectedDevice.device_id, name: selectedDevice.name } : null}
  roomNames={roomNamesMap}
  deviceNames={deviceNamesMap}
  className="mt-6"
/>
```

### Props Contract
- `state`: Authoritative `SimState | null` from existing polling. No duplicate HTTP polling.
- `isStale`: Boolean flag from polling coordinator. Stale connection displays prominent warning badge and retains prior data without zeroing.
- `selectedRoom`: `{ room_id: string; name: string } | null`
- `selectedDevice`: `{ device_id: string; name: string } | null`
- `roomNames` / `deviceNames`: Optional human-readable name maps.

---

## 4. Data Semantics & High-Speed Honesty

- **Sampled Live Readings:** Clearly labeled `"Sampled live readings (not interval average)"`. At 1000× speed, browser polling captures discrete samples; UI does not claim sampled peaks equal interval maxima.
- **Run Transitions:** When `state.run_id` changes, all series reset immediately to prevent cross-run pollution.
- **Monotonic Sequence:** Samples with `seq <= lastSeq` are discarded. If timestamp matches `lastTimeUtc` with newer `seq`, latest sample is updated in place to prevent zero-duration time steps.
- **Null Gaps vs Zero:** Missing or unavailable readings remain `null`, causing SVG paths to break into separate sub-segments rather than inventing zero consumption.
- **Bounded Buffer:** Memory is hard-capped at 600 samples per scope series (~10 minutes at 1 Hz).

---

## 5. Visual Evidence & Screenshots

Captured using system-installed Google Chrome headless (`--headless=new`):
- `docs/screenshots/chart-desktop-overview.png`: Full desktop overview demonstrating power step function, Y-axis scaling, X-axis timestamps, and cumulative energy curve.
- `docs/screenshots/chart-mobile-375px.png`: Mobile 375px layout showing responsive wrapping without horizontal overflow or clipping.

---

## 6. Verification Results

- `npm test`: **29 passed**, 0 failed (19 sim-state + 10 chart-buffer).
- `npm run typecheck`: **Clean** (0 errors).
- `npm run lint`: **0 errors**, 1 pre-existing warning.
- `npm run build`: **Exit 0** (compiled static routes).

---

## 7. Exact Next Integration Action (Milestone 2)

Hand off `LiveCharts` component and integration props to K-A (OpenCode) to mount in `app/components/sim-live.tsx` beneath the SVG office floorplan.
