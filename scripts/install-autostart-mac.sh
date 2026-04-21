#!/usr/bin/env bash
# Install Life Wallpaper as a LaunchAgent so it runs on login
# Usage:  bash scripts/install-autostart-mac.sh
# Remove: bash scripts/install-autostart-mac.sh --uninstall
set -euo pipefail

LABEL="com.lifewallpaper.agent"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node || true)"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Uninstalled $PLIST"
  exit 0
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Error: node not found. Install Node.js 18+ first (https://nodejs.org)." >&2
  exit 1
fi

mkdir -p "$(dirname "$PLIST")"
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>               <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${REPO_DIR}/index.js</string>
  </array>
  <key>WorkingDirectory</key>    <string>${REPO_DIR}</string>
  <key>RunAtLoad</key>           <true/>
  <key>KeepAlive</key>           <true/>
  <key>StandardOutPath</key>     <string>${HOME}/.life-wallpaper/stdout.log</string>
  <key>StandardErrorPath</key>   <string>${HOME}/.life-wallpaper/stderr.log</string>
</dict>
</plist>
PLISTEOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Installed. Life Wallpaper will start on every login."
echo "To stop: bash scripts/install-autostart-mac.sh --uninstall"
