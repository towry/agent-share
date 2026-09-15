---
name: diagram
description: |
  Generates, modifies, and validates technical diagrams with Mermaid, including flowcharts, sequence diagrams, state diagrams, class diagrams, ER diagrams, C4 diagrams, and deployment topologies. Use for Mermaid, diagrams, ERDs, architecture visualization, syntax errors, or rendering failures.
---

# Diagram Skill

## Contents

- [Overview](#Overview)
- [Use cases](#use-cases)
- [Required workflow](#required-workflow)
- [Syntax validation](#syntax-validation)
- [Choosing a diagram type](#choosing-a-diagram-type)
- [References](#References)
- [Writing guidelines](#writing-guidelines)

## Overview

Generate clear, maintainable technical diagrams with Mermaid syntax. Use the validation tool to ensure that every output is syntactically valid.

## Use cases

- System architecture diagrams (monoliths, microservices, distributed systems)
- C4 model diagrams (Context, Container, Component, Code)
- Data flow diagrams (Data Flow Diagram)
- Sequence diagrams (Sequence Diagram)
- Class diagrams (Class Diagram)
- State diagrams (State Diagram)
- ER diagrams (Entity Relationship)
- Flowcharts (Flowchart)
- Deployment topology diagrams (Deployment Diagram)
- Component dependency diagrams (Component Diagram)

## Required workflow

1. Choose the appropriate diagram type (architecture / flowchart / sequence / state / class / ER / C4). See [Choosing a diagram type](#choosing-a-diagram-type).
2. Read the corresponding example in `references/` and generate Mermaid code.
3. Run the validation script to check the syntax.
4. If it returns `valid:false`, fix the problem described by the `error` field and try again. **Never deliver invalid output.**
5. If the document contains multiple Mermaid blocks, validate every block.
6. Deliver the result only after validation passes.

> **C4 exception**: The validation script may incorrectly reject C4 syntax (`C4Context` / `C4Container` / `C4Component`) because of parser version differences. If C4 validation fails, verify the syntax with the target renderer (GitHub / VS Code) and mention this in the response.

## Syntax validation

After generating Mermaid code, **run the validation script to verify its syntax**. Never deliver invalid output.

```bash
# Verify Inline Code
run-skill-script diagram validate --code 'flowchart LR\n  A-->B'

# Verify .mmd Documentation
run-skill-script diagram validate diagram.mmd

# Verify mermaid code blocks embedded in Markdown (auto-extract ```mermaid blocks)
run-skill-script diagram validate README.md
```

JSON output:
- Success: `{"valid":true,"diagramType":"flowchart-v2"}`
- Failure: `{"valid":false,"error":"..."}`

If the document contains multiple Mermaid blocks, the script validates each one and reports its index. It exits with code 0 only if every block passes; any failure produces a nonzero exit code.

## Choosing a diagram type

Answer these three questions in order:

**Q1: What is the diagram's main purpose?**

| If the focus is... | Use | Criteria |
|---|---|---|
| **Ordered steps and branch decisions** | `flowchart TB/LR` | Includes "if...then...", multiple paths, or grouped subprocesses |
| **Timeline of interactions among participants** | `sequenceDiagram` | Focuses on who calls whom and when, request/response pairs, or message order |
| **Object structure and relationships** | `classDiagram` | Focuses on inheritance, composition, attributes, or methods |
| **Data relationships between entities** | `erDiagram` | Focuses on cardinalities such as one-to-many or many-to-many between tables or entities |
| **State transitions** | `stateDiagram-v2` | Focuses on how one object moves between states |
| **System boundaries and layers** | `C4Context/Container` | Focuses on high-level relationships among people, systems, and containers |

**Q2: How do you resolve common ambiguities?**

| The user says... | Possible choices | Correct choice | Reason |
|---|---|---|---|
| "Login Process" / "Registration process" | flowchart vs sequence | **flowchart** | The focus is on branching steps and which path to take, not a timeline involving multiple participants. |
| "A calls B, then B calls C" | flowchart vs sequence | **sequenceDiagram** | The focus is on the order of messages among multiple participants. |
| "Change in order status" | flowchart vs state | **stateDiagram** | The focus is on transitions between states of the same object, not a sequence of process steps. |
| "How does microservice deploy?" | flowchart vs C4 | **flowchart** (deployment topology) or **C4Container** (abstract architecture) | Use a flowchart for concrete nodes or clusters; use C4 for abstract boundaries. |
| "Database Table Relations" | classDiagram vs erDiagram | **erDiagram** | Use ER when cardinality matters; use class diagrams for pure OOP models. |

**Q3: What is the minimal skeleton?**

After choosing a diagram type, start with the corresponding skeleton:

| Diagram type | Minimal skeleton |
|---|---|
| `flowchart TB` | `flowchart TB\n  A-->B-->C` |
| `flowchart LR` | `flowchart LR\n  A-->B-->C` |
| `sequenceDiagram` | `sequenceDiagram\n  A->>B: call` |
| `classDiagram` | `classDiagram\n  A <\|-- B` |
| `erDiagram` | `erDiagram\n  A \|\|--o{ B : has` |
| `stateDiagram-v2` | `stateDiagram-v2\n  [*] --> Active` |
| `C4Context` | `C4Context\n  Person(u,"User")` |
| `C4Container` | `C4Container\n  Container(api,"API")` |

## References

Detailed examples are available in `references/`. Read them as needed:

| Reference | Diagram type | Use case |
|---|---|---|
| [Architecture and deployment diagrams](references/architecture.md) | `flowchart` | Layered architecture, microservice topology, event-driven architecture, deployment topology |
| [Sequence diagrams](references/sequence.md) | `sequenceDiagram` | Calls between services, authentication flows, asynchronous messages, error branches |
| [C4 Model](references/c4-model.md) | `C4Context` / `C4Container` / `C4Component` | System context, container boundaries, component dependencies |
| [Flowchart](references/flowchart.md) | `flowchart` | Decision flows, data pipelines, CI/CD processes |
| [Class and ER diagrams](references/class-er.md) | `classDiagram` / `erDiagram` | Domain models, database schemas, entity relationships |
| [State diagrams](references/state.md) | `stateDiagram-v2` | State machines, lifecycles, composite states |
| [Presenting diagrams](references/present.md) |  —  | Present diagrams to users through HTML, images, or the terminal |

## Writing guidelines

### Do

- Keep each diagram focused on one aspect.
- Use `subgraph` to create layers and identify logical boundaries.
- Keep node names concise and use `<br/>` for explanatory line breaks.
- Use color sparingly and semantically to distinguish success, failure, and warnings.
- Label arrows with important actions or protocols.
- Add a written explanation for complex diagrams.
- Run the validation script before delivering output.

### Don't

- Crowd a single diagram with too many nodes; split it if it exceeds 20 nodes.
- Mix different levels of abstraction in one diagram.
- Omit the legend or title.
- Leave arrows unlabeled when their relationships would be unclear.
- Replace code-based diagrams with screenshots.
