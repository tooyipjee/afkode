import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserWindow, app, screen } from 'electron';
import {
  createWindow, getWindow, toggleWindow, isWindowVisible,
  sendToWindow, loadWindow, setForceQuit,
} from '../../src/main/window';
import { setConfig, getConfig } from '../../src/main/config';

describe('window — creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setConfig('windowBounds', null);
  });

  it('creates a BrowserWindow instance', () => {
    const win = createWindow();
    expect(win).toBeDefined();
    expect(BrowserWindow).toHaveBeenCalled();
  });

  it('configures transparent frameless window with sandbox', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.frame).toBe(false);
    expect(opts.transparent).toBe(true);
    expect(opts.show).toBe(false);
    expect(opts.backgroundColor).toBe('#00000000');
    expect(opts.webPreferences.sandbox).toBe(true);
    expect(opts.webPreferences.nodeIntegration).toBe(false);
    expect(opts.webPreferences.contextIsolation).toBe(true);
  });

  it('sets reasonable default dimensions', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.width).toBeGreaterThan(0);
    expect(opts.height).toBeGreaterThan(0);
    expect(opts.width).toBeLessThanOrEqual(1920);
    expect(opts.height).toBeLessThanOrEqual(1080);
  });

  it('centers window by default', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.x).toBeGreaterThanOrEqual(0);
    expect(opts.y).toBeGreaterThanOrEqual(0);
  });

  it('sets window icon', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts).toHaveProperty('icon');
  });

  it('configures skipTaskbar and resizable', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.skipTaskbar).toBe(true);
    expect(opts.resizable).toBe(true);
  });

  it('registers close and closed handlers', () => {
    const win = createWindow();
    const onCalls = (win.on as any).mock.calls.map((c: any) => c[0]);
    expect(onCalls).toContain('close');
    expect(onCalls).toContain('closed');
  });

  it('prevents navigation', () => {
    const win = createWindow();
    const navigateHandler = (win.webContents.on as any).mock.calls.find(
      (c: any) => c[0] === 'will-navigate',
    );
    expect(navigateHandler).toBeDefined();

    const mockEvent = { preventDefault: vi.fn() };
    navigateHandler[1](mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('denies window.open', () => {
    const win = createWindow();
    expect(win.webContents.setWindowOpenHandler).toHaveBeenCalledWith(expect.any(Function));
    const handler = (win.webContents.setWindowOpenHandler as any).mock.calls[0][0];
    expect(handler()).toEqual({ action: 'deny' });
  });
});

describe('window — bounds validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setConfig('windowBounds', null);
  });

  it('uses saved bounds when they are on-screen', () => {
    setConfig('windowBounds', { x: 100, y: 200, width: 800, height: 600 });
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.x).toBe(100);
    expect(opts.y).toBe(200);
    expect(opts.width).toBe(800);
    expect(opts.height).toBe(600);
    setConfig('windowBounds', null);
  });

  it('falls back to defaults when saved bounds are off-screen', () => {
    setConfig('windowBounds', { x: 9999, y: 9999, width: 800, height: 600 });
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.x).not.toBe(9999);
    expect(opts.y).not.toBe(9999);
    setConfig('windowBounds', null);
  });

  it('falls back to defaults when saved bounds are completely negative', () => {
    setConfig('windowBounds', { x: -5000, y: -5000, width: 100, height: 100 });
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.x).not.toBe(-5000);
    expect(opts.y).not.toBe(-5000);
    setConfig('windowBounds', null);
  });
});

