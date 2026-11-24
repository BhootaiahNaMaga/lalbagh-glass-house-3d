import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const VIEWPOINTS = {
  approach: {
    label: 'Approach',
    caption: 'Grand Approach — Victorian Cast-Iron & Glass Icon',
    pos: new THREE.Vector3(23, 10.5, 41),
    target: new THREE.Vector3(0, 6.5, 5)
  },
  portico: {
    label: 'Portico',
    caption: 'Front Portico — Sunburst Gable & Heritage Signboard',
    pos: new THREE.Vector3(0, 4.2, 30.8),
    target: new THREE.Vector3(0, 8.0, 19)
  },
  crossing: {
    label: 'Crossing',
    caption: 'Central Crossing — Octagonal Cupola & Cast-Iron Arches',
    pos: new THREE.Vector3(9.4, 4.0, 1.8),
    target: new THREE.Vector3(0, 6.6, 0)
  },
  nave: {
    label: 'Nave',
    caption: 'East–West Nave — Barrel-Vaulted Colonnade & Sunbeams',
    pos: new THREE.Vector3(-20.5, 3.6, 0),
    target: new THREE.Vector3(6, 6.5, 0)
  },
  floral: {
    label: 'Floral',
    caption: 'Floral Centerpiece — Republic & Independence Day Show',
    pos: new THREE.Vector3(4.7, 3.1, 4.7),
    target: new THREE.Vector3(0, 3.6, 0)
  },
  canopy: {
    label: 'Canopy',
    caption: 'Aerial Panorama — Cruciform Vaults, Fountain & Kempegowda Tower',
    pos: new THREE.Vector3(46, 36, 48),
    target: new THREE.Vector3(-4, 4, -6)
  },
  lawn: {
    label: 'Lawn Vista',
    caption: 'Lawn Vista — Glowing Victorian Glass Across the Gardens',
    pos: new THREE.Vector3(-22, 5.5, 32),
    target: new THREE.Vector3(0, 7.5, 0)
  }
};

export const VIEWPOINT_ORDER = ['approach', 'portico', 'crossing', 'nave', 'floral', 'canopy', 'lawn'];

/**
 * Samples floor/stair elevation across the garden grade (0.0),
 * 4 cardinal granite staircases (0.0 -> 1.2), and interior plinth (1.2).
 */
export function getWalkHeight(x, z) {
  // Inside interior plinth
  if (Math.abs(x) <= 6.0 && Math.abs(z) <= 21.0) return 1.2;
  if (Math.abs(x) <= 24.0 && Math.abs(z) <= 12.0) return 1.2;
  if (Math.abs(x) <= 4.2 && z >= 21.0 && z <= 23.2) return 1.2;

  // Front (+Z) stairs
  if (Math.abs(x) <= 4.0 && z > 23.2 && z <= 25.72) {
    return 1.2 * (1.0 - (z - 23.2) / 2.52);
  }
  // Rear (-Z) stairs
  if (Math.abs(x) <= 3.0 && z < -21.0 && z >= -23.52) {
    return 1.2 * (1.0 - (-21.0 - z) / 2.52);
  }
  // East (+X) stairs
  if (Math.abs(z) <= 3.0 && x > 24.0 && x <= 26.52) {
    return 1.2 * (1.0 - (x - 24.0) / 2.52);
  }
  // West (-X) stairs
  if (Math.abs(z) <= 3.0 && x < -24.0 && x >= -26.52) {
    return 1.2 * (1.0 - (-24.0 - x) / 2.52);
  }

  return 0.0;
}

function isInsideGlassHouse(x, z) {
  return (Math.abs(x) < 5.95 && Math.abs(z) < 20.95) || (Math.abs(x) < 23.95 && Math.abs(z) < 11.95);
}

function isWalkable(x, z, prevX, prevZ, displayMode) {
  // Garden boundary
  if (Math.hypot(x, z) > 88) return false;

  // Fountain basin at (0, 34, r=4.6)
  if (Math.hypot(x, z - 34) < 5.1) return false;

  // Central crossing monument collision
  const centerR = displayMode === 'flower-show' ? 5.25 : 2.1;
  if (Math.hypot(x, z) < centerR) return false;

  // Bandstand plinth at (38, 26)
  if (Math.hypot(x - 38, z - 26) < 4.9) return false;

  // Check stair / plinth / wall transitions
  const prevIn = isInsideGlassHouse(prevX, prevZ);
  const nextIn = isInsideGlassHouse(x, z);

  // If crossing perimeter boundary, allow ONLY through the 4 cardinal doorways
  if (prevIn !== nextIn) {
    const frontDoor = Math.abs(x) < 2.1 && Math.min(prevZ, z) <= 21.0 && Math.max(prevZ, z) >= 20.9;
    const rearDoor = Math.abs(x) < 2.1 && Math.min(prevZ, z) <= -20.9 && Math.max(prevZ, z) >= -21.0;
    const eastDoor = Math.abs(z) < 2.1 && Math.min(prevX, x) <= 24.0 && Math.max(prevX, x) >= 23.9;
    const westDoor = Math.abs(z) < 2.1 && Math.min(prevX, x) <= -23.9 && Math.max(prevX, x) >= -24.0;
    if (!(frontDoor || rearDoor || eastDoor || westDoor)) {
      return false;
    }
  }

  // Prevent walking up sheer plinth sides when outside (allow only via stairs)
  const prevH = getWalkHeight(prevX, prevZ);
  const nextH = getWalkHeight(x, z);
  if (!prevIn && !nextIn && Math.abs(nextH - prevH) > 0.45) {
    return false;
  }

  return true;
}

