// Entities of Starfall Skiff: the player skiff, bolts, enemies, shards,
// power-ups, the boss and particles. Each one is plain data plus an
// update step; the world owns spawning and collisions, render owns drawing.

import { BOSS, ENEMIES, PLAYER, VIEW } from './config.js';

let nextId = 1;
const uid = () => nextId++;

export function makePlayer() {
  return {
    id: uid(),
    kind: 'player',
    x: VIEW.w / 2,
    y: VIEW.h * 0.72,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    lives: PLAYER.lives,
    fireTimer: 0,
    invulnerable: 0,
    shield: 0,
    magnet: 0,
    double: 0,
    trailTimer: 0,
    dead: false,
  };
}

export function makeBolt(x, y) {
  return {
    id: uid(),
    kind: 'bolt',
    x,
    y,
    vx: 0,
    vy: -PLAYER.boltSpeed,
    radius: 4,
    damage: PLAYER.boltDamage,
    dead: false,
  };
}

export function makeEnemy(kind, x, y, wave) {
  const spec = ENEMIES[kind];
  const speedScale = 1 + (wave - 1) * 0.09;
  return {
    id: uid(),
    kind,
    x,
    y,
    vx: kind === 'darter' ? (Math.random() < 0.5 ? -70 : 70) : 0,
    vy: spec.speed * speedScale * (0.85 + Math.random() * 0.3),
    radius: spec.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    score: spec.score,
    color: spec.color,
    t: Math.random() * Math.PI * 2, // phase for sine movement
    flash: 0,
    dead: false,
  };
}

export function updateEnemy(e, dt) {
  e.t += dt;
  if (e.kind === 'weaver') {
    e.x += Math.sin(e.t * 3.2) * 130 * dt;
  } else if (e.kind === 'darter') {
    e.x += e.vx * dt;
    if (e.x < e.radius || e.x > VIEW.w - e.radius) e.vx *= -1;
  } else if (e.kind === 'mine') {
    e.x += Math.sin(e.t * 1.4) * 26 * dt;
  }
  e.y += e.vy * dt;
  if (e.flash > 0) e.flash -= dt;
}

export function makeShard(x, y) {
  return {
    id: uid(),
    kind: 'shard',
    x,
    y,
    vx: (Math.random() - 0.5) * 24,
    vy: 46 + Math.random() * 30,
    radius: ENEMIES.shard.radius,
    score: ENEMIES.shard.score,
    color: ENEMIES.shard.color,
    t: Math.random() * Math.PI * 2,
    dead: false,
  };
}

export function updateShard(s, dt, player, magnetOn) {
  s.t += dt;
  if (magnetOn && player) {
    const dx = player.x - s.x;
    const dy = player.y - s.y;
    const d = Math.hypot(dx, dy);
    const reach = PLAYER.magnetRadius * 2.4;
    if (d < reach && d > 1) {
      const pull = (1 - d / reach) * 620;
      s.x += (dx / d) * pull * dt;
      s.y += (dy / d) * pull * dt;
      return;
    }
  }
  s.x += s.vx * dt + Math.sin(s.t * 2.4) * 12 * dt;
  s.y += s.vy * dt;
}

const POWERUP_KINDS = ['shield', 'magnet', 'double', 'shield', 'magnet', 'double', 'life'];

export function makePowerup(x, y, forceKind = null) {
  const kind = forceKind ?? POWERUP_KINDS[Math.floor(Math.random() * POWERUP_KINDS.length)];
  return {
    id: uid(),
    kind: 'powerup',
    power: kind,
    x,
    y,
    vy: 52,
    radius: 14,
    t: 0,
    dead: false,
  };
}

export function makeBoss(wave) {
  return {
    id: uid(),
    kind: 'boss',
    name: BOSS.name,
    x: VIEW.w / 2,
    y: -BOSS.radius - 20,
    vx: 0,
    vy: BOSS.speed,
    radius: BOSS.radius,
    hp: BOSS.hp,
    maxHp: BOSS.hp,
    score: BOSS.score,
    color: '#ff4d6d',
    t: 0,
    burstTimer: BOSS.burstEvery,
    minionTimer: BOSS.minionEvery,
    entering: true,
    flash: 0,
    dead: false,
  };
}

export function updateBoss(b, dt) {
  b.t += dt;
  if (b.entering) {
    if (b.y >= 130) {
      b.y = 130;
      b.entering = false;
    }
  } else {
    b.x = VIEW.w / 2 + Math.sin(b.t * 0.7) * 260;
    b.y = 130 + Math.sin(b.t * 1.3) * 26;
  }
  b.y += b.entering ? b.vy * dt : 0;
  if (b.flash > 0) b.flash -= dt;
  b.burstTimer -= dt;
  b.minionTimer -= dt;
}

export function makeEnemyBolt(x, y, vx, vy) {
  return {
    id: uid(),
    kind: 'enemyBolt',
    x,
    y,
    vx,
    vy,
    radius: 6,
    dead: false,
  };
}

export function makeParticle(x, y, color, speed = 120, life = 0.6, size = 3) {
  const a = Math.random() * Math.PI * 2;
  const v = speed * (0.4 + Math.random() * 0.8);
  return {
    id: uid(),
    kind: 'particle',
    x,
    y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    life,
    maxLife: life,
    size: size * (0.6 + Math.random() * 0.8),
    color,
    dead: false,
  };
}

export function burst(list, x, y, color, n = 14, speed = 140) {
  for (let i = 0; i < n; i++) list.push(makeParticle(x, y, color, speed));
}

export function updateParticle(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= 0.98;
  p.vy *= 0.98;
  p.life -= dt;
  if (p.life <= 0) p.dead = true;
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function circlesHit(a, b) {
  return dist(a, b) < a.radius + b.radius;
}
