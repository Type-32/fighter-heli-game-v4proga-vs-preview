import * as THREE from 'three';
import { Input } from './input.js';
import { Terrain } from './terrain.js';
import { Helicopter } from './helicopter.js';
import { Effects, cloudTexture } from './effects.js';
import { EnemyManager } from './enemies.js';
import { Weapons } from './weapons.js';
import { AudioFX } from './audio.js';
import { HUD } from './hud.js';
import { clamp } from './util.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const fogColor = new THREE.Color(0xc3d5e4);
scene.fog = new THREE.Fog(fogColor, 380, 3400);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.15, 12000);
camera.position.set(10, 9, 30);

const sunDir = new THREE.Vector3(0.42, 0.5, 0.72).normalize();
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    topColor: { value: new THREE.Color(0x3570a8) },
    horizonColor: { value: new THREE.Color(0xbfd2e2) },
    sunDir: { value: sunDir.clone() },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vDir;
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    uniform vec3 sunDir;
    void main() {
      float h = clamp(vDir.y, 0.0, 1.0);
      vec3 col = mix(horizonColor, topColor, pow(h, 0.62));
      float sun = pow(max(dot(vDir, sunDir), 0.0), 350.0);
      col += vec3(1.0, 0.95, 0.8) * sun * 1.6;
      float glow = pow(max(dot(vDir, sunDir), 0.0), 6.0) * 0.25;
      col += vec3(1.0, 0.9, 0.7) * glow;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 24, 16), skyMat);
sky.frustumCulled = false;
scene.add(sky);

scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x6a6150, 0.9));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 50;
sun.shadow.camera.far = 1500;
sun.shadow.camera.left = -280;
sun.shadow.camera.right = 280;
sun.shadow.camera.top = 280;
sun.shadow.camera.bottom = -280;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const terrain = new Terrain(scene);
const effects = new Effects(scene);
const helo = new Helicopter(scene);
const enemies = new EnemyManager(scene, effects, terrain);
const weapons = new Weapons(scene, effects, enemies, terrain);
const audio = new AudioFX();
const hud = new HUD();
const input = new Input();

const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: effects.glowTex,
  color: 0xfff2cc,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
}));
sunSprite.position.copy(sunDir).multiplyScalar(5200);
sunSprite.scale.setScalar(750);
scene.add(sunSprite);

const cloudTex = cloudTexture();
const clouds = [];
for (let i = 0; i < 26; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.32 + Math.random() * 0.25,
    depthWrite: false,
  }));
  s.position.set((Math.random() - 0.5) * 4400, 280 + Math.random() * 220, (Math.random() - 0.5) * 4400);
  const sc = 120 + Math.random() * 200;
  s.scale.set(sc, sc * 0.42, 1);
  scene.add(s);
  clouds.push({ s, speed: 2.5 + Math.random() * 3 });
}

let mode = 'menu';
let cockpit = false;
let score = 0;
let kills = 0;
let shake = 0;
let nextWaveTimer = -1;
let deadTimer = 0;
let prevMouseLeft = false;
let prevMouseRight = false;
let lockBeepCooldown = 0;
const prevKeys = new Set();

weapons.sfx = {
  rocket: () => audio.rocket(),
  shoot: () => audio.shoot(),
  missile: () => audio.missile(),
};
effects.onExplosion = (pos, scale) => {
  audio.explosion(scale);
  const d = helo.group.position.distanceTo(pos);
  if (d < 130) shake = Math.min(1.2, shake + ((130 - d) / 130) * 0.55 * Math.min(scale, 2));
};
enemies.onKilled = () => {
  kills++;
  score += 100;
  hud.message('目标摧毁  +100');
};
enemies.onPlayerHit = (dmg) => {
  helo.takeDamage(dmg);
  if (helo.alive) {
    hud.flashDamage();
    audio.hitAlarm();
    shake = Math.min(1.2, shake + 0.35);
  }
};

function pressed(code) {
  const down = input.keys.has(code);
  const was = prevKeys.has(code);
  if (down && !was) {
    prevKeys.add(code);
    return true;
  }
  if (!down) prevKeys.delete(code);
  return false;
}

