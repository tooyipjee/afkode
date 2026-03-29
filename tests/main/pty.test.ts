import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import { createPty, destroyPty } from '../../src/main/pty';

const mockWindow = {
  isDestroyed: vi.fn(() => false),
  webContents: { send: vi.fn() },
} as any;

describe('pty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createPty registers config:get handler', () => {
    createPty(mockWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('config:get', expect.any(Function));
    destroyPty();
  });

  it('createPty registers pty:input listener', () => {
    createPty(mockWindow);
    const channels = (ipcMain.on as any).mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('pty:input');
    destroyPty();
  });

  it('createPty registers pty:resize listener', () => {
    createPty(mockWindow);
    const channels = (ipcMain.on as any).mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('pty:resize');
    destroyPty();
  });

  it('createPty registers overlay:visibility listener', () => {
    createPty(mockWindow);
    const channels = (ipcMain.on as any).mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('overlay:visibility');
    destroyPty();
  });

  it('config:get handler returns config with platform', () => {
    createPty(mockWindow);
    const handler = (ipcMain.handle as any).mock.calls.find(
      (c: any) => c[0] === 'config:get',
    )[1];
    const config = handler();
    expect(config).toHaveProperty('hotkey');
    expect(config).toHaveProperty('opacity');
    expect(config).toHaveProperty('shellPath');
    expect(config).toHaveProperty('platform');
    expect(config.platform).toBe(process.platform);
    destroyPty();
  });

  it('pty:resize handler validates inputs', () => {
    createPty(mockWindow);
    const resizeHandler = (ipcMain.on as any).mock.calls.find(
      (c: any) => c[0] === 'pty:resize',
    )[1];
    expect(() => resizeHandler({}, 'bad', 'data')).not.toThrow();
    expect(() => resizeHandler({}, -1, 10)).not.toThrow();
    expect(() => resizeHandler({}, 999, 10)).not.toThrow();
    destroyPty();
  });

  it('destroyPty cleans up IPC listeners', () => {
    createPty(mockWindow);
    destroyPty();
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('pty:input');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('pty:resize');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('overlay:visibility');
  });

  it('destroyPty is safe to call when no pty exists', () => {
    expect(() => destroyPty()).not.toThrow();
  });
});
