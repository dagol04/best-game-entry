// The world of Starfall Skiff: the state machine (title, playing, paused,
// wave banner, game over, victory), wave spawning, collisions, scoring and
// the combo multiplier. It owns no drawing and no DOM.

import { BOSS, ENEMIES, PARTICLES, PLAYER, SCORING, VIEW, WAVES } from './config.js';
import {
  burst,
  circlesHit,
  makeBoss,
  makeBolt,
  makeEnemy,
  makeEnemyBolt,
  makePlayer,
  makePowerup,
  makeShard,
  updateBoss,
  updateEnemy,
  updateParticle,
  updateShard,
} from './entities.js';

export const STATES = ['title', 'playing', 'paused', 'waveclear', 'gameover', 'victory'];

const ENEMY_POOL = ['drifter', 'drifter', 'drifter', 'darter', 'weaver', 'mine'];

function pickEnemyKind(wave) {
  const pool = ENEMY_POOL.slice();
  if (wave >= 3) pool.push('weaver', 'darter');
  if (wave >= 5) pool.push('mine', 'weaver');
  return pool[Math.floor(Math.random() * pool.length)];
}

export class World {
  constructor(sound) {
    this.sound = sound;
    this.state = 'title';
    this.player = makePlayer();
    this.bolts = [];
    this.enemies = [];
    this.enemyBolts = [];
    this.shards = [];
    this.powerups = [];
    this.particles = [];
    this.boss = null;
    this.wave = 0;
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.comboCount = 0;
    this.multiplier = 1;
    this.kills = 0;
    this.collected = 0;
    this.spawnTimer = 0;
    this.toSpawn = 0;
    this.bannerTimer = 0;
    this.bannerText = '';
    this.endTimer = 0;
    this.time = 0;
    this.shake = 0;
    this.message = '';
    this.messageTimer = 0;
    try {
      this.best = Number(window.localStorage.getItem('starfall-skiff-best') ?? 0) || 0;
    } catch {
      this.best = 0;
    }
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('starfall-skiff-best', String(this.best));
      } catch {
        /* storage unavailable: best score is session-only */
      }
    }
  }

  startGame() {
    this.player = makePlayer();
    this.bolts = [];
    this.enemies = [];
    this.enemyBolts = [];
    this.shards = [];
    this.powerups = [];
    this.particles = [];
    this.boss = null;
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboCount = 0;
    this.multiplier = 1;
    this.kills = 0;
    this.collected = 0;
    this.state = 'playing';
    this.sound.ensure();
    this.sound.startMusic();
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    this.toSpawn = this.wave === WAVES.total ? 0 : WAVES.budget(this.wave);
    this.spawnTimer = 0.6;
    if (this.wave === WAVES.total) {
      this.boss = makeBoss(this.wave);
      this.bannerText = `FINAL WAVE — ${BOSS.name}`;
      this.sound.bossRoar();
    } else {
      this.bannerText = `WAVE ${this.wave} / ${WAVES.total}`;
      this.sound.waveClear();
    }
    this.bannerTimer = 2.2;
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  toTitle() {
    this.state = 'title';
    this.sound.stopMusic();
    this.saveBest();
  }

  addScore(base) {
    const gained = base * this.multiplier * (this.player.double > 0 ? 2 : 1);
    this.score += gained;
    return gained;
  }

  bumpCombo() {
    this.combo += 1;
    this.comboCount += 1;
    if (this.comboCount >= SCORING.comboStep) {
      this.comboCount = 0;
      this.multiplier = Math.min(SCORING.comboMax, this.multiplier + 1);
    }
  }

  resetCombo() {
    this.combo = 0;
    this.comboCount = 0;
    this.multiplier = 1;
  }

  dropShard(x, y) {
    this.shards.push(makeShard(x, y));
  }

  dropPowerup(x, y, forceKind = null) {
    this.powerups.push(makePowerup(x, y, forceKind));
  }

  damagePlayer() {
    const p = this.player;
    if (p.invulnerable > 0 || p.shield > 0 || this.state !== 'playing') return;
    p.lives -= 1;
    p.invulnerable = PLAYER.invulnerableSeconds;
    this.resetCombo();
    this.shake = 10;
    burst(this.particles, p.x, p.y, '#7dd3fc', 22, 200);
    this.sound.hurt();
    if (p.lives <= 0) {
      p.dead = true;
      burst(this.particles, p.x, p.y, '#fda4af', 40, 260);
      this.sound.explosion();
      this.state = 'gameover';
      this.endTimer = 0;
      this.sound.stopMusic();
      this.sound.gameOver();
      this.saveBest();
    }
  }

  killEnemy(e) {
    e.dead = true;
    this.kills += 1;
    this.bumpCombo();
    this.addScore(e.score);
    burst(this.particles, e.x, e.y, e.color, PARTICLES.burst, 170);
    this.sound.pop();
    // Drops: shards rain from most kills; a power-up sometimes.
    const drops = 1 + (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < drops; i++) this.dropShard(e.x + (Math.random() - 0.5) * 24, e.y);
    if (Math.random() < 0.07) this.dropPowerup(e.x, e.y);
    if (e.kind === 'mine') {
      // A mine bursts into three hostile fragments.
      for (let i = -1; i <= 1; i++) {
        this.enemyBolts.push(makeEnemyBolt(e.x, e.y, i * 90, 120));
      }
      this.sound.explosion();
    }
  }

  damageBoss(amount) {
    if (!this.boss) return;
    this.boss.hp -= amount;
    this.boss.flash = 0.08;
    this.bumpCombo();
    if (this.boss.hp <= 0) {
      this.boss.dead = true;
      this.addScore(this.boss.score);
      burst(this.particles, this.boss.x, this.boss.y, '#ff4d6d', 60, 320);
      burst(this.particles, this.boss.x, this.boss.y, '#ffe066', 40, 220);
      this.shake = 16;
      this.sound.explosion();
      this.sound.victory();
      this.state = 'victory';
      this.endTimer = 0;
      this.sound.stopMusic();
      this.saveBest();
      this.boss = null;
    }
  }

  applyPowerup(power) {
    const p = this.player;
    if (power === 'shield') p.shield = 8;
    else if (power === 'magnet') p.magnet = 10;
    else if (power === 'double') p.double = 12;
    else if (power === 'life') p.lives = Math.min(5, p.lives + 1);
    this.message = power === 'life' ? '+1 LIFE!' : `${power.toUpperCase()}!`;
    this.messageTimer = 1.6;
    this.sound.powerup();
  }

  update(dt, input) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    // Particles always animate, even on menus.
    for (const p of this.particles) updateParticle(p, dt);
    this.particles = this.particles.filter((p) => !p.dead);

    if (this.state === 'title') {
      // Idle drift: a few shards float past behind the title.
      if (Math.random() < dt * 0.7) {
        this.shards.push(makeShard(Math.random() * VIEW.w, -12));
      }
      for (const s of this.shards) updateShard(s, dt, null, false);
      this.shards = this.shards.filter((s) => s.y < VIEW.h + 24);
      return;
    }
    if (this.state !== 'playing') {
      if (this.state === 'gameover' || this.state === 'victory') this.endTimer += dt;
      return;
    }

    const p = this.player;

    // --- movement: keys, or steer toward the mouse when it moved ---
    const mv = input.moveVector();
    if (mv.x !== 0 || mv.y !== 0) {
      p.vx += mv.x * PLAYER.accel * dt;
      p.vy += mv.y * PLAYER.accel * dt;
    } else if (input.mouse.active) {
      const dx = input.mouse.x - p.x;
      const dy = input.mouse.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) {
        const steer = Math.min(1, d / 90);
        p.vx += (dx / d) * PLAYER.accel * 0.7 * steer * dt;
        p.vy += (dy / d) * PLAYER.accel * 0.7 * steer * dt;
      }
    }
    const drag = Math.pow(PLAYER.drag, dt * 60);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
    p.x = Math.min(VIEW.w - p.radius, Math.max(p.radius, p.x + p.vx * dt));
    p.y = Math.min(VIEW.h - p.radius, Math.max(p.radius, p.y + p.vy * dt));
    if (speed > 60) p.angle = Math.atan2(p.vy, p.vx);

    // Engine trail.
    p.trailTimer -= dt;
    if (p.trailTimer <= 0 && speed > 80) {
      p.trailTimer = PARTICLES.trailEvery;
      this.particles.push({
        id: 0, kind: 'particle', x: p.x - Math.cos(p.angle) * 18, y: p.y - Math.sin(p.angle) * 18,
        vx: -p.vx * 0.08, vy: -p.vy * 0.08, life: 0.35, maxLife: 0.35,
        size: 4, color: '#38bdf8', dead: false,
      });
    }

    // Timers.
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.magnet > 0) p.magnet -= dt;
    if (p.double > 0) p.double -= dt;

    // --- firing ---
    p.fireTimer -= dt;
    if (input.firing && p.fireTimer <= 0) {
      p.fireTimer = PLAYER.fireCooldown;
      this.bolts.push(makeBolt(p.x, p.y - 20));
      this.sound.shoot();
    }

    // --- spawning ---
    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = WAVES.spawnInterval(this.wave) * (0.7 + Math.random() * 0.6);
        this.toSpawn -= 1;
        const kind = pickEnemyKind(this.wave);
        this.enemies.push(makeEnemy(kind, 30 + Math.random() * (VIEW.w - 60), -24, this.wave));
        if (Math.random() < 0.22) this.dropShard(30 + Math.random() * (VIEW.w - 60), -12);
      }
    }

    // --- boss behaviour ---
    if (this.boss) {
      const b = this.boss;
      updateBoss(b, dt);
      if (!b.entering) {
        if (b.burstTimer <= 0) {
          b.burstTimer = BOSS.burstEvery;
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + b.t;
            this.enemyBolts.push(makeEnemyBolt(b.x, b.y + 30, Math.cos(a) * 130, Math.sin(a) * 130 + 60));
          }
          this.sound.shoot();
        }
        if (b.minionTimer <= 0) {
          b.minionTimer = BOSS.minionEvery;
          this.enemies.push(makeEnemy('darter', b.x - 60, b.y + 30, this.wave));
          this.enemies.push(makeEnemy('darter', b.x + 60, b.y + 30, this.wave));
        }
      }
    }

    // --- updates ---
    for (const bolt of this.bolts) {
      bolt.y += bolt.vy * dt;
      if (bolt.y < -12) bolt.dead = true;
    }
    for (const e of this.enemies) updateEnemy(e, dt);
    for (const s of this.shards) updateShard(s, dt, p, p.magnet > 0);
    for (const pw of this.powerups) {
      pw.t += dt;
      pw.y += pw.vy * dt;
      if (pw.y > VIEW.h + 24) pw.dead = true;
    }
    for (const eb of this.enemyBolts) {
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.y > VIEW.h + 16 || eb.x < -16 || eb.x > VIEW.w + 16) eb.dead = true;
    }

    // --- collisions: bolts vs enemies / boss ---
    for (const bolt of this.bolts) {
      if (bolt.dead) continue;
      for (const e of this.enemies) {
        if (!e.dead && circlesHit(bolt, e)) {
          bolt.dead = true;
          e.hp -= bolt.damage;
          e.flash = 0.1;
          if (e.hp <= 0) this.killEnemy(e);
          break;
        }
      }
      if (!bolt.dead && this.boss && !this.boss.entering && circlesHit(bolt, this.boss)) {
        bolt.dead = true;
        this.damageBoss(bolt.damage);
      }
    }

    // --- collisions: player vs enemies, shards, power-ups, enemy bolts ---
    if (!p.dead) {
      for (const e of this.enemies) {
        if (!e.dead && circlesHit(p, e)) {
          if (p.shield > 0) {
            this.killEnemy(e);
            this.shake = 6;
          } else {
            this.killEnemy(e);
            this.damagePlayer();
          }
        }
      }
      for (const s of this.shards) {
        if (!s.dead && circlesHit(p, s)) {
          s.dead = true;
          this.collected += 1;
          this.bumpCombo();
          this.addScore(s.score);
          burst(this.particles, s.x, s.y, s.color, 6, 90);
          this.sound.collect();
        }
      }
      for (const pw of this.powerups) {
        if (!pw.dead && circlesHit(p, pw)) {
          pw.dead = true;
          this.applyPowerup(pw.power);
        }
      }
      for (const eb of this.enemyBolts) {
        if (!eb.dead && circlesHit(p, eb)) {
          eb.dead = true;
          if (p.shield > 0) {
            burst(this.particles, eb.x, eb.y, '#7dd3fc', 8, 120);
          } else {
            this.damagePlayer();
          }
        }
      }
      if (this.boss && !this.boss.entering && circlesHit(p, this.boss)) {
        if (p.shield > 0) {
          p.vy = 320;
        } else {
          this.damagePlayer();
        }
      }
    }

    // --- cleanup ---
    this.bolts = this.bolts.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead && e.y < VIEW.h + 60);
    this.enemyBolts = this.enemyBolts.filter((b) => !b.dead);
    this.shards = this.shards.filter((s) => !s.dead && s.y < VIEW.h + 24);
    this.powerups = this.powerups.filter((pw) => !pw.dead);

    // --- wave clear: nothing left to spawn and nothing hostile remains ---
    if (this.state === 'playing' && this.wave < WAVES.total && this.toSpawn === 0 && this.enemies.length === 0 && this.enemyBolts.length === 0) {
      const bonus = WAVES.clearBonus(this.wave);
      this.addScore(bonus);
      this.bannerText = `WAVE ${this.wave} CLEAR  +${bonus}`;
      this.bannerTimer = 2.0;
      this.sound.waveClear();
      this.state = 'waveclear';
      this.waveClearTimer = 2.0;
    }
  }

  /** Called every frame while in 'waveclear'; counts down to the next wave. */
  updateWaveClear(dt) {
    if (this.state !== 'waveclear') return;
    this.waveClearTimer -= dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    for (const s of this.shards) updateShard(s, dt, this.player, this.player.magnet > 0);
    this.shards = this.shards.filter((s) => !s.dead && s.y < VIEW.h + 24);
    for (const p of this.particles) updateParticle(p, dt);
    this.particles = this.particles.filter((p) => !p.dead);
    if (this.waveClearTimer <= 0) {
      this.state = 'playing';
      this.nextWave();
    }
  }
}
