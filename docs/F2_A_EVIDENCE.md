# F2-A evidence — simulation-frontend (Agent A)

Written before commit; commit hashes are returned in the F2-A evidence report.

## Status

Foundation complete, review pending. Independently runnable Next.js app on
port 3000. No backend integration, no features.

## Exact versions (installed, identical in both frontends)

- Node v24.21.0, npm 11.19.0 (system; not changed)
- next 16.3.6, react 19.2.8 / react-dom 19.2.8
- typescript 5.9.3, tailwindcss 4.3.3 (+ @tailwindcss/postcss v4),
  eslint 9.39.5 (+ eslint-config-next 16.3.6), @types/node 20 / react 19
- Node 24 satisfies Next 16 (requires >=20.9) — verified compatible, no
  runtime change, no other package manager, no global changes.
- `package-lock.json` committed.

## Files added/changed (F2-A)

- Added: `app/` (layout.tsx title "Office Simulator", page.tsx foundation
  screen, globals.css Tailwind v4, favicon.ico), `public/` (default static
  assets), `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`,
  `eslint.config.mjs`, `next-env.d.ts`, `package.json`, `package-lock.json`,
  `.env.example` (`NEXT_PUBLIC_SIMULATION_BACKEND_URL=http://localhost:4000`,
  origin only).
- Scaffold generated in an isolated temp dir and copied in (no .git copied;
  temp copy had no .git); README/.gitignore merged, not replaced.
- Updated: `README.md` (setup/run docs), `.gitignore` (+Next outputs,
  +`!.env.example`), continuity files.
- Layout `LayoutProps` global replaced with explicit `ReactNode` props so
  `tsc --noEmit` passes without generated route types.

## Setup/run commands (all executed)

```powershell
npm install
npm run verify:contract
npm run typecheck
npm run lint
npm run build
npm run start   # serves production on http://localhost:3000
npm run dev     # develops on http://localhost:3000 (script present, not run)
```

## Results

- Contract verifier: 75 passed, 0 failed (unchanged script).
- Typecheck (`tsc --noEmit`): clean, exit 0.
- Lint (`eslint`): 0 errors; 1 pre-existing warning in untouched
  `scripts/verify-contract.mjs` (`v` unused) — verifier preserved unchanged.
- Production build: exit 0, `/` prerendered static.
- HTTP: `GET /` → 200 both on dev-check runs; title "Office Simulator" and
  "not connected yet" confirmed in served HTML. Served via `next start -p
  3000` (PIDs owned by this agent, since stopped; ports free afterwards).
- Browser rendering: NOT inspected — no browser capability in this session.
  HTTP verification only.
- Env var: origin only, full contract paths used separately; no credentials;
  real `.env` ignored; no backend request made.

## Processes/ports

- Ran `next start -p 3000` (PID 15808, stopped by this agent). Port 3000 free
  at end. No foreign processes touched. Nothing left running.

## Commit/push

Authorised F2-A commit + push to `origin/main` (repo-local identity).
Hashes verified via `ls-remote`; reported in the F2-A evidence report.
Backend repos untouched.
