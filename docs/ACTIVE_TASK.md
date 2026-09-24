# ACTIVE_TASK — simulation-frontend

## prompt_id

SIM-INTEGRATION — chart addition, continuing K003/K004 integration under
Kishore | K-A — OpenCode.

## agent / owner

- Developer: Kishore Kumar
- Agent: K-A — OpenCode
- Previous owners: Agent K (Kishore's coding agent), K-C — Antigravity Gemini
- Exclusive scope: `simulation-frontend` for this integration task.

## status

completed — K003 and the chart merge are preserved; review follow-up `a47204d`
and final docs `53d5bc9` are pushed and observed read-only on the deployed
frontend. No public mutation was performed.

Review status: pending (never self-approved).

## baseline and preserved work

- Current main before this merge was K003 commit `c4b319d`, on top of the
  deployment baseline `dbcbee9`.
- K003 historical export UI, responsive correction, continuity, and evidence
  remain intact and must not be reset or discarded.
- SIM-CHART-01 source/evidence comes from worktree
  `../simulation-frontend-charts`, branch `kishore/sim-chart-01`, commit
  `9fc0f79f3082929cd67c475bc4b1902543632090`, based on `dbcbee9`.
- The chart branch is merged normally; this task adds only the authoritative
  integration, safety corrections, and verification.

## K003 preserved outcome

- `HistoricalExportPanel` uses `/sim`, persisted committed coverage, JSON/CSV,
  all six resolutions, bounded downloads, and honest no-data/error states.
- True 375px and 1280px layout checks passed; export behavior and lifecycle
  controls remain covered by K003 evidence.

## SIM-INTEGRATION implementation checkpoint

- Merge chart components and pure buffer/history adapter from `9fc0f79`.
- Mount `LiveCharts` from the existing `SimLive` polling state; no second poll
  loop or Socket.IO path.
- Connect real room/device selection from `OfficeMap`; device scope is disabled
  clearly until a device is actually selected.
- Preserve all scope histories in the bounded buffer and bound each scope to
  600 samples. Do not reset on render/scope changes; reset only on run change.
- Preserve actual cumulative energy values; never clamp decreases. Use explicit
  null gaps and stale status, and add date context to long/high-speed windows.
- Retain the existing export, lifecycle, device-command, and responsive map
  behavior. Do not overwrite an eventual SIM-VIS-01 illustrated-map redesign;
  mount below the map for the current integration.

## verification checkpoint — actual

- Chart branch's isolated checks: 29/29 tests, typecheck, lint, and build passed;
  its screenshots are mock evidence, not telemetry proof.
- K003 gates: 28/28 tests, typecheck, build, and contract 75/75; lint has one
  pre-existing verifier warning.
- Backend source inspection confirms `run.seq` increments on every processed
  step and on state-changing controls. The existing `shouldApplyUpdate` accepts
  equal sequence responses; chart buffer identity also includes run, sequence,
  and simulated time.
- Real browser telemetry integration passed on a task-owned scratch run:
  office `168 W`/`0.006066666666666666 kWh` matched chart `#15` `168 W`/
  `0.0061 kWh`; supported meeting light measured `72 W` on and `0 W` off;
  pause froze `2025-12-31T18:32:10Z`; reset created a new run and one `#0`
  sample. True 375x812 CDP width was `375/375` with no overflow.
- Combined current-tree checks after review fixes: 43/43 tests,
  typecheck/build passed, lint has one pre-existing verifier warning, contract
  75/75. K003 export remains mounted; headless disk persistence remains
  unclaimed.
- Final remote state: backend `5cb824d`, frontend evidence/continuation
  `53d5bc9` plus the current final handoff commit (implementation merge
  `bacc8ff`, review fixes `a47204d`). Public health/runs/export and deployed
  chart/375px observations are recorded; no mutation was sent.

## files and safety

Expected task-owned additions/changes include chart components, chart buffer and
tests, `SimLive`/`OfficeMap` integration, package test glob, and continuity/
evidence docs. No contract, deployment config, environment, backend mutation,
production database, or public simulator mutation is authorized.

All integration testing must use a scratch database/task-owned processes. Stop
after chart integration and K003 publication; do not start K004 or unrelated
feature work.

## exact next action

Integration is closed through publication and read-only observation. Do not
start K004 or unrelated feature work.
