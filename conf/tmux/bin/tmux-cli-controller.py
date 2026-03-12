#!/usr/bin/env python3
"""
Tmux CLI Controller - standalone version (no external deps)
"""

import subprocess
import time
import re
import hashlib
import json
import os
import sys
from typing import Optional, List, Dict, Tuple, Union

# Unit Separator - safe delimiter for tmux format strings (pane_title etc. may contain |)
TMUX_SEP = "\x1f"


def get_full_command(pane_pid: str, fallback: str) -> str:
    """Get full command line of a pane's foreground process via its PID."""
    if not pane_pid:
        return fallback
    try:
        result = subprocess.run(['pgrep', '-P', pane_pid], capture_output=True, text=True)
        child_pid = result.stdout.strip().split('\n')[0]
        if not child_pid:
            return fallback
        ps_result = subprocess.run(['ps', '-o', 'command=', '-p', child_pid], capture_output=True, text=True)
        cmd = ps_result.stdout.strip()
        if not cmd:
            return fallback
        # Strip nix store prefix for readability
        return re.sub(r'/nix/store/[^/]+-[^/]+/bin/', '', cmd)
    except Exception:
        return fallback


class TmuxCLIController:
    """Controller for interacting with CLI applications in tmux panes."""

    def __init__(self, session_name: Optional[str] = None, window_name: Optional[str] = None):
        self.session_name = session_name
        self.window_name = window_name
        self.target_pane = None

    def _run_tmux_command(self, command: List[str]) -> Tuple[str, int]:
        result = subprocess.run(['tmux'] + command, capture_output=True, text=True)
        return result.stdout.strip(), result.returncode

    def get_current_session(self) -> Optional[str]:
        output, code = self._run_tmux_command(['display-message', '-p', '#{session_name}'])
        return output if code == 0 else None

    def get_current_window(self) -> Optional[str]:
        output, code = self._run_tmux_command(['display-message', '-p', '#{window_name}'])
        return output if code == 0 else None

    def get_current_pane(self) -> Optional[str]:
        output, code = self._run_tmux_command(['display-message', '-p', '#{pane_id}'])
        return output if code == 0 else None

    def get_current_pane_index(self) -> Optional[str]:
        output, code = self._run_tmux_command(['display-message', '-p', '#{pane_index}'])
        return output if code == 0 else None

    def format_pane_identifier(self, pane_id: str) -> str:
        if not pane_id:
            return pane_id
        try:
            session_output, session_code = self._run_tmux_command(['display-message', '-t', pane_id, '-p', '#{session_name}'])
            window_output, window_code = self._run_tmux_command(['display-message', '-t', pane_id, '-p', '#{window_index}'])
            pane_output, pane_code = self._run_tmux_command(['display-message', '-t', pane_id, '-p', '#{pane_index}'])
            if (session_code == 0 and window_code == 0 and pane_code == 0 and
                session_output and window_output and pane_output):
                return f"{session_output}:{window_output}.{pane_output}"
            return pane_id
        except:
            return pane_id

    def resolve_pane_identifier(self, identifier: str) -> Optional[str]:
        if not identifier:
            return None
        identifier = str(identifier)
        if identifier.startswith('%'):
            return identifier
        if identifier.isdigit():
            panes = self.list_panes()
            for pane in panes:
                if pane['index'] == identifier:
                    return pane['id']
            return None
        if ':' in identifier and '.' in identifier:
            try:
                session_window, pane_index = identifier.rsplit('.', 1)
                session, window = session_window.split(':', 1)
                output, code = self._run_tmux_command([
                    'display-message', '-t', f'{session}:{window}.{pane_index}', '-p', '#{pane_id}'
                ])
                return output if code == 0 else None
            except:
                return None
        return None

    def get_current_window_id(self) -> Optional[str]:
        current_pane = os.environ.get('TMUX_PANE')
        if current_pane:
            output, code = self._run_tmux_command(['display-message', '-t', current_pane, '-p', '#{window_id}'])
            return output if code == 0 else None
        output, code = self._run_tmux_command(['display-message', '-p', '#{window_id}'])
        return output if code == 0 else None

    def list_sessions(self) -> List[Dict[str, str]]:
        """List all tmux sessions."""
        output, code = self._run_tmux_command([
            'list-sessions', '-F',
            f'#{{session_name}}{TMUX_SEP}#{{session_id}}{TMUX_SEP}#{{session_windows}}{TMUX_SEP}#{{session_attached}}{TMUX_SEP}#{{session_created}}'
        ])
        if code != 0:
            return []
        current = self.get_current_session()
        sessions = []
        for line in output.split('\n'):
            if not line:
                continue
            parts = line.split(TMUX_SEP)
            sessions.append({
                'name': parts[0],
                'id': parts[1],
                'windows': parts[2],
                'attached': parts[3] == '1',
                'created': parts[4],
                'current': parts[0] == current,
            })
        return sessions

    def create_session(self, name: str, command: Optional[str] = None, detached: bool = True,
                       cwd: Optional[str] = None) -> Optional[str]:
        """Create a new tmux session. Returns session name or None."""
        if cwd:
            if not os.path.isabs(cwd):
                raise ValueError(f"cwd must be an absolute path, got: {cwd}")
            if not os.path.isdir(cwd):
                raise ValueError(f"cwd does not exist or is not a directory: {cwd}")
        cmd = ['new-session', '-s', name, '-P', '-F', '#{session_name}']
        if detached:
            cmd.insert(1, '-d')
        if cwd:
            cmd.extend(['-c', cwd])
        if command:
            cmd.append(command)
        output, code = self._run_tmux_command(cmd)
        return output if code == 0 else None

    def kill_session(self, name: str) -> bool:
        """Kill a session. Refuses to kill the current session."""
        current = self.get_current_session()
        if current and name == current:
            raise ValueError(f"Cannot kill current session '{name}'")
        _, code = self._run_tmux_command(['kill-session', '-t', name])
        return code == 0

    def create_window(self, name: Optional[str] = None, command: Optional[str] = None,
                      session: Optional[str] = None, cwd: Optional[str] = None,
                      detached: bool = True) -> Optional[str]:
        """Create a new window. Returns pane_id of the new window or None."""
        if cwd:
            if not os.path.isabs(cwd):
                raise ValueError(f"cwd must be an absolute path, got: {cwd}")
            if not os.path.isdir(cwd):
                raise ValueError(f"cwd does not exist or is not a directory: {cwd}")
        target_session = session or self.session_name or self.get_current_session()
        cmd = ['new-window', '-P', '-F', '#{pane_id}']
        if detached:
            cmd.append('-d')
        if target_session:
            cmd.extend(['-t', target_session])
        if cwd:
            cmd.extend(['-c', cwd])
        if name:
            cmd.extend(['-n', name])
        if command:
            cmd.append(command)
        output, code = self._run_tmux_command(cmd)
        return output if code == 0 and output else None

    def list_panes(self, session: Optional[str] = None) -> List[Dict[str, str]]:
        """List panes. Defaults to current session if no session given."""
        target_session = session or self.session_name or self.get_current_session()
        if not target_session:
            return []

        fmt = (f'#{{pane_id}}{TMUX_SEP}#{{pane_index}}{TMUX_SEP}#{{pane_title}}{TMUX_SEP}'
               f'#{{pane_active}}{TMUX_SEP}#{{pane_width}}x#{{pane_height}}{TMUX_SEP}'
               f'#{{pane_current_command}}{TMUX_SEP}#{{window_index}}{TMUX_SEP}'
               f'#{{window_name}}{TMUX_SEP}#{{pane_pid}}{TMUX_SEP}#{{pane_current_path}}')
        cmd = ['list-panes', '-s', '-t', target_session, '-F', fmt]

        output, code = self._run_tmux_command(cmd)
        if code != 0:
            return []

        panes = []
        for line in output.split('\n'):
            if not line:
                continue
            parts = line.split(TMUX_SEP)
            pane_id = parts[0]
            short_cmd = parts[5] if len(parts) > 5 else ''
            pane_pid = parts[8] if len(parts) > 8 else ''
            cwd = parts[9] if len(parts) > 9 else ''
            entry = {
                'id': pane_id,
                'index': parts[1],
                'title': parts[2],
                'active': parts[3] == '1',
                'size': parts[4],
                'command': get_full_command(pane_pid, short_cmd),
                'formatted_id': self.format_pane_identifier(pane_id),
                'cwd': cwd,
                'window_index': parts[6] if len(parts) > 6 else '',
                'window_name': parts[7] if len(parts) > 7 else '',
            }
            panes.append(entry)
        return panes

    def create_pane(self, vertical: bool = True, size: Optional[int] = None,
                   start_command: Optional[str] = None) -> Optional[str]:
        current_window_id = self.get_current_window_id()
        base_cmd = ['split-window']
        if current_window_id:
            base_cmd.extend(['-t', current_window_id])
        if vertical:
            base_cmd.append('-h')
        else:
            base_cmd.append('-v')

        for size_flag in (['-l', f'{size}%'], ['-p', str(size)]) if size else [[]]:
            cmd = base_cmd.copy()
            if size_flag:
                cmd.extend(size_flag)
            cmd.extend(['-P', '-F', '#{pane_id}'])
            if start_command:
                cmd.append(start_command)
            output, code = self._run_tmux_command(cmd)
            if code == 0 and output and output.startswith('%'):
                self.target_pane = output
                return output
        return None

    def select_pane(self, pane_id: Optional[str] = None, pane_index: Optional[int] = None):
        if pane_id:
            self.target_pane = pane_id
        elif pane_index is not None:
            panes = self.list_panes()
            for pane in panes:
                if int(pane['index']) == pane_index:
                    self.target_pane = pane['id']
                    break

    def send_keys(self, text: str, pane_id: Optional[str] = None, enter: bool = True,
                  delay_enter: Union[bool, float] = True) -> Tuple[bool, str]:
        """Send text to a tmux pane.

        Args:
            text: Text to send
            pane_id: Target pane ID (uses self.target_pane if None)
            enter: Whether to send Enter key after text
            delay_enter: If True/float, delay before sending Enter to avoid race conditions.
                         Default 0.1s. Set to False to send Enter immediately with text.

        Returns:
            Tuple of (success: bool, error_message: str)

        Note:
            Uses -l flag to send text literally. Without -l, tmux interprets sequences
            like '[' (copy mode), ':' (command mode), 'C-b' (prefix) as special keys,
            which can leave the pane stuck in unexpected modes.
        """
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")

        if enter and delay_enter:
            output, code = self._run_tmux_command(['send-keys', '-l', '-t', target, text])
            if code != 0:
                return False, output or f"send-keys failed for pane {target}"
            delay = 0.1 if isinstance(delay_enter, bool) else float(delay_enter)
            time.sleep(delay)
            output, code = self._run_tmux_command(['send-keys', '-t', target, 'Enter'])
            if code != 0:
                return False, output or f"send Enter failed for pane {target}"
        else:
            cmd = ['send-keys', '-l', '-t', target, text]
            if enter:
                cmd.append('Enter')
            output, code = self._run_tmux_command(cmd)
            if code != 0:
                return False, output or f"send-keys failed for pane {target}"
        return True, ""

    def capture_pane(self, pane_id: Optional[str] = None, lines: Optional[int] = None) -> str:
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")
        cmd = ['capture-pane', '-t', target, '-p']
        if lines:
            cmd.extend(['-S', f'-{lines}'])
        output, _ = self._run_tmux_command(cmd)
        return output

    def wait_for_prompt(self, prompt_pattern: str, pane_id: Optional[str] = None,
                       timeout: int = 10, check_interval: float = 0.5) -> bool:
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")
        pattern = re.compile(prompt_pattern)
        start_time = time.time()
        while time.time() - start_time < timeout:
            content = self.capture_pane(target, lines=50)
            if pattern.search(content):
                return True
            time.sleep(check_interval)
        return False

    def wait_for_idle(self, pane_id: Optional[str] = None, idle_time: float = 2.0,
                     check_interval: float = 0.5, timeout: Optional[int] = None) -> bool:
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")
        start_time = time.time()
        last_change_time = time.time()
        last_hash = ""
        while True:
            if timeout and (time.time() - start_time > timeout):
                return False
            content = self.capture_pane(target)
            content_hash = hashlib.md5(content.encode()).hexdigest()
            if content_hash != last_hash:
                last_hash = content_hash
                last_change_time = time.time()
            elif time.time() - last_change_time >= idle_time:
                return True
            time.sleep(check_interval)

    def kill_pane(self, pane_id: Optional[str] = None):
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")
        if pane_id is not None:
            current_pane = self.get_current_pane()
            if current_pane and target == current_pane:
                raise ValueError("Error: Cannot kill own pane!")
        self._run_tmux_command(['kill-pane', '-t', target])
        if target == self.target_pane:
            self.target_pane = None

    def send_interrupt(self, pane_id: Optional[str] = None):
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")
        self._run_tmux_command(['send-keys', '-t', target, 'C-c'])

    def send_escape(self, pane_id: Optional[str] = None):
        target = pane_id or self.target_pane
        if not target:
            raise ValueError("No target pane specified")
        self._run_tmux_command(['send-keys', '-t', target, 'Escape'])

    def launch_cli(self, command: str, vertical: bool = True, size: int = 50) -> Optional[Tuple[str, str]]:
        """Launch a command in a new pane. Returns (raw_pane_id, formatted_pane_id) or None."""
        pane_id = self.create_pane(vertical=vertical, size=size, start_command=command)
        if pane_id:
            return (pane_id, self.format_pane_identifier(pane_id))
        return None


