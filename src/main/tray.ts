import { Tray, Menu, app } from 'electron';
import { getWindow, toggleWindow, sendToWindow } from './window';
import { getConfig, setConfig, getAvailableShells } from './config';
import { getTrayIcon } from './icon';

let tray: Tray | null = null;

export function createTray(): void {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('AFKode');
  updateTrayMenu();
}

function updateTrayMenu(): void {
  if (!tray) return;

  const opacity = getConfig('opacity');
  const hotkey = getConfig('hotkey');
  const currentShell = getConfig('shellPath');
  const shells = getAvailableShells();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Toggle Overlay',
      accelerator: hotkey,
      click: () => {
        const win = getWindow();
        if (!win) return;
        const wasVisible = win.isVisible();
        toggleWindow();
        sendToWindow(wasVisible ? 'overlay:hide' : 'overlay:show');
      },
    },
    { type: 'separator' },
    {
      label: 'Default Shell',
      submenu: shells.map((shell) => ({
        label: shell.name,
        type: 'radio' as const,
        checked: currentShell === shell.path,
        click: () => {
          setConfig('shellPath', shell.path);
        },
      })),
    },
    {
      label: 'Opacity',
      submenu: [0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0].map((val) => ({
        label: `${Math.round(val * 100)}%`,
        type: 'radio' as const,
        checked: Math.abs(opacity - val) < 0.01,
        click: () => {
          setConfig('opacity', val);
          sendToWindow('config:update', { opacity: val });
        },
      })),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function refreshTray(): void {
  updateTrayMenu();
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
