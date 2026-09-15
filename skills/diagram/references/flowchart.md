# Flowchart reference

## Overview

Flowcharts represent the logical flow of **processes, decisions, and pipelines**. Use a flowchart for:

- Business approval processes with multiple levels of conditional branches
- Data-processing pipelines, including ETL and stream processing
- CI/CD deployment processes with stages and gates
- Troubleshooting decision trees

Choose a direction:
- `flowchart TB` (top to bottom) for hierarchical processes
- `flowchart LR` (left to right) for linear pipelines

Node shapes:

| Shape | Syntax: | Purpose |
|------|------|------|
| Rectangle | `[text]` | Processing step |
| Diamond | `{text}` | Condition |
| Round corner | `(text)` | Start or end node |
| Cylinder | `[(text)]` | Database/Storage |
| Subprocess | `[[text]]` | Subprocess call |

---

## Decision streams

Diamond nodes express conditional branches in approval, validation, routing, and similar flows.

```mermaid
flowchart TB
    Start(Start) --> Validate{Enter valid?}
    Validate -->|Yes| AuthCheck{Sufficient authority?}
    Validate -->|No| Reject[Return error]

    AuthCheck -->|Yes| RateLimit{Frequency limit?}
    AuthCheck -->|No| Forbidden[Access denied]

    RateLimit -->|No| Process[Implementation of business logic]
    RateLimit -->|Yes| Throttle[Limited flow waiting]
    Throttle --> RateLimit

    Process --> Persist[(Writing to Database)]
    Persist --> Notify[[Send notification]]
    Notify --> Done(Completed)

    Reject --> Done
    Forbidden --> Done
```

Key points:
- Use diamonds (`{}`) for conditions and label outgoing arrows with values such as `|Yes|` / `|No|`.
- Create loops by pointing an arrow back to an upstream node, as in `Throttle --> RateLimit`.
- Converge terminal paths on a common end node to keep the diagram clean.

---

## Data-processing pipelines

For ETL or stream-processing pipelines, use `flowchart LR` to show data moving from left to right.

```mermaid
flowchart LR
    subgraph Collection Layer
        API[REST API] --> Queue[(Message queue)]
        Logs[Log File] --> Queue
        DB_src[(Source Database)] --> CDC[[CDC Capture]]
        CDC --> Queue
    end

    subgraph Process Layer
        Queue --> Parse[Parse and clean]
        Parse --> Enrich[Field Completion]
        Enrich --> Transform[Aggregation Conversion]
    end

    subgraph Storage
        Transform --> DW[(Data repository)]
        Transform --> ES[(Search Engine)]
        Transform --> Cache[(Redis Cache)]
    end

    subgraph Consumer layer
        DW --> BI[BI Report]
        ES --> Search[Full Text Search]
        Cache --> App[Application services]
    end
```

Key points:
- Use `subgraph` to group stages by logical layer.
- Use cylinders (`[()]`) for storage and subprocess shapes (`[[]]`) for reusable processing modules.
- Show multiple sources flowing into the same node with parallel `-->` arrows.

---

## CI/CD Process

A typical continuous integration and deployment pipeline with stage gates and parallel tasks.

```mermaid
flowchart TB
    Push(Code delivery) --> Lint[Code Check]
    Push --> Test[Unit Test]
    Push --> Security[[Security scan]]

    Lint --> Gate{All pass.?}
    Test --> Gate
    Security --> Gate

    Gate -->|No| Fix[Rehabilitation issues]
    Fix --> Push

    Gate -->|Yes| Build[Build image]
    Build --> Deploy_Staging[Deployment to Staging]
    Deploy_Staging --> E2E[End-to-end testing]

    E2E --> Approve{Manual approval?}
    Approve -->|No| Rollback[Roll back Staging]
    Approve -->|Yes| Deploy_Prod[Deployment to Production]

    Deploy_Prod --> Monitor[[Health screening]]
    Monitor --> Healthy{Service normal.?}
    Healthy -->|Yes| Done(Release complete.)
    Healthy -->|No| Rollback_Prod[Roll back Production]
    Rollback_Prod --> Fix
```

Key points:
- Parallel tasks (Lint / Test / Security) all point to the gate node.
- Represent gates as diamonds and route failures back for fixes.
- Represent manual approval as a decision node to make the manual step explicit.
- Use a subprocess shape for the health check to emphasize that it is an independent, reusable step.
