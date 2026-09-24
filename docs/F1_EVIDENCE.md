# F1_EVIDENCE — simulation-frontend (contract mirror)

Written before commit; final commit hashes are returned in the F1 evidence
report, not invented here.

## F1 status

Contract v1.0.0 authored and verified 2026-09-24. Task completed, review pending.
This repo holds a byte-identical mirror; canonical copy:
`simulation-backend/contracts/v1/`.

## Python verification (agent-run, current terminal)

- Supplied interpreter:
  `C:\Users\vikram\AppData\Local\Programs\Python\Python313\python.exe`
- Results: `Python 3.13.15`, 64-bit, pip `26.2.1`, SQLite `3.50.4`,
  `venv` import OK. Matches Mohan's terminal evidence.
- PATH `python`/`pip` shims still stale (Store stub); PATH not modified.
- Status levels: user-verified installation + agent verification done;
  dependency compatibility is F2 work. Python 3.13 is the setup target.
- F1 and this repo need no Python.

## Contract artifacts (mirrored; hashes from canonical manifest)

- contracts/v1/CONTRACT.md — `a10dc136…8d19`
- contracts/v1/dataset.schema.json — `dd4feedd…dd35b0`
- contracts/v1/CSV_COLUMNS.md — `4e217d7b…064f6e15c`
- contracts/v1/API.md — `49e54a7d…ba4c831ff`
- contracts/v1/fixtures/reference.json — `14dec040…892b80504c`
- contracts/v1/fixtures/reference.csv — `f7f6883a…f3942998202`
- contracts/v1/fixtures/expected.json — `522fb8dc…395e8289a`
- scripts/verify-contract.mjs — `c6f10494…28c632e15dafc`
- contracts/v1/manifest.json (hash list; excludes itself)

Full hashes in `contracts/v1/manifest.json`.

## Verification commands and actual results

- `node scripts/verify-contract.mjs` (Node v24.21.0, built-ins only, no
  install) run in all five repo roots: **49 passed, 0 failed in each**.
- Covers: hand totals (light 0.02, fridge 0.01, office 0.03 kWh; Rs 0.30),
  counter reconciliation, key uniqueness, policy-ref resolution, contiguity,
  energy formula + V·I·pf tolerance, manifest hash match (8 files),
  exact CSV header, 4-row keyed CSV/JSON parity (1e-9), meta_run consistency,
  forbidden fault-label scan, findings-only-in-expected check.
- 120 s reaggregation preserves 0.03 kWh. `meta_run` identical on all rows.
- Explicitly semantic checks only — formal JSON Schema validation not run (F2).
- No scaffolding, installs, migrations, training, servers, or deployment.

## Canonical JSON top-level shape

`schema_version, source, synthetic, synthetic_label?, building, run, export,
rooms[], devices[], policies[], room_intervals[], device_intervals[]`.

## CSV header and encoding

UTF-8, header row, RFC 4180 quoting, decimal dots, `true`/`false`, empty =
null. 28 columns starting `run_id,building_id,scenario_id,...` and ending
`...,policy_ref,partial,meta_run,meta_policy` (exact header asserted by the
verify script). One row per device interval; `meta_run`/`meta_policy` are the
only JSON-valued columns.

## Key decisions locked by v1.0.0

Half-open UTC intervals; complete-only except edge `partial`; missing ≠ zero;
keys `(run_id, device|room_id, interval_start)`; identical duplicates deduped,
conflicts error; no cross-dataset dedup by device ID; immutable policy
versions via `policy_ref`; tolerance 1e-6 kWh / 1% power-derived; export
rounding only (6 dp kWh, 3 dp W); CSV aligned-grid coverage; no total rows;
no fault-label fields; tariff changes never alter identity or retrain.

## Checks not performed

Formal schema-validator run; runtime HTTP/Socket.IO integration; Python
dependency install; tariff/forecast behaviour beyond arithmetic. All F2+.

## Mirror consistency

`verify-contract.mjs` hash step passes in this repo against the same manifest,
proving byte-identical mirrors. Later contract changes need a version entry +
coordinated updates; a newer file alone proves no compatibility.

## Commit / push

Authorised by F1 ("docs: establish foundation and v1 data contracts").
Recorded in the F1 evidence report with verified remote hashes.

---

## F1-R1 corrections (2026-09-24, review pending; version stays 1.0.0)

- (A) CSV is self-contained: `meta_run` envelope on the first data row only,
  `meta_policy` removed (27-column header), scalar `policy_ref` resolves
  against the envelope; slice-without-envelope rejected. Fresh-DB import needs
  no paired JSON.
- (B) 12 dp kWh exports; unrounded internal accumulation; tolerances 1e-9
  per-value, n·1e-9 totals, 1e-9 triple-relative; in-memory 7 W × 44,640
  check (analytic 5.208 kWh vs budget 2.232e-8) passes.
- Verifier extended: CSV-alone reconstruction + full semantic parity vs the
  JSON oracle, duplicate handling, 4 negative checks
  (missing/multiple/unknown-policy/conflicting-room) — all fail as required.
- Final: 54 passed, 0 failed in all five repos (built-ins only; formal schema
  validation still F2). Mirror hashes match the regenerated manifest.
- Repo-local git identity configured (mohan-madhu/mohan326856@gmail.com).
- Commit/push outcome recorded in the F1-R1 evidence report.
