import { describe, it, expect } from 'vitest';
import { getConfig, setConfig, getAllConfig, isValidShell, getAvailableShells, defaults } from '../../src/main/config';

describe('config', () => {
  it('returns default hotkey', () => {
    expect(getConfig('hotkey')).toBe('CommandOrControl+`');
  });

  it('returns default opacity', () => {
    expect(getConfig('opacity')).toBe(0.95);
  });

  it('returns default fontSize', () => {
    expect(getConfig('fontSize')).toBe(13);
  });

  it('returns default theme', () => {
    expect(getConfig('theme')).toBe('afkode');
  });

  it('returns a shell path', () => {
    const shell = getConfig('shellPath');
    expect(typeof shell).toBe('string');
    expect(shell.length).toBeGreaterThan(0);
  });

  it('returns null for default windowBounds', () => {
    expect(getConfig('windowBounds')).toBeNull();
  });

  it('setConfig persists value', () => {
    setConfig('opacity', 0.8);
    expect(getConfig('opacity')).toBe(0.8);
    setConfig('opacity', 0.95);
  });

  it('setConfig persists fontSize', () => {
    setConfig('fontSize', 16);
    expect(getConfig('fontSize')).toBe(16);
    setConfig('fontSize', 13);
  });

  it('setConfig persists theme', () => {
    setConfig('theme', 'dracula');
    expect(getConfig('theme')).toBe('dracula');
    setConfig('theme', 'afkode');
  });

  it('setConfig persists windowBounds', () => {
    const bounds = { x: 100, y: 200, width: 800, height: 600 };
    setConfig('windowBounds', bounds);
    expect(getConfig('windowBounds')).toEqual(bounds);
    setConfig('windowBounds', null);
  });

  it('getAllConfig returns full config with validated values', () => {
    const config = getAllConfig();
    expect(config).toHaveProperty('hotkey');
    expect(config).toHaveProperty('opacity');
    expect(config).toHaveProperty('shellPath');
    expect(config).toHaveProperty('windowBounds');
    expect(config).toHaveProperty('fontSize');
    expect(config).toHaveProperty('theme');
  });

  it('validates opacity — returns default for invalid values', () => {
    setConfig('opacity', -1 as any);
    expect(getConfig('opacity')).toBe(defaults.opacity);
    setConfig('opacity', 0.95);
  });

  it('validates hotkey — returns default for empty string', () => {
    setConfig('hotkey', '' as any);
    expect(getConfig('hotkey')).toBe(defaults.hotkey);
    setConfig('hotkey', 'CommandOrControl+`');
  });

  it('validates fontSize — returns default for out of range', () => {
    setConfig('fontSize', 2 as any);
    expect(getConfig('fontSize')).toBe(defaults.fontSize);
    setConfig('fontSize', 50 as any);
    expect(getConfig('fontSize')).toBe(defaults.fontSize);
    setConfig('fontSize', 13);
  });

  it('validates theme — returns default for unknown theme', () => {
    setConfig('theme', 'nonexistent' as any);
    expect(getConfig('theme')).toBe(defaults.theme);
    setConfig('theme', 'afkode');
  });

  it('shellPath defaults appropriately for platform', () => {
    const shell = getConfig('shellPath');
    if (process.platform === 'win32') {
      expect(shell).toMatch(/cmd\.exe|powershell/i);
    } else {
      expect(shell).toMatch(/\//);
    }
  });
});

describe('isValidShell', () => {
  it('accepts /bin/sh', () => {
    if (process.platform !== 'win32') {
      expect(isValidShell('/bin/sh')).toBe(true);
    }
  });

  it('accepts /bin/zsh', () => {
    if (process.platform !== 'win32') {
      expect(isValidShell('/bin/zsh')).toBe(true);
    }
  });

  it('rejects nonexistent path', () => {
    if (process.platform !== 'win32') {
      expect(isValidShell('/nonexistent/shell')).toBe(false);
    }
  });
});

describe('getAvailableShells', () => {
  it('returns a non-empty array', () => {
    const shells = getAvailableShells();
    expect(Array.isArray(shells)).toBe(true);
    expect(shells.length).toBeGreaterThan(0);
  });

  it('each shell has path and name properties', () => {
    const shells = getAvailableShells();
    for (const shell of shells) {
      expect(shell).toHaveProperty('path');
      expect(shell).toHaveProperty('name');
      expect(typeof shell.path).toBe('string');
      expect(typeof shell.name).toBe('string');
      expect(shell.path.length).toBeGreaterThan(0);
      expect(shell.name.length).toBeGreaterThan(0);
    }
  });

  it('does not contain duplicate paths', () => {
    const shells = getAvailableShells();
    const paths = shells.map((s) => s.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
