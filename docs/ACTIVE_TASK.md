# ACTIVE_TASK — simulation-frontend

## SIM-VIS-01 takeover checkpoint (2026-09-25)

- Owner: Mohan | Agent M-B — Codex. The interrupted M-D — FreeBuff session
  ended; its uncommitted work is preserved on `mohan/sim-visual-01` at the
  existing main baseline. This agent now owns only the isolated visual branch.
- Original visual implementation is in progress, not yet accepted: review,
  typecheck/lint/tests/build, local mock screenshot review, defects, final commit
  and transfer bundle remain. No browser was launched, no commands were sent
  to a backend, and no screenshots are claimed yet.
- Exact recovered state and limits: [SIM-VIS-01 evidence](SIM_VIS_01_EVIDENCE.md).
- K-A retains main integration; K-C's chart branch was not available locally.
  No sibling worktree, backend, deployment or main branch was changed.

## prompt_id

K002 — K1 (contract checkout portability and run-policy timing).
Prompt: Agent K — Kishore's coding agent. Owner: Kishore Kumar.

## agent

K — Kishore's coding agent (Kishore Kumar's ownership)

## Layer ID

K1 — contract checkout portability (frontend side is configuration + docs only)

## Objective

In **this** repository K002 does exactly two things: restore portable contract
verification by pinning LF checkout for the hashed paths, and record it in
documentation. **No** application source, config, dependency, lockfile, contract
semantics, animation or new simulator feature was changed. Contract 1.0.1
authoritative, read-only.

The run-policy timing half of K002 is backend work and lives in the sibling
repository (`simulation-backend/docs/K002_POLICY_TIMING_EVIDENCE.md`).

## Task status

completed (checkout portability + documentation)

## Review status

pending (never self-assigned)

## Previous task outcome (preserved)

- **K001 (K0 — setup and onboarding): completed, review pending.** Workspace,
  handoff and baseline were verified; no app source/config/dependency change.
  Evidence: `docs/K001_KISHORE_ONBOARDING_EVIDENCE.md`; commit `f2cdffe`
  published.
- **P011 (Kishore frontend handoff): completed, review pending.** P009 and P005
  remain implemented and accepted for implementation based on supplied evidence,
  with live backend/browser verification still outstanding. Recorded in
  `docs/PROGRESS_LOG.md`.
- The K001-discovered contract-verifier mismatch (67/75 from CRLF conversion) is
  the K002 work below.

## Repository and owner

- Repository: `simulation-frontend`
  (`https://github.com/NEXYRA-Techy-Panda/simulation-frontend.git`)
- Agent: K — Kishore's coding agent.
- Owner: Kishore Kumar. Paired backend: `../simulation-backend` (port 4000).

## Current branch

`main`, clean. HEAD at the start of K002:
`e2278399ceb0a1680b4c847bb30432ea9bc18c66` (the K001 `.gitattributes` commit),
equal to `origin/main`. `git fetch` was clean; no remote advancement.

## Last checkpoint timestamp, including timezone

2026-09-24 23:23:00 +05:30 (IST) — K002 checkout fix verified; documentation
written; committing.

## Applicable contract version

1.0.1 (mirrored, read-only). `contracts/v1/**`, its schema/fixtures and
`scripts/verify-contract.mjs` **content** were not edited — only their checkout
attributes.

## Environment (this laptop)

Windows 11 build 26200, Git Bash; git `2.55.0.windows.4`, node `v24.19.0`,
npm `11.17.0`. `core.autocrlf=true` comes from the **system** Git config
(`file:C:/Program Files/Git/etc/gitconfig`); no global Git configuration was
changed. Note the paired backend needs Node >= 24 for `node:sqlite`.

## Completed steps

1. Confirmed the K001 diagnosis on the actual files: Git stores canonical LF
   blobs, `core.autocrlf=true` (system config, no `.gitattributes`) converted the
   hashed paths to CRLF, and `scripts/verify-contract.mjs` hashes raw bytes.
2. Added `.gitattributes` with exactly two rules — `contracts/v1/** text eol=lf`
   and `scripts/verify-contract.mjs text eol=lf` — merged with any existing
   attributes (there were none). Deliberately left ordinary source/documentation
   files untouched and made no global Git change.
3. Restored only the affected, confirmed-unmodified paths from their exact Git
   blobs (targeted; no broad `reset`/`clean`/discard; nothing of the user's was
   lost).
4. Verified: **0 CR bytes** across the 9 hashed paths, `verify:contract`
   **75 passed / 0 failed**, and a **fresh temporary clone** that inherits
   `core.autocrlf=true` also checked out 0 CR bytes and passed **75/75**. Shared
   schema/fixtures/version are unchanged and no hash check was weakened.
5. Recorded the same two-rule recommendation for Mohan's three mirrors
   (`auditor-frontend`, `auditor-backend`, `energy-ml-service`) without
   modifying them.

## Files changed

- Created: `.gitattributes` (this repository's K002 configuration change).
- Updated: `docs/HANDOFF.md`, `docs/ACTIVE_TASK.md` (this file),
  `docs/PROGRESS_LOG.md`.
- Unchanged: all `app/**` source, configs, `package.json`, `package-lock.json`,
  `contracts/**` (content), `scripts/**` (content), `.next/`.

## Verification performed and actual results

`verify:contract` **75/75** (was 67/75) in this repository and in a fresh clone
with `core.autocrlf=true` inherited from the system config; 0 CR bytes across the
hashed paths. No UI rebuild was required, because no UI code changed.

## Incomplete edits and uncommitted changes

None in source. The K002 documentation and `.gitattributes` are committed by
this task. No sibling repository, contract file or parent file was touched.

## Blockers or unknowns

- Browser-side verification (clocks/rollover, selection, keyboard, lifecycle
  against the real backend, stale presentation, narrow layout) is still open —
  K002 had no browser ability either.
- The backend's export endpoint is not implemented, so end-to-end export/import
  integration is still pending.

## Exact next action

Complete the manual browser checklist in the K001 evidence §10 against a local
backend run and record the results; the backend's next assigned layer is the
historical export endpoint built on run-scoped policy activation. Do not begin
new simulator features until assigned.

## Related-repository dependencies

Paired backend `../simulation-backend` (port 4000); K002 backend work is recorded
in its `docs/K002_POLICY_TIMING_EVIDENCE.md`. Mohan owns `auditor-frontend`,
`auditor-backend` and `energy-ml-service`; none were touched.

## Commit reference

Base: `e227839`. K002 documentation:
`906446e201e4b6bb3e53bf1d44c85be2c17a593d` (pushed to `main`). A short
follow-up documentation commit records this hash.

## SIM-VIS-01 closeout status (2026-09-25)

- Visual work and checks are complete on `mohan/sim-visual-01`, but the 375px capture still shows preview header/control overflow; status is partial and review pending. Final gates: tests 52/52, typecheck pass, lint 0 errors (1 pre-existing warning), build pass, whitespace check pass. See `docs/SIM_VIS_01_EVIDENCE.md`.
- Production build's `/preview` route returns 404. No database runtime, backend command path, production API, deployment or integration was exercised. No push or merge was performed.
- Next action: fix the preview badge/control overflow shown in `docs/sim-vis-01/empty-mobile.png`, refresh that capture, and rerun lint/build. Then K-A can review and integrate this branch in the simulator main worktree, coordinating the separate chart work independently. Current commit and bundle details are in the evidence document.
