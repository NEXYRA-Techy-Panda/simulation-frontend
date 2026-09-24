# K003 historical export UI evidence

- **Developer:** Kishore Kumar
- **Agent:** K-A — OpenCode
- **Baseline:** `dbcbee9b935a3f6777f7a8bfca097d258e02e652`
- **Status:** implementation and browser/mock verification complete; review pending
- **Public API base:** `https://git-pipeline.metatronhost.in/sim`

## UI delivered

A dedicated **Historical data export** panel now appears after the office map.
It provides:

- historical run selection with active/ended and coverage details, loading every
  backend page up to a bounded 50-page safety limit;
- explicit no-data / unavailable states;
- committed start (inclusive) and end (exclusive) UTC inputs;
- JSON or standalone CSV;
- 1, 5, 10, 15, 30 or 60-minute aggregation;
- one bounded Download action;
- loading, stale catalog, HTTP/network/timeout, malformed/empty response and
  success-started states;
- required/validated UTC fields with errors associated through
  `aria-describedby`/`aria-invalid`.

Defaults come from `committed_start_utc` / `committed_end_utc` returned by
`GET /api/v1/runs`, not wall time, run start alone, or `sim_time_utc`. Copy
states that the active run's unfinished accumulator and time after the last
committed row are excluded. Coarser resolutions are described as aggregation,
not invented detail.

The browser fetches one raw file, validates its exact content type and non-empty
body, then uses a per-download object URL retained for five minutes. Sequential
or unmounted downloads do not revoke one another's URL. HTTP errors remain
visible and do not create a file. A synchronous ref acquired before the first
`await` blocks rapid double submission. Catalog refresh and form changes are
locked while downloading, and a run-id transition aborts the old request. A
request generation prevents late catalog responses from replacing newer state.
UI success says "download started", never claims the browser observed disk
persistence.

No telemetry, energy, policy or export aggregation is calculated in the browser.

## `/sim` deployment invariant

`app/lib/deployment-config.ts` remains unchanged. URL tests prove requests begin:

```text
https://git-pipeline.metatronhost.in/sim/api/v1/runs?...
https://git-pipeline.metatronhost.in/sim/api/v1/export?...
```

No Vercel environment variable is required and no leading-slash URL construction
can silently remove `/sim`.

## Responsive QA correction

K-C's `qa-evidence/K003-QA2` reported 375px clipping. The report and both images
were read. A CDP probe then found that headless Chrome invoked with
`--window-size=375` actually had `innerWidth=504` and saved a 375px crop, so the
old screenshot alone could not prove a 375px CSS viewport.

The source was hardened anyway:

- page/header/main/cards receive `min-w-0` and breakable text;
- speed buttons use a three-column mobile grid;
- lifecycle actions use a two-column mobile grid, keeping Reset visible;
- inventory/connection/export header buttons become full-width on mobile and
  auto-width on desktop;
- no page-wide overflow clipping or hidden control was added;
- native controls retain a visible 3px keyboard focus ring.

True device-emulated results for the current local production build:

| Viewport | client / scroll width | Horizontal overflow | Out-of-viewport buttons |
|---|---:|---:|---:|
| 375x812 | 375 / 375 | false | 0 |
| 1280x800 | 1280 / 1280 | false | 0 |

At 375px, Start/Pause and Resume/Reset form two rows; Reset ends at x=334 inside
the 375px viewport. Refresh inventory is x=41..334. Desktop retains inline
controls and no overflow.

Current-build screenshots were generated under the approved temp directory:

- `k003-after-cdp-375.png`
- `k003-after-cdp-1280.png`

They are verification artifacts, not committed product files.

## Isolated export browser flow

A task-owned scratch simulator database was served on the fixed local backend
listener `127.0.0.1:19001`; the current frontend production build ran on owned
port 3100. Chrome DevTools request interception rewrote only the committed
production `/sim` requests to that local backend. No lifecycle or other
state-changing simulator request was sent.

Observed in the rendered export panel:

```text
run count: 1
committed device rows: 36
coverage: 2025-12-31 18:30:00Z to 18:32:00Z, end exclusive
format: JSON
resolution: 60 seconds
Download enabled: true
horizontal overflow: false
response bytes received: 28,804
UI: JSON download started: nexyra-...-export-....json
UI error: null
```

Headless Chrome's download-progress event received all bytes but remained
`inProgress` and was canceled when the task-owned browser closed; no file was
written. Therefore UI selection/fetch/response initiation is witnessed, but
desktop Save As persistence remains pending. This limitation is not hidden as a
successful disk download.

## Automated gates

```text
npm test                    28 passed, 0 failed
npm run typecheck           passed
npm run lint                0 errors; 1 pre-existing verifier warning
npm run build               passed; / and /_not-found static
npm run verify:contract     75 passed, 0 failed
```

The nine K003 tests cover strict catalog parsing, duplicate rejection across all
bounded pages, current/historical selection, exact `/sim` URLs, UTC minute/
partial-edge conversion, invalid query/fragment base rejection, errors, exact
content type, empty/wrong responses, safe Content-Disposition and filename
fallback.

## Still not claimed

K-C did not test interactive room selection, live clock synchronization,
keyboard traversal or offline/stale recovery, and this task does not infer those
pass merely from screenshots. Those remain pending unless a later assignment
records direct evidence.

Local frontend :3100 and backend :19001 processes were stopped and both ports
verified clear. No production service, database or deployment was changed.
