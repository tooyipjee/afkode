import { app, BrowserWindow, ipcMain } from 'electron';
import { createWindow, loadWindow, getWindow, sendToWindow, setForceQuit } from './window';
import { registerHotkey, unregisterAll } from './hotkey';
import { createPty, destroyPty } from './pty';
import { createTray, destroyTray } from './tray';

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  let cleaned = false;

  function cleanup(): void {
    if (cleaned) return;
    cleaned = true;
    destroyPty();
    unregisterAll();
    destroyTray();
  }

  function initWindow(): BrowserWindow {
    const win = createWindow();
    loadWindow(win);

    win.once('ready-to-show', () => {
      win.show();
    });

    return win;
  }

  app.on('second-instance', () => {
    const w = getWindow();
    if (w) {
      if (!w.isVisible()) w.show();
      w.focus();
    }
  });

  app.whenReady().then(() => {
    const win = initWindow();

    ipcMain.on('overlay:dismiss', () => {
      const w = getWindow();
      if (w && w.isVisible()) {
        w.hide();
        sendToWindow('overlay:hide');
      }
    });

    createPty(win);
    registerHotkey();
    createTray();
  });

  app.on('before-quit', () => {
    setForceQuit(true);
  });

  app.on('window-all-closed', () => {
    cleanup();
    app.quit();
  });

  app.on('will-quit', () => {
    cleanup();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = initWindow();
      createPty(win);
    }
  });
}
