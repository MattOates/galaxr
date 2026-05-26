import { describe, it, expect } from 'vitest';
import {
  // Weapons
  FIRE_RATES,
  BULLET_DAMAGE,
  BULLET_COLORS,
  // Power-ups
  POWERUP_DURATION,
  POWERUP_COLORS,
  // Enemies
  GALAXIAN_POINTS,
  ASTEROID_POINTS,
  GALAXIAN_COLORS,
  // Wave scaling
  waveGalaxianCount,
  waveAsteroidCount,
  waveMediumAsteroidCount,
  waveDiveCooldown,
  waveAdvanceSpeed,
  // Math
  sphereOverlap,
  distanceSq,
  capDelta,
  clampAngle,
  lerp,
  bezier3,
} from '../src/gameLogic.js';

// ─── Weapons ──────────────────────────────────────────────────────────────────

describe('FIRE_RATES', () => {
  it('all modes have positive fire rates', () => {
    for (const [mode, rate] of Object.entries(FIRE_RATES)) {
      expect(rate, `${mode} fire rate`).toBeGreaterThan(0);
    }
  });

  it('RAPID is the fastest (smallest cooldown)', () => {
    const min = Math.min(...Object.values(FIRE_RATES));
    expect(FIRE_RATES.RAPID).toBe(min);
  });

  it('MISSILE is the slowest (largest cooldown)', () => {
    const max = Math.max(...Object.values(FIRE_RATES));
    expect(FIRE_RATES.MISSILE).toBe(max);
  });

  it('SINGLE fires ~4 shots per second', () => {
    expect(1 / FIRE_RATES.SINGLE).toBeCloseTo(4, 0);
  });

  it('RAPID fires at least 8 shots per second', () => {
    expect(1 / FIRE_RATES.RAPID).toBeGreaterThanOrEqual(8);
  });
});

describe('BULLET_DAMAGE', () => {
  it('MISSILE deals the most damage', () => {
    const max = Math.max(...Object.values(BULLET_DAMAGE));
    expect(BULLET_DAMAGE.MISSILE).toBe(max);
  });

  it('MISSILE does 3× standard damage', () => {
    expect(BULLET_DAMAGE.MISSILE).toBe(3);
    expect(BULLET_DAMAGE.SINGLE).toBe(1);
  });

  it('standard weapons all deal 1 damage', () => {
    ['SINGLE', 'DUAL', 'RAPID', 'SPREAD'].forEach(w => {
      expect(BULLET_DAMAGE[w], `${w} damage`).toBe(1);
    });
  });
});

describe('BULLET_COLORS', () => {
  it('every weapon mode has a defined colour', () => {
    const modes = ['SINGLE', 'DUAL', 'RAPID', 'SPREAD', 'MISSILE'];
    modes.forEach(m => {
      expect(BULLET_COLORS[m], `${m} colour`).toBeDefined();
      expect(typeof BULLET_COLORS[m]).toBe('number');
    });
  });

  it('all colours are valid 24-bit RGB values', () => {
    for (const colour of Object.values(BULLET_COLORS)) {
      expect(colour).toBeGreaterThanOrEqual(0);
      expect(colour).toBeLessThanOrEqual(0xffffff);
    }
  });
});

// ─── Power-ups ────────────────────────────────────────────────────────────────

describe('POWERUP_DURATION', () => {
  it('SHIELD has zero duration (instant effect, no timer)', () => {
    expect(POWERUP_DURATION.SHIELD).toBe(0);
  });

  it('DUAL has the longest active duration', () => {
    const weaponTypes = ['DUAL', 'RAPID', 'SPREAD', 'MISSILE'];
    const max = Math.max(...weaponTypes.map(t => POWERUP_DURATION[t]));
    expect(POWERUP_DURATION.DUAL).toBe(max);
  });

  it('all weapon power-ups have a positive duration', () => {
    ['DUAL', 'RAPID', 'SPREAD', 'MISSILE'].forEach(t => {
      expect(POWERUP_DURATION[t], `${t} duration`).toBeGreaterThan(0);
    });
  });

  it('durations are at least 10 seconds for balance', () => {
    ['DUAL', 'RAPID', 'SPREAD', 'MISSILE'].forEach(t => {
      expect(POWERUP_DURATION[t]).toBeGreaterThanOrEqual(10);
    });
  });
});

describe('POWERUP_COLORS', () => {
  it('every power-up type has a colour', () => {
    ['DUAL', 'RAPID', 'SPREAD', 'MISSILE', 'SHIELD'].forEach(t => {
      expect(POWERUP_COLORS[t]).toBeDefined();
    });
  });

  it('SHIELD colour is distinct from all weapon colours', () => {
    const weaponColours = ['DUAL', 'RAPID', 'SPREAD', 'MISSILE'].map(t => POWERUP_COLORS[t]);
    expect(weaponColours).not.toContain(POWERUP_COLORS.SHIELD);
  });
});

// ─── Enemy scoring ────────────────────────────────────────────────────────────