describe('window — close handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setForceQuit(false);
  });

  it('saves window bounds on close', () => {
    const win = createWindow();
    win.getBounds = vi.fn(() => ({ x: 50, y: 60, width: 900, height: 700 }));

    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'close',
    )[1];
    const mockEvent = { preventDefault: vi.fn() };
    closeHandler(mockEvent);

    expect(win.getBounds).toHaveBeenCalled();
    const saved = getConfig('windowBounds');
    expect(saved).toEqual({ x: 50, y: 60, width: 900, height: 700 });
    setConfig('windowBounds', null);
  });

  it('hides window instead of closing when forceQuit is false', () => {
    const win = createWindow();
    win.getBounds = vi.fn(() => ({ x: 0, y: 0, width: 800, height: 600 }));

    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'close',
    )[1];
    const mockEvent = { preventDefault: vi.fn() };
    closeHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(win.hide).toHaveBeenCalled();
    setConfig('windowBounds', null);
  });

  it('allows close when forceQuit is true', () => {
    setForceQuit(true);
    const win = createWindow();
    win.getBounds = vi.fn(() => ({ x: 0, y: 0, width: 800, height: 600 }));

    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'close',
    )[1];
    const mockEvent = { preventDefault: vi.fn() };
    closeHandler(mockEvent);

    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    setForceQuit(false);
    setConfig('windowBounds', null);
  });

  it('closed handler nullifies main window reference', () => {
    const win = createWindow();
    expect(getWindow()).toBe(win);

    const closedHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'closed',
    )[1];
    closedHandler();

    expect(getWindow()).toBeNull();
  });
});

describe('window — getWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the created window', () => {
    const win = createWindow();
    expect(getWindow()).toBe(win);
  });
});

describe('window — toggleWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows when hidden', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => false);
    toggleWindow();
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
  });

  it('hides when visible', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => true);
    toggleWindow();
    expect(win.hide).toHaveBeenCalled();
  });

  it('is safe when no window exists', () => {
    const win = createWindow();
    const closedHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'closed',
    )[1];
    closedHandler();
    expect(() => toggleWindow()).not.toThrow();
  });
});

describe('window — isWindowVisible', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false initially', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => false);
    expect(isWindowVisible()).toBe(false);
  });

  it('returns true when visible', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => true);
    expect(isWindowVisible()).toBe(true);
  });

  it('returns false when no window exists', () => {
    const win = createWindow();
    const closedHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'closed',
    )[1];
    closedHandler();
    expect(isWindowVisible()).toBe(false);
  });
});

describe('window — sendToWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends to webContents when window exists', () => {
    const win = createWindow();
    win.isDestroyed = vi.fn(() => false);
    sendToWindow('test:channel', 'data');
    expect(win.webContents.send).toHaveBeenCalledWith('test:channel', 'data');
  });

  it('sends multiple args', () => {
    const win = createWindow();
    win.isDestroyed = vi.fn(() => false);
    sendToWindow('test:multi', 'a', 42, true);
    expect(win.webContents.send).toHaveBeenCalledWith('test:multi', 'a', 42, true);
  });

  it('does not send when window is destroyed', () => {
    const win = createWindow();
    win.isDestroyed = vi.fn(() => true);
    sendToWindow('test:channel', 'data');
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('is safe when no window exists', () => {
    const win = createWindow();
    const closedHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'closed',
    )[1];
    closedHandler();
    expect(() => sendToWindow('test:channel', 'data')).not.toThrow();
  });
});

describe('window — loadWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads file when no dev server URL', () => {
    const origUrl = process.env.VITE_DEV_SERVER_URL;
    delete process.env.VITE_DEV_SERVER_URL;

    const win = createWindow();
    loadWindow(win);
    expect(win.loadFile).toHaveBeenCalledWith('dist/index.html');

    if (origUrl !== undefined) process.env.VITE_DEV_SERVER_URL = origUrl;
  });

  it('loads dev server URL when VITE_DEV_SERVER_URL is set', () => {
    const origUrl = process.env.VITE_DEV_SERVER_URL;
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';

    const win = createWindow();
    loadWindow(win);
    expect(win.loadURL).toHaveBeenCalledWith('http://localhost:5173');

    if (origUrl !== undefined) {
      process.env.VITE_DEV_SERVER_URL = origUrl;
    } else {
      delete process.env.VITE_DEV_SERVER_URL;
    }
  });

  it('handles load errors gracefully', async () => {
    delete process.env.VITE_DEV_SERVER_URL;
    const win = createWindow();
    win.loadFile = vi.fn(() => Promise.reject(new Error('load failed')));

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadWindow(win);
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load window content'),
      expect.any(Error),
    );
    spy.mockRestore();
  });
});
