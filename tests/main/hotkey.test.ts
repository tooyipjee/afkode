import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalShortcut } from 'electron';
import { registerHotkey, reregisterHotkey, unregisterAll } from '../../src/main/hotkey';
import { createWindow, getWindow, toggleWindow } from '../../src/main/window';

describe('hotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registerHotkey calls globalShortcut.register', () => {
    registerHotkey();
    expect(globalShortcut.register).toHaveBeenCalledWith(
      'Control+`',
      expect.any(Function),
    );
  });

  it('unregisterAll calls globalShortcut.unregister for the registered key', () => {
    (globalShortcut.register as any).mockReturnValueOnce(true);
    registerHotkey();
    unregisterAll();
    expect(globalShortcut.unregister).toHaveBeenCalledWith('Control+`');
  });

  it('logs error when registration fails', () => {
    (globalShortcut.register as any).mockReturnValueOnce(false);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerHotkey();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Failed to register'));
    spy.mockRestore();
  });

  it('unregisterAll is safe when nothing registered', () => {
    expect(() => unregisterAll()).not.toThrow();
  });

  it('double unregisterAll does not throw', () => {
    (globalShortcut.register as any).mockReturnValueOnce(true);
    registerHotkey();
    unregisterAll();
    unregisterAll();
    expect(globalShortcut.unregister).toHaveBeenCalledTimes(1);
  });
});

describe('hotkey — callback behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('callback shows window when hidden', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => false);
    win.isDestroyed = vi.fn(() => false);

    (globalShortcut.register as any).mockReturnValueOnce(true);
    registerHotkey();

    const callback = (globalShortcut.register as any).mock.calls[0][1];
    callback();

    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('overlay:show');
  });

  it('callback hides window when visible', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => true);
    win.isDestroyed = vi.fn(() => false);

    (globalShortcut.register as any).mockReturnValueOnce(true);
    registerHotkey();

    const callback = (globalShortcut.register as any).mock.calls[0][1];
    callback();

    expect(win.hide).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('overlay:hide');
  });

  it('callback is safe when window is null', () => {
    const win = createWindow();
    const closedHandler = (win.on as any).mock.calls.find((c: any) => c[0] === 'closed')[1];
    closedHandler();

    (globalShortcut.register as any).mockReturnValueOnce(true);
    registerHotkey();

    const callback = (globalShortcut.register as any).mock.calls[0][1];
    expect(() => callback()).not.toThrow();
  });
});

describe('hotkey — reregisterHotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unregisters old and registers new hotkey', () => {
    (globalShortcut.register as any).mockReturnValue(true);
    registerHotkey();
    expect(globalShortcut.register).toHaveBeenCalledTimes(1);

    reregisterHotkey();
    expect(globalShortcut.unregister).toHaveBeenCalledWith('Control+`');
    expect(globalShortcut.register).toHaveBeenCalledTimes(2);
  });
});
