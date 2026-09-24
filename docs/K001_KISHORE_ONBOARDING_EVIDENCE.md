# K001_KISHORE_ONBOARDING_EVIDENCE — simulation-frontend

Assignment **K001** (previously issued as **P018**; renamed before execution).
Agent: **K — Kishore's coding agent**. Layer: **K0 — Setup and onboarding**.
Owner: **Kishore Kumar**. Date: 2026-09-24 (Asia/Kolkata).

Task status: **completed** (setup, onboarding and baseline verification).
Review status: **pending** — no approval is claimed here.

Scope: setup, reading, verification and documentation only. **No application
source, config, dependency or lockfile was changed.** No remaining simulator
feature was started, and the known policy-timing defect was not touched (it is
a backend defect; see the backend evidence document §11).

---

## 0. Renaming continuity (P018 → K001)

- This assignment was issued as `P018` and renamed to `K001` **before it ran**.
  Its task is unchanged and it was not run twice.
- Verified before starting: `grep -i "P018\|K001"` over `docs/` and `README.md`
  in **both** simulator repositories returned **no matches**. No P018 record
  existed, so no "P018 renamed to K001" progress-log amendment was needed and
  no history was rewritten.
- This is the first K-prefixed assignment recorded in this repository.

## 1. This laptop (evidence, not a required path)

- Absolute workspace: `C:\Users\kdon7\Desktop\react\hackthon`
  (parent folder, **a plain folder, not a Git repository**).
- Repository path: `C:\Users\kdon7\Desktop\react\hackthon\simulation-frontend`.
- OS/shell: Windows 11 build 26200 (`MINGW64_NT-10.0-26200`, host `GEORGIA`),
  Git Bash `/usr/bin/bash` (MSYS2). Mohan's `K:\NEXYRA` path does **not**
  exist here and was not assumed.
- No `AGENTS.md` at the parent or in this repository.
- The parent folder already contains all five NEXYRA repositories. The three
  Mohan-owned ones (`auditor-frontend`, `auditor-backend`,
  `energy-ml-service`) were **not** touched in any way.
- `localhost` on this laptop means this laptop: Mohan's `localhost:4000` is not
  reachable from here, and no hosting is needed for the local simulator pair.

## 2. Repository reuse and Git state

The target folder already existed as the correct repository, so it was
**reused, not re-cloned** (no overwrite, no re-initialisation).

| Item | Value |
|---|---|
| origin | `https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git` |
| branch | `main` |
| HEAD | `2de8caa88a8a074f6f430e576beaff495d41ff38` |
| reported P011 handoff baseline | `2de8caa88a8a074f6f430e576beaff495d41ff38` — **identical** |
| `git fetch --all` | clean, no new refs |
| `ls-remote --heads origin` | `2de8caa…` — matches local HEAD |
| fast-forward needed | no |
| working tree | clean before, during and after all checks; no stash, no reset |
| repo-local identity | `Kishorekumar5567 <kkishorekumarkannan@gmail.com>` (Kishore's; Mohan's identity was **not** copied) |

Earlier commits present and unchanged: `cc2fc8f` (P009 UI), `6936b58` (P005
office map), `92bc58b` (P001 connection panel).

## 3. Runtime and toolchain (actual, this laptop)

| Check | Result | Verdict |
|---|---|---|
| `git --version` | `2.55.0.windows.4` | adequate |
| `node --version` | `v24.19.0` | satisfies this app (Next.js 16 requires Node >= 20.9) |
| `npm --version` | `11.17.0` | adequate |
| ports 3000 / 4000 | no listeners before and after every check | free |

- `npm ci` was used (a valid `package-lock.json` is committed). Result: install
  succeeded, `found 0 vulnerabilities`; versions unchanged — next 16.3.6,
  react/react-dom 19.2.8, typescript 5.9.3, tailwindcss 4.3.3, eslint 9.39.5.
- **Warning (not a failure):** npm 11 blocked the `unrs-resolver@1.12.2`
  postinstall script (`allow-scripts`). Lint, typecheck, tests and the
  production build all still pass, so it is cosmetic here.
