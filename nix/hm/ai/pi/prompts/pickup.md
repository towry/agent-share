---
description: Pickup a handoff from a previous session
---
You are resuming work from a handoff document stored in `.claude/handoffs/`.

Requested handoff file: `$ARGUMENTS`

Process:
1. If `$ARGUMENTS` is empty, list available handoffs with `ls .claude/handoffs` and ask which file to read. Do NOT read any file yet.
2. If a filename is provided, confirm it exists (list if needed). If it does not, ask the user to choose. Do NOT read any file without confirmation.
3. Read the confirmed handoff file with the `read` tool.
4. Summarize the context and ask what the user wants to focus on next.
