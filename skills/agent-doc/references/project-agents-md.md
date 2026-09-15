# Project Agent Documentation (AGENTS.md / docs/agents-md)

## When to Use

Use this when maintaining a project's `AGENTS.md` or `CLAUDE.md`; creating, merging, or structurally auditing `docs/agents-md/`; deciding between entry-document decision points and detailed documents; or simplifying the entry document's size and layering.

| Out of scope | Use instead |
|--------------|-------------|
| How to write the content of individual rules | `prompt-writing.md` |
| Skill artifacts | `skill-writing.md` |
| Wording checks for rule sections | `instruction-lint.md` (not a structural audit) |

## Structure

```
project/
├── AGENTS.md              # canonical copy (target < 100 lines, hard cap ~ 150)
├── CLAUDE.md              # optional: `ln -s AGENTS.md CLAUDE.md` (AGENTS is canonical; do not duplicate)
└── docs/agents-md/
    └── <topic>.md         # detailed document (target 100–300 lines; split into multiple files if above 500)
```

## Entry document vs. detailed documents

| Entry document (always loaded) | Detailed documents (on demand) | Do not write |
|--------------------------------|--------------------------------|--------------|
| One sentence describing the repository; **gotchas that are inherently wrong to ignore**; project defaults; **decision points with conditional loading** | Detailed examples, schemas, long lists, domain knowledge, and optional recipes | Temporary workarounds, **general knowledge**, facts inferable from the filesystem or repository, and one-time processes |

The entry document must contain **only project-specific facts**. Do not include local machine paths, global prompts, or unrelated personal configuration.  
For style and taste, prefer “match the surrounding code or existing formatter” over global absolute prohibitions. See the strong-model defaults in `prompt-writing`; lint overly broad prohibitions with S19.

### High-fidelity references

Put detailed constraints in **executable references** whenever possible, such as test suites, scripts, golden files, or an example implementation in the repository. The entry and detailed documents should state only:

- **When** to load or consult the reference  
- **What to observe** when the result is successful  

Do not copy the full reference into AGENTS.

## Decision-point references

Agents usually see only AGENTS.md at first. If a detailed document constrains a decision but the entry document does not name it, the agent will not load it.

**Rule:** List decision points directly in the entry document. Each reference must say “Before X, consult Y” and include a visible constraint; a topic label alone is insufficient. Mention each reference once rather than repeating it in a separate References section.

```markdown
# Poor
- Frontend guidelines → `docs/agents-md/frontend.md`

# Good
- Before adding deps: use `pnpm` (not npm). See `docs/agents-md/frontend.md`
```

## Style and length

Use imperative sentences, concrete examples that can be imitated, and sections that stand on their own. Target 50–100 lines for the entry document and 100–300 for each detailed document; split documents longer than 500 lines.  
See `prompt-writing.md` for content principles.

Name detailed documents in kebab-case. See `reference-doc-template.md` for the template.

## Success criteria

- If a rule is short and broadly applicable, put it in one decision-point or gotcha line in the entry document.  
- If it is detailed and conditional, put it in a detailed document and add a decision-point reference in the entry document.  
- Put executable detail in a reference and state its trigger and expected observation instead of restating it in long prose.  
- If you changed a rule section, use `instruction-lint.md`. For structural changes or redundancy removal only, use the structural audit and, if needed, the simplify track.  

When discovering naming, directory, environment, or similar conventions from code, collect 2–3 pieces of repository evidence, preferably existing lint or formatter configuration. Then place the rule according to the layering and decision-point guidance above. Do not restate general knowledge.

## Structural audit (not rule linting)

Check the following during a structural audit:

| Check | Action |
|-------|--------|
| Entry-document length (target <100 lines, hard limit ~150) | Move detail out and leave decision points in the entry document |
| Redundancy, topic-only references, or a duplicate References section | Delete it or turn it into a decision-point sentence |
| Overlapping detailed documents (merge if more than half overlaps; split if one document covers several unrelated topics; keep one main topic per document) | Merge or split |
| **General knowledge or facts inferable from the repository tree or files** | Delete them (same as lint S8) |
| **Restatements of system instructions or another document** | Delete the downstream copy (same as S9) |
| **Global absolute style prohibitions** that can use a local anchor | Demote them (same as S19) |
| Constraints in a detailed document with no decision point in the entry document | Add a triggered reference or delete the unreachable document |
| Long process checklists in the entry document | Move them to a detailed document or replace them with an outcome contract (S18) |

For simplify or unhobble work, first use this table to check size and layering, then run lint rules S8/S9/S11/S18/S19 on changed rule sections.

## Common mistakes

Putting non-project information or general reference material in the entry document; maintaining a redundant References section; treating CLAUDE as canonical; using an index instead of decision points; failing to move detail out of a bloated entry document; using topic-only references; allowing detailed documents to overlap; and adding rules without removing noise that is not a genuine gotcha.
