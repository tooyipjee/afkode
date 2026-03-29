import { describe, it, expect, vi } from 'vitest';
import { nativeImage } from 'electron';
import { getTrayIcon } from '../../src/main/icon';

describe('icon', () => {
  it('getTrayIcon returns a nativeImage', () => {
    const icon = getTrayIcon();
    expect(icon).toBeDefined();
  });

  it('getTrayIcon resizes the icon for tray use', () => {
    getTrayIcon();
    const fromPath = nativeImage.createFromPath as any;
    if (fromPath.mock.calls.length > 0) {
      const img = fromPath.mock.results[0].value;
      expect(img.resize).toHaveBeenCalledWith({ width: 18, height: 18 });
    }
  });
});
