import * as THREE from 'three';
import {
  GALAXIAN_COLORS, GALAXIAN_POINTS,
  ASTEROID_COLORS, ASTEROID_POINTS,
  waveGalaxianCount, waveAsteroidCount, waveMediumAsteroidCount,
  waveDiveCooldown, waveAdvanceSpeed,
  bezier3,
} from './gameLogic.js';

// ─── Shared materials (lazily created once) ──────────────────────────────────
const _mats = {};
function getEnemyMat(hex) {
  if (!_mats[hex]) {
    _mats[hex] = new THREE.MeshStandardMaterial({
      color: hex, emissive: hex, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.5,
    });
  }
  return _mats[hex];
}

// ─── Galaxian enemy ──────────────────────────────────────────────────────────
class GalaxianEnemy {
  constructor(rank, startPos) {
    this.rank    = rank;
    this.color   = GALAXIAN_COLORS[rank];
    this.points  = GALAXIAN_POINTS[rank];
    this.health  = 1;
    this.radius  = 1.0;
    this.contactDamage = 1;

    // Behaviour state: 'formation' | 'diving' | 'returning'
    this.mode        = 'formation';
    this.formationPos = startPos.clone();
    this.formationTime = Math.random() * Math.PI * 2; // phase offset

    // Dive parameters
    this._diveTarget  = new THREE.Vector3();
    this._diveControl = new THREE.Vector3();
    this._diveT       = 0;
    this._diveSpeed   = 0.5 + rank * 0.08;
    this._shootTimer  = 2 + Math.random() * 3;

    // Build mesh
    this.mesh = this._buildMesh();
    this.mesh.position.copy(startPos);
  }

  _buildMesh() {
    const group = new THREE.Group();
    const mat   = getEnemyMat(this.color);

    // Body: compressed octahedron
    const bodyGeo = new THREE.OctahedronGeometry(0.55, 0);
    bodyGeo.scale(1, 0.5, 1.2);
    group.add(new THREE.Mesh(bodyGeo, mat));

    // Left wing
    const wingL = this._makewing(mat);
    wingL.position.set(-0.7, 0, 0);
    wingL.rotation.z = 0.25;
    group.add(wingL);

    // Right wing
    const wingR = this._makewing(mat);
    wingR.position.set(0.7, 0, 0);
    wingR.rotation.z = -0.25;
    group.add(wingR);

    // Engine glow
    const glowMat = new THREE.MeshStandardMaterial({
      color: this.color, emissive: this.color, emissiveIntensity: 3,
    });
    const engineL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), glowMat);
    engineL.position.set(-0.3, 0, 0.4);
    group.add(engineL);
    const engineR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), glowMat);
    engineR.position.set(0.3, 0, 0.4);
    group.add(engineR);

    // Point light from ship
    const pl = new THREE.PointLight(this.color, 1.5, 5);
    group.add(pl);

    return group;
  }

  _makewing(mat) {
    const pts = [
      new THREE.Vector2(0, -0.12),
      new THREE.Vector2(0.8, -0.05),
      new THREE.Vector2(0.9, 0.05),
      new THREE.Vector2(0, 0.12),
    ];
    const shape = new THREE.Shape(pts);
    const geo   = new THREE.ShapeGeometry(shape);
    return new THREE.Mesh(geo, mat);
  }

  startDive(playerPos) {
    if (this.mode !== 'formation') return;
    this.mode = 'diving';
    this._diveT = 0;
    this._diveTarget.copy(playerPos);
    this._diveTarget.x += (Math.random() - 0.5) * 1.5;
    this._diveTarget.y += (Math.random() - 0.5) * 0.5;

    // Bezier control point — swoop out to the side then in
    this._diveControl.set(
      this.mesh.position.x + (Math.random() - 0.5) * 20,
      this.mesh.position.y + Math.random() * 8,
      (this.mesh.position.z + playerPos.z) * 0.5,
    );
  }

  update(dt, formationOffset, playerPos) {
    if (this.mode === 'formation') {
      // Gentle oscillation in formation
      this.formationTime += dt * 1.4;
      this.mesh.position.x = this.formationPos.x + formationOffset + Math.sin(this.formationTime * 0.5) * 0.3;
      this.mesh.position.y = this.formationPos.y + Math.cos(this.formationTime * 0.7) * 0.2;
      this.mesh.position.z = this.formationPos.z + Math.sin(this.formationTime * 0.3) * 1.5;
      this.mesh.lookAt(0, 0, 200); // face player
    } else if (this.mode === 'diving') {
      this._diveT = Math.min(1, this._diveT + dt * this._diveSpeed);
      const t = this._diveT;
      // Quadratic bezier
      const p0 = this.formationPos;
      const p1 = this._diveControl;
      const p2 = this._diveTarget;
      this.mesh.position.x = bezier3(p0.x, p1.x, p2.x, t);
      this.mesh.position.y = bezier3(p0.y, p1.y, p2.y, t);
      this.mesh.position.z = bezier3(p0.z, p1.z, p2.z, t);
      this.mesh.lookAt(playerPos);
    }

    // Shoot timer
    this._shootTimer -= dt;
  }

  wantsToShoot() {
    if (this._shootTimer <= 0 && this.mode === 'diving') {
      this._shootTimer = 1.5 + Math.random() * 2;
      return true;
    }
    return false;
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}

