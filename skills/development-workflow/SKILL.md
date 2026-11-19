---
name: development-workflow
description: "Use for software development tasks requiring requirements clarification, meaningful task decomposition, evidence-based verification, consequential decision changes, or session handoff. Apply adaptively; do not add process to trivial fixes or automatically retrieve personal knowledge."
---

# Development workflow

Preserve the user's intent (SDD) while planning, executing and verifying work with meaningful dependencies (Hide). Use the project's existing files, Issue/PR, tests and agent tools. This skill is guidance, not an orchestration engine.

Read [the contracts](references/contracts.md) when defining a structured plan, changing important decisions, interpreting a gate, or handing work to another agent. For a small clear change, use the lightweight path below without loading extra references.

## Authority and boundaries

- Follow current user instructions and the target project's rules, architecture, and acceptance criteria. This skill does not override project-specific contracts.
- Inspect relevant source and tests before suggesting changes. Distinguish observed facts, inferences, proposals and unverified assumptions.
- Do not search or modify my-context personal knowledge unless explicitly requested. If the user requests that, follow the separate manage-dev-knowledge skill and its approval rules.
- Respect the environment's existing authorization for edits, commits, pushes, merges, releases and destructive actions. Invoking this skill grants no additional permission.
- Do not create a new scheduler, global task database, agent messaging system or mandatory project file layout.

## Choose the smallest useful path

**Lightweight (default):** For a clear, bounded fix: inspect the contract and code, make the authorized change, run relevant checks, report evidence and gaps. No plan, decision record, DAG or new file is required.

**Structured (conditional):** Use when ambiguity has material consequences, work has separately deliverable outcomes or real dependencies, a consequential decision changes, or work spans agents/sessions. Prefer an existing Issue, PR, task manager or project document. Create a structured plan only if existing records cannot represent the needed relationships.

Work may move from lightweight to structured or back as complexity changes. Avoid numeric thresholds and ceremonial steps.

## 1. Understand — G1 Contract

1. Establish the goal, scope and exclusions, relevant existing code/contracts, constraints, acceptance criteria and actual permissions.
2. Check for conflict with earlier decisions or current project policy. Ask only about uncertainties that change scope, user-visible behavior, safety, architecture or substantial rework.
3. When a reasonable conventional choice is reversible and low risk, make it and briefly state the assumption. Do not treat silence as approval for scope or contract changes.
4. Do not start an implementation that would violate a known constraint. If the user's intention remains materially unresolved, explain the decision needed.

Keep the specification where the project already manages it. The result is a clear agreement, not necessarily a new spec file.

## 2. Plan — G2 Planning

For substantial work, identify **Nodes** (independent deliverables or verification boundaries) and **Steps** (work within one node). State each node's output, completion criterion and real dependencies.

- A dependency means a node genuinely requires another node's accepted result. Do not use chronological preference as a false dependency.
- Research queries, retries and routine coding substeps are not automatically separate nodes.
- Compare delegation/parallelization benefit with context handoff, shared-file contention and integration cost. Prefer a single owner for a tightly coupled artifact.
- If a machine-readable DAG exists, validate unique IDs, dependency references, self-edges and cycles before relying on readiness. If validation tooling is absent, do not report a passed machine check.
- A cancelled/dropped prerequisite does not automatically satisfy a dependent node. Re-evaluate the dependent node's assumptions.
- Keep one authoritative plan/status owner. Other agents report outcomes and evidence; they do not independently overwrite the shared state.

Do not introduce plan.json, JSON Schema or a validator merely because this skill mentions graphs.

## 3. Execute and verify — G3 Verification

Use the project's existing tools and implementation conventions. Keep work within approved scope and preserve unrelated changes.

- Define checks against acceptance criteria, not only whether files changed.
- Distinguish implementation output from verified completion. Report test commands, results, subject revision when available, and what was not checked.
- Do not claim a test or review ran unless it did. Unavailable tools, missing evidence and unrun checks remain **unknown**, not passed.
- When code/contracts change after verification, identify affected evidence. Reuse unaffected checks only when their continued applicability is justified.
- Independent review is most valuable for high-impact, cross-contract, security-sensitive, or multi-agent changes; do not impose it on every tiny edit.

## 4. Decide and replan — G4 Change

Record **consequential** decisions using the project's existing decision record: problem, material options, chosen direction, reason, affected artifacts and any superseded decision. Do not record every routine implementation detail.

On goal, scope or important contract changes, seek authorization required by the project/user before proceeding. Re-evaluate directly and indirectly dependent nodes, affected tests and earlier evidence. Preserve previous important decisions rather than silently rewriting history.

## 5. Continue and hand off — G5 Handoff

For a session or agent transition, reconstruct the current goal, exclusions, valid decisions, accepted outputs, unfinished work, verification gaps and blockers from the authoritative sources.

Provide the receiving agent with only relevant contract references, base revision, allowed change scope, dependencies and acceptance criteria. Hand back changed artifacts, test evidence, unresolved findings and downstream effects. A handoff summary is a navigation aid, not a substitute for source verification.

Share **blocking findings and approved contract changes immediately** with affected workers; share ordinary progress with the coordinator. Do not broadcast unfinished reasoning or every other worker's transcript.

## 6. Maintain the methodology — G6 Methodology

When modifying this skill, its contracts or integration, run deterministic repository tests and evaluate representative small, ambiguous, dependent, changed-decision and cross-session scenarios. Keep static checks distinct from model-behavior evaluation.

A mechanical pass covers only the stated invariant. If evaluation cannot run, report it as unverified. Track additional files, time, tokens and rework when measurable; remove gates that do not justify their cost.

## Reporting

Prefer concise, spoken-language output: what changed and why; verified evidence; unresolved/unknown items; next actionable decision. Never label an unverified result as completed. For uncomplicated work, keep the report short.
