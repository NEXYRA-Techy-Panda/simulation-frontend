# HANDOFF — simulation-frontend

## SIM-VIS-01 visual takeover checkpoint (2026-09-25; in progress)

- M-D — FreeBuff's session ended with source/assets/tests uncommitted in the
  expected registered worktree `../simulation-frontend-visual`, branch
  `mohan/sim-visual-01`, initially at `dbcbee9`. Work is preserved and
  attribution retained. Main worktree was separate and clean at the same SHA.
- The saved implementation includes the top-down five-room office, SVG crew
  and equipment art, status/clocks, room selection/inspector, fixture scenarios
  and pure tests. These are observed files, not yet fully verified or accepted.
- Current takeover/evidence: [SIM_VIS_01_EVIDENCE.md](SIM_VIS_01_EVIDENCE.md).
  No task-owned process was running at inspection. Browser screenshots,
  verification, bug fixes, local commit and bundle remain pending.
- Chart branch `kishore/sim-chart-01` at `9fc0f79f3082929cd67c475bc4b1902543632090`
  was absent locally and was not merged. K-A owns main integration; this branch
  remains isolated with no push or deployment.

## 0. Continuity and current layer (F0.1, 2026-09-24)

- Current layer: **K002 / K1 — contract checkout portability and run-policy
  timing** (Agent K — Kishore's coding agent) — status **completed**, review
  **pending**. In this repository only checkout configuration (`.gitattributes`)
  and documentation changed; no app source, config, dependency, lockfile or
  contract file was modified. Contract: **1.0.1 authoritative, read-only**. The
  K001 line-ending mismatch is **fixed**: `contracts/v1/**` and
  `scripts/verify-contract.mjs` now check out with LF, so `verify:contract`
  reports **75/75** here and in a fresh clone that inherits
  `core.autocrlf=true` (K002 addendum below).
- K001 addendum (2026-09-24, Agent K — Kishore's coding agent, setup/onboarding
  only, review **pending**; prompted as P018, renamed K001 before it ran — no
  P018 record existed, so no history was rewritten): reused the existing clone
  on Kishore's laptop (`main` at `2de8caa` == the reported P011 baseline ==
  `origin/main`, clean tree, fetch clean, repo-local identity Kishore's, not
  Mohan's). Toolchain: Windows 11 build 26200 in Git Bash, git
  `2.55.0.windows.4`, node `v24.19.0`, npm `11.17.0`, ports 3000/4000 free;
  `npm ci` clean with versions unchanged (npm 11 blocked the unrs-resolver
  postinstall — cosmetic). Checks: `typecheck` 0, `lint` 0 errors / 1
  pre-existing warning, `npm test` **18/18**, `npm run build` 0 (`/` and
  `/_not-found` static), `verify:contract` **67 passed / 8 failed (exit 1)** —
  the same line-ending manifest hash failures as the backend, cause proven
  (evidence §8), not fixed in a setup task. Live serve: production
  `next start -p 3000` served `GET /` **HTTP 200** (16,282 bytes) with the
  header/lifecycle/refresh/connection markers and **no room names in SSR**
  (correct: inventory is fetched client-side), while the compiled backend ran
  on 4000 against a scratch database and returned `ok` with
  `Access-Control-Allow-Origin: http://localhost:3000`; the POST preflight for
  `/api/v1/control/start` returned **204**. Confirmed by inspection that
  `NEXT_PUBLIC_SIMULATION_BACKEND_URL` is origin-only (read in the server
  component `app/page.tsx` and passed as a prop; libs append the full
  `/api/v1/...` paths), so no duplicated prefix is possible and nothing is
  inlined into client chunks. Browser verification not performed (no browser
  in session) — manual checklist in
  [K001_KISHORE_ONBOARDING_EVIDENCE.md](K001_KISHORE_ONBOARDING_EVIDENCE.md).
  No process left running; ports free.
- K002 addendum (2026-09-24, Agent K — Kishore's coding agent, checkout
  configuration + documentation only, review **pending**): added `.gitattributes`
  with exactly two rules — `contracts/v1/** text eol=lf` and
  `scripts/verify-contract.mjs text eol=lf` — merged with (there were none to
  overwrite) and applied to exactly the hashed paths. `core.autocrlf=true` comes
  from the **system** Git config (`file:C:/Program Files/Git/etc/gitconfig`) and
  the verifier hashes raw bytes, so a Windows checkout used to convert these
  files to CRLF; the confirmed-unmodified paths were then restored from their
  exact Git blobs (targeted, no broad reset/clean). Result: **0 CR bytes** across
  the 9 hashed paths, `verify:contract` **75 passed / 0 failed**, and a fresh
  temporary clone inheriting `core.autocrlf=true` also checked out 0 CR bytes
  and passed **75/75**. No global Git configuration was changed, no contract
  semantics/manifest/hash check was touched, and ordinary source/documentation
  files were deliberately left alone. The same two rules are recommended for
  Mohan's three mirrors (`auditor-frontend`, `auditor-backend`,
  `energy-ml-service`) — not modified here. Backend-side K002 work (run-scoped
  policy activation) is recorded in the sibling repository's
  `docs/K002_POLICY_TIMING_EVIDENCE.md`; no frontend runtime behaviour changed.
  No process left running; ports free.
