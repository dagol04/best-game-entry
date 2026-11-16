// Rendering for Starfall Skiff: the nebula background, starfield, entities,
// HUD and every screen (title, pause, wave banner, game over, victory).
// Pure drawing — it reads the world, never changes it.

import { BOSS, POWERUPS, STARS, VIEW, WAVES } from './config.js';

const PALETTE = {
  hud: '#e2e8f0',
  dim: '#94a3b8',
  gold: '#ffe066',
  danger: '#ff6b6b',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    for (let i = 0; i < STARS; i++) {
      this.stars.push({
        x: Math.random() * VIEW.w,
        y: Math.random() * VIEW.h,
        r: 0.5 + Math.random() * 1.6,
        tw: Math.random() * Math.PI * 2,
        speed: 6 + Math.random() * 18,
      });
    }
  }

  draw(world, input) {
    const ctx = this.ctx;
    ctx.save();
    if (world.shake > 0) {
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    this._background(ctx, world.time);
    this._entities(ctx, world);
    this._particles(ctx, world);
    if (world.state !== 'title') this._hud(ctx, world);
    if (world.bannerTimer > 0 && world.state !== 'title') this._banner(ctx, world);
    if (world.state === 'title') this._title(ctx, world);
    if (world.state === 'paused') this._paused(ctx, world);
    if (world.state === 'gameover') this._endScreen(ctx, world, false);
    if (world.state === 'victory') this._endScreen(ctx, world, true);
    ctx.restore();
  }

  _background(ctx, time) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, '#0b1030');
    g.addColorStop(0.55, '#141038');
    g.addColorStop(1, '#070818');
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, VIEW.w + 40, VIEW.h + 40);

    // Two soft nebula blobs, drifting slowly.
    this._blob(ctx, 220 + Math.sin(time * 0.11) * 40, 150, 260, 'rgba(124, 58, 237, 0.20)');
    this._blob(ctx, 760 + Math.cos(time * 0.09) * 50, 420, 300, 'rgba(14, 165, 233, 0.16)');
    this._blob(ctx, 520, 90, 180, 'rgba(244, 114, 182, 0.10)');

    for (const s of this.stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.8 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dbeafe';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _blob(ctx, x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _entities(ctx, world) {
    // Shards: spinning four-point stars.
    for (const s of world.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.sin(s.t * 3) * 0.4);
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12;
      this._star4(ctx, 0, 0, s.radius, s.radius * 0.42);
      ctx.restore();
    }

    // Power-ups: bobbing orbs with a letter.
    for (const pw of world.powerups) {
      const spec = POWERUPS[pw.power];
      const bob = Math.sin(pw.t * 4) * 3;
      ctx.save();
      ctx.translate(pw.x, pw.y + bob);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = spec.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, pw.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = spec.color;
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pw.power === 'life' ? '+' : pw.power[0].toUpperCase(), 0, 1);
      ctx.restore();
    }

    // Enemies.
    for (const e of world.enemies) this._enemy(ctx, e);

    // Boss.
    if (world.boss) this._boss(ctx, world.boss);

    // Enemy bolts.
    for (const b of world.enemyBolts) {
      ctx.fillStyle = '#fb7185';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Player bolts.
    for (const b of world.bolts) {
      ctx.fillStyle = '#a5f3fc';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 3, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Player skiff.
    if (world.state !== 'title' && !world.player.dead) this._player(ctx, world);
  }

  _star4(ctx, x, y, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  _enemy(ctx, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 12;
    if (e.kind === 'drifter') {
      ctx.rotate(e.t * 0.8);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'darter') {
      ctx.rotate(Math.atan2(e.vy, e.vx));
      ctx.beginPath();
      ctx.moveTo(e.radius + 6, 0);
      ctx.lineTo(-e.radius, e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'weaver') {
      ctx.rotate(Math.sin(e.t * 2) * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(7, 8, 24, 0.85)';
      ctx.beginPath();
      ctx.arc(-4, -3, 3.5, 0, Math.PI * 2);
      ctx.arc(5, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'mine') {
      ctx.rotate(e.t * 0.5);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#052e16';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (e.maxHp > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(e.x - 14, e.y - e.radius - 10, 28, 4);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - 14, e.y - e.radius - 10, 28 * (e.hp / e.maxHp), 4);
    }
  }

  _boss(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const pulse = 1 + Math.sin(b.t * 2.2) * 0.04;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = b.flash > 0 ? '#ffffff' : b.color;
    ctx.shadowColor = '#ff4d6d';
    ctx.shadowBlur = 30;
    // A jagged maw: a ring of teeth around a dark core.
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = i % 2 === 0 ? b.radius : b.radius * 0.72;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0f0520';
    ctx.beginPath();
    ctx.arc(0, 0, b.radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(-14, -8, 5, 0, Math.PI * 2);
    ctx.arc(14, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Boss health bar, top centre.
    const bw = 420;
    const bx = (VIEW.w - bw) / 2;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(bx - 6, 52, bw + 12, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx, 58, bw, 10);
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(bx, 58, bw * Math.max(0, b.hp / b.maxHp), 10);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${BOSS.name}  ${Math.max(0, Math.ceil(b.hp))} / ${b.maxHp}`, VIEW.w / 2, 48);
  }

  _player(ctx, world) {
    const p = world.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.invulnerable > 0 && Math.floor(world.time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    if (p.shield > 0) {
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.rotate(p.angle + Math.PI / 2);
    const g = ctx.createLinearGradient(0, -18, 0, 14);
    g.addColorStop(0, '#bae6fd');
    g.addColorStop(0.5, '#38bdf8');
    g.addColorStop(1, '#0369a1');
    ctx.fillStyle = g;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(13, 10);
    ctx.lineTo(6, 14);
    ctx.lineTo(0, 8);
    ctx.lineTo(-6, 14);
    ctx.lineTo(-13, 10);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _particles(ctx, world) {
    for (const p of world.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _hud(ctx, world) {
    const p = world.player;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
    ctx.fillRect(0, 0, VIEW.w, 40);
    ctx.textBaseline = 'middle';

    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 16, 21);

    ctx.fillStyle = world.multiplier > 1 ? '#f0abfc' : PALETTE.dim;
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`x${world.multiplier}  COMBO ${world.combo}`, 250, 21);

    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE ${Math.max(1, world.wave)} / ${WAVES.total}`, VIEW.w / 2, 21);

    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText(`BEST ${world.best.toLocaleString('en-US')}`, VIEW.w - 16, 21);

    // Lives as hearts, bottom left.
    for (let i = 0; i < Math.max(0, p.lives); i++) {
      const x = 24 + i * 26;
      const y = VIEW.h - 22;
      ctx.fillStyle = '#fb7185';
      ctx.shadowColor = '#fb7185';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x - 5, y - 2, 6, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x + 10, y);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Active power-up timers, bottom right.
    const timers = [];
    if (p.shield > 0) timers.push(`SHIELD ${Math.ceil(p.shield)}s`);
    if (p.magnet > 0) timers.push(`MAGNET ${Math.ceil(p.magnet)}s`);
    if (p.double > 0) timers.push(`2X ${Math.ceil(p.double)}s`);
    if (timers.length > 0) {
      ctx.fillStyle = '#7dd3fc';
      ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(timers.join('   '), VIEW.w - 16, VIEW.h - 22);
    }

    // Floating pickup message.
    if (world.messageTimer > 0) {
      ctx.globalAlpha = Math.min(1, world.messageTimer);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(world.message, VIEW.w / 2, VIEW.h - 84);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  _banner(ctx, world) {
    ctx.save();
    const a = Math.min(1, world.bannerTimer);
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.fillText(world.bannerText, VIEW.w / 2, 150);
    ctx.restore();
  }

  _panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  }

  _title(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = PALETTE.gold;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 24;
    ctx.font = 'bold 58px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('STARFALL SKIFF', VIEW.w / 2, 132);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#bae6fd';
    ctx.font = '20px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('Catch the falling stars. Blast the void. Beat the Maw.', VIEW.w / 2, 182);

    this._panel(ctx, VIEW.w / 2 - 260, 224, 520, 148);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '16px "Segoe UI", system-ui, sans-serif';
    const lines = [
      'Fly with WASD / arrows or the mouse — fire with Space or click.',
      'Shards are points. Chains build your combo up to x8.',
      'Dodge comets and mines. Grab shields, magnets and 2X boosts.',
      'Survive 10 waves and sink the VOID MAW to win. 3 lives.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW.w / 2, 254 + i * 28));

    const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', VIEW.w / 2, 424);
    ctx.globalAlpha = 1;

    ctx.fillStyle = PALETTE.dim;
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Best score: ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 470);
    ctx.fillText('P pause · M mute · R restart', VIEW.w / 2, 498);
    ctx.restore();
  }

  _paused(ctx, world) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW.w / 2, VIEW.h / 2 - 20);
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('Press P or Esc to keep flying · R to restart', VIEW.w / 2, VIEW.h / 2 + 24);
    ctx.restore();
  }

  _endScreen(ctx, world, won) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.62)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = won ? PALETTE.gold : '#fb7185';
    ctx.shadowColor = won ? '#f59e0b' : '#e11d48';
    ctx.shadowBlur = 22;
    ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(won ? 'THE MAW IS SUNK!' : 'SKIFF LOST', VIEW.w / 2, 150);
    ctx.shadowBlur = 0;

    ctx.fillStyle = PALETTE.hud;
    ctx.font = '22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(
      won ? 'You cleared all ten waves. The stars are yours.' : 'The void claims another skiff. The stars remain.',
      VIEW.w / 2,
      200,
    );

    this._panel(ctx, VIEW.w / 2 - 210, 240, 420, 168);
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`SCORE  ${world.score.toLocaleString('en-US')}`, VIEW.w / 2, 278);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`Best  ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 314);
    ctx.fillText(`Waves cleared  ${won ? 10 : Math.max(0, world.wave - 1)} / 10`, VIEW.w / 2, 342);
    ctx.fillText(`Void creatures sunk  ${world.kills}   ·   Shards caught  ${world.collected}`, VIEW.w / 2, 370);

    const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW.w / 2, 458);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
