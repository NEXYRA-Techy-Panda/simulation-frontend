# ACTIVE_TASK — simulation-frontend (Branch: kishore/sim-chart-01)

## prompt_id

SIM-CHART-01

## agent

K-C — Antigravity Gemini (Kishore Kumar ownership)

## Layer ID

Live simulator telemetry charts (Milestone 1 / 2)

## Objective

Implement isolated scrolling, ECG-style live telemetry graphs:
- Live power trend (W / kW).
- Cumulative energy trend (kWh).
- Scope support: Whole office, selected room, selected device.
- Accessible recent-values table view.
- Bounded ring buffer with out-of-order and duplicate seq filtering.

## Task status

completed (Milestone 1: component implementation, tests, and isolated visual preview)

## Review status

pending (never self-assigned)

## Repository and branch

- Repository: `simulation-frontend` (worktree `simulation-frontend-charts`)
- Branch: `kishore/sim-chart-01`
- Base Commit: `dbcbee9b935a3f6777f7a8bfca097d258e02e652`
- Owner: Kishore Kumar

## Verification Performed

- `npm test`: 29 passed, 0 failed (19 sim-state + 10 chart-buffer).
- `npm run typecheck`: clean (0 errors).
- `npm run lint`: 0 errors, 1 pre-existing warning.
- `next build`: clean exit 0.
- Headless Chrome preview screenshots: `docs/screenshots/chart-desktop-overview.png`, `docs/screenshots/chart-mobile-375px.png`.

## Exact Next Action (Milestone 2)

Hand off `LiveCharts` component to K-A (OpenCode) to mount in `app/components/sim-live.tsx` beneath the SVG office floorplan and verify against live backend polling.
