---
name: buildable-plan
description: |
  Use after requirements and an initial design have been established to research solutions externally and across domains, producing an iterative and extensible design that validates key assumptions through a minimum business loop. Triggers: buildable-plan, design refinement, solution selection, incremental implementation plan.

  Do not use when requirements have not yet been clarified, for purely visionary brainstorming, for a small isolated fix, or for implementation after a design already exists (→impl-loop).
---

# Buildable Plan

Turn confirmed requirements and an initial design into an implementable design and development contract that can evolve sustainably. The design covers the overall direction needed to achieve the user's goals, while the implementation plan delivers it incrementally through a series of minimum business loops rather than attempting the entire implementation at once. Measure design quality by whether each iteration validates real business and technical assumptions, whether later capabilities can extend along stable boundaries, and how much correct work survives when circumstances change.

## Success criteria

- **Requirement fidelity**: Every observable success traces to a capability, owner, contract surface, and verification method.
- **Minimum business loop**: The first implementation milestone satisfies one observable requirement through the smallest real end-to-end path and validates, as early as possible, the business rules and technical assumptions that could change the rest of the plan. It is not a structural skeleton, a mock, or a false success. When a platform has been adopted, this path must pass through the platform's main composition unit rather than only a lower-level primitive.
- **Iterative and extensible**: Known future capabilities can be added incrementally along the same ownership, contract, and lifecycle boundaries. Do not compromise those boundaries for speed in the first iteration or prebuild extension points for purely hypothetical futures.
- **Evidence-based choices**: Key choices combine repository facts, current external evidence, and transferable cross-domain experience. Do not substitute model memory or the first plausible solution for research.
- **Closed verification loop**: Both the normal path and credible failure conditions have falsifiable verification paths. For key outcomes that can be proven only after deployment, provide the minimum observability and assign responsibility for tracking them until verification is complete.
- **Component autonomy**: Each service and component has a cohesive responsibility, a stable contract, and an independent verification entry point. Once the contract is frozen, the component can be implemented independently and composed or replaced at the composition boundary.
- **Stable responsibility**: Authoritative state, business rules, and side effects each have one owner. Dependency directions and shared contracts are clear. The owner table must include responsibilities already claimed by an adopted platform; the product layer must not create parallel owners for them.
- **Provable parallelism**: Each workstream has exclusive ownership, frozen inputs and outputs, independent verification, and a clear join. If those properties cannot be demonstrated, run the work serially.
- **Bounded rework**: When the plan changes, distinguish work that remains valid, needs local adaptation, can be reused as material, or must be discarded. Do not assume that all completed work must be thrown away.

## Input boundary

Before you start you must have:

- User requirements, observable success criteria, core principles, and non-negotiables;
- An initial design document, or a design direction established in the conversation that can be written down;
- Constraints, non-goals, and the known operating context.

If information that could change product capabilities or core principles is missing, return to the requirements discussion first. Use repository investigation to confirm owners, entry points, consumers, existing mechanisms, and verification paths. Do not use the current implementation to narrow the user's goals after the fact.

## Design enhancement

### Requirements and forces

Fix the outcomes users want, the core principles, non-negotiables, constraints, non-goals, and observable completion conditions. Establish this chain for every core requirement:

`need -> capability -> responsibility owner -> contract/change surface -> evidence`

Do not include structures that cannot be traced to a requirement or a credible change.

### External and cross-disciplinary research

When a design choice affects capability, ownership, contracts, lifecycle, or long-term evolution and repository facts do not determine the answer, first state the research question whose answer would change the design. Then use the host's external research tools to gather evidence. Research should both verify known constraints and actively seek candidates with different tradeoffs in mechanism, ownership, contracts, or lifecycle:

- Consult current authoritative documentation, upstream source code, and mature implementations to confirm available mechanisms, limitations, and known failure modes;
- Look for solutions in adjacent domains subject to similar forces, and extract transferable principles instead of copying their technical forms;
- Screen candidates against this project's goals, constraints, ownership, and operating environment, recording the evidence for adopting or rejecting each one.

Research serves decisions; it is not an exhaustive literature search. If an authoritative local answer exists and the choice does not affect the architecture, use it directly. If external evidence is insufficient but the choice would change the design, mark the assumption and place the earliest check that could falsify it in an iteration milestone.

