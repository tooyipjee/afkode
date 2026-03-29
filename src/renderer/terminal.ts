import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';

let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;

export function createTerminal(container: HTMLElement): Terminal {
  terminal = new Terminal({
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: '"SF Mono", "Fira Code", "JetBrains Mono", Menlo, monospace',
    fontSize: 13,
    lineHeight: 1.25,
    allowTransparency: false,
    theme: {
      background: '#121218',
      foreground: '#d4d4d8',
      cursor: '#d4d4d8',
      cursorAccent: '#121218',
      selectionBackground: 'rgba(255, 255, 255, 0.15)',
      selectionForeground: '#ffffff',
      black: '#27272a',
      red: '#f87171',
      green: '#4ade80',
      yellow: '#facc15',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#d4d4d8',
      brightBlack: '#52525b',
      brightRed: '#fca5a5',
      brightGreen: '#86efac',
      brightYellow: '#fde047',
      brightBlue: '#93c5fd',
      brightMagenta: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#fafafa',
    },
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  terminal.open(container);

  try {
    const webglAddon = new WebglAddon();
    webglAddon.onContextLoss(() => {
      webglAddon.dispose();
    });
    terminal.loadAddon(webglAddon);
  } catch {
    // WebGL not available, fall back to canvas
  }

  fitAddon.fit();

  terminal.onData((data) => {
    window.electronAPI.sendPtyInput(data);
  });

  terminal.onResize(({ cols, rows }) => {
    window.electronAPI.sendPtyResize(cols, rows);
  });

  window.electronAPI.onPtyData((data) => {
    terminal?.write(data);
  });

  return terminal;
}

export function fitTerminal(): void {
  if (fitAddon && terminal) {
    fitAddon.fit();
  }
}

export function focusTerminal(): void {
  terminal?.focus();
}

export function setCursorBlink(enabled: boolean): void {
  if (terminal) {
    terminal.options.cursorBlink = enabled;
  }
}

export function getTerminal(): Terminal | null {
  return terminal;
}
