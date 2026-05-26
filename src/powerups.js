import * as THREE from 'three';

const POWERUP_DEFS = {
  DUAL:    { color: 0x00ff88, duration: 15, label: 'DUAL LASER' },
  RAPID:   { color: 0x00aaff, duration: 12, label: 'RAPID FIRE' },
  SPREAD:  { color: 0xff8800, duration: 12, label: 'SPREAD SHOT' },
  MISSILE: { color: 0xff00cc, duration: 10, label: 'MISSILES' },
  SHIELD:  { color: 0xffff00, duration: 0,  label: '+1 SHIELD' },
};

const TYPES = Object.keys(POWERUP_DEFS);

class PowerUp {
  constructor(pos, type) {
    this.type     = type;
    this.duration = POWERUP_DEFS[type].duration;
    this.color    = POWERUP_DEFS[type].color;
    this._age     = 0;
    this._rotSpeed = 1.5 + Math.random();

    this.mesh = this._buildMesh();
    this.mesh.position.copy(pos);
  }

  _buildMesh() {
    const group = new THREE.Group();
    const color = this.color;

    // Outer ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.06, 8, 24),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 2.5,
        transparent: true, opacity: 0.9,
      }),
    );
    group.add(ring);

    // Inner orb
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28, 1),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 2,
        transparent: true, opacity: 0.8,
      }),
    );
    group.add(orb);

    // Glow light
    const light = new THREE.PointLight(color, 4, 8);
    group.add(light);

    // Letter canvas
    const c   = document.createElement('canvas');
    c.width   = 128; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font      = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.slice(0, 4), 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    group.add(plane);

    return group;
  }

  update(dt) {
    this._age += dt;
    this.mesh.rotation.y += this._rotSpeed * dt;
    this.mesh.rotation.z = Math.sin(this._age * 2) * 0.15;

    // Bob up/down
    const base = this.mesh.position.clone();
    this.mesh.position.y = base.y + Math.sin(this._age * 3) * 0.002;

    // Move slowly towards player
    this.mesh.position.z += dt * 8;

    return this.mesh.position.z < 3 && this._age < 12;
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}

export class PowerUpManager {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera;
    this._pups   = [];
  }

  spawn(pos) {
    // Weight towards weapon upgrades; shield is rarer
    const weights = [3, 3, 3, 3, 1]; // DUAL, RAPID, SPREAD, MISSILE, SHIELD
    const total   = weights.reduce((a, b) => a + b, 0);
    let r         = Math.random() * total;
    let typeIdx   = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { typeIdx = i; break; }
    }
    const type = TYPES[typeIdx];
    const pu   = new PowerUp(pos, type);
    this.scene.add(pu.mesh);
    this._pups.push(pu);
  }

  update(dt) {
    for (let i = this._pups.length - 1; i >= 0; i--) {
      if (!this._pups[i].update(dt)) {
        this._pups[i].dispose(this.scene);
        this._pups.splice(i, 1);
      }
    }
  }

  collect(pu) {
    const idx = this._pups.indexOf(pu);
    if (idx !== -1) {
      this._pups[idx].dispose(this.scene);
      this._pups.splice(idx, 1);
    }
  }

  getActive() { return this._pups; }

  clear() {
    this._pups.forEach(p => p.dispose(this.scene));
    this._pups = [];
  }
}