describe('GALAXIAN_POINTS', () => {
  it('higher ranks are worth more points', () => {
    for (let i = 1; i < GALAXIAN_POINTS.length; i++) {
      expect(GALAXIAN_POINTS[i]).toBeGreaterThan(GALAXIAN_POINTS[i - 1]);
    }
  });

  it('weakest enemy (rank 0) is worth 50 points', () => {
    expect(GALAXIAN_POINTS[0]).toBe(50);
  });

  it('strongest enemy is worth at least 5× the weakest', () => {
    const ratio = GALAXIAN_POINTS[GALAXIAN_POINTS.length - 1] / GALAXIAN_POINTS[0];
    expect(ratio).toBeGreaterThanOrEqual(5);
  });

  it('has exactly 5 ranks matching GALAXIAN_COLORS', () => {
    expect(GALAXIAN_POINTS.length).toBe(GALAXIAN_COLORS.length);
  });
});

describe('ASTEROID_POINTS', () => {
  it('smaller asteroids score more (harder to hit)', () => {
    expect(ASTEROID_POINTS.small).toBeGreaterThan(ASTEROID_POINTS.medium);
    expect(ASTEROID_POINTS.medium).toBeGreaterThan(ASTEROID_POINTS.large);
  });

  it('small asteroids are worth 100 points', () => {
    expect(ASTEROID_POINTS.small).toBe(100);
  });

  it('all sizes have positive point values', () => {
    for (const pts of Object.values(ASTEROID_POINTS)) {
      expect(pts).toBeGreaterThan(0);
    }
  });
});

// ─── Wave scaling ─────────────────────────────────────────────────────────────

describe('waveGalaxianCount', () => {
  it('wave 1 starts with 9 Galaxians', () => {
    expect(waveGalaxianCount(1)).toBe(9);
  });

  it('count increases by 3 per wave', () => {
    expect(waveGalaxianCount(2) - waveGalaxianCount(1)).toBe(3);
    expect(waveGalaxianCount(3) - waveGalaxianCount(2)).toBe(3);
  });

  it('count is capped at 32', () => {
    expect(waveGalaxianCount(9)).toBe(32);
    expect(waveGalaxianCount(50)).toBe(32);
    expect(waveGalaxianCount(100)).toBe(32);
  });

  it('never returns a negative or zero count', () => {
    for (let w = 1; w <= 20; w++) {
      expect(waveGalaxianCount(w)).toBeGreaterThan(0);
    }
  });
});

describe('waveAsteroidCount', () => {
  it('no asteroids on wave 1', () => {
    expect(waveAsteroidCount(1)).toBe(0);
  });

  it('asteroids first appear on wave 2', () => {
    expect(waveAsteroidCount(2)).toBeGreaterThan(0);
  });

  it('count is capped at 5', () => {
    expect(waveAsteroidCount(50)).toBe(5);
    expect(waveAsteroidCount(100)).toBe(5);
  });

  it('count increases across early waves', () => {
    expect(waveAsteroidCount(4)).toBeGreaterThan(waveAsteroidCount(2));
  });

  it('never exceeds cap', () => {
    for (let w = 1; w <= 30; w++) {
      expect(waveAsteroidCount(w)).toBeLessThanOrEqual(5);
    }
  });
});

describe('waveMediumAsteroidCount', () => {
  it('no medium asteroids on waves 1–3', () => {
    expect(waveMediumAsteroidCount(1)).toBe(0);
    expect(waveMediumAsteroidCount(2)).toBe(0);
    expect(waveMediumAsteroidCount(3)).toBe(0);
  });

  it('medium asteroids appear from wave 4', () => {
    expect(waveMediumAsteroidCount(4)).toBeGreaterThan(0);
  });

  it('count grows linearly with wave', () => {
    for (let w = 4; w < 10; w++) {
      expect(waveMediumAsteroidCount(w + 1)).toBe(waveMediumAsteroidCount(w) + 1);
    }
  });
});

describe('waveDiveCooldown', () => {
  it('cooldown decreases each wave (gets harder)', () => {
    for (let w = 1; w < 10; w++) {
      expect(waveDiveCooldown(w + 1)).toBeLessThanOrEqual(waveDiveCooldown(w));
    }
  });

  it('cooldown never drops below the 1.2 s floor', () => {
    for (let w = 1; w <= 50; w++) {
      expect(waveDiveCooldown(w)).toBeGreaterThanOrEqual(1.2);
    }
  });

  it('early waves have a cooldown above 2 s', () => {
    expect(waveDiveCooldown(1)).toBeGreaterThan(2);
  });
});

describe('waveAdvanceSpeed', () => {
  it('formation moves faster each wave', () => {
    for (let w = 1; w < 10; w++) {
      expect(waveAdvanceSpeed(w + 1)).toBeGreaterThan(waveAdvanceSpeed(w));
    }
  });

  it('speed is always positive', () => {
    for (let w = 1; w <= 20; w++) {
      expect(waveAdvanceSpeed(w)).toBeGreaterThan(0);
    }
  });

  it('wave 1 speed is 2.9 units/sec', () => {
    expect(waveAdvanceSpeed(1)).toBeCloseTo(2.9);
  });
});

