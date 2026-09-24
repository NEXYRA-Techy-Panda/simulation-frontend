# Simulator frontend handoff — Kishore Kumar (Agent A — OpenCode, P011)

## K003 update (2026-09-25, Kishore | K-A — OpenCode)

K002 and the deployment/reset fixes remain intact. K003 adds run/window/format/
resolution selection and backend JSON/CSV download, keeps `/sim`, and corrects
true 375px overflow while preserving desktop layout/focus. Gates: 28/28 tests,
typecheck/build/contract green, lint has one pre-existing verifier warning.
Headless browser initiated and received the export response; disk persistence
and the K-C untested interactions remain honestly pending. See
`K003_EXPORT_UI_EVIDENCE.md`. Historical P009/P011 statements below are
preserved but superseded where they mention export as missing or old env/ports.

This document hands further simulator-frontend feature development to
**Kishore Kumar**. Mohan's agents are moving to foundations and auditor/ML
work. It describes the actual working baseline at P009 commit
`cc2fc8f6f53257a49bcbec838f2a189a751d9cd3`, not a roadmap wish-list.
Implemented code and live-verified behavior are distinguished throughout.

## 1. Ownership

- **Kishore Kumar** owns further simulator frontend feature development from
  here on.
- Mohan (via agents) retains auditor-frontend, auditor-backend, and
  energy-ml-service, plus shared-contract stewardship.
- The simulator backend (`../simulation-backend`) is a separate owner and
  repository — request backend changes there; do not work around the
  contract in the frontend.

## 2. Actual working baseline (P009, commit cc2fc8f)

Implemented and committed:

- Inventory-driven room map and device details (`app/components/office-map.tsx`,
  `app/lib/inventory.ts`, `app/lib/office-map.ts`): five stable rooms, SVG plan,
  selection, nominal ratings, schedule info where resolvable.
- Backend-time analogue and digital clocks (`app/components/clocks.tsx`,
  `describeInstant` in `app/lib/sim-state.ts`): one `sim_time_utc`,
  Asia/Kolkata display, "No simulation started" before a run.
- HTTP state polling (`app/components/sim-live.tsx`): ~1/s while visible,
  8 s timeout, no overlap, run/seq tracking with per-run reset, backoff
  (1/2/4/8/15/15…s), manual retry, resume-on-visible, stale labeling with
  last-success time.
- Start/pause/resume/reset/speed controls
  (`app/components/lifecycle-controls.tsx`): status-driven enablement,
  1/2/10/60/100/1000 selector, per-op pending labels, validation/conflict
  errors surfaced as failures.
- Real room/device/office readings when supplied (power, cumulative energy,
  on/off, override state, occupancy) with nominal-vs-live distinction.
- Lighting-only manual on/off/clear for lighting+switch devices.
- Backend connection panel (`app/components/connection-panel.tsx`,
  `app/lib/health.ts`).

Live-verified vs implemented: everything above is **implemented** and covered
by committed tests plus SSR markup checks, but **live browser interaction
(clicks, keyboard, polling against a real backend, CORS) was never executed
in-session** — no browser capability existed. Treat the UI as implemented but
not live-verified until the checks in §6 pass against a real backend.

## 3. Setup

Prerequisites: Node >= 20.9 (verified on Node v24.21.0; repo pins
next 16.3.6, react 19.2.8, typescript 5.9.3, tailwindcss 4.3.3, eslint 9.39.5;
`package-lock.json` is committed — use `npm ci` for a clean install).

```powershell
npm ci                  # or: npm install
npm run dev             # develop on http://localhost:3000
npm test                # node:test checks (no dependencies)
npm run typecheck       # tsc --noEmit
npm run lint            # eslint (0 errors expected)
npm run verify:contract # dependency-free contract checks (75/75)
npm run build           # production build
npm run start           # serve production on http://localhost:3000
```

Deployment configuration is committed in
`app/lib/deployment-config.ts`; the fixed base is
`https://git-pipeline.metatronhost.in/sim`. Vercel environment variables are
not required. Required backend routes now also include
`GET /api/v1/runs` and `GET /api/v1/export`.

For isolated browser work, do not edit the committed base: use a task-owned
application copy or a browser request rewrite to a scratch backend on the fixed
listener `127.0.0.1:19001`. Never point lifecycle automation at production.

## 4. Code map (actual file paths)

- `app/page.tsx` — header + `<SimLive>` main column + connection panel side.
- `app/components/sim-live.tsx` — polling owner, command senders, office
  readings strip, stale/retry UI; embeds `OfficeMap` with live maps.
- `app/components/office-map.tsx` — inventory fetch, SVG plan, selection,
  details panel, lighting buttons (props: `live`, `mutateDisabled`,
  `devicePendingId`, `onDeviceCommand`).
- `app/components/clocks.tsx` — analogue SVG + digital from one instant.
- `app/components/lifecycle-controls.tsx` — status/speed/buttons + errors.
- `app/components/connection-panel.tsx` — backend reachability panel.
- `app/components/historical-export.tsx` — K003 run/window/format/resolution
  controls, honest committed coverage, one-request download states.
