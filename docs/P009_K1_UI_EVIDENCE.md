# P009 S9/K1-UI evidence — simulation-frontend (Agent A — OpenCode)

Written before commit; commit hash is returned in the P009 evidence report.

## Status

S9/K1-UI complete, review pending. Real backend state on the office map.
Auditor-frontend and all backend repos untouched. Contract 1.0.1 + P004 shapes
authoritative, untouched.

## Implemented behaviour

- `app/lib/sim-state.ts`: typed state/commands (P004 shapes), strict parsers
  (no-run nulls, no zero-defaults, unknown runtime devices kept), command
  builders with exact P004 bodies, `shouldApplyUpdate` (run-change resets
  tracking; same-run seq>= applies), `backoffForFailures` (1s×2^n, 15s cap),
  `createSingleFlight`, `describeInstant` (one instant → analogue angles +
  digital Asia/Kolkata text, pure, never computer time).
- `app/components/clocks.tsx`: analogue SVG + digital date/time/zone from the
  SAME sim_time_utc; "No simulation started" before a run; frozen while
  paused (no independent advancement); 1000× shows latest processed time.
- `app/components/lifecycle-controls.tsx`: status badge, 1/2/10/60/100/1000
  selector, Start/Pause/Resume/Reset enabled from actual status (Start
  disabled while running, Pause only while running, Resume only while paused,
  Reset once a run exists), per-op pending labels, reset explainer (new run,
  history preserved, display replaced only on confirm), validation/conflict
  errors shown as failures.
- `app/components/sim-live.tsx`: ~1/s polling while visible (bounded 8 s,
  no overlap, abort on unmount, backoff, manual Retry, resume on visible);
  stale labeling with last-success time (never "stopped" on network failure);
  controls + device buttons disabled while stale/pending; post-command
  authoritative refetch (no invented energy/time); office power/energy strip.
- `app/components/office-map.tsx` additions: live room occupancy (or
  per-field "not available yet"), per-device live power/energy/on-off +
  actual override state, lighting on/off/clear buttons only for
  lighting+switch devices (disabled while stale/pending), runtime-only
  device disclosure, nominal-vs-live distinction kept.

## P004 fields used

state: status/speed/run_id/seq/sim_time_utc/step_seconds,
rooms[{room_id,occupancy,power_w,energy_kwh}],
devices[{device_id,room_id,on,power_w,override{active,on}|null,energy_kwh}],
office{power_w,energy_kwh}, partial_interval (accepted, unused).
control summary: {run_id,seq,sim_time_utc,status,speed}.
device result: {device_id,override,seq,sim_time_utc}.
Error envelope {code,message,field?} with HTTP status (409/404/400 mapped).
Extra additive fields accepted, never depended on.

## Added-response fields not yet supported

None encountered in P004. `partial_interval` is accepted and ignored (history
work is a later layer).

## Polling and stale-state behaviour

See implementation above. Equal-seq refetches apply (idempotent); lower-seq
ignored; run change always applies fresh. Backoff 1/2/4/8/15/15…s. Retry
resets backoff and forces a fetch.

## Verification results and limitations

- Committed `npm test` (node:test, zero deps, direct .ts import): **18/18** —
  state parsing (running/no-run/malformed/bare+envelope/speeds), exact command
  bodies, summary/device-result parsing, same-instant clocks, Kolkata
  rollover (2025-12-31T18:30:00Z → Thu, 01 Jan 2026 00:00:00), determinism,
  staleness incl. run-change reset, backoff caps, single-flight, 404/409/400
  mapping, refused-connection (no fake state), end-to-end URL/body wiring on
  a temp-port mock.
- Contract verifier: 75/75 (unchanged). Typecheck: clean (fixed helper
  signatures + device-result/run-summary mapping). Lint: 0 errors (fixed
  render-time ref writes + sync setState-in-effect; 1 pre-existing untouched-
  verifier warning). Production build: exit 0.
- Served `next start -p 3000` (own PID, stopped): `GET /` → 200 with clocks,
  lifecycle, office readings, map, speed, reset-explainer markup.
- Mock vs real: all behaviour mock-based. Real `GET :4000/api/v1/state` →
  connection refused (no listener; Claude Code P008 in progress). No
  mutations attempted on any foreign run; coordinated live-mutation testing
  stays a later check.
- Browser: NO capability in-session — clocks rendering, keyboard controls,
  stale presentation, and narrow layout unverified beyond SSR markup; no
  screenshots. Stated plainly.

## Questions for Claude Code

1. Confirm `POST /control/start` and `/control/resume` accept an empty `{}`/
   bodiless call (tests only show `{speed}` and no-body 409s).
2. Is `speed` in the no-run state always the default (1), and does it persist
   across restarts?
3. Any additional `state` fields planned before the Socket.IO layer that the
   UI should already tolerate?

## Files changed

- Created: `app/lib/sim-state.ts`, `app/lib/__tests__/sim-state.test.mjs`,
  `app/components/clocks.tsx`, `app/components/lifecycle-controls.tsx`,
  `app/components/sim-live.tsx`, `docs/P009_K1_UI_EVIDENCE.md` (this file).
- Updated: `app/components/office-map.tsx`, `app/page.tsx`, `package.json`
  (test script), `docs/HANDOFF.md`, `docs/PROGRESS_LOG.md`, `docs/ACTIVE_TASK.md`.
- Preserved: contract, verifier, lockfile versions (no new dependencies).

## Processes

None running at end. Port 3000 free. No sibling/foreign processes touched;
no backend started.

## Commit/push

Authorised P009 commit + push to `origin/main` (repo-local identity
mohan-madhu). No force-push. Hash verified via `ls-remote`; reported in the
P009 evidence report.

## Next-task dependencies

Running simulation-backend (P004-compatible) for live polling + command
checks; a browser for clocks/controls/stale-state confirmation. No code
dependency.