- Node 24 is fine for this repository, but note that the **paired backend**
  requires Node >= 24 because it uses the built-in `node:sqlite`; a frontend
  minimum alone is not sufficient for the pair.

## 4. Configuration and setup performed

- `.env.example` and a local `.env` both exist with identical content and a
  single key: `NEXT_PUBLIC_SIMULATION_BACKEND_URL=http://localhost:4000`
  (origin only — no credentials in a browser-public variable). `.env` is
  git-ignored (`git check-ignore` confirms `.gitignore:9:.env`).
- Verified by inspection how the origin reaches the code: `app/page.tsx:5`
  reads `process.env.NEXT_PUBLIC_SIMULATION_BACKEND_URL` in a **server**
  component and passes it as a `backendUrl` prop to the client components
  `SimLive` and `ConnectionPanel`; the libs take an `origin` argument and
  append the **full contract paths** (`app/lib/health.ts:134`
  `${origin}/api/v1/health`, `app/lib/inventory.ts:314`
  `${origin}/api/v1/inventory`, and the control/state paths in
  `app/lib/sim-state.ts`). The variable therefore contains **no** `/api/v1`
  and cannot be duplicated.
- Consequence of that design: the origin is rendered server-side, so it does
  **not** appear inlined in `.next/static/chunks/**`. That is expected, not a
  missing configuration. (Alternative pattern — `process.env.NEXT_PUBLIC_*`
  inlined into client bundles — is not used here.)
