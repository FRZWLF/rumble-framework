---
name: pipeline
description: Run the {{project}} dev pipeline in-chat (triage → [architect] → implement → review → fix loop → gate → merge) with the project agents and gh — for one issue, an umbrella's free splits, or every free task. Use as "{{runtime.skill_prefix}}pipeline <issue>", "{{runtime.skill_prefix}}pipeline", "run the pipeline", "build #12".
---

# {{project}} in-chat pipeline — orchestrator procedure

You are the orchestrator. You do not write code and you do not read code — you brief agents,
read their verdicts, resolve merges, and post the trail. GitHub (issues, labels, comments,
branches, draft PRs) is the single source of truth; the state survives this session.
Escalation means: label `needs-human` + assignee {{human}} + a summary in chat, then stop.
{{human}} is the only inbox.

Repo: `{{repo}}`. Argument: an issue number (run exactly this one), an umbrella number
(run its free splits), or nothing (every open `type:task` issue without
`{{labels.build}}`/`needs-human`/`blocked` whose `Depends on:` are all closed). In the
umbrella and no-argument modes, work in **waves**: start the free issues in parallel (at most
{{limits.parallel_builders}} implementers or reviewers building at once — disk and merge
conflicts set that cap), gate each as it finishes, re-read the dependency graph, start the
next wave, until nothing is free. Report after every merge; stop when the umbrella has no
free split left or {{human}} says stop.

**Session hygiene.** This orchestrator runs in a session that started with
`{{runtime.skill_prefix}}pipeline`, not in the rumble session that wrote the issues — the
rumble context would ride along in every turn here. Over an arc the context stays small
because nothing here reads code. If a session grows past an arc, finish the wave, post the
trails and let {{human}} open a new one; everything the next session needs is on GitHub and
in the docs.

## Never trigger automation

Any CI/Actions copies of this pipeline stay off. Keep the habits that make it safe even when
armed: PRs stay **drafts** until the gate, label writes go through `gh`, and never add
`{{labels.build}}` yourself — triage does.

## Preconditions (once per run)

- Local `main` clean and up to date (`git fetch && git status`).
- Project fixtures up if the issue's area needs them{{#if project_notes.fixtures}}
  ({{project_notes.fixtures}}){{/if}}.

## Stages

Delegation on this runtime: {{runtime.delegate_note}}

### 1 · Triage
`triage` ({{runtime.stages.triage.model}}) with the issue number. Read the resulting labels
(`gh issue view N --json labels`).
- `needs-human` → relay the questions, stop. · `blocked` → say which deps are open, stop.
- `{{labels.build}}` → continue.

### 2 · Architect (`size:L`, or the issue delegates D-rows, or on request)
`architect` ({{runtime.stages.architect.model}}). Runs when triage stamped `size:L` **or**
the issue hands architecture choices to the implementer (it asks for `D-xxx` rows, reserves
decision numbers, lists options to "decide and document"). If it added `needs-human`, relay
and stop. Show {{human}} the proposed `D-xxx` rows before implementation unless told to run
unattended. If the design cuts the work into PRs, run them as stacked or sequential PRs —
each with its own review loop. When two architects run in parallel, assign the reserved
`D-`/`G-`/`M-` numbers yourself and tell each; renumber at the merge if they collided.

