<div align="center">

```
 ██████╗  █████╗ ██╗      █████╗ ██╗  ██╗██████╗
██╔════╝ ██╔══██╗██║     ██╔══██╗╚██╗██╔╝██╔══██╗
██║  ███╗███████║██║     ███████║ ╚███╔╝ ██████╔╝
██║   ██║██╔══██║██║     ██╔══██║ ██╔██╗ ██╔══██╗
╚██████╔╝██║  ██║███████╗██║  ██║██╔╝ ██╗██║  ██║
 ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
```

**A WebXR space combat shooter — play in VR or desktop**

[![Three.js](https://img.shields.io/badge/Three.js-v0.184-black?logo=three.js&logoColor=white)](https://threejs.org)
[![WebXR](https://img.shields.io/badge/WebXR-Ready-blueviolet?logo=webxr)](https://immersiveweb.dev)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![No Assets](https://img.shields.io/badge/Zero%20Assets-100%25%20Procedural-00ffcc)](#)

</div>

---

You are locked inside the helm of a deep-space fighter. Galaxian-style enemy formations bear down on you in curved dive attacks while tumbling asteroid fields close in from every angle. Your only view of the battle is through the cockpit windshield — instruments glowing at your sides, targeting reticle floating ahead, and power-up slots on the dashboard lighting up as you collect upgrades mid-fight.

No assets. No textures. Every pixel is generated in code.

---

## Features

- **Immersive 3D cockpit** — riveted frame, angled instrument panels with working gauges and indicator lights, a central targeting reticle, shield bar, score display, and five power-up slots on the dashboard
- **Galaxian enemies** — form a colour-coded grid formation that slowly advances, individual ships peel off in bezier-curve dive-bomb runs and fire back at you
- **Asteroid enemies** — irregular, flat-shaded, tumbling polyhedra; large ones split into medium, medium split into small
- **Wave escalation** — each wave adds more enemies, tighter dive cooldowns, and faster formations; asteroids appear from wave 2 onward
- **5 weapon modes** — Single, Dual, Rapid Fire, Spread Shot, and Homing Missiles
- **Power-ups mid-battle** — enemies drop glowing, rotating orbs; fly through them to collect; the active upgrade lights up on the cockpit dashboard with a live countdown bar
- **Synthesised audio** — every sound effect is generated with the Web Audio API, no files required
- **Particle system** — additive-blended explosion bursts, spark hits, power-up collect effects, and a damage screen flash
- **Procedural starfield** — 4 000+ stars across layered point clouds with faint nebula colour washes and slow parallax rotation
- **WebXR + desktop** — full VR support with gaze aiming; desktop falls back to pointer-lock mouse look

---

## Controls

### Desktop

| Action | Input |
|--------|-------|
| Start game | Click **CLICK TO START**, then accept pointer lock |
| Aim | Mouse movement |
| Fire | Hold **Left Click** or hold **Space** |
| Restart after game over | **Enter** |
| Release cursor | **Escape** |

### VR (WebXR)

| Action | Input |
|--------|-------|
| Enter VR | **ENTER VR** button |
| Aim | Head / gaze direction |
| Fire | Either controller **Trigger** |

---

## Weapons & Power-Ups

Power-ups drop from destroyed enemies (~12% chance). Fly through the glowing orb to collect. The active weapon lights up its slot on the cockpit dashboard and shows a depleting timer bar.

| Slot | Type | Effect | Duration |
|------|------|---------|----------|
| `DUAL` | Dual Laser | Twin offset beams | 15 s |
| `RPID` | Rapid Fire | 10 shots/sec single laser | 12 s |
| `SPRD` | Spread Shot | 3-way angled burst | 12 s |
| `MSLE` | Missiles | Slow homing rockets, 3× damage | 10 s |
| `SHLD` | Shield | Restores 1 life — no timer | instant |

---

## Wave Structure

| Wave | Enemies | Notes |
|------|---------|-------|
| 1 | 9 Galaxians | Formation only, slow advance |
| 2 | 12 Galaxians + 1–2 large asteroids | Dive bombing begins |
| 3 | 15 Galaxians + 2–3 asteroids | Faster dive cooldown |
| 4+ | Up to 32 Galaxians + 5 asteroids + medium asteroids | Escalating speed and aggression |

Asteroids split on destruction: **Large → 2–3 Medium → 2 Small**.

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
git clone https://github.com/yourname/galaxr.git
cd galaxr
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for production

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

### VR

Open the URL on a WebXR-capable browser connected to a headset (Meta Quest browser, Chrome with a connected headset, etc.) and press **ENTER VR**.

---

## Architecture

```
src/
├── main.js        — renderer, WebXR, pointer lock, input, game loop
├── game.js        — state machine, wave control, collision detection
├── cockpit.js     — cockpit frame, instrument panels, dashboard, HUD
├── enemies.js     — GalaxianEnemy, AsteroidEnemy, EnemyManager
├── weapons.js     — WeaponSystem, Bullet, 5 weapon modes
├── powerups.js    — PowerUp, PowerUpManager
├── particles.js   — additive particle system (explosions, sparks)
├── starfield.js   — procedural stars + nebula
└── audio.js       — Web Audio API synthesised SFX
```

Everything is vanilla ES modules — no framework, no build-time transpilation beyond Vite's bundler.

---

## Tech Stack

| | |
|--|--|
| **Renderer** | [Three.js r184](https://threejs.org) |
| **XR** | [WebXR Device API](https://immersiveweb.dev) via `three/examples/jsm/webxr/VRButton` |
| **Audio** | [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — 100% synthesised |
| **Build** | [Vite 8](https://vite.dev) |
| **Language** | JavaScript ES2022, ES modules |
| **Assets** | None — all geometry, sound, and visuals are procedural |

---

<div align="center">

Made with no game engine, no textures, and a lot of `BufferGeometry`.

</div>
