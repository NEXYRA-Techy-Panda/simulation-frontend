# ACTIVE_TASK — simulation-frontend

## prompt_id

K004-PREP3 — K-B (environment controls UI preparation).
Prompt: Agent K-B — FreeBuff. Owner: Kishore Kumar.

## agent

K-B — FreeBuff (Kishore Kumar's ownership)

## Layer ID

K004-PREP3 — frontend environment controls preparation (UI only; the released
K004 environment feature is not claimed).

## Objective

Prepare a tested, reusable room-environment controls component plus a typed
environment API adapter on an **isolated branch/worktree**, against the
completed backend branch `simulation-backend` / `kishore/k004-environment-prep`
(commit `13d59b6`, contract `POST /api/v1/environment`). Mount nothing: the main
page, map, export controls and live-state coordinator are left untouched because
K-A — OpenCode owns them in parallel for K003.

## Task status

completed (implementation + focused tests + documentation on the isolated branch)

## Review status

pending (never self-assigned)

## Isolated worktree, branch and base

- Worktree: `C:/Users/kdon7/Desktop/react/hackthon/simulation-frontend-k004`
  (preserved; `npm ci` run here only, lockfile unchanged).
- Branch: `kishore/k004-environment-ui`.
- Base: `dbcbee9b935a3f6777f7a8bfca097d258e02e652`
  (`fix(sim): handle control acknowledgements and reset races`) — equal to the
  committed `main` and `origin/main` at inspection. No rebase, merge,
  cherry-pick or base update. The main `simulation-frontend` working copy was
  not modified, stashed, reset, cleaned or switched; K-A's uncommitted K003
  files were not copied and none of those paths were edited here.

## Files changed (task-owned, branch `kishore/k004-environment-ui`)

- Created: `app/lib/environment.ts` (adapter + controller/state machine),
  `app/components/environment-controls.tsx` (unmounted component),
  `app/lib/__tests__/environment-controls.test.mjs` (25 checks),
  `docs/K004_ENVIRONMENT_UI_PREP_EVIDENCE.md` (evidence of record).
- Updated: `package.json` (test script only — adds the new test file),
  `docs/ACTIVE_TASK.md` (this file), `docs/HANDOFF.md`, `docs/PROGRESS_LOG.md`.
- Excluded from the commit: the temporary mocked preview route
  `app/environment-preview/page.tsx` (deleted after the SSR check),
  `node_modules`, `.next`, build output.

## Current state summary

- Component interface: `backendUrl`, `selectedRoom`, `runId`, `acPowerModel`,
  `confirmedClimate`, `stale`, `fetchImpl`, `timeoutMs`, `onApplied`,
  `refreshConfirmed`. Room/run identity, capability, confirmed climate and
  freshness are parent-owned props; the component keeps only transient form
  state.
- Adapter: exact contract body `{ room_id, temp_c, rh_pct }`, existing envelope,
  every acknowledgement field required with `applies_from === "next_step"`;
  400/404/409 plus TIMEOUT/ABORTED/UNREACHABLE mapped honestly; bounded 15 s
  timeout; backend base via the existing `sanitizeOrigin` so the public `/sim`
  prefix is preserved. No new environment variable, domain or dependency.
- Bounds −30…60 °C and 0…100 %: blank, non-finite and out-of-range rejected
  without clamping; zero accepted. No browser-computed power, energy or reading.
- Protections: capability gating (missing model = unsupported), legacy run
  explained and never reset, duplicate-submission guard, abort on unmount,
  epoch guard dropping late responses across room/run changes including
  A → B → A, entered values preserved on failure, no automatic retry, timeout
  reported as uncertain with a refresh-before-retry instruction, parent
  authoritative refresh after confirmed success.
- Controller is an external store (`subscribe` + cached immutable snapshot +
  `configure` for live handlers); the component consumes it with
  `useSyncExternalStore`, which removed all six lint errors.

## Verification performed and actual results

In the isolated worktree, final tree (preview removed):
`npm test` **44/44 pass** (19 committed `sim-state` + 25 new environment);
`npm run typecheck` clean (exit 0); `npm run lint` **0 errors / 1 pre-existing
warning** (`scripts/verify-contract.mjs:188 'v' unused`, present on the base
commit); `npm run build` exit 0 (`/` and `/_not-found` static). Temporary mocked
SSR preview served over `next start -p 3123` returned HTTP 200 (16,969 bytes)
with the three capability states rendered and all Apply buttons disabled; the
process was stopped and the port verified free. Backend not started; backend
89-test suite and `verify:contract` not re-run (no contract or backend file
changed). Nothing pushed, merged or deployed.

## Incomplete edits and uncommitted changes

None outside this task's own scope; the task-owned files above are committed by
this task on the feature branch. No sibling repository, contract file, parent
file or production system was touched. No process left running.

## Blockers or unknowns

- **Browser verification was not possible in this session** — clicking Apply,
  focus order, live-region announcements, hydration-time capability notices and
  the real 375 px layout remain unverified. The checks performed are unit tests
  plus DOM-less SSR/build checks with an injected fetch, and must not be called
  real backend integration.
- **End-to-end integration is pending**: the backend branch is unmerged and the
  component is not mounted, so no environment command has been exercised against
  a live backend from this UI.
- **Feature-branch deployment behaviour remains unconfirmed** (no CI
  configuration or deploy script found; `origin` has only `main` for this
  repository) → no push attempted.
- Expected K003 merge overlap: `package.json` test script,
  `app/components/sim-live.tsx`, `app/components/office-map.tsx`,
  `app/lib/sim-state.ts`, and the three shared continuity docs.

## Exact next action

Wait for external review of both environment branches. Once accepted, and after
K003 lands: integrate this branch onto the then-current `main` (keeping both test
files in the `package.json` script), apply the three-step mounting change
documented in `docs/K004_ENVIRONMENT_UI_PREP_EVIDENCE.md` §11 (render the
component from `office-map.tsx` using its own selection; thread `runId`,
`acPowerModel`, the room's `climate` and `stale` from `sim-live.tsx`; read the
additive state fields with the existing `parseEnvironmentStateExtras`), re-run
`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and then
complete the outstanding browser and end-to-end checks against the merged
backend. Do not merge, push or deploy before that review.

## Previous tasks (history preserved, not rewritten)

- **K002 / K1 (Kishore's coding agent): completed, review pending.** Checkout
  portability only — added `.gitattributes` with two LF rules for
  `contracts/v1/**` and `scripts/verify-contract.mjs`; `verify:contract`
  restored to 75/75. Commit `906446e2…` published.
- **K001 / K0 (Kishore's coding agent): completed, review pending.** Setup and
  onboarding; evidence `docs/K001_KISHORE_ONBOARDING_EVIDENCE.md`.
- **P011 / P009 / P005 / P001 / F2-A / F1-R2 / F1-R1 / F1 / F0.1 / F0**: recorded
  in `docs/PROGRESS_LOG.md` and `docs/HANDOFF.md` §0.

## Repository and owner

- Repository: `simulation-frontend`
  (`https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git`)
- Owner: Kishore Kumar. Paired backend: `../simulation-backend`
  (backend port **19001**; `.env.example` still lists the stale 4000).
- Mohan owns `auditor-frontend`, `auditor-backend`, `energy-ml-service` — none
  touched.

## Current branch

`kishore/k004-environment-ui` in the worktree `simulation-frontend-k004`, based
on `dbcbee9b935a3f6777f7a8bfca097d258e02e652` (== `main` == `origin/main` at
inspection). The main working copy stays on `main` with K-A's uncommitted K003
work, untouched by this task.

## Last checkpoint timestamp, including timezone

2026-09-25 (IST) — implementation, tests, typecheck, lint, build and the mocked
SSR check complete; evidence written; committing locally on the feature branch.

## Applicable contract version

1.0.1 (mirrored, read-only, **unchanged**). No contract file, schema, fixture or
verifier was edited. Per-room climate already has export fields; the AC power
model identity remains internal and no comparison claim is added.

## Environment (this laptop)

Windows 11 build 26200, Git Bash; git `2.55.0.windows.4`, node `v24.19.0`,
npm `11.17.0`. Repo-local Git identity is Kishore's. `core.autocrlf=true` comes
from the **system** Git config; no global Git configuration changed.

## Related-repository dependencies

Backend branch `kishore/k004-environment-prep` (worktree
`simulation-backend-k004`), commits `43aa9fa` (K004-PREP module) and `13d59b6`
(K004-PREP2 route + engine integration) — both preserved, not edited during this
task, not merged, not pushed. This UI targets that branch's actual implementation
only; before that backend is rolled out, the controls must stay unmounted.