### 3 · Implement
Route by area to the project's implementer agents ({{#each implementers}}`{{item.name}}` →
{{item.areas_line}}{{#if last}}{{else}} · {{/if}}{{/each}}). Model by size:
`S` → {{runtime.stages.S.model}} · `M` → {{runtime.stages.M.model}} · `L` →
{{runtime.stages.L.model}}; the frontier model {{runtime.stages.frontier_on}}. Run in an
isolated worktree, in the background, at most {{limits.parallel_builders}} at once. Prompt:
issue number, branch `feat/issue-N`, the verify command from the guide, "push and open a
DRAFT PR; do not merge", and: the PR body must list the suites run, the mutations tried, the
doc rows added, the deviations from the design — the reviewers build on that.
- Escalated → relay, stop. · Draft PR exists → note its number, continue.
- **Remove the agent's worktree as soon as it reports**; prune the main checkout's build
  cache when free disk drops under ~{{limits.disk_floor_gb}} GB.

### 4 · Review
`quality-reviewer` ({{runtime.stages.review.model}}) always; `{{agents.security}}`
({{runtime.stages.review.model}}) **only on `risk:high`**. On `risk:medium` the quality brief
carries the security questions instead. Give the PR number and branch; isolated worktree.
Reviewers **reuse the implementer's evidence**: the suites the PR names plus at most two
mutations; the full board only when shared code moved in a way those suites cannot see.
Parse the final `VERDICT:` line. A reviewer that labels `needs-human` for a
{{runtime.verdict_words.red}} is wrong — remove the label; a {{runtime.verdict_words.red}}
goes to the fix loop.

### 5 · Fix loop (max {{limits.fix_rounds}} rounds — counted by you)
Any {{runtime.verdict_words.red}}: spawn the same implementer on the branch with the findings
verbatim (fix every {{runtime.verdict_words.red}}, {{runtime.verdict_words.nit}} where cheap,
reasoned reply otherwise) — {{runtime.stages.fix_red.model}} when a {{runtime.verdict_words.red}}
is among them, {{runtime.stages.fix_nit.model}} for a nit-only round that touches one file;
nits that are docs sentences or one-liners you fix yourself at the gate. After it pushes,
post the marker: `gh pr comment <PR> --body "<!-- claude-fix-round -->🔁 Fix round K/{{limits.fix_rounds}} (in-chat)."`.
Re-review by **the one reviewer that held the {{runtime.verdict_words.red}}** (new
{{runtime.verdict_words.red}} only); the other reviewer's nits are checked off the fixer's
report, and a second re-review runs only if the fix touched auth, transport or policy.
{{runtime.verdict_words.red}} remaining after round {{limits.fix_rounds}} → escalate.

### 6 · Gate & merge
- **Merging `main` into the branch is your job**, never a nit round's: resolve, then verify
  (`doc_anchors`-style checks, the touched suites), *then* commit — never chain the
  resolver and the commit in one shell line; a failed resolution must not push.
- Clean (any risk) → `gh pr ready <PR>` then `gh pr merge <PR> --squash --delete-branch`
  (squash message = PR title/body; "Closes #N" closes the issue). Pull `main`, run the
  **full verify board on `main`** — for every merge, docs-only included (unit tests read the
  docs). If red: revert the merge commit, escalate. {{human}} authorised merging in their
  name; on `risk:medium|high` also `gh pr edit <PR> --add-assignee {{human}}` — they review
  after the fact via the trail.
- If the harness (permission mode or classifier) refuses `gh pr merge`, do not work around
  it: hand {{human}} the exact command and continue with everything that does not depend on
  the merge.
- Unblock: for open issues labeled `blocked`, check their `Depends on:`; if all closed,
  `gh issue edit --remove-label blocked` and comment "Dependencies resolved". Do not add
  `{{labels.build}}`.

### 7 · Report
Post a `📋 Pipeline (in-chat)` comment on the issue: a table of stages × model × outcome
× tokens (the runtime's usage where it reports it), the total, what the reviews found, the
manual steps left for {{human}}, the follow-ups. Tick the split on its umbrella. That trail
is the cost ledger and what the next rumble reads.

## Budget & hygiene

- Free issues run in parallel (the modes above), at most {{limits.parallel_builders}}
  builders at once; worktrees removed on report; build cache pruned under
  ~{{limits.disk_floor_gb}} GB free.
- Reviewers reuse the PR's evidence; the full board runs once, on `main`, after the merge.
- Docs/one-liner nits: fixed by the orchestrator at the gate. {{runtime.stages.fix_nit.model}}
  nit rounds only for single-file code nits — a nit round that re-runs three platform boards
  costs more than the review did.
- Agents never merge and never touch another issue's branch.
- A stage that crashes or yields no verdict line counts as `needs-human`.
