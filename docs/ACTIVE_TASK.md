# ACTIVE_TASK — simulation-frontend

## prompt_id

P009

## agent

A — OpenCode

## Layer ID

S9/K1-UI

## Objective

Real backend state on the office map (this repo ONLY): analogue + digital
clocks from the same sim_time_utc (Asia/Kolkata), lifecycle status, speed
selector (1/2/10/60/100/1000), start/pause/resume/reset, live office/room/
device readings + occupancy from GET /api/v1/state, lighting on/off/clear
for P004-supported devices. HTTP polling ~1/s with timeout/abort/no-overlap/
stale-seq tracking/backoff/manual retry/visibility resume. No sockets,
occupancy editing, charts, export, faults. Contract 1.0.1 + P004 shapes
authoritative, read-only.

## Task status

completed

## Review status

pending

## Repository and owner

- Repository: `simulation-frontend` (`https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git`)
- Agent: A — OpenCode, exclusive writer this assignment.
- Foundation owner (F0–F6): Mohan. Long-term owner: Kishore Kumar (after F6 handoff).

## Current branch

`main` (P005 `6936b58` pushed; tree clean at P009 start)

## Last checkpoint timestamp, including timezone

2026-09-24 20:35:00 +05:30 (IST) — P009 S9/K1-UI completed.

## Applicable contract version

1.0.1 (authoritative, read-only; P005 accepted for implementation;
browser/map/CORS still outstanding — recorded).

## Completed steps

1. Startup: AGENTS.md absent; context/HANDOFF/ACTIVE_TASK/PROGRESS_LOG/P005
   evidence/API read; git clean/in-sync at expected baseline 6936b58.
2. Read P004 backend shapes read-only at commit 93da205 (routes, engine
   state/summary/command responses, HTTP tests). P008 worktree untouched.
3. Implemented `app/lib/sim-state.ts` + clocks/lifecycle/sim-live components,
   integrated live data into office-map details, added `test` script.
4. Verified: 18/18 committed tests; 75/75 contract; typecheck/lint(0 errors)/
   build green; served + HTTP-200 markup; server stopped. Real backend down
   (live mutation tests stay a later coordinated check); no browser.

## Files changed

- Created: `app/lib/sim-state.ts`, `app/lib/__tests__/sim-state.test.mjs`,
  `app/components/clocks.tsx`, `app/components/lifecycle-controls.tsx`,
  `app/components/sim-live.tsx`, `docs/P009_K1_UI_EVIDENCE.md`. Updated:
  `app/components/office-map.tsx`, `app/page.tsx`, `package.json`,
  `docs/HANDOFF.md`, `docs/PROGRESS_LOG.md`, `docs/ACTIVE_TASK.md`.

## Verification performed and actual results

- Frontend `main` at `6936b58`, fetch clean, tree clean. Backend at P004
  93da205 with uncommitted P008 work (not touched, not run).

## Incomplete edits and uncommitted changes

- UI implemented and verified; sibling repos untouched. Committing and
  pushing now.

## Blockers or unknowns

- None. Engine is Claude Code's (P008 in progress) — build against accepted
  P004 only; no backend changes requested.

## Exact next action

Commit, push `main`, verify remote hash; then return P009 evidence.
Stop after P009.

## Related-repository dependencies

Paired backend `../simulation-backend` (Claude Code P008); read-only
health/inventory/state calls only if already running; no mutations to a
foreign run — live mutation tests stay a later coordinated check.

## Commit reference

P005: `6936b58bec78f656800b15a7a46c25d0926d38a2` (pushed, verified).
P009: none yet.
