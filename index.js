#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { render } = require('./render');
const { setWallpaper } = require('./wallpaper');
const { detectResolution } = require('./resolution');
const { promptText, promptChoice, notify } = require('./prompt');

const DATA_DIR = path.join(os.homedir(), '.life-wallpaper');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const WP_A = path.join(DATA_DIR, 'wallpaper-a.png');
const WP_B = path.join(DATA_DIR, 'wallpaper-b.png');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function isValidBirthday(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date();
}

async function setupConfig() {
  ensureDir();

  let birthday = null;
  for (let i = 0; i < 3; i++) {
    const ans = await promptText(
      'Life Wallpaper',
      i === 0
        ? 'Enter your birthday (YYYY-MM-DD):'
        : 'Invalid date. Please use YYYY-MM-DD (e.g. 1998-09-07):',
      '1998-09-07'
    );
    if (ans === null) { // cancelled
      await notify('Life Wallpaper', 'Setup cancelled. Exiting.');
      process.exit(0);
    }
    if (isValidBirthday(ans)) { birthday = ans; break; }
  }
  if (!birthday) {
    await notify('Life Wallpaper', 'Could not get a valid birthday. Exiting.');
    process.exit(1);
  }

  const lang = await promptChoice('Life Wallpaper', 'Language:', ['en', 'zh'], 'en');
  const lifespanStr = await promptText('Life Wallpaper', 'Expected lifespan (years):', '80');
  const lifespan = Math.max(1, parseInt(lifespanStr, 10) || 80);

  const cfg = {
    birthday,
    lifespan,
    lang: lang || 'en',
    refreshSeconds: 60,
    events: [],
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  return cfg;
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return null; }
}

let tick = 0;
async function tickOnce(cfg, resolution) {
  const buf = await render({
    ...cfg,
    width: cfg.width || resolution.width,
    height: cfg.height || resolution.height,
  });
  const target = tick++ % 2 === 0 ? WP_A : WP_B;
  fs.writeFileSync(target, buf);
  await setWallpaper(target);
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] wallpaper updated → ${target} (${cfg.width || resolution.width}×${cfg.height || resolution.height})`);
}

async function main() {
  ensureDir();
  const args = process.argv.slice(2);
  const wantSetup = args.includes('--setup');
  const once = args.includes('--once');

  let cfg = loadConfig();
  if (!cfg || wantSetup || !isValidBirthday(cfg.birthday || '')) {
    cfg = await setupConfig();
  }

  const resolution = await detectResolution();

  await tickOnce(cfg, resolution);
  if (once) return;

  const ms = Math.max(5, cfg.refreshSeconds || 60) * 1000;
  setInterval(async () => {
    try { cfg = loadConfig() || cfg; } catch {}
    tickOnce(cfg, resolution).catch((e) => console.error('tick failed:', e.message));
  }, ms);
  console.log(`Running. Refresh every ${ms / 1000}s at ${resolution.width}×${resolution.height}. Ctrl-C to stop.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
