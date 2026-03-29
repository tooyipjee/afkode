import Store from 'electron-store';
import { existsSync } from 'fs';

function defaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
  }
  return process.env.SHELL || '/bin/sh';
}

const ALLOWED_SHELLS_UNIX = ['/bin/sh', '/bin/bash', '/bin/zsh', '/bin/fish', '/usr/bin/fish', '/usr/local/bin/bash', '/usr/local/bin/zsh', '/usr/local/bin/fish', '/opt/homebrew/bin/bash', '/opt/homebrew/bin/zsh', '/opt/homebrew/bin/fish'];
const ALLOWED_SHELLS_WIN = ['cmd.exe', 'powershell.exe', 'pwsh.exe', 'bash.exe', 'wsl.exe'];

export function isValidShell(shell: string): boolean {
  if (process.platform === 'win32') {
    const name = shell.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    return ALLOWED_SHELLS_WIN.includes(name);
  }
  return ALLOWED_SHELLS_UNIX.includes(shell) || existsSync(shell);
}

export function getAvailableShells(): Array<{ path: string; name: string }> {
  if (process.platform === 'win32') {
    const shells: Array<{ path: string; name: string }> = [];
    const comspec = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
    shells.push({ path: comspec, name: 'Command Prompt' });

    const psPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    if (existsSync(psPath)) {
      shells.push({ path: psPath, name: 'Windows PowerShell' });
    }

    for (const p of [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
    ]) {
      if (existsSync(p)) { shells.push({ path: p, name: 'PowerShell 7' }); break; }
    }

    for (const p of [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    ]) {
      if (existsSync(p)) { shells.push({ path: p, name: 'Git Bash' }); break; }
    }

    if (existsSync('C:\\Windows\\System32\\wsl.exe')) {
      shells.push({ path: 'C:\\Windows\\System32\\wsl.exe', name: 'WSL' });
    }

    return shells;
  }

  const shells: Array<{ path: string; name: string }> = [];
  const seen = new Set<string>();
  for (const c of [
    { path: '/bin/zsh', name: 'Zsh' },
    { path: '/bin/bash', name: 'Bash' },
    { path: '/bin/sh', name: 'sh' },
    { path: '/bin/fish', name: 'Fish' },
    { path: '/usr/bin/fish', name: 'Fish' },
    { path: '/usr/local/bin/bash', name: 'Bash' },
    { path: '/usr/local/bin/zsh', name: 'Zsh' },
    { path: '/usr/local/bin/fish', name: 'Fish' },
    { path: '/opt/homebrew/bin/bash', name: 'Bash' },
    { path: '/opt/homebrew/bin/zsh', name: 'Zsh' },
    { path: '/opt/homebrew/bin/fish', name: 'Fish' },
  ]) {
    if (existsSync(c.path) && !seen.has(c.path)) {
      seen.add(c.path);
      shells.push(c);
    }
  }
  return shells;
}

const VALID_THEMES = ['afkode', 'dracula', 'nord', 'one-dark', 'solarized'];

interface OverlayConfig {
  hotkey: string;
  opacity: number;
  shellPath: string;
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  fontSize: number;
  theme: string;
}

const defaults: OverlayConfig = {
  hotkey: 'Control+`',
  opacity: 0.95,
  shellPath: defaultShell(),
  windowBounds: null,
  fontSize: 13,
  theme: 'afkode',
};

let store: Store<OverlayConfig>;

try {
  store = new Store<OverlayConfig>({ defaults });
} catch (err) {
  console.error('Config corrupted, resetting to defaults:', err);
  store = new Store<OverlayConfig>({ defaults, clearInvalidConfig: true } as any);
}

export function getConfig<K extends keyof OverlayConfig>(key: K): OverlayConfig[K] {
  const val = store.get(key);
  if (key === 'opacity') {
    const n = val as number;
    if (typeof n !== 'number' || isNaN(n) || n < 0 || n > 1) return defaults.opacity as OverlayConfig[K];
  }
  if (key === 'hotkey') {
    if (typeof val !== 'string' || val.length === 0) return defaults.hotkey as OverlayConfig[K];
  }
  if (key === 'shellPath') {
    const s = val as string;
    if (typeof s !== 'string' || !isValidShell(s)) return defaults.shellPath as OverlayConfig[K];
  }
  if (key === 'fontSize') {
    const n = val as number;
    if (typeof n !== 'number' || isNaN(n) || n < 8 || n > 28) return defaults.fontSize as OverlayConfig[K];
  }
  if (key === 'theme') {
    const s = val as string;
    if (typeof s !== 'string' || !VALID_THEMES.includes(s)) return defaults.theme as OverlayConfig[K];
  }
  return val;
}

export function setConfig<K extends keyof OverlayConfig>(key: K, value: OverlayConfig[K]): void {
  store.set(key, value);
}

export function getAllConfig(): OverlayConfig {
  return {
    hotkey: getConfig('hotkey'),
    opacity: getConfig('opacity'),
    shellPath: getConfig('shellPath'),
    windowBounds: getConfig('windowBounds'),
    fontSize: getConfig('fontSize'),
    theme: getConfig('theme'),
  };
}

export { type OverlayConfig, defaults };
