import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain, shell } from 'electron';
import { spawn, getSpawnedInstances, clearSpawnedInstances } from 'node-pty';
import { createPty, destroyPty } from '../../src/main/pty';

const mockWindow = {
  isDestroyed: vi.fn(() => false),
  webContents: { send: vi.fn() },
  getBounds: vi.fn(() => ({ x: 100, y: 100, width: 800, height: 600 })),
  setBounds: vi.fn(),
} as any;

function getHandler(channel: string): Function {
  return (ipcMain.handle as any).mock.calls.find((c: any) => c[0] === channel)[1];
}

function getListener(channel: string): Function {
  return (ipcMain.on as any).mock.calls.find((c: any) => c[0] === channel)[1];
}

describe('pty — registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
  });

  afterEach(() => {
    destroyPty();
  });

  it('registers config:get handler', () => {
    createPty(mockWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('config:get', expect.any(Function));
  });

  it('registers config:set handler', () => {
    createPty(mockWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('config:set', expect.any(Function));
  });

  it('registers pty:create handler', () => {
    createPty(mockWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('pty:create', expect.any(Function));
  });

  it('registers pty:input, pty:resize, pty:close, overlay:visibility listeners', () => {
    createPty(mockWindow);
    const channels = (ipcMain.on as any).mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('pty:input');
    expect(channels).toContain('pty:resize');
    expect(channels).toContain('pty:close');
    expect(channels).toContain('overlay:visibility');
  });

  it('registers window:getBounds handler', () => {
    createPty(mockWindow);
    expect(ipcMain.handle).toHaveBeenCalledWith('window:getBounds', expect.any(Function));
  });

  it('registers window:setBounds and bug report listeners', () => {
    createPty(mockWindow);
    const channels = (ipcMain.on as any).mock.calls.map((c: any) => c[0]);
    expect(channels).toContain('window:setBounds');
    expect(channels).toContain('app:open-bug-report');
    expect(channels).toContain('app:open-feature-request');
  });
});

describe('pty — config:get', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    createPty(mockWindow);
  });
  afterEach(() => destroyPty());

  it('returns config with platform and availableShells', () => {
    const handler = getHandler('config:get');
    const config = handler();
    expect(config).toHaveProperty('hotkey');
    expect(config).toHaveProperty('opacity');
    expect(config).toHaveProperty('shellPath');
    expect(config).toHaveProperty('fontSize');
    expect(config).toHaveProperty('theme');
    expect(config).toHaveProperty('platform');
    expect(config).toHaveProperty('availableShells');
    expect(config.platform).toBe(process.platform);
    expect(Array.isArray(config.availableShells)).toBe(true);
  });
});

describe('pty — config:set', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    createPty(mockWindow);
  });
  afterEach(() => destroyPty());

  it('updates config values', () => {
    const setHandler = getHandler('config:set');
    const getConfigHandler = getHandler('config:get');

    setHandler({}, 'opacity', 0.8);
    expect(getConfigHandler().opacity).toBe(0.8);

    setHandler({}, 'opacity', 0.95);
  });
});

describe('pty — tab creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);
  });
  afterEach(() => destroyPty());

  it('pty:create returns tabId and shell info', () => {
    const handler = getHandler('pty:create');
    const result = handler({});
    expect(result).toHaveProperty('tabId');
    expect(result).toHaveProperty('shell');
    expect(result).toHaveProperty('shellName');
    expect(result.tabId).toMatch(/^tab-/);
    expect(typeof result.shell).toBe('string');
    expect(typeof result.shellName).toBe('string');
  });

  it('creates unique tab IDs for each creation', () => {
    const handler = getHandler('pty:create');
    const r1 = handler({});
    const r2 = handler({});
    const r3 = handler({});
    expect(r1.tabId).not.toBe(r2.tabId);
    expect(r2.tabId).not.toBe(r3.tabId);
    expect(getSpawnedInstances()).toHaveLength(3);
  });

  it('uses custom shell when provided', () => {
    const handler = getHandler('pty:create');
    const result = handler({}, '/bin/bash');
    expect(result.shell).toBe('/bin/bash');
    expect(result.shellName).toBe('bash');
  });

  it('extracts shellName from windows-style paths', () => {
    const handler = getHandler('pty:create');
    const result = handler({}, 'C:\\Windows\\System32\\cmd.exe');
    expect(result.shellName).toBe('cmd.exe');
  });

  it('does not spawn when window is destroyed', () => {
    mockWindow.isDestroyed.mockReturnValue(true);
    const handler = getHandler('pty:create');
    handler({});
    expect(getSpawnedInstances()).toHaveLength(0);
    mockWindow.isDestroyed.mockReturnValue(false);
  });
});

