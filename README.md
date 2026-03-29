# AFKode

Terminal overlay for gamers. You're dead? You're coding. Press a hotkey, get a translucent terminal over your game, dismiss it when you respawn.

## Features

- **Transparent overlay** — frameless, always-on-top, dark translucent background
- **Global hotkey** — toggle with `Cmd+`` (macOS) / `Ctrl+`` (Win/Linux)
- **Full terminal** — real PTY shell powered by xterm.js + node-pty
- **Escape to dismiss** — press Escape to hide and get back to the game
- **System tray** — change opacity from the tray menu
- **Persisted layout** — remembers window position and size between sessions
- **Cross-platform** — macOS, Windows, Linux

## Install

Download the latest release for your platform from [Releases](https://github.com/jasontoo/afkode/releases).

### macOS

1. Download `AFKode-x.x.x-mac-arm64.dmg` (Apple Silicon) or `AFKode-x.x.x-mac-x64.dmg` (Intel)
2. Open the DMG and drag **AFKode** to Applications
3. On first launch, right-click and select **Open** (Gatekeeper blocks unsigned apps)

### Windows

1. Download `AFKode-x.x.x-win-x64.exe`
2. Run the installer

### Linux

1. Download `AFKode-x.x.x-linux-x64.AppImage` or `.deb`
2. AppImage: `chmod +x AFKode-*.AppImage && ./AFKode-*.AppImage`
3. Debian/Ubuntu: `sudo dpkg -i afkode-*.deb`

Needs a compositor with transparency support (X11 with picom, or Wayland).

## Dev Setup

```bash
git clone https://github.com/jasontoo/afkode.git
cd afkode
npm install
npm run dev
```

## Hotkeys

| Key | Action |
|-----|--------|
| `Cmd+`` / `Ctrl+`` | Toggle overlay |
| `Escape` | Hide overlay |

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
