import * as THREE from 'three';

export class Starfield {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildStars(3500, 0xffffff, 0.9, 0.012); // main white stars
    this._buildStars(800,  0xaaddff, 0.6, 0.018);  // blue-tinted stars
    this._buildStars(400,  0xffeecc, 0.5, 0.022);  // warm stars
    this._buildDustClouds();
  }

  _buildStars(count, color, opacity, size) {
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on sphere shell
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 180 + Math.random() * 80;

      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = (0.6 + Math.random() * 0.8) * size * 80;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    this.group.add(new THREE.Points(geo, mat));
  }

  _buildDustClouds() {
    // Faint nebula-like colour patches using large transparent planes
    const nebulaDefs = [
      { color: 0x220044, pos: [60, 20, -120],  scale: [80, 50] },
      { color: 0x002233, pos: [-80, -30, -100], scale: [70, 40] },
      { color: 0x330022, pos: [20, -60, -130],  scale: [60, 60] },
    ];

    nebulaDefs.forEach(def => {
      const mat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...def.scale), mat);
      mesh.position.set(...def.pos);
      mesh.lookAt(0, 0, 0);
      mesh.renderOrder = -1;
      this.group.add(mesh);
    });
  }

  update(dt) {
    // Very slow rotation for parallax feel
    this.group.rotation.y += dt * 0.003;
    this.group.rotation.x += dt * 0.001;
  }
}
