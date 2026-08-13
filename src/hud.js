export class HUD {
  constructor() {
    this.reticle = document.getElementById('reticle');
    this.ctx = this.reticle.getContext('2d');
    this.msgEl = document.getElementById('msg');
    this.msgTimer = null;
    this.flashEl = document.getElementById('dmg-flash');
    this.flash = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.reticle.width = window.innerWidth;
    this.reticle.height = window.innerHeight;
  }

  show() {
    document.getElementById('hud').classList.remove('hidden');
  }

  update(t) {
    document.getElementById('hud-speed').textContent = Math.round(t.speed);
    document.getElementById('hud-alt').textContent = Math.round(t.alt);
    document.getElementById('hud-vs').textContent = t.vs.toFixed(1);
    document.getElementById('hud-heading').textContent = String(Math.round(t.heading)).padStart(3, '0');
    document.getElementById('hud-wave').textContent = Math.min(t.wave, t.maxWaves);
    document.getElementById('hud-maxwave').textContent = t.maxWaves;
    document.getElementById('hud-targets').textContent = t.targets;
    document.getElementById('hud-kills').textContent = t.kills;
    document.getElementById('hud-score').textContent = t.score;
    document.getElementById('ammo-rockets').textContent = t.rockets;
    document.getElementById('ammo-cannon').textContent = t.cannon;
    document.getElementById('ammo-missiles').textContent = t.missiles;
    const hpBar = document.getElementById('hp-bar').firstElementChild;
    hpBar.style.width = t.health + '%';
    hpBar.style.background = t.health > 50 ? '#5dff8e' : t.health > 25 ? '#ffd76a' : '#ff6a4d';
    document.getElementById('hp-text').textContent = Math.round(t.health) + '%';
    document.getElementById('thr-bar').firstElementChild.style.width = (t.throttle * 100) + '%';
    document.getElementById('rpm-bar').firstElementChild.style.width = (t.rpm * 100) + '%';
    if (this.flash > 0) {
      this.flashEl.style.opacity = Math.min(1, this.flash);
      this.flash = Math.max(0, this.flash - 0.025);
    } else {
      this.flashEl.style.opacity = 0;
    }
  }

  flashDamage() {
    this.flash = 0.9;
  }

  message(text) {
    this.msgEl.textContent = text;
    this.msgEl.classList.add('show');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.msgEl.classList.remove('show'), 2600);
  }

  drawReticle(s) {
    const c = this.ctx;
    const w = this.reticle.width;
    const h = this.reticle.height;
    c.clearRect(0, 0, w, h);
    if (s.crosshair) {
      const cx = w / 2;
      const cy = h / 2;
      c.strokeStyle = 'rgba(141,255,176,0.9)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(cx, cy, 18, 0, Math.PI * 2);
      c.moveTo(cx - 26, cy);
      c.lineTo(cx - 7, cy);
      c.moveTo(cx + 7, cy);
      c.lineTo(cx + 26, cy);
      c.moveTo(cx, cy - 26);
      c.lineTo(cx, cy - 7);
      c.moveTo(cx, cy + 7);
      c.lineTo(cx, cy + 26);
      c.moveTo(cx - 14, cy);
      c.lineTo(cx, cy - 14);
      c.lineTo(cx + 14, cy);
      c.lineTo(cx, cy + 14);
      c.closePath();
      c.stroke();
    }
    if (s.lock) {
      const l = s.lock;
      const col = l.armed ? 'rgba(255,90,70,0.95)' : 'rgba(255,215,106,0.95)';
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = 1.6;
      const r = 16;
      c.beginPath();
      c.moveTo(l.x, l.y - r);
      c.lineTo(l.x + r * 0.6, l.y);
      c.lineTo(l.x, l.y + r);
      c.lineTo(l.x - r * 0.6, l.y);
      c.closePath();
      c.stroke();
      c.font = '13px ui-monospace, Menlo, monospace';
      c.fillText(`${l.name}  ${l.dist}m`, l.x + 20, l.y - 12);
    }
  }
}