class RemoteTmuxController:
    """Remote controller that manages a dedicated tmux session and windows."""

    def __init__(self, session_name: str = "remote-cli-session"):
        self.session_name = session_name
        self.target_window: Optional[str] = None
        print(f"Note: tmux-cli is running outside tmux. Managing windows in session '{session_name}'.")
        self._ensure_session()

    def _run_tmux(self, args: List[str]) -> Tuple[str, int]:
        result = subprocess.run(['tmux'] + args, capture_output=True, text=True)
        return result.stdout.strip(), result.returncode

    def _ensure_session(self) -> None:
        _, code = self._run_tmux(['has-session', '-t', self.session_name])
        if code != 0:
            self._run_tmux(['new-session', '-d', '-s', self.session_name, '-P', '-F', '#{session_name}'])
            self.target_window = f"{self.session_name}:0"
        elif not self.target_window:
            win, code2 = self._run_tmux(['display-message', '-p', '-t', self.session_name, '#{session_name}:#{window_index}'])
            if code2 == 0 and win:
                self.target_window = win

    def _window_target(self, pane: Optional[str]) -> str:
        self._ensure_session()
        if pane is None:
            if self.target_window:
                return self.target_window
            win, code = self._run_tmux(['display-message', '-p', '-t', self.session_name, '#{session_name}:#{window_index}'])
            if code == 0 and win:
                self.target_window = win
                return win
            return f"{self.session_name}:0"
        if isinstance(pane, str) and pane.isdigit():
            return f"{self.session_name}:{pane}"
        return pane

    def list_panes(self) -> List[Dict[str, str]]:
        self._ensure_session()
        out, code = self._run_tmux([
            'list-windows', '-t', self.session_name,
            '-F', f'#{{window_index}}{TMUX_SEP}#{{window_name}}{TMUX_SEP}#{{window_active}}{TMUX_SEP}#{{window_width}}x#{{window_height}}'
        ])
        if code != 0 or not out:
            return []
        windows = []
        for line in out.split('\n'):
            if not line:
                continue
            idx, name, active, size = line.split(TMUX_SEP)
            windows.append({
                'id': f"{self.session_name}:{idx}",
                'index': idx,
                'title': name,
                'active': active == '1',
                'size': size
            })
        return windows

    def launch_cli(self, command: str, name: Optional[str] = None) -> Optional[str]:
        self._ensure_session()
        args = ['new-window', '-t', self.session_name, '-P', '-F', '#{session_name}:#{window_index}']
        if name:
            args.extend(['-n', name])
        if command:
            args.append(command)
        out, code = self._run_tmux(args)
        if code == 0 and out:
            self.target_window = out
            return out
        return None

    def send_keys(self, text: str, pane_id: Optional[str] = None, enter: bool = True,
                  delay_enter: Union[bool, float] = True) -> Tuple[bool, str]:
        """Send text to a tmux window/pane.

        Args:
            text: Text to send
            pane_id: Target pane/window ID
            enter: Whether to send Enter key after text
            delay_enter: If True/float, delay before sending Enter to avoid race conditions.
                         Default 0.1s. Set to False to send Enter immediately with text.

        Returns:
            Tuple of (success: bool, error_message: str)

        Note:
            Uses -l flag to send text literally. Without -l, tmux interprets sequences
            like '[' (copy mode), ':' (command mode), 'C-b' (prefix) as special keys,
            which can leave the pane stuck in unexpected modes.
        """
        if not text:
            return True, ""
        target = self._window_target(pane_id)
        if enter and delay_enter:
            output, code = self._run_tmux(['send-keys', '-l', '-t', target, text])
            if code != 0:
                return False, output or f"send-keys failed for pane {target}"
            delay = 0.1 if isinstance(delay_enter, bool) else float(delay_enter)
            time.sleep(delay)
            output, code = self._run_tmux(['send-keys', '-t', target, 'Enter'])
            if code != 0:
                return False, output or f"send Enter failed for pane {target}"
        else:
            args = ['send-keys', '-l', '-t', target, text]
            if enter:
                args.append('Enter')
            output, code = self._run_tmux(args)
            if code != 0:
                return False, output or f"send-keys failed for pane {target}"
        return True, ""

    def capture_pane(self, pane_id: Optional[str] = None, lines: Optional[int] = None) -> str:
        target = self._window_target(pane_id)
        args = ['capture-pane', '-t', target, '-p']
        if lines:
            args.extend(['-S', f'-{lines}'])
        out, _ = self._run_tmux(args)
        return out

    def wait_for_idle(self, pane_id: Optional[str] = None, idle_time: float = 2.0,
                     check_interval: float = 0.5, timeout: Optional[int] = None) -> bool:
        target = self._window_target(pane_id)
        start_time = time.time()
        last_change = time.time()
        last_hash = ""
        while True:
            if timeout is not None and (time.time() - start_time) > timeout:
                return False
            content, _ = self._run_tmux(['capture-pane', '-t', target, '-p'])
            h = hashlib.md5(content.encode()).hexdigest()
            if h != last_hash:
                last_hash = h
                last_change = time.time()
            elif (time.time() - last_change) >= idle_time:
                return True
            time.sleep(check_interval)

    def send_interrupt(self, pane_id: Optional[str] = None):
        target = self._window_target(pane_id)
        self._run_tmux(['send-keys', '-t', target, 'C-c'])

    def send_escape(self, pane_id: Optional[str] = None):
        target = self._window_target(pane_id)
        self._run_tmux(['send-keys', '-t', target, 'Escape'])

    def kill_window(self, window_id: Optional[str] = None):
        target = self._window_target(window_id)
        self._run_tmux(['kill-window', '-t', target])
        if self.target_window == target:
            self.target_window = None

    def attach_session(self):
        self._ensure_session()
        subprocess.run(['tmux', 'attach-session', '-t', self.session_name])

    def cleanup_session(self):
        self._run_tmux(['kill-session', '-t', self.session_name])
        self.target_window = None

    def list_windows(self) -> List[Dict[str, str]]:
        self._ensure_session()
        out, code = self._run_tmux(['list-windows', '-t', self.session_name, '-F',
                                    f'#{{window_index}}{TMUX_SEP}#{{window_name}}{TMUX_SEP}#{{window_active}}'])
        if code != 0 or not out:
            return []
        windows = []
        for line in out.split('\n'):
            if not line:
                continue
            idx, name, active = line.split(TMUX_SEP)
            pane_out, _ = self._run_tmux(['display-message', '-p', '-t', f'{self.session_name}:{idx}', '#{pane_id}'])
            windows.append({'index': idx, 'name': name, 'active': active == '1', 'pane_id': pane_out or ''})
        return windows

    def _resolve_pane_id(self, pane: Optional[str]) -> Optional[str]:
        return self._window_target(pane)


