import * as THREE from 'three';
import { clamp } from './util.js';

const MAX_THRUST = 26;
const GRAVITY = 9.81;

export class Helicopter {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.throttle = 0;
    this.rpm = 0;
    this.health = 100;
    this.alive = true;
    this.grounded = true;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.pitchVel = 0;
    this.rollVel = 0;
    this.yawVel = 0;
    this.smokeTimer = 0;

    this.buildModel();
    this.group.position.set(0, 2.05, 0);
  }

  buildModel() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x525e41, roughness: 0.72, metalness: 0.28 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2f28, roughness: 0.85, metalness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd3e8, roughness: 0.1, metalness: 0.55, transparent: true, opacity: 0.4 });
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x1d201b, roughness: 0.6, metalness: 0.4 });
    const missileMat = new THREE.MeshStandardMaterial({ color: 0x9aa28c, roughness: 0.55, metalness: 0.35 });

    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    add(new THREE.ConeGeometry(0.62, 1.5, 10), bodyMat, 0, 0.28, 2.05, -Math.PI / 2);
    add(new THREE.BoxGeometry(1.55, 1.45, 3.1), bodyMat, 0, 0.28, 0.5);
    add(new THREE.BoxGeometry(1.05, 0.85, 2.5), darkMat, 0, -0.42, 0.5);
    add(new THREE.CapsuleGeometry(0.5, 1.05, 4, 12), glassMat, 0, 0.95, 0.9, -Math.PI / 2);
    add(new THREE.BoxGeometry(0.05, 0.05, 2.4), darkMat, 0, 1.48, 0.9);
    add(new THREE.CylinderGeometry(0.24, 0.58, 4.7, 8), bodyMat, 0, 1.0, -2.7, -Math.PI / 2);
    add(new THREE.CylinderGeometry(0.25, 0.26, 0.25, 8), darkMat, 0, 1.0, -5.0, -Math.PI / 2);
    add(new THREE.BoxGeometry(0.09, 1.5, 1.0), bodyMat, 0, 1.85, -4.6);
    add(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c8 }), 0, 2.62, -4.85);
    add(new THREE.BoxGeometry(1.8, 0.09, 0.6), bodyMat, 0, 1.42, -4.7);
    add(new THREE.CylinderGeometry(0.47, 0.5, 2.4, 10), darkMat, 1.02, 1.18, -0.85, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.47, 0.5, 2.4, 10), darkMat, -1.02, 1.18, -0.85, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.26, 0.28, 0.55, 10), darkMat, 1.02, 1.18, -2.05, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.26, 0.28, 0.55, 10), darkMat, -1.02, 1.18, -2.05, 0, 0, Math.PI / 2);
    add(new THREE.BoxGeometry(3.0, 0.16, 1.2), bodyMat, 0, 0.02, 0.3);
    add(new THREE.BoxGeometry(0.14, 0.14, 1.6), darkMat, 1.58, -0.1, 0.35);
    add(new THREE.BoxGeometry(0.14, 0.14, 1.6), darkMat, -1.58, -0.1, 0.35);
    add(new THREE.CylinderGeometry(0.24, 0.24, 1.55, 10), darkMat, 1.58, -0.5, 0.32, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.24, 0.24, 1.55, 10), darkMat, -1.58, -0.5, 0.32, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), rotorMat, 1.58, -0.5, 1.12, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), rotorMat, -1.58, -0.5, 1.12, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.085, 0.085, 1.7, 8), missileMat, 1.62, -0.85, 0.3, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.085, 0.085, 1.7, 8), missileMat, -1.62, -0.85, 0.3, Math.PI / 2);
    add(new THREE.ConeGeometry(0.085, 0.28, 8), missileMat, 1.62, -0.85, 1.28, Math.PI / 2);
    add(new THREE.ConeGeometry(0.085, 0.28, 8), missileMat, -1.62, -0.85, 1.28, Math.PI / 2);
    add(new THREE.BoxGeometry(0.03, 0.34, 0.3), darkMat, 1.62, -0.85, -0.42);
    add(new THREE.BoxGeometry(0.34, 0.03, 0.3), darkMat, 1.62, -0.85, -0.42);
    add(new THREE.BoxGeometry(0.03, 0.34, 0.3), darkMat, -1.62, -0.85, -0.42);
    add(new THREE.BoxGeometry(0.34, 0.03, 0.3), darkMat, -1.62, -0.85, -0.42);
    add(new THREE.BoxGeometry(0.18, 0.32, 0.34), darkMat, 0.32, -0.9, 2.0);
    add(new THREE.CylinderGeometry(0.055, 0.07, 1.2, 8), darkMat, 0.32, -0.87, 2.7, Math.PI / 2);
    const sensor = add(new THREE.SphereGeometry(0.17, 10, 8), darkMat, 0.4, -0.42, 2.35);
    sensor.scale.set(1, 0.8, 1.5);
    add(new THREE.BoxGeometry(0.09, 0.11, 0.05), rotorMat, 0.55, -0.42, 2.62);
    add(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 8), darkMat, 0.95, -1.5, 0.35, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 8), darkMat, -0.95, -1.5, 0.35, 0, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), darkMat, 0.95, -1.18, 1.15);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), darkMat, -0.95, -1.18, 1.15);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), darkMat, 0.95, -1.18, -0.55);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), darkMat, -0.95, -1.18, -0.55);
    add(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4438 }), -1.56, -0.03, 0.35);
    add(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3dff62 }), 1.56, -0.03, 0.35);
    add(new THREE.BoxGeometry(0.95, 0.1, 0.42), darkMat, 0, 0.85, 1.5);

    this.mainRotor = new THREE.Group();
    this.mainRotor.position.set(0, 2.85, 0.2);
    this.group.add(this.mainRotor);
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.75, 8), rotorMat, 0, 2.5, 0.2);
    add(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 10), darkMat, 0, 2.85, 0.2);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Group();
      blade.rotation.y = (i * Math.PI) / 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 7.3), rotorMat);
      b.position.set(0, 0, 3.35);
      b.rotation.x = -0.06;
      b.castShadow = true;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.55), rotorMat);
      tip.position.set(0, 0.01, 6.9);
      tip.castShadow = true;
      blade.add(b, tip);
      this.mainRotor.add(blade);
    }
    this.rotorBlur = new THREE.Mesh(
      new THREE.CircleGeometry(7.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xd5dbe0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    this.rotorBlur.rotation.x = -Math.PI / 2;
    this.rotorBlur.position.y = 0.02;
    this.rotorBlur.renderOrder = 2;
    this.mainRotor.add(this.rotorBlur);

    this.tailRotor = new THREE.Group();
    this.tailRotor.position.set(-0.3, 1.6, -4.75);
    this.group.add(this.tailRotor);
    const tb1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.14), rotorMat);
    tb1.position.set(0, 0.32, 0);
    const tb2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.14), rotorMat);
    tb2.position.set(0, -0.32, 0);
    const tb3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.14), rotorMat);
    tb3.rotation.x = Math.PI / 2;
    tb3.position.set(0, 0, 0.32);
    const tb4 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.14), rotorMat);
    tb4.rotation.x = Math.PI / 2;
    tb4.position.set(0, 0, -0.32);
    const trHub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8), darkMat);
    trHub.rotation.z = Math.PI / 2;
    tb1.castShadow = tb2.castShadow = tb3.castShadow = tb4.castShadow = true;
    this.tailRotor.add(tb1, tb2, tb3, tb4, trHub);

    this.pilotGroup = new THREE.Group();
    this.group.add(this.pilotGroup);
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x4c5142, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc9a07c, roughness: 0.8 });
    const helmMat = new THREE.MeshStandardMaterial({ color: 0x2f3528, roughness: 0.5 });
    const makePilot = (x, y, z) => {
      const g = new THREE.Group();
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.3, 4, 8), suitMat);
      torso.position.set(x, y, z);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
      head.position.set(x, y + 0.34, z);
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), helmMat);
      helmet.position.set(x, y + 0.42, z);
      helmet.scale.set(1, 0.85, 1.15);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.15), darkMat);
      visor.position.set(x, y + 0.42, z + 0.13);
      g.add(torso, head, helmet, visor);
      return g;
    };
    this.pilotGroup.add(makePilot(0, 1.1, 1.32), makePilot(0, 1.06, -0.25));

    this.markers = {};
    const mk = (name, x, y, z) => {
      const o = new THREE.Object3D();
      o.position.set(x, y, z);
      this.group.add(o);
      this.markers[name] = o;
    };
    mk('cannon', 0.32, -0.87, 3.4);
    mk('podL', -1.58, -0.5, 1.2);
    mk('podR', 1.58, -0.5, 1.2);
    mk('missileL', -1.62, -0.85, 1.45);
    mk('missileR', 1.62, -0.85, 1.45);
    mk('cockpit', 0, 1.62, 1.32);
    mk('engine', 0, 1.18, -1.2);
  }

  update(dt, input, groundY) {
    if (!this.alive) {
      this.mainRotor.rotation.y += dt * 6;
      this.tailRotor.rotation.x += dt * 18;
      this.rotorBlur.material.opacity *= Math.exp(-2 * dt);
      return;
    }
    const pitchIn = (input.key('KeyW') ? 1 : 0) - (input.key('KeyS') ? 1 : 0);
    const rollIn = (input.key('KeyD') ? 1 : 0) - (input.key('KeyA') ? 1 : 0);
    const yawIn = (input.key('KeyE') ? 1 : 0) - (input.key('KeyQ') ? 1 : 0);
    let throttleIn = 0;
    if (input.key('ShiftLeft') || input.key('ShiftRight') || input.key('Space')) throttleIn += 1;
    if (input.key('KeyX')) throttleIn -= 1;

    this.throttle = clamp(this.throttle + throttleIn * 0.5 * dt, 0, 1);
    this.rpm += (this.throttle - this.rpm) * Math.min(1, dt * 1.7);

    const targetPitch = pitchIn * 1.15;
    const targetRoll = rollIn * 1.55;
    const targetYaw = yawIn * 1.35 - this.rpm * 0.1;
    this.pitchVel += (targetPitch - this.pitchVel) * Math.min(1, dt * 4);
    this.rollVel += (targetRoll - this.rollVel) * Math.min(1, dt * 4);
    this.yawVel += (targetYaw - this.yawVel) * Math.min(1, dt * 3);
    this.pitch += this.pitchVel * dt;
    this.roll -= this.rollVel * dt;
    this.yaw += this.yawVel * dt;
    this.pitch = clamp(this.pitch, -0.62, 0.62);
    this.roll = clamp(this.roll, -0.85, 0.85);
    if (pitchIn === 0) this.pitch *= Math.exp(-0.9 * dt);
    if (rollIn === 0) this.roll *= Math.exp(-1.4 * dt);
    this.group.rotation.set(this.pitch, this.yaw, this.roll);

    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
    const alt = Math.max(0, this.group.position.y - groundY);
    const groundEffect = Math.max(0, 1 - alt / 16) * 0.16;
    const lift = MAX_THRUST * (0.96 + groundEffect) * this.rpm;
    this.velocity.addScaledVector(up, lift * dt);
    this.velocity.y -= GRAVITY * dt;
    this.velocity.x *= Math.exp(-0.16 * dt);
    this.velocity.z *= Math.exp(-0.16 * dt);
    this.velocity.y *= Math.exp(-0.1 * dt);
    this.group.position.addScaledVector(this.velocity, dt);

    const minY = groundY + 1.55;
    if (this.group.position.y <= minY) {
      const impact = this.velocity.y;
      if (impact < -9) {
        this.takeDamage(Math.min(85, -impact * 3.4));
        this.velocity.y = -impact * 0.32;
        this.group.position.y = minY + 0.01;
      } else {
        this.group.position.y = minY;
        if (this.velocity.y < 0) this.velocity.y = 0;
        this.grounded = true;
      }
    } else {
      this.grounded = false;
    }
    if (this.grounded) {
      this.velocity.x *= Math.exp(-2.5 * dt);
      this.velocity.z *= Math.exp(-2.5 * dt);
    }

    this.mainRotor.rotation.y += dt * this.rpm * 88;
    this.tailRotor.rotation.x += dt * this.rpm * 260;
    this.rotorBlur.material.opacity = THREE.MathUtils.smoothstep(this.rpm, 0.55, 0.9) * 0.55;
  }

  forward(out) {
    return out.set(0, 0, 1).applyQuaternion(this.group.quaternion).normalize();
  }

  getWorld(name, out) {
    return this.markers[name].getWorldPosition(out);
  }

  takeDamage(d) {
    if (!this.alive) return;
    this.health = clamp(this.health - d, 0, 100);
    if (this.health <= 0) {
      this.alive = false;
      this.health = 0;
    }
  }
}