export function createCameraAndTourController(camera, domElement, callbacks = {}) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI * 0.492;
  controls.minDistance = 3.5;
  controls.maxDistance = 105;

  let mode = 'orbit'; // 'orbit' | 'walk' | 'tour'
  let activeView = 'approach';
  let displayMode = 'flower-show';
  let tourPaused = false;
  let tourIndex = 0;
  let tourElapsed = 0;
  const TOUR_SLIDE_SEC = 6.5;

  // Smooth camera transition state
  const transition = {
    active: false,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    progress: 0,
    duration: 1.25
  };

  // Walk mode state
  const walkState = {
    pos: new THREE.Vector3(0, 1.72, 29.0),
    yaw: 0, // facing -Z toward portico
    pitch: 0.06,
    bobPhase: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    keys: new Set()
  };

  function syncWalkFromCamera() {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    walkState.yaw = Math.atan2(-dir.x, -dir.z);
    walkState.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(dir.y, -0.95, 0.95)), -1.1, 1.1);
    const groundY = getWalkHeight(camera.position.x, camera.position.z);
    walkState.pos.set(camera.position.x, groundY + 1.72, camera.position.z);
  }

  function applyWalkCamera() {
    const bob = Math.sin(walkState.bobPhase) * 0.032;
    camera.position.set(walkState.pos.x, walkState.pos.y + bob, walkState.pos.z);
    const cosPitch = Math.cos(walkState.pitch);
    const lookTarget = new THREE.Vector3(
      walkState.pos.x - Math.sin(walkState.yaw) * cosPitch * 5,
      walkState.pos.y + bob + Math.sin(walkState.pitch) * 5,
      walkState.pos.z - Math.cos(walkState.yaw) * cosPitch * 5
    );
    camera.lookAt(lookTarget);
  }

  // Cancel transition if user manually grabs OrbitControls
  controls.addEventListener('start', () => {
    transition.active = false;
    if (mode === 'tour') {
      tourPaused = true;
      callbacks.onTourState?.({ paused: true, caption: VIEWPOINTS[VIEWPOINT_ORDER[tourIndex]].caption });
    }
  });

  // Walk input listeners
  function onKeyDown(e) {
    if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    walkState.keys.add(e.code);
  }
  function onKeyUp(e) {
    walkState.keys.delete(e.code);
  }
  function onPointerDown(e) {
    if (mode !== 'walk') return;
    if (e.button !== 0) return;
    walkState.dragging = true;
    walkState.lastX = e.clientX;
    walkState.lastY = e.clientY;
  }
  function onPointerMove(e) {
    if (mode !== 'walk') return;
    if (document.pointerLockElement === domElement) {
      walkState.yaw -= e.movementX * 0.0024;
      walkState.pitch = THREE.MathUtils.clamp(walkState.pitch - e.movementY * 0.0022, -1.15, 1.15);
    } else if (walkState.dragging) {
      const dx = e.clientX - walkState.lastX;
      const dy = e.clientY - walkState.lastY;
      walkState.lastX = e.clientX;
      walkState.lastY = e.clientY;
      walkState.yaw -= dx * 0.0042;
      walkState.pitch = THREE.MathUtils.clamp(walkState.pitch - dy * 0.0036, -1.15, 1.15);
    }
  }
  function onPointerUp() {
    walkState.dragging = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  function flyTo(pos, target, immediate = false) {
    if (immediate) {
      camera.position.copy(pos);
      controls.target.copy(target);
      controls.update();
      transition.active = false;
      return;
    }
    transition.active = true;
    transition.fromPos.copy(camera.position);
    transition.toPos.copy(pos);
    transition.fromTarget.copy(controls.target);
    transition.toTarget.copy(target);
    transition.progress = 0;
  }

  function setViewpoint(key, immediate = false) {
    const vp = VIEWPOINTS[key];
    if (!vp) return;
    activeView = key;
    if (mode === 'walk') {
      // Snap into walk cleanly at viewpoint or near ground
      const groundY = getWalkHeight(vp.pos.x, vp.pos.z);
      walkState.pos.set(vp.pos.x, Math.max(groundY + 1.72, Math.min(vp.pos.y, groundY + 1.9)), vp.pos.z);
      const dir = vp.target.clone().sub(walkState.pos).normalize();
      walkState.yaw = Math.atan2(-dir.x, -dir.z);
      walkState.pitch = THREE.MathUtils.clamp(Math.asin(dir.y), -1.1, 1.1);
      applyWalkCamera();
    } else {
      flyTo(vp.pos, vp.target, immediate);
    }
    callbacks.onViewpointChange?.(key, vp);
  }

  function setMode(nextMode) {
    if (!['orbit', 'walk', 'tour'].includes(nextMode)) return;
    mode = nextMode;

    if (document.pointerLockElement === domElement && mode !== 'walk') {
      document.exitPointerLock?.();
    }

    if (mode === 'walk') {
      controls.enabled = false;
      transition.active = false;
      // Place user comfortably at approach if coming from aerial canopy
      if (camera.position.y > 14) {
        walkState.pos.set(0, 1.72, 29.0);
        walkState.yaw = 0;
        walkState.pitch = 0.08;
      } else {
        syncWalkFromCamera();
      }
      applyWalkCamera();
    } else {
      controls.enabled = true;
      if (mode === 'tour') {
        tourPaused = false;
        tourIndex = Math.max(0, VIEWPOINT_ORDER.indexOf(activeView));
        tourElapsed = 0;
        setViewpoint(VIEWPOINT_ORDER[tourIndex]);
        callbacks.onTourState?.({ paused: false, caption: VIEWPOINTS[VIEWPOINT_ORDER[tourIndex]].caption });
      }
    }
    callbacks.onModeChange?.(mode);
  }

  function toggleTourPause() {
    if (mode !== 'tour') return;
    tourPaused = !tourPaused;
    callbacks.onTourState?.({ paused: tourPaused, caption: VIEWPOINTS[VIEWPOINT_ORDER[tourIndex]].caption });
  }

  function requestPointerLock() {
    if (mode === 'walk') {
      domElement.requestPointerLock?.();
    }
  }

  function setDisplayMode(nextDisplayMode) {
    displayMode = nextDisplayMode;
  }

  function update(dt) {
    if (mode === 'walk') {
      const speed = (walkState.keys.has('ShiftLeft') || walkState.keys.has('ShiftRight') ? 8.5 : 4.6) * dt;
      let fwd = 0;
      let strafe = 0;
      if (walkState.keys.has('KeyW') || walkState.keys.has('ArrowUp')) fwd += 1;
      if (walkState.keys.has('KeyS') || walkState.keys.has('ArrowDown')) fwd -= 1;
      if (walkState.keys.has('KeyD') || walkState.keys.has('ArrowRight')) strafe += 1;
      if (walkState.keys.has('KeyA') || walkState.keys.has('ArrowLeft')) strafe -= 1;

      if (fwd !== 0 || strafe !== 0) {
        const len = Math.hypot(fwd, strafe);
        fwd /= len;
        strafe /= len;
        const sinY = Math.sin(walkState.yaw);
        const cosY = Math.cos(walkState.yaw);
        const dx = (-sinY * fwd + cosY * strafe) * speed;
        const dz = (-cosY * fwd - sinY * strafe) * speed;

        const nextX = walkState.pos.x + dx;
        const nextZ = walkState.pos.z + dz;
        if (isWalkable(nextX, walkState.pos.z, walkState.pos.x, walkState.pos.z, displayMode)) {
          walkState.pos.x = nextX;
        }
        if (isWalkable(walkState.pos.x, nextZ, walkState.pos.x, walkState.pos.z, displayMode)) {
          walkState.pos.z = nextZ;
        }

        const targetY = getWalkHeight(walkState.pos.x, walkState.pos.z) + 1.72;
        walkState.pos.y += (targetY - walkState.pos.y) * Math.min(1, dt * 12);
        walkState.bobPhase += dt * (speed / Math.max(dt, 0.001)) * 1.45;
      }

      applyWalkCamera();
      return;
    }

    // Orbit or Tour transition
    if (transition.active) {
      transition.progress = Math.min(1, transition.progress + dt / transition.duration);
      const t = transition.progress;
      // Smooth quintic ease
      const ease = t * t * t * (t * (t * 6 - 15) + 10);
      camera.position.lerpVectors(transition.fromPos, transition.toPos, ease);
      controls.target.lerpVectors(transition.fromTarget, transition.toTarget, ease);
      if (t >= 1) transition.active = false;
    } else if (mode === 'tour' && !tourPaused) {
      // Gentle cinematic drift around current target
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.085);
      camera.position.copy(controls.target).add(offset);

      tourElapsed += dt;
      if (tourElapsed >= TOUR_SLIDE_SEC) {
        tourElapsed = 0;
        tourIndex = (tourIndex + 1) % VIEWPOINT_ORDER.length;
        const nextKey = VIEWPOINT_ORDER[tourIndex];
        setViewpoint(nextKey);
        callbacks.onTourState?.({ paused: false, caption: VIEWPOINTS[nextKey].caption });
      }
    }

    controls.update();
  }

  // Initialize at Approach immediately
  setViewpoint('approach', true);

  return {
    controls,
    setMode,
    getMode: () => mode,
    setViewpoint,
    getViewpoint: () => activeView,
    flyTo,
    toggleTourPause,
    requestPointerLock,
    setDisplayMode,
    update,
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
    }
  };
}
