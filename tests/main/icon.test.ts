import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('icon — with real file system', () => {
  it('getTrayIcon returns a defined value', async () => {
    const { getTrayIcon } = await import('../../src/main/icon');
    const icon = getTrayIcon();
    expect(icon).toBeDefined();
  });
});

describe('icon — fallback path', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getIconPath returns null when no icon files exist', async () => {
    vi.doMock('fs', () => ({ existsSync: vi.fn(() => false) }));

    const { getIconPath } = await import('../../src/main/icon');
    expect(getIconPath()).toBeNull();
  });

  it('getIconPath caches null result', async () => {
    const mockExists = vi.fn(() => false);
    vi.doMock('fs', () => ({ existsSync: mockExists }));

    const { getIconPath } = await import('../../src/main/icon');
    getIconPath();
    const callCount = mockExists.mock.calls.length;
    getIconPath();
    expect(mockExists.mock.calls.length).toBe(callCount);
  });

  it('uses createFromBuffer for fallback icon', async () => {
    vi.doMock('fs', () => ({ existsSync: vi.fn(() => false) }));

    const { nativeImage } = await import('electron');
    (nativeImage.createFromBuffer as any).mockClear();
    const { getTrayIcon } = await import('../../src/main/icon');

    getTrayIcon();
    expect(nativeImage.createFromBuffer).toHaveBeenCalled();
  });

  it('fallback icon has correct buffer size and dimensions', async () => {
    vi.doMock('fs', () => ({ existsSync: vi.fn(() => false) }));

    const { nativeImage } = await import('electron');
    (nativeImage.createFromBuffer as any).mockClear();
    const { getTrayIcon } = await import('../../src/main/icon');

    getTrayIcon();

    const call = (nativeImage.createFromBuffer as any).mock.calls[0];
    const buffer: Buffer = call[0];
    const opts = call[1];
    const expectedSize = process.platform === 'win32' ? 16 : 18;

    expect(opts.width).toBe(expectedSize);
    expect(opts.height).toBe(expectedSize);
    expect(buffer.length).toBe(expectedSize * expectedSize * 4);
  });

  it('fallback icon buffer contains non-zero pixel data', async () => {
    vi.doMock('fs', () => ({ existsSync: vi.fn(() => false) }));

    const { nativeImage } = await import('electron');
    (nativeImage.createFromBuffer as any).mockClear();
    const { getTrayIcon } = await import('../../src/main/icon');

    getTrayIcon();

    const buffer: Buffer = (nativeImage.createFromBuffer as any).mock.calls[0][0];
    const hasContent = buffer.some((byte: number) => byte !== 0);
    expect(hasContent).toBe(true);
  });
});

describe('icon — file found path', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getIconPath returns path when icon file exists', async () => {
    vi.doMock('fs', () => ({ existsSync: vi.fn(() => true) }));

    const { getIconPath } = await import('../../src/main/icon');
    const path = getIconPath();
    expect(path).not.toBeNull();
    expect(path).toMatch(/icon\.png$/);
  });

  it('getTrayIcon uses createFromPath and resizes', async () => {
    vi.doMock('fs', () => ({ existsSync: vi.fn(() => true) }));

    const { nativeImage } = await import('electron');
    (nativeImage.createFromPath as any).mockClear();
    const { getTrayIcon } = await import('../../src/main/icon');

    getTrayIcon();

    expect(nativeImage.createFromPath).toHaveBeenCalled();
    const img = (nativeImage.createFromPath as any).mock.results[0].value;
    const expectedSize = process.platform === 'win32' ? 16 : 18;
    expect(img.resize).toHaveBeenCalledWith({ width: expectedSize, height: expectedSize });
  });

  it('getIconPath caches found path', async () => {
    const mockExists = vi.fn(() => true);
    vi.doMock('fs', () => ({ existsSync: mockExists }));

    const { getIconPath } = await import('../../src/main/icon');
    const first = getIconPath();
    const callCount = mockExists.mock.calls.length;
    const second = getIconPath();

    expect(second).toBe(first);
    expect(mockExists.mock.calls.length).toBe(callCount);
  });
});
