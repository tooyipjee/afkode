import { BrowserWindow, ipcMain, shell } from 'electron';
import { getAllConfig, getConfig, setConfig, getAvailableShells } from './config';
import { refreshTray } from './tray';
import { homedir } from 'os';
import * as nodePty from 'node-pty';

const REPO_URL = 'https://github.com/tooyipjee/afkode';

const isWin = process.platform === 'win32';

let cachedEnv: Record<string, string> | null = null;
function getSpawnEnv(): Record<string, string> {
  if (!cachedEnv) {
    cachedEnv = { ...process.env as Record<string, string> };
    if (!isWin) cachedEnv.TERM = 'xterm-256color';
  }
  return cachedEnv;
}

interface PtySession {
  process: ReturnType<typeof import('node-pty').spawn>;
  pendingData: string;
  flushScheduled: boolean;
  hiddenBuffer: string;
}

let targetWin: BrowserWindow | null = null;
let overlayVisible = true;
const sessions = new Map<string, PtySession>();
let nextId = 1;

const MAX_HIDDEN_BUFFER = 50_000;

function flushSession(tabId: string): void {
  const session = sessions.get(tabId);
  if (!session) return;
  session.flushScheduled = false;
  if (!targetWin || targetWin.isDestroyed()) return;

  if (session.pendingData) {
    targetWin.webContents.send('pty:data', tabId, session.pendingData);
    session.pendingData = '';
  }
}

function spawnForTab(tabId: string, shellPath: string): boolean {
  if (!targetWin || targetWin.isDestroyed()) return false;
  const win = targetWin;

  try {
    const ptyProcess = nodePty.spawn(shellPath, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: homedir(),
      env: getSpawnEnv(),
    });

    const session: PtySession = {
      process: ptyProcess,
      pendingData: '',
      flushScheduled: false,
      hiddenBuffer: '',
    };
    sessions.set(tabId, session);

    ptyProcess.onData((data: string) => {
      if (!win || win.isDestroyed()) return;
      const s = sessions.get(tabId);
      if (!s) return;

      if (overlayVisible) {
        s.pendingData += data;
        if (!s.flushScheduled) {
          s.flushScheduled = true;
          setImmediate(() => flushSession(tabId));
        }
      } else {
        s.hiddenBuffer += data;
        if (s.hiddenBuffer.length > MAX_HIDDEN_BUFFER) {
          s.hiddenBuffer = s.hiddenBuffer.slice(-MAX_HIDDEN_BUFFER);
        }
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      sessions.delete(tabId);
      if (win && !win.isDestroyed()) {
        win.webContents.send('pty:exit', tabId, exitCode);
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to spawn PTY:', err);
    return false;
  }
}

export function createPty(win: BrowserWindow): void {
  targetWin = win;

  ipcMain.handle('config:get', () => ({
    ...getAllConfig(),
    platform: process.platform,
    availableShells: getAvailableShells(),
  }));

  ipcMain.handle('config:set', (_event, key: string, value: unknown) => {
    setConfig(key as any, value as any);
    refreshTray();
  });

  ipcMain.handle('pty:create', (_event, shell?: string) => {
    const tabId = `tab-${nextId++}`;
    const shellPath = shell || getConfig('shellPath');
    const ok = spawnForTab(tabId, shellPath);
    const shellName = shellPath.split(/[/\\]/).pop() || 'shell';
    return { tabId, shell: shellPath, shellName, error: ok ? undefined : 'Failed to start shell' };
  });

  ipcMain.on('pty:input', (_event, tabId: string, data: string) => {
    sessions.get(tabId)?.process.write(data);
  });

  ipcMain.on('pty:resize', (_event, tabId: string, cols: unknown, rows: unknown) => {
    if (typeof cols !== 'number' || typeof rows !== 'number') return;
    if (cols < 1 || rows < 1 || cols > 500 || rows > 500) return;
    try {
      sessions.get(tabId)?.process.resize(Math.floor(cols), Math.floor(rows));
    } catch {
      // resize can throw if pty already exited
    }
  });

  ipcMain.on('pty:close', (_event, tabId: string) => {
    const session = sessions.get(tabId);
    if (session) {
      session.process.kill();
      sessions.delete(tabId);
    }
  });

  ipcMain.on('overlay:visibility', (_event, visible: boolean) => {
    overlayVisible = visible;
    if (visible) {
      for (const [tabId, session] of sessions) {
        if (session.hiddenBuffer && targetWin && !targetWin.isDestroyed()) {
          targetWin.webContents.send('pty:data', tabId, session.hiddenBuffer);
          session.hiddenBuffer = '';
        }
      }
    }
  });

  ipcMain.on('app:open-feedback', () => {
    shell.openExternal(`${REPO_URL}/issues/new/choose`);
  });

  ipcMain.handle('window:getBounds', () => {
    if (targetWin && !targetWin.isDestroyed()) {
      return targetWin.getBounds();
    }
    return { x: 0, y: 0, width: 800, height: 600 };
  });

  ipcMain.on('window:setBounds', (_event, bounds: { x: number; y: number; width: number; height: number }) => {
    if (targetWin && !targetWin.isDestroyed()) {
      targetWin.setBounds(bounds);
    }
  });
}

export function destroyPty(): void {
  for (const [, session] of sessions) {
    session.process.kill();
  }
  sessions.clear();
  nextId = 1;
  targetWin = null;
  ipcMain.removeAllListeners('pty:input');
  ipcMain.removeAllListeners('pty:resize');
  ipcMain.removeAllListeners('pty:close');
  ipcMain.removeAllListeners('overlay:visibility');
  ipcMain.removeAllListeners('app:open-feedback');
  ipcMain.removeAllListeners('window:setBounds');
  try { ipcMain.removeHandler('config:get'); } catch {}
  try { ipcMain.removeHandler('config:set'); } catch {}
  try { ipcMain.removeHandler('pty:create'); } catch {}
  try { ipcMain.removeHandler('window:getBounds'); } catch {}
}
