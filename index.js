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
    if (ans === null) {
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

function todayStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function pruneOldWallpapers(keepFile) {
  // Keep only the file we just wrote — delete every other wallpaper-*.png.
  // macOS caches by path, so accumulating files would just bloat disk.
  for (const name of fs.readdirSync(DATA_DIR)) {
    if (!/^wallpaper-.*\.png$/.test(name)) continue;
    const full = path.join(DATA_DIR, name);
    if (full === keepFile) continue;
    try { fs.unlinkSync(full); } catch {}
  }
}

async function renderAndApply(cfg) {
  const resolution = await detectResolution();
  const buf = await render({
    ...cfg,
    width: cfg.width || resolution.width,
    height: cfg.height || resolution.height,
  });
  // Unique filename per render — defeats macOS wallpaper cache.
  const target = path.join(DATA_DIR, `wallpaper-${todayStamp()}-${Date.now()}.png`);
  fs.writeFileSync(target, buf);
  await setWallpaper(target);
  pruneOldWallpapers(target);
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] wallpaper updated → ${path.basename(target)} (${cfg.width || resolution.width}×${cfg.height || resolution.height})`);
}

async function watchLoop(cfg, intervalSec) {
  // Legacy long-running mode. Prefer the launchd / Task Scheduler approach
  // (one render per day) — but keep this for users who want it.
  await renderAndApply(cfg);
  const ms = Math.max(5, intervalSec) * 1000;
  setInterval(async () => {
    try {
      const fresh = loadConfig();
      if (fresh) cfg = fresh;
      await renderAndApply(cfg);
    } catch (e) { console.error('tick failed:', e.message); }
  }, ms);
  console.log(`Watching. Refresh every ${ms / 1000}s. Ctrl-C to stop.`);
}

async function main() {
  ensureDir();
  const args = process.argv.slice(2);
  const wantSetup = args.includes('--setup');
  const watchIdx = args.indexOf('--watch');
  const watch = watchIdx !== -1;
  const watchSec = watch ? (parseInt(args[watchIdx + 1], 10) || 60) : 0;

  let cfg = loadConfig();
  if (!cfg || wantSetup || !isValidBirthday(cfg.birthday || '')) {
    cfg = await setupConfig();
  }

  if (watch) {
    await watchLoop(cfg, watchSec);
  } else {
    // Default: render once and exit. The OS scheduler (launchd / Task
    // Scheduler) re-runs us on its own cadence — far more reliable than
    // a Node-side timer that breaks across sleep/wake.
    await renderAndApply(cfg);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
