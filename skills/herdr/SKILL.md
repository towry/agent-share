---
name: herdr
description: |
  Use to control herdr from within a herdr-managed pane (HERDR_ENV=1): discover and locate other panes and agents by name, label, or position ("right/left/up/down, the Nth tab, the one you are looking at"); send messages to running agents and read their replies; open a new tab or workspace to run an agent or long-running command; read pane output; and wait for output or agent status. Triggers: [send to the agent on your right/left], [the agent in the Nth tab], [ask the agent in a workspace].

  Do not use when HERDR_ENV is not "1" (the current pane is not managed by herdr), or when the user means a built-in subagent rather than an external agent.
---

# herdr — agent skill

before using this skill, check that `HERDR_ENV` equals `"1"`. if its value is anything else (unset, `0`, `true`, empty), you are not inside a herdr-managed pane — stop, do not run any `herdr` command.

herdr is a terminal-native agent multiplexer: workspaces hold tabs, tabs hold panes, each pane runs its own shell / agent / server. two CLI surfaces talk to the running instance over a unix socket:

- **`herdr agent ...`** — discover and talk to agents by **name, label, terminal id, or pane id**. use this to find and message agents that already run.
- **`herdr pane ...`** — layout, geometry, and keystroke delivery (`send-text` / `send-keys` / `run`). use this for placement and for submitting input into a pane.

raw protocol: <https://herdr.dev/docs/socket-api/>.

## concepts

- **workspaces** are project contexts; each holds one or more tabs.
- **tabs** are subcontexts inside a workspace; each holds one or more panes.
- **panes** are terminal splits inside a tab; each runs its own process.
- **agent_status** of a pane is `idle | working | blocked | done | unknown`. `done` means finished and not yet viewed.
- **focused** marks the one pane / tab / workspace the user is viewing right now; it moves as they navigate, so re-read it each time.

**ids** look like `wN` (workspace), `wN:t1` (tab), `wN:p1` (pane), `term_<hex>` (terminal). an id is stable while its thing lives but compacts when things close — do not cache it across operations; re-read from `*-list` / `*-get`, or capture it from `*-create` / `pane split` responses. your own pane id is in `HERDR_PANE_ID`.

## target identity: resolve soft refs, act only on pane ids

**hard rule**: anything that **sends input, waits on, or mutates** another pane must use a **concrete public pane id** (`wN:pN`, from `PANE_ID=...` output). soft refs (`right` / `left` / `up` / `down` / `tab:N` / `focused`) and bare agent names are for **discovery only**.

why: `herdr pane neighbor --direction right` returns **one** id with no multi-candidate warning. after the right column is split into upper/lower, re-resolving `right` can silently retarget. agent names can also collide across panes.

required flow:

1. **discover** — `run-skill-script herdr resolve <ref>` (or `herdr agent list` / `pane list`). read `PANE_ID=...` and the readback; if resolve exits non-zero with multiple candidates, pick one id yourself.
2. **act** — pass that pane id into `send-signed`, `herdr pane send-text|send-keys|run|read|wait-output`, and prefer pane id for `herdr agent wait|prompt|read` too.
3. **reuse the id** for the rest of the conversation with that peer; do not re-run `resolve right` on every follow-up.

`send-signed` enforces step 2: it **rejects** soft refs and non-`w*:p*` strings.

## helper scripts (run-skill-script)

the deterministic, error-prone multi-step flows below are packaged as scripts invoked through `run-skill-script herdr <name>`. each one self-checks `HERDR_ENV`, reads your own `HERDR_PANE_ID` in-process, and prints field-style stdout. prefer them over hand-assembling the raw commands — `send-signed` in particular builds the signature itself, so there is no template left for you to fill. the raw `herdr pane` / `herdr agent` recipes stay documented below as a customization fallback.

