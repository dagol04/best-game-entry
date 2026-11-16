// Synthesised sound for Starfall Skiff — no audio assets, everything is
// built with the Web Audio API so the game stays fully offline.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  /** Create the context on first user gesture (browsers block audio before one). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone({ freq = 440, to = null, dur = 0.12, type = 'sine', gain = 0.12, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.2, gain = 0.15, when = 0, low = 400 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(t0);
  }

  shoot() {
    this._tone({ freq: 720, to: 240, dur: 0.09, type: 'square', gain: 0.05 });
  }

  pop() {
    this._tone({ freq: 520, to: 880, dur: 0.1, type: 'triangle', gain: 0.1 });
  }

  collect() {
    this._tone({ freq: 880, dur: 0.07, type: 'sine', gain: 0.09 });
    this._tone({ freq: 1318, dur: 0.1, type: 'sine', gain: 0.07, when: 0.06 });
  }

  explosion() {
    this._noise({ dur: 0.35, gain: 0.2, low: 900 });
    this._tone({ freq: 160, to: 40, dur: 0.3, type: 'sawtooth', gain: 0.12 });
  }

  hurt() {
    this._tone({ freq: 220, to: 60, dur: 0.35, type: 'sawtooth', gain: 0.16 });
    this._noise({ dur: 0.2, gain: 0.12, low: 600 });
  }

  powerup() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone({ freq: f, dur: 0.12, gain: 0.09, when: i * 0.07 }));
  }

  waveClear() {
    [392, 523, 659, 784].forEach((f, i) => this._tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.1, when: i * 0.09 }));
  }

  bossRoar() {
    this._tone({ freq: 90, to: 45, dur: 0.7, type: 'sawtooth', gain: 0.18 });
    this._noise({ dur: 0.6, gain: 0.1, low: 300 });
  }

  victory() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this._tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.1, when: i * 0.11 }));
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this._tone({ freq: f, dur: 0.28, type: 'triangle', gain: 0.1, when: i * 0.16 }));
  }

  /** A slow, quiet arpeggio loop while playing. */
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [220, 261.63, 329.63, 392, 440, 523.25];
    this.musicTimer = window.setInterval(() => {
      if (this.muted || document.hidden) return;
      const note = scale[this.musicStep % scale.length];
      this._tone({ freq: note, dur: 0.9, type: 'sine', gain: 0.035 });
      this._tone({ freq: note / 2, dur: 1.1, type: 'sine', gain: 0.02 });
      this.musicStep += 1;
    }, 620);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
