# simulation-frontend

Simulator user interface for the NEXYRA commercial-building energy simulation
and auditing project.

- **Role**: Next.js + React + TypeScript + Tailwind app that sends commands to
  `simulation-backend` and renders its authoritative state (5-room map,
  occupant dots, clocks, devices, history, export triggers).
- **Owner**: Mohan (foundation F0–F6) → Kishore Kumar (after handoff).
- **Local port (proposed)**: `3000`. Backend: `http://localhost:4000`.
- **State at F0 (2026-09-24)**: empty repository — documentation only, no code.
  See `docs/HANDOFF.md` for verified state.

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
