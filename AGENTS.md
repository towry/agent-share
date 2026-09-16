# Agent Share

Public skill library. Each skill is `skills/<name>/SKILL.md` (frontmatter `name` matches the directory). `find-hot-skill` indexes this tree; treat skills as reference, not drop-in production configs.

## Skills

- Write portable instructions: repo-relative paths, `$HOME` / `<HOME>` placeholders, or fictional `~/...` examples. Do not bind a skill to one machine.
- `examples.txt` with at least 8 task lines in concise English. Refresh with `bun scripts/generate-skill-examples.ts` when the body no longer matches those tasks.
- credentials stay in the environment, never in skill files. 

## Safety

Skill files (`SKILL.md`, `references/`, `scripts/`, `examples.txt`, `assets/`) must not contain:

- Secret **values**: API keys, tokens, passwords, private keys, or connection strings with credentials. Name the env var (`AMPCODE_HONCHO_API_KEY`) instead of writing its value.
- Local **identity**: expanded home directories (`/Users/<name>`, `/home/<name>`), other host-specific absolute paths that include a local username, and real local usernames, hostnames, or emails.

If a draft needs a real secret or a real local path to work, stop and rewrite it so the skill stays portable.
