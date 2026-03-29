import { app, nativeImage } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

let cachedPath: string | null = null;

export function getIconPath(): string | null {
  if (cachedPath !== null) return cachedPath || null;

  const candidates = [
    join(app.getAppPath(), 'assets', 'icon.png'),
    join(__dirname, '../../assets/icon.png'),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      cachedPath = p;
      return p;
    }
  }

  cachedPath = '';
  return null;
}

export function getTrayIcon(): nativeImage {
  const iconPath = getIconPath();
  if (iconPath) {
    const icon = nativeImage.createFromPath(iconPath);
    return icon.resize({ width: 18, height: 18 });
  }
  return createFallbackTrayIcon();
}

function createFallbackTrayIcon(): nativeImage {
  const size = 32;
  const canvas = Buffer.alloc(size * size * 4, 0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const inRect = x >= 3 && x < size - 3 && y >= 5 && y < size - 5;
      const isEdge = inRect && (x === 3 || x === size - 4 || y === 5 || y === size - 6);
      const isPrompt = y >= 12 && y <= 19 && ((x >= 8 && x <= 10) || (x >= 13 && x <= 20));

      if (isEdge || isPrompt) {
        canvas[idx] = 255;
        canvas[idx + 1] = 255;
        canvas[idx + 2] = 255;
        canvas[idx + 3] = 255;
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}