- Commands used (from the repository root, Git Bash):

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:contract
node node_modules/next/dist/bin/next start -p 3000   # production serve check
```

No Python, ML library, Docker or unrelated tooling was installed.

## 5. Handoff and context material read (complete)

Both repositories: `README.md`, `docs/PROJECT_CONTEXT.md`,
`docs/WORKSPACE_MAP.md`, `docs/HANDOFF.md`, `docs/ACTIVE_TASK.md`,
`docs/PROGRESS_LOG.md`, `docs/AGENT_START_PROMPT.md`.
This repository: `docs/KISHORE_FRONTEND_HANDOFF.md`,
`docs/P009_K1_UI_EVIDENCE.md`, `docs/P005_S10_A_EVIDENCE.md`
(the P005/P009 material applies to the current UI and was read in full).
Backend side: `docs/KISHORE_BACKEND_HANDOFF.md`,
`docs/SIMULATION_ENGINE.md` (including the complete API examples),
`docs/P002_F3_S_EVIDENCE.md`, `docs/P004_K1_EVIDENCE.md`,
`docs/P008_K3_K4_EVIDENCE.md`.
Shared contract in both repositories: `contracts/v1/CONTRACT.md`,
`contracts/v1/API.md`, `contracts/v1/CSV_COLUMNS.md`,
`contracts/v1/dataset.schema.json`, plus fixtures/manifest as needed.

## 6. Database setup

**Not applicable to this repository** — the frontend owns no database, never
opens SQLite and has no migrations or seeds. No database was created or
touched here; all database work belongs to `simulation-backend` (see its
evidence document §6, including the scratch-database isolation).

## 7. Baseline verification (actual results)

Executed in this repository on 2026-09-24, with real exit codes:

| Command | Result | Exit |
|---|---|---|
| `npm run verify:contract` | **67 passed, 8 failed** — see §8 | **1** |
| `npm run typecheck` | `tsc --noEmit`, no diagnostics | 0 |
| `npm run lint` | **0 errors, 1 warning** — `scripts/verify-contract.mjs:188 'v' is assigned a value but never used` (pre-existing, identical to the P009/P005 records, in the untouched verifier) | 0 |
| `npm test` | **18 passed, 0 failed** (`node:test` over `app/lib/__tests__/sim-state.test.mjs`) | 0 |
| `npm run build` | `✓ Compiled successfully`; routes `/` and `/_not-found`, both static | 0 |
| `npm run validate:schema` | **no such script** in this repository (it is a backend script) — nothing invented | n/a |

## 8. MISMATCH FOUND (recorded, not fixed): contract verifier 67/75 on this laptop

Identical to the backend repository, because the contract bundle is mirrored
byte-for-byte. The handoff reports 75/75; on this laptop the same script
reports **67 passed, 8 failed**, all eight being `hash match:` failures for
`CONTRACT.md`, `dataset.schema.json`, `CSV_COLUMNS.md`, `API.md`,
`fixtures/reference.json`, `fixtures/reference.csv`, `fixtures/expected.json`
and `scripts/verify-contract.mjs`.

**Cause (proven):** this clone has `core.autocrlf=true` with no
`.gitattributes`, so Git checked the LF blobs out as CRLF, while the verifier
hashes raw bytes (`scripts/verify-contract.mjs:41`,
`createHash('sha256').update(readFileSync(p))`). Normalising CRLF → LF
reproduces the manifest hashes exactly (e.g. `contracts/v1/API.md`: raw
`a6ebdfb690e0` = the reported "got", LF-normalised `53bc0a2acba0` = the
manifest "want"). All 67 semantic checks pass, so the contract content is
correct and byte-identical modulo line endings.

**Classification:** a clone/line-ending configuration condition on this
Windows laptop, **not** a defect in this repository's code or in the contract.
It was **not** fixed in K001. Suggested remediation (later task): repo-local
`git config core.autocrlf false` plus a clean re-checkout, or an upstream
`.gitattributes` (`* text=auto eol=lf`) plus re-clone — then expect 75/75.
Never weaken the verifier to accommodate this.

## 9. Live serve and frontend↔backend pairing (real HTTP, no browser)

Production build served with `next start -p 3000` while the compiled backend
ran on port 4000 against an **isolated scratch database** (not the dev
database):

| # | Check | Actual result |
|---|---|---|
| 1 | `GET http://localhost:3000/` | **HTTP 200**, 16,282 bytes |
| 2 | SSR markup markers | `Office Simulator` ×1, `No simulation started` ×1, `Start` ×1, `Pause` ×1, `Resume` ×1, `Reset` ×1, `Refresh` ×1, `Backend` ×1 |
| 3 | `Open workspace` room name in SSR markup | **0 occurrences** — correct: the office map fetches `GET /api/v1/inventory` client-side on mount, so rooms are not part of the server-rendered shell (the server-rendered shell is the loading state, never fake room data) |
| 4 | backend reachable from the serving frontend host | `GET :4000/api/v1/health` → `200 {"status":"ok","run_id":"run-20260924T171742Z-5eba1a6f","sim_time_utc":"2025-12-31T18:30:00Z","contract_version":"1.0.1"}` |
| 5 | CORS for a frontend GET | `Access-Control-Allow-Origin: http://localhost:3000` on the health response |
| 6 | CORS preflight for a frontend **POST** command (`/api/v1/control/start`) | **204** with `Allow-Origin: http://localhost:3000`, `Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE`, `Allow-Headers: content-type` |
| 7 | teardown | both processes stopped; no `LISTENING` socket on 3000 or 4000 afterwards |

Both application processes were started and stopped by this task only; no
foreign or Mohan-owned process was started or killed.

## 10. Browser verification: NOT performed

No browser automation ability existed in this session, so **browser
interaction remains unverified** — SSR HTML and `curl` results are not proof
of browser behaviour. Explicitly still unverified here: clock rendering and
the Asia/Kolkata rollover, room selection and device details, keyboard access,
lifecycle controls driving the real backend, lighting on/off/clear against
authoritative refresh, occupancy being a backend reading rather than room
capacity, stale/unreachable presentation on network failure, and narrow-screen
layout.

Manual browser checklist for Kishore (backend on 4000 via `npm run dev`,
frontend on 3000 via `npm run dev`):

1. Load `http://localhost:3000` with no run: connection panel reachable but
   not-ready; clocks "No simulation started"; **no zero energy invented**.
2. Press Start at 60×: both clocks advance and show the **same** instant in
   Asia/Kolkata; office/room/device readings update.
3. Pause freezes both clocks; Resume advances them; changing speed is
   reflected.
4. Toggle the meeting-room light on and then clear it: the authoritative
   refetch shows the override removed and the policy state returned.