class CLI:
    """Unified CLI interface that auto-detects tmux environment."""

    def __init__(self, session: Optional[str] = None):
        self.in_tmux = bool(os.environ.get('TMUX'))
        if self.in_tmux:
            self.controller = TmuxCLIController()
            self.mode = 'local'
        else:
            session_name = session or "remote-cli-session"
            self.controller = RemoteTmuxController(session_name=session_name)
            self.mode = 'remote'

    def status(self):
        if not self.in_tmux:
            print("Not currently in tmux")
            if hasattr(self.controller, 'session_name'):
                print(f"Remote session: {self.controller.session_name}")
            return
        session = self.controller.get_current_session()
        window = self.controller.get_current_window()
        pane_index = self.controller.get_current_pane_index()
        if session and window and pane_index:
            print(f"Current location: {session}:{window}.{pane_index}")
        else:
            print("Could not determine current tmux location")
        panes = self.controller.list_panes()
        if panes:
            print(f"\nPanes in current window:")
            for pane in panes:
                active_marker = " *" if pane['active'] else "  "
                command = pane.get('command', '')
                title = pane.get('title', '')
                print(f"{active_marker} {pane['formatted_id']:15} {command:20} {title}")

    def list_panes(self, session: Optional[str] = None):
        panes = self.controller.list_panes(session=session)
        print(json.dumps(panes, indent=2))

    def list_sessions(self):
        sessions = self.controller.list_sessions()
        print(json.dumps(sessions, indent=2))

    def create_session(self, name: str, command: Optional[str] = None, cwd: Optional[str] = None):
        try:
            result = self.controller.create_session(name, command=command, cwd=cwd)
            if result:
                print(f"Created session: {result}")
            else:
                print(f"Failed to create session '{name}'", file=sys.stderr)
        except ValueError as e:
            print(str(e), file=sys.stderr)

    def kill_session(self, name: str):
        try:
            if self.controller.kill_session(name):
                print(f"Killed session: {name}")
            else:
                print(f"Failed to kill session '{name}'", file=sys.stderr)
        except ValueError as e:
            print(str(e), file=sys.stderr)

    def create_window(self, name: Optional[str] = None, command: Optional[str] = None,
                      session: Optional[str] = None, cwd: Optional[str] = None,
                      detached: bool = True):
        try:
            pane_id = self.controller.create_window(name=name, command=command, session=session, cwd=cwd, detached=detached)
            if pane_id:
                formatted = self.controller.format_pane_identifier(pane_id)
                print(f"Created window in pane {pane_id} ({formatted})")
            else:
                print("Failed to create window", file=sys.stderr)
        except ValueError as e:
            print(str(e), file=sys.stderr)

    def launch(self, command: str, vertical: bool = True, size: int = 50, name: Optional[str] = None):
        if self.mode == 'local':
            result = self.controller.launch_cli(command, vertical=vertical, size=size)
            if result:
                raw_id, formatted_id = result
                # Output both raw pane ID (stable, e.g., %886) and formatted ID (volatile, e.g., session:3.2)
                print(f"Launched '{command}' in pane {raw_id} ({formatted_id})")
                return raw_id
            else:
                print(f"Failed to launch '{command}'")
                return None
        else:
            pane_id = self.controller.launch_cli(command, name=name)
            print(f"Launched '{command}' in window: {pane_id}")
            return pane_id

    def send(self, text: str, pane: Optional[str] = None, enter: bool = True,
             delay_enter: Union[bool, float] = True) -> bool:
        if self.mode == 'local':
            if pane:
                resolved_pane = self.controller.resolve_pane_identifier(pane)
                if resolved_pane:
                    self.controller.select_pane(pane_id=resolved_pane)
                else:
                    print(f"Could not resolve pane identifier: {pane}", file=sys.stderr)
                    return False
            success, error = self.controller.send_keys(text, enter=enter, delay_enter=delay_enter)
            if not success:
                print(f"Error: {error}", file=sys.stderr)
                return False
        else:
            success, error = self.controller.send_keys(text, pane_id=pane, enter=enter, delay_enter=delay_enter)
            if not success:
                print(f"Error: {error}", file=sys.stderr)
                return False
        print("Text sent")
        return True

    def capture(self, pane: Optional[str] = None, lines: Optional[int] = None):
        if self.mode == 'local':
            if pane:
                resolved_pane = self.controller.resolve_pane_identifier(pane)
                if resolved_pane:
                    self.controller.select_pane(pane_id=resolved_pane)
                else:
                    print(f"Could not resolve pane identifier: {pane}")
                    return ""
            content = self.controller.capture_pane(lines=lines)
        else:
            content = self.controller.capture_pane(pane_id=pane, lines=lines)
        return content

    def interrupt(self, pane: Optional[str] = None):
        if self.mode == 'local':
            if pane:
                resolved_pane = self.controller.resolve_pane_identifier(pane)
                if resolved_pane:
                    self.controller.select_pane(pane_id=resolved_pane)
                else:
                    print(f"Could not resolve pane identifier: {pane}")
                    return
            self.controller.send_interrupt()
        else:
            target = self.controller._resolve_pane_id(pane)
            self.controller.send_interrupt(pane_id=target)
        print("Sent interrupt signal")

    def escape(self, pane: Optional[str] = None):
        if self.mode == 'local':
            if pane:
                resolved_pane = self.controller.resolve_pane_identifier(pane)
                if resolved_pane:
                    self.controller.select_pane(pane_id=resolved_pane)
                else:
                    print(f"Could not resolve pane identifier: {pane}")
                    return
            self.controller.send_escape()
        else:
            target = self.controller._resolve_pane_id(pane)
            self.controller.send_escape(pane_id=target)
        print("Sent escape key")

    def kill(self, pane: Optional[str] = None):
        if self.mode == 'local':
            if pane:
                resolved_pane = self.controller.resolve_pane_identifier(pane)
                if resolved_pane:
                    self.controller.select_pane(pane_id=resolved_pane)
                else:
                    print(f"Could not resolve pane identifier: {pane}")
                    return
            try:
                self.controller.kill_pane()
                print("Pane killed")
            except ValueError as e:
                print(str(e))
        else:
            try:
                self.controller.kill_window(window_id=pane)
                print("Window killed")
            except ValueError as e:
                print(str(e))

    def wait_idle(self, pane: Optional[str] = None, idle_time: float = 2.0, timeout: Optional[int] = None):
        if self.mode == 'local':
            if pane:
                resolved_pane = self.controller.resolve_pane_identifier(pane)
                if resolved_pane:
                    self.controller.select_pane(pane_id=resolved_pane)
                else:
                    print(f"Could not resolve pane identifier: {pane}")
                    return False
            target = None
        else:
            target = self.controller._resolve_pane_id(pane)
        print(f"Waiting for pane to become idle (no changes for {idle_time}s)...")
        if self.controller.wait_for_idle(pane_id=target, idle_time=idle_time, timeout=timeout):
            print("Pane is idle")
            return True
        else:
            print("Timeout waiting for idle")
            return False

    def attach(self):
        if self.mode == 'local':
            print("Attach is only available in remote mode")
            return
        self.controller.attach_session()

    def cleanup(self):
        if self.mode == 'local':
            print("Cleanup is only available in remote mode")
            return
        self.controller.cleanup_session()

    def list_windows(self):
        if self.mode == 'local':
            print("List_windows is only available in remote mode. Use list_panes instead.")
            return
        windows = self.controller.list_windows()
        if not windows:
            print(f"No windows in session '{self.controller.session_name}'")
            return
        print(f"Windows in session '{self.controller.session_name}':")
        for w in windows:
            active = " (active)" if w['active'] else ""
            print(f"  {w['index']}: {w['name']}{active} - pane {w['pane_id']}")


