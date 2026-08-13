import * as THREE from 'three';
import { clamp } from './util.js';

export class Weapons {
  constructor(scene, effects, enemies, terrain) {
    this.scene = scene;
    this.effects = effects;
    this.enemies = enemies;
    this.terrain = terrain;
    this.ammo = { rockets: 38, cannon: 1200, missiles: 4 };
    this.cd = { rocket: 0, cannon: 0, missile: 0 };
    this.rockets = [];
    this.rounds = [];
    this.missiles = [];
    this.sfx = null;
    this.roundGeo = new THREE.BoxGeometry(0.055, 0.055, 1.15);
    this.roundMat = new THREE.MeshBasicMaterial({ color: 0xffd270, blending: THREE.AdditiveBlending, depthWrite: false });
  }

  fireRocket(from, dir) {
    if (this.ammo.rockets <= 0 || this.cd.rocket > 0) return false;
    this.ammo.rockets--;
    this.cd.rocket = 0.3;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x4c5144, roughness: 0.6 }));
    body.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x2f332b }));
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.55;
    const fins = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.3), new THREE.MeshStandardMaterial({ color: 0x2f332b }));
    fins.position.z = -0.35;
    g.add(body, nose, fins);
    this.effects.spawnSprite(this.effects.glowTex, new THREE.Vector3(0, 0, -0.65), 0.9, 0.1, 0xffd890, true, 0, new THREE.Vector3(), 0, 0, 0, g);
    g.position.copy(from);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(g);
    this.rockets.push({
      mesh: g,
      vel: dir.clone().multiplyScalar(120).add(new THREE.Vector3(0, -4, 0)),
      speed: 120,
      trail: 0,
    });
    if (this.sfx) this.sfx.rocket();
    return true;
  }

  fireCannon(from, dir, spread) {
    if (this.ammo.cannon <= 0 || this.cd.cannon > 0) return false;
    this.ammo.cannon--;
    this.cd.cannon = 0.052;
    const d = dir.clone();
    d.x += (Math.random() - 0.5) * spread;
    d.y += (Math.random() - 0.5) * spread;
    d.z += (Math.random() - 0.5) * spread;
    d.normalize();
    const mesh = new THREE.Mesh(this.roundGeo, this.roundMat);
    mesh.position.copy(from);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    this.scene.add(mesh);
    this.rounds.push({ mesh, pos: from.clone(), vel: d.multiplyScalar(880), life: 1.6 });
    this.effects.muzzleFlash(from);
    if (this.sfx) this.sfx.shoot();
    return true;
  }

  fireMissile(from, dir, target) {
    if (this.ammo.missiles <= 0 || this.cd.missile > 0) return false;
    this.ammo.missiles--;
    this.cd.missile = 0.9;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x8d957f, roughness: 0.5, metalness: 0.3 }));
    body.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x2f332b }));
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.9;
    const finMat = new THREE.MeshStandardMaterial({ color: 0x2f332b });
    const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.28), finMat);
    f1.position.z = -0.6;
    const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.28), finMat);
    f2.position.z = -0.6;
    g.add(body, nose, f1, f2);
    this.effects.spawnSprite(this.effects.glowTex, new THREE.Vector3(0, 0, -0.85), 1.1, 0.1, 0xffe8b0, true, 0, new THREE.Vector3(), 0, 0, 0, g);
    g.position.copy(from);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(g);
    this.missiles.push({
      mesh: g,
      vel: dir.clone().multiplyScalar(160),
      speed: 160,
      target,
      lastPos: target ? target.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)) : from.clone().addScaledVector(dir, 500),
      life: 9,
      trail: 0,
    });
    if (this.sfx) this.sfx.missile();
    return true;
  }

  update(dt) {
    for (const k of Object.keys(this.cd)) this.cd[k] -= dt;

    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.speed = Math.min(210, r.speed + 130 * dt);
      r.vel.y -= 5 * dt;
      const dir = r.vel.clone().normalize();
      r.vel.copy(dir).multiplyScalar(r.speed);
      r.mesh.position.addScaledVector(r.vel, dt);
      r.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      r.trail -= dt;
      if (r.trail <= 0) {
        r.trail = 0.03;
        this.effects.smokePuff(r.mesh.position, 1.9);
      }
      if (this.detonate(r.mesh.position, 3.2, 55, 16, 1.0)) {
        this.removeProjectile(this.rockets, i);
      }
    }

    for (let i = this.rounds.length - 1; i >= 0; i--) {
      const r = this.rounds[i];
      r.vel.y -= 1.5 * dt;
      r.pos.addScaledVector(r.vel, dt);
      r.mesh.position.copy(r.pos);
      r.life -= dt;
      let hit = false;
      if (r.life <= 0) hit = true;
      if (!hit && this.enemies.hitTest(r.pos, 2.3)) {
        this.enemies.damageUnit(this.enemies.hitTest(r.pos, 2.3), 5);
        this.effects.spark(r.pos);
        hit = true;
      }
      if (!hit && r.pos.y <= Math.max(this.terrain.heightAt(r.pos.x, r.pos.z), 0)) {
        this.effects.spark(r.pos);
        hit = true;
      }
      if (hit) {
        this.scene.remove(r.mesh);
        this.rounds.splice(i, 1);
      }
    }

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.speed = Math.min(265, m.speed + 110 * dt);
      let targetPos;
      if (m.target && m.target.alive) {
        targetPos = m.target.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        m.lastPos.copy(targetPos);
      } else {
        targetPos = m.lastPos;
      }
      const desired = targetPos.clone().sub(m.mesh.position).normalize();
      const cur = m.vel.clone().normalize();
      const ang = cur.angleTo(desired);
      const step = clamp((2.6 * dt) / Math.max(ang, 1e-4), 0, 1);
      const nd = cur.lerp(desired, step).normalize();
      m.vel.copy(nd).multiplyScalar(m.speed);
      m.mesh.position.addScaledVector(m.vel, dt);
      m.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nd);
      m.trail -= dt;
      if (m.trail <= 0) {
        m.trail = 0.025;
        this.effects.smokePuff(m.mesh.position, 2.6);
      }
      m.life -= dt;
      if (m.life <= 0) {
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
        continue;
      }
      if (this.detonate(m.mesh.position, 4.5, 150, 24, 1.7)) {
        this.removeProjectile(this.missiles, i);
      }
    }
  }

  detonate(pos, hitRadius, dmg, aoeRadius, scale) {
    const unit = this.enemies.hitTest(pos, hitRadius);
    const ground = Math.max(this.terrain.heightAt(pos.x, pos.z), 0);
    if (unit) {
      this.effects.explosion(pos, scale);
      if (aoeRadius > 0) this.enemies.takeAoE(pos, aoeRadius, dmg);
      else this.enemies.damageUnit(unit, dmg);
      return true;
    }
    if (pos.y <= ground) {
      if (aoeRadius > 0) {
        this.effects.explosion(pos, scale * 0.9);
        this.enemies.takeAoE(pos, aoeRadius, dmg);
      } else {
        this.effects.spark(pos);
      }
      return true;
    }
    return false;
  }

  removeProjectile(arr, i) {
    this.scene.remove(arr[i].mesh);
    arr.splice(i, 1);
  }
}
