/**
 * gameLogic.js — Pure game logic: constants, scaling functions, and math.
 *
 * Framework-free and side-effect-free so every function here can be unit-tested
 * in Node.js without mocking Three.js or a browser environment.
 */

// ─── Weapons ─────────────────────────────────────────────────────────────────

export const FIRE_RATES = {
  SINGLE:  0.25,
  DUAL:    0.22,
  RAPID:   0.10,
  SPREAD:  0.28,
  MISSILE: 0.60,
};

export const BULLET_DAMAGE = {
  SINGLE:  1,
  DUAL:    1,
  RAPID:   1,
  SPREAD:  1,
  MISSILE: 3,
};

export const BULLET_COLORS = {
  SINGLE:  0x00ff88,
  DUAL:    0x00ffcc,
  RAPID:   0xffff00,
  SPREAD:  0xff8800,
  MISSILE: 0xff00cc,
};

// ─── Power-ups ────────────────────────────────────────────────────────────────

export const POWERUP_DURATION = {
  DUAL:    15,
  RAPID:   12,
  SPREAD:  12,
  MISSILE: 10,
  SHIELD:  0,   // instant — restores 1 life
};

export const POWERUP_COLORS = {
  DUAL:    0x00ff88,
  RAPID:   0x00aaff,
  SPREAD:  0xff8800,
  MISSILE: 0xff00cc,
  SHIELD:  0xffff00,
};

export const POWERUP_LABELS = {
  DUAL:    'DUAL',
  RAPID:   'RPID',
  SPREAD:  'SPRD',
  MISSILE: 'MSLE',
  SHIELD:  'SHLD',
};

// ─── Enemy scoring ────────────────────────────────────────────────────────────

/** Points for each Galaxian rank (index 0 = weakest, 4 = strongest). */
export const GALAXIAN_POINTS = [50, 100, 150, 200, 300];

/** Points for each Asteroid size. Smaller = harder to hit = more points. */
export const ASTEROID_POINTS = {
  large:  20,
  medium: 50,
  small:  100,
};

export const GALAXIAN_COLORS = [0x00ffcc, 0x44aaff, 0xaa44ff, 0xff8800, 0xff2200];

export const ASTEROID_COLORS = [0x887766, 0x998877, 0x776655, 0x665544];

// ─── Wave scaling ─────────────────────────────────────────────────────────────

/**
 * Number of Galaxian enemies in a given wave.
 * Starts at 9 on wave 1, increases by 3 per wave, capped at 32.
 */
export function waveGalaxianCount(wave) {
  return Math.min(6 + wave * 3, 32);
}

/**
 * Number of large asteroids in a given wave.
 * None on wave 1; starts at 1 on wave 2, capped at 5.
 */
export function waveAsteroidCount(wave) {
  if (wave < 2) return 0;
  return Math.min(1 + Math.floor(wave / 2), 5);
}

/**
 * Number of extra medium asteroids in a given wave (appears from wave 4+).
 */
export function waveMediumAsteroidCount(wave) {
  return Math.max(0, wave - 3);
}

/**
 * Cooldown in seconds between Galaxian dive-bomb attacks.
 * Decreases each wave (harder), floored at 1.2 s.
 */
export function waveDiveCooldown(wave) {
  return Math.max(1.2, 3.5 - wave * 0.25);
}

/**
 * Speed at which the Galaxian formation advances toward the player (units/sec).
 */
export function waveAdvanceSpeed(wave) {
  return 2.5 + wave * 0.4;
}

// ─── Collision detection ──────────────────────────────────────────────────────

/**
 * Returns true when two spheres overlap.
 * Uses strict less-than so touching (dist === ra+rb) is not a collision.
 */
export function sphereOverlap(ax, ay, az, bx, by, bz, ra, rb) {
  const dx   = ax - bx;
  const dy   = ay - by;
  const dz   = az - bz;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return dist < ra + rb;
}

/** Squared distance between two 3-D points (cheaper than full distance). */
export function distanceSq(ax, ay, az, bx, by, bz) {
  return (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Cap a frame delta-time to avoid physics explosions on tab-switch etc. */
export function capDelta(dt, max = 0.05) {
  return Math.min(dt, max);
}

/** Clamp an angle to ±limit radians (used for mouse-look clamping). */
export function clampAngle(angle, limit) {
  return Math.max(-limit, Math.min(limit, angle));
}

/**
 * Linearly interpolate between a and b.
 * t=0 → a, t=1 → b.
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Evaluate a quadratic Bézier at parameter t.
 * p0, p1, p2 are scalar values (call once per axis).
 */
export function bezier3(p0, p1, p2, t) {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}
