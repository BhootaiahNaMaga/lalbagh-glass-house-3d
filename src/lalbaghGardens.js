import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  applyWindSway,
  createBambooCulmTexture,
  createBambooLeafTexture,
  createBarkTextures,
  createBloomRosetteTexture,
  createCurvedPalmFrondGeo,
  createFernFrondTexture,
  createGrassTuftTexture,
  createPalmFrondTexture,
  createPalmTrunkTexture,
  createTreeFoliageTexture
} from './foliageTextures.js';
import {
  createGraniteTextures,
  createGravelPathTexture,
  createLawnTexture,
  createPetalTexture,
  createSoftGlowTexture
} from './textures.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a smoothly tapered cylindrical branch along a 3D CatmullRomCurve3.
 * Produces clean indexed geometry with (position, normal, uv) attributes ready for mergeGeometries.
 */
function createTaperedBranchGeo(curve, tubularSegs, rStart, rEnd, radialSegs = 7) {
  const frames = curve.computeFrenetFrames(tubularSegs, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs;
    curve.getPointAt(t, p);
    const radius = THREE.MathUtils.lerp(rStart, rEnd, t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = -Math.cos(theta);

      n.set(
        cos * N.x + sin * B.x,
        cos * N.y + sin * B.y,
        cos * N.z + sin * B.z
      ).normalize();

      positions.push(p.x + radius * n.x, p.y + radius * n.y, p.z + radius * n.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(u, t * 2.2);
    }
  }

  for (let i = 0; i < tubularSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j;
      const b = (i + 1) * (radialSegs + 1) + j;
      const c = (i + 1) * (radialSegs + 1) + (j + 1);
      const d = i * (radialSegs + 1) + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Multi-plane crossed + gently cupped foliage cluster card geometry with
 * smooth outward-upward vertex normals so crossed alpha-cutout planes never show flat X-seams.
 */
function createFoliageClusterGeo() {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const card = new THREE.PlaneGeometry(1.0, 0.92, 2, 2);
    const pos = card.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const y = pos.getY(v);
      // Cup slightly outward in Z for natural volumetric dome
      const zCurve = -(x * x + y * y) * 0.28 + 0.08;
      pos.setZ(v, zCurve);
    }
    card.rotateX((i - 1) * 0.14);
    card.rotateY((i * Math.PI) / 3);
    parts.push(card.toNonIndexed());
  }

  // Tilted crown cap card
  const cap = new THREE.PlaneGeometry(0.95, 0.95, 2, 2);
  cap.rotateX(-Math.PI * 0.38);
  cap.translate(0, 0.18, 0);
  parts.push(cap.toNonIndexed());

  const merged = mergeGeometries(parts, false);
  // Smooth outward-upward sphere-like normals for lush canopy shading
  const mPos = merged.attributes.position;
  const mNorm = merged.attributes.normal;
  const nVec = new THREE.Vector3();
  for (let i = 0; i < mPos.count; i++) {
    nVec.set(mPos.getX(i), mPos.getY(i) + 0.45, mPos.getZ(i)).normalize();
    mNorm.setXYZ(i, nVec.x, nVec.y, nVec.z);
  }
  mNorm.needsUpdate = true;
  return merged;
}

/**
 * Builds an organic branching tree skeleton template (flared buttress roots, curved trunk,
 * 4-6 sweeping primary boughs, 10-14 secondary limbs) and collects canopy anchor tips.
 */
function createTreeSkeletonTemplate(species, seed) {
  const rand = mulberry32(seed);
  const parts = [];
  const canopyTips = [];

  const isRain = species === 'rain';
  const isGulmohar = species === 'gulmohar';

  const trunkH = isRain ? 4.6 : isGulmohar ? 3.8 : 4.2;
  const trunkR0 = isRain ? 0.62 : isGulmohar ? 0.44 : 0.4;
  const trunkR1 = isRain ? 0.34 : isGulmohar ? 0.24 : 0.22;

  const leanX = (rand() - 0.5) * 0.75;
  const leanZ = (rand() - 0.5) * 0.75;
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.25, 0),
    new THREE.Vector3(leanX * 0.35, trunkH * 0.38, leanZ * 0.35),
    new THREE.Vector3(leanX * 0.75, trunkH * 0.75, leanZ * 0.75),
    new THREE.Vector3(leanX, trunkH, leanZ)
  ]);
  parts.push(createTaperedBranchGeo(trunkCurve, 10, trunkR0, trunkR1, 8).toNonIndexed());

  // 4 Flared buttress root spurs gripping y = 0
  for (let r = 0; r < 4; r++) {
    const ra = (r / 4) * Math.PI * 2 + rand() * 0.5;
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(ra) * trunkR0 * 0.45, 1.05, Math.sin(ra) * trunkR0 * 0.45),
      new THREE.Vector3(Math.cos(ra) * trunkR0 * 1.15, 0.35, Math.sin(ra) * trunkR0 * 1.15),
      new THREE.Vector3(Math.cos(ra) * trunkR0 * 1.85, -0.18, Math.sin(ra) * trunkR0 * 1.85)
    ]);
    parts.push(createTaperedBranchGeo(rootCurve, 5, trunkR0 * 0.42, trunkR0 * 0.14, 5).toNonIndexed());
  }

  const boughCount = isRain ? 6 : 5;
  const boughReach = isRain ? 5.6 : isGulmohar ? 4.5 : 3.9;
  const boughLift = isRain ? 2.8 : isGulmohar ? 2.4 : 3.3;

  for (let b = 0; b < boughCount; b++) {
    const angle = (b / boughCount) * Math.PI * 2 + (rand() - 0.5) * 0.38;
    const startT = 0.68 + rand() * 0.3;
    const origin = trunkCurve.getPointAt(startT);
    const len = boughReach * (0.82 + rand() * 0.35);
    const lift = boughLift * (0.78 + rand() * 0.36);

    const mid = new THREE.Vector3(
      origin.x + Math.cos(angle) * len * 0.52,
      origin.y + lift * 0.65,
      origin.z + Math.sin(angle) * len * 0.52
    );
    const tip = new THREE.Vector3(
      origin.x + Math.cos(angle) * len,
      origin.y + lift,
      origin.z + Math.sin(angle) * len
    );
    const boughCurve = new THREE.CatmullRomCurve3([origin, mid, tip]);
    parts.push(createTaperedBranchGeo(boughCurve, 7, trunkR1 * 0.72, 0.08, 6).toNonIndexed());

    // Record primary crown anchor
    canopyTips.push({ pos: tip.clone(), isCrownTop: true, scale: isRain ? 3.2 : 2.6 });
    canopyTips.push({ pos: mid.clone().add(new THREE.Vector3(0, 0.6, 0)), isCrownTop: true, scale: isRain ? 2.9 : 2.3 });

    // 2-3 secondary spreading limbs per primary bough
    const subCount = isRain ? 3 : 2;
    for (let s = 0; s < subCount; s++) {
      const sOrigin = boughCurve.getPointAt(0.45 + (s / subCount) * 0.45);
      const sAng = angle + (s === 0 ? -0.58 : s === 1 ? 0.58 : (rand() - 0.5) * 0.4);
      const sLen = len * (0.45 + rand() * 0.25);
      const sLift = 0.6 + rand() * 1.1;
      const sTip = new THREE.Vector3(
        sOrigin.x + Math.cos(sAng) * sLen,
        sOrigin.y + sLift,
        sOrigin.z + Math.sin(sAng) * sLen
      );
      const subCurve = new THREE.CatmullRomCurve3([
        sOrigin,
        sOrigin.clone().lerp(sTip, 0.5).add(new THREE.Vector3(0, 0.35, 0)),
        sTip
      ]);
      parts.push(createTaperedBranchGeo(subCurve, 5, 0.11, 0.04, 5).toNonIndexed());

      canopyTips.push({ pos: sTip.clone(), isCrownTop: s === 2, scale: isRain ? 2.75 : 2.25 });
      canopyTips.push({
        pos: sTip.clone().add(new THREE.Vector3((rand() - 0.5) * 1.1, 0.45, (rand() - 0.5) * 1.1)),
        isCrownTop: true,
        scale: isRain ? 2.5 : 2.0
      });
    }
  }

  // Central apical crown cluster so the umbrella top is seamlessly filled
  const apex = new THREE.Vector3(leanX, trunkH + boughLift + 0.6, leanZ);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = 1.2 + rand() * 1.4;
    canopyTips.push({
      pos: new THREE.Vector3(apex.x + Math.cos(a) * r, apex.y + (rand() - 0.3) * 0.8, apex.z + Math.sin(a) * r),
      isCrownTop: true,
      scale: isRain ? 3.1 : 2.5
    });
  }

  const geometry = mergeGeometries(parts, false);
  geometry.computeVertexNormals();
  return { geometry, canopyTips };
}

