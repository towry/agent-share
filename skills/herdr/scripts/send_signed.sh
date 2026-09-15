#!/usr/bin/env bash
# send_signed.sh — send a signed message into another pane, safely.
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  cat <<'EOF'
Usage: run-skill-script herdr send-signed [--await-reply] <pane_id> "<message>"
Send <message> into <pane_id> with your identity signature appended, using the
TUI-composer-safe two-step delivery (send-text, pause, Enter), then read the
pane back so you can confirm it landed.

The signature declares how the reply travels - pick exactly one mode:

Default (no flag) is ONE-WAY: the signature names your pane and tells the
receiver to push nothing back. You read the receiver's output yourself
(herdr agent wait <pane_id> ...; herdr pane read <pane_id> ...). Always use
this mode when your own pane has no prompt input box (one-shot / non-TUI
agent): input pushed into such a pane cannot be consumed and floods the
shell when the process exits.

--await-reply appends a reply command instead: the receiver is told to run
`herdr pane run <your pane> "<reply>"` when done, so its reply arrives as
your next prompt. Use it only when BOTH hold: you are an interactive REPL
agent with a prompt input box, and you end your turn right after sending.
Do not also agent-wait + pane-read the same message - that receives the
answer twice (once read, once pushed) and triggers duplicate work.

<pane_id> must be a concrete public pane id (e.g. w1:p2). Soft refs
(right/left/up/down, tab:N, focused) and agent names/labels are rejected —
discover first with `run-skill-script herdr resolve <ref>`, then pass the
printed PANE_ID here. Geometry re-resolves after splits and can retarget.

The signature line is assembled in-process from $HERDR_PANE_ID — you pass plain
text only, with no placeholder to fill. Override the post-paste pause with
HERDR_SEND_DELAY (seconds, default 1).

Inspect the printed readback to confirm submission: a debounced TUI composer can
swallow the Enter and leave the message sitting in the input box. If so, send
Enter again (herdr pane send-keys <pane_id> Enter) or retry with a larger
HERDR_SEND_DELAY.
EOF
  exit 0
fi

require_herdr_env

await_reply=0
if [ "${1:-}" = "--await-reply" ]; then
  await_reply=1
  shift
fi

if [ $# -lt 2 ]; then
  echo "error: need <pane_id> and <message>." >&2
  echo "usage: run-skill-script herdr send-signed [--await-reply] <pane_id> \"<message>\"" >&2
  echo "hint: run-skill-script herdr resolve <ref>  # then pass the printed PANE_ID" >&2
  exit 2
fi

pane=$(require_concrete_pane_id "$1")
message="$2"

# Signature is built here from $HERDR_PANE_ID and declares the reply channel:
# one-way by default, push-reply only with --await-reply. The inner "<reply>"
# stays a literal template for the receiver to fill — it is not expanded.
if [ "$await_reply" = 1 ]; then
  sig="- from herdr pane $HERDR_PANE_ID: the sender ends its turn after this message; when done, reply by running in bash: herdr pane run $HERDR_PANE_ID \"<reply>\""
else
  sig="- one-way message from herdr pane $HERDR_PANE_ID: the sender reads your answer in this pane - do not send anything into pane $HERDR_PANE_ID"
fi

body="$message

$sig"

# TUI-composer-safe delivery: paste the text, let the composer settle, then send
# Enter as a standalone key event.
herdr pane send-text "$pane" "$body"
sleep "${HERDR_SEND_DELAY:-1}"
herdr pane send-keys "$pane" Enter

echo "SENT_TO=$pane"
if [ "$await_reply" = 1 ]; then
  echo "NOTE: readback below is a submission check only - the reply arrives later as your next pushed prompt; do not wait for or read it now."
fi
echo "--- recent (5 lines) ---"
herdr pane read "$pane" --source recent --lines 5
