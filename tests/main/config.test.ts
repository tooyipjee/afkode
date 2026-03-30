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

  it('returns default startOnBoot', () => {
    expect(getConfig('startOnBoot')).toBe(false);
  });

  it('returns a shell path', () => {
    const shell = getConfig('shellPath');
    expect(typeof shell).toBe('string');
    expect(shell.length).toBeGreaterThan(0);
  });

  it('returns null for default windowBounds', () => {
    expect(getConfig('windowBounds')).toBeNull();
  });

  it('setConfig persists opacity', () => {
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

  it('setConfig persists startOnBoot', () => {
    setConfig('startOnBoot', true);
    expect(getConfig('startOnBoot')).toBe(true);
    setConfig('startOnBoot', false);
  });

  it('validates startOnBoot — returns default for non-boolean', () => {
    setConfig('startOnBoot', 'yes' as any);
    expect(getConfig('startOnBoot')).toBe(false);
    setConfig('startOnBoot', false);
  });

  it('getAllConfig returns full config with validated values', () => {
    const config = getAllConfig();
    expect(config).toHaveProperty('hotkey');
    expect(config).toHaveProperty('opacity');
    expect(config).toHaveProperty('shellPath');
    expect(config).toHaveProperty('windowBounds');
    expect(config).toHaveProperty('fontSize');
    expect(config).toHaveProperty('theme');
    expect(config).toHaveProperty('startOnBoot');
  });

  it('validates opacity — returns default for negative', () => {
    setConfig('opacity', -1 as any);
    expect(getConfig('opacity')).toBe(defaults.opacity);
    setConfig('opacity', 0.95);
  });

  it('validates opacity — returns default for > 1', () => {
    setConfig('opacity', 1.5 as any);
    expect(getConfig('opacity')).toBe(defaults.opacity);
    setConfig('opacity', 0.95);
  });

  it('validates opacity — returns default for NaN', () => {
    setConfig('opacity', NaN as any);
    expect(getConfig('opacity')).toBe(defaults.opacity);
    setConfig('opacity', 0.95);
  });

  it('validates opacity — returns default for non-number', () => {
    setConfig('opacity', 'bad' as any);
    expect(getConfig('opacity')).toBe(defaults.opacity);
    setConfig('opacity', 0.95);
  });

  it('validates opacity — accepts boundary value 0', () => {
    setConfig('opacity', 0);
    expect(getConfig('opacity')).toBe(0);
    setConfig('opacity', 0.95);
  });

  it('validates opacity — accepts boundary value 1', () => {
    setConfig('opacity', 1);
    expect(getConfig('opacity')).toBe(1);
    setConfig('opacity', 0.95);
  });

  it('validates hotkey — returns default for empty string', () => {
    setConfig('hotkey', '' as any);
    expect(getConfig('hotkey')).toBe(defaults.hotkey);
    setConfig('hotkey', 'CommandOrControl+`');
  });

  it('validates hotkey — returns default for non-string', () => {
    setConfig('hotkey', 123 as any);
    expect(getConfig('hotkey')).toBe(defaults.hotkey);
    setConfig('hotkey', 'CommandOrControl+`');
  });

  it('validates fontSize — returns default for below minimum (8)', () => {
    setConfig('fontSize', 7 as any);
    expect(getConfig('fontSize')).toBe(defaults.fontSize);
    setConfig('fontSize', 13);
  });

  it('validates fontSize — returns default for above maximum (28)', () => {
    setConfig('fontSize', 29 as any);
    expect(getConfig('fontSize')).toBe(defaults.fontSize);
    setConfig('fontSize', 13);
  });

  it('validates fontSize — returns default for NaN', () => {
    setConfig('fontSize', NaN as any);
    expect(getConfig('fontSize')).toBe(defaults.fontSize);
    setConfig('fontSize', 13);
  });

  it('validates fontSize — returns default for non-number', () => {
    setConfig('fontSize', 'big' as any);
    expect(getConfig('fontSize')).toBe(defaults.fontSize);
    setConfig('fontSize', 13);
  });

  it('validates fontSize — accepts boundary value 8', () => {
    setConfig('fontSize', 8);
    expect(getConfig('fontSize')).toBe(8);
    setConfig('fontSize', 13);
  });

  it('validates fontSize — accepts boundary value 28', () => {
    setConfig('fontSize', 28);
    expect(getConfig('fontSize')).toBe(28);
    setConfig('fontSize', 13);
  });

  it('validates theme — returns default for unknown theme', () => {
    setConfig('theme', 'nonexistent' as any);
    expect(getConfig('theme')).toBe(defaults.theme);
    setConfig('theme', 'afkode');
  });

  it('validates theme — returns default for empty string', () => {
    setConfig('theme', '' as any);
    expect(getConfig('theme')).toBe(defaults.theme);
    setConfig('theme', 'afkode');
  });

  it('validates theme — returns default for non-string', () => {
    setConfig('theme', 42 as any);
    expect(getConfig('theme')).toBe(defaults.theme);
    setConfig('theme', 'afkode');
  });

  it('validates theme — accepts all valid themes', () => {
    for (const t of ['afkode', 'dracula', 'nord', 'one-dark', 'solarized']) {
      setConfig('theme', t);
      expect(getConfig('theme')).toBe(t);
    }
    setConfig('theme', 'afkode');
  });

  it('validates shellPath — returns default for non-string', () => {
    setConfig('shellPath', 42 as any);
    expect(getConfig('shellPath')).toBe(defaults.shellPath);
    setConfig('shellPath', defaults.shellPath);
  });

  it('validates shellPath — returns default for invalid path', () => {
    setConfig('shellPath', '/nonexistent/bad/shell' as any);
    expect(getConfig('shellPath')).toBe(defaults.shellPath);
    setConfig('shellPath', defaults.shellPath);
  });

  it('shellPath defaults appropriately for platform', () => {
    const shell = getConfig('shellPath');
    if (process.platform === 'win32') {
      expect(shell).toMatch(/cmd\.exe|powershell/i);
    } else {
      expect(shell).toMatch(/\//);
    }
  });

  it('getAllConfig returns consistent validated values after corruption', () => {
    setConfig('opacity', NaN as any);
    setConfig('hotkey', '' as any);
    setConfig('fontSize', -1 as any);
    setConfig('theme', 'bogus' as any);

    const config = getAllConfig();
    expect(config.opacity).toBe(defaults.opacity);
    expect(config.hotkey).toBe(defaults.hotkey);
    expect(config.fontSize).toBe(defaults.fontSize);
    expect(config.theme).toBe(defaults.theme);

    setConfig('opacity', 0.95);
    setConfig('hotkey', 'CommandOrControl+`');
    setConfig('fontSize', 13);
    setConfig('theme', 'afkode');
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

  it('accepts /bin/bash', () => {
    if (process.platform !== 'win32') {
      expect(isValidShell('/bin/bash')).toBe(true);
    }
  });

  it('rejects nonexistent path on unix', () => {
    if (process.platform !== 'win32') {
      expect(isValidShell('/nonexistent/shell')).toBe(false);
    }
  });

  it('rejects empty string', () => {
    expect(isValidShell('')).toBe(false);
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

  it('returned shells are valid according to isValidShell', () => {
    const shells = getAvailableShells();
    for (const shell of shells) {
      expect(isValidShell(shell.path)).toBe(true);
    }
  });
});
