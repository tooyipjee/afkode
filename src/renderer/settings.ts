import { themes, getTheme, type ThemeDef } from './themes';
import { applyThemeToAll, setFontSizeAll, fitTerminal, focusTerminal } from './terminal';

let open = false;
let panel: HTMLElement | null = null;
let currentThemeId = 'afkode';
let currentFontSize = 13;
let currentOpacity = 0.95;
let platform = 'darwin';

interface ShellInfo { path: string; name: string }
let shells: ShellInfo[] = [];
let defaultShell = '';

export function initSettings(config: Record<string, unknown>): void {
  panel = document.getElementById('settings-panel');
  currentThemeId = (config.theme as string) || 'afkode';
  currentFontSize = (config.fontSize as number) || 13;
  currentOpacity = (config.opacity as number) || 0.95;
  platform = (config.platform as string) || 'darwin';
  shells = (config.availableShells as ShellInfo[]) || [];
  defaultShell = (config.shellPath as string) || '';

  buildSettingsContent();
  setupKeyboardClose();
}

export function toggleSettings(): void {
  if (open) closeSettings();
  else openSettings();
}

export function openSettings(): void {
  if (!panel) return;
  panel.classList.remove('hidden');
  open = true;
}

export function closeSettings(): void {
  if (!panel) return;
  panel.classList.add('hidden');
  open = false;
  focusTerminal();
}

export function isSettingsOpen(): boolean {
  return open;
}

export function getCurrentThemeId(): string {
  return currentThemeId;
}

function setupKeyboardClose(): void {
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      closeSettings();
    }
  });
}

function buildSettingsContent(): void {
  if (!panel) return;
  const isMac = platform === 'darwin';

  panel.innerHTML = `
    <div class="settings-grid">
      <div class="settings-row">
        <label class="settings-label">Default Shell</label>
        <select id="setting-shell" class="settings-select">
          ${shells.map((s) => `<option value="${escapeHtml(s.path)}" ${s.path === defaultShell ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
        </select>
      </div>
      <div class="settings-row">
        <label class="settings-label">Font Size</label>
        <div class="settings-stepper">
          <button id="font-dec" class="stepper-btn">\u2212</button>
          <span id="font-val" class="stepper-val">${currentFontSize}</span>
          <button id="font-inc" class="stepper-btn">+</button>
        </div>
      </div>
      <div class="settings-row">
        <label class="settings-label">Theme</label>
        <div id="theme-swatches" class="theme-swatches">
          ${themes.map((t) => `<button class="theme-swatch ${t.id === currentThemeId ? 'active' : ''}" data-theme="${t.id}" title="${t.name}" style="background:${t.swatch}"></button>`).join('')}
        </div>
      </div>
      <div class="settings-row">
        <label class="settings-label">Opacity</label>
        <div class="settings-slider-wrap">
          <input type="range" id="setting-opacity" class="settings-slider" min="50" max="100" value="${Math.round(currentOpacity * 100)}" />
          <span id="opacity-val" class="slider-val">${Math.round(currentOpacity * 100)}%</span>
        </div>
      </div>
    </div>
    <div class="settings-divider"></div>
    <div class="shortcuts-section">
      <div class="settings-label" style="margin-bottom:6px">Keyboard Shortcuts</div>
      <div class="shortcut-grid">
        <div class="shortcut-row"><kbd>${isMac ? '\u2318\`' : 'Ctrl+\`'}</kbd><span>Toggle overlay</span></div>
        <div class="shortcut-row"><kbd>Escape</kbd><span>Close settings</span></div>
        <div class="shortcut-row"><kbd>${isMac ? '\u2318T' : 'Ctrl+Shift+T'}</kbd><span>New tab</span></div>
        <div class="shortcut-row"><kbd>${isMac ? '\u2318W' : 'Ctrl+Shift+W'}</kbd><span>Close tab</span></div>
        <div class="shortcut-row"><kbd>Ctrl+Tab</kbd><span>Next tab</span></div>
        <div class="shortcut-row"><kbd>Ctrl+Shift+Tab</kbd><span>Prev tab</span></div>
        <div class="shortcut-row"><kbd>${isMac ? '\u2318' : 'Ctrl+'}1\u20139</kbd><span>Jump to tab</span></div>
        <div class="shortcut-row"><kbd>${isMac ? '\u2318,' : 'Ctrl+,'}</kbd><span>Settings</span></div>
      </div>
    </div>
  `;

  bindEvents();
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bindEvents(): void {
  const shellSelect = document.getElementById('setting-shell') as HTMLSelectElement | null;
  if (shellSelect) {
    shellSelect.addEventListener('change', () => {
      defaultShell = shellSelect.value;
      window.electronAPI.setConfig('shellPath', shellSelect.value);
    });
  }

  document.getElementById('font-dec')?.addEventListener('click', () => {
    if (currentFontSize > 8) {
      currentFontSize--;
      applyFontSize();
    }
  });

  document.getElementById('font-inc')?.addEventListener('click', () => {
    if (currentFontSize < 28) {
      currentFontSize++;
      applyFontSize();
    }
  });

  document.getElementById('theme-swatches')?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.theme-swatch') as HTMLElement | null;
    if (!btn) return;
    const id = btn.dataset.theme;
    if (id) applyTheme(id);
  });

  const opacitySlider = document.getElementById('setting-opacity') as HTMLInputElement | null;
  if (opacitySlider) {
    opacitySlider.addEventListener('input', () => {
      const pct = parseInt(opacitySlider.value, 10);
      currentOpacity = pct / 100;
      const valEl = document.getElementById('opacity-val');
      if (valEl) valEl.textContent = `${pct}%`;
      applyOpacity();
    });
    opacitySlider.addEventListener('change', () => {
      window.electronAPI.setConfig('opacity', currentOpacity);
    });
  }

  panel?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function applyFontSize(): void {
  const valEl = document.getElementById('font-val');
  if (valEl) valEl.textContent = String(currentFontSize);
  setFontSizeAll(currentFontSize);
  window.electronAPI.setConfig('fontSize', currentFontSize);
}

function applyTheme(id: string): void {
  currentThemeId = id;
  const theme = getTheme(id);
  applyThemeToAll(id, theme.terminal);

  document.documentElement.style.setProperty('--bg', theme.overlayBg(currentOpacity));

  document.querySelectorAll('.theme-swatch').forEach((el) => {
    el.classList.toggle('active', (el as HTMLElement).dataset.theme === id);
  });

  window.electronAPI.setConfig('theme', id);
}

function applyOpacity(): void {
  const theme = getTheme(currentThemeId);
  document.documentElement.style.setProperty('--opacity', String(currentOpacity));
  document.documentElement.style.setProperty('--bg', theme.overlayBg(currentOpacity));
}
