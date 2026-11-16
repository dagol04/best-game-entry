// Keyboard + mouse input for Starfall Skiff.
// Tracks held keys, the mouse position in canvas coordinates, and
// edge-triggered presses (used once, then cleared by the world each frame).

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last consume()
    this.mouse = { x: canvas.width / 2, y: canvas.height * 0.72, down: false, active: false };
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    };
    this._onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * this.canvas.width;
      this.mouse.y = ((e.clientY - r.top) / r.height) * this.canvas.height;
      this.mouse.active = true;
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) this.mouse.down = true;
      this._onMouseMove(e);
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouse.down = false;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouse.down = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  /** True while the key is held (case-insensitive, e.g. 'arrowleft', ' '). */
  held(key) {
    return this.keys.has(key.toLowerCase());
  }

  /** True once for a key pressed since the last consume(). */
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  /** Direction from WASD/arrows, normalised; {x, y} in [-1, 1]. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held('a') || this.held('arrowleft')) x -= 1;
    if (this.held('d') || this.held('arrowright')) x += 1;
    if (this.held('w') || this.held('arrowup')) y -= 1;
    if (this.held('s') || this.held('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get firing() {
    return this.held(' ') || this.mouse.down;
  }

  /** Clear edge presses; call once per frame after the world reads them. */
  consume() {
    this.pressed.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}
