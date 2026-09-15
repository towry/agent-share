# Contract Impact Note Template

This is a pre-implementation gate. For any non-trivial feature or bugfix, complete it and compare it with the existing implementation before changing business code.

**Location**

- Default: `<repo>/.agents/docs/contract-impact/<topic-slug>.md`
- If the contract becomes a long-lived architectural fact, move it to `<repo>/docs/architecture/` and register it according to the repository's architecture-document conventions.
- Write `<topic-slug>` in kebab-case and include both the subject and action, such as `<module>-<change-target>`.

## Meta

- **Topic**: <One sentence: "<scenario><changes / relies on><contract>">
- **Type**: <new feature | bugfix | refactor>
- **Triggered by**: <user's original request / issue id / call context>
- **Date**: <YYYY-MM-DD>

## 1. Symptom and goal

- **Symptom (bugfix) / expected behavior (feature)**: <State it in one sentence.>
- **Required business outcome**: <Describe the complete outcome from the user's perspective.>

## 2. Contract inventory

List every contract that changes or is relied on.

| Contract | Status | producer | consumer | Upstream/downstream source of truth | Business purpose |
|------|------|----------|----------|------------|----------|
| <For example, `<field>` on `<method> <path>`, `<field>` on event `<name>`, or `<column>` on DB table `<name>`> | new / changed / relied-on / removed | <producer> | <consumer> | <doc / schema / db path> | <business meaning carried by the contract> |

## 3. Expected vs actual system behavior

Compare each contract.

- **Contract A**:
  - Expected behavior: <caller / upper-layer assumption>
  - Actual behavior: <provider / actual downstream response / actual state>
  - Gap: <Write "None" if there is no gap.>

## 4. Hard gates vs provenance / quality metadata

List these separately; do not conflate them.

- **Hard gates (missing means stop / reject)**: <field or state, and the business boundary it enforces>
- **Provenance / quality metadata (strength, source, or confidence)**: <field, and how callers should use it as weak evidence>

## 5. Breaking conditions

- <condition / upstream change / data shape that would break this contract>
- <symptom callers should observe when it breaks>

## 6. Affected upper-layer behavior

- <UI state / scheduling path / user-visible action constrained by this contract>

## 7. Confirm before implementation

- [ ] <file to read / live API check / db sample needed as evidence>
- [ ] <person to align with / decision to make>
- [ ] <whether the external-compatibility criteria in SKILL.md §2 apply; if so, include the compatibility layer's owner, expiry, and deletion condition>

## 8. Verification

- **During design**: <static evidence: source inspection, sampling, or comparison with the design>
- **After implementation**: <automated test / manual test / monitoring metric / log signature>

## 9. No contract impact

If there is no contract impact, delete §1-§8 and keep only this section:

- **Rationale**: <why this change does not affect any external contract>
- **Breakable assumption**: <where the mistake would surface first if this assessment is wrong>