/**
 * Builds the surrounding Lalbagh Botanical Garden with realistic branching trees,
 * airy alpha-cutout leafy canopies, wind sway, feathery Royal Palms, bamboo groves,
 * swaying 3D grass tufts, flowering bougainvillea shrubs, and clear Koi fountain.
 */
export function buildLalbaghGardens(maxAnisotropy = 8) {
  const root = new THREE.Group();
  root.name = 'LalbaghGardens';
  const rand = mulberry32(2026);
  const lampGlobes = [];
  const windUniforms = { uTime: { value: 0 } };

  // =========================================================================
  // 1. EXPANSIVE LUSH LAWN TERRAIN (r = 165m, flat in plaza r < 54m)
  // =========================================================================
  const lawnTex = createLawnTexture(maxAnisotropy);
  const lawnMat = new THREE.MeshStandardMaterial({
    map: lawnTex,
    roughness: 0.92,
    metalness: 0.02
  });

  const terrainGeo = new THREE.CircleGeometry(165, 96, 0, Math.PI * 2);
  terrainGeo.rotateX(-Math.PI * 0.5);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const r = Math.hypot(vx, vz);
    if (r > 56) {
      const factor = Math.min(1, (r - 56) / 60);
      const undul =
        (Math.sin(vx * 0.035) * Math.cos(vz * 0.032) * 1.4 +
          Math.sin((vx + vz) * 0.02) * 0.9) *
        factor;
      posAttr.setY(i, undul);
    }
  }
  terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, lawnMat);
  terrain.receiveShadow = true;
  root.add(terrain);

  // =========================================================================
  // 2. RED-GRAVEL PROMENADE, RADIAL PATHS & GRANITE CURBS
  // =========================================================================
  const gravelTex = createGravelPathTexture(maxAnisotropy);
  const gravelMat = new THREE.MeshStandardMaterial({
    map: gravelTex,
    roughness: 0.88,
    metalness: 0.02
  });
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x9b968c,
    roughness: 0.78,
    metalness: 0.05
  });

  function addPathRect(x, z, w, d) {
    const tex = gravelTex.clone();
    tex.repeat.set(Math.max(1, w / 5), Math.max(1, d / 5));
    tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0.02 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(x, 0.022, z);
    mesh.receiveShadow = true;
    root.add(mesh);
  }

  addPathRect(0, 55.6, 12.0, 64.8);
  addPathRect(0, -46.5, 7.2, 51.0);
  addPathRect(50.0, 0, 52.0, 7.2);
  addPathRect(-50.0, 0, 52.0, 7.2);
  addPathRect(0, 15.6, 16.4, 15.0);
  addPathRect(0, -15.6, 16.4, 14.0);
  addPathRect(-15.5, 0, 21.0, 28.0);
  addPathRect(15.5, 0, 21.0, 28.0);

  const plaza = new THREE.Mesh(new THREE.CircleGeometry(9.6, 48), gravelMat);
  plaza.rotation.x = -Math.PI * 0.5;
  plaza.position.set(0, 0.026, 34);
  plaza.receiveShadow = true;
  root.add(plaza);

  const plazaCurb = new THREE.Mesh(new THREE.RingGeometry(9.5, 9.85, 48), curbMat);
  plazaCurb.rotation.x = -Math.PI * 0.5;
  plazaCurb.position.set(0, 0.032, 34);
  root.add(plazaCurb);

  // =========================================================================
  // 3. ICONIC FRONT VICTORIAN FOUNTAIN AT (0, 0, 34) — Clear Water for Koi
  // =========================================================================
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0, 34);
  root.add(fountainGroup);

  const graniteTex = createGraniteTextures(maxAnisotropy);
  const ftnStoneMat = new THREE.MeshStandardMaterial({
    map: graniteTex.map,
    bumpMap: graniteTex.bumpMap,
    bumpScale: 0.02,
    roughness: 0.72
  });
  const ironGreenMat = new THREE.MeshStandardMaterial({
    color: 0x1a3b2e,
    roughness: 0.42,
    metalness: 0.45
  });

  const basinBase = new THREE.Mesh(new THREE.CylinderGeometry(4.75, 4.9, 0.25, 8), ftnStoneMat);
  basinBase.position.y = 0.125;
  basinBase.receiveShadow = true;
  fountainGroup.add(basinBase);

  // Inner dark-slate basin floor so Koi carp contrast cleanly beneath clear ripples
  const basinFloor = new THREE.Mesh(
    new THREE.CircleGeometry(4.45, 24),
    new THREE.MeshStandardMaterial({ color: 0x143338, roughness: 0.88 })
  );
  basinFloor.rotation.x = -Math.PI * 0.5;
  basinFloor.position.y = 0.27;
  fountainGroup.add(basinFloor);

  const rimWall = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.62, 8, 1, true), ftnStoneMat);
  rimWall.position.y = 0.44;
  rimWall.castShadow = true;
  fountainGroup.add(rimWall);

  const rimTop = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.18, 8, 8), curbMat);
  rimTop.rotation.x = Math.PI * 0.5;
  rimTop.rotation.z = Math.PI / 8;
  rimTop.position.y = 0.74;
  fountainGroup.add(rimTop);

  const waterUniforms = { uTime: { value: 0 } };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float d = length(p);
        float ripple = sin(d * 34.0 - uTime * 3.8) * 0.5 + 0.5;
        vec3 deep = vec3(0.08, 0.36, 0.42);
        vec3 crest = vec3(0.45, 0.84, 0.90);
        vec3 col = mix(deep, crest, ripple * 0.38 + (1.0 - d) * 0.16);
        gl_FragColor = vec4(col, 0.64);
      }
    `
  });
  const waterSurface = new THREE.Mesh(new THREE.CircleGeometry(4.42, 32), waterMat);
  waterSurface.rotation.x = -Math.PI * 0.5;
  waterSurface.position.y = 0.56;
  waterSurface.renderOrder = 2;
  fountainGroup.add(waterSurface);

  const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.2, 0.8, 12), ironGreenMat);
  pedBase.position.y = 0.45;
  pedBase.castShadow = true;
  fountainGroup.add(pedBase);

  const lowerBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 0.45, 0.36, 16), ironGreenMat);
  lowerBowl.position.y = 1.35;
  lowerBowl.castShadow = true;
  fountainGroup.add(lowerBowl);

  const midShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 1.15, 12), ironGreenMat);
  midShaft.position.y = 1.9;
  fountainGroup.add(midShaft);

  const upperBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.28, 0.28, 16), ironGreenMat);
  upperBowl.position.y = 2.52;
  upperBowl.castShadow = true;
  fountainGroup.add(upperBowl);

  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 10), ironGreenMat);
  nozzle.position.y = 2.8;
  fountainGroup.add(nozzle);

  const streamMat = new THREE.MeshPhysicalMaterial({
    color: 0xdff8ff,
    transparent: true,
    opacity: 0.58,
    roughness: 0.08,
    depthWrite: false
  });
  const centralJet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 2.3, 10), streamMat);
  centralJet.position.y = 3.95;
  fountainGroup.add(centralJet);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const arcPts = [];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const r = 0.35 + t * 2.55;
      const y = 2.55 + Math.sin(t * Math.PI) * 1.15 - t * 2.02;
      arcPts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const arcGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arcPts), 14, 0.032, 6, false);
    fountainGroup.add(new THREE.Mesh(arcGeo, streamMat));
  }

  const sprayCount = 260;
  const sprayPositions = new Float32Array(sprayCount * 3);
  const sprayMeta = [];
  for (let i = 0; i < sprayCount; i++) {
    sprayMeta.push({
      phase: rand(),
      ang: rand() * Math.PI * 2,
      isCenter: i < 140,
      speed: 0.55 + rand() * 0.45
    });
  }
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));
  const glowTex = createSoftGlowTexture();
  const sprayPoints = new THREE.Points(
    sprayGeo,
    new THREE.PointsMaterial({
      map: glowTex,
      color: 0xeefbff,
      size: 0.24,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  fountainGroup.add(sprayPoints);

  // =========================================================================
  // 4. MANICURED FLOWERBEDS (Cupped Rosettes + Leafy Stems + Soft Boxwood Hedges)
  // =========================================================================
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x224b24, roughness: 0.88 });
  const bedSoilMat = new THREE.MeshStandardMaterial({ color: 0x3f2d21, roughness: 0.95 });
  const rosetteTex = createBloomRosetteTexture(maxAnisotropy);
  const fernTex = createFernFrondTexture(maxAnisotropy);
  const rainFoliageTex = createTreeFoliageTexture('rain', maxAnisotropy);

  const bedBloomTransforms = [];
  const bedLeafTransforms = [];
  const hedgeTuftTransforms = [];
  const BED_COLORS = [
    new THREE.Color('#da2c43'),
    new THREE.Color('#ff9d1c'),
    new THREE.Color('#ffe047'),
    new THREE.Color('#9c3bc9'),
    new THREE.Color('#f76b8a')
  ];

  function addGardenFlowerbed(cx, cz, w, d) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), bedSoilMat);
    bed.position.set(cx, 0.1, cz);
    bed.receiveShadow = true;
    root.add(bed);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.26, 0.24, d + 0.26), hedgeMat);
    rim.position.set(cx, 0.12, cz);
    rim.castShadow = true;
    rim.receiveShadow = true;
    root.add(rim);

    // Soft leafy tufts along boxwood rim
    const perim = Math.floor((w + d) * 3.5);
    for (let i = 0; i < perim; i++) {
      const side = i % 4;
      let hx = cx;
      let hz = cz;
      if (side === 0) {
        hx += (rand() - 0.5) * w;
        hz += d * 0.5 + 0.08;
      } else if (side === 1) {
        hx += (rand() - 0.5) * w;
        hz -= d * 0.5 + 0.08;
      } else if (side === 2) {
        hx += w * 0.5 + 0.08;
        hz += (rand() - 0.5) * d;
      } else {
        hx -= w * 0.5 + 0.08;
        hz += (rand() - 0.5) * d;
      }
      hedgeTuftTransforms.push({ x: hx, y: 0.26, z: hz, s: 0.36 + rand() * 0.16 });
    }

    const count = Math.floor(w * d * 5.2);
    const col = BED_COLORS[Math.floor(rand() * BED_COLORS.length)];
    const col2 = BED_COLORS[Math.floor(rand() * BED_COLORS.length)];
    for (let i = 0; i < count; i++) {
      const bx = cx + (rand() - 0.5) * (w - 0.22);
      const bz = cz + (rand() - 0.5) * (d - 0.22);
      const by = 0.26 + rand() * 0.14;
      bedBloomTransforms.push({
        x: bx,
        y: by,
        z: bz,
        s: 0.85 + rand() * 0.45,
        color: i % 3 === 0 ? col2 : col
      });
      if (i % 2 === 0) {
        bedLeafTransforms.push({ x: bx, y: by - 0.06, z: bz, s: 0.5 + rand() * 0.25 });
      }
    }
  }

  addGardenFlowerbed(-14.5, 19.5, 9.5, 3.2);
  addGardenFlowerbed(14.5, 19.5, 9.5, 3.2);
  addGardenFlowerbed(-14.5, -19.5, 9.5, 3.2);
  addGardenFlowerbed(14.5, -19.5, 9.5, 3.2);
  addGardenFlowerbed(-15.5, 34.0, 7.5, 4.2);
  addGardenFlowerbed(15.5, 34.0, 7.5, 4.2);
  addGardenFlowerbed(-15.5, 50.0, 7.5, 4.2);
  addGardenFlowerbed(15.5, 50.0, 7.5, 4.2);

  // Cupped flower rosette geometry for garden beds
  const bedBloomGeo = new THREE.CircleGeometry(0.16, 10);
  bedBloomGeo.rotateX(-Math.PI * 0.5);
  const bbPos = bedBloomGeo.attributes.position;
  for (let i = 0; i < bbPos.count; i++) {
    const r = Math.hypot(bbPos.getX(i), bbPos.getZ(i));
    bbPos.setY(i, (r / 0.16) * 0.055);
  }
  bedBloomGeo.computeVertexNormals();

  const bedBloomInst = new THREE.InstancedMesh(
    bedBloomGeo,
    new THREE.MeshStandardMaterial({ map: rosetteTex, color: 0xffffff, roughness: 0.68, side: THREE.DoubleSide }),
    bedBloomTransforms.length
  );
  const dummy = new THREE.Object3D();
  bedBloomTransforms.forEach((b, idx) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set((rand() - 0.5) * 0.45, rand() * Math.PI * 2, (rand() - 0.5) * 0.45);
    dummy.scale.setScalar(b.s);
    dummy.updateMatrix();
    bedBloomInst.setMatrixAt(idx, dummy.matrix);
    bedBloomInst.setColorAt(idx, b.color);
  });
  bedBloomInst.instanceMatrix.needsUpdate = true;
  if (bedBloomInst.instanceColor) bedBloomInst.instanceColor.needsUpdate = true;
  root.add(bedBloomInst);

  // Leafy stems inside flowerbeds
  const bedLeafGeo = new THREE.PlaneGeometry(0.32, 0.34);
  bedLeafGeo.rotateX(-Math.PI * 0.35);
  const bedLeafInst = new THREE.InstancedMesh(
    bedLeafGeo,
    new THREE.MeshStandardMaterial({ map: fernTex, alphaTest: 0.42, roughness: 0.72, side: THREE.DoubleSide }),
    bedLeafTransforms.length
  );
  bedLeafTransforms.forEach((l, idx) => {
    dummy.position.set(l.x, l.y, l.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(l.s);
    dummy.updateMatrix();
    bedLeafInst.setMatrixAt(idx, dummy.matrix);
  });
  bedLeafInst.instanceMatrix.needsUpdate = true;
  root.add(bedLeafInst);

  // Soft leafy volume on boxwood rims
  const clusterGeo = createFoliageClusterGeo();
  const hedgeTuftMat = applyWindSway(
    new THREE.MeshStandardMaterial({
      map: rainFoliageTex,
      alphaTest: 0.42,
      color: 0xd8f0c8,
      roughness: 0.82,
      side: THREE.DoubleSide
    }),
    windUniforms,
    0.03,
    0.4
  );
  const hedgeTuftInst = new THREE.InstancedMesh(clusterGeo, hedgeTuftMat, hedgeTuftTransforms.length);
  hedgeTuftTransforms.forEach((h, idx) => {
    dummy.position.set(h.x, h.y, h.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(h.s);
    dummy.updateMatrix();
    hedgeTuftInst.setMatrixAt(idx, dummy.matrix);
  });
  hedgeTuftInst.instanceMatrix.needsUpdate = true;
  root.add(hedgeTuftInst);

  // =========================================================================
  // 5. PHOTOREALISTIC ROYAL PALMS (Roystonea regia)
  // =========================================================================
  const palmTrunkTex = createPalmTrunkTexture(maxAnisotropy);
  const palmFrondTex = createPalmFrondTexture(maxAnisotropy);

  const palmTrunkMat = new THREE.MeshStandardMaterial({ map: palmTrunkTex, roughness: 0.85 });
  const palmCrownshaftMat = new THREE.MeshStandardMaterial({ color: 0x3a7033, roughness: 0.58 });
  const palmFrondMat = applyWindSway(
    new THREE.MeshStandardMaterial({
      map: palmFrondTex,
      alphaTest: 0.4,
      roughness: 0.55,
      side: THREE.DoubleSide
    }),
    windUniforms,
    0.18,
    0.16
  );
  const palmFrondDepthMat = new THREE.MeshDepthMaterial({
    map: palmFrondTex,
    alphaTest: 0.4,
    depthPacking: THREE.RGBADepthPacking
  });

  const royalPalmFrondGeo = createCurvedPalmFrondGeo(3.35, 1.52, 1.05, 0.88);
  const palmFrondInstances = [];

  function addRoyalPalm(x, z, h = 11.5) {
    const pg = new THREE.Group();
    pg.position.set(x, 0, z);

    const pts = [
      new THREE.Vector2(0.44, 0),
      new THREE.Vector2(0.35, h * 0.22),
      new THREE.Vector2(0.42, h * 0.55),
      new THREE.Vector2(0.28, h * 0.84)
    ];
    const trunk = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), palmTrunkMat);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    pg.add(trunk);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, h * 0.16, 12), palmCrownshaftMat);
    shaft.position.y = h * 0.92;
    shaft.castShadow = true;
    pg.add(shaft);
    root.add(pg);

    // Register 24 arching feathery fronds (outer drooping ring + steeper inner crown)
    const crownY = h * 1.0;
    const fronds = 16;
    for (let i = 0; i < fronds; i++) {
      const yaw = (i / fronds) * Math.PI * 2 + (rand() - 0.5) * 0.22;
      const pitch = i % 2 === 0 ? -0.18 + rand() * 0.12 : 0.12 + rand() * 0.14;
      const sc = 0.92 + rand() * 0.26;
      palmFrondInstances.push({ x, y: crownY, z, yaw, pitch, roll: (rand() - 0.5) * 0.16, sc });
    }
    for (let i = 0; i < 8; i++) {
      const yaw = (i / 8) * Math.PI * 2 + 0.25 + (rand() - 0.5) * 0.2;
      const pitch = -0.48 + rand() * 0.14;
      const sc = 0.78 + rand() * 0.18;
      palmFrondInstances.push({ x, y: crownY + 0.12, z, yaw, pitch, roll: (rand() - 0.5) * 0.14, sc });
    }
  }

  // Ceremonial Royal Palm Avenue (wide & clear of Approach sightline) + scenic outer palms
  for (let z = 44; z <= 74; z += 10.0) {
    addRoyalPalm(-14.5, z, 10.6 + rand() * 1.8);
    addRoyalPalm(14.5, z, 10.6 + rand() * 1.8);
  }
  for (const [px, pz] of [
    [-34, 42],
    [35, 48],
    [-40, -30],
    [40, -34]
  ]) {
    addRoyalPalm(px, pz, 11.2 + rand() * 2.0);
  }

  const palmFrondInst = new THREE.InstancedMesh(royalPalmFrondGeo, palmFrondMat, palmFrondInstances.length);
  palmFrondInst.castShadow = true;
  palmFrondInst.receiveShadow = true;
  palmFrondInst.customDepthMaterial = palmFrondDepthMat;
  palmFrondInstances.forEach((pf, idx) => {
    dummy.position.set(pf.x, pf.y, pf.z);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.set(pf.pitch, pf.yaw, pf.roll);
    dummy.scale.setScalar(pf.sc);
    dummy.updateMatrix();
    palmFrondInst.setMatrixAt(idx, dummy.matrix);
  });
  palmFrondInst.instanceMatrix.needsUpdate = true;
  root.add(palmFrondInst);
  dummy.rotation.order = 'XYZ';

  // =========================================================================
  // 6. REALISTIC BRANCHING TREES (Rain Trees, Gulmohar, Jacaranda)
  // =========================================================================
  const barkTex = createBarkTextures(maxAnisotropy);
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkTex.map,
    bumpMap: barkTex.bumpMap,
    bumpScale: 0.045,
    roughness: 0.92
  });

  const treeSpecs = [];
  function addTree(x, z, type) {
    if (Math.abs(x) < 29 && Math.abs(z) < 26) return;
    if (Math.abs(x) < 12 && z > 18 && z < 84) return;
    if (Math.hypot(x - -68, z - -76) < 24) return;
    if (Math.hypot(x - 38, z - 26) < 9) return;
    treeSpecs.push({ x, z, type, scale: 0.86 + rand() * 0.44, rotY: rand() * Math.PI * 2 });
  }

  const ringCoords = [
    [-42, 22, 'rain'], [-48, -14, 'gulmohar'], [-38, -38, 'jacaranda'],
    [42, -24, 'rain'], [46, 6, 'gulmohar'], [36, -42, 'rain'],
    [-22, 46, 'jacaranda'], [31, 52, 'gulmohar'], [-26, -46, 'rain'],
    [26, -46, 'jacaranda'], [-48, 42, 'rain'], [54, 34, 'rain'],
    [-58, 4, 'gulmohar'], [56, -4, 'jacaranda'],
    [-75, 32, 'rain'], [-82, -28, 'rain'], [-48, -72, 'gulmohar'],
    [-16, -68, 'rain'], [18, -68, 'gulmohar'], [56, -68, 'rain'],
    [76, -34, 'jacaranda'], [84, 14, 'rain'], [74, 52, 'gulmohar'],
    [42, 74, 'rain'], [22, 78, 'jacaranda'], [-22, 78, 'rain'],
    [-46, 72, 'gulmohar'], [-76, 64, 'rain'], [-96, 10, 'jacaranda'],
    [-95, -52, 'rain'], [96, -12, 'rain'], [92, -60, 'gulmohar'],
    [0, -86, 'rain'], [-28, -94, 'jacaranda'], [32, -92, 'rain']
  ];
  for (const [tx, tz, type] of ringCoords) addTree(tx, tz, type);

  const TYPES = ['rain', 'rain', 'gulmohar', 'jacaranda'];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const r = 82 + rand() * 42;
    addTree(Math.cos(a) * r, Math.sin(a) * r, TYPES[i % TYPES.length]);
  }

  // Build 2 organic branching skeleton templates per species
  const templates = {
    rain: [createTreeSkeletonTemplate('rain', 101), createTreeSkeletonTemplate('rain', 102)],
    gulmohar: [createTreeSkeletonTemplate('gulmohar', 201), createTreeSkeletonTemplate('gulmohar', 202)],
    jacaranda: [createTreeSkeletonTemplate('jacaranda', 301), createTreeSkeletonTemplate('jacaranda', 302)]
  };

  const skeletonGroups = {
    'rain-0': [],
    'rain-1': [],
    'gulmohar-0': [],
    'gulmohar-1': [],
    'jacaranda-0': [],
    'jacaranda-1': []
  };
  const foliageCards = { rain: [], gulmohar: [], jacaranda: [] };
  const petalDropDecals = [];

  const tipWorld = new THREE.Vector3();
  const quatY = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);

  treeSpecs.forEach((t, idx) => {
    const variant = idx % 2;
    skeletonGroups[`${t.type}-${variant}`].push(t);
    const tpl = templates[t.type][variant];
    quatY.setFromAxisAngle(yAxis, t.rotY);

    // Anchor ~55-75 airy leafy clusters directly around the bough & limb tips
    for (const tip of tpl.canopyTips) {
      // Base cluster + 1-2 surrounding overlapping sub-clusters
      const count = tip.isCrownTop ? 2 : 2;
      for (let c = 0; c < count; c++) {
        tipWorld.copy(tip.pos);
        if (c > 0) {
          tipWorld.x += (rand() - 0.5) * 1.4;
          tipWorld.y += (rand() - 0.35) * 0.9;
          tipWorld.z += (rand() - 0.5) * 1.4;
        }
        tipWorld.multiplyScalar(t.scale).applyQuaternion(quatY);
        tipWorld.x += t.x;
        tipWorld.z += t.z;

        const tint = tip.isCrownTop
          ? new THREE.Color().setRGB(0.95 + rand() * 0.05, 0.95 + rand() * 0.05, 0.88 + rand() * 0.08)
          : new THREE.Color().setRGB(0.72 + rand() * 0.14, 0.78 + rand() * 0.14, 0.72 + rand() * 0.12);

        foliageCards[t.type].push({
          x: tipWorld.x,
          y: tipWorld.y,
          z: tipWorld.z,
          scale: tip.scale * t.scale * (0.78 + rand() * 0.34),
          rx: (rand() - 0.5) * 0.35,
          ry: rand() * Math.PI * 2,
          rz: (rand() - 0.5) * 0.35,
          color: tint
        });
      }
    }

    // Subtle fallen blossom petal halo under Gulmohar & Jacaranda trees
    if (t.type === 'gulmohar' || t.type === 'jacaranda') {
      const col = t.type === 'gulmohar' ? new THREE.Color('#e34922') : new THREE.Color('#8e74d9');
      for (let p = 0; p < 14; p++) {
        const pa = rand() * Math.PI * 2;
        const pr = 1.4 + rand() * 4.5 * t.scale;
        petalDropDecals.push({
          x: t.x + Math.cos(pa) * pr,
          z: t.z + Math.sin(pa) * pr,
          s: 0.45 + rand() * 0.55,
          color: col
        });
      }
    }
  });

  // Render instanced branching skeletons
  for (const species of ['rain', 'gulmohar', 'jacaranda']) {
    for (let v = 0; v < 2; v++) {
      const list = skeletonGroups[`${species}-${v}`];
      if (!list.length) continue;
      const inst = new THREE.InstancedMesh(templates[species][v].geometry, barkMat, list.length);
      inst.castShadow = true;
      inst.receiveShadow = true;
      list.forEach((t, i) => {
        dummy.position.set(t.x, 0, t.z);
        dummy.rotation.set(0, t.rotY, 0);
        dummy.scale.setScalar(t.scale);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      root.add(inst);
    }
  }

  // Render 3 instanced alpha-cutout leafy canopies with wind sway & dappled shadows
  const foliageTexMap = {
    rain: rainFoliageTex,
    gulmohar: createTreeFoliageTexture('gulmohar', maxAnisotropy),
    jacaranda: createTreeFoliageTexture('jacaranda', maxAnisotropy)
  };

  for (const species of ['rain', 'gulmohar', 'jacaranda']) {
    const cards = foliageCards[species];
    if (!cards.length) continue;
    const tex = foliageTexMap[species];
    const mat = applyWindSway(
      new THREE.MeshStandardMaterial({
        map: tex,
        alphaTest: 0.42,
        transparent: false,
        depthWrite: true,
        roughness: 0.78,
        side: THREE.DoubleSide
      }),
      windUniforms,
      0.13,
      0.22
    );
    const depthMat = new THREE.MeshDepthMaterial({
      map: tex,
      alphaTest: 0.42,
      depthPacking: THREE.RGBADepthPacking
    });

    const inst = new THREE.InstancedMesh(clusterGeo, mat, cards.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    inst.customDepthMaterial = depthMat;
    cards.forEach((c, idx) => {
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rx, c.ry, c.rz);
      dummy.scale.set(c.scale, c.scale * (species === 'rain' ? 0.72 : 0.82), c.scale);
      dummy.updateMatrix();
      inst.setMatrixAt(idx, dummy.matrix);
      inst.setColorAt(idx, c.color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    root.add(inst);
  }

  // Fallen blossom ground decals beneath Gulmohar & Jacaranda
  if (petalDropDecals.length) {
    const dropGeo = new THREE.CircleGeometry(0.42, 7);
    dropGeo.rotateX(-Math.PI * 0.5);
    const dropInst = new THREE.InstancedMesh(
      dropGeo,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.65 }),
      petalDropDecals.length
    );
    petalDropDecals.forEach((d, idx) => {
      dummy.position.set(d.x, 0.025, d.z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      dropInst.setMatrixAt(idx, dummy.matrix);
      dropInst.setColorAt(idx, d.color);
    });
    dropInst.instanceMatrix.needsUpdate = true;
    if (dropInst.instanceColor) dropInst.instanceColor.needsUpdate = true;
    root.add(dropInst);
  }

  // =========================================================================
  // 7. REALISTIC BAMBOO GROVES (Nodal Culms + Arching Bamboo Leaf Sprays)
  // =========================================================================
  const bambooCulmTex = createBambooCulmTexture(maxAnisotropy);
  const bambooLeafTex = createBambooLeafTexture(maxAnisotropy);
  const bambooCulmMat = new THREE.MeshStandardMaterial({ map: bambooCulmTex, roughness: 0.6 });
  const bambooLeafMat = applyWindSway(
    new THREE.MeshStandardMaterial({
      map: bambooLeafTex,
      alphaTest: 0.42,
      roughness: 0.68,
      side: THREE.DoubleSide
    }),
    windUniforms,
    0.16,
    0.35
  );
  const bambooLeafDepthMat = new THREE.MeshDepthMaterial({
    map: bambooLeafTex,
    alphaTest: 0.42,
    depthPacking: THREE.RGBADepthPacking
  });

  // Gently curved culm template
  const culmCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.08, 0.5, 0.04),
    new THREE.Vector3(0.28, 1.0, 0.14)
  ]);
  const culmGeo = createTaperedBranchGeo(culmCurve, 8, 0.1, 0.045, 7);

  const bambooSpecs = [];
  const bambooLeafTransforms = [];
  for (const [bx, bz] of [
    [-35, 12],
    [35, -12],
    [-28, -32],
    [30, 38]
  ]) {
    for (let k = 0; k < 14; k++) {
      const cx = bx + (rand() - 0.5) * 2.5;
      const cz = bz + (rand() - 0.5) * 2.5;
      const h = 6.5 + rand() * 3.5;
      const rotY = rand() * Math.PI * 2;
      bambooSpecs.push({ x: cx, z: cz, h, rotY });

      // 4 cascading bamboo leaf sprays along upper half of each culm
      for (let s = 0; s < 4; s++) {
        const frac = 0.52 + (s / 3) * 0.44;
        const pt = culmCurve.getPointAt(frac);
        const wx = cx + (pt.x * Math.cos(rotY) - pt.z * Math.sin(rotY)) * (h * 0.25);
        const wz = cz + (pt.x * Math.sin(rotY) + pt.z * Math.cos(rotY)) * (h * 0.25);
        bambooLeafTransforms.push({
          x: wx,
          y: pt.y * h,
          z: wz,
          ry: rotY + s * 1.4 + rand() * 0.5,
          scale: 1.55 + rand() * 0.5
        });
      }
    }
  }

  const bambooCulmInst = new THREE.InstancedMesh(culmGeo, bambooCulmMat, bambooSpecs.length);
  bambooCulmInst.castShadow = true;
  bambooSpecs.forEach((b, idx) => {
    dummy.position.set(b.x, 0, b.z);
    dummy.rotation.set(0, b.rotY, 0);
    dummy.scale.set(1, b.h, 1);
    dummy.updateMatrix();
    bambooCulmInst.setMatrixAt(idx, dummy.matrix);
  });
  bambooCulmInst.instanceMatrix.needsUpdate = true;
  root.add(bambooCulmInst);

  const bambooSprayGeo = new THREE.PlaneGeometry(1.15, 1.15);
  bambooSprayGeo.rotateX(0.35);
  const bambooLeafInst = new THREE.InstancedMesh(bambooSprayGeo, bambooLeafMat, bambooLeafTransforms.length);
  bambooLeafInst.castShadow = true;
  bambooLeafInst.customDepthMaterial = bambooLeafDepthMat;
  bambooLeafTransforms.forEach((bl, idx) => {
    dummy.position.set(bl.x, bl.y, bl.z);
    dummy.rotation.set(0.25, bl.ry, 0);
    dummy.scale.setScalar(bl.scale);
    dummy.updateMatrix();
    bambooLeafInst.setMatrixAt(idx, dummy.matrix);
  });
  bambooLeafInst.instanceMatrix.needsUpdate = true;
  root.add(bambooLeafInst);

  // =========================================================================
  // 8. BOUGAINVILLEA FLOWERING SHRUBS & ~1,200 3D SWAYING GRASS TUFTS
  // =========================================================================
  const bougTex = createTreeFoliageTexture('bougainvillea', maxAnisotropy);
  const bougMat = applyWindSway(
    new THREE.MeshStandardMaterial({
      map: bougTex,
      alphaTest: 0.42,
      roughness: 0.72,
      side: THREE.DoubleSide
    }),
    windUniforms,
    0.08,
    0.35
  );
  const bougDepthMat = new THREE.MeshDepthMaterial({
    map: bougTex,
    alphaTest: 0.42,
    depthPacking: THREE.RGBADepthPacking
  });

  const bougClusters = [];
  const shrubCenters = [
    [-7.6, 20.5], [7.6, 20.5],
    [-25.5, 13.5], [25.5, 13.5],
    [-25.5, -13.5], [25.5, -13.5],
    [-7.6, -21.5], [7.6, -21.5],
    [32.5, 22.5], [43.5, 22.5], [38.0, 32.5],
    [-55.0, -64.0], [-74.0, -58.0], [-61.0, -56.0]
  ];
  for (const [sx, sz] of shrubCenters) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
      const r = k === 0 ? 0 : 0.65 + rand() * 0.55;
      bougClusters.push({
        x: sx + Math.cos(a) * r,
        y: k === 0 ? 0.75 : 0.55 + rand() * 0.25,
        z: sz + Math.sin(a) * r,
        s: k === 0 ? 1.45 : 1.05 + rand() * 0.35
      });
    }
  }
  const bougInst = new THREE.InstancedMesh(clusterGeo, bougMat, bougClusters.length);
  bougInst.castShadow = true;
  bougInst.customDepthMaterial = bougDepthMat;
  bougClusters.forEach((b, idx) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(b.s);
    dummy.updateMatrix();
    bougInst.setMatrixAt(idx, dummy.matrix);
  });
  bougInst.instanceMatrix.needsUpdate = true;
  root.add(bougInst);

  // ~1,200 Instanced 3D Crossed Grass Tufts hugging curbs, roots, fountain & rock base
  const grassTex = createGrassTuftTexture(maxAnisotropy);
  const grassMat = applyWindSway(
    new THREE.MeshStandardMaterial({
      map: grassTex,
      alphaTest: 0.42,
      roughness: 0.78,
      side: THREE.DoubleSide
    }),
    windUniforms,
    0.1,
    0.95
  );
  const grassParts = [];
  for (let i = 0; i < 2; i++) {
    const gPlane = new THREE.PlaneGeometry(0.75, 0.38);
    gPlane.translate(0, 0.19, 0);
    gPlane.rotateY(i * Math.PI * 0.5 + 0.4);
    grassParts.push(gPlane.toNonIndexed());
  }
  const grassTuftGeo = mergeGeometries(grassParts, false);

  const grassTransforms = [];
  // Along front promenade curbs (x = ±6.3, z = 26..75)
  for (let i = 0; i < 180; i++) {
    const side = i % 2 === 0 ? -6.2 : 6.2;
    grassTransforms.push({
      x: side + (rand() - 0.5) * 0.7,
      z: 26 + rand() * 48,
      s: 0.75 + rand() * 0.55
    });
  }
  // Around fountain plaza curb (r = 9.9..10.6 around (0, 34))
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    const r = 9.9 + rand() * 0.65;
    if (Math.abs(Math.cos(a) * r) < 6.0) continue; // keep gravel path clear
    grassTransforms.push({ x: Math.cos(a) * r, z: 34 + Math.sin(a) * r, s: 0.8 + rand() * 0.5 });
  }
  // Around Glass House plinth perimeter & flowerbed edges
  for (let i = 0; i < 220; i++) {
    const a = rand() * Math.PI * 2;
    const rx = 25.5 + rand() * 14;
    const rz = 22.5 + rand() * 14;
    const gx = Math.cos(a) * rx;
    const gz = Math.sin(a) * rz;
    if (Math.abs(gx) < 24.4 && Math.abs(gz) < 21.4) continue;
    if (Math.abs(gx) < 6.4 && gz > 20) continue;
    grassTransforms.push({ x: gx, z: gz, s: 0.7 + rand() * 0.65 });
  }
  // Around tree buttresses & Lalbagh Rock base
  for (const t of treeSpecs) {
    for (let k = 0; k < 8; k++) {
      const a = rand() * Math.PI * 2;
      const r = 0.8 + rand() * 1.8 * t.scale;
      grassTransforms.push({ x: t.x + Math.cos(a) * r, z: t.z + Math.sin(a) * r, s: 0.8 + rand() * 0.6 });
    }
  }
  for (let i = 0; i < 120; i++) {
    const a = rand() * Math.PI * 2;
    const r = 15 + rand() * 7;
    grassTransforms.push({ x: -68 + Math.cos(a) * r, z: -76 + Math.sin(a) * r, s: 0.9 + rand() * 0.7 });
  }

  const grassInst = new THREE.InstancedMesh(grassTuftGeo, grassMat, grassTransforms.length);
  grassTransforms.forEach((gt, idx) => {
    dummy.position.set(gt.x, 0, gt.z);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.setScalar(gt.s);
    dummy.updateMatrix();
    grassInst.setMatrixAt(idx, dummy.matrix);
  });
  grassInst.instanceMatrix.needsUpdate = true;
  root.add(grassInst);

  // =========================================================================
  // 9. ICONIC LANDMARKS: LALBAGH ROCK + KEMPEGOWDA TOWER & BANDSTAND
  // =========================================================================
  const rockGroup = new THREE.Group();
  rockGroup.position.set(-68, 0, -76);
  root.add(rockGroup);

  const rockMat = new THREE.MeshStandardMaterial({
    map: graniteTex.map,
    bumpMap: graniteTex.bumpMap,
    bumpScale: 0.08,
    color: 0x797671,
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true
  });

  const rockGeo = new THREE.IcosahedronGeometry(1.0, 2);
  const rPos = rockGeo.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const vx = rPos.getX(i);
    const vy = rPos.getY(i);
    const vz = rPos.getZ(i);
    const ridge = 1.0 + Math.sin(vx * 3.8 + vz * 2.9) * 0.16 + Math.cos(vy * 6.5) * 0.1;
    rPos.setXYZ(i, vx * ridge, vy * ridge, vz * ridge);
  }
  rockGeo.computeVertexNormals();

  const rockLobes = [
    [0, 5.2, 0, 17.5, 9.2, 14.5, 0.2],
    [-9.5, 3.0, 6.2, 11.5, 6.4, 9.5, -0.45],
    [10.2, 3.6, -4.5, 12.2, 7.2, 10.2, 0.55],
    [-4.2, 4.4, -8.5, 9.5, 6.8, 8.8, 1.1],
    [5.0, 7.6, 4.5, 9.2, 5.8, 7.5, -0.3],
    [0, 11.0, 0, 8.2, 5.9, 7.8, 0.12]
  ];
  for (const [rx, ry, rz, sx, sy, sz, rot] of rockLobes) {
    const lobe = new THREE.Mesh(rockGeo, rockMat);
    lobe.position.set(rx, ry, rz);
    lobe.scale.set(sx, sy, sz);
    lobe.rotation.y = rot;
    lobe.castShadow = true;
    lobe.receiveShadow = true;
    rockGroup.add(lobe);
  }

  // Leafy scrub clusters around rock base
  const rockScrubInst = new THREE.InstancedMesh(clusterGeo, hedgeTuftMat, 14);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.3;
    const d = 14.5 + (i % 3) * 2.5;
    dummy.position.set(Math.cos(a) * d, 1.2, Math.sin(a) * d);
    dummy.rotation.set(0, rand() * Math.PI * 2, 0);
    dummy.scale.set(2.8, 1.8, 2.8);
    dummy.updateMatrix();
    rockScrubInst.setMatrixAt(i, dummy.matrix);
  }
  rockScrubInst.instanceMatrix.needsUpdate = true;
  rockGroup.add(rockScrubInst);

  // Kempegowda Watchtower
  const tower = new THREE.Group();
  tower.position.set(0, 16.5, 0);
  rockGroup.add(tower);

  const mantapaBase = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.0, 6.2), ftnStoneMat);
  mantapaBase.position.y = 0.5;
  mantapaBase.castShadow = true;
  tower.add(mantapaBase);

  for (const px of [-2.1, 2.1]) {
    for (const pz of [-2.1, 2.1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 4.2, 8), ftnStoneMat);
      col.position.set(px, 3.1, pz);
      col.castShadow = true;
      tower.add(col);
    }
  }

  const mantapaRoof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.5, 6.6), ftnStoneMat);
  mantapaRoof.position.y = 5.4;
  tower.add(mantapaRoof);

  const shikhara1 = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 4), curbMat);
  shikhara1.rotation.y = Math.PI * 0.25;
  shikhara1.position.y = 6.95;
  tower.add(shikhara1);

  const kalasha = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd9b35d, roughness: 0.3, metalness: 0.85 })
  );
  kalasha.position.y = 8.45;
  tower.add(kalasha);

  // Victorian Bandstand at (38, 0, 26)
  const bandstand = new THREE.Group();
  bandstand.position.set(38, 0, 26);
  root.add(bandstand);

  const bsPlinth = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.9, 8), ftnStoneMat);
  bsPlinth.position.y = 0.45;
  bsPlinth.castShadow = true;
  bsPlinth.receiveShadow = true;
  bandstand.add(bsPlinth);

  const bsIronMat = new THREE.MeshStandardMaterial({ color: 0xf0ede2, roughness: 0.44, metalness: 0.28 });
  const bsRoofMat = new THREE.MeshStandardMaterial({ color: 0x1c4535, roughness: 0.52, metalness: 0.25 });

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 3.4, 10), bsIronMat);
    col.position.set(Math.cos(a) * 4.0, 2.6, Math.sin(a) * 4.0);
    col.castShadow = true;
    bandstand.add(col);
  }
  const bsRoof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 2.4, 8), bsRoofMat);
  bsRoof.position.y = 5.45;
  bsRoof.rotation.y = Math.PI / 8;
  bsRoof.castShadow = true;
  bandstand.add(bsRoof);

  const bsFinial = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.0, 8), bsIronMat);
  bsFinial.position.y = 7.05;
  bandstand.add(bsFinial);

  // =========================================================================
  // 10. VICTORIAN CAST-IRON PARK LAMPS
  // =========================================================================
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x173227, roughness: 0.46, metalness: 0.45 });
  const lampGlobeMat = new THREE.MeshStandardMaterial({
    color: 0xfff4d6,
    emissive: new THREE.Color(0xffbd63),
    emissiveIntensity: 0.25,
    roughness: 0.25
  });
  lampGlobes.push(lampGlobeMat);

  function addParkLamp(x, z) {
    const lg = new THREE.Group();
    lg.position.set(x, 0, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.85, 10), lampPostMat);
    base.position.y = 0.425;
    base.castShadow = true;
    lg.add(base);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.1, 10), lampPostMat);
    pole.position.y = 2.35;
    pole.castShadow = true;
    lg.add(pole);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), lampGlobeMat);
    globe.position.y = 4.05;
    lg.add(globe);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.22, 10), lampPostMat);
    cap.position.y = 4.32;
    lg.add(cap);

    root.add(lg);
  }

  for (const lz of [30, 42, 54, 66]) {
    addParkLamp(-6.8, lz);
    addParkLamp(6.8, lz);
  }
  for (const lx of [-32, -44, 32, 44]) {
    addParkLamp(lx, -4.3);
    addParkLamp(lx, 4.3);
  }

  // =========================================================================
  // 11. SUNLIT DUST MOTES & FLOATING PETALS
  // =========================================================================
  const moteCount = 220;
  const motePos = new Float32Array(moteCount * 3);
  const moteData = [];
  for (let i = 0; i < moteCount; i++) {
    const x = (rand() - 0.5) * 42;
    const y = 2.0 + rand() * 11.5;
    const z = (rand() - 0.5) * 34;
    motePos[i * 3] = x;
    motePos[i * 3 + 1] = y;
    motePos[i * 3 + 2] = z;
    moteData.push({ x, y, z, phase: rand() * Math.PI * 2, speed: 0.35 + rand() * 0.5 });
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const dustMotes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      map: glowTex,
      color: 0xffe4a8,
      size: 0.22,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  root.add(dustMotes);

  const petalTex = createPetalTexture();
  const petalCount = 120;
  const petalPos = new Float32Array(petalCount * 3);
  const petalData = [];
  for (let i = 0; i < petalCount; i++) {
    const x = (rand() - 0.5) * 56;
    const y = 0.6 + rand() * 9.0;
    const z = (rand() - 0.5) * 60 + 12;
    petalPos[i * 3] = x;
    petalPos[i * 3 + 1] = y;
    petalPos[i * 3 + 2] = z;
    petalData.push({ x, y, z, fallSpeed: 0.35 + rand() * 0.4, phase: rand() * Math.PI * 2 });
  }
  const petalGeo = new THREE.BufferGeometry();
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
  const petalPoints = new THREE.Points(
    petalGeo,
    new THREE.PointsMaterial({
      map: petalTex,
      size: 0.28,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    })
  );
  root.add(petalPoints);

  function update(dt, elapsed) {
    waterUniforms.uTime.value = elapsed;
    windUniforms.uTime.value = elapsed;

    const sp = sprayGeo.attributes.position.array;
    for (let i = 0; i < sprayCount; i++) {
      const m = sprayMeta[i];
      const t = (elapsed * m.speed + m.phase) % 1.0;
      if (m.isCenter) {
        const y = 2.85 + Math.sin(t * Math.PI) * 2.45;
        const r = t * 0.65;
        sp[i * 3] = Math.cos(m.ang) * r;
        sp[i * 3 + 1] = y;
        sp[i * 3 + 2] = Math.sin(m.ang) * r;
      } else {
        const r = 0.35 + t * 2.65;
        const y = 2.55 + Math.sin(t * Math.PI) * 1.15 - t * 2.02;
        sp[i * 3] = Math.cos(m.ang) * r;
        sp[i * 3 + 1] = Math.max(0.58, y);
        sp[i * 3 + 2] = Math.sin(m.ang) * r;
      }
    }
    sprayGeo.attributes.position.needsUpdate = true;

    const mp = moteGeo.attributes.position.array;
    for (let i = 0; i < moteCount; i++) {
      const m = moteData[i];
      mp[i * 3] = m.x + Math.sin(elapsed * m.speed + m.phase) * 0.45;
      mp[i * 3 + 1] = m.y + Math.cos(elapsed * 0.4 + m.phase) * 0.32;
      mp[i * 3 + 2] = m.z + Math.sin(elapsed * 0.3 + m.phase * 1.3) * 0.45;
    }
    moteGeo.attributes.position.needsUpdate = true;

    const pp = petalGeo.attributes.position.array;
    for (let i = 0; i < petalCount; i++) {
      const p = petalData[i];
      p.y -= p.fallSpeed * dt;
      if (p.y < 0.15) p.y = 9.5;
      pp[i * 3] = p.x + Math.sin(elapsed * 0.6 + p.phase) * 1.1;
      pp[i * 3 + 1] = p.y;
      pp[i * 3 + 2] = p.z + Math.cos(elapsed * 0.5 + p.phase) * 0.9;
    }
    petalGeo.attributes.position.needsUpdate = true;
  }

  return {
    group: root,
    lampGlobes,
    update
  };
}
