import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { createWindow, loadWindow, getWindow, sendToWindow, setForceQuit } from './window';
import { registerHotkey, unregisterAll } from './hotkey';
import { createPty, destroyPty } from './pty';
import { createTray, destroyTray } from './tray';

function setAppMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'selectAll' },
          ],
        },
      ]
    : [];
  Menu.setApplicationMenu(template.length ? Menu.buildFromTemplate(template) : null);
}

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
    setAppMenu();
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
      cleaned = false;
      destroyPty();
      const win = initWindow();
      createPty(win);
    }
  });
}