### Architecture selection

The design must determine:

- responsibility, authoritative state and side effect owner;
- The main data and control flows and dependency directions;
- writer, consumer, semantics of shared/versioned contracts and freeze point;
- stable invariants and owner-local volatile decisions;
- The failure, cancellation, and recovery lifecycle relevant to the current requirements.

Design patterns are not decorative markers of quality. When adopting a pattern, public abstraction, persistent state, adapter, registry, lock, or recovery mechanism, explain the specific force it addresses, the boundary it protects, the credible changes it can absorb, its cost, and the conditions for removing it. Choose a more direct design whenever it fully satisfies the requirements. When a platform has been adopted, “more direct” means consuming its main composition unit, not creating a parallel authority or calling only a lower-level primitive.

### Existing Platform Ownership

When a design adopts or depends on an existing platform, framework, or runtime, complete a platform inventory before freezing product-layer ownership. This does not apply to a fully custom implementation with no adopted platform, a library used only as a leaf-level tool that provides no main composition unit, or a platform the user has explicitly excluded.

Base the inventory on authoritative documentation or source code for the locked version, and follow the platform's own ownership claims. Record:

- The platform's documented main composition unit—the intended way to assemble a runnable instance, not an arbitrary lowest-level callable API;
- The responsibilities each unit claims, using the platform's own terminology and citing the source;
- The existing units to which the current requirements belong.

For every new product-layer type, module, registry, or facade that would own a responsibility already claimed by the platform, do one of two things: map it to an existing unit and consume that unit directly, or provide documentation or source evidence that the locked version does not supply the responsibility and fill only that gap. Isolating internal types, simplifying upgrades, adding a thin wrapper, improving testability, or planning to "use the rest later" does not justify parallel ownership of a responsibility the platform already claims. Those reasons justify only adaptations at composition or wiring seams that do not take over authority.

The first milestone path must pass through the main composition unit identified in the inventory. If it uses only a lower-level primitive while the inventory shows that the main composition unit already owns the responsibility, it is not a minimum business loop. If the inventory is incomplete or a new structure lacks map-or-gap evidence, mark PLAN as `blocked`, not `ready`. If the user explicitly asks not to use the main composition unit, record why it is inapplicable before selecting an alternative path.

When external research finds several complete, viable candidates with different ownership, contract, or lifecycle tradeoffs, compare them against the project's forces. When evidence does not support a materially different alternative, present one simplest complete design.

### Service and component boundaries

When the solution contains multiple services or components, each boundary must simultaneously support:

- **Independent implementation**: The responsibility and write surface are exclusive, the component depends only on frozen contracts, and it does not consume another component's implementation before that implementation is integrated in the same round;
- **Independent verification**: Before join, evidence appropriate to the boundary can falsify its behavior—for example, unit tests for domain logic, contract/API verification for protocol boundaries, or component integration tests for side effects;
- **Loosely coupled composition**: Dependencies point to contracts, a clear composition owner controls selection and wiring, and replacing an implementation does not require changes to consumer business logic;
- **Reusable semantics**: Reuse comes from stable responsibilities and contracts, not accidentally similar code shapes.

By default, "pluggable" means that an implementation can be replaced at the composition boundary; it does not imply a dynamic plugin system. Introduce registries, plugin lifecycles, and similar mechanisms only when current requirements call for runtime discovery, third-party extensions, or dynamic assembly. Merge or redraw boundaries that cannot be implemented or verified independently, or explicitly model them as integration responsibilities that must run serially. Do not create false parallelism through superficial decomposition.

### Red Cases with verification coverage

Once the solution and its boundaries explain the expected behavior, but before freezing implementation milestones, identify a small number of credible scenarios that would invalidate the solution's claims. Derive them from user-observable outcomes, business rules, and the real operating context. Include a Red Case only when current facts, business rules, previous failures, or known environmental differences support it and it would affect user outcomes. Do not add purely hypothetical risks to the design.

A Red Case is a verification responsibility, not a conclusion that the design is wrong. If evidence confirms it and disproves a design premise, revise the design immediately. Otherwise, retain the design and specify a final check and credible evidence that can determine the outcome. One check may cover several claims or Red Cases; do not create tests merely for formal completeness. Include accepted Red Cases in final verification coverage. An unexecuted Red Case does not prevent PLAN from being `ready`, but a Red Case that affects core observable success and lacks both other evidence and a credible verification path must block release.

