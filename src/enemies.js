import * as THREE from 'three';
import { mulberry32, clamp } from './util.js';

const UNIT_TYPES = {
  tank: { health: 200, fire: { range: 750, burst: 3, interval: 0.13, cooldown: [2.2, 3.6], dmg: 6, speed: 430, err: 0.008 } },
  apc: { health: 140, fire: { range: 620, burst: 5, interval: 0.09, cooldown: [2.6, 4.2], dmg: 3, speed: 400, err: 0.012 } },
  truck: { health: 70, fire: null },
};

const mats = {
  body: new THREE.MeshStandardMaterial({ color: 0x6d6a4e, roughness: 0.75, metalness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x33352c, roughness: 0.9 }),
  cab: new THREE.MeshStandardMaterial({ color: 0x5c6a3c, roughness: 0.8 }),
  cargo: new THREE.MeshStandardMaterial({ color: 0x7a7d60, roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fd3e8, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.55 }),
};

function buildTank() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.15, 2.5), mats.body);
  hull.position.y = 0.85;
  hull.castShadow = true;
  const treadL = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.9, 0.6), mats.dark);
  treadL.position.set(1.3, 0.55, 0);
  treadL.castShadow = true;
  const treadR = treadL.clone();
  treadR.position.x = -1.3;
  const turret = new THREE.Group();
  turret.position.y = 1.55;
  const turretBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.75, 10), mats.body);
  turretBody.castShadow = true;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 3.5, 8), mats.body);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 1.8;
  barrel.castShadow = true;
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.35, 8), mats.dark);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.z = 3.55;
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 8), mats.dark);
  hatch.position.set(0.45, 0.42, -0.2);
  turret.add(turretBody, barrel, muzzle, hatch);
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, 3.8);
  turret.add(tip);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4), mats.dark);
  antenna.position.set(-0.5, 1.9, -1.0);
  g.add(hull, treadL, treadR, turret, antenna);
  return { group: g, turret, barrel, tip };
}

function buildApc() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.35, 2.1), mats.body);
  hull.position.y = 1.0;
  hull.castShadow = true;
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 10);
  for (const z of [-1.15, 0, 1.15]) {
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(wheelGeo, mats.dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(1.15 * s, 0.38, z);
      w.castShadow = true;
      g.add(w);
    }
  }
  const turret = new THREE.Group();
  turret.position.y = 1.85;
  const tb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.9), mats.body);
  tb.castShadow = true;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 2.6, 8), mats.body);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 1.35;
  barrel.castShadow = true;
  turret.add(tb, barrel);
  const tip = new THREE.Object3D();
  tip.position.set(0, 0, 2.7);
  turret.add(tip);
  g.add(hull, turret);
  return { group: g, turret, barrel, tip };
}

function buildTruck() {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.05), mats.cab);
  cab.position.set(0, 1.2, 0.75);
  cab.castShadow = true;
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.2, 2.5), mats.cargo);
  cargo.position.set(0, 1.25, -0.85);
  cargo.castShadow = true;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.4, 1.06), mats.glass);
  glass.position.set(0, 1.25, 1.2);
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 10);
  for (const z of [1.1, -1.15]) {
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(wheelGeo, mats.dark);
      w.rotation.z = Math.PI / 2;
      w.position.set(0.62 * s, 0.32, z);
      w.castShadow = true;
      g.add(w);
    }
  }
  g.add(cab, cargo, glass);
  return { group: g, turret: null, barrel: null, tip: null };
}

