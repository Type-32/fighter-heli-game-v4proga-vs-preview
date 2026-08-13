import * as THREE from 'three';
import { mulberry32 } from './util.js';

export class Terrain {
  constructor(scene) {
    this.size = 4000;
    this.segments = 140;
    const rng = mulberry32(20240813);
    const perm = new Uint8Array(512);
    for (let i = 0; i < 256; i++) perm[i] = Math.floor(rng() * 256);
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    this.perm = perm;
    scene.add(this.buildMesh());
    scene.add(this.buildWater());
    this.buildTrees(scene);
    this.buildRocks(scene);
    this.buildPad(scene);
  }

  hash(i, j) {
    return this.perm[(this.perm[i & 255] + j) & 255] / 255;
  }

  valueNoise(x, z) {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    const a = this.hash(xi, zi);
    const b = this.hash(xi + 1, zi);
    const c = this.hash(xi, zi + 1);
    const d = this.hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  fbm(x, z) {
    let s = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 5; o++) {
      s += amp * this.valueNoise(x * f, z * f);
      f *= 2.05;
      amp *= 0.5;
    }
    return s;
  }

  heightAt(x, z) {
    const r = Math.hypot(x, z);
    const ring = THREE.MathUtils.smoothstep(r / (this.size * 0.5), 0.55, 1.0);
    const far = THREE.MathUtils.smoothstep(r / (this.size * 0.5), 0.25, 0.95);
    let h = (this.fbm(x * 0.0016, z * 0.0016) - 0.5) * 2;
    h *= 9 + 62 * far;
    const m = this.fbm(x * 0.0046 + 137, z * 0.0046 + 57);
    h += ring * 175 * (0.45 + 0.55 * m);
    h += (this.fbm(x * 0.055, z * 0.055) - 0.5) * 1.5;
    const flat = THREE.MathUtils.smoothstep(r, 120, 430);
    return h * flat;
  }

  groundY(x, z) {
    let h = Math.max(this.heightAt(x, z), 0);
    if (Math.hypot(x, z) < 16.5) h += 0.5;
    return h;
  }

  buildMesh() {
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const rng = mulberry32(555);
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.heightAt(x, z);
      pos.setY(i, h);
      let r, g, b;
      if (h < 2.5) { r = 0.72; g = 0.63; b = 0.42; }
      else if (h < 28) { r = 0.36; g = 0.48; b = 0.24; }
      else if (h < 78) { r = 0.49; g = 0.48; b = 0.43; }
      else { r = 0.9; g = 0.92; b = 0.95; }
      const j = 0.92 + rng() * 0.16;
      c.setRGB(r * j, g * j, b * j);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.receiveShadow = true;
    return mesh;
  }

  buildWater() {
    const geo = new THREE.PlaneGeometry(10000, 10000);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x2c6f92,
      transparent: true,
      opacity: 0.8,
      shininess: 90,
      specular: 0x9fc4d8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -0.12;
    return mesh;
  }

  buildTrees(scene) {
    const rng = mulberry32(777);
    const count = 1500;
    const trunkGeo = new THREE.CylinderGeometry(0.14, 0.3, 2.6, 5);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2b });
    const leafGeo = new THREE.ConeGeometry(1.7, 5.5, 7);
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < count * 4 && placed < count; i++) {
      const a = rng() * Math.PI * 2;
      const d = 150 + Math.pow(rng(), 0.6) * 1850;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = this.heightAt(x, z);
      if (h < 1.2 || h > 34) continue;
      if (Math.abs(this.heightAt(x + 2, z) - this.heightAt(x - 2, z)) > 2.6) continue;
      const s = 0.7 + rng() * 1.1;
      const ry = rng() * Math.PI;
      dummy.position.set(x, h + 1.15 * s, z);
      dummy.rotation.set(0, ry, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      dummy.position.set(x, h + 2.6 * s + 2.75 * s, z);
      dummy.updateMatrix();
      leaves.setMatrixAt(placed, dummy.matrix);
      leaves.setColorAt(placed, new THREE.Color().setHSL(0.27 + rng() * 0.06, 0.45 + rng() * 0.2, 0.28 + rng() * 0.15));
      placed++;
    }
    trunks.count = placed;
    leaves.count = placed;
    trunks.castShadow = true;
    leaves.castShadow = true;
    trunks.frustumCulled = false;
    leaves.frustumCulled = false;
    scene.add(trunks, leaves);
  }

  buildRocks(scene) {
    const rng = mulberry32(4242);
    const count = 240;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    let placed = 0;
    for (let i = 0; i < count * 6 && placed < count; i++) {
      const a = rng() * Math.PI * 2;
      const d = 100 + Math.pow(rng(), 0.7) * 1900;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const h = this.heightAt(x, z);
      if (h < 8 || h > 120) continue;
      const s = 0.5 + rng() * 2.4;
      dummy.position.set(x, h + s * 0.25, z);
      dummy.rotation.set(rng(), rng(), rng());
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      mesh.setColorAt(placed, new THREE.Color().setHSL(0.08, 0.04, 0.38 + rng() * 0.25));
      placed++;
    }
    mesh.count = placed;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  buildPad(scene) {
    const h = this.heightAt(0, 0);
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16.6, 0.5, 28),
      new THREE.MeshLambertMaterial({ color: 0x3d434a })
    );
    pad.position.set(0, h + 0.25, 0);
    pad.receiveShadow = true;
    scene.add(pad);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(13, 0.35, 6, 40),
      new THREE.MeshLambertMaterial({ color: 0xd8d2b8 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, h + 0.52, 0);
    scene.add(ring);
  }
}
