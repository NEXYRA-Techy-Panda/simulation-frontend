# SIM-INTEGRATION evidence — live chart mounting

- **Developer:** Kishore Kumar
- **Agent:** K-A — OpenCode
- **Assignment:** SIM-INTEGRATION — chart addition
- **Chart source:** `9fc0f79f3082929cd67c475bc4b1902543632090`
  (`kishore/sim-chart-01`, based on `dbcbee9`)
- **K003 preserved commit:** `c4b319d`
- **Status:** completed; local integration, publication, and read-only observed
  deployment checks complete
- **Deployment:** backend/frontend routes observed after push; no public
  mutation was performed

## Integration boundary

`LiveCharts` is mounted in `SimLive` immediately below `OfficeMap` and before
`HistoricalExportPanel`. It receives the existing `sim` state and `stale` flag;
there is no chart-specific HTTP polling loop. `OfficeMap` now reports the actual
selected room and selected device to `SimLive`. The chart is therefore bound to
the same authoritative stream as clocks, lifecycle controls, readings, and
K003 export.

The device scope is visibly disabled as **Device: select in map** until the
user presses **Chart device** for a real inventory device. Room and device
selection never mutate simulator state.

## Telemetry semantics

- Backend source inspection confirms `run.seq` increments in `stepOnce` for
  every processed engine step and on state-changing controls. The existing
  `shouldApplyUpdate` accepts equal sequence responses, while the chart sample
  key includes run, sequence, simulated time, stale state, and selected scope.
- The bounded buffer retains up to 600 samples **per scope** and now retains all
  observed devices, so changing scope does not erase another scope's history.
  Run changes clear all series.
- Same-time higher-sequence updates replace the current point. Stale polls are
  normalized to explicit null gaps; recovery appends after the gap instead of
  reconnecting the line across an outage.
- Missing state entries are explicit `null` gaps, never fabricated zeroes.
  Unexpected cumulative-energy decreases are preserved, not clamped; the
  energy axis uses the maximum retained sample, not only the latest value.
- A new run hides the prior buffer until the effect has ingested/cleared it.
  Selected human-readable names are shown on chart cards, and inventory refresh
  only preserves a device that still belongs to the selected room.
- Chart labels say **Sampled min/max**. Long/high-speed windows include an
  Asia/Kolkata date plus time when the sample window crosses days; the table
  always includes date context. Reduced-motion classes disable pulse/spin.
- Room/device selection, run reset, and scope changes do not reset the buffer;
  only a real `run_id` change does.

## Polling/lifecycle correction

Two integration issues found during browser verification were corrected without
adding another loop:

1. `OfficeMap.refresh` no longer depends on inventory state, preventing a
   successful refresh from recreating its effect and causing an inventory
   request loop.
2. `SimLive` defers its initial forced poll by 50 ms so the effect/StrictMode
   cycle settles before the first request. The existing single-flight,
   visibility-aware, backoff-aware polling loop remains authoritative.

The existing lifecycle controls, reset behavior, device commands, K003 export
panel, `/sim` base, and responsive card layout remain intact.

## Isolated local browser verification

A task-owned scratch SQLite database was served on `127.0.0.1:19001`; the
current frontend production build ran on owned port `3100`. Chrome DevTools
request interception rewrote the committed public `/sim` requests to that local
backend. No public simulator command or database was touched.

Desktop run (1280px):

```text
old run: run-20260924T221445Z-8d419012
live sequence: 15; paused sequence: 15
backend office: 168 W, 0.006066666666666666 kWh
chart latest row: #15, 168 W, 0.0061 kWh, paused
room selection: Meeting room
device selection: Lighting group / dev-meeting-light
device on: 72 W; chart row #16 = 72 W
device off: 0 W; chart row #17 = 0 W
pause check: 2025-12-31T18:32:10Z before/after 1.6 s — frozen
reset: response/state agreed on new run run-20260924T221511Z-d680369c
        (subsequent scratch run IDs are intentionally ephemeral)
```

The reset DOM contained only the new run's initial `#0` sample, demonstrating
that the chart buffer reset with the run. The actual selected-device rows were
read after the scope settled; the immediate click diagnostic can capture the
previous office render for one React turn and is not used as evidence.

Mobile run (true CDP `375x812`, not a cropped desktop screenshot):

```text
client/scroll width: 375 / 375
horizontal overflow: false
chart scope button right edges: <= 338px
```

The current-build screenshots used for inspection are temporary artifacts:

- `C:\Users\kdon7\AppData\Local\Temp\opencode\k003-chart-live.png`
- `C:\Users\kdon7\AppData\Local\Temp\opencode\k003-chart-mobile.png`

They are not committed product screenshots. The chart branch's old mock
screenshots were removed from the merge; mock images are not telemetry proof.

## Combined checks

The latest completed runs before final publication are:

```text
npm test                    43 passed, 0 failed
npm run typecheck           passed
npm run lint                0 errors, 1 pre-existing verifier warning
npm run build               passed
npm run verify:contract     75/75 (contract unchanged)
```

The final post-documentation run repeated these gates successfully. The K003
export browser flow was also rechecked against the scratch backend; the export
panel remained present and the existing headless download limitation is
unchanged (response bytes were received, but Save As persistence is not
claimed).

## Publication and observed deployment

Publication was performed normally after the green gates. The implementation
merge is `bacc8ff`, review fixes are `a47204d`, and the evidence/continuation
publication is `53d5bc9`; the final handoff commit is the current frontend
`origin/main` head.

```text
simulation-backend origin/main: 5cb824dc581495a9d1ea9db114cac6823f2e7c1a
simulation-frontend origin/main: 53d5bc9 + final handoff commit (current head)
```

Read-only public observations after publication:

- `https://git-pipeline.metatronhost.in/sim/api/v1/health` returned HTTP 200.
- `GET /sim/api/v1/runs?page=1&page_size=1` returned the active run with
  committed coverage and `exportable: true`.
- A one-minute public JSON export returned HTTP 200, `Content-Disposition`
  attachment, `Cache-Control: no-store`, and an allowed origin for
  `https://enersave-simulator.vercel.app`.
- `https://enersave-simulator.vercel.app/` rendered the current frontend with
  live office state and the mounted chart section. The observed paused state
  showed `312 W` and `128.2084666665512 kWh`; device scope was visibly disabled
  until map selection.
- The observed deployed frontend had no horizontal overflow at 1280px or true
  375px CDP width, and no mobile button exceeded the viewport.
- After the review follow-up propagated, the deployed chart exposed
  `aria-pressed="true"` for Office/Graphs, `false` for the inactive scope/table
  controls, and retained the disabled device scope. This confirms the follow-up
  revision was observed, not merely pushed.

These were GET/HEAD-style read-only checks. No public lifecycle, device, reset,
or database mutation was sent. The chart deployment is therefore observed, but
interactive deployed device-switch/download persistence remains distinct from
the local integration verification above.

## Not claimed

No claim is made for public keyboard traversal, offline recovery, or a future
SIM-VIS-01 illustrated-map redesign. The chart is mounted below the current map
and can be relocated when that separate design branch is ready. K004 and
unrelated feature work remain out of scope.
