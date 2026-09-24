# K004-PREP3 evidence — environment controls UI preparation

**Developer Kishore Kumar | Agent K-B — FreeBuff | K004-PREP3**

> **Not merged, not pushed, not deployed.** Prepared on the feature branch
> `kishore/k004-environment-ui` in the separate worktree
> `simulation-frontend-k004`. Review is external and **pending** (never
> self-assigned). This is UI *preparation* on an isolated branch: the component
> is deliberately not mounted anywhere, so the simulator's public behaviour is
> unchanged and **no end-to-end or browser integration has been demonstrated**.

Progress: supporting Kishore batch 4 / approximately 8. Prepared on isolated
branches; main integration, deployment and end-to-end checks remain pending.
Approximately four later feature batches.

## 1. Worktree, branch, base and isolation

| Item | Value |
|---|---|
| Worktree | `C:/Users/kdon7/Desktop/react/hackthon/simulation-frontend-k004` (preserved) |
| Branch | `kishore/k004-environment-ui` (created for this task) |
| Base commit | `dbcbee9b935a3f6777f7a8bfca097d258e02e652` — `fix(sim): handle control acknowledgements and reset races`, equal to the committed `main` **and** `origin/main` at inspection |
| Committed divergence at inspection | none (`HEAD` == base; no rebase, merge, cherry-pick or base update) |
| Commits at inspection | none yet — the files below are the task-owned working-tree changes |
| Dependencies | `npm ci` run **inside this worktree only**; `package-lock.json` unchanged |

The main working copy `simulation-frontend` was **not** modified, stashed,
reset, cleaned, checked out or re-branched. K-A's uncommitted K003 work in that
copy (`app/components/sim-live.tsx`, `package.json`,
`app/components/historical-export.tsx`, `app/lib/historical-export.ts`,
`app/lib/__tests__/historical-export.test.mjs`) was inspected for conflict
awareness only — **none of it was copied here** and none of those files were
edited in this branch. The auditor repositories, the Python service, the parent
folder and production were not touched. Nothing was pushed. Both environment
worktrees (frontend and backend) are preserved.

## 2. What was implemented

| Path | Role |
|---|---|
| `app/lib/environment.ts` | Typed environment API adapter **and** the controls' state machine (framework-agnostic, dependency-free, no relative imports — same convention as `sim-state.ts` / `health.ts`) |
| `app/components/environment-controls.tsx` | Reusable `"use client"` controls component (not mounted anywhere) |
| `app/lib/__tests__/environment-controls.test.mjs` | 25 focused `node:test` checks using backend-shaped responses |
| `package.json` | Test script only: `node --test app/lib/__tests__/sim-state.test.mjs app/lib/__tests__/environment-controls.test.mjs` |

No dependency was added; no config, contract, page, map, export control or
live-state coordinator was changed.

**Adapter surface** (`app/lib/environment.ts`): `ENV_TEMP_MIN/MAX` (−30/60),
`ENV_RH_PCT_MIN/MAX` (0/100), `ENVIRONMENT_TIMEOUT_MS` (15000),
`SUPPORTED_AC_POWER_MODEL` (`ac-demand-v1`), `ENVIRONMENT_APPLIES_FROM`
(`next_step`), `parseRoomClimate`, `environmentCapability`,
`parseEnvironmentStateExtras`, `validateClimateInputs`, `environmentCommandBody`,
`parseEnvironmentCommandResult`, `applyRoomEnvironment`,
`fetchEnvironmentStateExtras`, `describeApplyFailure`,
`createEnvironmentController` (with `getState`, `subscribe`, `setContext`,
`setInput`, `apply`, `configure`, `dispose`).

**Backend dependency**: simulation-backend branch `kishore/k004-environment-prep`,
commit `13d59b6` (K004-PREP2). The adapter was written against that branch's
**actual source** (route, envelope, error codes and state fields), not against
an assumption.

## 3. Contract handling (as implemented on the backend branch)

- Route: `POST {sanitized backend base}/api/v1/environment` — the base is
  produced by the existing `sanitizeOrigin(backendUrl)`, so the public `/sim`
  prefix is preserved and paths are appended, never rewritten. No new
  environment variable and no alternate domain were introduced.
- Request body: exactly `{ room_id, temp_c, rh_pct }` — all three required,
  no extra fields, no nesting (`environmentCommandBody`).
