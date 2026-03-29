import { BrowserWindow, ipcMain } from 'electron';
import { getAllConfig, getConfig } from './config';
import { homedir } from 'os';

const isWin = process.platform === 'win32';

let ptyProcess: ReturnType<typeof import('node-pty').spawn> | null = null;
let targetWin: BrowserWindow | null = null;
let overlayVisible = true;
let pendingData = '';
let flushScheduled = false;

const MAX_HIDDEN_BUFFER = 50_000;
let hiddenBuffer = '';

function flushPtyData(): void {
  flushScheduled = false;
  if (!targetWin || targetWin.isDestroyed()) return;

  if (pendingData) {
    targetWin.webContents.send('pty:data', pendingData);
    pendingData = '';
  }
}

export function createPty(win: BrowserWindow): void {
  targetWin = win;

  ipcMain.handle('config:get', () => ({
    ...getAllConfig(),
    platform: process.platform,
  }));

  ipcMain.on('pty:input', (_event, data: string) => {
    ptyProcess?.write(data);
  });

  ipcMain.on('pty:resize', (_event, cols: unknown, rows: unknown) => {
    if (typeof cols !== 'number' || typeof rows !== 'number') return;
    if (cols < 1 || rows < 1 || cols > 500 || rows > 500) return;
    try {
      ptyProcess?.resize(Math.floor(cols), Math.floor(rows));
    } catch {
      // resize can throw if pty already exited
    }
  });

  ipcMain.on('overlay:visibility', (_event, visible: boolean) => {
    overlayVisible = visible;
    if (visible && hiddenBuffer && targetWin && !targetWin.isDestroyed()) {
      targetWin.webContents.send('pty:data', hiddenBuffer);
      hiddenBuffer = '';
    }
  });

  spawnPty();
}

function spawnPty(): void {
  if (!targetWin || targetWin.isDestroyed()) return;
  const win = targetWin;

  try {
    const nodePty = require('node-pty') as typeof import('node-pty');
    const shell = getConfig('shellPath');

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
    };
    if (!isWin) {
      env.TERM = 'xterm-256color';
    }

    ptyProcess = nodePty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: homedir(),
      env,
    });

    ptyProcess.onData((data: string) => {
      if (!win || win.isDestroyed()) return;

      if (overlayVisible) {
        pendingData += data;
        if (!flushScheduled) {
          flushScheduled = true;
          setImmediate(flushPtyData);
        }
      } else {
        hiddenBuffer += data;
        if (hiddenBuffer.length > MAX_HIDDEN_BUFFER) {
          hiddenBuffer = hiddenBuffer.slice(-MAX_HIDDEN_BUFFER);
        }
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      ptyProcess = null;
      if (win && !win.isDestroyed()) {
        win.webContents.send(
          'pty:data',
          `\r\n\x1b[90m[Shell exited with code ${exitCode}. Restarting...]\x1b[0m\r\n`,
        );
        setTimeout(() => spawnPty(), 500);
      }
    });
  } catch (err) {
    console.error('Failed to spawn PTY:', err);
    if (win && !win.isDestroyed()) {
      win.webContents.send(
        'pty:data',
        `\r\n\x1b[31mError: Failed to start shell: ${err}\x1b[0m\r\n`,
      );
    }
  }
}

export function destroyPty(): void {
  if (ptyProcess) {
    ptyProcess.kill();
    ptyProcess = null;
  }
  targetWin = null;
  pendingData = '';
  hiddenBuffer = '';
  ipcMain.removeAllListeners('pty:input');
  ipcMain.removeAllListeners('pty:resize');
  ipcMain.removeAllListeners('overlay:visibility');
  try { ipcMain.removeHandler('config:get'); } catch {}
}
