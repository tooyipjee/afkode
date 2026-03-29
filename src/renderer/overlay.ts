import { fitTerminal, focusTerminal, getTerminal, setCursorBlink } from './terminal';

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
  });

  const term = getTerminal();
  if (term) {
    term.attachCustomKeyEventHandler((e) => {
      if (e.key === 'Escape' && e.type === 'keydown') {
        window.electronAPI.hideOverlay();
        return false;
      }
      return true;
    });
  }

  const container = document.getElementById('terminal-container');
  if (!container) return;

  const resizeObserver = new ResizeObserver(() => {
    if (visible && !resizeRaf) {
      resizeRaf = requestAnimationFrame(() => {
        fitTerminal();
        resizeRaf = null;
      });
    }
  });
  resizeObserver.observe(container);
}

export function isOverlayVisible(): boolean {
  return visible;
}
