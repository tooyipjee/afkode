import '@xterm/xterm/css/xterm.css';
import { focusTerminal, writeToTab, setInitialConfig } from './terminal';
import { setupOverlayEvents } from './overlay';
import { initTabs, addTab, handlePtyExit } from './tabs';
import { initSettings, toggleSettings } from './settings';
import { getTheme } from './themes';
import { initResize } from './resize';

declare global {
  interface Window {
    electronAPI: {
      onPtyData: (callback: (tabId: string, data: string) => void) => void;
      onPtyExit: (callback: (tabId: string, exitCode: number) => void) => void;
      createPtyTab: (shell?: string) => Promise<{ tabId: string; shell: string; shellName: string }>;
      closePtyTab: (tabId: string) => void;
      sendPtyInput: (tabId: string, data: string) => void;
      sendPtyResize: (tabId: string, cols: number, rows: number) => void;
      setConfig: (key: string, value: unknown) => Promise<void>;
      onOverlayShow: (callback: () => void) => void;
      onOverlayHide: (callback: () => void) => void;
      onConfigUpdate: (callback: (config: Record<string, unknown>) => void) => void;
      getConfig: () => Promise<Record<string, unknown>>;
      hideOverlay: () => void;
      notifyVisibility: (visible: boolean) => void;
      openBugReport: () => void;
      openFeatureRequest: () => void;
      getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>;
      setWindowBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
    };
  }
}

async function init() {
  const config = await window.electronAPI.getConfig();
  const opacity = (config.opacity as number) || 0.95;
  const themeId = (config.theme as string) || 'afkode';
  const fontSize = (config.fontSize as number) || 13;
  const theme = getTheme(themeId);

  document.documentElement.style.setProperty('--opacity', String(opacity));
  document.documentElement.style.setProperty('--bg', theme.overlayBg(opacity));

  setInitialConfig(themeId, fontSize);

  const wrapper = document.getElementById('terminal-wrapper');
  const tabsContainer = document.getElementById('tabs');
  if (!wrapper || !tabsContainer) return;

  const shells = (config.availableShells as Array<{ path: string; name: string }>) || [];
  const defaultShell = (config.shellPath as string) || '';

  initTabs(wrapper, tabsContainer, shells, defaultShell);
  initSettings(config);
  setupOverlayEvents();

  window.electronAPI.onPtyData((tabId, data) => {
    writeToTab(tabId, data);
  });

  window.electronAPI.onPtyExit((tabId) => {
    handlePtyExit(tabId);
  });

  document.getElementById('new-tab-btn')?.addEventListener('click', () => addTab());
  document.getElementById('settings-btn')?.addEventListener('click', () => toggleSettings());
  setupFeedbackButton();
  initResize();

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
      const t = getTheme((config.theme as string) || 'afkode');
      document.documentElement.style.setProperty('--opacity', String(val));
      document.documentElement.style.setProperty('--bg', t.overlayBg(val));
    }
  });
}

function setupFeedbackButton(): void {
  const btn = document.getElementById('feedback-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showFeedbackMenu(btn);
  });
}

function showFeedbackMenu(anchor: HTMLElement): void {
  let menu = document.getElementById('feedback-menu');
  if (menu) {
    menu.remove();
    return;
  }

  menu = document.createElement('div');
  menu.id = 'feedback-menu';
  menu.className = 'dropdown';
  menu.style.position = 'fixed';

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.left = 'auto';

  const bugItem = document.createElement('div');
  bugItem.className = 'dropdown-item';
  bugItem.textContent = '\uD83D\uDC1B  Report a Bug';
  bugItem.addEventListener('click', () => {
    window.electronAPI.openBugReport();
    menu!.remove();
  });

  const featureItem = document.createElement('div');
  featureItem.className = 'dropdown-item';
  featureItem.textContent = '\u2728  Request a Feature';
  featureItem.addEventListener('click', () => {
    window.electronAPI.openFeatureRequest();
    menu!.remove();
  });

  menu.appendChild(bugItem);
  menu.appendChild(featureItem);
  document.body.appendChild(menu);

  const dismiss = (ev: MouseEvent) => {
    if (!menu!.contains(ev.target as Node)) {
      menu!.remove();
      document.removeEventListener('click', dismiss);
    }
  };
  setTimeout(() => document.addEventListener('click', dismiss), 0);
}

init().catch((err) => {
  console.error('Failed to initialize:', err);
});