- P005 S10-A addendum (completed, review pending): office-map screen —
  inventory loading/error/loaded/empty states + manual refresh, top-down SVG
  keyed by five stable room IDs (corridor, labels, selectable regions,
  keyboard + list access, focus ring), details panel (capacity as capacity,
  nominal group power never multiplied, always-on badges, resolvable schedule
  info, "Not available yet" for runtime data), stale labeling, selection
  preserved across refresh, unknown rooms listed. Verified: 21/21 + 10/10
  focused checks, 75/75 contract, typecheck/lint(0 errors)/build green,
  HTTP-200 markup; real backend down (pending); browser interaction
  unverified. Details in [P005_S10_A_EVIDENCE.md](P005_S10_A_EVIDENCE.md).
  Auditor-frontend untouched. History preserved.
- P011 F6-frontend addendum (completed, review pending): created
  [KISHORE_FRONTEND_HANDOFF.md](KISHORE_FRONTEND_HANDOFF.md) (ownership,
  baseline, setup, code map, assumptions, outstanding verification, ordered
  remaining work, onboarding prompt). Docs only; link/path/command review
  green. Full cross-project F6 gate NOT claimed. History preserved.
- P009 S9/K1-UI addendum (completed, review pending): analogue+digital clocks
  from one sim_time_utc (Asia/Kolkata), lifecycle status, 1–1000× selector,
  start/pause/resume/reset, ~1/s polling (timeout/abort/no-overlap/seq
  tracking/backoff/retry/visibility), stale labeling, office/room/device live
  readings + occupancy, lighting on/off/clear for P004-supported devices.
  Verified: 18/18 committed tests, 75/75 contract, typecheck/lint(0 errors)/
  build green, HTTP-200 markup; real backend down (pending); browser
  interaction unverified. Details in [P009_K1_UI_EVIDENCE.md](P009_K1_UI_EVIDENCE.md).
  History preserved.
- P001 F4-A addendum (completed, review pending): browser-side connection
  panel (`NEXT_PUBLIC_SIMULATION_BACKEND_URL` + `/api/v1/health`, 8 s timeout,
  abort on unmount, no duplicates/polling); states incl. not_initialized =
  reachable-but-not-ready (never green for missing data). Verified: 20/20
  logic+mock checks, 75/75 contract, typecheck/lint(0 errors)/build green,
  HTTP-200 panel markup; real backend not running (integration pending);
  browser/CORS not verifiable in-session. Details in
  [P001_F4_A_EVIDENCE.md](P001_F4_A_EVIDENCE.md). History preserved.
- Dated correction (2026-09-24, P001): F1-R2 (contract 1.0.1) and F2-A are
  accepted based on supplied evidence; older "unaccepted"/"review pending"
  wording about the contract refers to pre-acceptance review state. Later
  layers carry their own review statuses. History preserved, not rewritten.
- F2-A addendum (2026-09-24, completed, review pending): independently runnable
  Next.js 16.3.6 + React 19.2.8 + TS 5.9.3 + Tailwind 4.3.3 app on port 3000
  ("Office Simulator"; engine-not-connected foundation screen; no fake
  controls, probes, or sockets). typecheck/lint(0 errors)/build/75-75
  verifier/HTTP-200 all green; browser inspection not available. `package-lock`
  committed. Details in [F2_A_EVIDENCE.md](F2_A_EVIDENCE.md). History preserved.
