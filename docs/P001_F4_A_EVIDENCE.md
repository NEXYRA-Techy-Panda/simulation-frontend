# P001 F4-A evidence — simulation-frontend (Agent A — OpenCode)

Written before commit; commit hashes are returned in the P001 evidence report.

## Status

F4-A complete, review pending. Browser-side connection panel replaces the
static message. No sockets, controls, charts, or auth UI. Contract 1.0.1
authoritative, untouched.

## Behaviour implemented

- `app/lib/health.ts` (framework-agnostic): `sanitizeOrigin` (origin-only,
  http(s), credentials stripped, null on invalid), `parseHealthResponse`
  (typed; null on malformed — never coerced), `checkHealth` (bounded 8000 ms
  via AbortController; reachable = 2xx + valid shape incl. not_initialized,
  unreachable = network/timeout/abort, unexpected = non-2xx/bad JSON/bad
  shape; `checkedAtIso` per check).
- `app/components/connection-panel.tsx` ("use client"): Check states
  not-checked/checking/reachable/unreachable/unexpected with badge + button
  (disabled while checking); initial check on load (deferred past the effect
  body); aborts + clears in-flight work on unmount; in-flight guard blocks
  duplicate requests; no polling. Shows sanitized URL, contract version,
  last-check local time, error text. not_initialized renders an amber
  reachable-but-not-ready note — never green for missing data.
- `app/page.tsx` renders the panel (kind="simulator"); foundation label kept.

## Verification and limitations

- Logic + mock-server harness (temp, not committed; compiled lib via project
  tsc, plain-node http mocks on ports 4567/4568 — never 4000/4001):
  **20/20** — sanitize (6), parse (6: ok/not_initialized/not_checked +
  3 malformed rejections), live scenarios (8: success, not_initialized,
  malformed JSON, wrong shape, HTTP 500, timeout→unreachable,
  refused→unreachable, checkHealth timeout message).
- Contract verifier: 75/75 (unchanged). Typecheck: clean. Lint: 0 errors
  (1 pre-existing warning in untouched verifier; the sync-setState-in-effect
  error in the first panel draft was fixed via deferred initial check).
- Production build: exit 0. Served `next start -p 3000` (PID 11724, stopped):
  `GET /` → 200 with panel markup, "Check connection" button, initial
  "Not checked".
- Mock-based UI behaviour: logic layer fully exercised (above). Component
  render verified at SSR level only.
- Real backend HTTP: `GET localhost:4000/api/v1/health` — connection refused;
  service not running. Live integration check pending (independent of this
  task; no dependency on backend DB work).
- Browser/CORS: NOT verified — no browser capability in this session. The
  panel uses plain browser fetch, so CORS will be exercised on first real
  browser load; HTTP checks do not prove it.

## Files changed

- Created: `app/lib/health.ts`, `app/components/connection-panel.tsx`,
  `docs/P001_F4_A_EVIDENCE.md` (this file).
- Updated: `app/page.tsx`, `docs/HANDOFF.md`, `docs/PROGRESS_LOG.md`,
  `docs/ACTIVE_TASK.md`.
- Preserved: contract, verifier, lockfile versions (no new dependencies).

## Processes

None running at end. Port 3000 free. No foreign processes touched.

## Commit/push

Authorised P001 commit + push to `origin/main` (repo-local identity,
mohan-madhu). No force-push. Hashes verified via `ls-remote`; reported in
the P001 evidence report. Backend repos untouched.

## Next task needs

A running simulation-backend (Claude Code's) for the live check; a browser
for CORS confirmation. No code dependency.