- Success: the existing envelope (`{ data: … }`, a bare body is also accepted)
  with **every** field required — `room_id`, `seq`, `temp_c`, `rh_pct`,
  `sim_time_utc` (parseable) and `applies_from === "next_step"`. A 2xx answer
  that is malformed, or that returns a different `room_id`, is treated as a
  failure (`BAD_RESPONSE`), never as success.
- Errors: 400 `VALIDATION_ERROR` (field carried through when present),
  404 `NOT_FOUND`, 409 `CONFLICT`, plus transport cases `TIMEOUT`, `ABORTED`,
  `UNREACHABLE`. Backend messages are surfaced, with local explanatory text.
- The component never calls Python or the auditor, never resets a run, never
  computes power, energy or a room reading in the browser, and never invents a
  `seq`, timestamp or climate value.

## 4. Component interface (exact props)

```ts
interface SelectedRoomRef { room_id: string; name?: string | null }

interface EnvironmentControlsProps {
  backendUrl: string;                 // may include the public /sim prefix; sanitized here
  selectedRoom: SelectedRoomRef | null;   // from the parent's existing selection
  runId: string | null;               // null => no run exists
  acPowerModel?: string | null;       // from GET /state; null/absent => unsupported
  confirmedClimate?: RoomClimate | null;  // backend-confirmed climate for the room
  stale?: boolean;                    // parent's connection freshness
  fetchImpl?: FetchLike;              // injected in tests; defaults to global fetch
  timeoutMs?: number;                 // defaults to ENVIRONMENT_TIMEOUT_MS (15 s)
  onApplied?: (result: EnvironmentCommandResult) => void;   // confirmed accept
  refreshConfirmed?: (roomId: string) => Promise<RoomClimate | null>;  // authoritative refresh
}
```

The component owns only transient form state; room identity, run identity,
capability, confirmed climate and freshness are **props**, so the parent stays
authoritative. It exports `EnvironmentControlsProps` and `SelectedRoomRef` for
the later integration.

## 5. UX behaviour implemented

- Room name, plus the backend-confirmed climate when the parent has it
  ("Not reported by the backend yet" otherwise).
- Labelled number inputs: `Prescribed temperature (°C)` and
  `Prescribed relative humidity (%)`, with `min`/`max` attributes and the
  allowed range printed under each field.
- Explicit `Apply climate` submit; the button reads "Applying…" while pending.
- Bounds: temperature −30…60 °C, humidity 0…100 %. Blank, non-finite and
  out-of-range values are **rejected with an actionable per-field message and
  never clamped**; **zero is accepted as a valid value** for both fields.
- Three states are clearly distinguished in the copy: the backend-confirmed
  climate, unsaved input ("Unsaved input — not sent to the backend yet."), and
  an accepted command ("Accepted at simulated <t> (seq <n>) — applies from the
  next simulated step."). Neither value is presented as a physical sensor
  measurement, and the panel states that prescribed values are inputs the demo
  simulates with.
- Copy states that humidity is recorded per room for the readings but does not
  affect this demo's AC power model, which follows the prescribed temperature
  and occupancy and keeps to its schedule.
- No power, energy or reading is calculated in the browser.

## 6. State and race protections (all covered by tests)

- Apply is disabled when there is no run, when the connection is stale, when
  the capability is unsupported, and while a request is pending.
- **Missing capability means unavailable**: `acPowerModel` must equal
  `ac-demand-v1`; a missing or unknown model id (older backend, or a legacy run)
  is reported as unsupported — never assumed.
- A legacy run shows "a new run is required, reset to create one" text and is
  **never** reset by this panel.
- Duplicate submissions are refused while one is pending.
- Requests carry an `AbortSignal`; unmount calls `dispose()`, aborting anything
  in flight, and the controller is inert afterwards.
- Bounded timeout (default 15 s); a timeout is reported as *uncertain*
  ("may not have reached the backend") with instructions to refresh and check
  the confirmed climate before retrying. There is **no automatic retry**.
- Stale responses after a room or run change are dropped, including A → B → A
  (epoch guard); an old response can never overwrite another room's inputs or
  state, and a superseded request does not stick as "pending".
- Entered values survive a failed submission; an unsaved edit is not clobbered
  by a confirmed-climate refresh.
- On confirmed success the parent's `onApplied` is invoked for an authoritative
  refresh, and `refreshConfirmed` may supply the new confirmed climate; if the
  refresh fails or returns nothing, the accepted acknowledgement still stands
  and nothing is fabricated.

## 7. Accessibility and small screens

Real `<label for>` elements, `aria-invalid` + `aria-describedby` per field,
`role="status"`/`role="alert"` with `aria-live` for progress and errors, visible
focus rings (`focus-visible:outline`), and a `flex-col … sm:flex-row` layout so
the inputs and the Apply button stack and wrap at 375 px without clipping. No
page-wide `overflow` suppression was used, and no other screen was redesigned.

## 8. Lint correction made during this task (recorded honestly)

The first implementation passed tests, typecheck and build but failed
`npm run lint` with **6 errors** in `environment-controls.tsx`: four
`react-hooks/refs` "cannot access refs during render" (a `latest` props mirror
written during render), one "passing a ref to a function may read its value
during render" (the controller's `onChange` routed through a `notify` ref inside
the `useState` initializer), and one `react-hooks/set-state-in-effect`
(`setView(controller.getState())` called in an effect body).