describe('pty — data flow', () => {
  let createHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.webContents.send.mockClear();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);

    createHandler = getHandler('pty:create');
    const visibilityHandler = getListener('overlay:visibility');
    visibilityHandler({}, true);
  });
  afterEach(() => destroyPty());

  it('routes PTY data to renderer via setImmediate', async () => {
    const result = createHandler({});
    const pty = getSpawnedInstances()[0];

    pty._triggerData('hello world');
    await new Promise(resolve => setImmediate(resolve));

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'pty:data', result.tabId, 'hello world',
    );
  });

  it('batches rapid data into single flush', async () => {
    createHandler({});
    const pty = getSpawnedInstances()[0];

    pty._triggerData('chunk1');
    pty._triggerData('chunk2');
    pty._triggerData('chunk3');
    await new Promise(resolve => setImmediate(resolve));

    const dataCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: any) => c[0] === 'pty:data',
    );
    expect(dataCalls).toHaveLength(1);
    expect(dataCalls[0][2]).toBe('chunk1chunk2chunk3');
  });

  it('sends PTY exit event to renderer', () => {
    const result = createHandler({});
    const pty = getSpawnedInstances()[0];

    pty._triggerExit({ exitCode: 0 });

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'pty:exit', result.tabId, 0,
    );
  });

  it('sends non-zero exit code', () => {
    const result = createHandler({});
    const pty = getSpawnedInstances()[0];

    pty._triggerExit({ exitCode: 127 });

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'pty:exit', result.tabId, 127,
    );
  });

  it('routes data to correct tab in multi-tab scenario', async () => {
    const r1 = createHandler({});
    const r2 = createHandler({});
    const ptys = getSpawnedInstances();

    ptys[0]._triggerData('from tab 1');
    ptys[1]._triggerData('from tab 2');
    await new Promise(resolve => setImmediate(resolve));

    const dataCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: any) => c[0] === 'pty:data',
    );
    expect(dataCalls).toEqual(
      expect.arrayContaining([
        ['pty:data', r1.tabId, 'from tab 1'],
        ['pty:data', r2.tabId, 'from tab 2'],
      ]),
    );
  });

  it('does not send data when window is destroyed mid-session', async () => {
    createHandler({});
    const pty = getSpawnedInstances()[0];

    mockWindow.isDestroyed.mockReturnValue(true);
    pty._triggerData('lost data');
    await new Promise(resolve => setImmediate(resolve));

    const dataCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: any) => c[0] === 'pty:data',
    );
    expect(dataCalls).toHaveLength(0);
    mockWindow.isDestroyed.mockReturnValue(false);
  });
});

describe('pty — hidden buffer', () => {
  let createHandler: Function;
  let visibilityHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.webContents.send.mockClear();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);

    createHandler = getHandler('pty:create');
    visibilityHandler = getListener('overlay:visibility');
    visibilityHandler({}, true);
  });
  afterEach(() => destroyPty());

  it('buffers data when overlay is hidden', async () => {
    createHandler({});
    const pty = getSpawnedInstances()[0];

    visibilityHandler({}, false);
    pty._triggerData('hidden data');
    await new Promise(resolve => setImmediate(resolve));

    const dataCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: any) => c[0] === 'pty:data',
    );
    expect(dataCalls).toHaveLength(0);
  });

  it('flushes hidden buffer when overlay becomes visible', async () => {
    const result = createHandler({});
    const pty = getSpawnedInstances()[0];

    visibilityHandler({}, false);
    pty._triggerData('buffered');
    await new Promise(resolve => setImmediate(resolve));

    visibilityHandler({}, true);

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'pty:data', result.tabId, 'buffered',
    );
  });

  it('flushes hidden buffers for all tabs on show', async () => {
    const r1 = createHandler({});
    const r2 = createHandler({});
    const ptys = getSpawnedInstances();

    visibilityHandler({}, false);
    ptys[0]._triggerData('buf1');
    ptys[1]._triggerData('buf2');
    await new Promise(resolve => setImmediate(resolve));

    visibilityHandler({}, true);

    const dataCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: any) => c[0] === 'pty:data',
    );
    expect(dataCalls).toEqual(
      expect.arrayContaining([
        ['pty:data', r1.tabId, 'buf1'],
        ['pty:data', r2.tabId, 'buf2'],
      ]),
    );
  });

  it('truncates hidden buffer at 50k characters', async () => {
    createHandler({});
    const pty = getSpawnedInstances()[0];

    visibilityHandler({}, false);
    const bigData = 'x'.repeat(60_000);
    pty._triggerData(bigData);

    visibilityHandler({}, true);

    const dataCalls = mockWindow.webContents.send.mock.calls.filter(
      (c: any) => c[0] === 'pty:data',
    );
    expect(dataCalls.length).toBe(1);
    expect(dataCalls[0][2].length).toBeLessThanOrEqual(50_000);
  });
});

