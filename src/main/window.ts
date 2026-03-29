import { BrowserWindow, screen, app, nativeImage } from 'electron';
import { join } from 'path';
import { getConfig, setConfig } from './config';
import { getIconPath } from './icon';

const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let forceQuit = false;

export function setForceQuit(val: boolean): void {
  forceQuit = val;
}

function validateBounds(
  x: number, y: number, w: number, h: number,
): { x: number; y: number; width: number; height: number } | null {
  const displays = screen.getAllDisplays();
  const visible = displays.some((d) => {
    const b = d.bounds;
    return x < b.x + b.width && x + w > b.x && y < b.y + b.height && y + h > b.y;
  });
  return visible ? { x, y, width: w, height: h } : null;
}

export function createWindow(): BrowserWindow {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const savedBounds = getConfig('windowBounds');

  const defaultWidth = Math.round(screenWidth * 0.6);
  const defaultHeight = Math.round(screenHeight * 0.55);
  const defaultX = Math.round((screenWidth - defaultWidth) / 2);
  const defaultY = Math.round((screenHeight - defaultHeight) / 2);

  const validated = savedBounds
    ? validateBounds(savedBounds.x, savedBounds.y, savedBounds.width, savedBounds.height)
    : null;

  const winWidth = validated?.width ?? defaultWidth;
  const winHeight = validated?.height ?? defaultHeight;
  const winX = validated?.x ?? defaultX;
  const winY = validated?.y ?? defaultY;

  const iconPath = getIconPath();
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: winX,
    y: winY,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    show: false,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      v8CacheOptions: 'bypassHeatCheck',
    },
  });

  if (isMac) {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    mainWindow.setAlwaysOnTop(true);
  }

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('close', (e) => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      setConfig('windowBounds', bounds);
    }
    if (!forceQuit) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function loadWindow(win: BrowserWindow): void {
  const loadPromise = (!app.isPackaged && process.env.VITE_DEV_SERVER_URL)
    ? win.loadURL(process.env.VITE_DEV_SERVER_URL)
    : win.loadFile('dist/index.html');

  loadPromise.catch((err) => {
    console.error('Failed to load window content:', err);
  });
}

export function getWindow(): BrowserWindow | null {
  return mainWindow;
}

export function sendToWindow(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

export function toggleWindow(): void {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

export function isWindowVisible(): boolean {
  return mainWindow?.isVisible() ?? false;
}
