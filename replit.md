# StudentHub

Personal Russian-language web app for managing college life — a single calm
place for one student to track lessons, tasks, debts, grades, tests, notes,
and weekly plans.

## Architecture

Monorepo (pnpm workspaces). Three artifacts:

- **artifacts/studenthub** — React + Vite + TypeScript + Tailwind v4 + shadcn/ui
  + wouter (router) + TanStack Query. UI is fully Russian. Pages: `/` Сегодня,
  `/week`, `/tasks`, `/subjects`, `/subjects/:id`, `/debts`, `/grades`,
  `/tests`, `/notes`, `/settings`.
- **artifacts/api-server** — Express 5 + Drizzle ORM + Postgres. Served under
  `/api/*`. Routes are split per resource under `src/routes/`.
- **artifacts/mockup-sandbox** — design playground (unused for this product).

Shared libraries:

- **lib/api-spec/openapi.yaml** — single source of truth for the API.
- **lib/api-client-react** — generated TanStack Query hooks (`useGetX`, `useCreateX`,
  …). Always import from `@workspace/api-client-react`.
- **lib/api-zod** — generated Zod schemas (`CreateXBody`, `UpdateXParams`, …).
  Used in api-server for request validation.
- **lib/db** — Drizzle schema for `subjects`, `lessons`, `tasks`, `debts`,
  `grades`, `tests`, `notes`, `weekly_plans`. Exports `db` and tables.

## Development workflows

- API spec changes → `pnpm --filter @workspace/api-spec run codegen`.
- DB schema changes → `pnpm --filter @workspace/db run push`.
- Workspace typecheck → `pnpm -w run typecheck`.

## Notes

- All datetime columns are `timestamp with time zone`. The `received_at`
  column on grades and `week_start_date` on weekly_plans are `date`.
- The api-server routes do their own zod parsing per request; date-only
  query parameters (`/week?weekStart=`, `/dashboard/free-slots?date=`) are
  parsed manually with `new Date()` because zod v4's `coerce.date()` rejects
  bare YYYY-MM-DD strings.
- MVP scope: manual entry only. Settings page advertises future Google
  Calendar / Google Sheets imports as "скоро" but those are not implemented.
- Seed data was inserted at first launch (5 subjects, several lessons, tasks,
  debts, grades, tests, notes, and a weekly plan) so the app is alive on
  first open.
