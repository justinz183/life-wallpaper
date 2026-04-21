const { execFile } = require('child_process');
const { promisify } = require('util');
const pexec = promisify(execFile);

async function setWallpaperMac(absPath) {
  // Modern macOS (Sonoma+) ignores the legacy `System Events` / Finder
  // AppleScript APIs. Use NSWorkspace.setDesktopImageURL via JXA, which is the
  // supported AppKit path and works across every display.
  const esc = absPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const jxa = `
    ObjC.import('AppKit');
    var url = $.NSURL.fileURLWithPath('${esc}');
    var ws = $.NSWorkspace.sharedWorkspace;
    var screens = $.NSScreen.screens;
    for (var i = 0; i < screens.count; i++) {
      ws.setDesktopImageURLForScreenOptionsError(url, screens.objectAtIndex(i), $(), null);
    }
  `;
  await pexec('osascript', ['-l', 'JavaScript', '-e', jxa]);
}

async function setWallpaperWin(absPath) {
  const ps = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll", CharSet=CharSet.Auto)]
  public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
[W]::SystemParametersInfo(20, 0, "${absPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}", 3) | Out-Null
`;
  await pexec('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
}

async function setWallpaper(absPath) {
  if (process.platform === 'darwin') return setWallpaperMac(absPath);
  if (process.platform === 'win32') return setWallpaperWin(absPath);
  throw new Error(`Unsupported platform: ${process.platform}`);
}

module.exports = { setWallpaper };
