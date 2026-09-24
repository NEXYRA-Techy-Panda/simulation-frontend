# ACTIVE_TASK — simulation-frontend

## prompt_id

P005

## agent

A — OpenCode

## Layer ID

S10-A

## Objective

Office-map + inventory inspection screen (this repo ONLY; auditor-frontend
unchanged): header, retained connection panel, inventory loading/error/loaded
states + manual refresh, top-down SVG floor plan keyed by the five stable
room IDs (corridor, boundaries, labels, selectable regions, keyboard access,
non-SVG room list), selected-room details (name, capacity as capacity, device
name/category/nominal W/quantity/always-on, resolvable policy info only).
Stale-data labeling on failed refresh; selection preserved across refresh;
unknown rooms listed, never dropped. No clocks, commands, sockets, occupants,
dots, switches, charts, export. Contract 1.0.1 authoritative, read-only.

## Task status

completed

## Review status

pending

## Repository and owner

- Repository: `simulation-frontend` (`https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git`)
- Agent: A — OpenCode, exclusive writer this assignment.
- Foundation owner (F0–F6): Mohan. Long-term owner: Kishore Kumar (after F6 handoff).

## Current branch

`main` (P001 `92bc58b` pushed; tree clean at P005 start)

## Last checkpoint timestamp, including timezone

2026-09-24 20:10:00 +05:30 (IST) — P005 S10-A completed.

## Applicable contract version

1.0.1 (authoritative, read-only; P001 accepted for implementation; live
backend + browser/CORS verification still outstanding — recorded).

## Completed steps

1. Startup: AGENTS.md absent; PROJECT_CONTEXT/HANDOFF/ACTIVE_TASK/
   PROGRESS_LOG/P001 evidence/API 1.0.1 read; git clean/in-sync at expected
   baseline 92bc58b; P005 recorded.
2. Implemented `app/lib/inventory.ts` + `app/lib/office-map.ts` +
   `app/components/office-map.tsx`, wired into responsive page.
3. Verified: 21/21 + 10/10 focused checks (temp harness); 75/75 contract;
   typecheck/lint(0 errors)/build green; served + HTTP-200 markup; server
   stopped. Real backend down (pending); no browser capability.

## Files changed

- Created: `app/lib/inventory.ts`, `app/lib/office-map.ts`,
  `app/components/office-map.tsx`, `docs/P005_S10_A_EVIDENCE.md`. Updated:
  `app/page.tsx`, `app/globals.css`, `docs/HANDOFF.md`, `docs/PROGRESS_LOG.md`,
  `docs/ACTIVE_TASK.md`.

## Verification performed and actual results

- `main` at `92bc58b`, fetch clean, tree clean.

## Incomplete edits and uncommitted changes

- Map/inventory implemented and verified; sibling repos untouched. Committing
  and pushing now.

## Blockers or unknowns

- None. simulation-backend engine is Claude Code's — build only against
  GET /api/v1/inventory; no backend changes requested.

## Exact next action

Commit, push `main`, verify remote hash; then return P005 evidence.
Stop after P005.

## Related-repository dependencies

Paired backend `../simulation-backend` (4000, Claude Code's engine work);
read-only inventory calls only if already running. No waiting.

## Commit reference

P001: `92bc58b492ac7b138d69947fe7f18defc16c49f4` (pushed, verified).
P005: none yet.