HELP_TEXT = """
tmux-cli - Control CLI applications in tmux panes

COMMANDS:
  status              Show current tmux status and panes
  list_panes          List all panes in current window (JSON)
  list_sessions       List all tmux sessions (JSON)
  create_session NAME Create a new tmux session
  kill_session NAME   Kill a session (cannot kill current)
  create_window       Create a new window in current/specified session
  launch CMD          Launch command in new pane
  send TEXT           Send text to a pane
  capture             Capture pane output
  interrupt           Send Ctrl+C to pane
  escape              Send Escape to pane
  kill                Kill a pane
  wait_idle           Wait for pane to become idle
  attach              Attach to remote session (remote mode only)
  cleanup             Kill remote session (remote mode only)
  list_windows        List windows (remote mode only)

OPTIONS:
  --pane=ID           Target pane (index, %id, or session:window.pane)
  --session=NAME      Target session for list_panes/create_window
  --name=NAME         Window name for create_window
  --command=CMD       Command to run in new session/window
  --cwd=PATH          Working directory (must be absolute path that exists)
  --lines=N           Lines to capture
  --vertical/--no-vertical  Split direction for launch
  --size=N            Pane size percentage
  --enter/--no-enter  Send Enter after text
  --delay-enter=N     Delay before Enter (seconds)
  --idle-time=N       Idle detection threshold
  --timeout=N         Wait timeout

EXAMPLES:
  tmux-cli status
  tmux-cli list_sessions
  tmux-cli create_session my-session --cwd=/Users/towry/workspace
  tmux-cli kill_session old-session
  tmux-cli create_window --session=main --name=editor --cwd=/Users/towry/project
  tmux-cli create_window --name=build --command="make build"
  tmux-cli list_panes --session=main
  tmux-cli launch "python3"
  tmux-cli send "print('hello')" --pane=1
  tmux-cli capture --pane=1 --lines=20
  tmux-cli kill --pane=1
"""


