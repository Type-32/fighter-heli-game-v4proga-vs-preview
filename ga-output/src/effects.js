import * as THREE from 'three';
import { mulberry32 } from './util.js';

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  for (const s of stops) g.addColorStop(s[0], s[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  const rng = mulberry32(77);
  for (let i = 0; i < 9; i++) {
    const x = 40 + rng() * 176;
    const y = 44 + rng() * 40;
    const r = 22 + rng() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.fireTex = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.22, 'rgba(255,225,130,1)'],
      [0.5, 'rgba(255,130,35,0.85)'],
      [1, 'rgba(130,20,0,0)'],
    ]);
    this.smokeTex = radialTexture([
      [0, 'rgba(215,215,215,0.8)'],
      [0.55, 'rgba(140,140,140,0.42)'],
      [1, 'rgba(100,100,100,0)'],
    ]);
    this.glowTex = radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.35, 'rgba(255,250,200,0.6)'],
      [1, 'rgba(255,240,180,0)'],
    ]);
    this.dustTex = radialTexture([
      [0, 'rgba(200,178,140,0.75)'],
      [1, 'rgba(170,150,115,0)'],
    ]);
    this.sprites = [];
    this.debris = [];
    this.lights = [];
    this.debrisGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    this.onExplosion = null;
  }

  spawnSprite(tex, pos, size, life, color, additive, grow, vel, damp, gravity, fadeIn, parent = null) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity: fadeIn > 0 ? 0 : 1,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(pos);
    sp.scale.setScalar(size);
    (parent || this.scene).add(sp);
    this.sprites.push({ sprite: sp, vel: vel.clone(), life, max: life, grow, damp, gravity, fadeIn });
    return sp;
  }

  explosion(pos, scale = 1) {
    if (this.onExplosion) this.onExplosion(pos, scale);
    this.spawnSprite(this.fireTex, pos, 4.5 * scale, 0.55, 0xffffff, true, 30 * scale, new THREE.Vector3(), 0, 0, 0);
    this.spawnSprite(this.fireTex, pos.clone().add(new THREE.Vector3(0, 1.5 * scale, 0)), 3 * scale, 0.9, 0xff9c3c, true, 13 * scale, new THREE.Vector3(), 0, 0, 0);
    for (let i = 0; i < 11; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 9 + 3,
        (Math.random() - 0.5) * 6
      ).multiplyScalar(scale);
      this.spawnSprite(
        this.smokeTex,
        pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3 * scale, 0.5 * scale, (Math.random() - 0.5) * 3 * scale)),
        4 * scale + Math.random() * 4 * scale,
        1.8 + Math.random() * 1.4,
        0x8e8e8e, false, 7 * scale, v, 0.8, -0.6, 0.12
      );
    }
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(this.debrisGeo, new THREE.MeshBasicMaterial({ color: 0x2a2b26 }));
      const s = (0.2 + Math.random() * 0.5) * scale;
      m.scale.set(s, s * (0.6 + Math.random() * 0.8), s);
      m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2));
      this.scene.add(m);
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 14,
        Math.random() * 16 + 6,
        (Math.random() - 0.5) * 14
      ).multiplyScalar(scale);
      this.debris.push({ mesh: m, vel: v, spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12), life: 1.6 + Math.random() });
    }
    const light = new THREE.PointLight(0xffa850, 46 * scale, 70 * scale, 2);
    light.position.copy(pos).add(new THREE.Vector3(0, 1.5, 0));
    this.scene.add(light);
    this.lights.push({ light, life: 0.35, max: 0.35, base: 46 * scale });
  }

  muzzleFlash(pos) {
    this.spawnSprite(this.glowTex, pos, 1.3, 0.06, 0xffe0a0, true, 0, new THREE.Vector3(), 0, 0, 0);
  }

  spark(pos) {
    this.spawnSprite(this.glowTex, pos, 1.0, 0.12, 0xffd890, true, 0, new THREE.Vector3(), 0, 0, 0);
    for (let i = 0; i < 4; i++) {
      this.spawnSprite(
        this.glowTex, pos, 0.35, 0.25, 0xffc060, true, 0,
        new THREE.Vector3((Math.random() - 0.5) * 16, Math.random() * 10 + 2, (Math.random() - 0.5) * 16),
        6, 18, 0
      );
    }
  }

  smokePuff(pos, size = 2.4) {
    this.spawnSprite(
      this.smokeTex, pos, size, 1.6, 0x9a9a9a, false, size * 1.8,
      new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5),
      0.5, -0.4, 0.1
    );
  }

  dustTrail(pos) {
    this.spawnSprite(
      this.dustTex, pos, 2.4, 0.9, 0xcfc0a0, false, 3.2,
      new THREE.Vector3((Math.random() - 0.5) * 3, 0.8, (Math.random() - 0.5) * 3),
      2.5, -0.5, 0.08
    );
  }

  update(dt) {
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.sprite);
        s.sprite.material.dispose();
        this.sprites.splice(i, 1);
        continue;
      }
      const age = s.max - s.life;
      let op = 1;
      if (s.fadeIn > 0) op = Math.min(1, age / s.fadeIn);
      const fade = Math.min(1, s.life / (s.max * 0.45));
      s.sprite.material.opacity = op * fade;
      if (s.grow) {
        s.sprite.scale.setScalar(s.sprite.scale.x + s.grow * dt);
      }
      if (s.damp) s.vel.multiplyScalar(Math.exp(-s.damp * dt));
      s.vel.y -= s.gravity * dt;
      s.sprite.position.addScaledVector(s.vel, dt);
    }
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.material.dispose();
        this.debris.splice(i, 1);
        continue;
      }
      d.vel.y -= 9.81 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      if (d.mesh.position.y <= 0.15) {
        d.mesh.position.y = 0.15;
        d.vel.y = -d.vel.y * 0.35;
        d.vel.x *= 0.7;
        d.vel.z *= 0.7;
      }
    }
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i];
      l.life -= dt;
      if (l.life <= 0) {
        this.scene.remove(l.light);
        this.lights.splice(i, 1);
        continue;
      }
      l.light.intensity = l.base * (l.life / l.max);
    }
  }
}
