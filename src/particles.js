import * as THREE from 'three';

const MAX_PARTICLES = 1200;

class Particle {
  constructor() {
    this.alive  = false;
    this.age    = 0;
    this.maxAge = 1;
    this.vel    = new THREE.Vector3();
    this.color  = new THREE.Color();
    this.pos    = new THREE.Vector3();
    this.size   = 1;
    this.idx    = 0; // index into buffer
  }

  init(pos, vel, color, maxAge, size) {
    this.alive  = true;
    this.age    = 0;
    this.maxAge = maxAge;
    this.pos.copy(pos);
    this.vel.copy(vel);
    this.color.set(color);
    this.size = size;
  }
}

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this._pool = [];
    this._alive = [];

    // Pre-allocate
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._pool.push(new Particle());
    }

    // Geometry for all particles
    this._positions = new Float32Array(MAX_PARTICLES * 3);
    this._colors    = new Float32Array(MAX_PARTICLES * 3);
    this._sizes     = new Float32Array(MAX_PARTICLES);

    this._geo = new THREE.BufferGeometry();
    this._geo.setAttribute('position', new THREE.BufferAttribute(this._positions, 3).setUsage(THREE.DynamicDrawUsage));
    this._geo.setAttribute('color',    new THREE.BufferAttribute(this._colors,    3).setUsage(THREE.DynamicDrawUsage));
    this._geo.setAttribute('size',     new THREE.BufferAttribute(this._sizes,     1).setUsage(THREE.DynamicDrawUsage));

    // Custom shader material for sized particles with per-particle colour
    this._mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    this._points = new THREE.Points(this._geo, this._mat);
    this._points.renderOrder = 3;
    scene.add(this._points);

    this._count = 0;
  }

  _acquire() {
    if (this._pool.length === 0) return null;
    return this._pool.pop();
  }

  _release(p) {
    p.alive = false;
    this._pool.push(p);
  }

  explode(pos, color, count = 40) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;

      const speed  = 4 + Math.random() * 14;
      const theta  = Math.random() * Math.PI * 2;
      const phi    = Math.acos(2 * Math.random() - 1);
      const vel    = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      ).multiplyScalar(speed);

      p.init(pos, vel, color, 0.5 + Math.random() * 0.8, 0.3 + Math.random() * 0.3);
      this._alive.push(p);
    }
  }

  spark(pos, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;

      const speed = 3 + Math.random() * 8;
      const dir   = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(speed);

      p.init(pos, dir, 0xffaa00, 0.2 + Math.random() * 0.3, 0.15);
      this._alive.push(p);
    }
  }

  burst(pos, color, count = 20) {
    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;

      const speed = 2 + Math.random() * 6;
      const dir   = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(speed);

      p.init(pos, dir, color, 0.4 + Math.random() * 0.5, 0.2);
      this._alive.push(p);
    }
  }

  screenFlash(scene, camera) {
    // Handled by cockpit damage flash; this is a no-op fallback
  }

  update(dt) {
    let writeIdx = 0;

    for (let i = this._alive.length - 1; i >= 0; i--) {
      const p = this._alive[i];
      p.age += dt;

      if (p.age >= p.maxAge) {
        this._release(p);
        this._alive.splice(i, 1);
        continue;
      }

      const life = 1 - p.age / p.maxAge;

      // Update position
      p.pos.addScaledVector(p.vel, dt);
      // Dampen velocity
      p.vel.multiplyScalar(1 - dt * 2.5);

      // Write to buffer
      const i3 = writeIdx * 3;
      this._positions[i3]     = p.pos.x;
      this._positions[i3 + 1] = p.pos.y;
      this._positions[i3 + 2] = p.pos.z;

      this._colors[i3]     = p.color.r * life;
      this._colors[i3 + 1] = p.color.g * life;
      this._colors[i3 + 2] = p.color.b * life;

      this._sizes[writeIdx] = p.size * life;
      writeIdx++;
    }

    // Zero out the rest of the buffer
    for (let i = writeIdx * 3; i < this._count * 3; i++) {
      this._positions[i] = 0;
      this._colors[i]    = 0;
    }
    for (let i = writeIdx; i < this._count; i++) {
      this._sizes[i] = 0;
    }

    this._count = writeIdx;
    this._geo.setDrawRange(0, this._count);
    this._geo.attributes.position.needsUpdate = true;
    this._geo.attributes.color.needsUpdate    = true;
    this._geo.attributes.size.needsUpdate     = true;
  }

  clear() {
    this._alive.forEach(p => this._release(p));
    this._alive = [];
    this._count = 0;
  }
}
