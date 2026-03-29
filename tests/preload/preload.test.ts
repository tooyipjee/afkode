import { describe, it, expect, beforeEach, vi } from 'vitest';
import { contextBridge, ipcRenderer } from 'electron';

import '../../src/preload/index';

const exposedApi = (contextBridge.exposeInMainWorld as any).mock.calls[0]?.[1] as Record<string, Function>;

describe('preload — exposeInMainWorld', () => {
  it('exposes electronAPI to main world', () => {
    expect(exposedApi).toBeDefined();
  });

  it('API has all required methods', () => {
    expect(exposedApi.onPtyData).toBeTypeOf('function');
    expect(exposedApi.onPtyExit).toBeTypeOf('function');
    expect(exposedApi.createPtyTab).toBeTypeOf('function');
    expect(exposedApi.closePtyTab).toBeTypeOf('function');
    expect(exposedApi.sendPtyInput).toBeTypeOf('function');
    expect(exposedApi.sendPtyResize).toBeTypeOf('function');
    expect(exposedApi.setConfig).toBeTypeOf('function');
    expect(exposedApi.onOverlayShow).toBeTypeOf('function');
    expect(exposedApi.onOverlayHide).toBeTypeOf('function');
    expect(exposedApi.onConfigUpdate).toBeTypeOf('function');
    expect(exposedApi.getConfig).toBeTypeOf('function');
    expect(exposedApi.hideOverlay).toBeTypeOf('function');
    expect(exposedApi.notifyVisibility).toBeTypeOf('function');
    expect(exposedApi.openFeedback).toBeTypeOf('function');
    expect(exposedApi.getWindowBounds).toBeTypeOf('function');
    expect(exposedApi.setWindowBounds).toBeTypeOf('function');
  });
});

describe('preload — IPC methods', () => {
  beforeEach(() => {
    (ipcRenderer.invoke as any).mockClear();
    (ipcRenderer.send as any).mockClear();
  });

  it('createPtyTab invokes pty:create', () => {
    (ipcRenderer.invoke as any).mockResolvedValue({ tabId: 'tab-1', shell: '/bin/zsh', shellName: 'zsh' });
    exposedApi.createPtyTab('/bin/bash');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('pty:create', '/bin/bash');
  });

  it('createPtyTab works without shell arg', () => {
    (ipcRenderer.invoke as any).mockResolvedValue({ tabId: 'tab-1', shell: '/bin/zsh', shellName: 'zsh' });
    exposedApi.createPtyTab();
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('pty:create', undefined);
  });

  it('closePtyTab sends pty:close', () => {
    exposedApi.closePtyTab('tab-1');
    expect(ipcRenderer.send).toHaveBeenCalledWith('pty:close', 'tab-1');
  });

  it('sendPtyInput sends pty:input with tabId and data', () => {
    exposedApi.sendPtyInput('tab-1', 'hello');
    expect(ipcRenderer.send).toHaveBeenCalledWith('pty:input', 'tab-1', 'hello');
  });

  it('sendPtyResize sends pty:resize with tabId, cols, rows', () => {
    exposedApi.sendPtyResize('tab-1', 80, 24);
    expect(ipcRenderer.send).toHaveBeenCalledWith('pty:resize', 'tab-1', 80, 24);
  });

  it('setConfig invokes config:set', () => {
    (ipcRenderer.invoke as any).mockResolvedValue(undefined);
    exposedApi.setConfig('opacity', 0.8);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('config:set', 'opacity', 0.8);
  });

  it('getConfig invokes config:get', () => {
    (ipcRenderer.invoke as any).mockResolvedValue({});
    exposedApi.getConfig();
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('config:get');
  });

  it('hideOverlay sends overlay:dismiss', () => {
    exposedApi.hideOverlay();
    expect(ipcRenderer.send).toHaveBeenCalledWith('overlay:dismiss');
  });

  it('notifyVisibility sends overlay:visibility', () => {
    exposedApi.notifyVisibility(true);
    expect(ipcRenderer.send).toHaveBeenCalledWith('overlay:visibility', true);

    exposedApi.notifyVisibility(false);
    expect(ipcRenderer.send).toHaveBeenCalledWith('overlay:visibility', false);
  });

  it('openFeedback sends app:open-feedback', () => {
    exposedApi.openFeedback();
    expect(ipcRenderer.send).toHaveBeenCalledWith('app:open-feedback');
  });

  it('getWindowBounds invokes window:getBounds', () => {
    (ipcRenderer.invoke as any).mockResolvedValue({ x: 0, y: 0, width: 800, height: 600 });
    exposedApi.getWindowBounds();
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('window:getBounds');
  });

  it('setWindowBounds sends window:setBounds', () => {
    const bounds = { x: 100, y: 100, width: 1024, height: 768 };
    exposedApi.setWindowBounds(bounds);
    expect(ipcRenderer.send).toHaveBeenCalledWith('window:setBounds', bounds);
  });
});

