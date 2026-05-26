import * as THREE from 'three';
import { FIRE_RATES, BULLET_DAMAGE, BULLET_COLORS } from './gameLogic.js';

// ─── Weapon definitions ──────────────────────────────────────────────────────
const WEAPON_DEFS = {
  SINGLE:  { fireRate: FIRE_RATES.SINGLE,  damage: BULLET_DAMAGE.SINGLE,  color: BULLET_COLORS.SINGLE,  spread: 0,    barrels: [[0, 0, 0]] },
  DUAL:    { fireRate: FIRE_RATES.DUAL,    damage: BULLET_DAMAGE.DUAL,    color: BULLET_COLORS.DUAL,    spread: 0,    barrels: [[-0.3, -0.1, 0], [0.3, -0.1, 0]] },
  RAPID:   { fireRate: FIRE_RATES.RAPID,   damage: BULLET_DAMAGE.RAPID,   color: BULLET_COLORS.RAPID,   spread: 0,    barrels: [[0, 0, 0]] },
  SPREAD:  { fireRate: FIRE_RATES.SPREAD,  damage: BULLET_DAMAGE.SPREAD,  color: BULLET_COLORS.SPREAD,  spread: 0.08, barrels: [[-0.15, 0, 0], [0, 0, 0], [0.15, 0, 0]] },
  MISSILE: { fireRate: FIRE_RATES.MISSILE, damage: BULLET_DAMAGE.MISSILE, color: BULLET_COLORS.MISSILE, spread: 0,    barrels: [[0, -0.15, 0]] },
};

// ─── Bullet ──────────────────────────────────────────────────────────────────
class Bullet {
  constructor(pos, dir, def, isMissile = false) {
    this.damage    = def.damage;
    this.speed     = isMissile ? 40 : 90;
    this.isMissile = isMissile;
    this._dir      = dir.clone().normalize();
    this._age      = 0;
    this._maxAge   = 4.0;
    this._target   = null; // for homing missiles

    const mat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.color,
      emissiveIntensity: isMissile ? 4 : 3,
    });

    if (isMissile) {
      const geo = new THREE.CylinderGeometry(0.08, 0.18, 0.7, 8);
      geo.rotateX(Math.PI / 2);
      this.mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6);
      geo.rotateX(Math.PI / 2);
      this.mesh = new THREE.Mesh(geo, mat);
    }
    this.mesh.position.copy(pos);

    // Trail light
    this.light = new THREE.PointLight(def.color, isMissile ? 3 : 1.5, isMissile ? 6 : 3);
    this.mesh.add(this.light);
  }

  update(dt, enemies) {
    this._age += dt;

    if (this.isMissile && enemies.length > 0) {
      // Find nearest enemy
      if (!this._target || !enemies.includes(this._target)) {
        let minDist = Infinity;
        for (const e of enemies) {
          const d = this.mesh.position.distanceTo(e.mesh.position);
          if (d < minDist) { minDist = d; this._target = e; }
        }
      }
      if (this._target) {
        const desired = new THREE.Vector3()
          .subVectors(this._target.mesh.position, this.mesh.position)
          .normalize();
        this._dir.lerp(desired, dt * 3).normalize();
      }
    }

    this.mesh.position.addScaledVector(this._dir, this.speed * dt);
    this.mesh.lookAt(this.mesh.position.clone().add(this._dir));

    return this._age < this._maxAge && this.mesh.position.z > -250;
  }

  get position() { return this.mesh.position; }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}

// ─── Weapon System ───────────────────────────────────────────────────────────
export class WeaponSystem {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera;
    this._bullets = [];
    this._mode    = 'SINGLE';
    this._powerUpTimer = 0;
    this._powerUpType  = null;

    // Muzzle flash geometry (reused)
    this._flashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5, transparent: true, opacity: 0,
    });
    this._flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), this._flashMat);
    scene.add(this._flashMesh);
    this._flashTimer = 0;
  }

  fire(camera, audio) {
    const def     = WEAPON_DEFS[this._mode];
    const isMissile = this._mode === 'MISSILE';

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right   = new THREE.Vector3(1, 0,  0).applyQuaternion(camera.quaternion);
    const up      = new THREE.Vector3(0, 1,  0).applyQuaternion(camera.quaternion);

    for (const [bx, by] of def.barrels) {
      const origin = camera.position.clone()
        .addScaledVector(forward, 0.5)
        .addScaledVector(right,   bx)
        .addScaledVector(up,      by);

      const spreadX = (Math.random() - 0.5) * def.spread + bx * 0.14;
      const spreadY = (Math.random() - 0.5) * def.spread;
      const dir = forward.clone()
        .addScaledVector(right, spreadX)
        .addScaledVector(up,    spreadY)
        .normalize();

      const bullet = new Bullet(origin, dir, def, isMissile);
      this.scene.add(bullet.mesh);
      this._bullets.push(bullet);
    }

    // Muzzle flash
    this._flashMesh.position.copy(camera.position).addScaledVector(forward, 0.8);
    this._flashMesh.material.opacity = 0.8;
    this._flashTimer = 0.06;

    if (audio) audio.playShoot(this._mode);
  }

  update(dt) {
    // Power-up countdown
    if (this._powerUpTimer > 0) {
      this._powerUpTimer -= dt;
      if (this._powerUpTimer <= 0) {
        this._mode = 'SINGLE';
        this._powerUpType = null;
      }
    }

    // Update bullets (pass enemy list for homing missiles)
    const enemies = this._enemies || [];
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      if (!this._bullets[i].update(dt, enemies)) {
        this._bullets[i].dispose(this.scene);
        this._bullets.splice(i, 1);
      }
    }

    // Muzzle flash fade
    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      this._flashMesh.material.opacity = Math.max(0, this._flashTimer / 0.06 * 0.8);
    }
  }

  // Called by game.js to pass enemy list for homing
  setEnemyList(enemies) {
    this._enemies = enemies;
  }

  applyPowerUp(type, duration) {
    if (WEAPON_DEFS[type]) {
      this._mode         = type;
      this._powerUpTimer = duration;
      this._powerUpType  = type;
    }
  }

  getFireRate() {
    return WEAPON_DEFS[this._mode].fireRate;
  }

  getActiveBullets() { return this._bullets; }

  destroyBullet(bullet) {
    const idx = this._bullets.indexOf(bullet);
    if (idx !== -1) {
      this._bullets[idx].dispose(this.scene);
      this._bullets.splice(idx, 1);
    }
  }

  reset() {
    this._bullets.forEach(b => b.dispose(this.scene));
    this._bullets     = [];
    this._mode        = 'SINGLE';
    this._powerUpTimer = 0;
    this._powerUpType  = null;
  }
}