Correction: the controller is now a real external store — it caches an immutable
snapshot, stays stable between changes, exposes `subscribe`, and its request
handlers can be swapped with `configure()` after render. The component consumes
it with `useSyncExternalStore(controller.subscribe, controller.getState,
controller.getState)`, keeps its handlers and context current in effects, and
reads no ref during render. Result: **0 lint errors**. `npm run lint` now
reports only the **one pre-existing warning on the base commit**
(`scripts/verify-contract.mjs:188 'v' is assigned a value but never used`,
confirmed present in `dbcbee9`), which was left untouched.

## 9. Verification actually performed

All commands in the isolated worktree on branch `kishore/k004-environment-ui`:

| Check | Command | Result |
|---|---|---|
| Focused tests | `npm test` | **44/44 pass** (19 committed `sim-state` + 25 new environment), exit 0 |
| Types | `npm run typecheck` | clean, exit 0 |
| Lint | `npm run lint` | **0 errors**, 1 pre-existing warning (base commit), exit 0 |
| Build | `npm run build` | exit 0; routes `/` and `/_not-found` prerendered (static) |
| Temporary SSR preview | `next start -p 3123` + `curl /environment-preview` | HTTP 200, 16,969 bytes; three mocked instances rendered (supported / legacy / no-run)

The 25 environment tests cover: exact URL/body/envelope handling through a
temp-port HTTP server that reads the real request, the `/sim` prefix path,
bare-body vs envelope, every required acknowledgement field, blank **vs** zero,
bounds rejection without clamping, 400/404/409 code mapping, timeout
uncertainty, duplicate prevention, room/run change and A → B → A late-response
drops, no-run and legacy capability gating, success refresh without
browser-invented readings, `dispose()` aborting in flight work, and the new
store seams (`subscribe` notification + stable snapshot + no notification after
`dispose`; `configure` swapping the handler without losing state).

**Temporary preview (deleted before commit):** `app/environment-preview/page.tsx`
rendered three capability states with an injected `fetchImpl` that returns 503
and **never reaches the public simulator**. Its served HTML was inspected to
confirm the labels, the humidity note, the bounds text and that all three Apply
buttons are disabled in the initial render. The route file was then removed and
the full check set re-run on the final tree (44/44, typecheck, lint, build — the
build now lists only `/` and `/_not-found`). The `next start` process was
stopped and port 3123 verified free. **This preview was not committed.**

Not performed (deliberately): the backend was not started; the backend's
89-test suite was not repeated; `verify:contract` was not re-run for this task
(no contract file changed); nothing was pushed, merged, deployed or deleted.

## 10. Browser and live-integration limitations

- **No browser was available in this session.** Interactive behaviour —
  clicking Apply, focus order, keyboard operation, error/success regions
  announcing, hydration-time capability notices, and the real 375 px layout —
  was **not** verified. The checks above are DOM-less SSR/build checks with an
  injected fetch, plus unit tests of the state machine.
- **No real end-to-end integration was exercised.** No request was sent to the
  live backend from this component; the backend branch is not merged and the
  component is not mounted. The mocked preview must **not** be described as
  real backend integration.
- The capability notices (unsupported / stale / select-a-room) appear after the
  first client effect, because context is applied through
  `controller.setContext` rather than during render. This matches the existing
  repo pattern (the map renders its loading state first) but was not visually
  confirmed in a browser.
- Browser/end-to-end checks remain outstanding and are listed as pending below.

## 11. Parent integration points and the exact mounting change (NOT performed)

The component is intentionally unmounted: `app/page.tsx`, `sim-live.tsx`,
`office-map.tsx` and the export controls were left untouched because K-A owns
them in parallel for K003. The later coordinated integration is small and
additive:

