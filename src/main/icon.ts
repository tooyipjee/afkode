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
  const size = process.platform === 'win32' ? 16 : 18;

  if (iconPath) {
    const icon = nativeImage.createFromPath(iconPath);
    return icon.resize({ width: size, height: size });
  }
  return createFallbackTrayIcon(size);
}

function createFallbackTrayIcon(size: number): nativeImage {
  const canvas = Buffer.alloc(size * size * 4, 0);
  const pad = Math.round(size * 0.1);
  const inner = size - pad * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const inRect = x >= pad && x < pad + inner && y >= pad && y < pad + inner;
      const isEdge = inRect && (x === pad || x === pad + inner - 1 || y === pad || y === pad + inner - 1);
      const cy = Math.round(size * 0.45);
      const isPrompt = y >= cy - 2 && y <= cy + 2 && ((x >= pad + 2 && x <= pad + 4) || (x >= pad + 6 && x <= pad + inner - 3));

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
