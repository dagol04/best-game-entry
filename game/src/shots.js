// Screenshot arrangements for Starfall Skiff.
// ?shot=title|play|boss|end|victory sets the world to a genuine game state
// (the same states real play reaches) so a still can be taken of it.
// It never draws anything itself — the renderer draws every frame.

import { makeBoss, makeEnemy, makePowerup, makeShard } from './entities.js';
import { VIEW } from './config.js';

function seedField(world, count) {
  const kinds = ['drifter', 'darter', 'weaver', 'mine'];
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const e = makeEnemy(kind, 80 + Math.random() * (VIEW.w - 160), 70 + Math.random() * 240, world.wave || 3);
    world.enemies.push(e);
  }
  for (let i = 0; i < 8; i++) {
    world.shards.push(makeShard(60 + Math.random() * (VIEW.w - 120), 60 + Math.random() * 260));
  }
  world.powerups.push(makePowerup(700, 180, 'shield'));
}

export function applyShot(world, input, sound) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;

  if (shot === 'title') {
    world.best = 12480;
    return;
  }

  if (shot === 'play') {
    world.startGame();
    world.wave = 3;
    world.score = 4860;
    world.best = 12480;
    world.combo = 14;
    world.multiplier = 3;
    world.kills = 21;
    world.collected = 34;
    world.toSpawn = 12;
    world.bannerText = 'WAVE 3 / 10';
    world.bannerTimer = 1.4;
    world.player.x = 470;
    world.player.y = 430;
    world.player.shield = 5;
    seedField(world, 6);
    // A couple of live bolts mid-flight.
    world.bolts.push({ id: 9001, kind: 'bolt', x: 470, y: 380, vx: 0, vy: -640, radius: 4, damage: 1, dead: false });
    world.bolts.push({ id: 9002, kind: 'bolt', x: 500, y: 340, vx: 0, vy: -640, radius: 4, damage: 1, dead: false });
    return;
  }

  if (shot === 'boss') {
    world.startGame();
    world.wave = 10;
    world.score = 21450;
    world.best = 21450;
    world.combo = 9;
    world.multiplier = 2;
    world.kills = 96;
    world.collected = 121;
    world.toSpawn = 0;
    world.boss = makeBoss(10);
    world.boss.y = 130;
    world.boss.entering = false;
    world.boss.hp = 41;
    world.boss.x = VIEW.w / 2 + 120;
    world.bannerText = 'FINAL WAVE — VOID MAW';
    world.bannerTimer = 1.2;
    world.player.x = 430;
    world.player.y = 470;
    world.player.double = 6;
    world.enemies.push(makeEnemy('darter', 300, 220, 10));
    world.enemies.push(makeEnemy('weaver', 660, 180, 10));
    world.shards.push(makeShard(360, 300));
    world.shards.push(makeShard(600, 320));
    sound.bossRoar();
    return;
  }

  if (shot === 'end') {
    world.startGame();
    world.score = 8930;
    world.best = 12480;
    world.kills = 38;
    world.collected = 57;
    world.wave = 5;
    world.state = 'gameover';
    world.endTimer = 1.5;
    world.player.lives = 0;
    world.player.dead = true;
    return;
  }

  if (shot === 'victory') {
    world.startGame();
    world.score = 42800;
    world.best = 42800;
    world.kills = 131;
    world.collected = 168;
    world.wave = 10;
    world.state = 'victory';
    world.endTimer = 1.5;
    return;
  }
}
