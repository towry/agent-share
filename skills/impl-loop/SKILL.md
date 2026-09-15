---
name: impl-loop
description: |
  Use to implement complex features or refactors incrementally according to a buildable-plan design. First use a minimum business loop to validate business details and technical challenges, then continue iterating until the PLAN is complete. When complexity diverges from the design, locally replan with evidence.

  Do not use for a small single-file fix, a one-time implementation that needs no tracking across rounds, or writing design documents only.
---

# Impl Loop

Turn `DESIGN.md` and `PLAN.md` into a verifiable delivery through progressively larger business loops. First use the smallest real integration to confirm business details and load-bearing technical assumptions. Then iterate within the validated design boundaries until every observable success in the PLAN has been achieved. After completing and integrating each round, absorb the evidence and recalculate the ready frontier. If evidence disproves a design premise or implementation complexity significantly exceeds expectations, stop piling on patches and replan only the affected closure.

## Main principles

1. **Goals take priority over code retention**: Keep user goals, stable invariants and correct contract first; only retain results that still meet the current design.
2. **The main agent is the integrator**: It maintains the frontier, task contracts, concurrency admission, cross-workstream joins, design deltas, and final decisions. By default, assign independent write surfaces to the least expensive capable agent available on the host. The main agent performs them only when no subagent is available.
3. **Iterate through closed loops**: In each round, select 1–3 tasks from the frontier whose prerequisites are satisfied. Together they must advance the next minimum business loop or test a load-bearing assumption. After that loop passes, continue to the next milestone. Do not build out the full backlog in advance or present the first loop as completion of the entire plan.
4. **Distinguish eligibility from execution**: `parallelizable` means only that the contracts and write surfaces permit concurrency. Use `concurrent` only when multiple independent tasks were dispatched before waiting for any result. If independence cannot be proven, run them serially or gather read-only evidence.
5. **Propagate changes locally**: Classify each new fact by its impact and what remains reusable, then update only the affected closure computed along dependency, contract, and join edges.
6. **Close every round**: A task is complete only after local validation, the integration verifier's first-pass review of the joined diff, join validation, and any applicable review. The main agent retains acceptance and release authority.
7. **Complexity is also evidence**: If the actual implementation requires DESIGN unexplained new responsibilities, states, life cycles, or bypasses, it means that the premise of the solution may be invalid; go back to the design judgment first, and do not bury complexity in the code through repeated attempts.

## Start

1. Read `.agents/buildable-plan/<plan-name>/DESIGN.md`, `PLAN.md`, and the repository rules. Begin writing code only when the PLAN is `ready` and its goal still matches the user's latest intent.
2. Build the initial frontier from the progressive milestones, the current minimum business loop, the business and technical assumptions to test first, stable invariants, workstream survival contracts, load-bearing prerequisites, contract phases, owners, joins, final verification coverage for the normal success path and Red Cases, and any observability implementation and follow-up ownership required for post-release checks. Do not expand this into a long-term task queue.
3. Return to `buildable-plan` if the PLAN does not specify a verifiable minimum business loop, the subsequent direction of evolution, final verification coverage, signals that complexity has diverged from the design, or an applicable post-release verification contract.

### Shared contract phase

For a shared contract that must be materialized, use only these frontier states:

| Status | Observable Evidence | Releaseable Task |
|---|---|---|
| `semantic-frozen / materialization-pending` | DESIGN has frozen semantics, owner, dependency direction and lifecycle, and specifies contract writer | only the contract-spine task that holds the write authority |
| `materialized / join-pending` | The contract artifact has passed spine local validation | The integration owner/main agent may join after the semantic owner's acceptance evidence is complete; dependents remain blocked |
| `joined / dependents-released` | The authority has been joined and release evidence matches the current baseline | Dependent implementation tasks whose other prerequisites are satisfied |
| `delta-pending / releases-revoked` | Semantics, ownership, dependency direction, or lifecycle must change | Gather read-only evidence and revise through `buildable-plan`; affected write tasks remain suspended |

