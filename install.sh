#!/bin/sh
set -e

REPO="tooyipjee/afkode"
APP_NAME="AFKode"

info() { printf "  \033[90m→\033[0m %s\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1" >&2; exit 1; }

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Required command not found: $1"
  fi
}

main() {
  printf "\n  %s Installer\n  %s\n\n" "$APP_NAME" "─────────────────────"

  need curl
  need unzip

  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Darwin)
      case "$ARCH" in
        arm64)  PATTERN="mac-arm64.zip" ;;
        x86_64) PATTERN="mac-x64.zip" ;;
        *) fail "Unsupported architecture: $ARCH" ;;
      esac
      ;;
    Linux)
      case "$ARCH" in
        x86_64|amd64)
          if command -v dpkg >/dev/null 2>&1; then
            PATTERN="linux-amd64.deb"
          else
            PATTERN="linux-x86_64.AppImage"
          fi
          ;;
        *) fail "Unsupported architecture: $ARCH" ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      fail "Use PowerShell on Windows:  irm https://raw.githubusercontent.com/$REPO/main/install.ps1 | iex"
      ;;
    *)
      fail "Unsupported OS: $OS"
      ;;
  esac

  TMPDIR=$(mktemp -d)
  trap 'rm -rf "$TMPDIR"' EXIT

  info "Fetching latest release..."
  RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest")
  DOWNLOAD_URL=$(echo "$RELEASE_JSON" | grep "browser_download_url.*$PATTERN" | head -1 | cut -d '"' -f 4)

  if [ -z "$DOWNLOAD_URL" ]; then
    fail "Could not find asset matching *$PATTERN in latest release"
  fi

  VERSION=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | cut -d '"' -f 4)
  FILENAME=$(basename "$DOWNLOAD_URL")

  info "Downloading $APP_NAME $VERSION ($FILENAME)..."
  curl -fsSL --progress-bar "$DOWNLOAD_URL" -o "$TMPDIR/$FILENAME"

  case "$OS" in
    Darwin) install_macos "$TMPDIR" "$FILENAME" ;;
    Linux)  install_linux "$TMPDIR" "$FILENAME" ;;
  esac

  printf "\n"
  ok "$APP_NAME $VERSION installed successfully!"
  printf "\n"
}

install_macos() {
  _dir="$1"; _file="$2"
  info "Installing to /Applications..."
  unzip -qo "$_dir/$_file" -d "$_dir/app"
  APP_BUNDLE=$(find "$_dir/app" -name "*.app" -maxdepth 2 -type d | head -1)
  if [ -z "$APP_BUNDLE" ]; then
    fail "Could not find .app bundle in archive"
  fi
  DEST="/Applications/$(basename "$APP_BUNDLE")"

  # Kill running instance before overwriting
  pkill -f "$(basename "$APP_BUNDLE" .app)" 2>/dev/null || true
  sleep 0.5

  if [ -d "$DEST" ]; then
    rm -rf "$DEST"
  fi
  mv "$APP_BUNDLE" /Applications/
  # Remove Gatekeeper quarantine so app launches without warnings
  xattr -rd com.apple.quarantine "$DEST" 2>/dev/null || true
  info "Installed to $DEST"
  info "Launching $APP_NAME..."
  open "$DEST"
}

install_linux() {
  _dir="$1"; _file="$2"
  case "$_file" in
    *.deb)
      info "Installing .deb package (may prompt for password)..."
      sudo dpkg -i "$_dir/$_file"
      ;;
    *.AppImage)
      DEST="${HOME}/.local/bin"
      mkdir -p "$DEST"
      chmod +x "$_dir/$_file"
      mv "$_dir/$_file" "$DEST/afkode"
      info "Installed to $DEST/afkode"
      case ":$PATH:" in
        *":$DEST:"*) ;;
        *) info "Tip: add $DEST to your PATH if not already set" ;;
      esac
      ;;
  esac
}

main
