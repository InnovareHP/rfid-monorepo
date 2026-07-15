---
description: Build a feature end-to-end using the planner → plan-critic → executer → reviewer → tester → finisher agent pipeline
argument-hint: <feature description>
---

Build this feature in the monorepo: $ARGUMENTS

Run the full agent pipeline. Each stage's output feeds the next; relay the plan and verdicts to the user between stages.

1. **planner** — spawn with the feature description. Get the implementation plan (files, ordered steps, data changes, risks, verification).
2. **plan-critic** — spawn with the full plan. If verdict is REVISE, send the blocking issues back to planner (via SendMessage to keep its context) and re-critique. Max 2 revision rounds; if still blocked, stop and ask the user.
3. **executer** — spawn with the approved plan verbatim. It implements step-by-step and reports deviations.
4. **reviewer** — spawn to review the resulting diff. If NEEDS FIXES, send findings to executer to fix, then re-review. Max 2 rounds.
5. **tester** — spawn to write/run tests, lint, and builds. If FAIL, route failures to executer, then re-run tester.
6. **finisher** — spawn for cleanup, contract sync, final gates, and commit prep. Do not commit unless the user asked.

Rules:
- Run stages sequentially (`run_in_background: false`) — each depends on the previous result.
- Surface each verdict (plan approval, review verdict, test result) to the user as it lands.
- If the feature is trivial (single file, no API/schema change), skip plan-critic and go planner → executer → tester → finisher.
- Final message: what was built, files touched, verification results, proposed commit message.