- Continuity files: [ACTIVE_TASK.md](ACTIVE_TASK.md) (current task, checkpoint,
  exact next action) and [PROGRESS_LOG.md](PROGRESS_LOG.md) (append-only history;
  F0 entry reconstructed, F0.1 entry actual).
- Continuation procedure for a replacement agent: read `AGENTS.md` (absent at
  F0.1 — record if still absent), then `PROJECT_CONTEXT.md`, `WORKSPACE_MAP.md`,
  this `HANDOFF.md`, `ACTIVE_TASK.md`, and recent `PROGRESS_LOG.md` entries;
  inspect `git branch/status/log` and source; reconcile docs with code; resume
  the ACTIVE_TASK next action. Do not restart completed work. See
  [AGENT_START_PROMPT.md](AGENT_START_PROMPT.md) for the full protocol.
- Verified vs planned: **verified** = §2 state below (empty repo on `main`,
  no commits, docs-only untracked files, origins/ports/tooling as measured).
  Everything under §§5/9–10 marked "Not implemented" or "planned" is **not**
  built. This repo has NOT completed application setup — F2 has not run.
- Layer clarifications: **F1 is contract work and does not require Python.**
  Python installation/runtime verification belongs to **F2 for
  energy-ml-service**. Auditor Node work can proceed independently; Python is
  required only for the relevant auditor↔Python integration checks (F4).
  Runtime recommendations from F0 (Node `>=20.9`, Python `3.12`, npm,
  venv+pip) remain **provisional until checked against chosen dependency
  versions and official compatibility documentation during F2**.
- F0 review status: accepted by architecture lead based on supplied evidence;
  local files were not directly inspected by the lead.
- F1 addendum (2026-09-24, completed, review pending): contract v1.0.0 defined;
  this repo holds a byte-identical mirror under `contracts/v1/` (canonical:
  `simulation-backend/contracts/v1/`; see `contracts/v1/manifest.json`).
  `node scripts/verify-contract.mjs` → 49 passed, 0 failed in all five repos
  (semantic checks only; formal schema validation is F2). Links:
  [contract](contracts/v1/CONTRACT.md), [schema](contracts/v1/dataset.schema.json),
  [CSV](contracts/v1/CSV_COLUMNS.md), [API](contracts/v1/API.md),
  [evidence](F1_EVIDENCE.md), [active task](ACTIVE_TASK.md),
  [progress](PROGRESS_LOG.md).
- Dated corrections (history preserved in PROGRESS_LOG): Python 3.13.15
  (64-bit, pip 26.2.1) verified at the supplied interpreter path — "Python not
  installed" no longer a current blocker (F1 needs no Python); F0.1
  "read-only sibling" wording corrected — F0.1 explicitly covered all five
  repositories; runtime recommendations stay provisional until F2 dependency
  checks; hosting plan — frontends on Vercel, Node backends + Python service
  on Mohan's VPS (no deployment in F1); from F1 onward completed layer work is
  committed and pushed (F0/F0.1 no-push was historical only).
- F1-R1 addendum (2026-09-24, completed, review pending): pre-acceptance
  corrections, version retained at 1.0.0 (not published). This repo holds the
  corrected mirror. (A) CSV is self-contained: first-data-row `meta_run`
  envelope, `meta_policy` removed, 27-column header, slice-without-envelope
  rejected. (B) 12 dp kWh exports, unrounded internal accumulation,
  tolerances 1e-9 per-value / n·1e-9 totals / 1e-9 triple-relative, in-memory
  7 W × 44,640-interval budget check. Verifier extended: CSV-alone
  reconstruction + full semantic parity, 4 negative checks. 54/54 in all five
  repos. Repo-local identity configured. History preserved in PROGRESS_LOG.
- F1-R2 addendum (2026-09-24, completed, review pending): version 1.0.1
  (replaces unaccepted 1.0.0 prototype). This repo holds the corrected mirror:
  9dp power precision + fractional checks, V/I average semantics,
  kind-specific closed policy rules, persist-until-cleared overrides, concrete
  Python A/B requests with bounds, full API paths + scaffold health states.
  75/75 in all five repos; CSV-alone parity unchanged. History preserved.

