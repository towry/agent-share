---
name: create-lifeguard-rules
description: |
  Use to create or edit code review rules in lifeguard.yaml. Triggers when the user says "add a lifeguard rule," "write a review rule," or "add review guidelines."

  Do not use to perform a code review or modify existing code logic.
---

Lifeguard rules guide code review and help maintain code quality.

# Lifeguard rule spec

**filename**: `lifeguard.yaml`

**content spec**:

```yaml
# comment
rules:
  # section description in comment (if needed)
  - name: "LG-<keyword>-001 Rule name ..., like: No magic numbers"
    description: "Details about the rule ..."
  - name: "LG-<keyword>-002 Another rule..."
    description: "Details about another rule ..."

  # section description in comment (if needed)
```

`<keyword>` is a short label for the rule category, such as `vue-style`, `react-perf`, or `security`. Keep it as short as possible.

# Rule content guidelines

Follow these guidelines when generating rules:

- Understand the current codebase and identify common pitfalls, anti-patterns, and opportunities for improvement.
- Find project conventions for components, naming, and similar concerns, then turn them into rules.
- Give each rule a clear, concise name.
- Make each rule address one aspect of code quality or one best practice. Prefer several simple rules to one complex rule.
- Ensure that each rule's name matches its description. For example, a rule about a specific language feature should name that feature rather than use a generic title.
- Avoid rules that enforce a single or rare case. For example, do not make a rule about one particular function name unless that name is widely used in the codebase and has a specific meaning.
- Include general rules that prevent bugs.
- Include general rules that discourage complex code, hacks, and workarounds.
- Check that dependency import paths are correct.
- **Rule item order**: Put general rules first and specific or project-only rules later.


# Validation

Use Python to validate the `lifeguard.yaml` format and ensure that the file has no YAML syntax errors.

```
uv run --with pyyaml -- python -c "import sys, yaml; yaml.safe_load(sys.stdin)" < lifeguard.yaml && echo "✅ VALID" || ECHO "❌ NOT VALID"
```

After creating the file, ask the oracle subagent to review the contents of `lifeguard.yaml` and verify that the rules are reasonable and useful for code review. Ask it to review the existing rules rather than rewrite them completely.
