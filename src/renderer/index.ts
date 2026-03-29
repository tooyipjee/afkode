import '@xterm/xterm/css/xterm.css';
import { focusTerminal, writeToTab } from './terminal';
import { setupOverlayEvents } from './overlay';
import { initTabs, addTab, handlePtyExit } from './tabs';

declare global {
  interface Window {
    electronAPI: {
      onPtyData: (callback: (tabId: string, data: string) => void) => void;
      onPtyExit: (callback: (tabId: string, exitCode: number) => void) => void;
      createPtyTab: (shell?: string) => Promise<{ tabId: string; shell: string; shellName: string }>;
      closePtyTab: (tabId: string) => void;
      sendPtyInput: (tabId: string, data: string) => void;
      sendPtyResize: (tabId: string, cols: number, rows: number) => void;
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

  const wrapper = document.getElementById('terminal-wrapper');
  const tabsContainer = document.getElementById('tabs');
  if (!wrapper || !tabsContainer) return;

  const shells = (config.availableShells as Array<{ path: string; name: string }>) || [];
  const defaultShell = (config.shellPath as string) || '';

  initTabs(wrapper, tabsContainer, shells, defaultShell);
  setupOverlayEvents();

  window.electronAPI.onPtyData((tabId, data) => {
    writeToTab(tabId, data);
  });

  window.electronAPI.onPtyExit((tabId) => {
    handlePtyExit(tabId);
  });

  const newTabBtn = document.getElementById('new-tab-btn');
  if (newTabBtn) {
    newTabBtn.addEventListener('click', () => addTab());
  }

  await addTab();
  focusTerminal();
  window.electronAPI.notifyVisibility(true);

  const hotkeyHint = document.getElementById('hotkey-hint');
  if (hotkeyHint) {
    const hotkey = (config.hotkey as string) || 'CommandOrControl+`';
    const platform = config.platform as string;
    const modKey = platform === 'darwin' ? '\u2318' : 'Ctrl';
    hotkeyHint.textContent = hotkey
      .replace('CommandOrControl', modKey)
      .replace(/\+/g, platform === 'darwin' ? '' : '+');
  }

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