Materializing already-frozen semantics does not count as changing a shared contract. If spine local validation reveals only an owner-local artifact defect, fix it within the current workstream. If an artifact in `materialized / join-pending` or `joined / dependents-released` does not match the frozen semantics, but the semantics, ownership, dependency direction, and lifecycle remain valid, return to `semantic-frozen / materialization-pending`. Invalidate that artifact's local-validation, acceptance, join, and release evidence; then have the same contract writer repair and revalidate it. If dependents have already been released, suspend the affected dependents and classify their in-flight or completed work through the normal provisional and closure process. Work outside the closure may continue after the frontier is rechecked. If the defect disproves the semantics, ownership, dependency direction, or lifecycle, move to `delta-pending`. A design delta of this kind revokes affected release evidence from any state. Dependents may resume only after the revised PLAN is `ready`, the contract writer materializes it, and the integration owner joins it again. The semantic owner is responsible for contract meaning and acceptance evidence. The main agent acts as the PLAN's integration owner and is responsible for frontier orchestration, contract joins, Git authority, and verification. When these owners differ, semantic acceptance evidence is a prerequisite for joining, and the main agent must not substitute its own judgment.

Join/release evidence may carry forward to a descendant baseline only after recording an authority-delta check that proves the contract, prerequisites, validation premises, and `survives_if` are unchanged. Otherwise revoke the evidence and repeat materialization and joining.

## Each round loop

### 1. Calculate ready frontier

Confirm that the user goal, current milestone, relevant design invariants, load-bearing locators and contracts, and each workstream's `survives_if` still hold. Select 1–3 workstreams whose prerequisites and joins have passed, making the smallest verifiable advance toward the next minimum business loop. If a load-bearing unknown blocks that path, first obtain evidence that could change the implementation direction. Every task needs a done-when condition, an exclusive write surface, validation, and a stop condition. Include a purely structural task only when it is a real prerequisite for the loop; do not report scaffolding itself as a business loop.

### 2. Determine parallel qualification and execution status

First distinguish `parallelizable` from `concurrent`. The former is eligibility in the dependency graph. The latter means that the main agent used the host's delegation capability to dispatch multiple independent tasks before waiting for any result. Candidate write tasks qualify as `parallelizable` only if all of the following hold:

1. Each task is within the current DESIGN/PLAN boundary and does not rely on open decisions;
2. There is evidence for prerequisites and prefix joins;
3. contract-spine task has semantic-freeze evidence and designated write authority; contract authority consumed by dependent task already has join/release evidence corresponding to the current baseline;
4. semantic ownership and write surfaces do not overlap;
5. shared execution resources, sandbox and budget can be used concurrently or have been isolated;
6. No task consumes products that have not yet been integrated by another task in the same round;
7. Each diff can be independently verified and reviewed;
8. integration owner and join validation are clear.

If any condition is unclear, do not write concurrently; execute serially or gather read-only evidence instead. If a shared contract's semantics are not frozen, or a candidate task must change its semantics, ownership, dependency direction, or lifecycle, stop the write round and report a design delta. Materializing an artifact according to frozen semantics does not trigger this branch. Do not bypass design revalidation by using a single writer or serial execution. Different files do not imply independent responsibilities: generators, schemas, migrations, registries, and shared semantics also constitute shared write surfaces.

When two or more selected write tasks are independent and the host supports concurrent delegation, dispatch them concurrently. Run them serially only when the host lacks that capability or the user explicitly requests serial execution, and report the reason. Never describe serial execution as concurrent. In either mode, retain an integration owner, join validation, and independent validation for every task.

### 3. Dispatch bounded tasks

