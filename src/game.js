import * as THREE from 'three';
import { Cockpit }     from './cockpit.js';
import { Starfield }   from './starfield.js';
import { EnemyManager } from './enemies.js';
import { WeaponSystem } from './weapons.js';
import { PowerUpManager } from './powerups.js';
import { ParticleSystem } from './particles.js';
import { AudioManager }  from './audio.js';

export class Game {
  constructor(scene, camera, renderer) {
    this.scene    = scene;
    this.camera   = camera;
    this.renderer = renderer;

    this.state  = 'idle';   // idle | playing | paused | wave_transition | gameover
    this.score  = 0;
    this.wave   = 0;
    this.lives  = 3;
    this.maxLives = 3;
    this._fireThrottle = 0;
    this._waveTimer    = 0;
    this._invincible   = 0; // invincibility frames after hit

    // subsystems
    this.cockpit  = new Cockpit(scene, camera);
    this.starfield = new Starfield(scene);
    this.enemies  = new EnemyManager(scene, camera);
    this.weapons  = new WeaponSystem(scene, camera);
    this.powerups = new PowerUpManager(scene, camera);
    this.particles = new ParticleSystem(scene);
    this.audio    = new AudioManager();
  }

  start() {
    if (this.state === 'playing') return;
    this.state  = 'playing';
    this.score  = 0;
    this.lives  = this.maxLives;
    this.wave   = 0;
    this.weapons.reset();
    this.enemies.clear();
    this.powerups.clear();
    this.cockpit.updateScore(0, 0);
    this.cockpit.updateShield(1.0);
    this._startNextWave();
  }

  reset() {
    this.enemies.clear();
    this.powerups.clear();
    this.weapons.reset();
    this.particles.clear();
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  fire() {
    if (this.state !== 'playing') return;
    if (this._fireThrottle > 0) return;
    const fireCooldown = this.weapons.getFireRate();
    this._fireThrottle = fireCooldown;
    this.weapons.fire(this.camera, this.audio);
  }

  _startNextWave() {
    this.wave++;
    this.state = 'wave_transition';
    this._waveTimer = 2.5;
    this.cockpit.showWaveAnnouncement(this.wave);
    this.audio.playWaveStart();
  }

  update(dt, activeCamera) {
    if (this.state === 'idle' || this.state === 'gameover') return;

    this._fireThrottle = Math.max(0, this._fireThrottle - dt);
    this._invincible   = Math.max(0, this._invincible   - dt);

    if (this.state === 'wave_transition') {
      this._waveTimer -= dt;
      if (this._waveTimer <= 0) {
        this.state = 'playing';
        this.enemies.spawnWave(this.wave);
      }
    }

    const cam = activeCamera || this.camera;

    this.starfield.update(dt);
    this.enemies.update(dt, cam);
    this.weapons.setEnemyList(this.enemies.getActive());
    this.weapons.update(dt);
    this.powerups.update(dt);
    this.particles.update(dt);
    this.cockpit.update(dt, cam);

    if (this.state === 'playing') {
      this._checkCollisions();
      if (this.enemies.isEmpty() && this.state === 'playing') {
        this._startNextWave();
      }
    }
  }

  _checkCollisions() {
    // Work on snapshots to avoid modify-while-iterate bugs
    const bullets      = [...this.weapons.getActiveBullets()];
    const enemies      = [...this.enemies.getActive()];
    const enemyBullets = [...this.enemies.getActiveBullets()];
    const pups         = [...this.powerups.getActive()];

    // Bullets vs enemies
    for (let b = bullets.length - 1; b >= 0; b--) {
      const bullet = bullets[b];
      for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        const dist = bullet.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < enemy.radius + 0.3) {
          this._onBulletHitEnemy(bullet, enemy);
          break;
        }
      }
    }

    // Enemy bullets vs player
    if (this._invincible <= 0) {
      for (let ei = enemyBullets.length - 1; ei >= 0; ei--) {
        const eb = enemyBullets[ei];
        if (eb.position.z > -0.5) {
          this._onPlayerHit(1);
          this.enemies.destroyBullet(eb);
        }
      }
    }

    // Enemies reaching player
    if (this._invincible <= 0) {
      for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        if (enemy.mesh.position.z > 1.0) {
          this._onPlayerHit(enemy.contactDamage || 1);
          this.enemies.destroyEnemy(enemy);
        }
      }
    }

    // Power-ups reaching player
    for (let p = pups.length - 1; p >= 0; p--) {
      const pu = pups[p];
      if (pu.mesh.position.z > -0.5) {
        this._collectPowerUp(pu);
      }
    }
  }

  _onBulletHitEnemy(bullet, enemy) {
    this.weapons.destroyBullet(bullet);
    enemy.health -= bullet.damage;

    if (enemy.health <= 0) {
      const ePos   = enemy.mesh.position.clone();
      const eColor = enemy.color;
      this.particles.explode(ePos, eColor, 40);
      this.audio.playExplosion();
      this.score += enemy.points;
      this.cockpit.updateScore(this.score, this.wave);

      // Chance to spawn power-up
      if (Math.random() < 0.12) {
        this.powerups.spawn(ePos.clone());
      }

      // Asteroids split
      const spawned = this.enemies.destroyEnemy(enemy);
      if (spawned) {
        this.particles.spark(ePos, 15);
      }
    } else {
      this.particles.spark(enemy.mesh.position.clone(), 8);
      this.audio.playHit();
    }
  }

  _onPlayerHit(damage) {
    this._invincible = 1.5;
    this.lives = Math.max(0, this.lives - damage);
    this.cockpit.updateShield(this.lives / this.maxLives);
    this.cockpit.flashDamage();
    this.audio.playDamage();
    this.particles.screenFlash(this.scene, this.camera);

    if (this.lives <= 0) this._gameOver();
  }

  _collectPowerUp(pu) {
    const puPos   = pu.mesh.position.clone();
    const puColor = pu.color;
    this.powerups.collect(pu);
    if (pu.type === 'SHIELD') {
      this.lives = Math.min(this.maxLives, this.lives + 1);
      this.cockpit.updateShield(this.lives / this.maxLives);
    } else {
      this.weapons.applyPowerUp(pu.type, pu.duration);
      this.cockpit.showPowerup(pu.type, pu.duration);
    }
    this.audio.playPowerUp();
    this.particles.burst(puPos, puColor, 20);
  }

  _gameOver() {
    this.state = 'gameover';
    this.cockpit.showGameOver(this.score);
    this.audio.playGameOver();
  }
}
