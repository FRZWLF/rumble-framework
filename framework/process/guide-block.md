## Dev framework (rumble → task-out → pipeline)

{{project}} is built through the rumble framework: a design conversation ends in
`{{runtime.skill_prefix}}task-out` (issues on GitHub, decisions in the docs), and a **new
session** runs `{{runtime.skill_prefix}}pipeline` (triage → [architect] → implement → review
→ fix loop → gate → trail) with the project agents in `{{runtime.agents_dir}}/`. GitHub
objects (issues, labels, branches `feat/issue-N`, draft PRs, comments) are the single source
of truth; nothing relies on chat history. Any CI copies of the pipeline stay switched off.

**Three sessions.** The rumble session thinks, decides and writes rows; it stops at task-out
and never triages, designs, builds or reviews. The pipeline session orchestrates — it never
reads code — in waves of at most {{limits.parallel_builders}} builders, and retires when the
umbrella is done. Agent sessions do one job each in an isolated git worktree and end with a
PR or a `VERDICT:` line.

**Model policy ({{runtime.display}}).** triage `{{runtime.stages.triage.model}}` ·
architect `{{runtime.stages.architect.model}}` (size:L or delegated `D-`rows) · implement
`S` → `{{runtime.stages.S.model}}`, `M` → `{{runtime.stages.M.model}}`, `L` →
`{{runtime.stages.L.model}}` · reviews `{{runtime.stages.review.model}}` (quality always,
security only on `risk:high`) · fix rounds `{{runtime.stages.fix_red.model}}` on a
{{runtime.verdict_words.red}}, `{{runtime.stages.fix_nit.model}}` on nits · the frontier
model {{runtime.stages.frontier_on}}. At most {{limits.fix_rounds}} fix rounds, one
re-reviewer; reviewers reuse the PR's evidence; the full board runs once on `main` after
every merge. {{#if gate.human_merges}}The gate stops at `gh pr ready`; {{human}} merges every PR after reading
the trail.{{else}}{{human}} authorised merging in their name; `risk:medium|high` PRs are assigned
to {{human}} for review after the fact via the 📋 trail.{{/if}}

**Verify board.** `{{verify.board}}`{{#if verify.extra}} · {{verify.extra}}{{/if}}{{#if has_mandatory}}
{{#each mandatory}}
- Mandatory when the diff touches {{item.when_line}}: `{{item.run}}` — a red result
  ({{item.red_when}}) is a {{runtime.verdict_words.red}} of the review ({{item.rule}}).{{/each}}{{/if}}

## Documentation discipline (part of "done")

- Architecture-shaping choices → new `D-xxx` row in `{{docs.decisions}}`; append-only,
  later PRs add addenda; issues reserve numbers so parallel work never collides.
- Open questions → `G-xxx` in `{{docs.gaps}}` with the trigger that reopens them; closed
  rows are struck through with the closing `D-`reference.
- Any number worth keeping → `M-xxx` in `{{docs.measurements}}`; unmeasured reads "steht
  aus", never a target dressed as a result. The pipeline's own cost is a measurement too.
- Research that changed a decision → `{{docs.research}}` with sources.
- A task that changes what a doc describes updates that doc in the same branch. A reference
  without an anchor (a row, a test, a lever that does not exist) is a red finding.
- Standards: `{{docs.standards}}` — binding for every agent; on conflicts of safety it wins.

## Conventions

- Conventional commits; no AI co-author trailers. Branches `feat/issue-N`; `main` is always
  green. Secrets only via environment or ignored config — never in source, issues, PRs,
  logs or docs. Tests run offline.
