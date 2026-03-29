import {
  createTerminal,
  activateTab,
  removeTab,
  getActiveTabId,
  getTerminalForTab,
} from './terminal';
import { attachTerminalKeyHandler } from './overlay';

interface Tab {
  id: string;
  title: string;
  element: HTMLElement;
}

interface ShellInfo {
  path: string;
  name: string;
}

const tabList: Tab[] = [];
let terminalWrapper: HTMLElement | null = null;
let tabsContainer: HTMLElement | null = null;
let availableShells: ShellInfo[] = [];
let defaultShellPath: string | null = null;

export function initTabs(
  wrapper: HTMLElement,
  container: HTMLElement,
  shells: ShellInfo[],
  defaultShell: string,
): void {
  terminalWrapper = wrapper;
  tabsContainer = container;
  availableShells = shells;
  defaultShellPath = defaultShell;

  setupShellPicker();
}

export async function addTab(shell?: string): Promise<string> {
  const result = await window.electronAPI.createPtyTab(shell);

  if (!terminalWrapper) throw new Error('Terminal wrapper not initialized');

  const terminal = createTerminal(terminalWrapper, result.tabId);
  attachTerminalKeyHandler(terminal);

  if (result.error) {
    terminal.write(`\r\n\x1b[31mError: ${result.error} (${result.shell})\x1b[0m\r\n`);
  }

  const tab: Tab = {
    id: result.tabId,
    title: result.shellName,
    element: createTabElement(result.tabId, result.shellName),
  };
  tabList.push(tab);
  tabsContainer?.appendChild(tab.element);

  switchTab(result.tabId);
  return result.tabId;
}

let closingInProgress = false;

export function closeTab(tabId: string): void {
  const idx = tabList.findIndex((t) => t.id === tabId);
  if (idx === -1 || closingInProgress) return;

  window.electronAPI.closePtyTab(tabId);
  removeTab(tabId);

  const tab = tabList[idx];
  tab.element.remove();
  tabList.splice(idx, 1);

  if (tabList.length === 0) {
    closingInProgress = true;
    addTab().finally(() => { closingInProgress = false; });
    return;
  }

  if (getActiveTabId() === null || getActiveTabId() === tabId) {
    const newIdx = Math.min(idx, tabList.length - 1);
    switchTab(tabList[newIdx].id);
  }

  updateTabBar();
}

export function switchTab(tabId: string): void {
  activateTab(tabId);
  updateTabBar();
}

export function switchToNextTab(): void {
  const current = getActiveTabId();
  const idx = tabList.findIndex((t) => t.id === current);
  if (idx === -1 || tabList.length <= 1) return;
  const next = (idx + 1) % tabList.length;
  switchTab(tabList[next].id);
}

export function switchToPrevTab(): void {
  const current = getActiveTabId();
  const idx = tabList.findIndex((t) => t.id === current);
  if (idx === -1 || tabList.length <= 1) return;
  const prev = (idx - 1 + tabList.length) % tabList.length;
  switchTab(tabList[prev].id);
}

export function switchToTabIndex(index: number): void {
  if (index >= 0 && index < tabList.length) {
    switchTab(tabList[index].id);
  }
}

export function handlePtyExit(tabId: string): void {
  closeTab(tabId);
}

export function getTabCount(): number {
  return tabList.length;
}

function createTabElement(tabId: string, title: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tab';
  el.dataset.tabId = tabId;

  const label = document.createElement('span');
  label.className = 'tab-label';
  label.textContent = title;
  el.appendChild(label);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'tab-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.title = 'Close Tab';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });
  el.appendChild(closeBtn);

  el.addEventListener('click', () => {
    switchTab(tabId);
  });

  return el;
}

function updateTabBar(): void {
  const activeId = getActiveTabId();
  for (const tab of tabList) {
    tab.element.classList.toggle('active', tab.id === activeId);
  }
}

function setupShellPicker(): void {
  const picker = document.getElementById('shell-picker');
  const pickerBtn = document.getElementById('shell-picker-btn');
  if (!picker || !pickerBtn) return;

  for (const shell of availableShells) {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    if (shell.path === defaultShellPath) {
      item.classList.add('current');
    }
    item.textContent = shell.name;
    item.addEventListener('click', () => {
      picker.classList.add('hidden');
      addTab(shell.path);
    });
    picker.appendChild(item);
  }

  pickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    picker.classList.add('hidden');
  });

  picker.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

export function getTabForTerminal(tabId: string): Tab | undefined {
  return tabList.find((t) => t.id === tabId);
}
