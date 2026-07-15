---
description: Refactor code safely with behavior preserved, using the planner → plan-critic → executer → reviewer → tester → finisher pipeline
argument-hint: <what to refactor and why>
---

Refactor in the monorepo: $ARGUMENTS

This is a behavior-preserving change. External contracts (API routes, DTOs, component props consumed elsewhere, DB schema) must not change unless the user explicitly said so.

Pipeline:

1. **planner** — spawn with the refactor goal plus these constraints: no behavior change; respect layer rules (routes thin, services own IO, components presentational, pure utils in lib/); honor placement rules (fe-only utils → `apps/fe/src/lib/fe-helpers.ts`, cross-app pure → `packages/shared`, dual-frontend components → `packages/ui`). Plan must include a baseline step: run existing tests/lint BEFORE touching code.
2. **plan-critic** — spawn with the plan. Extra scrutiny: hidden behavior changes, import-graph breakage, `packages/shared` build-order impact, `.tsx` import-edit formatter gotcha. Max 2 revision rounds.
3. **executer** — spawn with approved plan. Baseline first, then refactor in small verifiable steps; run the affected build after moves between packages.
4. **reviewer** — spawn on the diff. Focus: dropped call sites, changed semantics, broken barrel exports, missed consumers (Grep for old import paths must return zero).
5. **tester** — spawn: full affected test suites plus lint plus builds. Refactors need the WHOLE affected suite green, not just targeted files. Route failures back to executer.
6. **finisher** — cleanup, confirm no stale files left at old paths, gates, commit prep (`refactor:` prefix). Do not commit unless the user asked.

Run stages sequentially; surface each verdict to the user. If scope turns out to require behavior change, stop and ask the user before proceeding.