// ─── Asteroid enemy ──────────────────────────────────────────────────────────
class AsteroidEnemy {
  constructor(size, startPos) {
    this.size    = size;         // 'large' | 'medium' | 'small'
    this.color   = ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)];
    this.contactDamage = size === 'large' ? 2 : size === 'medium' ? 1 : 1;

    const cfg = {
      large:  { radius: 2.8, speed: 3 + Math.random() * 2,  points: ASTEROID_POINTS.large,  health: 1, scale: 1.0 },
      medium: { radius: 1.5, speed: 5 + Math.random() * 3,  points: ASTEROID_POINTS.medium, health: 1, scale: 0.55 },
      small:  { radius: 0.7, speed: 8 + Math.random() * 4,  points: ASTEROID_POINTS.small,  health: 1, scale: 0.26 },
    }[size];

    this.radius = cfg.radius;
    this.speed  = cfg.speed;
    this.points = cfg.points;
    this.health = cfg.health;

    this._vel = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 1,
      cfg.speed,
    ).normalize().multiplyScalar(cfg.speed);

    this._rotSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5,
    );

    this.mesh = this._buildMesh(cfg.scale);
    this.mesh.position.copy(startPos);
  }

  _buildMesh(scale) {
    // Jagged icosahedron with vertex perturbation
    const baseGeo = new THREE.IcosahedronGeometry(6 * scale, 1);
    const pos     = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const jitter = 0.85 + Math.random() * 0.3;
      pos.setX(i, pos.getX(i) * jitter);
      pos.setY(i, pos.getY(i) * jitter);
      pos.setZ(i, pos.getZ(i) * jitter);
    }
    pos.needsUpdate = true;
    baseGeo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: this.color, metalness: 0.3, roughness: 0.9, flatShading: true,
    });
    return new THREE.Mesh(baseGeo, mat);
  }

  update(dt) {
    this.mesh.position.addScaledVector(this._vel, dt);
    this.mesh.rotation.x += this._rotSpeed.x * dt;
    this.mesh.rotation.y += this._rotSpeed.y * dt;
    this.mesh.rotation.z += this._rotSpeed.z * dt;
  }

  wantsToShoot() { return false; }

  dispose(scene) {
    scene.remove(this.mesh);
  }

  spawnChildren() {
    if (this.size === 'large')  return { size: 'medium', count: 2 + Math.floor(Math.random() * 2) };
    if (this.size === 'medium') return { size: 'small',  count: 2 };
    return null;
  }
}

// ─── Enemy bullet ────────────────────────────────────────────────────────────
// Material AND geometry are module-level singletons — shared across every enemy
// bullet so no new GPU uploads happen when enemies fire.
const ENEMY_BULLET_GEO = new THREE.SphereGeometry(0.15, 6, 6);
const ENEMY_BULLET_MAT = new THREE.MeshStandardMaterial({
  color: 0xff3300, emissive: 0xff3300, emissiveIntensity: 3,
});

class EnemyBullet {
  constructor(startPos, targetPos) {
    this.mesh = new THREE.Mesh(ENEMY_BULLET_GEO, ENEMY_BULLET_MAT);
    this.mesh.position.copy(startPos);

    this._vel = new THREE.Vector3().subVectors(targetPos, startPos).normalize().multiplyScalar(25);
  }

  update(dt) {
    this.mesh.position.addScaledVector(this._vel, dt);
  }

  get position() { return this.mesh.position; }
}

// ─── Enemy Manager ───────────────────────────────────────────────────────────
export class EnemyManager {
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;

