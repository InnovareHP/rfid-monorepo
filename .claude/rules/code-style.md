# Code style

Applies repo-wide. App-specific detail lives in `apps/*/CLAUDE.md`.

## General

- pnpm only. Never npm or yarn. Node >=18.
- TypeScript everywhere, no `any`. Prefer early returns and throwing over
  defensive runtime checks — let the type system carry the weight.
- One correct path. No fallbacks, no parallel ways to do the same thing.
- Surgical changes: touch what the task needs, nothing else.
- Comments are one line, one sentence, and only where the code cannot say it
  itself. No block comments, no JSDoc on obvious functions, no emojis.
- Markdown filenames are kebab-case.

## React state discipline

- `useState` and `useEffect` are a last resort, not the default reach.
- Derive during render before storing. If a value is computable from props,
  params, query data, or another state, do not put it in `useState`.
- No `useEffect` for: syncing state to props, fetching (use TanStack Query),
  or resetting form fields (use `form.reset`). Effects are for real external
  subscriptions and imperative DOM only.
- Forms carry their own state — see the forms rule in
  `.claude/rules/frontend-conventions.md`. A form field in `useState` is a bug.

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