function toggleView() {
  if (!cockpit) {
    renderer.domElement.requestPointerLock();
  } else {
    document.exitPointerLock();
  }
}

document.addEventListener('pointerlockchange', () => {
  cockpit = document.pointerLockElement === renderer.domElement;
  input.clearMouse();
  helo.pilotGroup.visible = !cockpit;
});

function showEnd(victory) {
  document.getElementById('end-title').textContent = victory ? '任务完成' : '任务失败';
  document.getElementById('end-sub').textContent = victory ? '区域已肃清' : '直升机被摧毁';
  document.getElementById('end-score').textContent = score;
  document.getElementById('end-kills').textContent = kills;
  document.getElementById('overlay-end').classList.remove('hidden');
}

document.getElementById('start-btn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  document.getElementById('overlay').classList.add('hidden');
  audio.init();
  hud.show();
  mode = 'play';
  enemies.spawnWave();
  hud.message('任务开始：摧毁所有敌方目标');
});
document.getElementById('restart-btn').addEventListener('click', (e) => {
  e.currentTarget.blur();
  location.reload();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
const aimDir = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();
const qPitch = new THREE.Quaternion();
const fwdVec = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const hp = helo.group.position;
  const groundY = terrain.groundY(hp.x, hp.z);

  helo.update(dt, input, groundY);

  if (mode === 'play' && helo.alive) {
    camera.getWorldDirection(aimDir);
    const cannonFrom = helo.getWorld('cannon', tmpVec);
    if (input.mouseLeft && !prevMouseLeft) {
      if (weapons.fireCannon(cannonFrom, aimDir, cockpit ? 0.006 : 0.02)) shake += 0.015;
    }
    if (input.mouseRight && !prevMouseRight) {
      const lock = enemies.findLockable(hp, aimDir, 750, cockpit ? 0.14 : 0.16);
      const side = weapons.ammo.missiles % 2 === 0 ? 'missileL' : 'missileR';
      const from = helo.getWorld(side, tmpVec);
      if (!weapons.fireMissile(from, aimDir, lock)) hud.message('导弹已耗尽');
    }
    if (input.key('KeyF')) {
      const side = weapons.podSide ? 'podR' : 'podL';
      const from = helo.getWorld(side, tmpVec);
      if (weapons.fireRocket(from, aimDir)) weapons.podSide = 1 - weapons.podSide;
    }
    if (helo.health < 45) {
      helo.smokeTimer -= dt;
      if (helo.smokeTimer <= 0) {
        helo.smokeTimer = 0.12;
        effects.smokePuff(helo.getWorld('engine', tmpVec), 3);
      }
    }
    if (helo.grounded && helo.rpm > 0.35) {
      effects.dustTrail(new THREE.Vector3(hp.x, groundY + 0.4, hp.z));
    }
    if (terrain.heightAt(hp.x, hp.z) < -0.5 && hp.y < 2.2) {
      helo.takeDamage(1000);
    }
  }
  prevMouseLeft = input.mouseLeft;
  prevMouseRight = input.mouseRight;

  if (mode === 'play' && helo.alive) {
    if (pressed('KeyC')) toggleView();
  }
  if (pressed('KeyM')) audio.enabled = !audio.enabled;
  if (pressed('KeyR')) location.reload();

  weapons.update(dt);
  enemies.update(dt, helo);
  effects.update(dt);

  for (const c of clouds) {
    c.s.position.x += c.speed * dt;
    if (c.s.position.x > 2400) c.s.position.x = -2400;
  }

  if (mode === 'play') {
    if (enemies.list.length === 0 && nextWaveTimer < 0) {
      if (enemies.wave >= enemies.maxWaves) {
        mode = 'victory';
        showEnd(true);
      } else {
        nextWaveTimer = 3.5;
        hud.message('敌增援部队正在接近!');
      }
    }
    if (nextWaveTimer >= 0) {
      nextWaveTimer -= dt;
      if (nextWaveTimer < 0) {
        enemies.spawnWave();
        hud.message(`第 ${enemies.wave} 波目标已部署`);
      }
    }
  }

  if (!helo.alive && mode === 'play') {
    mode = 'dead';
    deadTimer = 0;
    document.exitPointerLock();
    effects.explosion(hp, 3);
    helo.group.visible = false;
    shake = 1;
  }
  if (mode === 'dead') {
    deadTimer += dt;
    if (deadTimer > 2) showEnd(false);
  }

  if (cockpit) {
    camera.position.copy(helo.getWorld('cockpit', tmpVec));
    const m = input.consumeMouse();
    qYaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -m.x * 0.0022);
    qPitch.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -m.y * 0.0022);
    camera.quaternion.copy(helo.group.getWorldQuaternion(tmpQuat)).multiply(qYaw).multiply(qPitch);
    camera.position.x += (Math.sin(t * 47) * 0.006 + Math.sin(t * 71) * 0.004) * helo.rpm;
    camera.position.y += (Math.sin(t * 53) * 0.005 + Math.sin(t * 83) * 0.003) * helo.rpm;
  } else if (mode === 'menu') {
    const ang = t * 0.12;
    camera.position.set(hp.x + Math.sin(ang) * 34, 9, hp.z + Math.cos(ang) * 34);
    camera.lookAt(hp.x, 2.5, hp.z);
  } else {
    helo.forward(fwdVec);
    const off = new THREE.Vector3(0, 4.6, -14.5).applyQuaternion(helo.group.quaternion);
    camera.position.lerp(hp.clone().add(off), 1 - Math.exp(-4.5 * dt));
    camera.lookAt(hp.clone().addScaledVector(fwdVec, 9).add(new THREE.Vector3(0, 1.2, 0)));
  }

  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake * 0.5;
    camera.position.y += (Math.random() - 0.5) * shake * 0.5;
    camera.position.z += (Math.random() - 0.5) * shake * 0.5;
    shake *= Math.exp(-3.5 * dt);
  } else {
    shake = 0;
  }

  const spd = helo.velocity.length();
  const targetFov = cockpit ? 64 : clamp(62 + spd * 0.18, 62, 82);
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }

  sun.position.copy(hp).addScaledVector(sunDir, 600);
  sun.target.position.copy(hp);

  const groundBelow = Math.max(terrain.heightAt(hp.x, hp.z), 0);
  helo.forward(fwdVec);
  const heading = (Math.atan2(fwdVec.x, fwdVec.z) * 180 / Math.PI + 360) % 360;
  hud.update({
    speed: spd * 3.6,
    alt: Math.max(0, hp.y - groundBelow),
    vs: helo.velocity.y,
    heading,
    throttle: helo.throttle,
    rpm: helo.rpm,
    health: helo.health,
    rockets: weapons.ammo.rockets,
    cannon: weapons.ammo.cannon,
    missiles: weapons.ammo.missiles,
    kills,
    score,
    targets: enemies.list.length,
    wave: enemies.wave,
    maxWaves: enemies.maxWaves,
  });

  let lockInfo = null;
  if (mode === 'play' && helo.alive) {
    camera.getWorldDirection(aimDir);
    const lock = enemies.findLockable(hp, aimDir, 750, cockpit ? 0.14 : 0.16);
    if (lock) {
      const v = lock.group.position.clone().add(new THREE.Vector3(0, 1.6, 0)).project(camera);
      if (v.z < 1) {
        lockInfo = {
          x: (v.x * 0.5 + 0.5) * window.innerWidth,
          y: (-v.y * 0.5 + 0.5) * window.innerHeight,
          name: lock.type === 'tank' ? '坦克' : lock.type === 'apc' ? '装甲车' : '卡车',
          dist: Math.round(hp.distanceTo(lock.group.position)),
          armed: weapons.ammo.missiles > 0,
        };
        lockBeepCooldown -= dt;
        if (lockBeepCooldown <= 0) {
          lockBeepCooldown = 0.5;
          audio.lockBeep();
        }
      }
    }
  }
  hud.drawReticle({ crosshair: cockpit, lock: lockInfo });

  audio.setRotor(helo.rpm, helo.throttle);
  renderer.render(scene, camera);
}

animate();
