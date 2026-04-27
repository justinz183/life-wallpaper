#!/usr/bin/env bash
# Install Life Wallpaper as a LaunchAgent that:
#   - runs once at every login
#   - runs once at 00:01 every day
# This is more reliable than a long-running Node process — launchd handles
# sleep/wake catch-up, and using a unique filename each run defeats the
# macOS wallpaper cache.
#
# Usage:   bash scripts/install-autostart-mac.sh
# Remove:  bash scripts/install-autostart-mac.sh --uninstall
set -euo pipefail

LABEL="com.lifewallpaper.agent"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node || true)"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
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
  <key>StartCalendarInterval</key>
  <array>
    <dict>
      <key>Hour</key>    <integer>0</integer>
      <key>Minute</key>  <integer>1</integer>
    </dict>
  </array>
  <key>StandardOutPath</key>     <string>${HOME}/.life-wallpaper/stdout.log</string>
  <key>StandardErrorPath</key>   <string>${HOME}/.life-wallpaper/stderr.log</string>
</dict>
</plist>
PLISTEOF

# Use bootout/bootstrap (modern launchctl); fall back to load/unload.
launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
launchctl unload "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST"

echo "Installed. Life Wallpaper will:"
echo "  • run once on every login"
echo "  • run once at 00:01 every day"
echo "To stop: bash scripts/install-autostart-mac.sh --uninstall"
