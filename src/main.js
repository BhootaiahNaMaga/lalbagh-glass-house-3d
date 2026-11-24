import * as THREE from 'three';
import { GardenAudioAmbience } from './audioAmbience.js';
import { createCameraAndTourController, VIEWPOINT_ORDER } from './cameraAndTour.js';
import { buildLalbaghGlassHouse } from './glassHouseBuilder.js';
import { createHotspotsController } from './hotspots.js';
import { buildInteriorDisplays } from './interiorDisplays.js';
import { buildLalbaghFauna } from './lalbaghFauna.js';
import { buildLalbaghGardens } from './lalbaghGardens.js';
import { createSkyAndLighting } from './skyAndLighting.js';

const TIME_ORDER = ['morning', 'midday', 'golden', 'night'];
const MODE_ORDER = ['orbit', 'walk', 'tour'];

const canvas = document.getElementById('scene-canvas');
const loadingCurtain = document.getElementById('loading-curtain');
const loadingProgress = document.getElementById('loading-progress');

const hudRoot = document.getElementById('hud-root');
const btnShowHud = document.getElementById('btn-show-hud');
const btnHideHud = document.getElementById('btn-hide-hud');
const btnHotspots = document.getElementById('btn-hotspots');
const btnAudio = document.getElementById('btn-audio');
const walkHintBadge = document.getElementById('walk-hint-badge');
const btnPointerLock = document.getElementById('btn-pointer-lock');
const tourBanner = document.getElementById('tour-banner');
const tourCaption = document.getElementById('tour-caption');
const btnTourToggle = document.getElementById('btn-tour-toggle');

const heritageCard = document.getElementById('heritage-card');
const heritageTag = document.getElementById('heritage-tag');
const heritageTitle = document.getElementById('heritage-title');
const heritageBody = document.getElementById('heritage-body');
const heritageMeta = document.getElementById('heritage-meta');
const btnCloseHeritage = document.getElementById('btn-close-heritage');

const hotspotsLayer = document.getElementById('hotspots-layer');
const modeButtons = Array.from(document.querySelectorAll('#mode-group [data-mode]'));
const timeButtons = Array.from(document.querySelectorAll('#time-group [data-time]'));
const displayButtons = Array.from(document.querySelectorAll('#display-group [data-display]'));
const viewButtons = Array.from(document.querySelectorAll('#viewpoint-group [data-view]'));

// --- 1. Renderer & Scene ---
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.2, 420);

loadingProgress.style.width = '45%';

// --- 2. Build Modules ---
const skyAndLighting = createSkyAndLighting(scene, renderer);
loadingProgress.style.width = '65%';

const glassHouse = buildLalbaghGlassHouse(maxAnisotropy);
scene.add(glassHouse.group);
loadingProgress.style.width = '80%';

const interiorDisplays = buildInteriorDisplays(maxAnisotropy);
scene.add(interiorDisplays.group);

const gardens = buildLalbaghGardens(maxAnisotropy);
scene.add(gardens.group);

const fauna = buildLalbaghFauna(maxAnisotropy);
scene.add(fauna.group);
loadingProgress.style.width = '95%';

const audioAmbience = new GardenAudioAmbience();

// --- 3. Camera, Tour & Hotspots ---
const cameraController = createCameraAndTourController(camera, canvas, {
  onModeChange(nextMode) {
    modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === nextMode));
    walkHintBadge.classList.toggle('hidden', nextMode !== 'walk');
    tourBanner.classList.toggle('hidden', nextMode !== 'tour');
    canvas.style.cursor = nextMode === 'walk' ? 'crosshair' : 'grab';
  },
  onViewpointChange(key) {
    viewButtons.forEach((b) => b.classList.toggle('active', b.dataset.view === key));
  },
  onTourState({ paused, caption }) {
    tourCaption.textContent = `Guided Tour — ${caption}`;
    btnTourToggle.textContent = paused ? 'Resume [Space]' : 'Pause [Space]';
  }
});

function showHeritageCard(hs) {
  heritageTag.textContent = hs.tag;
  heritageTitle.textContent = hs.title;
  heritageBody.textContent = hs.body;
  const metaEls = hs.meta.map((m) => {
    const span = document.createElement('span');
    span.textContent = m;
    return span;
  });
  heritageMeta.replaceChildren(...metaEls);
  heritageCard.classList.remove('hidden');
  heritageCard.setAttribute('aria-hidden', 'false');
}

function closeHeritageCard() {
  heritageCard.classList.add('hidden');
  heritageCard.setAttribute('aria-hidden', 'true');
  hotspotsController.clearSelection();
}

const hotspotsController = createHotspotsController(hotspotsLayer, camera, (hs) => {
  if (cameraController.getMode() === 'walk') {
    cameraController.setMode('orbit');
  }
  cameraController.flyTo(hs.camPos, hs.camTarget);
  showHeritageCard(hs);
});

// --- 4. UI Actions ---
function setTimeOfDay(mode) {
  skyAndLighting.setTimeOfDay(mode);
  audioAmbience.setTimeMode(mode);
  timeButtons.forEach((b) => b.classList.toggle('active', b.dataset.time === mode));
}