5. Reset: a new run id, state restarts at 01 Jan 2026 00:00 IST.
6. Stop the backend: the UI shows stale/unreachable, never zero energy and
   never fake success. Restart it: recovery works.
7. Keyboard access (room list/selection, buttons) and a narrow window layout.
8. Leave the run at 1000× to confirm the clocks show the latest **processed**
   backend time and never advance on their own.

Note for step 2 onward: the frontend was originally integrated against the
P004 state shape; the backend now also returns `occupancy`, `calendar`,
`overrides` and `pending_changes` (P008). They are accepted and exercised over
HTTP, but no page has been loaded in a browser to confirm the UI renders them
gracefully — this is the highest-value item to confirm in step 2.

## 11. Known defects and reproduction notes

1. **Contract verifier 67/75** (§8) — line endings; needs a contract-owner
   decision. Reproduction: run `node scripts/verify-contract.mjs` in either
   simulator repository on this laptop and compare the eight "got/want" pairs;
   `tr -d '\r' < file | sha256sum` reproduces the "want" values.
2. **Run-policy timing defect (backend, open, not fixed).** Reproduced in
   detail in the backend evidence document §11 (scratch database
   `…\Temp\nexyra-k001\scratch-defect.sqlite`): after a calendar change in
   run A at `2025-12-31T19:34:00Z`, a `reset` created run B starting
   `2025-12-31T18:30:00Z` which applied `pol-office-hours:2` and the `…:2`
   device-schedule versions immediately, so all 72 of run B's persisted minutes
   reference versions whose `effective_from_utc` is 64 minutes later, and run B
   pins no v1 at all. This blocks final historical-export acceptance and makes
   affected exports unanalysable by `energy-ml-service`. Relevant locations are
   listed there (`src/engine/engine.ts:351-371`, `src/db/runs.ts:20/42-47`,
   `src/engine/engine.ts:630/642-646`, `src/engine/constants.ts:13`).
3. `npm 11` `allow-scripts` warning for `unrs-resolver` (§3) — cosmetic.
4. Pre-existing lint warning in the untouched verifier (§7) — cosmetic, not
   introduced here.

## 12. Ownership boundary with Mohan

- **Kishore Kumar (Agent K)** owns `simulation-frontend` and
  `simulation-backend`.
- `auditor-frontend`, `auditor-backend` and `energy-ml-service` belong to
  Mohan and were not touched. Browser clients never call Python, never open
  SQLite, and there is **no live simulator→auditor link in MVP1** — the only
  bridge is a user-exported CSV/JSON file (export is not implemented yet).
- The shared contract (`contracts/v1/**`) is a mirrored, read-only bundle here;
  it was not edited.

## 13. Exact next action

`Complete the manual browser checklist in §10 against a local backend run, then
record the results — and take the backend's policy-timing correction
(KISHORE_BACKEND_HANDOFF.md §6) as the next assigned K-layer.` No simulator
feature work starts until it is assigned.

## 14. Processes, ports and restart commands

- No process was left running (the `next start` process and the backend were
  both stopped by this task). Ports 3000 and 4000 have no `LISTENING` socket
  afterwards.
- To restart the simulator pair on this laptop:

```sh
# terminal 1 — backend
cd <parent>/simulation-backend
npm run db:setup      # idempotent; safe to repeat
npm run dev           # http://localhost:4000

# terminal 2 — frontend
cd <parent>/simulation-frontend
npm run dev           # http://localhost:3000
```

Production variant: `npm run build` then `npm run start` (frontend) and
`npm run build` then `npm start` (backend). `.env` already points the frontend
at `http://localhost:4000`.

## 15. Files changed by K001

- Created: `docs/K001_KISHORE_ONBOARDING_EVIDENCE.md` (this file).
- Updated: `docs/HANDOFF.md`, `docs/ACTIVE_TASK.md`, `docs/PROGRESS_LOG.md`.
- **Unchanged:** all `app/**` source, `package.json`, `package-lock.json`,
  `next.config.ts`, `eslint.config.mjs`, `contracts/**`, `scripts/**`, `.env*`
  values. Build output (`.next/`) is git-ignored.
