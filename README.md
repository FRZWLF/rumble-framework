# rumble-framework

One canonical development process — **rumble → task-out → pipeline** — rendered per AI runtime
into each project that uses it. The same idea as design tokens: one source, generated outputs
checked into the project, a `--check` that fails on drift.

```
framework/
  process/pipeline.md          the orchestrator skill (triage → [architect] → implement → review → fix loop → gate → trail)
  process/task-out.md          the rumble → issue skill; ends the rumble session
  process/guide-block.md       the managed section of the project's agent guide (CLAUDE.md / AGENTS.md)
  agents/*.md                  triage · architect · implementer · quality-reviewer · security-reviewer (runtime-neutral briefs)
  standards/engineering-standards.core.md   the generic standards; the project appends its own sections
bindings/
  claude.json                  Claude Code: `/skill`, .claude/agents (md frontmatter), .claude/skills, CLAUDE.md, haiku/sonnet/opus/fable
  codex.json                   OpenAI Codex: `$skill`, .codex/agents (toml), .agents/skills, AGENTS.md, luna/terra/sol/astra + reasoning effort
templates/                     the two agent-file formats
render.mjs                     node render.mjs <project> [--check]   (Node ≥ 18, no dependencies)
examples/framework.lumos.json  a full project config
site/rumble-to-main.html       the framework as a slide deck (open locally; keyboard/click/swipe)
```

## What is canonical, what is bound, what is the project's

| canonical (framework/) | bound per runtime (bindings/) | the project's (framework.json) |
|---|---|---|
| the stages and their order, the hard stops, waves of ≤ 3 builders, one orchestrator per arc in a fresh session | model names per tier (cheap · standard · strong · frontier) and which tier each stage uses | repo, labels (`<x>:build`), areas, the risk:high list |
| the issue contract, the split rule (~3 k lines at task-out), pre-decided choices | skill prefix (`/` vs `$`), agent file format and location, guide file, sandbox/tools | verify board, mandatory suites by path (e.g. Lumos' D-226), doc paths |
| the review lenses, evidence reuse, verdict line, two fix rounds, one re-reviewer, nits at the gate | verdict words (🔴/🟡 vs RED/YELLOW) | implementers (name, areas, working rules), project standards sections, fixtures notes |
| documentation memory: D-/G-/M-rows, "steht aus", a reference without an anchor is red | delegation mechanics | limits overrides |

The renderer never touches the parts of the guide file outside the
`<!-- rumble-framework:begin --> … <!-- rumble-framework:end -->` block.

## Adopt in a project

1. `framework.json` at the repo root (copy `examples/framework.lumos.json`, change what differs).
2. A `docs/engineering-standards.project.md` (or the path you name) with the project's own
   safety sections — the core is prepended.
3. The two markers in `CLAUDE.md` / `AGENTS.md` where the framework section belongs.
4. `node ../rumble-framework/render.mjs .` — commit the generated files.
5. Add `node ../rumble-framework/render.mjs . --check` to the project's verify board (or CI),
   so a hand edit to a generated file fails the way an edited token file fails `tokens:check`.

Changing the process = editing `framework/` here, re-rendering every project, committing the
generated diff there. Changing a model = editing a binding. Changing a label or a suite =
editing the project's `framework.json`.

## Where this came from

Extracted from `FRZWLF/Lumos` (D-186, D-213, D-224–D-226, M-080) on 2026-09-17 after two arcs
and sixteen PRs through the pipeline, and first rendered into `FRZWLF/tesseral`, which had
carried a hand-made copy.
