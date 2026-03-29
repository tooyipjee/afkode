import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserWindow } from 'electron';
import { createWindow, getWindow, toggleWindow, isWindowVisible, sendToWindow } from '../../src/main/window';

describe('window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createWindow returns a BrowserWindow instance', () => {
    const win = createWindow();
    expect(win).toBeDefined();
    expect(BrowserWindow).toHaveBeenCalled();
  });

  it('createWindow configures transparent frameless window with sandbox', () => {
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

  it('createWindow sets reasonable default dimensions', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts.width).toBeGreaterThan(0);
    expect(opts.height).toBeGreaterThan(0);
  });

  it('getWindow returns the created window', () => {
    const win = createWindow();
    expect(getWindow()).toBe(win);
  });

  it('toggleWindow shows when hidden', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => false);
    toggleWindow();
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
  });

  it('toggleWindow hides when visible', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => true);
    toggleWindow();
    expect(win.hide).toHaveBeenCalled();
  });

  it('isWindowVisible returns false initially', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => false);
    expect(isWindowVisible()).toBe(false);
  });

  it('sets window icon in options', () => {
    createWindow();
    const opts = (BrowserWindow as any).mock.calls[0][0];
    expect(opts).toHaveProperty('icon');
  });

  it('registers close and closed handlers', () => {
    const win = createWindow();
    const onCalls = (win.on as any).mock.calls.map((c: any) => c[0]);
    expect(onCalls).toContain('close');
    expect(onCalls).toContain('closed');
  });

  it('sendToWindow sends to webContents when window exists', () => {
    const win = createWindow();
    win.isDestroyed = vi.fn(() => false);
    sendToWindow('test:channel', 'data');
    expect(win.webContents.send).toHaveBeenCalledWith('test:channel', 'data');
  });
});
