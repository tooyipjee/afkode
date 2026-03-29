import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalShortcut } from 'electron';
import { registerHotkey, unregisterAll } from '../../src/main/hotkey';

describe('hotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registerHotkey calls globalShortcut.register', () => {
    registerHotkey();
    expect(globalShortcut.register).toHaveBeenCalledWith(
      'CommandOrControl+`',
      expect.any(Function),
    );
  });

  it('unregisterAll calls globalShortcut.unregister for the registered key', () => {
    (globalShortcut.register as any).mockReturnValueOnce(true);
    registerHotkey();
    unregisterAll();
    expect(globalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+`');
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
});
