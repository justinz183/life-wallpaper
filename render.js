const { createCanvas } = require('@napi-rs/canvas');
const { STAGES_EN, STAGES_ZH, getStage, computeLife } = require('./life');

function fmt(n) { return Math.floor(n).toLocaleString('en-US'); }
function fmt1(n) { return n.toFixed(1); }

function render(config) {
  const {
    birthday,
    lifespan = 80,
    lang = 'en',
    events = [],
    width = 1920,
    height = 1080,
  } = config;

  const isZH = lang === 'zh';
  const STAGES = isZH ? STAGES_ZH : STAGES_EN;
  const LIFESPAN_YEARS = lifespan;
  const TOTAL_WEEKS = LIFESPAN_YEARS * 52;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const W = width, H = height;
  const k = Math.min(W / 1920, H / 1080); // scale factor (1.0 at 1920x1080)
  const px = (v) => v * k;
  const font = (sizePx, family = 'serif', style = '') =>
    `${style ? style + ' ' : ''}${Math.round(sizePx * k)}px ${family}`;

  const cx = W / 2, cy = H / 2;
  const innerR = px(70);
  const outerR = Math.min(W, H) * 0.42;
  const ringWidth = (outerR - innerR) / LIFESPAN_YEARS;
  const weekAngle = (Math.PI * 2) / 52;

  const life = computeLife(birthday, lifespan);
  const weeksLived = life.weeksLived;

  // Use the real clock as a phase source so every rendered frame
  // (even static snapshots 60s apart) is visibly different.
  const tSec = Date.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(tSec * 0.5); // 0..1, ~12s cycle
  const now = new Date();
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}.${MM}.${DD}`;

  // Background radial gradient
  const bg = ctx.createRadialGradient(cx, cy, px(100), cx, cy, Math.max(W, H) * 0.7);
  bg.addColorStop(0, '#231710');
  bg.addColorStop(0.5, '#150e08');
  bg.addColorStop(1, '#080503');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Rings
  for (let y = 0; y < LIFESPAN_YEARS; y++) {
    const r0 = innerR + y * ringWidth;
    const r1 = innerR + (y + 1) * ringWidth - 0.3;
    const stage = getStage(y, STAGES);
    for (let w = 0; w < 52; w++) {
      const weekIdx = y * 52 + w;
      const lived = weekIdx < weeksLived;
      const isCurrent = weekIdx === Math.floor(weeksLived);
      const a0 = -Math.PI / 2 + w * weekAngle + 0.006;
      const a1 = a0 + weekAngle - 0.012;

      ctx.beginPath();
      ctx.arc(cx, cy, r1, a0, a1);
      ctx.arc(cx, cy, r0, a1, a0, true);
      ctx.closePath();

      if (isCurrent) {
        // Pulse the current week so each render frame differs visibly.
        ctx.fillStyle = `hsla(20, 90%, ${55 + pulse * 15}%, 1)`;
        ctx.fill();
        ctx.save();
        ctx.shadowColor = 'rgba(255,140,60,0.9)';
        ctx.shadowBlur = px(20 + pulse * 20);
        ctx.fill();
        ctx.restore();
      } else if (lived) {
        ctx.fillStyle = `hsla(${stage.hue}, 55%, 42%, 0.9)`;
        ctx.fill();
      } else {
        ctx.fillStyle = `hsla(${stage.hue}, 20%, 25%, 0.22)`;
        ctx.fill();
      }
    }
  }

  // Stage dividers
  ctx.strokeStyle = 'rgba(220,180,130,0.25)';
  ctx.setLineDash([px(3), px(5)]);
  ctx.lineWidth = Math.max(0.5, px(0.5));
  for (const st of STAGES) {
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + st.to * ringWidth, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Center disc (no birthday text — minimalist hub)
  ctx.fillStyle = '#1a1008';
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - px(6), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,180,130,0.4)';
  ctx.lineWidth = Math.max(1, px(1));
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - px(6), 0, Math.PI * 2);
  ctx.stroke();

  // Tiny center dot
  ctx.fillStyle = 'rgba(220,180,130,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.5, px(2.5)), 0, Math.PI * 2);
  ctx.fill();

  // Today's date inside the center disc — ticks once per day
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4a74c';
  ctx.font = font(16, 'serif', 'italic');
  ctx.fillText(todayStr, cx, cy + px(26));

  // Events
  for (const e of events) {
    const weekIdx = e.age * 52 + 26;
    if (weekIdx >= TOTAL_WEEKS) continue;
    const r = innerR + e.age * ringWidth + ringWidth / 2;
    const ang = -Math.PI / 2 + 26 * weekAngle;
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    const isPast = weekIdx < weeksLived;
    ctx.fillStyle = isPast ? '#dca060' : 'rgba(180,140,90,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, px(3.5), 0, Math.PI * 2);
    ctx.fill();
  }

  // Now pointer
  const curY = Math.floor(weeksLived / 52);
  const curW = weeksLived % 52;
  const nowA = -Math.PI / 2 + (curW + 0.5) * weekAngle;
  const nowR = innerR + (curY + 0.5) * ringWidth;
  const nx = cx + nowR * Math.cos(nowA);
  const ny = cy + nowR * Math.sin(nowA);
  const outX = cx + (outerR + px(60)) * Math.cos(nowA);
  const outY = cy + (outerR + px(60)) * Math.sin(nowA);

  ctx.strokeStyle = 'rgba(255,160,80,0.5)';
  ctx.setLineDash([px(4), px(4)]);
  ctx.lineWidth = Math.max(0.8, px(0.8));
  ctx.beginPath();
  ctx.moveTo(cx, cy); ctx.lineTo(outX, outY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(255,180,100,0.8)';
  ctx.lineWidth = Math.max(1, px(1.5));
  ctx.beginPath();
  ctx.arc(nx, ny, px(10), 0, Math.PI * 2);
  ctx.stroke();

  const labelX = cx + (outerR + px(80)) * Math.cos(nowA);
  const labelY = cy + (outerR + px(80)) * Math.sin(nowA);
  ctx.font = font(22);
  ctx.textAlign = Math.cos(nowA) > 0 ? 'left' : 'right';
  ctx.fillStyle = '#ff9858';
  ctx.fillText(isZH ? '此刻' : 'now', labelX + (Math.cos(nowA) > 0 ? px(10) : -px(10)), labelY + px(6));

  // Ambient dust (static sample)
  for (let i = 0; i < 240; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = outerR + px(30) + Math.random() * px(90);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    const hue = 30 + Math.random() * 20;
    const alpha = Math.random() * 0.5 + 0.15;
    const size = (Math.random() * 1.3 + 0.3) * Math.max(1, k);
    ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corner labels
  const L = isZH ? {
    instant: '此刻', yearsSuffix: '岁', completed: '已度过', remaining: '待展开',
    daysLived: '已度过的日子', daysRemaining: '余下的日子',
  } : {
    instant: 'THIS INSTANT', yearsSuffix: 'years', completed: 'COMPLETED', remaining: 'TO UNFOLD',
    daysLived: 'DAYS LIVED', daysRemaining: 'DAYS REMAINING',
  };

  const padX = px(100), padY = px(100);
  const bigSize = 58, smallSize = 13;
  const bigLine = px(58), smallLine = px(26);

  // Top-left: age
  ctx.textAlign = 'left';
  ctx.fillStyle = '#d4a74c';
  ctx.font = font(smallSize);
  ctx.fillText(L.instant, padX, padY);
  ctx.fillStyle = '#f0e4c4';
  ctx.font = font(bigSize);
  ctx.fillText(life.age.toFixed(6), padX, padY + bigLine);
  ctx.fillStyle = '#c9a66b';
  ctx.font = font(smallSize);
  ctx.fillText(L.yearsSuffix, padX, padY + bigLine + smallLine);

  // Top-right: completed %
  ctx.textAlign = 'right';
  const rx = W - padX;
  ctx.fillStyle = '#d4a74c';
  ctx.font = font(smallSize);
  ctx.fillText(L.completed, rx, padY);
  ctx.fillStyle = '#f0e4c4';
  ctx.font = font(bigSize);
  ctx.fillText(`${fmt1(life.percentLived)}%`, rx, padY + bigLine);
  ctx.fillStyle = '#c9a66b';
  ctx.font = font(smallSize);
  ctx.fillText(`${fmt1(100 - life.percentLived)}% ${L.remaining}`, rx, padY + bigLine + smallLine);

  // Bottom-left: days lived
  ctx.textAlign = 'left';
  const by = H - padY;
  ctx.fillStyle = '#d4a74c';
  ctx.font = font(smallSize);
  ctx.fillText(L.daysLived, padX, by - px(70));
  ctx.fillStyle = '#f0e4c4';
  ctx.font = font(bigSize);
  ctx.fillText(fmt(life.daysLived), padX, by);

  // Bottom-right: days remaining
  ctx.textAlign = 'right';
  ctx.fillStyle = '#d4a74c';
  ctx.font = font(smallSize);
  ctx.fillText(L.daysRemaining, rx, by - px(70));
  ctx.fillStyle = '#7a5c38';
  ctx.font = font(bigSize);
  ctx.fillText(fmt(life.daysRemaining), rx, by);

  // Motto (center-bottom)
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,170,110,0.55)';
  ctx.font = font(18, 'serif', 'italic');
  ctx.fillText('memento mori', cx, H - px(60));
  ctx.fillStyle = 'rgba(200,170,110,0.35)';
  ctx.font = font(14, 'serif', 'italic');
  ctx.fillText(isZH ? '— 所以，好好活着。' : '— and therefore, live.', cx, H - px(36));

  return canvas.encode('png');
}

module.exports = { render };
