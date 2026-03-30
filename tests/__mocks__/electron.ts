import { vi } from 'vitest';

const webContents = {
  send: vi.fn(),
  on: vi.fn(),
  setWindowOpenHandler: vi.fn(),
};

function createMockWindow() {
  return {
    isVisible: vi.fn(() => false),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    isDestroyed: vi.fn(() => false),
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
    setVisibleOnAllWorkspaces: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    loadURL: vi.fn(() => Promise.resolve()),
    loadFile: vi.fn(() => Promise.resolve()),
    webContents,
  };
}

export const BrowserWindow = vi.fn(function (this: any, opts: any) {
  const win = createMockWindow();
  Object.assign(this, win);
  return this;
}) as any;
BrowserWindow.getAllWindows = vi.fn(() => []);

export const app = {
  name: 'AFKode',
  getAppPath: vi.fn(() => '/mock/app'),
  whenReady: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  quit: vi.fn(),
  requestSingleInstanceLock: vi.fn(() => true),
  commandLine: { appendSwitch: vi.fn() },
  getPath: vi.fn((name: string) => `/mock/${name}`),
  setLoginItemSettings: vi.fn(),
  isPackaged: false,
};

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
  removeHandler: vi.fn(),
};

export const ipcRenderer = {
  on: vi.fn(),
  send: vi.fn(),
  invoke: vi.fn(),
  removeAllListeners: vi.fn(),
};

export const globalShortcut = {
  register: vi.fn(() => true),
  unregister: vi.fn(),
  unregisterAll: vi.fn(),
};

export const screen = {
  getPrimaryDisplay: vi.fn(() => ({
    workAreaSize: { width: 1920, height: 1080 },
  })),
  getAllDisplays: vi.fn(() => [{
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  }]),
};

export const nativeImage = {
  createFromPath: vi.fn(() => ({
    resize: vi.fn(() => ({ isEmpty: vi.fn(() => false) })),
    isEmpty: vi.fn(() => false),
  })),
  createFromBuffer: vi.fn(() => ({
    resize: vi.fn(() => ({})),
  })),
};

function createMockTray() {
  return {
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    destroy: vi.fn(),
  };
}

export const Tray = vi.fn(function (this: any) {
  const t = createMockTray();
  Object.assign(this, t);
  return this;
}) as any;

export const Menu = {
  buildFromTemplate: vi.fn(() => ({})),
  setApplicationMenu: vi.fn(),
};

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
};

export const shell = {
  openExternal: vi.fn(() => Promise.resolve()),
};

export default {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  globalShortcut,
  screen,
  nativeImage,
  Tray,
  Menu,
  contextBridge,
  shell,
};
