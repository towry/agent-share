---
name: contract-refactor-first
description: |
  Use contract-first analysis to define who interacts with whom, how they interact, and who owns each responsibility. Produce a Contract Impact Note from references/ instead of applying a minimal compatibility patch. Trigger this skill for non-trivial features, bugfix implementations, changes to module/service boundaries and responsibilities, error taxonomy or naming changes, caller-visible semantics changes, or capability splits/merges. Also trigger it when a solution starts leaning toward an optional field, `??` fallback, dual-read-write, adapter/shim, feature flag, or keeping an old path “to minimize churn.”

  Do not use it for purely internal optimization or a small single-function fix.
---

# Contract Refactor First

Resist the habit of applying the smallest compatible patch. When a task changes a contract, interaction rule, responsibility, or boundary, pass this design gate before writing code.

**Core principle**: simplify the design, not the patch. Prefer deleting a layer to adding a compatibility layer.

## 1. Pre-implementation gate

For anything beyond comments, formatting, copy, or a local rename:

- **Identify the problem first**: Do not change code until the symptom, constraints, root cause, and success criteria are clear.
- **Design before implementation**: For changes to a schema, type, interface, or module boundary, state what is wrong, what should change, and why a patch is inferior. Do not begin coding until all three are stated.
- **Fix definitions first**: If the root cause is the data model, interface contract, or division of responsibility, update that definition before its implementation and callers.
- **Tests prove a design; they do not replace one**: Tests verify settled behavior. When the design is not settled, do not use writing tests as a way to explore. A reproduction or characterization test may lock down the symptom, but it must not substitute for deciding the model and contract.
- **Do not rush into a workaround**: If a short design pass can resolve the issue, do not reach immediately for optional, fallback, or adapter logic.

### Three questions

Answer these before coding. If the third has no concrete answer, do not add a compatibility layer:

1. **Where is the root cause?** What are the symptom, constraints, and root cause?
2. **Can the contract be changed directly?** Can the schema/interface be corrected once and all callers updated?
3. **Why is compatibility necessary?** If fallback/adapter/optional behavior is needed, whom does it protect, and when will it be removed?

Record the answers and any cross-module or cross-service impact in a Contract Impact Note; see §6.

## 2. Root fixes and compatibility restrictions

- **Fix the structure, not the surface**: Refactor problems rooted in interfaces, structures, or boundaries. Do not hide them with defaults, optional fields, or semantic wrappers.
- **Change internal contracts instead of tolerating bad ones**: For repository-controlled schema, type, or interface mistakes, update every caller rather than adding an optional field, fallback branch, or adapter layer. First enumerate the main call sites and data flow; many callers do not justify compatibility.
- **One meaning, one path**: Keep one field, interface, and primary path for each meaning. Dual-read, dual-write, parallel old/new paths, and aliases are prohibited by default. Approved external migrations must be time-bound, boundary-limited, and removable.
- **Compatibility requires evidence**: Add it only for a published external contract, clients or services that cannot upgrade together, persisted historical data, unavoidable mixed versions during staged deployment, or a user-requested phased migration. Reducing the size of the change is not evidence.
- **Compatibility code must be removable**: Include a `TODO` with owner, expiry, and deletion condition. Do not merge it without a deletion plan.
- **Unreleased code has no legacy contract**: Do not invent backward compatibility for code that has never shipped or been exposed externally. Transitional logic that never ships becomes permanent debt and will eventually need to be changed again.

## 3. Prohibited patterns and warning signs

### Prohibited code patterns

- Making a required field optional/nullable to accommodate old callers
- `foo ?? oldFoo` / `newField || oldField` fallback
- Alias fields with dual-read/dual-write
- An adapter/normalizer/mapper/shim/facade used only to preserve an old shape
- A feature flag that preserves the old path
- `Partial<T>` / `any` / `Record<string, unknown>` used to avoid updating a contract
- A union of old and new shapes used only to avoid changing callers
- Local `?.`, `??`, or defaults that hide an upstream contract defect
- Swallowing an error in catch and reverting to old behavior

If normalization is genuinely necessary, place it at the external boundary, not in multiple internal consumers.

### Warning language

When you see the following phrases, immediately check whether you have fallen into the compatibility-patch path. In most cases, refactor rather than patch:

- "let me just make this optional"
- "for backward compatibility"
- "add a fallback for now"
- "support both old and new shapes"
- "avoid touching all call sites"
- "keep the old API and map internally"
- "add a shim / adapter / normalizer"
- "to minimize churn"
- "dual-read/dual-write temporarily"
- "we can migrate incrementally later"

## 4. Design review

- Review the design before the diff. For non-trivial work, assess the design before coding and review the diff afterward. Do not substitute a code review for architectural judgment.
- Include the root cause, boundary, tradeoff, and why no compatibility layer is needed.
- If review finds a modeling, interface, or responsibility error, return to the design instead of adding tests or branches around it.

## 5. Errors are contracts

Error returns are part of a module's public contract. A misleading outer error such as `pending` must not cover unrelated failures such as unavailable resources, empty data, and expired state.

- **One name, one category**: An outer error name/type/tag promises a handling path. Split distinct categories, or use a neutral outer name such as `error` or `Err` and classify with an inner code or structured field.
- **Callers branch on the inner category**: Do not infer categories from outer names such as `pending`, `retry`, or `stale`. Translate to product language only at the UI or log-formatting boundary.
- **Enumerate failures first**: Give each category an error code, trigger, owner (infrastructure/configuration/data/state), and recommended response (wait/retry/fix configuration/reject input/alert).
- **Renaming existing errors**: Classify by inner structure first, then decide whether to split or retain the name. Do not bury an outer-contract mistake in caller-side `if code` or `case code` branches. Apply §2 and §3 to external contracts.
- Record each error category's trigger, owner, and handling path in §2 of the Contract Impact Note.

## 6. Contract Impact Note gate

Complete a Contract Impact Note before changing business code for a non-trivial feature or bugfix implementation.

### Triggers

- Changing or relying on a cross-module or cross-service contract (HTTP / RPC / event / DB schema / queue payload)
- Changing state-machine transitions, a read-model shape, or a UI-visible state field
- Changing error taxonomy or naming; see §5
- Fixing a bug rooted in cross-module field semantics, error classification, or a state machine

### Exclusions

- Internal refactoring that does not change inputs, outputs, or responsibility boundaries
- A single-file, function-level fix
- Copy, formatting, comments, or a local rename

### Required content

Use `references/contract-impact-note-template.md`.

### Location

- Default: `<repo>/.agents/docs/contract-impact/<topic-slug>.md`
- Move long-lived architectural facts to `<repo>/docs/architecture/` under the existing documentation conventions.

### Relationship to the gates above

- Put the §1 answers in Note §3 and §7.
- Put the §2 and §3 compatibility conclusion in Note §7.
- Put each §5 error category in the Note §2 contract inventory.
- Put bugfix triage conclusions in Note §3.

### No contract impact

Even when there is no contract impact, produce the note and state the rationale and breakable assumptions in template §9.
