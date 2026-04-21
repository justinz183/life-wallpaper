const { execFile } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const pexec = promisify(execFile);

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

// macOS: osascript display dialog — returns "" if user cancels
async function macDialogText(title, message, defaultValue = '') {
  const script =
    `set T to display dialog "${esc(message)}" with title "${esc(title)}" ` +
    `default answer "${esc(defaultValue)}" buttons {"Cancel","OK"} default button "OK"\n` +
    `return text returned of T`;
  try {
    const { stdout } = await pexec('osascript', ['-e', script]);
    return stdout.trimEnd();
  } catch {
    return null; // user cancelled
  }
}

async function macDialogChoice(title, message, choices, defaultChoice) {
  const list = choices.map((c) => `"${esc(c)}"`).join(',');
  const script =
    `set C to choose from list {${list}} with title "${esc(title)}" ` +
    `with prompt "${esc(message)}" default items {"${esc(defaultChoice)}"}\n` +
    `if C is false then return ""\n` +
    `return item 1 of C`;
  try {
    const { stdout } = await pexec('osascript', ['-e', script]);
    const s = stdout.trimEnd();
    return s || null;
  } catch {
    return null;
  }
}

// Windows: VisualBasic InputBox
async function winDialogText(title, message, defaultValue = '') {
  const ps =
    `Add-Type -AssemblyName Microsoft.VisualBasic; ` +
    `[Microsoft.VisualBasic.Interaction]::InputBox("${esc(message)}","${esc(title)}","${esc(defaultValue)}")`;
  const { stdout } = await pexec('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
  const s = stdout.trimEnd();
  return s === '' ? null : s;
}

// Fallback: terminal readline
function ttyAsk(q, def = '') {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q + (def ? ` [${def}]` : '') + ' ', (a) => {
      rl.close();
      const v = a.trim();
      res(v === '' ? def : v);
    });
  });
}

async function promptText(title, message, defaultValue = '') {
  if (process.stdin.isTTY) return ttyAsk(message, defaultValue);
  if (process.platform === 'darwin') return macDialogText(title, message, defaultValue);
  if (process.platform === 'win32')  return winDialogText(title, message, defaultValue);
  return ttyAsk(message, defaultValue);
}

async function promptChoice(title, message, choices, defaultChoice) {
  if (process.stdin.isTTY) {
    const a = await ttyAsk(`${message} (${choices.join('/')})`, defaultChoice);
    return choices.includes(a) ? a : defaultChoice;
  }
  if (process.platform === 'darwin') return macDialogChoice(title, message, choices, defaultChoice);
  if (process.platform === 'win32') {
    const a = await winDialogText(title, `${message} (${choices.join('/')})`, defaultChoice);
    return choices.includes(a) ? a : defaultChoice;
  }
  return defaultChoice;
}

async function notify(title, message) {
  try {
    if (process.platform === 'darwin') {
      await pexec('osascript', ['-e', `display notification "${esc(message)}" with title "${esc(title)}"`]);
    } else if (process.platform === 'win32') {
      const ps = `Add-Type -AssemblyName PresentationFramework; ` +
        `[System.Windows.MessageBox]::Show("${esc(message)}","${esc(title)}") | Out-Null`;
      await pexec('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
    }
  } catch {}
}

module.exports = { promptText, promptChoice, notify };