Final verification coverage must prove both the normal success path and the accepted Red Cases. Do not substitute unit tests, component checks, or documentation checklists for user outcomes, business semantics, or operational facts they cannot prove.

### Post-deployment verification when needed

Determine whether any key outcome can be proven only under production-specific conditions, with real traffic or data, at a scheduled time, or after a period of continuous operation. If there is no such outcome, do not add a post-deployment process. Never postpone a check that can be completed before deployment.

For every post-deployment checkpoint, the design must specify the observable outcome, trigger or time window, evidence-acquisition method, responsible owner, and response to failure. If the existing system cannot produce the required evidence, add the smallest necessary metric, event, log, health/read probe, or other observation mechanism within the relevant owner's implementation scope. Before deployment, prove that the signal can be produced and read. Do not add observability without a corresponding checkpoint.

Checks beyond the current execution cycle require durable follow-up. Use the host's schedule, reminder, monitor, a GitHub issue, or the project's existing tracker. The chosen mechanism must persist the owner, checkpoint trigger or time window, and the location where results will be recorded. PLAN specifies when to create it. Create it immediately if the deployment time and owner are known and external writes are authorized; otherwise, make creation of the tracking item a release-handoff prerequisite and do not claim it already exists. After verification, write the evidence and conclusion back to the specified location.

### Iteration path and early risk reduction

DESIGN clarifies the evolution direction and stability boundaries of known goals, and PLAN organizes them into progressive milestones that can be integrated and verified:

- The first milestone delivers the minimum business loop through the real owner, contract, and side-effect paths. When a platform has been adopted, the path must include its main composition unit;
- Put decisive business details and technical challenges into the earliest milestone that can falsify them, so an infeasible design is discovered before a full rollout;
- Extend later milestones along confirmed boundaries toward the remaining observable successes. Each iteration must identify the added user value or the load-bearing uncertainty it removes;
- Each milestone describes the evidence required to continue implementation and which findings indicate that design assumptions are invalid and require partial re-planning.

The minimum loop is a verification and integration point, not a reduction of the final goal. PLAN must still cover every selected requirement, but it must neither compress the complete implementation into one delivery nor add milestone shortcuts that obstruct later evolution.

### Change stress testing

Choose a small number of scenarios, grounded in known requirements, repository structure, and the operating environment, that would materially change the implementation. Examine each one:

- which owner and contract change;
- which workstream should remain unchanged;
- whether the existing seam confines the change to a reasonable scope;
- whether the change would unnecessarily cut across multiple owners, in which case correct the boundary first.

Do not add extension points for purely hypothetical futures. Control unknowns through clear ownership, contracts, and invalidation rules rather than prediction.

## Parallel workstream

Split work by independent responsibilities and stable contracts, not by file count or mechanical frontend/backend labels. Workstreams express ownership; iteration milestones express implementation and verification order. Several workstreams may jointly complete a minimum business loop after integration. For each workstream, record:

| Field | Content |
|---|---|
| `id` | A stable and unique short identifier within workstream; dependencies, join and delta refer to it uniformly |
| `goal` | Independently delivered user capabilities or architectural responsibilities |
| `owns` | Exclusive responsibility, state, and write surface |
| `execution_constraints` | Shared services, sandboxes, migration environments, or budgets that limit concurrency |
| `depends_on` | Prerequisites that must be frozen or completed before starting |
| `consumes` / `produces` | Input and output contract |
| `done_when` | Observable completion conditions |
| `local_validation` | Unit, contract/API, or component integration checks that can independently falsify the result before join |
| `join` | Integration owner, prerequisites, and integration verification |
| `survives_if` | Invariants or contracts on which the result's continued validity depends |
| `invalidated_by` | Changes that stop the workstream |
| `reusable_parts` | Code, tests, components, or knowledge that can be retained after failure |

### Contract backbone and release gate