export class EnemyManager {
  constructor(scene, effects, terrain) {
    this.scene = scene;
    this.effects = effects;
    this.terrain = terrain;
    this.rng = mulberry32(31337);
    this.list = [];
    this.tracers = [];
    this.wave = 0;
    this.maxWaves = 3;
    this.onKilled = null;
    this.onPlayerHit = null;
    this.tracerGeo = new THREE.BoxGeometry(0.07, 0.07, 1.4);
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffc864, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  spawn(type, minD, maxD) {
    for (let tries = 0; tries < 50; tries++) {
      const a = this.rng() * Math.PI * 2;
      const d = minD + this.rng() * (maxD - minD);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = this.terrain.heightAt(x, z);
      if (h < 1.2) continue;
      if (Math.abs(this.terrain.heightAt(x + 3, z) - this.terrain.heightAt(x - 3, z)) > 1.6) continue;
      const built = type === 'tank' ? buildTank() : type === 'apc' ? buildApc() : buildTruck();
      built.group.position.set(x, h, z);
      built.group.rotation.y = this.rng() * Math.PI * 2;
      this.scene.add(built.group);
      const unit = {
        type,
        built,
        group: built.group,
        turret: built.turret,
        barrel: built.barrel,
        tip: built.tip,
        health: UNIT_TYPES[type].health,
        maxHealth: UNIT_TYPES[type].health,
        fire: UNIT_TYPES[type].fire,
        alive: true,
        cooldown: 1 + this.rng() * 3,
        burstLeft: 0,
        burstTimer: 0,
        smokeTimer: 0,
        turretYaw: 0,
        barrelPitch: 0,
      };
      this.list.push(unit);
      return unit;
    }
    return null;
  }

  spawnWave() {
    const near = 420 - this.wave * 60;
    const far = 1750 - this.wave * 120;
    const comp =
      this.wave === 0 ? [['tank', 4], ['apc', 3], ['truck', 3]]
      : this.wave === 1 ? [['tank', 5], ['apc', 4], ['truck', 3]]
      : [['tank', 6], ['apc', 5], ['truck', 3]];
    for (const [t, n] of comp) {
      for (let i = 0; i < n; i++) this.spawn(t, near, far);
    }
    this.wave++;
  }

  hitTest(p, r) {
    for (const u of this.list) {
      if (!u.alive) continue;
      const c = u.group.position;
      const dx = p.x - c.x;
      const dy = p.y - (c.y + 1.1);
      const dz = p.z - c.z;
      if (dx * dx + dy * dy + dz * dz < r * r) return u;
    }
    return null;
  }

  damageUnit(u, dmg) {
    if (!u.alive) return false;
    u.health -= dmg;
    if (u.health <= 0) {
      this.kill(u);
      return true;
    }
    return false;
  }

  kill(u) {
    u.alive = false;
    this.effects.explosion(u.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 1.5);
    this.scene.remove(u.group);
    this.list = this.list.filter((x) => x !== u);
    if (this.onKilled) this.onKilled(u);
  }

  takeAoE(pos, radius, dmg) {
    for (const u of [...this.list]) {
      if (!u.alive) continue;
      const c = u.group.position;
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const dy = pos.y - (c.y + 1.1);
      if (dx * dx + dz * dz < radius * radius && Math.abs(dy) < 4) this.damageUnit(u, dmg);
    }
  }

  findLockable(origin, dir, maxDist, maxAngle) {
    let best = null;
    let bestScore = Infinity;
    for (const u of this.list) {
      if (!u.alive) continue;
      const c = u.group.position;
      const to = new THREE.Vector3(c.x, c.y + 1.2, c.z).sub(origin);
      const d = to.length();
      if (d > maxDist) continue;
      const ang = to.angleTo(dir);
      if (ang > maxAngle) continue;
      const score = ang * 3 + d;
      if (score < bestScore) {
        bestScore = score;
        best = u;
      }
    }
    return best;
  }

  update(dt, helo) {
    const hp = helo.group.position;
    for (const u of this.list) {
      if (!u.alive) continue;
      u.cooldown -= dt;
      if (u.turret && helo.alive) {
        const dx = hp.x - u.group.position.x;
        const dz = hp.z - u.group.position.z;
        const dist = Math.hypot(dx, dz);
        const desired = Math.atan2(dx, dz);
        let delta = desired - u.turretYaw;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        u.turretYaw += clamp(delta, -2.2 * dt, 2.2 * dt);
        u.turret.rotation.y = u.turretYaw;
        if (u.barrel) {
          const dy = hp.y - (u.group.position.y + 1.6);
          const targetPitch = clamp(Math.atan2(dy, dist), -0.12, 0.45);
          u.barrelPitch += clamp(targetPitch - u.barrelPitch, -1.5 * dt, 1.5 * dt);
          u.barrel.rotation.x = u.barrelPitch;
        }
        if (u.fire && u.burstLeft > 0) {
          u.burstTimer -= dt;
          if (u.burstTimer <= 0) {
            u.burstLeft--;
            u.burstTimer = u.fire.interval;
            this.fireTracer(u, hp, dist, u.fire, helo);
          }
        } else if (u.fire && u.cooldown <= 0 && dist < u.fire.range && Math.abs(delta) < 0.22) {
          u.burstLeft = u.fire.burst;
          u.burstTimer = 0;
          u.cooldown = u.fire.cooldown[0] + this.rng() * (u.fire.cooldown[1] - u.fire.cooldown[0]);
        }
      }
      if (u.health < u.maxHealth * 0.5) {
        u.smokeTimer -= dt;
        if (u.smokeTimer <= 0) {
          u.smokeTimer = 0.14;
          this.effects.smokePuff(new THREE.Vector3(u.group.position.x, u.group.position.y + 2, u.group.position.z), 2.4);
        }
      }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.pos.addScaledVector(t.vel, dt);
      t.mesh.position.copy(t.pos);
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
        continue;
      }
      if (t.pos.y <= Math.max(this.terrain.heightAt(t.pos.x, t.pos.z), 0)) {
        this.effects.spark(t.pos);
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
        continue;
      }
      if (helo.alive && t.pos.distanceTo(hp) < 3.4) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
        if (this.onPlayerHit) this.onPlayerHit(t.dmg);
      }
    }
  }

  fireTracer(u, hp, dist, fire, helo) {
    const from = u.tip.getWorldPosition(new THREE.Vector3());
    const tof = dist / fire.speed;
    const aim = new THREE.Vector3(
      hp.x + helo.velocity.x * tof,
      hp.y - 0.5 + helo.velocity.y * tof,
      hp.z + helo.velocity.z * tof
    );
    const dir = aim.sub(from).normalize();
    const angle = (fire.err + 40 / Math.max(dist, 50)) * (0.15 + this.rng() * 0.85);
    const axis = new THREE.Vector3().randomDirection();
    dir.applyAxisAngle(axis, angle);
    const mesh = new THREE.Mesh(this.tracerGeo, this.tracerMat);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(mesh);
    this.tracers.push({ mesh, pos: from.clone(), vel: dir.multiplyScalar(fire.speed), life: 2.2, dmg: fire.dmg });
  }
}
