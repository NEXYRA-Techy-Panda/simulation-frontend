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

in_progress — SIM-VIS-01 visual integration is being merged onto the current
K003/chart-preserving main line. Review status: pending (never self-approved).

## SIM-VIS-01 integration checkpoint

- Integration branch: `mohan/sim-visual-integration`, based on current main
  `7220011` and integrating visual commit `958c25b` from
  `mohan/sim-visual-01`.
- The illustrated office map, room inspector, original SVG illustrations,
  status strip, lifecycle controls, technical disclosure and isolated mock
  preview are being retained.
- Current K003 historical export and SIM-CHART-01 live telemetry remain mounted;
  map room/device selection is propagated into the existing chart scope.
- The visual preview fixtures are development-only and never contact or mutate
  the simulator backend. The old map component is replaced by the illustrated
  map panel.
- Combined checks so far: 84 tests passed, typecheck passed, build passed,
  contract 75/75 passed, lint has zero errors plus the existing verifier
  warning. K004-FAST1 `FastDaysPanel` remains mounted below the visual live
  view. Browser/deployment observation remains separate and unclaimed.


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

Expected task-owned additions/changes include the visual illustrations, map and
room inspector, preview fixtures/tests, merged `SimLive`/chart/export wiring,
package test glob, and continuity/evidence docs. No contract, deployment config,
environment, backend mutation, production database, or public simulator
mutation is authorized.

All integration testing must use scratch data/task-owned processes. Finish
SIM-VIS-01 integration review, push the integration branch, and merge it into
`main` only after the final verification. Do not start K004 or unrelated work.

## exact next action

Resolve and verify the visual integration, then publish the integration branch
and update `main` without touching backend, deployment, or production state.

## Visual enhancement follow-up

- Added a contained **Full screen map** mode with Escape-to-exit, a separate
  in-map room list, and a non-overlapping room inspector layout.
- Reduced the status-strip analog/digital clocks for more map space.
- Added deterministic moving mock occupants to the development-only preview;
  live occupancy remains backend-authoritative and is never randomized or
  mutated in the browser.
- Verification after the enhancement: 85 tests, typecheck, build and contract
  75/75 passed; lint has 0 errors plus the existing verifier warning. Browser
  review is intentionally left to the user.