Before dispatch, the main agent records the current baseline and existing dirty paths using read-only VCS evidence. Do not attribute pre-existing or unrelated changes to this round. In each prompt, pass the original user goal, DESIGN/PLAN/workstream, `depends_on` evidence, exclusive write ownership, read-only surfaces, consumed and produced contracts, locked invariants, open decisions, done-when criteria, local and join validation, survival and stop conditions, prohibited actions, and response format. In concurrent mode, use the host's built-in delegation capability to dispatch independent tasks and wait for all responses before integration. In serial mode, still assign tasks one at a time to the least expensive capable agent under the same contract. The main agent performs them only when no subagent is available. Tool names and invocation APIs are host-specific and are not part of this skill's cross-host contract; scripts do not schedule agents.

A write contract is invalid while a task-relevant decision remains open. If a delegated agent would cross its ownership boundary, must change a stable invariant, or depends on an unfinished result from the same round, it must stop and return evidence rather than expanding its scope. See `references/round-execution.md` for the complete fields.

When any delegated task reports a design delta, the main agent immediately stops further dispatches for that round. If the host exposes responses before wait-all and supports cancellation, try to cancel affected in-flight tasks. If a batch/wait-all host cannot expose or cancel them early, wait until they stop and then use the same provisional classification process. Do not join provisional results, advance shared authority with them, or mark them complete. After obtaining the round's actual diff or commits, the main agent classifies them against the affected closure and returns specifically to `buildable-plan`. Results outside the closure must still be reconfirmed against the new frontier before joining.

### 4. Verification, read-through and integration

Each task runs local validation first. Before responding, the delegated agent must reread every changed file and directly coupled caller and test, check for remnants of old contracts, names, commands, responsibilities, or state semantics, and report any boundary it could not confirm. The main agent checks a bounded critical diff for ownership and authority, produced contracts, and done-when evidence, then integrates according to the join contract. The least expensive capable integration verifier may run join validation; the main agent remains responsible for acceptance.

Git ownership must be clearly in one of the following modes before dispatching, and must not be switched silently during the task; write task must not be dispatched when the mode is not clear:

- **shared-workspace**: dispatch agent does not execute stage, commit, rebase, merge or push; returns changed files and the suggested atomic commit plan. Each proposed unit must state its intent, exact paths/symbols, verification evidence, and sequence dependencies; mixed documents that cannot be grouped independently must be explicitly marked. The main agent is the only commit owner.
- **isolated-authority**: The delegated agent exclusively owns an explicit Orb worker branch, another isolated branch, or a Git worktree, and creates atomic commits within that authority. The task contract must specify the base ref/SHA, owned branch/worktree, permitted VCS operations, integration owner, and delivery form. The worker returns its commits, exact head, clean/dirty status, and corresponding validation. The loaded collaboration skill, repository rules, and user authorization still determine whether to push and how to manage the remote branch lifecycle.

After the join, the least expensive capable integration verifier must reread all candidate or integrated changes and their directly coupled callers and tests, perform a first-pass review of the joined diff and the relevant mechanical checks, and return contract/join evidence and locators. The main agent does not repeat that exhaustive work. It checks only the load-bearing contract/join evidence, bounded critical diff, ownership and authority, status, and staged or candidate diff. A shared-workspace commit plan and isolated-authority worker commits are inputs only; they do not replace the main agent's integration, Git authority, or release decision. Include only the relevant logical units, never pre-existing or unrelated baseline changes.

Record results that cannot be confirmed statically as pending verification; if one belongs to a done-when, the task is not complete. Each workstream passing alone does not substitute for the joined system's result.

When the final verification stage specified by PLAN is reached, the check consisting of the normal successful path and the included Red Cases is executed; only when the check fails will the diagnosis be triggered, and the established design will not be changed because Red Case is included. When verification after going online is required, the minimum observation implementation in PLAN must be completed and verified before going online; after the deployment time point and owner have been determined, use the host's schedule, reminder, monitor or project tracker according to authorization to establish a durable follow-up that persistently records the owner, checkpoint trigger, and result locator. When there is no external write authorization, ask once at release handoff and do not falsely report that it has been created.

