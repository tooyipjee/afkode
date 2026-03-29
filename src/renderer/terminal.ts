import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { Unicode11Addon } from '@xterm/addon-unicode11';

interface TabTerminal {
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLElement;
  tabId: string;
}

const tabs = new Map<string, TabTerminal>();
let activeTabId: string | null = null;

const TERM_THEME = {
  background: '#121218',
  foreground: '#d4d4d8',
  cursor: '#d4d4d8',
  cursorAccent: '#121218',
  selectionBackground: 'rgba(255, 255, 255, 0.15)',
  selectionForeground: '#ffffff',
  black: '#27272a',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#d4d4d8',
  brightBlack: '#52525b',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde047',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#fafafa',
};

export function createTerminal(wrapper: HTMLElement, tabId: string): Terminal {
  const container = document.createElement('div');
  container.className = 'tab-terminal';
  container.dataset.tabId = tabId;
  container.style.display = 'none';
  wrapper.appendChild(container);

  const terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: '"Cascadia Code", "SF Mono", "Fira Code", "JetBrains Mono", Consolas, Menlo, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.2,
    allowTransparency: false,
    scrollback: 10000,
    drawBoldTextInBrightColors: false,
    minimumContrastRatio: 1,
    theme: TERM_THEME,
  });

  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  terminal.open(container);

  try {
    const unicode11 = new Unicode11Addon();
    terminal.loadAddon(unicode11);
    terminal.unicode.activeVersion = '11';
  } catch {
    // Unicode 11 addon not available
  }

  try {
    const webglAddon = new WebglAddon();
    webglAddon.onContextLoss(() => {
      webglAddon.dispose();
    });
    terminal.loadAddon(webglAddon);
  } catch {
    // WebGL not available, fall back to canvas
  }

  fitAddon.fit();

  terminal.onData((data) => {
    window.electronAPI.sendPtyInput(tabId, data);
  });

  terminal.onResize(({ cols, rows }) => {
    window.electronAPI.sendPtyResize(tabId, cols, rows);
  });

  const tab: TabTerminal = { terminal, fitAddon, container, tabId };
  tabs.set(tabId, tab);

  return terminal;
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
