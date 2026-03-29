import Store from 'electron-store';
import { existsSync } from 'fs';

function defaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
  }
  return process.env.SHELL || '/bin/sh';
}

const ALLOWED_SHELLS_UNIX = ['/bin/sh', '/bin/bash', '/bin/zsh', '/bin/fish', '/usr/bin/fish', '/usr/local/bin/bash', '/usr/local/bin/zsh', '/usr/local/bin/fish', '/opt/homebrew/bin/bash', '/opt/homebrew/bin/zsh', '/opt/homebrew/bin/fish'];
const ALLOWED_SHELLS_WIN = ['cmd.exe', 'powershell.exe', 'pwsh.exe'];

export function isValidShell(shell: string): boolean {
  if (process.platform === 'win32') {
    const name = shell.split(/[/\\]/).pop()?.toLowerCase() ?? '';
    return ALLOWED_SHELLS_WIN.includes(name);
  }
  return ALLOWED_SHELLS_UNIX.includes(shell) || existsSync(shell);
}

interface OverlayConfig {
  hotkey: string;
  opacity: number;
  shellPath: string;
  windowBounds: { x: number; y: number; width: number; height: number } | null;
}

const defaults: OverlayConfig = {
  hotkey: 'CommandOrControl+`',
  opacity: 0.95,
  shellPath: defaultShell(),
  windowBounds: null,
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
  };
}

export { type OverlayConfig, defaults };
