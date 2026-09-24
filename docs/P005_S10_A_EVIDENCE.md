# P005 S10-A evidence — simulation-frontend (Agent A — OpenCode)

Written before commit; commit hash is returned in the P005 evidence report.

## Status

S10-A complete, review pending. Office-map + inventory screen replaces the
foundation page. Auditor-frontend untouched. Contract 1.0.1 authoritative,
untouched.

## Behaviour implemented

- `app/lib/inventory.ts`: bounded fetch (8 s, abort) of
  `GET /api/v1/inventory`; strict envelope validation
  (`data.rooms/devices/policies`, closed record shapes, duplicate-ID
  rejection); devices with unknown rooms KEPT as unassigned; grouping +
  device/office-hours policy resolution helpers.
- `app/lib/office-map.ts`: fixed SVG geometry for the five stable room IDs
  (+corridor), `powerLabel` (group total shown as-is, never multiplied),
  `officeHoursSummary`, `graceSeconds`, `resolveSelection`
  (preserve-or-first-or-null).
- `app/components/office-map.tsx`: loading/error/loaded/empty states, manual
  Refresh (dedup guard, abort on unmount, no polling), stale banner with
  last-success time on failed refresh, top-down SVG with selectable regions
  (click + Enter/Space, aria-pressed, visible focus ring), full room list of
  buttons, unknown rooms listed (never dropped), details panel (name,
  capacity labelled as capacity, device name/category/nominal/quantity/
  always-on badge, resolvable schedule info, building hours), "Not available
  yet" box for occupancy/live/on-off. No dots, switches, clocks, sockets,
  charts, or export.
- `app/page.tsx`: header + map + side column (retained connection panel,
  config). Responsive grid (stacks on narrow screens).

## Data fields used vs unavailable

- Used: room_id/name/room_type/capacity; device_id/name/room_id/device_type/
  quantity/nominal_power_w/always_on; policy_id/version/applies_to/kind/
  rules (grace, hours) when resolvable.
- Unavailable (shown as "Not available yet", never zero/badges): current
  occupancy, live consumption, on/off state.

## Verification and limitations

- Focused temp harness (compiled lib, contract-shaped fixtures in tests only,
  mock servers on 4571+ — never 4000/4001, nothing committed):
  inventory 21/21 (valid parse, verbatim group power, grouping, unassigned
  kept, policy resolution, 8 malformed rejections, empty/500/slow/refused
  behaviour); map helpers 10/10 (geometry coverage + viewBox bounds,
  no-multiply, hours format, grace, selection preserve/fallback/empty).
- Contract verifier: 75/75 (unchanged). Typecheck: clean. Lint: 0 errors
  (1 pre-existing warning in untouched verifier). Production build: exit 0.
- Served `next start -p 3000` (own PID, stopped; port free): `GET /` → 200
  with map section, Refresh button, loading state, config, connection panel.
  Backend down, so the served page shows the loading→error path — correct
  (no fake fallback); SVG/selection/keyboard/narrow-screen interaction needs
  a browser.
- Mock vs real: all behaviour above is mock-based. Real backend
  `GET :4000/api/v1/inventory` → connection refused (Claude Code's engine not
  serving). Live integration + real CORS check pending; not waited on.
- Browser tooling: absent in this session — room selection, keyboard access,
  narrow layout, and visual states are unverified beyond SSR markup. Stated
  plainly; SSR is not proof of interaction. No screenshots captured.

## Files changed

- Created: `app/lib/inventory.ts`, `app/lib/office-map.ts`,
  `app/components/office-map.tsx`, `docs/P005_S10_A_EVIDENCE.md` (this file).
- Updated: `app/page.tsx`, `app/globals.css` (focus ring only),
  `docs/HANDOFF.md`, `docs/PROGRESS_LOG.md`, `docs/ACTIVE_TASK.md`.
- Preserved: contract, verifier, lockfile versions (no new dependencies).

## Processes

None running at end. Port 3000 free. No sibling/foreign processes touched.
No backend started (Claude Code's).

## Commit/push

Authorised P005 commit + push to `origin/main` (repo-local identity
mohan-madhu). No force-push. Hash verified via `ls-remote`; reported in the
P005 evidence report.

## Next-task dependencies

Running simulation-backend with GET /api/v1/inventory for the live check; a
browser for selection/keyboard/layout/CORS confirmation. No code dependency.
