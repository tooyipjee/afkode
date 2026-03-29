import { fitTerminal, focusTerminal, setCursorBlink } from './terminal';
import { addTab, closeTab, switchToNextTab, switchToPrevTab, switchToTabIndex } from './tabs';
import { getActiveTabId } from './terminal';
import { toggleSettings, isSettingsOpen, closeSettings } from './settings';
import type { Terminal } from '@xterm/xterm';

let visible = false;
let resizeRaf: number | null = null;

export function setupOverlayEvents(): void {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  window.electronAPI.onOverlayShow(() => {
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
    visible = true;
    setCursorBlink(true);
    window.electronAPI.notifyVisibility(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitTerminal();
        focusTerminal();
      });
    });
  });

  window.electronAPI.onOverlayHide(() => {
    overlay.classList.remove('visible');
    overlay.classList.add('hidden');
    visible = false;
    setCursorBlink(false);
    window.electronAPI.notifyVisibility(false);
    if (isSettingsOpen()) closeSettings();
  });

  const wrapper = document.getElementById('terminal-wrapper');
  if (!wrapper) return;

  const resizeObserver = new ResizeObserver(() => {
    if (visible && !resizeRaf) {
      resizeRaf = requestAnimationFrame(() => {
        fitTerminal();
        resizeRaf = null;
      });
    }
  });
  resizeObserver.observe(wrapper);
}

export function attachTerminalKeyHandler(terminal: Terminal): void {
  const isMac = navigator.platform.includes('Mac');

  terminal.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown') return true;

    const mod = isMac ? e.metaKey : e.ctrlKey;
    const shift = e.shiftKey;

    if (e.key === 'Escape') {
      if (isSettingsOpen()) {
        closeSettings();
        return false;
      }
      return true;
    }

    // Settings: Cmd+, (Mac) or Ctrl+, (Win/Linux)
    if (mod && e.key === ',') {
      toggleSettings();
      return false;
    }

    // New tab: Cmd+T (Mac) or Ctrl+Shift+T (Win/Linux)
    if (e.key.toLowerCase() === 't' && mod && (isMac ? !shift : shift)) {
      addTab();
      return false;
    }

    // Close tab: Cmd+W (Mac) or Ctrl+Shift+W (Win/Linux)
    if (e.key.toLowerCase() === 'w' && mod && (isMac ? !shift : shift)) {
      const activeId = getActiveTabId();
      if (activeId) closeTab(activeId);
      return false;
    }

    // Next tab: Ctrl+Tab
    if (e.key === 'Tab' && e.ctrlKey && !shift) {
      switchToNextTab();
      return false;
    }

    // Previous tab: Ctrl+Shift+Tab
    if (e.key === 'Tab' && e.ctrlKey && shift) {
      switchToPrevTab();
      return false;
    }

    // Switch to tab by number: Ctrl/Cmd + 1-9
    if (mod && e.key >= '1' && e.key <= '9') {
      switchToTabIndex(parseInt(e.key) - 1);
      return false;
    }

    return true;
  });
}

export function isOverlayVisible(): boolean {
  return visible;
}
