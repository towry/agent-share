---
name: managing-amp-orbs
description: |
  Use to manage the current Amp Orb's services, Portal, or id-token, or when the user explicitly asks to create a new Orb or conduct parallel multi-Orb collaboration. Orb collaboration uses Git authority, worker branches, and continuous joins to coordinate baselines, delivery, invalidation, and integration. Create an Orb thread only with the user's explicit authorization.

  Do not use for foreground or background execution of ordinary commands (use terminal-lifecycle), or solely to configure a repository to support Orbs (use orb-setup).
---

# Managing Amp Orbs

This skill governs Amp Orb permission boundaries and runtime constraints. Follow the current CLI help for specific commands.

## First identify the target

- **Current Orb:** `amp orb` manages the current execution environment's Portal, supervised services, and identity tokens. Managing the current Orb is not the same as creating a new Orb.
- **New Orb:** Use the host-provided thread creation tool to create a remote thread with an Orb executor. The `amp orb` CLI does not create Orbs.

## Permission gate for new Orbs

- Create a new Orb thread only when the user explicitly asks in the current request to "create/start/use a new Orb" or uses equivalent wording.
- When the user asks only for delegation, parallelism, running a service, isolated execution, or to "use an agent," do not infer authorization to create a new Orb. Use capabilities available in the current environment instead, or, when a new Orb is genuinely necessary, ask only for that authorization.
- The user's authorization covers only the creation action they requested. Do not use it to create additional Orbs.

## Current Orb constraints

- Before acting, use `amp orb --help` and the target subcommand's `--help` to confirm the commands and flags currently available. Do not reconstruct CLI usage from memory.
- Manage long-running services with `amp orb service`. When the repository already has `.amp/services.yaml`, prefer declarative `ensure`. Do not replace Orb service supervision with shell backgrounding, `nohup`, `setsid`, or tmux.
- When a user needs access to a local Web service, use `amp orb portal` or the service's Portal capability, and deliver the public URL it outputs unchanged. Do not give the user a `localhost`, `127.0.0.1`, or `[::1]` URL.
- Treat the output of `amp orb id-token` as a secret. Generate it only when the task genuinely requires an identity token, and do not show the token value in responses or logs.

## Multi-Orb collaboration

When the user explicitly authorizes multiple new Orbs and the workstreams have independent ownership, frozen contracts, and explicit joins, read [`references/multi-orb-collaboration.md`](references/multi-orb-collaboration.md). That reference governs Git authority, worker branches, baseline freshness, invalidation propagation, and continuous integration. `buildable-plan` and `impl-loop` remain responsible for workstream design and the execution frontier, respectively.

## Completion state

- Current Orb operations: report the actual service state. If you created a Portal, provide the public URL returned by the CLI.
- New Orb operations: provide the new thread link and its task scope. If creation fails, report the verified reason for the failure. Do not silently switch to another execution environment.
