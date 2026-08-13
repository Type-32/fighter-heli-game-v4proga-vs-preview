export class Input {
  constructor() {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseLeft = false;
    this.mouseRight = false;
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousemove', (e) => {
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseLeft = true;
      if (e.button === 2) this.mouseRight = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeft = false;
      if (e.button === 2) this.mouseRight = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  key(code) {
    return this.keys.has(code);
  }

  consumeMouse() {
    const x = this.mouseDX;
    const y = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { x, y };
  }

  clearMouse() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseLeft = false;
    this.mouseRight = false;
  }
}
