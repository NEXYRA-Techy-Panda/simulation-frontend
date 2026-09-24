# ACTIVE_TASK — simulation-frontend

## prompt_id

K003 — historical export UI plus confirmed responsive QA correction (resumed
under Kishore | K-A — OpenCode).

## agent / owner

- Developer: Kishore Kumar
- Agent: K-A — OpenCode
- Previous owner label: Agent K (Kishore's coding agent)
- Exclusive scope: `simulation-frontend` only for this task.

## status

in_progress — export UI, responsive correction, and browser/mock verification
complete; continuity, final diff review, commit and push remain.

Review status: pending (never self-approved).

## baseline and previous outcome

- Resumed clean `main` at `dbcbee9b935a3f6777f7a8bfca097d258e02e652`,
  which includes deployment baseline `b31ac37` plus the reset/control-ack fix.
- K002 remains complete, review pending. No K003 source/evidence or unfinished
  edits existed before this assignment.
- K-C's `qa-evidence/K003-QA2` mobile report was read. Its 375px screenshot was
  captured with headless Chrome's minimum 504px window cropped to 375px; source
  was nevertheless hardened and independently verified with true 375px CDP
  device metrics.

## implemented checkpoint

- Added `HistoricalExportPanel` after the office map.
- Added a strict paginated run catalog adapter for `GET /api/v1/runs`, including
  committed coverage, exportability, no-data, cross-page duplicate checks, and
  current-run selection without a null-to-run duplicate request.
- Added run, UTC half-open window, JSON/CSV, and six aggregation-resolution
  controls. Defaults come from persisted committed coverage, never live time.
- One bounded fetch downloads unmodified backend bytes through a per-download
  object URL; errors remain on-page, duplicate submits are blocked, refresh and
  selection cannot race an active download, and success says "download started"
  rather than claiming disk completion.
- The committed `/sim` deployment base is preserved exactly. No Vercel env var
  or telemetry/export calculation was added.
- Corrected narrow layout: true 375px viewport has no horizontal overflow; all
  lifecycle buttons, Reset, and Refresh inventory remain visible. Desktop keeps
  the original inline layout. A consistent visible focus ring was added.
- K-C's untested claims (interactive room selection, live clocks, keyboard
  traversal, offline/stale recovery) remain explicitly unclaimed.

## verification checkpoint — actual

- `npm test`: 28/28 passed (19 existing + 9 K003 adapter checks).
- `npm run typecheck`: passed.
- `npm run lint`: zero errors; one pre-existing warning in the untouched
  contract verifier (`scripts/verify-contract.mjs:188`).
- `npm run build`: passed; `/` and `/_not-found` static.
- `npm run verify:contract`: 75/75.
- True 375x812 CDP viewport: client/scroll width `375/375`, horizontal overflow
  false, no button outside viewport; Reset and Refresh inventory measured within
  bounds.
- 1280x800 CDP viewport: client/scroll width `1280/1280`, overflow false, no
  button outside viewport; desktop control geometry preserved.
- Isolated local-backend browser flow: one run and 36 committed rows displayed;
  Download JSON returned 28,804 bytes and the UI reported "JSON download
  started" with no error. Headless Chrome received all bytes but canceled its
  download before writing a file; disk persistence remains unverified.
- No lifecycle mutation was sent. Local frontend :3100 and backend :19001 were
  task-owned and are stopped; ports were verified clear.

## files changed so far

- `app/lib/historical-export.ts`
- `app/components/historical-export.tsx`
- `app/lib/__tests__/historical-export.test.mjs`
- `app/components/{sim-live,lifecycle-controls,office-map,clocks,connection-panel}.tsx`
- `app/page.tsx`, `app/globals.css`, `package.json`
- K003 evidence and continuity/README documentation (in progress)

No dependency, lockfile, contract, deployment-config, environment, production
database, or deployment setting was changed.

## exact next action

Finalize K003 evidence/handoff/continuity, rerun all gates after the final diff,
inspect staged files, commit and push only frontend K003 files, then verify the
remote hash. Do not begin K004.