- `app/lib/historical-export.ts` — strict run catalog, UTC window, exact `/sim`
  request and file-response adapter.
- `app/lib/sim-state.ts` — state/command types, strict parsers, exact P004
  bodies, `shouldApplyUpdate`, `backoffForFailures`, `createSingleFlight`,
  `describeInstant`, timeouts (state 8 s, commands 15 s).
- `app/lib/inventory.ts` — inventory fetch/validation/grouping/policy lookup.
- `app/lib/office-map.ts` — fixed room geometry, power labels (group total
  never multiplied), hours summary, selection resolution.
- `app/lib/health.ts` — health fetch/parse shared with the panel.
- `app/lib/__tests__/sim-state.test.mjs` — 19 committed state/command checks.
- `app/lib/__tests__/historical-export.test.mjs` — 9 K003 adapter checks.
- `scripts/verify-contract.mjs` — 75 contract checks, unchanged since F1.

Polling state lives in `sim-live.tsx` (`tracked` run/seq ref, `failCount`,
`nextAllowedAt`, single-flight + abort refs, `mounted` guard). Commands go
through `runCommand`: duplicate guard → POST → adopt confirmed run/seq →
immediate authoritative refetch → displayed state only ever comes from
fetched payloads.

## 5. Integration assumptions (P004-targeted, committed backend 93da205)

- State, summary, and device-result shapes exactly as P004 returns them
  (see `docs/P009_K1_UI_EVIDENCE.md` for the field lists); fixed engine start
  `2025-12-31T18:30:00Z` (= 2026-01-01 00:00 Asia/Kolkata); default speed 1.
- Exact bodies: start/speed send `{speed}`; pause/resume/reset send `{}`;
  device sends exactly `{"manual_state":"on"|"off"}` or
  `{"clear_override":true}`; error envelope `{code,message,field?}`.
- Additive response fields are accepted and ignored — never depended on.
- Later backend additions (P008 engine work in progress) need verification
  before the UI relies on them.
- Open questions (recorded, not silently resolved — see P009 evidence):
  empty-body start/resume acceptance, no-run speed persistence, upcoming
  state fields.

## 6. Outstanding verification (pending unless evidence says otherwise)

- Real deployed browser fetch/CORS and downloadable disk persistence; the local
  isolated export response was initiated/received, but headless Save As canceled.
- Clock display and Asia/Kolkata rollover with a live advancing backend.
- Start/pause/resume/reset/speed against a scratch run without exposing those
  mutations to production.
- Interactive room selection, lighting set/clear, and authoritative refresh.
- Network failure, stale controls, and recovery presentation.
- Full keyboard traversal. Current responsive screenshots prove layout and focus
  styling only; they do not prove tab order/activation.

## 7. Remaining work for Kishore (ordered by backend readiness)

1. Live verification of §6 against a scratch backend run (first).
2. Occupancy/schedule UI once the engine exposes occupancy/calendar
   endpoints (P008 scope — confirm shapes first).
3. Broader device controls beyond lighting+switch, when the backend
   supports them; environment controls likewise.
4. Socket.IO live state + snapshot/history recovery (replaces polling).
5. Batch history-generation UI when backend `/history/jobs` exists; K003 export UI
   for existing committed runs is implemented.
6. Fault controls and original/improved scenario comparison integration.
7. Among Us-style doodle occupants remain a later (MVP3) feature — not now.

## 8. Replacement-agent onboarding prompt

Copy everything below the line into the next agent's session. Replace the
bracketed task with its approved assignment. It authorises only that task —
not the whole roadmap above.

---

You are working on the NEXYRA **simulation-frontend** repository
(Kishore Kumar's ownership for features).

1. Read `docs/PROJECT_CONTEXT.md`, `docs/WORKSPACE_MAP.md`,
   `docs/HANDOFF.md` (especially §0 and this Kishore handoff),
   `docs/ACTIVE_TASK.md`, recent `docs/PROGRESS_LOG.md` entries,
   `contracts/v1/API.md`, and the relevant evidence doc
   (`docs/P009_K1_UI_EVIDENCE.md` for state/clocks/controls).
2. Inspect `git branch/status/log`, the working tree, and `app/` source.
   Verify the documented state; reconcile docs with code before changing
   anything. Preserve existing work — no reset, no force-push.
3. Implement ONLY the assigned layer below. Respect contract v1.0.1 and the
   P004-targeted shapes; verify later backend additions before relying on
   them. Never invent readings, never fake green success.
4. Keep focused repeatable checks green: `npm test`, `npm run
   verify:contract`, `npm run typecheck`, `npm run lint`, `npm run build`.
   Serve locally and HTTP-check markup; record browser/CORS limits honestly.
5. Checkpoint in ACTIVE_TASK/PROGRESS_LOG during work; update HANDOFF.md at
   completion with actual results; commit + push to `origin/main` (no force)
   and verify the remote hash.

ASSIGNED LAYER AND TASK: [paste the approved layer prompt here]