def parse_args(args: List[str]) -> Tuple[str, Dict]:
    """Simple argument parser."""
    if not args:
        return 'help', {}
    
    cmd = args[0]
    kwargs = {}
    positional = []
    
    i = 1
    while i < len(args):
        arg = args[i]
        if arg.startswith('--'):
            if '=' in arg:
                key, val = arg[2:].split('=', 1)
                key = key.replace('-', '_')
                # Type conversion
                if val.lower() == 'true':
                    val = True
                elif val.lower() == 'false':
                    val = False
                elif val.isdigit():
                    val = int(val)
                else:
                    try:
                        val = float(val)
                    except:
                        pass
                kwargs[key] = val
            elif arg.startswith('--no-'):
                kwargs[arg[5:].replace('-', '_')] = False
            else:
                kwargs[arg[2:].replace('-', '_')] = True
        else:
            positional.append(arg)
        i += 1
    
    return cmd, {'positional': positional, **kwargs}


def main():
    args = sys.argv[1:]
    
    if not args or args[0] in ['-h', '--help', 'help']:
        print(HELP_TEXT)
        return
    
    cmd, kwargs = parse_args(args)
    positional = kwargs.pop('positional', [])
    
    cli = CLI(session=kwargs.pop('session', None))
    
    if cmd == 'status':
        cli.status()
    elif cmd == 'list_panes':
        cli.list_panes(session=kwargs.get('session'))
    elif cmd == 'list_sessions':
        cli.list_sessions()
    elif cmd == 'create_session':
        if not positional:
            print("Error: create_session requires a session name")
            return
        cli.create_session(positional[0], command=kwargs.get('command'), cwd=kwargs.get('cwd'))
    elif cmd == 'kill_session':
        if not positional:
            print("Error: kill_session requires a session name")
            return
        cli.kill_session(positional[0])
    elif cmd == 'create_window':
        cli.create_window(name=kwargs.get('name'), command=kwargs.get('command'),
                          session=kwargs.get('session'), cwd=kwargs.get('cwd'),
                          detached=kwargs.get('detached', True))
    elif cmd == 'launch':
        if not positional:
            print("Error: launch requires a command")
            return
        cli.launch(positional[0], **kwargs)
    elif cmd == 'send':
        if not positional:
            print("Error: send requires text", file=sys.stderr)
            sys.exit(1)
        if not cli.send(positional[0], **kwargs):
            sys.exit(1)
    elif cmd == 'capture':
        content = cli.capture(**kwargs)
        print(content)
    elif cmd == 'interrupt':
        cli.interrupt(**kwargs)
    elif cmd == 'escape':
        cli.escape(**kwargs)
    elif cmd == 'kill':
        cli.kill(**kwargs)
    elif cmd == 'wait_idle':
        cli.wait_idle(**kwargs)
    elif cmd == 'attach':
        cli.attach()
    elif cmd == 'cleanup':
        cli.cleanup()
    elif cmd == 'list_windows':
        cli.list_windows()
    else:
        print(f"Unknown command: {cmd}")
        print(HELP_TEXT)


if __name__ == '__main__':
    main()
