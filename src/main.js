import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Game } from './game.js';
import './style.css';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ─── VR Button ───────────────────────────────────────────────────────────────
const vrContainer = document.getElementById('vr-button-container');
vrContainer.appendChild(VRButton.createButton(renderer));

// ─── Scene & Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000008, 0.004);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 600);
camera.position.set(0, 0, 0);

// ─── Lighting ────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x080820, 3);
scene.add(ambientLight);

const rimLight = new THREE.DirectionalLight(0x2233ff, 2);
rimLight.position.set(-5, 3, 2);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x003322, 5, 10);
fillLight.position.set(0, 2, -1);
scene.add(fillLight);

// ─── Game ────────────────────────────────────────────────────────────────────
const game = new Game(scene, camera, renderer);

// ─── Desktop Input ───────────────────────────────────────────────────────────
let isPointerLocked = false;
let isFiring        = false;
const lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const MAX_PITCH = Math.PI / 4;
const MAX_YAW   = Math.PI / 2.5;

const overlay  = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');

function requestStart() {
  if (renderer.xr.isPresenting) return;
  renderer.domElement.requestPointerLock();
}

startBtn.addEventListener('click', requestStart);
renderer.domElement.addEventListener('click', () => {
  if (!isPointerLocked && !renderer.xr.isPresenting) requestStart();
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
  if (isPointerLocked) {
    overlay.classList.add('hidden');
    game.start();
  } else {
    if (game.state === 'playing') game.pause();
  }
});

document.addEventListener('mousemove', (e) => {
  if (!isPointerLocked) return;
  const s = 0.0018;
  lookEuler.y -= e.movementX * s;
  lookEuler.x -= e.movementY * s;
  lookEuler.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, lookEuler.x));
  lookEuler.y = Math.max(-MAX_YAW,   Math.min(MAX_YAW,   lookEuler.y));
  camera.quaternion.setFromEuler(lookEuler);
});

document.addEventListener('mousedown', (e) => {
  if (isPointerLocked && (e.button === 0 || e.button === 2)) {
    isFiring = true;
    game.fire();
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0 || e.button === 2) isFiring = false;
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') { isFiring = true; game.fire(); }
  if (e.code === 'Escape') {
    if (game.state === 'gameover') {
      overlay.classList.remove('hidden');
      lookEuler.set(0, 0, 0);
      camera.quaternion.setFromEuler(lookEuler);
    }
  }
  if (e.code === 'Enter' && game.state === 'gameover') {
    overlay.classList.remove('hidden');
    game.reset();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') isFiring = false;
});

// ─── VR Controllers ──────────────────────────────────────────────────────────
const ctrl0 = renderer.xr.getController(0);
const ctrl1 = renderer.xr.getController(1);
ctrl0.addEventListener('selectstart', () => game.fire());
ctrl1.addEventListener('selectstart', () => game.fire());
scene.add(ctrl0, ctrl1);

renderer.xr.addEventListener('sessionstart', () => {
  overlay.classList.add('hidden');
  game.start();
});

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Game Loop ───────────────────────────────────────────────────────────────
let lastTime = 0;
renderer.setAnimationLoop((time) => {
  const dt = Math.min((time - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = time;

  if (isFiring) game.fire();

  const activeCamera = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  game.update(dt, activeCamera);
  renderer.render(scene, camera);
});
