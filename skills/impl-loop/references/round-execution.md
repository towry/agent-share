# Impl Loop — Round Execution Reference

Read this only when executing an actual round and expanding a task contract or design delta.

## Write task prompt

| Field | Content |
|---|---|
| design/plan | `DESIGN.md`, `PLAN.md`, and the stable workstream `id` from PLAN |
| goal | This round's verifiable progress toward the minimum business loop or validation of a load-bearing assumption, together with its user or decision value |
| survival contract | `survives_if`, `invalidated_by`, `reusable_parts` and dependents |
| depends-on evidence | Evidence that prerequisites and preceding joins have passed |
| exclusive ownership | Exclusive responsibility, state, and path/symbol surface |
| execution constraints | shared service, sandbox, migration environment, rate limit or budget; concurrent isolation evidence or serial limit |
| read-only surfaces | contract, generation sources and other workstream ownership that must not be changed |
| contract phase / semantic evidence | Current phase of the shared contracts involved in this task; a spine must provide the semantic-freeze locator, and a dependent must provide the joined-authority/release locator |
| permitted contract writes | Contract-spine tasks only: the designated contract writer and the precise surface that may be materialized according to frozen semantics; write `none` for all other tasks |
| released authorities | Contract authorities consumed by this task or required by `survives_if`, their joined baseline, and release evidence; when inherited by a descendant baseline, include an authority-delta impact check; do not dispatch a dependent write task before release |
| open decisions | Decisions on which the task depends that are not yet closed; do not dispatch a write task when this field is nonempty |
| semantic acceptance | When the semantic owner and integration owner differ: acceptance criterion, evidence producer, acquisition step, and locator; when they are the same, write `same-owner` |
| produces / join | Output contract, integration owner, join prerequisites and validation |
| done / validation | Completion conditions, local checks, full text reread range, return evidence and unproven boundaries |
| git mode | `shared-workspace` or `isolated-authority`; for the latter, provide the base ref/SHA, owned branch/worktree, permitted VCS operations, and integration owner |
| commit delivery | shared: changed files and atomic commit plan; isolated: actual commits, exact head, clean/dirty status, verification, and push status |
| stop conditions | Findings that invalidate a design premise or show that actual complexity exceeds what DESIGN explains; stop and report a design delta when any occurs |

Do not replace boundaries with "change things based on what you find." A contract-spine task may materialize only the permitted surface according to semantic-freeze evidence; a dependent task may consume only joined/released authority. If a dependent proves that the joined artifact does not conform to frozen semantics while the semantics, ownership, and other premises still hold, stop affected writes and return `CONTRACT-ARTIFACT-DEFECT`. The main agent revokes the release and asks the original contract writer to fix it; the dependent must not modify the contract itself. If implementation requires changing contract semantics, ownership, dependency direction, or lifecycle, the delegated agent immediately stops writing and returns evidence. Fixing an owner-local artifact defect according to frozen semantics does not trigger a design delta. The main agent stops the current write round, reports the design delta, and returns specifically to `buildable-plan`; it must not downgrade to single-writer or serial writing, or mark the revised PLAN as `ready` itself. Apply the same stop rule when a stable invariant, ownership, or same-round dependency must change.

## Delegated agent response

```md
result
- <done-when and results>

changed files
- <path/symbol>: <Change intention>

validation
- <check>: <Result and Boundary>

full reread
- <Reread changed files, directly coupled callers/tests, and residual checks performed>

git delivery
- mode: shared-workspace / isolated-authority
- shared plan: <sequence>. <logical intent or suggestion subject> | <exact paths/symbols> | <validation> | depends_on: <presequence or none>
- isolated authority: <base ref/SHA> -> <exact head>; commits: <SHA + subject + paths>; worktree: clean / dirty; push: not-run / <remote ref>
- mixed: None / <Files and reasons that cannot be independently grouped>

unresolved
- None / <Unconfirmed item or stop condition>
```

A `shared-workspace` response proposes a commit plan; it does not grant commit authority. After the join, the main agent may reorder, merge, or split the proposed units. An `isolated-authority` agent must deliver atomic commits already created within its authority. It may push only when both the collaboration contract and user authorization permit it.

## Design delta

| Workstream / join | Rejected hypothesis or contract | Classification | Preservable results | Affected closures | Validation must be rerun |
|---|---|---|---|---|---|
| `<id>` | `<delta>` | `unaffected` / `locally-adaptable` / `reusable-material` / `invalid` | code, tests, components, knowledge, or none | IDs that must pause or be revalidated after propagation along dependency, contract, and join edges | local / join / contract |

The closure propagates downstream from the point of change. Recheck `survives_if` for every downstream workstream. Stop propagation along a branch only when `survives_if` still holds and the goal, owner, consumed and produced contracts, and verification premises are all unchanged. Otherwise include that workstream in the closure and continue checking its downstream dependents.

For `reusable-material`, retain only the parts that still satisfy the revised goal and ownership. Do not add a shim, fallback, dual path, or incorrect abstraction merely to avoid deletion.

## Report each round

`parallelizable` only means that the contract allows concurrency; `concurrent` is used only when the master agent has dispatched multiple independent tasks before waiting for the result of any task. The report must distinguish between qualifications and actual execution form:

```md
Finished
- <This round’s progress on the business closed loop, or the results and evidence for load-bearing assumptions>
- <If delta occurs: each result classification>

Execution form
- parallelizable: <parallel task group, such as [A, B]; if not, write none>
- dispatched: <Write concurrent / serial / read-only by task, such as concurrent: A, B; serial: C>
- serial reason: <Fill in when a parallelizable task group was not dispatched concurrently; indicate host restrictions or user explicit restrictions>

Current contract phases/joins/debt
- <phase and evidence of each load-bearing contract, unclosed join, pending operation evidence, suspended dependents>

Next frontier
- <Next round 1–3 tasks: intention, do not do, completion criteria>

blocker
- None / <User decision or external evidence required>
```

Do not report `parallelizable` eligibility, planned intent, or file independence as `concurrent` execution that actually occurred.