describe('pty — input routing', () => {
  let createHandler: Function;
  let inputHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);
    createHandler = getHandler('pty:create');
    inputHandler = getListener('pty:input');
  });
  afterEach(() => destroyPty());

  it('routes input to the correct PTY', () => {
    const result = createHandler({});
    const pty = getSpawnedInstances()[0];

    inputHandler({}, result.tabId, 'ls -la\r');
    expect(pty.write).toHaveBeenCalledWith('ls -la\r');
  });

  it('does not throw for non-existent tab', () => {
    expect(() => inputHandler({}, 'nonexistent', 'test')).not.toThrow();
  });

  it('routes input to correct tab in multi-tab', () => {
    createHandler({});
    const r2 = createHandler({});
    const ptys = getSpawnedInstances();

    inputHandler({}, r2.tabId, 'to tab 2');
    expect(ptys[1].write).toHaveBeenCalledWith('to tab 2');
    expect(ptys[0].write).not.toHaveBeenCalled();
  });
});

describe('pty — resize', () => {
  let createHandler: Function;
  let resizeHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);
    createHandler = getHandler('pty:create');
    resizeHandler = getListener('pty:resize');
  });
  afterEach(() => destroyPty());

  it('resizes the PTY with valid dimensions', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 120, 40);
    expect(getSpawnedInstances()[0].resize).toHaveBeenCalledWith(120, 40);
  });

  it('floors fractional dimensions', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 80.7, 24.3);
    expect(getSpawnedInstances()[0].resize).toHaveBeenCalledWith(80, 24);
  });

  it('rejects non-number cols/rows', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 'bad', 'data');
    expect(getSpawnedInstances()[0].resize).not.toHaveBeenCalled();
  });

  it('rejects cols < 1', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 0, 24);
    expect(getSpawnedInstances()[0].resize).not.toHaveBeenCalled();
  });

  it('rejects rows < 1', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 80, 0);
    expect(getSpawnedInstances()[0].resize).not.toHaveBeenCalled();
  });

  it('rejects cols > 500', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 501, 24);
    expect(getSpawnedInstances()[0].resize).not.toHaveBeenCalled();
  });

  it('rejects rows > 500', () => {
    const result = createHandler({});
    resizeHandler({}, result.tabId, 80, 501);
    expect(getSpawnedInstances()[0].resize).not.toHaveBeenCalled();
  });

  it('does not throw for non-existent tab', () => {
    expect(() => resizeHandler({}, 'nonexistent', 80, 24)).not.toThrow();
  });

  it('catches resize error on exited PTY', () => {
    const result = createHandler({});
    getSpawnedInstances()[0].resize.mockImplementation(() => { throw new Error('PTY exited'); });
    expect(() => resizeHandler({}, result.tabId, 80, 24)).not.toThrow();
  });
});

describe('pty — close', () => {
  let createHandler: Function;
  let closeHandler: Function;
  let inputHandler: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);
    createHandler = getHandler('pty:create');
    closeHandler = getListener('pty:close');
    inputHandler = getListener('pty:input');
  });
  afterEach(() => destroyPty());

  it('kills PTY process on close', () => {
    const result = createHandler({});
    closeHandler({}, result.tabId);
    expect(getSpawnedInstances()[0].kill).toHaveBeenCalled();
  });

  it('removes session so subsequent input is a no-op', () => {
    const result = createHandler({});
    closeHandler({}, result.tabId);
    inputHandler({}, result.tabId, 'should be ignored');
    expect(getSpawnedInstances()[0].write).not.toHaveBeenCalled();
  });

  it('does not throw for non-existent tab', () => {
    expect(() => closeHandler({}, 'nonexistent')).not.toThrow();
  });

  it('closes only the specified tab', () => {
    const r1 = createHandler({});
    const r2 = createHandler({});
    const ptys = getSpawnedInstances();

    closeHandler({}, r1.tabId);
    expect(ptys[0].kill).toHaveBeenCalled();
    expect(ptys[1].kill).not.toHaveBeenCalled();

    inputHandler({}, r2.tabId, 'still alive');
    expect(ptys[1].write).toHaveBeenCalledWith('still alive');
  });
});

