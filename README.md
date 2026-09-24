# simulation-frontend

Simulator user interface for the NEXYRA commercial-building energy simulation
and auditing project.

- **Role**: Next.js + React + TypeScript + Tailwind app that sends commands to
  `simulation-backend` and renders its authoritative state (5-room map,
  clocks, devices, live telemetry charts, history, export triggers).
- **Owner**: Mohan (foundation F0–F6) → Kishore Kumar (after handoff).
- **Frontend port**: `3000`. Public backend:
  `https://git-pipeline.metatronhost.in/sim`.
- **Current state (SIM-INTEGRATION, 2026-09-25)**: authoritative simulator UI,
  historical JSON/CSV export controls, and bounded live power/energy charts;
  review pending. The chart uses the existing polling stream and real map
  selection, while export coverage remains persisted and `/sim`-anchored.

Docs:

- [Project context](docs/PROJECT_CONTEXT.md)
- [Workspace map](docs/WORKSPACE_MAP.md)
- [Handoff](docs/HANDOFF.md)
- [Agent start prompt](docs/AGENT_START_PROMPT.md)
- [Active task](docs/ACTIVE_TASK.md)
- [Progress log](docs/PROGRESS_LOG.md)
- [F1 evidence](docs/F1_EVIDENCE.md)
- [Data contract v1](contracts/v1/CONTRACT.md)
- [Service interfaces](contracts/v1/API.md)
- [F2-A evidence](docs/F2_A_EVIDENCE.md)
- [K003 export UI evidence](docs/K003_EXPORT_UI_EVIDENCE.md)
- [SIM-INTEGRATION chart evidence](docs/SIM_INTEGRATION_EVIDENCE.md)

## Developer setup (F2-A foundation)

Stack: Next.js 16.3.6, React 19.2.8, TypeScript, Tailwind v4, npm.
Requires Node >=20.9 (verified on Node v24.21.0).

```powershell
npm install          # install dependencies
npm run dev          # develop on http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (0 errors)
npm run verify:contract  # dependency-free contract checks (75/75)
npm run build        # production build
npm run start        # serve production on http://localhost:3000
```

## Historical export

The live UI reads `GET /api/v1/runs`, shows committed persisted coverage, and
downloads backend-generated JSON or standalone CSV for 1/5/10/15/30/60-minute
aggregation. It does not calculate telemetry or use live simulated time as
coverage. Equivalent file downloads share a backend export identity. Full
wiring, numerical tests and browser evidence are in
[`docs/K003_EXPORT_UI_EVIDENCE.md`](docs/K003_EXPORT_UI_EVIDENCE.md).

## Live telemetry charts

The chart coordinator is mounted below the office map and consumes the existing
`SimLive` polling state. It shows sampled power, actual cumulative energy,
explicit stale/gap status, bounded per-scope history, an accessible data table,
and real room/device chart selection. It does not add a second polling loop or
calculate simulator telemetry. Integration evidence is in
[`docs/SIM_INTEGRATION_EVIDENCE.md`](docs/SIM_INTEGRATION_EVIDENCE.md).

Deployment configuration is fixed in
[`app/lib/deployment-config.ts`](app/lib/deployment-config.ts). The public API
base includes the required `/sim` path prefix; adapters append contract
routes such as `/api/v1/health`. No Vercel environment variable is required.
