import * as THREE from 'three';

const METAL_DARK = () => new THREE.MeshStandardMaterial({
  color: 0x12121e, metalness: 0.9, roughness: 0.35,
});
const METAL_MID = () => new THREE.MeshStandardMaterial({
  color: 0x1e1e30, metalness: 0.85, roughness: 0.45,
});
const PANEL_MAT = () => new THREE.MeshStandardMaterial({
  color: 0x0a0a18, metalness: 0.6, roughness: 0.7,
});

export class Cockpit {
  constructor(scene, camera) {
    this.scene  = scene;
    this.camera = camera;
    this.group  = new THREE.Group();
    scene.add(this.group);

    this.powerupSlots  = [];
    this._damageTimer  = 0;
    this._damageFlash  = null;

    this._buildFrame();
    this._buildSideWalls();
    this._buildPanels();
    this._buildDashboard();
    this._buildReticle();
    this._buildHUDCanvas();
    this._buildDamageFlash();
  }

  // ─── Frame ─────────────────────────────────────────────────────────────────
  _buildFrame() {
    const mat = METAL_DARK();
    const fz  = -1.4;   // frame z distance from camera
    const fw  = 2.2;    // half-width
    const fh  = 1.45;   // half-height
    const bt  = 0.14;   // bar thickness

    // Top bar
    this._add(new THREE.BoxGeometry(fw * 2 + bt * 2, bt, 0.18), mat,
              0,  fh, fz);
    // Bottom bar
    this._add(new THREE.BoxGeometry(fw * 2 + bt * 2, bt, 0.18), mat,
              0, -fh, fz);
    // Left bar
    this._add(new THREE.BoxGeometry(bt, fh * 2, 0.18), mat,
             -fw,  0, fz);
    // Right bar
    this._add(new THREE.BoxGeometry(bt, fh * 2, 0.18), mat,
              fw,  0, fz);

    // Corner reinforcement blocks
    const cMat = METAL_DARK();
    const corners = [[-fw, fh], [fw, fh], [-fw, -fh], [fw, -fh]];
    corners.forEach(([x, y]) => {
      this._add(new THREE.BoxGeometry(bt * 1.8, bt * 1.8, 0.22), cMat, x, y, fz);
    });

    // Canopy arches (3 struts along top, going back)
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x0e0e1a, metalness: 0.95, roughness: 0.2,
    });
    [-fw * 0.55, 0, fw * 0.55].forEach(x => {
      this._add(new THREE.BoxGeometry(0.07, 0.07, 1.6), archMat, x, fh + 0.04, fz - 0.7);
    });

    // Floor sill (thick base)
    this._add(new THREE.BoxGeometry(fw * 2 + 0.4, 0.12, 1.2), METAL_MID(),
              0, -fh - 0.06, fz - 0.5);
  }

  _buildSideWalls() {
    const mat = METAL_MID();
    // Left wall slab
    const lw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 1.8), mat);
    lw.position.set(-2.38, 0, -1.3);
    this.group.add(lw);
    // Right wall slab
    const rw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.5, 1.8), mat);
    rw.position.set(2.38, 0, -1.3);
    this.group.add(rw);
    // Ceiling slab
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.1, 1.8), mat);
    ceil.position.set(0, 1.55, -1.3);
    this.group.add(ceil);
  }

  // ─── Side panels ───────────────────────────────────────────────────────────
  _buildPanels() {
    // Left instrument panel
    const lp = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.07), PANEL_MAT());
    lp.position.set(-1.85, -0.1, -0.95);
    lp.rotation.y = 0.42;
    this.group.add(lp);
    this._addInstruments(-1.85, -0.1, -0.95,  1, lp.rotation.y);

    // Right instrument panel
    const rp = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.07), PANEL_MAT());
    rp.position.set(1.85, -0.1, -0.95);
    rp.rotation.y = -0.42;
    this.group.add(rp);
    this._addInstruments(1.85, -0.1, -0.95, -1, rp.rotation.y);
  }

  _addInstruments(px, py, pz, side, rotY) {
    const colors = [0x00ff55, 0x00aaff, 0xff6600, 0xff0055, 0xffee00];
    // Indicator lights
    for (let i = 0; i < 5; i++) {
      const lm = new THREE.MeshStandardMaterial({
        color: colors[i], emissive: colors[i], emissiveIntensity: 1.8,
      });
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), lm);
      const col = i % 2 === 0 ? -0.12 : 0.12;
      const row = Math.floor(i / 2);
      light.position.set(px + side * (0.18 + col * 0.3), py + 0.38 - row * 0.2, pz + 0.07);
      this.group.add(light);

      // Point light from each indicator
      const pl = new THREE.PointLight(colors[i], 0.6, 1.5);
      pl.position.copy(light.position);
      this.group.add(pl);
    }

    // Gauge rings
    const gaugeMat = new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8 });
    for (let i = 0; i < 3; i++) {
      const gauge = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 20), gaugeMat);
      gauge.position.set(px + side * 0.15, py - 0.05 - i * 0.22, pz + 0.06);
      gauge.rotation.y = rotY;
      this.group.add(gauge);

      // Needle
      const needleMat = new THREE.MeshStandardMaterial({
        color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.8,
      });
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.05, 0.005), needleMat);
      needle.position.set(px + side * 0.15, py - 0.03 - i * 0.22, pz + 0.07);
      needle.rotation.y = rotY;
      needle.rotation.z = (Math.random() - 0.5) * 1.4;
      this.group.add(needle);
    }
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  _buildDashboard() {
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d1e, metalness: 0.75, roughness: 0.55,
    });

    // Main console surface
    const console_ = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.07, 1.0), dashMat);
    console_.position.set(0, -1.1, -1.05);
    console_.rotation.x = -0.28;
    this.group.add(console_);

    // Front console wall
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.07), METAL_DARK());
    wall.position.set(0, -1.4, -0.58);
    this.group.add(wall);

    // Power-up indicator slots
    const slotDefs = [
      { type: 'DUAL',    color: 0x00ff88, label: 'DUAL' },
      { type: 'RAPID',   color: 0x00aaff, label: 'RPID' },
      { type: 'SPREAD',  color: 0xff8800, label: 'SPRD' },
      { type: 'MISSILE', color: 0xff00cc, label: 'MSLE' },
      { type: 'SHIELD',  color: 0xffff00, label: 'SHLD' },
    ];

    slotDefs.forEach((def, i) => {
      const x = (i - 2) * 0.58;
      this._buildPowerUpSlot(x, def);
    });

    // Shield bar (left side)
    this._buildShieldBar();

    // Score display (right side)
    this._buildScoreDisplay();
  }

  _buildPowerUpSlot(x, def) {
    // Slot backing
    const slotBg = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.16, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x080812, metalness: 0.6, roughness: 0.8 }),
    );
    slotBg.position.set(x, -1.06, -0.82);
    slotBg.rotation.x = -0.28;
    this.group.add(slotBg);

    // Active glow indicator
    const indMat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.color, emissiveIntensity: 0.0, transparent: true, opacity: 0.9,
    });
    const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.02), indMat);
    indicator.position.set(x, -1.04, -0.79);
    indicator.rotation.x = -0.28;
    this.group.add(indicator);

    // Timer bar (below slot, scales down as timer runs out)
    const barMat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.color, emissiveIntensity: 0.0,
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.02), barMat);
    bar.position.set(x, -1.12, -0.80);
    bar.rotation.x = -0.28;
    this.group.add(bar);

    // Label canvas
    const lc = document.createElement('canvas');
    lc.width  = 128;
    lc.height = 32;
    const lctx = lc.getContext('2d');
    lctx.fillStyle = '#000010';
    lctx.fillRect(0, 0, 128, 32);
    lctx.fillStyle = '#' + def.color.toString(16).padStart(6, '0');
    lctx.font = 'bold 18px monospace';
    lctx.textAlign = 'center';
    lctx.fillText(def.label, 64, 23);
    const lt = new THREE.CanvasTexture(lc);
    const lp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.09),
      new THREE.MeshBasicMaterial({ map: lt, transparent: true }),
    );
    lp.position.set(x, -1.04, -0.785);
    lp.rotation.x = -0.28;
    this.group.add(lp);

    this.powerupSlots.push({
      type: def.type, color: def.color,
      indicator, bar,
      activeTimer: 0, activeDuration: 1,
      barOriginalX: bar.position.x,
    });
  }

  _buildShieldBar() {
    // Background track
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.7 });
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.04), trackMat);
    track.position.set(-1.35, -0.78, -1.25);
    this.group.add(track);

    // Fill bar
    this.shieldBarMat = new THREE.MeshStandardMaterial({
      color: 0x00ff44, emissive: 0x00ff44, emissiveIntensity: 1.2,
    });
    this.shieldBar = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.52, 0.03), this.shieldBarMat);
    this.shieldBar.position.set(-1.35, -0.78, -1.23);
    this.group.add(this.shieldBar);
    this._shieldBarBase = this.shieldBar.position.y;

    // SHIELD label
    this._addSmallLabel('SHLD', -1.35, -1.07, -1.2, 0x00ff44);
  }

  _buildScoreDisplay() {
    this.scoreCanvas = document.createElement('canvas');
    this.scoreCanvas.width  = 256;
    this.scoreCanvas.height = 80;
    this.scoreCtx    = this.scoreCanvas.getContext('2d');
    this.scoreTexture = new THREE.CanvasTexture(this.scoreCanvas);

    const mat = new THREE.MeshBasicMaterial({ map: this.scoreTexture, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.235), mat);
    plane.position.set(1.3, -0.78, -1.28);
    plane.rotation.y = -0.08;
    this.group.add(plane);

    this._updateScoreCanvas(0, 0);
  }

  _addSmallLabel(text, x, y, z, color) {
    const c = document.createElement('canvas');
    c.width  = 80; c.height = 20;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 80, 20);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(text, 40, 14);
    const t   = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true });
    const p   = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), mat);
    p.position.set(x, y, z);
    this.group.add(p);
  }

  _updateScoreCanvas(score, wave) {
    const ctx = this.scoreCtx;
    ctx.fillStyle = '#000811';
    ctx.fillRect(0, 0, 256, 80);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`SCORE`, 10, 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(String(score).padStart(8, '0'), 10, 48);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`WAVE  ${wave}`, 10, 70);

    this.scoreTexture.needsUpdate = true;
  }

  // ─── Reticle ───────────────────────────────────────────────────────────────
  _buildReticle() {
    this.reticleGroup = new THREE.Group();
    this.scene.add(this.reticleGroup);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa, transparent: true, opacity: 0.75, depthWrite: false,
    });

    // Outer ring
    this.reticleGroup.add(
      Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.004, 8, 32), mat),
                    { renderOrder: 10 })
    );

    // Gap ring (slightly different scale for targeting feel)
    const gap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.003, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.4, depthWrite: false }));
    gap.renderOrder = 10;
    this.reticleGroup.add(gap);

    // Cross-hair lines (short tick marks)
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.7, depthWrite: false });
    const ticks = [
      { pos: [0.18, 0, 0], rot: [0, 0, Math.PI / 2], size: [0.003, 0.06] },
      { pos: [-0.18, 0, 0], rot: [0, 0, Math.PI / 2], size: [0.003, 0.06] },
      { pos: [0, 0.18, 0], rot: [0, 0, 0], size: [0.003, 0.06] },
      { pos: [0, -0.18, 0], rot: [0, 0, 0], size: [0.003, 0.06] },
    ];
    ticks.forEach(t => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(...t.size), tickMat);
      m.position.set(...t.pos);
      m.rotation.set(...t.rot);
      m.renderOrder = 10;
      this.reticleGroup.add(m);
    });

    // Center dot
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.01, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9, depthWrite: false }));
    dot.renderOrder = 10;
    this.reticleGroup.add(dot);
  }

  // ─── HUD Overlay (wave / game over) ────────────────────────────────────────
  _buildHUDCanvas() {
    this.hudCanvas  = document.createElement('canvas');
    this.hudCanvas.width  = 512;
    this.hudCanvas.height = 128;
    this.hudCtx     = this.hudCanvas.getContext('2d');
    this.hudTexture = new THREE.CanvasTexture(this.hudCanvas);

    const mat = new THREE.MeshBasicMaterial({
      map: this.hudTexture, transparent: true, depthWrite: false,
    });
    this.hudPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), mat);
    this.hudPlane.position.set(0, 0.65, -2.2);
    this.hudPlane.renderOrder = 5;
    this.hudPlane.visible = false;
    this.scene.add(this.hudPlane);

    this._hudTimer = 0;
  }

  _buildDamageFlash() {
    // Red screen flash on damage
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff0000, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    });
    this._damageFlash = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat);
    this._damageFlash.renderOrder = 20;
    this.scene.add(this._damageFlash);
  }

  // ─── Public API ────────────────────────────────────────────────────────────
  updateScore(score, wave) {
    this._updateScoreCanvas(score, wave);
  }

  updateShield(ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    this.shieldBar.scale.y = Math.max(0.001, r);
    const offset = (1 - r) * 0.26;
    this.shieldBar.position.y = this._shieldBarBase - offset;

    const col = r > 0.5
      ? new THREE.Color(0x00ff44)
      : r > 0.25
        ? new THREE.Color(0xffaa00)
        : new THREE.Color(0xff2200);
    this.shieldBarMat.color.copy(col);
    this.shieldBarMat.emissive.copy(col);
  }

  showPowerup(type, duration) {
    const slot = this.powerupSlots.find(s => s.type === type);
    if (!slot) return;
    slot.activeTimer    = duration;
    slot.activeDuration = duration;
    slot.indicator.material.emissiveIntensity = 2.0;
    slot.bar.material.emissiveIntensity = 1.5;
    slot.bar.scale.x = 1.0;
  }

  clearPowerup(type) {
    const slot = this.powerupSlots.find(s => s.type === type);
    if (!slot) return;
    slot.activeTimer = 0;
    slot.indicator.material.emissiveIntensity = 0.0;
    slot.bar.material.emissiveIntensity = 0.0;
    slot.bar.scale.x = 1.0;
  }

  showWaveAnnouncement(wave) {
    const ctx = this.hudCtx;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(0,5,20,0.85)';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE  ${wave}`, 256, 70);

    ctx.fillStyle = 'rgba(0,255,200,0.5)';
    ctx.font = '20px monospace';
    ctx.fillText('INCOMING', 256, 105);

    this.hudTexture.needsUpdate = true;
    this.hudPlane.visible = true;
    this._hudTimer = 3.0;
  }

  showGameOver(score) {
    const ctx = this.hudCtx;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#ff2200';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME  OVER', 256, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    ctx.fillText(`FINAL SCORE: ${score}`, 256, 95);

    ctx.fillStyle = '#888888';
    ctx.font = '13px monospace';
    ctx.fillText('Press ENTER to restart', 256, 118);

    this.hudTexture.needsUpdate = true;
    this.hudPlane.visible = true;
    this._hudTimer = -1; // stays visible
  }

  flashDamage() {
    this._damageTimer = 0.35;
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  update(dt, camera) {
    // Reticle follows camera look direction
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.multiplyScalar(6).add(camera.position);
    this.reticleGroup.position.copy(fwd);
    this.reticleGroup.lookAt(camera.position);

    // HUD plane always faces camera
    if (this.hudPlane.visible) {
      this.hudPlane.lookAt(camera.position);
    }

    // Wave/HUD timer
    if (this._hudTimer > 0) {
      this._hudTimer -= dt;
      if (this._hudTimer <= 0) {
        this.hudPlane.visible = false;
        this._hudTimer = 0;
      }
    }

    // Power-up slot timers
    for (const slot of this.powerupSlots) {
      if (slot.activeTimer > 0) {
        slot.activeTimer -= dt;
        const ratio = slot.activeTimer / slot.activeDuration;
        slot.bar.scale.x = Math.max(0.001, ratio);
        if (slot.activeTimer <= 0) this.clearPowerup(slot.type);
      }
    }

    // Damage flash
    if (this._damageTimer > 0) {
      this._damageTimer -= dt;
      const alpha = (this._damageTimer / 0.35) * 0.45;
      this._damageFlash.material.opacity = Math.max(0, alpha);
      this._damageFlash.position.copy(camera.position);
      this._damageFlash.position.z -= 0.5;
      this._damageFlash.lookAt(camera.position);
    } else {
      this._damageFlash.material.opacity = 0;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  _add(geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }
}