When several workstreams depend on a new shared contract, first freeze its semantics, owner, dependency direction, and lifecycle in the design. Then create a prerequisite contract-spine workstream, or an equivalent freeze checkpoint, that materializes the contract as executable authority. DESIGN must identify the semantic owner and contract writer; PLAN must reference both and name the integration owner. If the semantic owner and integration owner differ, the join must also specify the acceptance criterion, evidence producer, acquisition step, and evidence locator. The contract writer is the sole authority for materializing and later revising the shared surface. Under that authority, the contract spine implements only the shared schema/type/protocol, public entry point, composition seam, and contract fixture/test. It neither replaces the semantic owner nor preimplements owner-local business logic or production stubs that return false success. Completion evidence must show that the contract can actually be imported or compiled and that producer and consumer fixtures or conformance harnesses interpret canonical examples consistently. Each workstream's local validation and later join validation prove that the real implementations conform. If existing artifacts and checks already provide equivalent evidence, do not create a skeleton merely for structural completeness.

Every implementation workstream that depends on this authority, including runtime producers and consumers, must wait until it is complete and joined, then treat the shared surface as read-only. The contract spine and its dependents cannot run in parallel in the same round. If a dependent discovers that the contract must change, stop the current write round and submit a design delta. After `buildable-plan` revises the affected closure and produces a new `ready` plan, only the designated contract writer may modify the contract at the new materialization frontier and join it again. Other tasks then recalculate their frontier; they must not add fields independently, introduce fallbacks, or copy the contract. If fixtures or conformance tests cannot falsify the real producer-consumer interpretation of the contract, and that interpretation is a prerequisite for a direct dependent's `done_when`, add a representative vertical-slice gate before broad parallel work. Model it as a workstream or join with an `id`, `done_when`, and join validation, and include it in direct dependents' `depends_on` or join prerequisites. If it writes a production surface, PLAN must give it an exclusive sub-surface and remove that surface from downstream `owns`; downstream work may consume the result read-only but cannot own it again. Do not make an end-to-end join that requires a real consumer implementation a prerequisite for completing the contract spine.

PLAN may be marked `ready` when contract semantics are frozen but the contract spine has not yet been materialized, provided that the spine is in the first frontier and release gates block every implementation workstream that depends on its authority. If materialization could still change shared-contract semantics, ownership, or dependency direction, PLAN must not be marked `ready`. A runtime producer and consumer may run in parallel in the same frontier only when both depend solely on joined contract authority and neither consumes the other's not-yet-integrated implementation from that round. If bidirectional runtime communication creates an implementation dependency cycle, break it with a command, event, or protocol contract that has a clear semantic owner. If the cycle cannot be broken, combine the work into one integration workstream and complete it serially.

Parallelize only workstreams whose ownership does not overlap, whose contract-phase prerequisites are satisfied (the spine has semantic-freeze evidence and write authority; dependents have joined-authority/release evidence), that do not rely on implementation artifacts still unintegrated in the same round, that can be verified independently, and that have a clear join. `depends_on`, joins, direct dependents, and design deltas always reference the workstream `id`. Preserve an ID only when the semantics of `goal + owner + produced contract` are unchanged. After a split, merge, or any substantive change, assign a new ID, record `supersedes`, and update dependents, joins, and every verification that must be rerun. If shared-contract semantics are not frozen or must change relative to the current DESIGN/PLAN, do not downgrade the work to serial implementation or mark PLAN `ready`. Close the design delta first; mark it `needs-user` when a user decision is required or `blocked` when load-bearing facts or dependencies are missing. Serialize explicitly only when contract-phase prerequisites are met but another independence condition fails. Parallelism is not a quality metric.

## Changes and results retention

When the design or known facts change, classify completed work into four categories:

| Classification | Criteria | Action |
|---|---|---|
| `unaffected` | Goals, owner, contract and `survives_if` still hold | Results and verification retained |
| `locally-adaptable` | The shared contract is unchanged; only the owner's implementation changes | Adjust within the workstream |
| `reusable-material` | contract has changed, but some code, tests or knowledge still conform to the new design | Extract the valid parts and redo the boundaries |
| `invalid` | Conflicts with new target, ownership or contract | Remove bad implementation |

Replan only the affected closure, its joins, and its verification. Start the closure at the changed workstream, contract, or join and propagate downstream through `depends_on`, `consumes/produces`, and join edges, reevaluating `survives_if` at each step. Stop propagation along a branch only if `survives_if` still holds and the goal, owner, consumed and produced contracts, and verification assumptions remain unchanged. Otherwise, include that workstream in the closure and continue checking its dependents. Retained code remains subordinate to user goals and the correct design; do not add incorrect shims, fallbacks, or dual paths merely to delete less code.