### 5. Absorb new facts

At the end of each round or when new constraints are received, the affected results are classified:

| Classification | Criteria | Action |
|---|---|---|
| `unaffected` | goal, owner, contract and survival conditions still hold | Keep results and verification |
| `locally-adaptable` | shared contract unchanged, only changes implemented within owner | Keep interfaces, callers and valid tests, adjusted within workstream |
| `reusable-material` | workstream contract changes, but some results still conform to the new design | Extract valid parts, redo boundary and affected verification |
| `invalid` | Conflicts with new target, stable invariant, ownership or contract | Remove bad implementation, redo this workstream |

Starting at the changed workstream, contract, or join, compute the affected closure downstream through `depends_on`, `consumes/produces`, and join edges. Recheck `survives_if` for every downstream workstream. Stop propagation along a branch only when `survives_if` still holds and the goal, owner, consumed and produced contracts, and validation premises are all unchanged. Otherwise include it and continue downstream. List what will continue, pause, be revalidated, or be discarded. Resolve reversible owner-local details within the round. If ownership, a shared contract, or dependency topology changes, pause the affected closure and return specifically to `buildable-plan` to revise DESIGN, PLAN, joins, and dependency edges. Affected write tasks may resume only after `buildable-plan` produces `ready` again; `impl-loop` cannot issue that state itself. Confirm changes to the user goal or core concept with the user. Workstreams outside the closure may continue while their `survives_if` conditions hold.

Record design delta, result classification and verification impact and then recalculate frontier; first delete the falsified hypothesis and do not continue to use the old task queue.

Each round must compare actual complexity with what DESIGN explains. If completing the current loop repeatedly requires unplanned responsibilities, state, lifecycles, compatibility paths, or special cases, or implementation attempts produce no new evidence that the solution is converging, stop the affected workstream and return the discrepancy to `buildable-plan` as a design delta. If the complexity remains within the established owner and contract and the design premise still holds, resolve it within the current workstream; ordinary implementation difficulty alone does not justify redesign.

## Completion criteria

Passing the minimum business closed loop only proves that the current path and related assumptions can be continued, but does not mean that PLAN is completed. Continue to iterate according to milestones until all observable successes, contracts, joins and final verification coverage are completed; if the user only requires phased delivery, clarify the completed scope and remaining PLAN, and do not write the phase status as overall completed.

When PLAN requires verification after going online, release-ready must also have verified observation capabilities, clear inspection time points, owner, failure handling, and durable follow-up that has established and recorded locator; when it stops at the release handoff to ask because it lacks external write authorization, it must not be called release-ready. Phased delivery will not be blocked if the check time point has not yet arrived, but it must not be claimed that the results have been verified after going online; when the current task continues to be responsible for the life cycle, the verification is not reported to be closed until the check is actually executed, evidence is recorded and processed.

## Stop conditions

Stop the affected workstream in any of these situations, and do not mark partial work complete:

- Core design assumptions are falsified;
- Need to change product decision, stable invariant, shared contract, ownership or dependency topology;
- PLAN is not `ready`, the target has drifted, the mission is out of bounds or relies on an open decision;
- A release-critical prerequisite cannot be confirmed;
- implementation keeps using patches to cover up wrong responsibility boundaries or root causes;
- Review points to model, interface, or delineation of responsibilities errors.

## Report each round

Only write: `completed` (including result classification and evidence), `execution mode` (parallelizable groups, the actual dispatched mode of each task, and the reason when parallelizable tasks were run serially), `current contract phases/joins/debt`, `next frontier`, and `blocker`. `parallelizable` may not replace `dispatched`; eligibility, planned intent, or file independence may not be reported as concurrent execution that actually occurred. Do not report a fully decomposed backlog. See `references/round-execution.md` for the complete format.
