# Onboarding an existing project — and working in a team

The framework assumes nothing about your code. It assumes three places: a decisions doc, a
gaps doc, a measurements doc — and GitHub issues as the contract between thinking and
building. An existing project already has most of that under other names.

## 1 · Map what exists

| you have | the framework calls it | what to do |
|---|---|---|
| `docs/adr/0001-….md` (one file per ADR) | `docs.decisions` | point `docs.decisions` at `docs/adr/README.md`: an index table with one `D-nnn` row per ADR (id, date, title, link, status). New decisions become new ADR files *and* a row; the rumble writes both. Existing ADR numbers keep their numbers (`D-007` ↔ `0007-…`). |
| an open-questions section, a "known unknowns" page, TODO issues | `docs.gaps` | one table; each question with the trigger that reopens it. Move the questions in; leave the source pages linking to the row. |
| benchmarks in a README, a Grafana board, a wiki page of numbers | `docs.measurements` | one page; a row per number with setup and date. Unmeasured claims read "pending". |
| CONTRIBUTING.md, a style guide, a security policy | `docs.standards` + `standards_project_sections` | keep them; the framework's core standards are prepended, your sections follow. Anything that contradicts: your sections win on safety — say so in the section. |
| an architecture doc, C4 diagrams, a threat model | `docs.threat_model` and the rumble's reading list | unchanged; the first rumble reads them. |
| a CI pipeline | the verify board | `verify.board` is the command a reviewer runs locally. CI stays; the pipeline's own automation stays off. Add `render.mjs --check` and `scripts/check-anchors.mjs` to CI. |
| labels, issue templates | `labels.build/triage`, areas | reuse existing area labels; add the framework labels (`size:*`, `risk:*`, `<x>:build`, `<x>:triage`, `needs-human`, `blocked`). |

## 2 · The first rumble is a reading rumble

Do not start with a feature. Start a rumble session with: "read the ADRs, the architecture
doc, the open issues; write the gaps table; tell me what the docs claim that the code does
not do." That session ends with G-rows and, usually, two or three D-rows that make implicit
decisions explicit ("we never decided X, the code assumes Y"). Then `/task-out` on the
smallest real change — the pipeline's first run should be boring.

## 3 · Steps

1. `framework.json` at the root — `examples/framework.lumos.json` is a full one; the
   `requisit` example repo is the minimal one. Name the implementers after your components,
   not your people.
2. The two markers in `CLAUDE.md` / `AGENTS.md` (create the file if none; keep everything
   else in it as it is).
3. `node ../rumble-framework/render.mjs .` · commit the generated files.
4. Labels (`infra/github/labels.txt` + `setup.sh` in the requisit example).
5. The reading rumble (§2).

## 4 · Several people

- **Everyone rumbles, nobody rumbles alone into main.** A rumble is one person and the
  model; its output is rows and issues, which are reviewed like any PR (the docs change
  comes as a PR). Two rumbles at once are fine: issues reserve D-/G-/M- numbers, and a
  collision is renumbered at the gate.
- **One orchestrator per arc.** The pipeline session belongs to one person for one umbrella;
  the state is on GitHub, so a second person can take over the next wave in a new session.
  Two orchestrators on the same umbrella is the one thing to avoid — the umbrella comment
  says who runs it.
- **`human` is the inbox, not the boss.** `needs-human` escalations and `risk:medium|high`
  after-the-fact reviews go to `human`. With a team, set `human` to the person on duty for
  the arc, or use CODEOWNERS per area and let the gate assign the PR to the area's owner.
- **The issue is the contract, so the author does not matter.** The person who rumbled and
  the person who runs the pipeline can differ; nothing in the pipeline reads the chat.
- **Reviews stay human-readable.** The verdict line, the evidence block in the PR and the
  📋 trail are written for a person who was not there. Reading them *is* the code review;
  a person adds a review comment where they disagree, and the fix loop handles it like a
  reviewer finding.
- **Merging.** Either the orchestrator merges under a standing authorisation (one owner) or
  the gate stops at `gh pr ready` and a person merges: `"gate": { "merge": "human" }` in
  `framework.json` (default `"orchestrator"`). The rendered pipeline skill and guide block
  say which one applies.

## 5 · What not to migrate

Old chat logs, old planning docs that nobody maintained, the backlog of 300 issues. The
gaps table starts with what someone can still explain; the rest stays where it is until a
rumble needs it.
