---
description: Review the current working diff against this repo's conventions
---

Review the uncommitted change set. Scope to `$ARGUMENTS` if given.

1. Run `git status` and `git diff` to get the actual change set. Review only
   what changed.
2. Read the rules that apply to the touched paths:
   `.claude/rules/code-style.md`, `.claude/rules/api-conventions.md`,
   `.claude/rules/frontend-conventions.md`, `.claude/rules/testing.md`.
3. Apply the checklist in `.claude/agents/reviewer.md`. If the diff touches
   auth, org scoping, Prisma queries, PHI, webhooks, or uploads, also apply
   `.claude/agents/security-auditor.md`.
4. Check the layer boundaries specifically — Axios in a component, Prisma in a
   controller, a query missing its org filter, a mutation missing query
   invalidation, a hardcoded board column.
5. Verify every finding against the file. Drop what you cannot reproduce.

Report severity ordered as `file:line — problem — fix`. Do not fix anything
unless asked.

$ARGUMENTS
