import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tray, Menu, app } from 'electron';
import { createTray, destroyTray } from '../../src/main/tray';
import { createWindow, getWindow } from '../../src/main/window';
import { getConfig, setConfig, getAvailableShells } from '../../src/main/config';

function getMenuTemplate(): any[] {
  return (Menu.buildFromTemplate as any).mock.calls[0][0];
}

function findMenuItem(label: string): any {
  return getMenuTemplate().find((item: any) => item.label === label);
}

describe('tray — creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a Tray instance', () => {
    createTray();
    expect(Tray).toHaveBeenCalled();
    destroyTray();
  });

  it('sets tooltip to AFKode', () => {
    createTray();
    const instance = (Tray as any).mock.instances[0];
    expect(instance.setToolTip).toHaveBeenCalledWith('AFKode');
    destroyTray();
  });

  it('builds a context menu', () => {
    createTray();
    expect(Menu.buildFromTemplate).toHaveBeenCalled();
    destroyTray();
  });

  it('context menu includes toggle, default shell, opacity, and quit', () => {
    createTray();
    const labels = getMenuTemplate()
      .filter((item: any) => item.label)
      .map((item: any) => item.label);
    expect(labels).toContain('Toggle Overlay');
    expect(labels).toContain('Default Shell');
    expect(labels).toContain('Opacity');
    expect(labels).toContain('Quit');
    destroyTray();
  });
});

describe('tray — opacity submenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has 7 opacity levels', () => {
    createTray();
    const opacityItem = findMenuItem('Opacity');
    expect(opacityItem.submenu).toHaveLength(7);
    destroyTray();
  });

  it('includes 60%, 95%, and 100%', () => {
    createTray();
    const opacityItem = findMenuItem('Opacity');
    const labels = opacityItem.submenu.map((s: any) => s.label);
    expect(labels).toContain('60%');
    expect(labels).toContain('95%');
    expect(labels).toContain('100%');
    destroyTray();
  });

  it('marks current opacity as checked', () => {
    setConfig('opacity', 0.9);
    createTray();
    const opacityItem = findMenuItem('Opacity');
    const ninetyPercent = opacityItem.submenu.find((s: any) => s.label === '90%');
    expect(ninetyPercent.checked).toBe(true);
    setConfig('opacity', 0.95);
    destroyTray();
  });

  it('click updates config and sends config:update', () => {
    const win = createWindow();
    win.isDestroyed = vi.fn(() => false);
    createTray();

    const opacityItem = findMenuItem('Opacity');
    const eightyPercent = opacityItem.submenu.find((s: any) => s.label === '80%');
    eightyPercent.click();

    expect(getConfig('opacity')).toBe(0.8);
    expect(win.webContents.send).toHaveBeenCalledWith('config:update', { opacity: 0.8 });

    setConfig('opacity', 0.95);
    destroyTray();
  });
});

describe('tray — shell submenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('contains available shells', () => {
    createTray();
    const shellItem = findMenuItem('Default Shell');
    expect(shellItem.submenu).toBeDefined();
    expect(Array.isArray(shellItem.submenu)).toBe(true);
    expect(shellItem.submenu.length).toBeGreaterThan(0);
    destroyTray();
  });

  it('all items are radio type', () => {
    createTray();
    const shellItem = findMenuItem('Default Shell');
    for (const item of shellItem.submenu) {
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('type', 'radio');
    }
    destroyTray();
  });

  it('click updates default shell config', () => {
    createTray();
    const shellItem = findMenuItem('Default Shell');
    const shells = getAvailableShells();

    if (shells.length > 0) {
      const originalShell = getConfig('shellPath');
      shellItem.submenu[0].click();
      expect(getConfig('shellPath')).toBe(shells[0].path);
      setConfig('shellPath', originalShell);
    }
    destroyTray();
  });
});

describe('tray — toggle overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows hidden overlay', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => false);
    win.isDestroyed = vi.fn(() => false);
    createTray();

    const toggleItem = findMenuItem('Toggle Overlay');
    toggleItem.click();

    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('overlay:show');
    destroyTray();
  });

  it('hides visible overlay', () => {
    const win = createWindow();
    win.isVisible = vi.fn(() => true);
    win.isDestroyed = vi.fn(() => false);
    createTray();

    const toggleItem = findMenuItem('Toggle Overlay');
    toggleItem.click();

    expect(win.hide).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith('overlay:hide');
    destroyTray();
  });

  it('is safe when no window exists', () => {
    const win = createWindow();
    const closedHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === 'closed',
    )[1];
    closedHandler();

    createTray();
    const toggleItem = findMenuItem('Toggle Overlay');
    expect(() => toggleItem.click()).not.toThrow();
    destroyTray();
  });
});

describe('tray — quit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls app.quit', () => {
    createTray();
    const quitItem = findMenuItem('Quit');
    quitItem.click();
    expect(app.quit).toHaveBeenCalled();
    destroyTray();
  });
});

describe('tray — destroyTray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('destroys the tray', () => {
    createTray();
    const instance = (Tray as any).mock.instances[0];
    destroyTray();
    expect(instance.destroy).toHaveBeenCalled();
  });

  it('is safe when no tray exists', () => {
    expect(() => destroyTray()).not.toThrow();
  });

  it('is safe to call multiple times', () => {
    createTray();
    destroyTray();
    expect(() => destroyTray()).not.toThrow();
  });
});
