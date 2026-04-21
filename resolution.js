const { execFile } = require('child_process');
const { promisify } = require('util');
const pexec = promisify(execFile);

const FALLBACK = { width: 1920, height: 1080 };

async function detectMac() {
  const { stdout } = await pexec('system_profiler', ['SPDisplaysDataType']);
  // Match the first "Resolution: WIDTH x HEIGHT" line (primary display)
  const m = stdout.match(/Resolution:\s*(\d+)\s*x\s*(\d+)/i);
  if (!m) return null;
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

async function detectWin() {
  const ps = `Add-Type -AssemblyName System.Windows.Forms; ` +
    `$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; ` +
    `"$($b.Width)x$($b.Height)"`;
  const { stdout } = await pexec('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
  const m = stdout.trim().match(/(\d+)x(\d+)/);
  if (!m) return null;
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

async function detectResolution() {
  try {
    if (process.platform === 'darwin') return (await detectMac()) || FALLBACK;
    if (process.platform === 'win32')  return (await detectWin()) || FALLBACK;
  } catch {}
  return FALLBACK;
}

module.exports = { detectResolution, FALLBACK };
