import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Tray, Menu } from 'electron';
import { createTray, destroyTray } from '../../src/main/tray';

describe('tray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createTray creates a Tray instance', () => {
    createTray();
    expect(Tray).toHaveBeenCalled();
    destroyTray();
  });

  it('createTray sets tooltip to AFKode', () => {
    createTray();
    const instance = (Tray as any).mock.instances[0];
    expect(instance.setToolTip).toHaveBeenCalledWith('AFKode');
    destroyTray();
  });

  it('createTray builds a context menu', () => {
    createTray();
    expect(Menu.buildFromTemplate).toHaveBeenCalled();
    destroyTray();
  });

  it('context menu includes toggle, opacity, and quit', () => {
    createTray();
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const labels = template
      .filter((item: any) => item.label)
      .map((item: any) => item.label);
    expect(labels).toContain('Toggle Overlay');
    expect(labels).toContain('Opacity');
    expect(labels).toContain('Quit');
    destroyTray();
  });

  it('opacity submenu has correct values', () => {
    createTray();
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const opacityItem = template.find((item: any) => item.label === 'Opacity');
    expect(opacityItem.submenu).toHaveLength(7);
    const labels = opacityItem.submenu.map((s: any) => s.label);
    expect(labels).toContain('60%');
    expect(labels).toContain('95%');
    expect(labels).toContain('100%');
    destroyTray();
  });

  it('destroyTray cleans up', () => {
    createTray();
    const instance = (Tray as any).mock.instances[0];
    destroyTray();
    expect(instance.destroy).toHaveBeenCalled();
  });

  it('destroyTray is safe when no tray exists', () => {
    expect(() => destroyTray()).not.toThrow();
  });
});