// ─── Collision detection ──────────────────────────────────────────────────────

describe('sphereOverlap', () => {
  it('detects overlap when spheres clearly intersect', () => {
    expect(sphereOverlap(0, 0, 0,  1, 0, 0,  1, 1)).toBe(true);
  });

  it('returns false when spheres are clearly apart', () => {
    expect(sphereOverlap(0, 0, 0,  10, 0, 0,  1, 1)).toBe(false);
  });

  it('touching spheres (dist === ra+rb) are NOT overlapping (strict <)', () => {
    expect(sphereOverlap(0, 0, 0,  2, 0, 0,  1, 1)).toBe(false);
  });

  it('one sphere inside another counts as overlap', () => {
    expect(sphereOverlap(0, 0, 0,  0.1, 0, 0,  5, 0.5)).toBe(true);
  });

  it('works correctly in all three axes', () => {
    expect(sphereOverlap(0, 0, 0,  0, 1.5, 0,  1, 1)).toBe(true);   // y-axis
    expect(sphereOverlap(0, 0, 0,  0, 0,   1.5, 1, 1)).toBe(true);   // z-axis
    expect(sphereOverlap(0, 0, 0,  0, 3,   0,   1, 1)).toBe(false);  // y-axis far
  });

  it('works with arbitrary radii', () => {
    expect(sphereOverlap(0, 0, 0,  3, 0, 0,  2, 2)).toBe(true);  // dist=3, sum=4 → YES
    expect(sphereOverlap(0, 0, 0,  5, 0, 0,  2, 2)).toBe(false); // dist=5, sum=4 → NO
    expect(sphereOverlap(0, 0, 0,  3, 0, 0,  1.4, 1.4)).toBe(false); // dist=3, sum=2.8 → NO
  });
});

describe('distanceSq', () => {
  it('returns 0 for identical points', () => {
    expect(distanceSq(1, 2, 3,  1, 2, 3)).toBe(0);
  });

  it('3-4-5 right triangle gives squared hypotenuse 25', () => {
    expect(distanceSq(0, 0, 0,  3, 4, 0)).toBeCloseTo(25);
  });

  it('is symmetric', () => {
    expect(distanceSq(1, 2, 3,  4, 5, 6))
      .toBeCloseTo(distanceSq(4, 5, 6,  1, 2, 3));
  });

  it('is always non-negative', () => {
    expect(distanceSq(-5, 3, -1,  2, -4, 7)).toBeGreaterThanOrEqual(0);
  });
});

// ─── Utilities ────────────────────────────────────────────────────────────────

describe('capDelta', () => {
  it('passes through small timesteps unchanged', () => {
    expect(capDelta(0.016)).toBeCloseTo(0.016);
    expect(capDelta(0.033)).toBeCloseTo(0.033);
  });

  it('caps large spikes at the default 50 ms', () => {
    expect(capDelta(0.5)).toBe(0.05);
    expect(capDelta(1.0)).toBe(0.05);
    expect(capDelta(0.1)).toBe(0.05);
  });

  it('respects a custom max', () => {
    expect(capDelta(0.1, 0.1)).toBeCloseTo(0.1);
    expect(capDelta(0.2, 0.1)).toBeCloseTo(0.1);
  });

  it('always returns a positive value', () => {
    expect(capDelta(0.001)).toBeGreaterThan(0);
  });
});

describe('clampAngle', () => {
  const limit = Math.PI / 4;

  it('clamps angles above the limit', () => {
    expect(clampAngle(Math.PI, limit)).toBeCloseTo(limit);
  });

  it('clamps angles below the negative limit', () => {
    expect(clampAngle(-Math.PI, limit)).toBeCloseTo(-limit);
  });

  it('passes through angles within the limit', () => {
    expect(clampAngle(0.5, limit)).toBeCloseTo(0.5);
    expect(clampAngle(-0.5, limit)).toBeCloseTo(-0.5);
  });

  it('returns exactly the limit when angle equals limit', () => {
    expect(clampAngle(limit, limit)).toBeCloseTo(limit);
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('extrapolates outside [0,1] with no clamping', () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });
});

describe('bezier3', () => {
  it('returns p0 at t=0', () => {
    expect(bezier3(0, 50, 100, 0)).toBe(0);
  });

  it('returns p2 at t=1', () => {
    expect(bezier3(0, 50, 100, 1)).toBe(100);
  });

  it('passes through the control point blend at t=0.5', () => {
    // For a straight line (p0=0, p1=50, p2=100), midpoint should be 50
    expect(bezier3(0, 50, 100, 0.5)).toBe(50);
  });

  it('produces a curve when control point is off the line', () => {
    // p0=0, p1=100 (off-axis), p2=0 — should peak at t=0.5
    const mid = bezier3(0, 100, 0, 0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeGreaterThan(bezier3(0, 100, 0, 0.25));
  });

  it('is continuous — value at t=0.5 is between p0 and p2 for monotone curves', () => {
    const mid = bezier3(10, 55, 100, 0.5);
    expect(mid).toBeGreaterThan(10);
    expect(mid).toBeLessThan(100);
  });
});
