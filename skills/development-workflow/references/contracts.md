# Development workflow contracts

These are **semantic contracts** shared by the development-workflow skill. They do not mandate a JSON file, TypeScript runtime, GitHub, or any specific agent. If machine-readable plans are actually adopted, define one authoritative schema and test compatibility rather than duplicating field definitions across Markdown, JS and examples.

## Sources of truth

| Fact | Authoritative owner |
| --- | --- |
| Goal, scope, constraints, acceptance criteria | Target project's current request/spec/Issue |
| Nodes, dependencies and execution status | One target-project plan or existing task manager |
| Code, tests and changes | Git working tree, commits, PRs and relevant test system |
| Test outcome and subject revision | The actual test/CI/review evidence |
| Consequential decisions | Target project's decision record or existing ADR |
| Gate policy and method | This common workflow skill and its contracts |
| Current-context summary | Derived from the above; never a competing owner |

A project may combine several facts into one file. A separate file for every concept is unnecessary. Prefer references to duplication.

## Concepts

**WorkSpecification:** goal; in/out scope; constraints; acceptance criteria; links to relevant project code/contracts. Only create a persistent artifact if the project needs it.

**Node:** independently accepted deliverable or verification boundary; stable ID; title; genuine dependencies; local finish conditions. **Step:** activities within that node, not a separate dependency boundary. A small job may have no explicit nodes.

**WorkPlan:** authoritative list of nodes and dependency edges when structured planning adds value. A node is eligible only when its actual prerequisites are accepted; 'dropped' does not inherently mean 'satisfied'. The task manager, not a duplicate document, owns status.

**Verification:** a criterion; result passed/failed/unknown; evidence reference and relevant revision when available. Successful parsing or valid DAG structure is not proof that the user's requirements or the implementation are correct.

**Decision:** problem; considered options; choice; rationale; affected references; earlier decision superseded, if any. Preserve consequential history, but leave routine code choices in normal code/PR context.

**WorkContext:** a derived view of present goals, valid decisions, state, evidence gaps and blockers; no independent state authority.

**TaskBrief:** objective; base revision; relevant contracts and input references; allowed/forbidden modifications; dependencies; acceptance and verification criteria. Do not send full unrelated conversation history.

**TaskHandoff:** output or blocked status; changed artifacts/commit or PR; passed/failed/unknown checks; important findings; proposed contract changes; impact on downstream work. A worker's report is not acceptance: the coordinator checks artifacts before unblocking dependents.

## Gate result semantics

- **pass:** the defined check ran and its precise condition was met.
- **fail:** a defined condition was violated; fix and recheck before a blocking transition.
- **unknown:** the check did not run or evidence could not be established; it is never implicitly pass.
- **not_applicable:** a reasoned determination that this check does not apply to the present work.

Gate execution policy is separate from the result. A structurally invalid DAG blocks reliance on that DAG. Advisory concerns (e.g. too many nodes) invite judgement, not automatic global failure. Skipping or overriding a blocking check must follow existing authorization and disclose the exception.

| Gate | When | Semantic assessment | Deterministic boundary |
| --- | --- | --- | --- |
| G1 Contract | Before impactful implementation | Intent, exclusions, project contract and approval | Optional required-field checks |
| G2 Planning | On complex decomposition/replanning | Quality of split, independence, delegation cost | IDs, references, self/cyclic dependencies |
| G3 Verification | Before claiming verified completion | Sufficiency of test evidence and residual risk | Parse results; detect missing references/revision mismatch |
| G4 Change | When a consequential choice/scope changes | Need for approval, meaning and downstream impact | Reference integrity and graph reachability |
| G5 Handoff | On context/agent transition | Whether receiving worker can safely continue | Optional brief fields and referenced artifacts |
| G6 Methodology | When workflow or its integration changes | Representative behavior, overhead, compatibility | Package, installer, schema, fixture and CI tests |

## Changes and concurrent agents

1. One coordinator or existing task system owns acceptance and shared status. Parallel workers get disjoint file scopes or isolated Git worktrees.
2. A worker immediately reports a blocker, contract conflict or proposed consequential change; the coordinator verifies and distributes only the approved update to affected nodes.
3. Ordinary progress is observable to the coordinator, not copied into every worker's context. A receiving node consumes the **accepted** output of prerequisites and checks its base revision.
4. Changing code, dependencies or criteria can make earlier evidence stale. Compute explicitly known affected nodes first; use code search/tests for effects not represented in the DAG. Unknown impact remains unknown.
5. A dropped prerequisite requires reconsidering the dependent node, not silently treating it as done.

## Minimal persistence and automation

- Lightweight changes: code + relevant tests + normal PR/report. No extra plan/decision files.
- Structured multi-node work: reuse Issue/task infrastructure; JSON only if relationships cannot be represented reliably otherwise.
- A mechanical JS validator is **conditional**, and should stay read-only with pure graph/contract logic and a thin CLI shell. No Rust, global event bus or new orchestrator in the initial implementation.
- Skill discovery, MCP searchability and actual execution are separate properties. Test each available environment, and report unavailable environments accurately.
- Personal knowledge MCP retrieval and updates remain opt-in under the separate manage-dev-knowledge policy.
