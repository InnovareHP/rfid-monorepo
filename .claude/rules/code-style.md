# Code style

Applies repo-wide. App-specific detail lives in `apps/*/CLAUDE.md`.

## General

- pnpm only. Never npm or yarn. Node >=18.
- TypeScript everywhere, no `any`. Prefer early returns and throwing over
  defensive runtime checks — let the type system carry the weight.
- One correct path. No fallbacks, no parallel ways to do the same thing.
- Surgical changes: touch what the task needs, nothing else.
- Comments are one line, one sentence. No emojis or special characters.
- Markdown filenames are kebab-case.

## Where code goes

- `apps/api` — NestJS backend. `api/<feature>/` = module + controller + service
  (+ `dto/`). Shared infra in `src/lib/`.
- `apps/fe`, `apps/fe-support` — React + Vite. Layer rules in each app's
  `CLAUDE.md`: routes thin, services own Axios, components own presentation,
  hooks own shared stateful logic, `lib/` owns pure helpers.
- `packages/ui` — components used by more than one app. Source-shared, no build.
- `packages/shared` — pure TS used by both API and frontends. Has a build step
  (`pnpm build:shared`) because NestJS resolves it via CJS `require()`.

Frontend-only helpers (DOM, lucide-react, papaparse, TanStack Router) belong in
`apps/fe/src/lib/fe-helpers.ts`, never in `packages/shared`.

## Reuse before writing

- shadcn primitives: import from `@dashboard/ui/components/<name>`, do not
  re-copy into an app.
- Promote a component to `packages/ui` only once a second app consumes it.
- Avoid new external dependencies. If one is unavoidable, say why first.

## Version control

- Commit after significant changes, focused and atomic, clear messages.
- Never push. Never commit `docs/` or activity logs automatically.
