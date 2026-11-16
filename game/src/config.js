// Starfall Skiff — tuning and balance.
// Every number that shapes the game lives here so the loop can be tuned
// in one place without touching the world or the renderer.

export const VIEW = { w: 960, h: 600 };

export const PLAYER = {
  radius: 16,
  accel: 2600,
  maxSpeed: 430,
  drag: 0.86, // per-frame velocity retention at 60fps, scaled by dt
  fireCooldown: 0.16,
  boltSpeed: 640,
  boltDamage: 1,
  lives: 3,
  invulnerableSeconds: 2.0,
  magnetRadius: 90,
};

export const WAVES = {
  total: 10,
  // Enemies the wave must spawn before it can end (boss wave handled separately).
  budget: (wave) => 6 + wave * 3,
  spawnInterval: (wave) => Math.max(0.35, 1.15 - wave * 0.08),
  speed: (wave) => 1 + (wave - 1) * 0.09,
  clearBonus: (wave) => 250 * wave,
};

// Enemy kinds: hp, speed, score, radius, colour, behaviour.
export const ENEMIES = {
  drifter: { hp: 1, speed: 55, score: 50, radius: 15, color: '#ff7a6b' },
  darter: { hp: 1, speed: 150, score: 80, radius: 12, color: '#ffb347' },
  weaver: { hp: 2, speed: 95, score: 120, radius: 14, color: '#c77dff' },
  mine: { hp: 2, speed: 38, score: 100, radius: 16, color: '#8affc1' },
  shard: { score: 25, radius: 10, color: '#ffe066' },
};

export const BOSS = {
  name: 'VOID MAW',
  hp: 90,
  radius: 52,
  score: 5000,
  speed: 42,
  burstEvery: 2.6,
  minionEvery: 4.5,
};

export const POWERUPS = {
  shield: { seconds: 8, color: '#7dd3fc', label: 'SHIELD' },
  magnet: { seconds: 10, color: '#f0abfc', label: 'MAGNET' },
  double: { seconds: 12, color: '#fde047', label: '2X SCORE' },
  life: { color: '#fda4af', label: '+1 LIFE' },
};

export const SCORING = {
  shard: 25,
  comboStep: 8, // kills/collects before the multiplier rises one step
  comboMax: 8,
  hitReset: true,
};

export const PARTICLES = {
  burst: 14,
  trailEvery: 0.05,
};

export const STARS = 110; // background starfield count