1. `app/components/office-map.tsx` — render `<EnvironmentControls>` in the
   selected room's details area, using the map's own `selectedRoomId` and the
   room's name for `selectedRoom`. This is the one place that already knows the
   selected room, so no new selection plumbing is needed.
2. `app/components/sim-live.tsx` — thread three values down to `OfficeMap`
   (new optional props): the displayed `runId` from the state payload, the
   recorded `acPowerModel` (top-level `ac_power_model`), the selected room's
   `climate`, and its existing `stale` flag. Pass `onApplied` as the existing
   forced poll so the parent re-reads authoritative state, and pass
   `refreshConfirmed` if a per-room confirmed climate is wanted immediately.
3. `app/lib/sim-state.ts` — the additive state fields are already parseable
   without touching the committed parser: `parseEnvironmentStateExtras(json)`
   returns `{ ac_power_model, rooms: Map<room_id, climate|null> }` from the same
   payload. Reading them into `SimState` (so `OfficeMap` can pass them) is the
   only new code needed.

**Behaviour before the backend rollout / before mounting:** nothing changes.
The new module and component are inert, unreferenced by any route, and the
public simulator receives no environment command from this branch's app.

**Model identity stays internal:** `ac_power_model` is consumed only to decide
whether the controls are available and is never shown as a comparison claim.
Contract **1.0.1 is unchanged** — this task adds no contract change, no new
version, and no claim about comparing runs. Per-room climate already has export
fields, so no export change is implied here.

## 12. Likely overlap with K003 (conflict awareness)

Expected merge conflicts when this branch and K003 meet:

- `package.json` — both tasks add a test file to the `test` script
  (this branch: `environment-controls.test.mjs`; K-A: `historical-export.test.mjs`).
  Resolution is to keep both. K-A also may have touched dependencies; this
  branch did not.
- `app/components/sim-live.tsx` — K-A modified it for K003; the mounting change
  in §11 touches it as well.
- `app/components/office-map.tsx` and `app/lib/sim-state.ts` — K003 export
  controls and this panel both read the same live state.
- Shared continuity docs (`docs/ACTIVE_TASK.md`, `docs/HANDOFF.md`,
  `docs/PROGRESS_LOG.md`) — both agents append here.
- `app/lib/__tests__/` — separate files, so no conflict expected.

No file these branches conflict on was edited in the backend task's scope, and
`src/app.ts` / `src/server.ts` (backend) were avoided there precisely to reduce
this overlap.

## 13. Exact next integration action

When the backend `kishore/k004-environment-prep` commits and this branch are
reviewed and accepted for integration, and after K003 lands:

1. Rebase or rebase-equivalent integration of `kishore/k004-environment-ui` onto
   the then-current `main` (keeping both test files in `package.json`).
2. Apply the three-step mounting change in §11 and re-run
   `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
3. Run the outstanding **browser** and **end-to-end** checks against the merged
   backend (run a supported run, prescribe a temperature, confirm the panel
   reports the acknowledgement and that the next published per-room reading
   changes, and confirm the legacy-run 409 path against an old run).
4. Only then consider deployment; **feature-branch deployment behaviour remains
   unconfirmed** (no CI configuration or deploy script was found, and `origin`
   has only `main` for this repository), so no push or deploy was attempted.

## 14. Decisions recorded (not silent assumptions)

- Legacy runs keep flat-rated AC power and cannot receive climate commands
  (409); the UI explains this and never resets a run.
- Missing `ac_power_model` means unsupported, not "assume supported".
- No office-level climate summary is added, and no comparison between legacy
  and model runs is implied.
- Model identity is internal; contract 1.0.1 remains authoritative and unchanged.
- No migration, config, environment variable or dependency was added by this
  frontend task.

## 15. Checkpoint / continuity

- Branch-local updates: `docs/ACTIVE_TASK.md`, `docs/HANDOFF.md`,
  `docs/PROGRESS_LOG.md` (this file is the evidence of record).
- Branch state: `kishore/k004-environment-ui` at base
  `dbcbee9b935a3f6777f7a8bfca097d258e02e652`, task-owned changes only:
  `app/lib/environment.ts`, `app/components/environment-controls.tsx`,
  `app/lib/__tests__/environment-controls.test.mjs`, `package.json` (test script),
  and the three documentation files. Temporary preview assets, `node_modules`,
  `.next` and dependencies are excluded from the commit.
- Review status: **pending** (external; never self-assigned).
- Stop point: task ends after K004-PREP3.
