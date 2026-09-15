---
name: evidence-tooling
description: |
  Use this to select evidence-gathering tools and standards of proof: find symbols and call sites, locate code across files, verify external API/CLI behavior, check calls before and after renaming, find existing helpers, and record what tests prove. Trigger it when changing an API, constant, name, or shared behavior; relying on external facts; or reaching a conclusion that requires mechanical evidence.
---

# Evidence Tooling

This skill only governs which evidence proves a fact. Whether to ask the user, whether changes are permitted, and whether a review is required remain subject to higher-level hard gates and task constraints.

## Evidence-gathering routes

| Scenario | Tool | Success criteria |
|---|---|---|
| Known symbol, string, path, or error code | `rg` / `ast-grep` | Find the definition or references, or confirm there are no matches; record the search scope |
| Change an API, constant, or variable name, or delete a symbol | Use `rg` / `ast-grep` to find all call sites | Handle each call site or confirm that it is unaffected |
| Change shared behavior | Trace callers and callees | Cover the behavior that callers depend on in both implementation and verification |
| Add a util / helper | Search for existing implementations with the same name, a nearly synonymous purpose, or the same input/output shape | Prove that reuse is insufficient, or use the existing implementation |
| Depend on an external API, field, or tool behavior | Official documentation or `<cmd> --help` | Cite a source for the fact; mark it `NOTE: unverified` if it cannot be verified |

## Evidence discipline

- Distinguish among "verified," "unverified," "disproven," and "load-bearing assumption."
- An assumption is load-bearing if its being false would change the contract, layering, data semantics, naming scope, or verification conclusion. Until it is verified, do not use it to choose names or configuration, draw architectural conclusions, or rule out options.
- If three consecutive rounds of the same kind of search in the main context produce no new critical evidence, stop pursuing that search direction and change methods.
- A passing test proves only the paths that actually ran and contained assertions. After changing a contract, field, signature, or identity key, record the corresponding test, static check, or deep-review evidence for each item.
- When an external fact cannot be verified, include it only as a `NOTE: unverified`; do not use it as a design conclusion or delivery guarantee.

## Gathering evidence for state changes

When you find a state change you did not cause, first select read-only evidence that matches the type of change:

| Change | Read-only check |
|---|---|
| File change | Inspect the corresponding diff |
| Git state change | Inspect status / log |
| Process or service change | Inspect status, ports, logs, or pane output |
| Generated artifact change | Inspect the generation command, timestamps, diff, or build output |

Ask only when the change directly conflicts with this task, continuing would overwrite someone else's work, or its impact still cannot be assessed safely. Preserve and avoid unrelated changes.