describe('preload — event listeners', () => {
  beforeEach(() => {
    (ipcRenderer.on as any).mockClear();
    (ipcRenderer.removeAllListeners as any).mockClear();
  });

  it('onPtyData registers pty:data listener and cleans old', () => {
    const cb = vi.fn();
    exposedApi.onPtyData(cb);

    expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('pty:data');
    expect(ipcRenderer.on).toHaveBeenCalledWith('pty:data', expect.any(Function));
  });

  it('onPtyData callback receives tabId and data', () => {
    const cb = vi.fn();
    exposedApi.onPtyData(cb);

    const registeredCb = (ipcRenderer.on as any).mock.calls.find(
      (c: any) => c[0] === 'pty:data',
    )[1];
    registeredCb({}, 'tab-1', 'output');
    expect(cb).toHaveBeenCalledWith('tab-1', 'output');
  });

  it('onPtyExit registers pty:exit listener and cleans old', () => {
    const cb = vi.fn();
    exposedApi.onPtyExit(cb);

    expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('pty:exit');
    expect(ipcRenderer.on).toHaveBeenCalledWith('pty:exit', expect.any(Function));
  });

  it('onPtyExit callback receives tabId and exitCode', () => {
    const cb = vi.fn();
    exposedApi.onPtyExit(cb);

    const registeredCb = (ipcRenderer.on as any).mock.calls.find(
      (c: any) => c[0] === 'pty:exit',
    )[1];
    registeredCb({}, 'tab-1', 0);
    expect(cb).toHaveBeenCalledWith('tab-1', 0);
  });

  it('onOverlayShow registers overlay:show listener', () => {
    const cb = vi.fn();
    exposedApi.onOverlayShow(cb);

    expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('overlay:show');
    expect(ipcRenderer.on).toHaveBeenCalledWith('overlay:show', expect.any(Function));

    const registeredCb = (ipcRenderer.on as any).mock.calls.find(
      (c: any) => c[0] === 'overlay:show',
    )[1];
    registeredCb();
    expect(cb).toHaveBeenCalled();
  });

  it('onOverlayHide registers overlay:hide listener', () => {
    const cb = vi.fn();
    exposedApi.onOverlayHide(cb);

    expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('overlay:hide');
    expect(ipcRenderer.on).toHaveBeenCalledWith('overlay:hide', expect.any(Function));

    const registeredCb = (ipcRenderer.on as any).mock.calls.find(
      (c: any) => c[0] === 'overlay:hide',
    )[1];
    registeredCb();
    expect(cb).toHaveBeenCalled();
  });

  it('onConfigUpdate registers config:update listener', () => {
    const cb = vi.fn();
    exposedApi.onConfigUpdate(cb);

    expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith('config:update');
    expect(ipcRenderer.on).toHaveBeenCalledWith('config:update', expect.any(Function));

    const registeredCb = (ipcRenderer.on as any).mock.calls.find(
      (c: any) => c[0] === 'config:update',
    )[1];
    registeredCb({}, { opacity: 0.5 });
    expect(cb).toHaveBeenCalledWith({ opacity: 0.5 });
  });
});
