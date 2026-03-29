import { describe, it, expect } from 'vitest';
import { themes, getTheme } from '../../src/renderer/themes';

describe('themes', () => {
  it('has exactly 5 themes', () => {
    expect(themes).toHaveLength(5);
  });

  it('includes all expected theme IDs', () => {
    const ids = themes.map((t) => t.id);
    expect(ids).toContain('afkode');
    expect(ids).toContain('dracula');
    expect(ids).toContain('nord');
    expect(ids).toContain('one-dark');
    expect(ids).toContain('solarized');
  });

  it('each theme has all required properties', () => {
    for (const theme of themes) {
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('swatch');
      expect(theme).toHaveProperty('terminal');
      expect(theme).toHaveProperty('overlayBg');

      expect(typeof theme.id).toBe('string');
      expect(typeof theme.name).toBe('string');
      expect(typeof theme.swatch).toBe('string');
      expect(typeof theme.overlayBg).toBe('function');
      expect(typeof theme.terminal).toBe('object');
    }
  });

  it('each theme terminal has standard color properties', () => {
    const requiredColors = [
      'background', 'foreground', 'cursor', 'cursorAccent',
      'selectionBackground', 'selectionForeground',
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
      'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
    ];

    for (const theme of themes) {
      for (const color of requiredColors) {
        expect(theme.terminal).toHaveProperty(color);
        expect(typeof theme.terminal[color]).toBe('string');
        expect(theme.terminal[color].length).toBeGreaterThan(0);
      }
    }
  });

  it('each theme has unique id', () => {
    const ids = themes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each theme has unique name', () => {
    const names = themes.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('getTheme', () => {
  it('returns correct theme by id', () => {
    expect(getTheme('afkode').id).toBe('afkode');
    expect(getTheme('dracula').id).toBe('dracula');
    expect(getTheme('nord').id).toBe('nord');
    expect(getTheme('one-dark').id).toBe('one-dark');
    expect(getTheme('solarized').id).toBe('solarized');
  });

  it('returns afkode as fallback for unknown id', () => {
    expect(getTheme('nonexistent').id).toBe('afkode');
    expect(getTheme('').id).toBe('afkode');
  });

  it('returns full theme object', () => {
    const theme = getTheme('dracula');
    expect(theme.name).toBe('Dracula');
    expect(theme.swatch).toBe('#282a36');
    expect(theme.terminal.background).toBe('#282a36');
  });
});

describe('overlayBg', () => {
  it('returns rgba string with given opacity', () => {
    for (const theme of themes) {
      const bg = theme.overlayBg(0.9);
      expect(bg).toMatch(/^rgba\(/);
      expect(bg).toContain('0.9');
    }
  });

  it('returns different values for different opacities', () => {
    const theme = getTheme('afkode');
    const bg1 = theme.overlayBg(0.5);
    const bg2 = theme.overlayBg(0.95);
    expect(bg1).not.toBe(bg2);
  });

  it('handles opacity 0 and 1', () => {
    const theme = getTheme('nord');
    expect(theme.overlayBg(0)).toContain('0');
    expect(theme.overlayBg(1)).toContain('1');
  });
});