function setDisplayMode(mode) {
  interiorDisplays.setDisplayMode(mode);
  cameraController.setDisplayMode(mode);
  displayButtons.forEach((b) => b.classList.toggle('active', b.dataset.display === mode));
}

function setHudVisible(visible) {
  hudRoot.classList.toggle('hidden', !visible);
  btnShowHud.classList.toggle('hidden', visible);
}

modeButtons.forEach((btn) =>
  btn.addEventListener('click', () => cameraController.setMode(btn.dataset.mode))
);
timeButtons.forEach((btn) =>
  btn.addEventListener('click', () => setTimeOfDay(btn.dataset.time))
);
displayButtons.forEach((btn) =>
  btn.addEventListener('click', () => setDisplayMode(btn.dataset.display))
);
viewButtons.forEach((btn) =>
  btn.addEventListener('click', () => cameraController.setViewpoint(btn.dataset.view))
);

btnHotspots.addEventListener('click', () => {
  const next = !hotspotsController.isVisible();
  hotspotsController.setVisible(next);
  btnHotspots.classList.toggle('active', next);
  if (!next) closeHeritageCard();
});

btnAudio.addEventListener('click', () => {
  const next = !audioAmbience.enabled;
  audioAmbience.setEnabled(next);
  btnAudio.classList.toggle('active', next);
});

btnHideHud.addEventListener('click', () => setHudVisible(false));
btnShowHud.addEventListener('click', () => setHudVisible(true));
btnCloseHeritage.addEventListener('click', closeHeritageCard);
btnPointerLock.addEventListener('click', () => cameraController.requestPointerLock());
btnTourToggle.addEventListener('click', () => cameraController.toggleTourPause());

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

  const num = Number(e.key);
  if (num >= 1 && num <= VIEWPOINT_ORDER.length) {
    cameraController.setViewpoint(VIEWPOINT_ORDER[num - 1]);
    return;
  }

  switch (e.key.toLowerCase()) {
    case 'm': {
      const nextIdx = (MODE_ORDER.indexOf(cameraController.getMode()) + 1) % MODE_ORDER.length;
      cameraController.setMode(MODE_ORDER[nextIdx]);
      break;
    }
    case 't': {
      const nextIdx = (TIME_ORDER.indexOf(skyAndLighting.getTimeOfDay()) + 1) % TIME_ORDER.length;
      setTimeOfDay(TIME_ORDER[nextIdx]);
      break;
    }
    case 'f': {
      const next = interiorDisplays.getDisplayMode() === 'flower-show' ? 'conservatory' : 'flower-show';
      setDisplayMode(next);
      break;
    }
    case 'i': {
      btnHotspots.click();
      break;
    }
    case 'h': {
      setHudVisible(hudRoot.classList.contains('hidden'));
      break;
    }
    case ' ': {
      if (cameraController.getMode() === 'tour') {
        e.preventDefault();
        cameraController.toggleTourPause();
      }
      break;
    }
    case 'escape': {
      if (!heritageCard.classList.contains('hidden')) closeHeritageCard();
      break;
    }
  }
});

// Resize handler
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// Expose verification & automation handle
window.__lalbaghApp = {
  setViewpoint: (key, immediate = false) => cameraController.setViewpoint(key, immediate),
  setTimeOfDay: (mode, immediate = false) => {
    setTimeOfDay(mode);
    if (immediate) skyAndLighting.setTimeOfDay(mode, true);
  },
  setDisplayMode,
  setCameraMode: (mode) => cameraController.setMode(mode),
  openHotspot: (id) => hotspotsController.selectById(id),
  closeHotspot: closeHeritageCard,
  setHotspotsVisible: (v) => {
    hotspotsController.setVisible(v);
    btnHotspots.classList.toggle('active', v);
  },
  setHudVisible,
  getState: () => ({
    mode: cameraController.getMode(),
    viewpoint: cameraController.getViewpoint(),
    timeOfDay: skyAndLighting.getTimeOfDay(),
    displayMode: interiorDisplays.getDisplayMode(),
    cameraPos: camera.position.toArray(),
    bloomCount: interiorDisplays.bloomCount,
    faunaSummary: fauna.faunaSummary
  })
};

// --- 5. Animation Loop & Reveal ---
const clock = new THREE.Clock();
let firstFrameRendered = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  cameraController.update(dt);
  skyAndLighting.update(dt, elapsed, {
    emissiveBulbs: glassHouse.emissiveBulbs,
    lampGlobes: gardens.lampGlobes
  });
  interiorDisplays.update(dt, elapsed);
  gardens.update(dt, elapsed);
  fauna.update(dt, elapsed);
  audioAmbience.update(dt, camera.position);

  renderer.render(scene, camera);
  hotspotsController.update(window.innerWidth, window.innerHeight);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    loadingProgress.style.width = '100%';
    setTimeout(() => {
      loadingCurtain.classList.add('fade-out');
    }, 220);
  }
}

animate();
