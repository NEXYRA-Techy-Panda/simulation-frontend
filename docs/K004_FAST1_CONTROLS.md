# K004-FAST1 — fast-days controls (frontend branch note)

Developer Mohan | Agent M-C — Claude Code | review **pending**. Branch
`mohan/k004-fast1-controls` (worktree `K:\simulation-frontend-fast1` on Mohan's
laptop), base `main` `dbcbee9`. Local commits only; not pushed or merged.

## What it adds

| File | Change |
|---|---|
| `app/lib/fast-days.ts` | Adapters: `fetchFastState`, `startAdvance`, `stopAdvance`, `resetWithRecording`, `historyJobBody`, `createHistoryJob`, `fetchHistoryJob`, parsers and `checkDays` |
| `app/components/fast-days-panel.tsx` | `FastDaysPanel({ backendUrl, onChanged? })`, with three sections: Advance this run, New run recording, Generate history (separate run) |
| `app/lib/__tests__/fast-days.test.mjs` | 7 adapter tests (`npm test` now runs both test files) |
| `app/lib/sim-state.ts` | `postJson` and `readErrorBody` are now exported (no behaviour change) |
| `tsconfig.json` | `allowImportingTsExtensions: true` so node's type stripping can run the adapter test (`noEmit` was already true) |
| `app/page.tsx` | Mounts `<FastDaysPanel backendUrl={backendUrl} />` under `ConnectionPanel` |

## Behaviour

- **No frontend clock.** The panel polls `GET /api/v1/state` every 1 s while an advance or job is active, and every 5 s otherwise. Polls are single-flight with the existing bounded timeouts. Responses from polls that started before a command are discarded.
- **Processed time only.** The panel shows processed simulated time. The advance target is labelled "Target (not yet reached)".
- **Advance controls.** Presets of 1, 7 and 30 days, plus a custom whole number from 1 to 31. Start is enabled only while the run is paused; Stop is enabled only while an advance is active. The backend enforces one runner per run.
- **New run recording.** Per minute or hourly. It needs a two-click confirmation, because it ends the current run (reset).
- **Generate history.** Takes a month, a recording interval and an optional seed. It shows committed intervals, the generated run on verified success, and marks a failed job as incomplete.
- **Unsupported backends.** A backend whose `/state` has no `advance` field (for example the deployed `main`) shows "not supported" and the controls are disabled.

## Checks (Mohan's laptop)

| Check | Result |
|---|---|
| `npm test` | 27/27 |
| `typecheck`, `lint`, `build` | clean |
| `verify:contract` | 75/75 |
| Real-HTTP adapter check against backend branch `mohan/k005-history-prep` (scratch database, ephemeral port; see the backend K004-FAST1 evidence) | pass |
| Browser | **not verified** |

## Mounting if `page.tsx` conflicts with the visual work

Keep this one line anywhere in the page, and optionally the `onChanged` callback:

```tsx
import FastDaysPanel from "./components/fast-days-panel";
<FastDaysPanel backendUrl={backendUrl} />
// optional, inside SimLive: <FastDaysPanel backendUrl={backendUrl} onChanged={() => void pollRef.current?.(true)} />
```

It needs backend branch `mohan/k005-history-prep` (commit `c6794b2` or later), with the history router mounted as described in that branch's K005 evidence §10.
