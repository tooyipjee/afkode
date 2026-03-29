# AFKode

Terminal overlay for gamers. You're dead? You're coding. Press a hotkey, get a translucent terminal over your game, dismiss it when you respawn.

## Features

- **Transparent overlay** — frameless, always-on-top, dark translucent background
- **Global hotkey** — toggle with `Cmd+`` (macOS) / `Ctrl+`` (Win/Linux)
- **Tabs** — multiple terminal sessions with tab bar
- **Shell picker** — choose your shell (PowerShell, Git Bash, WSL, etc.)
- **Full terminal** — real PTY shell powered by xterm.js + node-pty
- **Escape to dismiss** — press Escape to hide and get back to the game
- **System tray** — change opacity and default shell from the tray menu
- **Persisted layout** — remembers window position and size between sessions
- **Cross-platform** — macOS, Windows, Linux

## Quick Install

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/tooyipjee/afkode/main/install.sh | sh
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/tooyipjee/afkode/main/install.ps1 | iex
```

### Manual Download

Grab the latest build from [Releases](https://github.com/tooyipjee/afkode/releases).

## Hotkeys

| Key | Action |
|-----|--------|
| `Cmd+`` / `Ctrl+`` | Toggle overlay |
| `Escape` | Hide overlay |
| `Cmd+T` / `Ctrl+Shift+T` | New tab |
| `Cmd+W` / `Ctrl+Shift+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Cmd+1-9` / `Ctrl+1-9` | Switch to tab |

## Dev Setup

```bash
git clone https://github.com/tooyipjee/afkode.git
cd afkode
npm install
npm run dev
```

## Building from Source

```bash
npm run dist          # Current platform
npm run dist:mac      # macOS (DMG + ZIP)
npm run dist:win      # Windows (NSIS installer)
npm run dist:linux    # Linux (AppImage + deb)
```

## Tech Stack

Electron, TypeScript, xterm.js, node-pty, Vite, electron-builder.

## License

MIT