- `run-skill-script herdr whoami` — print your own pane identity (`PANE_ID/WORKSPACE/TAB/AGENT/LABEL/FOCUSED`).
- `run-skill-script herdr resolve <ref>` — **discovery only**: turn a soft ref (`right|left|up|down`, `tab:N`, `focused`, name / label / pane id) into `PANE_ID=...` plus who it is and a recent readback. when several panes match (e.g. right-upper + right-lower), lists all and exits non-zero so you must pick; exits non-zero when nothing matches.
- `run-skill-script herdr send-signed [--await-reply] <pane_id> "<message>"` — send into a **concrete pane id only** (e.g. `w1:p2`), with your signature, via the TUI-safe two-step delivery, then read back. soft refs rejected. default signature is **one-way** (receiver pushes nothing back; you wait + read yourself); `--await-reply` requests a pushed reply — see [sign the messages you send](#sign-the-messages-you-send).
- `run-skill-script herdr new-tab-run "<label>" "<command>"` — open a new tab in your workspace and run `<command>` in its root pane; prints `PANE_ID=<root>` for later pane-id actions.

run `... <name> --help` for details. set `HERDR_SEND_DELAY=<seconds>` before `send-signed` to widen the post-paste pause.

## talk to an existing agent before starting a new one

first decide what the task wants: **interact with an agent that is already running**, or **start something new**. when a task names an agent, server, or process already running in a pane (e.g. "ask the amp agent", "the agent on your right", "check what claude in the snowball workspace said"), locate it — see [discover](#discover) and [resolve](#resolve-a-positional-reference-discovery--pane-id) — take a concrete `PANE_ID`, then message or read **that id** only. start a fresh pane only when nothing suitable is already running.

## default placement: new tab, not split pane

when you need to start another agent, a server, a watcher, a log tail, or any long-lived command that should run in a pane separate from your own, **open a new tab in the current workspace** and run the command in that tab's root pane. do **not** split your own pane.

short synchronous tasks (a one-shot build, a single script, a quick command whose output you read inline) stay in your own pane — this rule does not apply.

reason: the user often watches herdr from a phone client where side-by-side panes are too cramped. a tab is one full-screen surface per task.

standard pattern (referenced by every recipe below): `run-skill-script herdr new-tab-run "<task>" "<command>"` opens a new tab in your workspace, runs `<command>` in its root pane, and prints `PANE_ID=<root>` for follow-up reads / waits. the raw form it wraps is `herdr tab create --workspace <ws> --no-focus --label <task>` to get the root pane, then `herdr pane run <root> <command>`.

split your own pane (`herdr pane split --current --direction <dir>`) only when the user explicitly asks for side-by-side, split, or "next to" placement. `--current` is shorthand for `--pane "$HERDR_PANE_ID"`.

## discover

```bash
herdr agent list        # only panes running an agent; each carries agent, agent_status, focused, pane_id, tab_id, workspace_id
herdr pane list         # all panes incl. plain shells; focused=true marks the pane the user is viewing
herdr workspace list    # each workspace carries label, number, focused
herdr tab list --workspace <ws>   # each tab carries number, label, focused, pane_count
```

`herdr agent get <target>` resolves one agent; `<target>` accepts an agent name, label, terminal id, or pane id (e.g. `herdr agent get amp`). when a name is shared by several panes (e.g. two `grok`), `get` returns an arbitrary one — disambiguate by workspace / tab (below), or give them stable names with `herdr agent rename <target> <name>`.

```bash
# locate by workspace label, then the agent running inside it
WS=$(herdr workspace list | jq -r '.result.workspaces[] | select(.label=="<label>") | .workspace_id')
herdr agent list | jq -r --arg ws "$WS" '.result.agents[] | select(.workspace_id==$ws and .agent=="<agent>") | .pane_id'
```

filter on `.agent=="<agent>"` for a specific running agent; on `.agent_status=="done"` for any pane that finished and has not been viewed; on `.focused==true` for the one the user is looking at.

## resolve a positional reference (discovery → pane id)

the user often points at an agent by where it sits — "the agent on your right", "the 3rd tab agent", "the one you're looking at". `run-skill-script herdr resolve <ref>` is the **fast path to a pane id**: it turns the soft ref into `PANE_ID=...`, who it is, and a recent readback. **stop after resolve and use that pane id for every send / wait / read** (see [target identity](#target-identity-resolve-soft-refs-act-only-on-pane-ids)).

`<ref>` is one of:

- `right | left | up | down` — same-tab panes that geometrically sit in that direction with overlap (all candidates listed). if several match (e.g. right column split into upper + lower), resolve **exits non-zero and prints every candidate** — you must choose a `PANE_ID`. if none in-tab, falls back to agents in the adjacent tab (left/right only; tabs ordered by `number`). up/down have no tab equivalent.
- `tab:N` — agents in the Nth tab, 1-based by tab number (multi-agent tab → multi exit).
- `focused` — the agent pane the user is currently viewing.
- a name, label, terminal id, or pane id — via `herdr agent get`, then `herdr pane get`.

do **not** pass soft refs to `send-signed` or keep re-resolving on each message. raw layout helpers if you need a custom pick: `herdr pane layout --pane "$HERDR_PANE_ID"` (rects for all panes), `herdr pane neighbor --direction <dir>` (single pick, no multi warning), `herdr agent list` / `tab list`.

optional: rename after you have the id so humans can find it again — still prefer the pane id for automation:

```bash
herdr agent rename <pane_id> reviewer
# later: herdr agent get reviewer | jq -r '.result.agent.pane_id'  → then send-signed that id
```

## read another pane

```bash
herdr pane read <pane> --source recent --lines 50
```

- `--source visible` — current viewport
- `--source recent` — recent scrollback as rendered
- `--source recent-unwrapped` — recent text with soft wraps joined; this is what `pane wait-output` matches against
- `--source detection` — plain-text snapshot used by agent detection; always stripped of ANSI
- `--format ansi` (or `--ansi`) — rendered ANSI snapshot, for TUI feedback loops

`herdr agent read <target> ...` takes the same flags and accepts an agent name / label. to watch a pane robustly: read what is already there, `pane wait-output` for the next expected line, then read again with `--source recent-unwrapped` (the same transcript the waiter matched).

**alternate-screen caveat**: full-screen agents (claude code, opencode) render in the terminal's alternate screen, which does not enter scrollback. if increasing `--lines` returns no additional output, the pane is likely using the alternate screen and those rows are no longer retained. fallback: ask the agent to write its complete response to a file and reply with only the path, then read the file directly.

## send text or keys to a pane

you run these commands yourself with your shell tool. the deliverable is the message arriving in the target pane — not the command text. when a task says to reply or report "via `herdr pane run`", execute it; do not emit the command as paste-ready text for someone else to run.

```bash
herdr pane send-text <pane_id> "<text>"    # text only, no Enter
herdr pane send-keys <pane_id> Enter       # keys only
herdr pane run <pane_id> "<command>"       # text + Enter in one request
```

always pass a **pane id** here (from resolve / list / create), not `right` or a shared agent name. `herdr agent prompt <pane_id> "<text>"` and `herdr agent send-keys <pane_id> <key>...` accept the same id form and are fine once you already hold it; if you only have a name, map to pane id first (`herdr agent get <name> | jq -r '.result.agent.pane_id'`) and confirm uniqueness.

### caveat: some TUI composers swallow the trailing Enter of `pane run`

`pane run` writes the text (bracketed paste) and the Enter in one request. some agent TUIs debounce paste input and treat an Enter arriving in the same burst as part of the pasted content, so the prompt is only filled into the input box, never submitted. observed with the cursor agent composer; claude and codex are fine.

`send-signed` already delivers via this two-step. for a custom send into such a pane — or whenever a sent prompt sits unsubmitted — split it yourself so the Enter arrives as a standalone key event:

```bash
herdr pane send-text <pane> "<message>"
sleep 1                                 # let the composer finish processing the paste
herdr pane send-keys <pane> Enter
```

after sending, verify submission with `pane read` (the prompt should appear in the transcript, not in the input box); if it is still sitting in the input box, send Enter again.

## sign the messages you send

every message you send into another agent's pane must carry your identity, so the receiver knows who is asking. `run-skill-script herdr send-signed [--await-reply] <pane_id> "<message>"` does this for you: it **requires a concrete pane id** (soft refs rejected), appends the signature built in-process from your `HERDR_PANE_ID`, delivers via the TUI-safe two-step, and reads the pane back. you pass plain text only — there is no placeholder to expand, so a sent message can never go out with the literal signature template unfilled.

the signature also declares **how the reply travels** — pick exactly one mode per message, never both:

- **one-way (default)** — the appended line is `- one-way message from herdr pane <id>: the sender reads your answer in this pane - do not send anything into pane <id>`. you collect the answer yourself: `herdr agent wait <pane_id> --until idle|done`, then `herdr pane read`. this is the **only** mode when your own pane has no prompt input box (one-shot / non-TUI agent): input pushed into such a pane cannot be consumed and floods the shell when the process exits.
- **push-reply (`--await-reply`)** — the appended line becomes `- from herdr pane <id>: the sender ends its turn after this message; when done, reply by running in bash: herdr pane run <id> "<reply>"`, so the receiver's reply lands in your pane as your next prompt. use it only when both hold: you are an interactive REPL agent with a prompt input box, **and** you end your turn right after sending. never combine it with `agent wait` + `pane read` on the same message — you would receive the answer twice (once read, once pushed) and work the same reply again. the script's own readback after sending is a submission check, not the answer — do not treat receiver output seen in it as the reply.

**when you are the receiver**: act only on the signature actually present. **push a reply only when the signature explicitly declares the sender ends its turn and carries the reply command** (the `--await-reply` form above); an older or hand-written signature that merely embeds a reply command carries no push authorization — treat it as one-way. before pushing, verify the sender pane can take input: a fresh `herdr agent get <sender pane>` must show status `idle` (if `working`, run `herdr agent wait <pane> --until idle` first); `done`, `blocked`, `unknown`, or not found — do not push into that pane, finish and report in your own pane instead. a one-way signature — finish your turn, answer in your own pane, and send **nothing** into the sender's pane; the sender is reading your output. never invent a reply channel for a message that did not include one. to put a name to a bare sender pane: `herdr agent get <pane> | jq -r '.result.agent | {agent, cwd, workspace_id}'`.

for a custom or unsigned send, use the raw `herdr pane run` / `send-text` commands above and append the signature line yourself, following the same two modes.

## wait for output

block until specific text appears. matching against `recent` uses unwrapped text, so pane width and soft wraps do not break matches.

```bash
herdr pane wait-output <pane> --match "ready on port 3000" --timeout 30000
herdr pane wait-output <pane> --match "server.*ready" --regex --timeout 30000
```

exit code is `1` on timeout.

## wait for an agent status

block until another agent reaches a status. prefer a **pane id** you already resolved (same hard rule as send). herdr also accepts name / label / terminal id, but names can collide — pin the id first.

**default: do not add `--until` unless you specifically need one state.** without `--until`, `herdr agent wait` matches `idle`, `done`, or `blocked` — this covers both REPL agents returning to idle and one-shot agents finishing. only constrain it when you are sure which status matters:

- **REPL agents** (claude, codex — they keep accepting input) return to `idle` after each reply:

  ```bash
  herdr agent wait <pane_id> --until idle --timeout 60000
  ```

- **one-shot agents** (script-like, exit when finished) reach `done` and stay until the pane is viewed; also use `done` to find any finished-but-unread pane:

  ```bash
  herdr agent wait <pane_id> --until done --timeout 120000
  ```

- `blocked` works the same way for agents paused awaiting input.

## recipes

`$NEW_PANE` is the `PANE_ID` printed by `new-tab-run` (see **default placement**); `<pane>` is an existing pane whose id you already have.

### run a command and wait until it is ready

```bash
herdr pane run "$NEW_PANE" "npm run dev"
herdr pane wait-output "$NEW_PANE" --match "ready" --timeout 30000
herdr pane read "$NEW_PANE" --source recent --lines 20
```

same shape for tests: run `cargo test`, `pane wait-output --match "test result"`, then read.

### spawn a new agent and give it a task

prefer `agent start` — it waits for herdr to detect the agent and mark it ready, so you don't have to guess when the prompt is available. use the **pane id** from `new-tab-run` for the follow-up send:

```bash
herdr agent start reviewer --kind claude --pane "$NEW_PANE" --timeout 30000
run-skill-script herdr send-signed "$NEW_PANE" "review the test coverage in src/api/"
# add --await-reply if you end your turn now and want the result pushed back as your next prompt
```

`--kind` selects a supported agent (`claude`, `codex`, `grok`, `amp`, etc.); `--timeout` must be > 3000 ms. arguments after `--` pass through to the executable. the raw fallback is `pane run "$NEW_PANE" "claude"` then `pane wait-output --match ">" --timeout 15000`, but it cannot confirm agent readiness.

### message a running agent and read its reply

discover once, then act only on the pane id (no new pane, no re-resolve of `right`):

```bash
run-skill-script herdr resolve right                 # or name / tab:N / focused — read PANE_ID=
# if multi-candidate: pick one from the list
PANE=<pane_id from PANE_ID=...>
run-skill-script herdr send-signed "$PANE" "<question>"   # one-way: no reply gets pushed back
herdr agent wait "$PANE" --timeout 120000                # default: idle/done/blocked
herdr pane read "$PANE" --source recent --lines 100
```

push mode instead — you are a REPL agent and will end your turn right after asking:

```bash
run-skill-script herdr send-signed --await-reply "$PANE" "<question>"
```

then end your turn; the reply arrives as your next prompt. do **not** also `agent wait` + `pane read` this message.

when you don't need the signature, `agent prompt --wait` combines submission and waiting — still use the pane id:

```bash
herdr agent prompt "$PANE" "<question>" --wait --until idle --timeout 120000
herdr pane read "$PANE" --source recent --lines 100
```

to observe an agent without asking — wait for it to finish its turn, then read — just skip the `send-signed` line above.

## notes

- output formats: `herdr agent`/`workspace`/`tab` subcommands, `pane list`/`get`/`current`/`neighbor`/`edges`/`layout`/`split`, `pane wait-output`, `agent wait`, `agent prompt`, `agent send-keys`, `agent start` print json. `pane read` and `agent read` print text. `pane send-text`, `pane send-keys`, `pane run` print nothing on success.
- `pane neighbor` returns **at most one** `.result.neighbor.neighbor_pane_id` (omitted when none). it does not list all panes in that direction — use `resolve` or `pane layout` when the side may have been split.
- use `pane read` for output that already exists; use `pane wait-output` for output expected next.
- send-signed / mutate paths: concrete `pane_id` only. resolve: soft refs OK.