    this._enemies      = [];
    this._enemyBullets = [];
    this._formationOffsetDir = 1;
    this._formationOffset    = 0;
    this._diveTimer          = 0;
    this._diveCooldown       = 3.0;
  }

  spawnWave(wave) {
    this.clear();
    this._formationOffset    = 0;
    this._formationOffsetDir = 1;
    this._diveTimer          = 2.0;
    this._diveCooldown       = waveDiveCooldown(wave);
    this._advanceSpeed       = waveAdvanceSpeed(wave);

    const galaxianCount = waveGalaxianCount(wave);
    const asteroidLarge = waveAsteroidCount(wave);

    // Spawn galaxians in a grid
    const cols = Math.ceil(galaxianCount / 4);
    const rows = Math.min(4, Math.ceil(galaxianCount / cols));
    let spawned = 0;

    for (let row = 0; row < rows && spawned < galaxianCount; row++) {
      const rank = Math.min(row, GALAXIAN_COLORS.length - 1);
      for (let col = 0; col < cols && spawned < galaxianCount; col++) {
        const pos = new THREE.Vector3(
          (col - (cols - 1) / 2) * 5,
          (row - (rows - 1) / 2) * 3.5 + 2,
          -65 - row * 3,
        );
        const enemy = new GalaxianEnemy(rank, pos);
        this.scene.add(enemy.mesh);
        this._enemies.push(enemy);
        spawned++;
      }
    }

    // Spawn asteroids
    for (let i = 0; i < asteroidLarge; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 20,
        -70 - Math.random() * 30,
      );
      const asteroid = new AsteroidEnemy('large', pos);
      this.scene.add(asteroid.mesh);
      this._enemies.push(asteroid);
    }

    // Extra medium asteroids in later waves
    const mediumCount = waveMediumAsteroidCount(wave);
    for (let i = 0; i < mediumCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 18,
        -55 - Math.random() * 20,
      );
      const asteroid = new AsteroidEnemy('medium', pos);
      this.scene.add(asteroid.mesh);
      this._enemies.push(asteroid);
    }
  }

  update(dt, camera) {
    const playerPos = camera.position.clone();
    playerPos.z += 5; // aim slightly ahead

    // Formation drift (side-to-side)
    this._formationOffset += this._formationOffsetDir * dt * (2 + Math.min(this._enemies.length * 0.1, 3));
    if (Math.abs(this._formationOffset) > 8) this._formationOffsetDir *= -1;

    // Formation advances toward player
    const advance = (this._advanceSpeed || 3) * dt;
    const galaxians = this._enemies.filter(e => e instanceof GalaxianEnemy && e.mode === 'formation');
    for (const g of galaxians) {
      g.formationPos.z += advance;
    }

    // Dive timer
    this._diveTimer -= dt;
    if (this._diveTimer <= 0) {
      this._triggerDive(playerPos);
      this._diveTimer = this._diveCooldown || 3;
    }

    // Update all enemies
    for (let i = this._enemies.length - 1; i >= 0; i--) {
      const e = this._enemies[i];
      e.update(dt, this._formationOffset, playerPos);

      // Enemy shooting
      if (e.wantsToShoot()) {
        const eb = new EnemyBullet(
          e.mesh.position.clone().add(new THREE.Vector3(0, 0, 0.5)),
          camera.position.clone(),
        );
        this.scene.add(eb.mesh);
        this._enemyBullets.push(eb);
      }
    }

    // Update enemy bullets
    for (let i = this._enemyBullets.length - 1; i >= 0; i--) {
      const eb = this._enemyBullets[i];
      eb.update(dt);
      // Remove if past player or too far
      if (eb.position.z > 3 || eb.position.z < -200) {
        this.destroyBullet(eb);
      }
    }
  }

  _triggerDive(playerPos) {
    const eligible = this._enemies.filter(e =>
      e instanceof GalaxianEnemy && e.mode === 'formation',
    );
    if (eligible.length === 0) return;
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    pick.startDive(playerPos);
  }

  destroyEnemy(enemy) {
    const idx = this._enemies.indexOf(enemy);
    if (idx === -1) return false;
    this._enemies.splice(idx, 1);

    // Asteroid splitting
    let didSplit = false;
    if (enemy instanceof AsteroidEnemy) {
      const spawn = enemy.spawnChildren();
      if (spawn) {
        for (let i = 0; i < spawn.count; i++) {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
          );
          const childPos = enemy.mesh.position.clone().add(offset);
          const child    = new AsteroidEnemy(spawn.size, childPos);
          this.scene.add(child.mesh);
          this._enemies.push(child);
          didSplit = true;
        }
      }
    }

    enemy.dispose(this.scene);
    return didSplit;
  }

  destroyBullet(eb) {
    const idx = this._enemyBullets.indexOf(eb);
    if (idx !== -1) this._enemyBullets.splice(idx, 1);
    this.scene.remove(eb.mesh);
  }

  getActive()        { return this._enemies; }
  getActiveBullets() { return this._enemyBullets; }
  isEmpty()          { return this._enemies.length === 0; }

  clear() {
    this._enemies.forEach(e => e.dispose(this.scene));
    this._enemies = [];
    this._enemyBullets.forEach(eb => this.scene.remove(eb.mesh));
    this._enemyBullets = [];
  }
}
