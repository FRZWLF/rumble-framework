# rumble-framework

A development process for building software with coding agents, where the thinking, the
building and the memory are kept apart on purpose:

- **rumble** — a person and the model think, decide and write the decisions down as numbered
  rows in the docs. It ends with `/task-out`: issues on GitHub that are the whole contract.
- **pipeline** — a fresh session reads those issues and runs triage → [architect] →
  implement → review → fix loop → gate → trail, with one agent per stage in its own git
  worktree. It never reads code itself. Every merge leaves a trail: stage × model × outcome
  × tokens.
- **the docs** — decisions (D), open questions with a reopening trigger (G), measurements
  that read "pending" until measured (M), a research log. A reference without a row fails
  the build. The next rumble starts from the docs, not from the chat.

The process is written once, here, and **rendered per agent runtime into each project**:
agent files, skills, the managed block of the project's `CLAUDE.md` / `AGENTS.md`. The same
idea as design tokens: one source, generated outputs checked into the project, a `--check`
that fails on drift. Claude Code and OpenAI Codex are the two runtimes today.

Example project, built with it from an empty repository in one afternoon:
[`FRZWLF/requisit`](https://github.com/FRZWLF/requisit) — a B2B purchase-requisition
service. Its `docs/presentation/` is a talk that walks through every stage with the real
issue, PR, review finding and trail.

## Who this is for — read before adopting

It was built by **one developer, for greenfield projects, on GitHub**, and that is where it
is proven: two projects, three arcs, twenty PRs. Everything else is possible but costs
setup work of your own:

| situation | what to expect |
|---|---|
| solo developer, new repo on GitHub, Claude Code or Codex | the path this README describes; an afternoon to the first merged PR |
| an existing codebase with ADRs, CI, a backlog | works; read [docs/onboarding-existing-project.md](docs/onboarding-existing-project.md) first — the first rumble is a *reading* rumble, and your ADR numbers stay |
| several people | works with one agreement (decisions get a row) and one rule (one orchestrator per umbrella); see the same doc, §4. Not tested at scale |
| GitLab, Azure DevOps, Gitea | not supported. The process needs four objects — issues, labels, branches, PR comments — and every script and skill talks to them through `gh`. Another host is a binding to write, not a process change, but nobody has written it |
| CI running the pipeline | by design **off**. A person starts every pipeline run; CI only runs the verify board and the two checks |
| another agent runtime | a new file in `bindings/` plus a template; see *Extending* |

Nothing runs on its own. A person confirms the issue drafts at task-out, starts the pipeline,
and reviews `risk:high` PRs after the merge.

## Prerequisites

- Node ≥ 18 (the renderer and the scripts have no dependencies)
- `gh` authenticated against the repository
- Claude Code and/or Codex, with the models your binding names
- a GitHub repository with issues enabled

## Adopt in a new project

```
git clone https://github.com/FRZWLF/rumble-framework ../rumble-framework
cp ../rumble-framework/examples/framework.minimal.json framework.json   # edit: project, repo, owner, areas, verify.board, docs paths
mkdir -p docs && touch docs/02-decisions.md docs/14-gap-analysis.md docs/16-measurements.md docs/15-research-log.md docs/engineering-standards.project.md
printf '<!-- rumble-framework:begin -->\n<!-- rumble-framework:end -->\n' >> CLAUDE.md      # and/or AGENTS.md for Codex
node ../rumble-framework/render.mjs .                                    # writes agents, skills, the guide block, the standards
../rumble-framework/scripts/setup-labels.sh you/your-repo                 # size, risk, pipeline, needs-human, blocked, type labels
cp -r ../rumble-framework/templates/github/. .github/                    # issue templates (task, epic) and the PR template
git add -A && git commit -m "chore: rumble framework"
```

Then, in your agent runtime:

1. **Rumble.** Start a session with what you know — a brief, constraints, taste. Let it ask
   back, research, and write D/G/M rows. End it with `/task-out` (Claude) or `$task-out`
   (Codex): it drafts the task issues and an umbrella with the run order; you confirm.
2. **Pipeline.** Open a **new** session and run `/pipeline <umbrella>`. Watch the trail
   comments arrive on the issues. Merge is by the orchestrator under your standing
   authorisation, or by you if `"gate": { "merge": "human" }`.
3. **Next arc.** A new rumble session starts by reading the docs.

Add these two lines to your verify board or CI so a hand edit to a generated file, or a
`D-`reference without a row, fails the way an edited token file fails `tokens:check`:

```
node ../rumble-framework/render.mjs . --check
node ../rumble-framework/scripts/check-anchors.mjs .
```

## What is where

```
framework/
  process/pipeline.md          the orchestrator skill
  process/task-out.md          the rumble → issues skill; ends the rumble session
  process/guide-block.md       the managed section of CLAUDE.md / AGENTS.md
  agents/*.md                  triage · architect · implementer · quality-reviewer · security-reviewer (runtime-neutral briefs)
  standards/engineering-standards.core.md   the generic standards; the project appends its own sections
bindings/
  claude.json                  Claude Code: `/skill`, .claude/agents, .claude/skills, CLAUDE.md, model per tier
  codex.json                   OpenAI Codex: `$skill`, .codex/agents (toml), .agents/skills, AGENTS.md, model + reasoning effort per tier
templates/
  agent.*.tpl                  the two agent-file formats
  github/                      issue templates (task, epic) and the PR template to copy into .github/
examples/
  framework.minimal.json       one implementer, one runtime — start here
  framework.full.json          three implementers, both runtimes, a mandatory suite, human merge gate
scripts/
  setup-labels.sh, labels.txt  the labels the pipeline reads (add your area:* labels)
  check-anchors.mjs            every D-/G-/M- reference has a row, every relative link resolves
  replay-from-gh.mjs           exports one issue's timeline as JSON for site/replay.html
site/replay.html               animates one issue's real trail (?data=replays/<file>.json)
docs/onboarding-existing-project.md   ADRs, existing CI, several people
render.mjs                     node render.mjs <project> [--check]
```

## What is canonical, what is bound, what is the project's

| canonical (`framework/`) | bound per runtime (`bindings/`) | the project's (`framework.json`) |
|---|---|---|
| the stages and their order, the hard stops, waves of ≤ 3 builders, one orchestrator per arc in a fresh session | model per tier (cheap · standard · strong · frontier) and which tier each stage uses | repo, labels, areas, the `risk:high` list |
| the issue contract, the split rule (~3 k lines at task-out), pre-decided choices | skill prefix (`/` vs `$`), agent file format and location, guide file, sandbox/tools | verify board, mandatory suites by path, doc paths |
| the review lenses, evidence reuse, the verdict line, two fix rounds, one re-reviewer, nits at the gate | verdict words (🔴/🟡 vs RED/YELLOW) | implementers (name, areas, working rules), project standards sections, limits |
| documentation memory: D-/G-/M-rows, "pending", a reference without an anchor is red | delegation mechanics | who merges (`gate.merge`) |

The renderer never touches the parts of the guide file outside the
`<!-- rumble-framework:begin --> … <!-- rumble-framework:end -->` block.

## Extending

**Specialised implementers.** `implementers[]` in `framework.json` is a list; each entry
becomes one agent file. Name them after components, not people (`core-dev`, `web-dev`,
`app-dev`), give each its `areas` and its own `rules` (the working rules the brief appends).
Triage routes by area label, so an issue reaches the implementer whose areas include it. See
`examples/framework.full.json`.

**Mandatory suites by path.** `mandatory_suites[]`: when a diff touches `when_paths`, `run`
must be green and the PR body states `honest_line`; a red is a red finding of the review
(`rule` names the decision that says so).

**Project standards.** `standards_project_sections` points at a file the renderer appends to
the core standards. On conflicts of safety, the project's sections win.

**Limits.** `limits`: `parallel_builders` (default 3), `fix_rounds` (2), `split_lines`
(3000), `disk_floor_gb` (80).

**Who merges.** `"gate": { "merge": "human" }` stops the gate at `gh pr ready`; the default
`"orchestrator"` merges under the human's standing authorisation.

**Agent names.** `agent_names.security` renames the security reviewer if your runtime
already has an agent of that name.

**Another model policy.** Edit a binding: `models` maps tiers to model ids, `stages` maps
each stage to a tier (Codex also takes a reasoning `effort`). Changing a model is a binding
change, never a project change.

**Another runtime.** A new `bindings/<name>.json` with the fields the two existing ones have,
a template in `templates/`, and the runtime's name in the project's `runtimes`. The
framework files are runtime-neutral; everything runtime-specific lives in the binding.

**Changing the process itself** = editing `framework/`, re-rendering every project,
committing the generated diff there.

## Known limits

- GitHub only, through `gh`. No other host.
- One orchestrator per umbrella; two on the same umbrella is the one thing to avoid.
- Token figures in the trail are what the runtime reports per agent; input and output are
  not separated, and there is no money figure.
- Isolation is git worktrees, not containers. Agents can run anything the runtime allows.
- Tested on macOS with Claude Code; the Codex binding renders and has been used for
  agents, less for whole arcs.
- Proven on two projects and three arcs. Expect to change `framework/` as you learn; that
  is what it is for.

## Where this came from

Extracted in September 2026 from a solo project after two arcs and sixteen PRs through a
hand-written version of the same process, then rendered into a second project and used to
build [`FRZWLF/requisit`](https://github.com/FRZWLF/requisit) from scratch. The measurement
that started it: knowing, per stage, where the tokens went.

## License

MIT — see [LICENSE](LICENSE).
