import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getTheme } from './themes';

interface TabTerminal {
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLElement;
  tabId: string;
}

const tabs = new Map<string, TabTerminal>();
let activeTabId: string | null = null;
let currentThemeId = 'afkode';
let currentFontSize = 13;

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
const RESIZE_THROTTLE_MS = 60;

export function createTerminal(wrapper: HTMLElement, tabId: string): Terminal {
  const container = document.createElement('div');
  container.className = 'tab-terminal';
  container.dataset.tabId = tabId;
  container.style.display = 'none';
  wrapper.appendChild(container);

  const theme = getTheme(currentThemeId);

  const terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: '"Cascadia Code", "SF Mono", "Fira Code", "JetBrains Mono", Consolas, Menlo, "Courier New", monospace',
    fontSize: currentFontSize,
    lineHeight: 1.2,
    allowTransparency: false,
    scrollback: 5000,
    drawBoldTextInBrightColors: false,
    minimumContrastRatio: 1,
    theme: theme.terminal,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  terminal.open(container);

  loadAddonsDeferred(terminal);

  fitAddon.fit();

  terminal.onData((data) => {
    window.electronAPI.sendPtyInput(tabId, data);
  });

  let lastCols = 0;
  let lastRows = 0;
  terminal.onResize(({ cols, rows }) => {
    if (cols === lastCols && rows === lastRows) return;
    lastCols = cols;
    lastRows = rows;
    if (resizeTimer) return;
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      window.electronAPI.sendPtyResize(tabId, lastCols, lastRows);
    }, RESIZE_THROTTLE_MS);
  });

  const tab: TabTerminal = { terminal, fitAddon, container, tabId };
  tabs.set(tabId, tab);

  return terminal;
}

function loadAddonsDeferred(terminal: Terminal): void {
  const load = async () => {
    try {
      const { Unicode11Addon } = await import('@xterm/addon-unicode11');
      const unicode11 = new Unicode11Addon();
      terminal.loadAddon(unicode11);
      terminal.unicode.activeVersion = '11';
    } catch { /* not available */ }

    try {
      const { WebglAddon } = await import('@xterm/addon-webgl');
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      terminal.loadAddon(webglAddon);
    } catch { /* WebGL not available, canvas fallback */ }
  };

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => { load(); }, { timeout: 150 });
  } else {
    setTimeout(() => { load(); }, 50);
  }
}

export function setInitialConfig(themeId: string, fontSize: number): void {
  currentThemeId = themeId;
  currentFontSize = fontSize;
}

export function activateTab(tabId: string): void {
  if (activeTabId) {
    const current = tabs.get(activeTabId);
    if (current) {
      current.container.style.display = 'none';
    }
  }

  const next = tabs.get(tabId);
  if (next) {
    next.container.style.display = '';
    activeTabId = tabId;
    requestAnimationFrame(() => {
      next.fitAddon.fit();
      next.terminal.focus();
    });
  }
}

export function removeTab(tabId: string): void {
  const tab = tabs.get(tabId);
  if (tab) {
    tab.terminal.dispose();
    tab.container.remove();
    tabs.delete(tabId);
    if (activeTabId === tabId) {
      activeTabId = null;
    }
  }
}

export function writeToTab(tabId: string, data: string): boolean {
  const tab = tabs.get(tabId);
  if (tab) {
    tab.terminal.write(data);
    return true;
  }
  return false;
}

export function fitTerminal(): void {
  if (activeTabId) {
    const tab = tabs.get(activeTabId);
    if (tab) {
      tab.fitAddon.fit();
    }
  }
}

export function focusTerminal(): void {
  if (activeTabId) {
    tabs.get(activeTabId)?.terminal.focus();
  }
}

export function setCursorBlink(enabled: boolean): void {
  for (const [, tab] of tabs) {
    tab.terminal.options.cursorBlink = enabled;
  }
}

export function getTerminal(): Terminal | null {
  if (activeTabId) {
    return tabs.get(activeTabId)?.terminal ?? null;
  }
  return null;
}

export function getActiveTabId(): string | null {
  return activeTabId;
}

export function getAllTabIds(): string[] {
  return Array.from(tabs.keys());
}

export function getTerminalForTab(tabId: string): Terminal | null {
  return tabs.get(tabId)?.terminal ?? null;
}

export function applyThemeToAll(themeId: string, themeColors: Record<string, string>): void {
  currentThemeId = themeId;
  for (const [, tab] of tabs) {
    tab.terminal.options.theme = themeColors;
  }
}

export function setFontSizeAll(size: number): void {
  currentFontSize = size;
  for (const [, tab] of tabs) {
    tab.terminal.options.fontSize = size;
    tab.fitAddon.fit();
  }
}
