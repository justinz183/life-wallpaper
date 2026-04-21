const STAGES_EN = [
  { from: 0,  to: 6,  name: 'infancy',  hue: 40 },
  { from: 6,  to: 18, name: 'youth',    hue: 35 },
  { from: 18, to: 30, name: 'emerging', hue: 28 },
  { from: 30, to: 45, name: 'prime',    hue: 22 },
  { from: 45, to: 60, name: 'mastery',  hue: 18 },
  { from: 60, to: 75, name: 'wisdom',   hue: 30 },
  { from: 75, to: 90, name: 'twilight', hue: 42 },
];
const STAGES_ZH = [
  { from: 0,  to: 6,  name: '童年',  hue: 40 },
  { from: 6,  to: 18, name: '少年',  hue: 35 },
  { from: 18, to: 30, name: '青年',  hue: 28 },
  { from: 30, to: 45, name: '壮年',  hue: 22 },
  { from: 45, to: 60, name: '中年',  hue: 18 },
  { from: 60, to: 75, name: '智年',  hue: 30 },
  { from: 75, to: 90, name: '迟暮',  hue: 42 },
];

function getStage(age, stages) {
  for (const s of stages) if (age >= s.from && age < s.to) return s;
  return stages[stages.length - 1];
}

function computeLife(birthdayISO, lifespan) {
  const bd = new Date(birthdayISO + 'T00:00:00');
  const now = new Date();
  const ms = now - bd;
  const days = ms / 86400000;
  const age = days / 365.25;
  const weeksLived = days / 7;
  const totalDays = lifespan * 365.25;
  return {
    age,
    weeksLived,
    daysLived: Math.max(0, Math.floor(days)),
    daysRemaining: Math.max(0, Math.floor(totalDays - days)),
    percentLived: Math.min(100, Math.max(0, (days / totalDays) * 100)),
  };
}

module.exports = { STAGES_EN, STAGES_ZH, getStage, computeLife };