## Delivery

Canonical directory: `.agents/buildable-plan/<plan-name>/`.

### `DESIGN.md`

Include goals and observable success, requirement traceability, architecture and ownership, service/component boundaries and the composition owner, data/control flow, contracts and invariants, load-bearing research questions and external evidence locators, reasons for accepting or rejecting candidate solutions, independent verification entry points, pattern rationale, credible-change pressure tests, Red Cases, and verification intent. When post-deployment verification is required, also include the observability design needed for those checks.
When a platform has been adopted, also include the platform inventory, main composition units, responsibilities each unit already owns, and a map-or-gap decision for every new authoritative product structure.

### `PLAN.md`

Include:

1. `Status: ready | needs-user | blocked`;
2. Corresponds to `DESIGN.md`;
3. parallel workstreams and survival fields;
4. Progressive milestones from the minimum business loop to the complete goals, including business and technical assumptions to verify early and signals that require a design delta;
5. The final verification coverage composed of the normal successful path and the included Red Cases;
6. Post-launch checkpoints, observation implementation, owner, triggering methods, tracking mechanisms and failure handling when necessary;
7. contract freeze/materialization points, dependent implementation release gates and dependency edges;
8. integration owner, semantic acceptance evidence, join order and join validation;
9. adaptation rules;
10. Any remaining load-bearing decision or blocker.

`ready` means there are no open issues that would change the user goals, ownership, shared contract, or dependency topology; `needs-user` raises only a minimal issue that would change the design; `blocked` specifies missing load-bearing facts or dependencies. owner-local, reversible details do not block `ready`.
When a platform has been adopted, do not mark the plan `ready` if the inventory is incomplete, any new authoritative structure lacks a map-or-gap decision, or the first loop does not pass through the main composition unit.
An unimplemented or not-yet-executed Red Case does not prevent `ready`. Mark the plan `blocked` if a Red Case affects core observable success, is not covered by other evidence, and lacks a credible verification path, or if any applicable post-deployment verification contract remains open.

`impl-loop` dynamically computes the execution frontier in each round from PLAN and current evidence. PLAN does not expand into a complete backlog, static waves, function lists, or exhaustive edge cases.

## Inspection before delivery

1. Does every core requirement have an owner, contract surface, and evidence?
2. Were key choices that local facts could not settle researched externally and across domains, then screened against this project's constraints rather than chosen from model memory alone?
3. Does the first milestone form a minimum business loop through a real path rather than a structural skeleton? If a platform has been adopted, does that path pass through the main composition unit rather than only a lower-level primitive?
4. Are load-bearing business details and technical challenges validated before broad implementation begins?
5. Can later milestones extend along the established boundaries until they cover the complete goal?
6. Can each service or component be implemented independently against stable contracts, verified independently before join, and composed by a clear composition owner?
7. Can an implementation be replaced without changing consumer business logic, and has the design avoided dynamic pluggability mechanisms that no current requirement needs?
8. Are there duplicate or missing owners, cyclic dependencies, or unstable shared contracts? Does the product layer parallel-own any responsibility already claimed by an adopted platform?
9. Does every new structure address a current force?
10. Do parallel workstreams have overlapping ownership, hidden dependencies on implementation artifacts not yet integrated in the same round, or a missing join?
11. Do adaptation rules clearly identify what remains valid and what is invalidated?
12. If a platform has been adopted, is the inventory complete, and does every new authoritative product structure have a map-or-gap decision?
13. Is every accepted Red Case grounded in reality, relevant to user outcomes, and included in final verification coverage rather than used to complicate the design through conjecture?
14. Are there key outcomes that can be proven only after deployment? If so, does the design include the required observability, checkpoints, owners, durable follow-up, and failure handling? If not, has it avoided adding a post-deployment process?

Stop when the checklist passes. Report the status, DESIGN/PLAN paths, selected design, parallelizable workstreams, integration owner, any required post-deployment checks and tracking mechanism, and open questions. When the status is `ready`, hand the plan to `impl-loop`.