describe('pty — spawn error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.webContents.send.mockClear();
    mockWindow.isDestroyed.mockReturnValue(false);
  });
  afterEach(() => destroyPty());

  it('sends error message to renderer when spawn fails', () => {
    (spawn as any).mockImplementationOnce(() => { throw new Error('spawn failed'); });
    createPty(mockWindow);
    const handler = getHandler('pty:create');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    handler({});

    expect(mockWindow.webContents.send).toHaveBeenCalledWith(
      'pty:data',
      expect.stringMatching(/^tab-/),
      expect.stringContaining('Error: Failed to start shell'),
    );
    spy.mockRestore();
  });

  it('still returns tabId even when spawn fails', () => {
    (spawn as any).mockImplementationOnce(() => { throw new Error('fail'); });
    createPty(mockWindow);
    const handler = getHandler('pty:create');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = handler({});
    expect(result.tabId).toMatch(/^tab-/);
    expect(result.shell).toBeDefined();
  });
});

describe('pty — window bounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);
  });
  afterEach(() => destroyPty());

  it('window:getBounds returns current window bounds', () => {
    const handler = getHandler('window:getBounds');
    const bounds = handler();
    expect(bounds).toEqual({ x: 100, y: 100, width: 800, height: 600 });
    expect(mockWindow.getBounds).toHaveBeenCalled();
  });

  it('window:getBounds returns defaults when window is destroyed', () => {
    mockWindow.isDestroyed.mockReturnValue(true);
    const handler = getHandler('window:getBounds');
    const bounds = handler();
    expect(bounds).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    mockWindow.isDestroyed.mockReturnValue(false);
  });

  it('window:setBounds sets window bounds', () => {
    const listener = getListener('window:setBounds');
    const newBounds = { x: 200, y: 200, width: 1024, height: 768 };
    listener({}, newBounds);
    expect(mockWindow.setBounds).toHaveBeenCalledWith(newBounds);
  });

  it('window:setBounds does nothing when window is destroyed', () => {
    mockWindow.isDestroyed.mockReturnValue(true);
    const listener = getListener('window:setBounds');
    listener({}, { x: 0, y: 0, width: 800, height: 600 });
    expect(mockWindow.setBounds).not.toHaveBeenCalled();
    mockWindow.isDestroyed.mockReturnValue(false);
  });
});

describe('pty — feedback links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
    createPty(mockWindow);
  });
  afterEach(() => destroyPty());

  it('app:open-bug-report opens GitHub bug report URL', () => {
    const listener = getListener('app:open-bug-report');
    listener({});
    expect(shell.openExternal).toHaveBeenCalledWith(
      expect.stringContaining('github.com/jasontoo/afkode/issues/new'),
    );
    expect(shell.openExternal).toHaveBeenCalledWith(
      expect.stringContaining('labels=bug'),
    );
  });

  it('app:open-feature-request opens GitHub feature request URL', () => {
    const listener = getListener('app:open-feature-request');
    listener({});
    expect(shell.openExternal).toHaveBeenCalledWith(
      expect.stringContaining('github.com/jasontoo/afkode/issues/new'),
    );
    expect(shell.openExternal).toHaveBeenCalledWith(
      expect.stringContaining('labels=enhancement'),
    );
  });
});

describe('pty — destroyPty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSpawnedInstances();
    mockWindow.isDestroyed.mockReturnValue(false);
  });

  it('kills all active sessions', () => {
    createPty(mockWindow);
    const handler = getHandler('pty:create');
    handler({});
    handler({});
    const ptys = getSpawnedInstances();

    destroyPty();
    expect(ptys[0].kill).toHaveBeenCalled();
    expect(ptys[1].kill).toHaveBeenCalled();
  });

  it('cleans up all IPC listeners and handlers', () => {
    createPty(mockWindow);
    destroyPty();
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('pty:input');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('pty:resize');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('pty:close');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('overlay:visibility');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('app:open-bug-report');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('app:open-feature-request');
    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('window:setBounds');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('config:get');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('config:set');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('pty:create');
    expect(ipcMain.removeHandler).toHaveBeenCalledWith('window:getBounds');
  });

  it('is safe to call when no PTY exists', () => {
    expect(() => destroyPty()).not.toThrow();
  });

  it('is safe to call multiple times', () => {
    createPty(mockWindow);
    destroyPty();
    expect(() => destroyPty()).not.toThrow();
  });
});
