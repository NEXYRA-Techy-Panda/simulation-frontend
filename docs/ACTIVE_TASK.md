# ACTIVE_TASK — simulation-frontend

## prompt_id

P001

## agent

A — OpenCode

## Layer ID

F4-A

## Objective

Replace the static "not connected" message with a real browser-side backend
connection panel (`NEXT_PUBLIC_SIMULATION_BACKEND_URL` + `/api/v1/health`):
states, Check button, initial check on load, bounded timeout, abort on
unmount, no duplicate requests, no polling. Typed parsing; show URL (no
credentials), contract version, last-check time, actual service state
(not_initialized = reachable but engine not ready; never green for missing
data). Verify via mock-server + logic tests, typecheck, lint, build, HTTP.
No sockets, controls, charts, or auth UI. Contract 1.0.1 authoritative,
read-only.

## Task status

completed

## Review status

pending

## Repository and owner

- Repository: `simulation-frontend` (`https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git`)
- Agent: A — OpenCode, exclusive owner of the two frontends this layer.
- Foundation owner (F0–F6): Mohan. Long-term owner: Kishore Kumar (after F6 handoff).

## Current branch

`main` (F2-A `6e94fb8` pushed; tree clean at P001 start)

## Last checkpoint timestamp, including timezone

2026-09-24 19:55:00 +05:30 (IST) — P001 F4-A completed (simulator UI).

## Applicable contract version

1.0.1 (authoritative, read-only; F1-R2 accepted, F2-A accepted — dated
correction recorded in HANDOFF/PROGRESS_LOG).

## Completed steps

1. Startup: AGENTS.md absent; context/API/manifest read; git clean/in-sync;
   P001 recorded; contract read-only noted.
2. Implemented `app/lib/health.ts` + `app/components/connection-panel.tsx`,
   wired into page (kind="simulator").
3. Verified: 20/20 logic+mock checks; 75/75 contract; typecheck/lint(0
   errors)/build green; served + HTTP-200 panel markup; servers stopped.
   Real backend down (pending); no browser capability.

## Files changed

- Created: `app/lib/health.ts`, `app/components/connection-panel.tsx`,
  `docs/P001_F4_A_EVIDENCE.md`. Updated: `app/page.tsx`, `docs/HANDOFF.md`,
  `docs/PROGRESS_LOG.md`, `docs/ACTIVE_TASK.md`.

## Verification performed and actual results

- `main` at `6e94fb8`, fetch clean, tree clean.

## Incomplete edits and uncommitted changes

- Panel implemented and verified; backend repos untouched. Committing and
  pushing now.

## Blockers or unknowns

- None. Claude Code (simulation-backend) and Codex (auditor-backend) own the
  backends — no writes, installs, commits, or processes there.

## Exact next action

Commit, push `main`, verify remote hash; then return P001 evidence.
Stop after P001.

## Related-repository dependencies

Paired backend `../simulation-backend` (4000, Claude Code's); read-only
health checks only if already running. No integration dependency for this task.

## Commit reference

F2-A: `6e94fb8d6e5d7bec21e1aa961adb16285e4f5071` (pushed, verified).
P001: none yet.
