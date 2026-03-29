import '@xterm/xterm/css/xterm.css';
import { createTerminal, focusTerminal } from './terminal';
import { setupOverlayEvents } from './overlay';

declare global {
  interface Window {
    electronAPI: {
      onPtyData: (callback: (data: string) => void) => void;
      sendPtyInput: (data: string) => void;
      sendPtyResize: (cols: number, rows: number) => void;
      onOverlayShow: (callback: () => void) => void;
      onOverlayHide: (callback: () => void) => void;
      onConfigUpdate: (callback: (config: Record<string, unknown>) => void) => void;
      getConfig: () => Promise<Record<string, unknown>>;
      hideOverlay: () => void;
      notifyVisibility: (visible: boolean) => void;
    };
  }
}

async function init() {
  const config = await window.electronAPI.getConfig();
  const opacity = (config.opacity as number) || 0.95;

  document.documentElement.style.setProperty('--opacity', String(opacity));
  document.documentElement.style.setProperty('--bg', `rgba(18, 18, 24, ${opacity})`);

  const container = document.getElementById('terminal-container');
  if (!container) return;
  createTerminal(container);
  setupOverlayEvents();

  const hotkeyHint = document.getElementById('hotkey-hint');
  if (hotkeyHint) {
    const hotkey = (config.hotkey as string) || 'CommandOrControl+`';
    const platform = config.platform as string;
    const modKey = platform === 'darwin' ? '\u2318' : 'Ctrl';
    hotkeyHint.textContent = hotkey
      .replace('CommandOrControl', modKey)
      .replace(/\+/g, platform === 'darwin' ? '' : '+');
  }

  focusTerminal();
  window.electronAPI.notifyVisibility(true);

  window.electronAPI.onConfigUpdate((update) => {
    if (update.opacity !== undefined) {
      const val = update.opacity as number;
      document.documentElement.style.setProperty('--opacity', String(val));
      document.documentElement.style.setProperty('--bg', `rgba(18, 18, 24, ${val})`);
    }
  });
}

init().catch((err) => {
  console.error('Failed to initialize:', err);
});
