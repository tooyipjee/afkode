const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export function initResize(): void {
  const handles = document.querySelectorAll<HTMLElement>('.resize-handle');
  handles.forEach((handle) => {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = handle.dataset.dir;
      if (dir) startResize(e, dir);
    });
  });
}

async function startResize(e: MouseEvent, dir: string): Promise<void> {
  const startX = e.screenX;
  const startY = e.screenY;
  const startBounds = await window.electronAPI.getWindowBounds();

  document.body.style.cursor = `${dir}-resize`;

  let pendingBounds: { x: number; y: number; width: number; height: number } | null = null;
  let rafId = 0;

  function flushBounds() {
    rafId = 0;
    if (pendingBounds) {
      window.electronAPI.setWindowBounds(pendingBounds);
      pendingBounds = null;
    }
  }

  function onMouseMove(ev: MouseEvent) {
    const dx = ev.screenX - startX;
    const dy = ev.screenY - startY;

    let { x, y, width, height } = startBounds;

    if (dir.includes('e')) width += dx;
    if (dir.includes('w')) { x += dx; width -= dx; }
    if (dir.includes('s')) height += dy;
    if (dir.includes('n')) { y += dy; height -= dy; }

    if (width < MIN_WIDTH) {
      if (dir.includes('w')) x -= MIN_WIDTH - width;
      width = MIN_WIDTH;
    }
    if (height < MIN_HEIGHT) {
      if (dir.includes('n')) y -= MIN_HEIGHT - height;
      height = MIN_HEIGHT;
    }

    pendingBounds = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
    if (!rafId) rafId = requestAnimationFrame(flushBounds);
  }

  function onMouseUp() {
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (rafId) cancelAnimationFrame(rafId);
    if (pendingBounds) {
      window.electronAPI.setWindowBounds(pendingBounds);
      pendingBounds = null;
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