## 1. Purpose and owner

- **Purpose**: Simulator user interface. Next.js + React + TypeScript + Tailwind
  application that sends commands to the simulation backend and renders the
  authoritative backend state: 5-room SVG/CSS map, occupant dots, analogue and
  digital clocks (same backend time), device states, history and CSV/JSON export
  triggers. No simulation logic lives here; the backend is authoritative.
- **Foundation owner (F0–F6)**: Mohan.
- **Long-term owner (after foundation handoff)**: Kishore Kumar.
- Mohan establishes the initial foundation (contract, scaffold, connections)
  before handing implementation to Kishore. This document determines which
  foundation layers are actually complete — do not assume handoff until F6 is
  verified.

## 2. Current verified state (F0, 2026-09-24)

- Local path (Mohan's machine): `K:\NEXYRA\simulation-frontend`
  (portable reference: `../simulation-frontend`; paths differ on Kishore's laptop).
- Remote: `https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git`
  (`git remote -v` verified; fetch OK).
- Branch: `main`. HEAD: **No commits yet** (empty remote; `git log` reports
  "does not have any commits yet"; `git ls-remote --heads origin` empty).
- Working tree before F0 docs: clean — only `.git/` present, no tracked files,
  no user work to preserve.
- Working tree after F0 docs (uncommitted, for review): new untracked
  `docs/PROJECT_CONTEXT.md`, `docs/WORKSPACE_MAP.md`, `docs/HANDOFF.md`
  (this file), `docs/AGENT_START_PROMPT.md`, `README.md`.
  Not committed or pushed per F0 instructions.
- Parent `K:\NEXYRA` is **not** a Git repository (no sixth repo, no submodules).
- Instructions: no `AGENTS.md` found at parent or in this repo at F0.
- Tooling at F0: Git `2.55.0.windows.5`, Node `v24.21.0`, npm `11.19.0`,
  Python not installed. Proposed port `3000` free (no listener observed).
- Application state: **Not implemented** — no `package.json`, no source, no
  config. F0 created documentation only.

## 3. Completed layers and evidence

- **F0 (in review, not committed)**: cloned empty repo into correct sibling
  folder; verified origin/branch/HEAD/status; fetched; inspected (empty);
  recorded tooling/ports; created shared context + this handoff + onboarding
  prompt + README. Evidence: git outputs in F0 report; untracked docs files
  listed above; `PROJECT_CONTEXT.md` hash `31B455…`, `WORKSPACE_MAP.md` hash
  `FE230C…` (identical across all five repos).
- **F1 (shared contract)**: Not implemented.
- **F2 (application scaffold)**: Not implemented.
- **F3 (database/migrations/seeds)**: Not applicable to frontend (no DB);
  Not implemented.
- **F4 (basic connections)**: Not implemented.
- **F5 (reference-data integration)**: Not implemented.
- **F6 (verified handoff)**: Not implemented.

## 4. Pre-existing implementation discovered during inspection

None. Repository was empty at clone (only `.git/`). No README, no source, no
`package.json`/lockfile, no runtime-version files, no config examples, no docs,
no working-tree changes to preserve.

## 5. Planned next layers

- **F1**: adopt the shared telemetry/API contract (telemetry fields, export
  intervals 1/5/10/15/30/60 min, Socket.IO sequence/snapshot/history semantics,
  fault-label exclusion). Frontend implements no logic until contract lands.
- **F2**: Next.js + React + TypeScript + Tailwind scaffold via npm; `.nvmrc` /
  `engines`; lint/format; SVG/CSS map shell. Resolve Node pin
  (installed 24 vs `22 LTS` candidate).
- **F3**: N/A (no DB) — document explicitly.
- **F4**: wire `NEXT_PUBLIC_SIMULATION_BACKEND_URL` (proposed name) to
  `http://localhost:4000`; Socket.IO connect/reconnect with sequence handling,
  replay/snapshot fallback; CORS validated against backend.
- **F5**: rooms/devices/schedules reference rendering (5 rooms, 18
  devices/groups, speeds 1×–1000×, clocks, occupancy dots, overrides).
- **F6**: verified end-to-end (command → authoritative render → export trigger)
  and handoff to Kishore Kumar.

## 6. Prerequisites

- Git, Node.js `>=20.9` + npm (installed: Node `24.21.0`, npm `11.19.0`).
- Access to sibling `../simulation-backend` (local, port `4000`) from F4 onward.
- Agreed F1 contract before any UI logic.
- Python not required for this repo.

## 7. Actual run/check commands, if implemented

No application commands exist (no `package.json`). Checks actually executed
at F0 (from parent, Windows PowerShell 5.1):

```powershell
git -C simulation-frontend rev-parse --show-toplevel
git -C simulation-frontend remote -v
git -C simulation-frontend branch --show-current; git -C simulation-frontend status -sb
git -C simulation-frontend rev-parse HEAD      # fails: unknown revision (no commits)
git -C simulation-frontend log --oneline -5    # fails: no commits yet
git -C simulation-frontend fetch --all         # ok, empty
git -C simulation-frontend ls-remote --heads origin  # ok, empty
node --version; npm --version; git --version
netstat -ano | Select-String ':3000 |:3001 |:4000 |:4001 |:8000 '  # no matches
```

Do not invent `npm run dev/build/test` results — scripts do not exist yet.

## 8. Configuration names without secret values

Proposed only (F4 to implement; no `.env` at F0; never commit secrets):

- `NEXT_PUBLIC_SIMULATION_BACKEND_URL` → e.g. `http://localhost:4000`
- Backend CORS origin for this UI (configured in simulation-backend).
- No secrets, DB paths, or credentials in this repo.

## 9. Contracts and external dependencies

- **Shared telemetry/API contract (F1)**: Not implemented / deferred finalisation.
  This UI must not define its own telemetry shapes.
- **External (planned)**: HTTP + Socket.IO to simulation-backend; CSV/JSON
  export download served by backend. No direct SQLite, no Python, no auditor
  calls.
- **npm dependencies**: none yet (F2 to create `package.json`).

## 10. Database/migration status

Not applicable. This frontend owns no database and must never open SQLite
directly. No migrations, seeds, or DB files. Status: Not implemented (by design).

## 11. Known issues and blockers

1. Empty remote — no history to review; F1–F6 start from scratch. (Informational.)
2. Python missing on this machine — not a blocker for this repo, but blocks
   auditor/ML paths owned by Mohan.
3. Node pin undecided: installed `24.21.0` satisfies Next.js minimums
   (`18.18` / `20.9`), but CI pin (`22 LTS` vs `24`) must be decided in F2.
   Build compatibility not yet verified.
4. F0 docs uncommitted — Mohan + architecture lead must review, then commit/push.

## 12. Deferred features

Per `PROJECT_CONTEXT.md`: auditor live mode, autonomous occupant behaviour,
realistic physics, elaborate animations, doodle occupants (MVP3), sensor/BMS,
advanced tariffs, pricing discussion. Also: no simulation logic, no local
telemetry synthesis, and no fault-label handling in this UI.

## 13. Last verification date and relevant existing commit references

- Date: 2026-09-24. No commits exist in this repository (local or remote).
  No commit hashes to cite. F0 docs are untracked working-tree files pending
  review — run `git status --short` in `K:\NEXYRA\simulation-frontend` to see them.

## 14. Instructions to update this document after every completed layer

After each layer (F1–F6 and beyond), the implementing agent must update this
file: bump the date, record branch/HEAD, summarise changes with file lists,
record actual commands and results (no invention), update sections 2–3/7–11,
and leave prior history intelligible. Keep sections 1/12/14 intact unless
ownership or scope is formally revised. Return the updated sections as handoff
evidence.

## SIM-VIS-01 closeout update (2026-09-25)

- Visual implementation and code checks completed on isolated branch `mohan/sim-visual-01`; however, the 375px screenshot still shows preview header/control overflow. Status is partial; review pending. 52/52 tests, typecheck, lint (0 errors; 1 pre-existing warning), build and diff check pass. See `SIM_VIS_01_EVIDENCE.md`.
- No production backend, database runtime, or API command path was tested; built `/preview` returns 404. No main merge, push or deployment.
- Exact next action: M-B fixes the documented 375px preview overflow and refreshes the screenshot; after lint/build, K-A reviews and integrates the branch in the simulator main worktree and coordinates the separate chart branch independently. Transfer bundle path and verification are in the evidence doc.
