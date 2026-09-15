# herdr — pane / tab / workspace lifecycle

## When to Use

low-frequency management commands. the common path — discover panes, open a tab via the **default placement** standard pattern, then read / send / wait — lives in SKILL.md. read this only when you need to focus / rename / close tabs, manage workspaces, or split / close panes.

## tab focus / rename / close

```bash
herdr tab focus <tab>
herdr tab rename <tab> <label>
herdr tab close <tab>
```

## workspace management

```bash
herdr workspace create [--cwd <path>] [--label <text>] [--no-focus]   # → result.workspace + result.tab + result.root_pane
herdr workspace focus <ws>
herdr workspace rename <ws> <label>
herdr workspace close <ws>
```

without `--label`, a new workspace's name follows its first tab's root pane — repo name if it's a git repo, otherwise the root pane's cwd folder name.

## split a pane (explicit user request only)

```bash
herdr pane split <pane> --direction right --no-focus    # → result.pane.pane_id
```

use `--direction down` to stack the new pane below the current one. split only when the user explicitly asks for side-by-side / "next to" placement; otherwise open a new tab (see SKILL.md "default placement").

## close a pane

```bash
herdr pane close <pane>
```
