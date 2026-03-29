import { globalShortcut } from 'electron';
import { getWindow, toggleWindow, sendToWindow } from './window';
import { getConfig } from './config';

let registeredAccelerator: string | null = null;

export function registerHotkey(): void {
  const hotkey = getConfig('hotkey');

  const success = globalShortcut.register(hotkey, () => {
    const win = getWindow();
    if (!win) return;

    const wasVisible = win.isVisible();
    toggleWindow();
    sendToWindow(wasVisible ? 'overlay:hide' : 'overlay:show');
  });

  if (success) {
    registeredAccelerator = hotkey;
  } else {
    console.error(`Failed to register global hotkey: ${hotkey}`);
  }
}

export function reregisterHotkey(): void {
  unregisterAll();
  registerHotkey();
}

export function unregisterAll(): void {
  if (registeredAccelerator) {
    globalShortcut.unregister(registeredAccelerator);
    registeredAccelerator = null;
  }
}
