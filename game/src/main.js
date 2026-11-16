// Starfall Skiff — boot and the frame loop.
// Wires input, world and renderer together and owns the menu keys
// (Enter/click to start, P/Esc pause, R restart, M mute).

import { Input } from './input.js';
import { Renderer } from './render.js';
import { SoundBank } from './audio.js';
import { World } from './world.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const input = new Input(canvas);
const sound = new SoundBank();
const world = new World(sound);
const renderer = new Renderer(canvas);

let last = performance.now();

function handleMenuKeys() {
  if (input.wasPressed('m')) {
    sound.ensure();
    const muted = sound.toggleMute();
    world.message = muted ? 'MUTED' : 'SOUND ON';
    world.messageTimer = 1.2;
  }

  if (world.state === 'title') {
    if (input.wasPressed('enter') || input.mouse.down) {
      sound.ensure();
      world.startGame();
    }
    return;
  }

  if (world.state === 'playing') {
    if (input.wasPressed('p') || input.wasPressed('escape')) world.pause();
    else if (input.wasPressed('r')) world.startGame();
    return;
  }

  if (world.state === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('escape')) world.resume();
    else if (input.wasPressed('r')) world.startGame();
    else if (input.wasPressed('q')) world.toTitle();
    return;
  }

  if (world.state === 'gameover' || world.state === 'victory') {
    if (world.endTimer > 0.6 && (input.wasPressed('r') || input.wasPressed('enter') || input.mouse.down)) {
      world.startGame();
    }
    return;
  }

  if (world.state === 'waveclear' && input.wasPressed('r')) world.startGame();
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;

  handleMenuKeys();
  if (world.state === 'waveclear') world.updateWaveClear(dt);
  else world.update(dt, input);
  renderer.draw(world, input);
  input.consume();

  requestAnimationFrame(frame);
}

// A screenshot hook (?shot=title|play|boss|end|victory) arranges a real
// game state for a still image; the game itself renders every frame.
applyShot(world, input, sound);
requestAnimationFrame(frame);
