import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createBloomRosetteTexture,
  createCurvedPalmFrondGeo,
  createFernFrondTexture,
  createPalmFrondTexture,
  createPalmTrunkTexture
} from './foliageTextures.js';

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
 * Sculpted 3D cupped multi-petal flower head mapped with a radial rosette texture.
 * Looks richly layered from side, low, and overhead angles instead of smooth balls.
 */
function createFlowerHeadGeo() {
  const outer = new THREE.CircleGeometry(0.125, 12);
  outer.rotateX(-Math.PI * 0.5);
  const oPos = outer.attributes.position;
  for (let i = 0; i < oPos.count; i++) {
    const x = oPos.getX(i);
    const z = oPos.getZ(i);
    const r = Math.hypot(x, z);
    const ang = Math.atan2(z, x);
    // Cupped bowl + subtle 6-petal ruffle
    const cup = (r / 0.125) * 0.048 + Math.sin(ang * 6) * (r / 0.125) * 0.014;
    oPos.setY(i, cup - 0.015);
  }
  outer.computeVertexNormals();

  const innerA = new THREE.CircleGeometry(0.088, 10);
  innerA.rotateX(-Math.PI * 0.25);
  innerA.translate(0, 0.036, 0.01);

  const innerB = new THREE.CircleGeometry(0.088, 10);
  innerB.rotateX(Math.PI * 0.25);
  innerB.rotateY(Math.PI * 0.5);
  innerB.translate(0, 0.036, -0.01);

  const merged = mergeGeometries([outer.toNonIndexed(), innerA.toNonIndexed(), innerB.toNonIndexed()], false);
  merged.computeVertexNormals();
  return merged;
}

/**
 * Curved arching fern frond card anchored at (0, 0, 0), cascading forward along +Z.
 */
function createCurvedFernGeo(width = 0.42, length = 0.56, lift = 0.14, droop = 0.22) {
  const geo = new THREE.PlaneGeometry(width, length, 3, 5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + length * 0.5) / length; // 0 at base -> 1 at tip
    const z = t * length;
    const fy = Math.sin(t * Math.PI * 0.7) * lift - t * t * droop - Math.abs(x) * 0.12;
    pos.setXYZ(i, x, fy, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds both the Flower Show Exhibition (default) and the Botanical Conservatory
 * interior modes, with textured cupped flower rosettes, serrated ferns,
 * curved cambered Areca palms, and exotic Bird-of-Paradise displays.
 */
export function buildInteriorDisplays(maxAnisotropy = 8) {
  const root = new THREE.Group();
  root.name = 'InteriorDisplays';

  const flowerShowGroup = new THREE.Group();
  flowerShowGroup.name = 'FlowerShowGroup';
  root.add(flowerShowGroup);

  const conservatoryGroup = new THREE.Group();
  conservatoryGroup.name = 'ConservatoryGroup';
  conservatoryGroup.visible = false;
  root.add(conservatoryGroup);

  const rand = mulberry32(1935);

  const PALETTE = [
    new THREE.Color('#d62839'), // crimson rose
    new THREE.Color('#ff8c1a'), // saffron marigold
    new THREE.Color('#ffd028'), // golden chrysanthemum
    new THREE.Color('#d4378b'), // magenta dahlia
    new THREE.Color('#fff5db'), // ivory jasmine
    new THREE.Color('#f25268')  // coral pink
  ];
  const FOLIAGE_PALETTE = [
    new THREE.Color('#2f6b2e'),
    new THREE.Color('#3b7e37'),
    new THREE.Color('#255926')
  ];

  // Textures & Shared Materials
  const rosetteTex = createBloomRosetteTexture(maxAnisotropy);
  const fernTex = createFernFrondTexture(maxAnisotropy);
  const palmFrondTex = createPalmFrondTexture(maxAnisotropy);
  const palmTrunkTex = createPalmTrunkTexture(maxAnisotropy);

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9b15c, roughness: 0.28, metalness: 0.85 });
  const velvetMat = new THREE.MeshStandardMaterial({ color: 0x731823, roughness: 0.78, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d3d28, roughness: 0.72, metalness: 0.08 });
  const darkIronMat = new THREE.MeshStandardMaterial({ color: 0x1e382e, roughness: 0.48, metalness: 0.35 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb75b39, roughness: 0.78, metalness: 0.04 });
  const darkMossMat = new THREE.MeshStandardMaterial({ color: 0x1e4420, roughness: 0.9, metalness: 0.02 });
  const fernLeafMat = new THREE.MeshStandardMaterial({
    map: fernTex,
    alphaTest: 0.42,
    roughness: 0.65,
    side: THREE.DoubleSide
  });

  // =========================================================================
  // 1. FLOWER SHOW EXHIBITION (Cupped Rosettes + Serrated Ferns + Monument)
  // =========================================================================
  const bloomTransforms = [];
  const leafTransforms = [];
  const upVec = new THREE.Vector3(0, 1, 0);
  const tmpNormal = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();

  function addBloom(x, y, z, scale = 1, colorIdx = null, normalVec = null) {
    const c =
      colorIdx !== null
        ? PALETTE[colorIdx % PALETTE.length]
        : PALETTE[Math.floor(rand() * PALETTE.length)];
    let rx, ry, rz;
    if (normalVec) {
      tmpNormal.copy(normalVec).normalize();
      tmpQuat.setFromUnitVectors(upVec, tmpNormal);
      tmpEuler.setFromQuaternion(tmpQuat);
      rx = tmpEuler.x + (rand() - 0.5) * 0.25;
      ry = tmpEuler.y + rand() * Math.PI * 2;
      rz = tmpEuler.z + (rand() - 0.5) * 0.25;
    } else {
      rx = (rand() - 0.5) * 0.5;
      ry = rand() * Math.PI * 2;
      rz = (rand() - 0.5) * 0.5;
    }
    bloomTransforms.push({
      x,
      y,
      z,
      sx: scale * (0.9 + rand() * 0.3),
      sy: scale * (0.9 + rand() * 0.25),
      sz: scale * (0.9 + rand() * 0.3),
      rx,
      ry,
      rz,
      color: c
    });
  }

  function addLeaf(x, y, z, scale = 1, rotY = null) {
    const c = FOLIAGE_PALETTE[Math.floor(rand() * FOLIAGE_PALETTE.length)];
    leafTransforms.push({
      x,
      y,
      z,
      scale: scale * (0.85 + rand() * 0.35),
      rx: (rand() - 0.5) * 0.35,
      ry: rotY !== null ? rotY : rand() * Math.PI * 2,
      rz: (rand() - 0.5) * 0.35,
      color: c
    });
  }

  // --- Central Crossing Floral Monument Pavilion at (0, 1.2, 0) ---
  const monument = new THREE.Group();
  monument.position.set(0, 1.2, 0);
  flowerShowGroup.add(monument);

  const tiers = [
    { r: 4.35, h: 0.52, y: 0.26, count: 1450, colorBand: 0 },
    { r: 3.35, h: 0.52, y: 0.78, count: 1120, colorBand: 1 },
    { r: 2.38, h: 0.52, y: 1.3, count: 840, colorBand: 2 }
  ];

  for (const tier of tiers) {
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(tier.r - 0.14, tier.r, tier.h, 8),
      darkMossMat
    );
    core.position.set(0, tier.y, 0);
    core.rotation.y = Math.PI / 8;
    core.castShadow = true;
    core.receiveShadow = true;
    monument.add(core);

    for (let i = 0; i < tier.count; i++) {
      const a = (i / tier.count) * Math.PI * 2 * 13 + (rand() - 0.5) * 0.2;
      const isRim = rand() > 0.42;
      const r = isRim ? tier.r - 0.65 + rand() * 0.65 : tier.r - 0.01;
      const by = isRim ? 1.2 + tier.y + tier.h * 0.5 + 0.04 : 1.2 + tier.y + (rand() - 0.5) * tier.h;
      const colorBand = (tier.colorBand + Math.floor((a % (Math.PI * 2)) / (Math.PI / 4))) % PALETTE.length;
      const nVec = isRim ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(Math.cos(a), 0.2, Math.sin(a));
      addBloom(Math.cos(a) * r, by, Math.sin(a) * r, 1.22, colorBand, nVec);
      if (i % 6 === 0) {
        addLeaf(Math.cos(a) * (r + 0.05), by - 0.04, Math.sin(a) * (r + 0.05), 0.85, Math.atan2(Math.cos(a), Math.sin(a)));
      }
    }
  }

  // Central inner floral pedestal core
  const centerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.25, 1.8, 12), darkMossMat);
  centerCore.position.set(0, 2.4, 0);
  centerCore.castShadow = true;
  monument.add(centerCore);
  for (let i = 0; i < 620; i++) {
    const h = rand() * 1.78;
    const r = 1.25 - (h / 1.78) * 0.3;
    const a = rand() * Math.PI * 2;
    const ringBand = Math.floor(h * 3) % 2 === 0 ? 4 : 0;
    addBloom(
      Math.cos(a) * r,
      1.2 + 1.55 + h,
      Math.sin(a) * r,
      1.12,
      ringBand,
      new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a))
    );
    if (i % 7 === 0) {
      addLeaf(Math.cos(a) * (r + 0.02), 1.2 + 1.55 + h, Math.sin(a) * (r + 0.02), 0.72, Math.atan2(Math.cos(a), Math.sin(a)));
    }
  }

  // 4 Garland-wrapped Floral Pillars + 4 Scalloped Floral Arches
  const pillarAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  for (const pa of pillarAngles) {
    const px = Math.cos(pa) * 1.95;
    const pz = Math.sin(pa) * 1.95;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.0, 10), darkMossMat);
    pillar.position.set(px, 3.05, pz);
    pillar.castShadow = true;
    monument.add(pillar);

    for (let i = 0; i < 160; i++) {
      const h = (i / 160) * 2.95;
      const spiral = pa + h * 7.2 + (i % 3) * 2.09;
      const bx = px + Math.cos(spiral) * 0.27;
      const bz = pz + Math.sin(spiral) * 0.27;
      addBloom(
        bx,
        1.2 + 1.55 + h,
        bz,
        1.05,
        i % 3 === 0 ? 1 : (i % 5 === 0 ? 4 : 0),
        new THREE.Vector3(Math.cos(spiral), 0.2, Math.sin(spiral))
      );
      if (i % 4 === 0) {
        addLeaf(bx, 1.2 + 1.55 + h, bz, 0.65, Math.atan2(Math.cos(spiral), Math.sin(spiral)));
      }
    }
  }

  for (let side = 0; side < 4; side++) {
    const a0 = pillarAngles[side];
    const a1 = pillarAngles[(side + 1) % 4];
    const p0 = new THREE.Vector3(Math.cos(a0) * 1.95, 4.45, Math.sin(a0) * 1.95);
    const p1 = new THREE.Vector3(Math.cos(a1) * 1.95, 4.45, Math.sin(a1) * 1.95);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    mid.y += 1.05;
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
    const archTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.2, 8, false), darkMossMat);
    monument.add(archTube);

    for (let s = 0; s <= 56; s++) {
      const pt = curve.getPoint(s / 56);
      for (let k = 0; k < 4; k++) {
        const jx = (rand() - 0.5) * 0.32;
        const jy = (rand() - 0.5) * 0.32;
        const jz = (rand() - 0.5) * 0.32;
        addBloom(pt.x + jx, 1.2 + pt.y + jy, pt.z + jz, 1.05, (s + k) % 4);
      }
    }
  }

  // Sculpted Lotus-Petal Floral Dome
  const domeCore = new THREE.Mesh(
    new THREE.SphereGeometry(2.05, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    darkMossMat
  );
  domeCore.scale.set(1, 1.12, 1);
  domeCore.position.set(0, 4.55, 0);
  domeCore.castShadow = true;
  monument.add(domeCore);

  const domeCount = 2200;
  for (let i = 0; i < domeCount; i++) {
    const t = (i + 0.5) / domeCount;
    const phi = Math.acos(1 - t * 0.998);
    const theta = i * 2.3999632 + (rand() - 0.5) * 0.08;
    const r = 2.09;
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    const bx = nx * r;
    const by = 1.2 + 4.55 + ny * r * 1.12;
    const bz = nz * r;
    const band = Math.floor((phi / (Math.PI * 0.5)) * 6) % PALETTE.length;
    addBloom(bx, by, bz, 1.2, band, new THREE.Vector3(nx, ny, nz));
    if (i % 7 === 0) {
      addLeaf(bx * 0.99, by, bz * 0.99, 0.72, Math.atan2(nx, nz));
    }
  }

  // Golden Kalasha Finial
  const kalashaBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 0.28, 12), goldMat);
  kalashaBase.position.set(0, 6.9, 0);
  monument.add(kalashaBase);
  const kalashaPot = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), goldMat);
  kalashaPot.position.set(0, 7.22, 0);
  monument.add(kalashaPot);
  const kalashaTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.52, 10), goldMat);
  kalashaTip.position.set(0, 7.66, 0);
  monument.add(kalashaTip);

  // Brass Stanchions & Velvet Ropes
  const stanchionCount = 12;
  const stanchionR = 4.95;
  const ropePts = [];
  for (let i = 0; i < stanchionCount; i++) {
    const a = (i / stanchionCount) * Math.PI * 2;
    const sx = Math.cos(a) * stanchionR;
    const sz = Math.sin(a) * stanchionR;
    ropePts.push(new THREE.Vector3(sx, 0.88, sz));

    const postBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12), goldMat);
    postBase.position.set(sx, 0.04, sz);
    monument.add(postBase);

    const postShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.92, 10), goldMat);
    postShaft.position.set(sx, 0.48, sz);
    monument.add(postShaft);

    const postBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), goldMat);
    postBall.position.set(sx, 0.96, sz);
    monument.add(postBall);
  }
  for (let i = 0; i < stanchionCount; i++) {
    const pA = ropePts[i];
    const pB = ropePts[(i + 1) % stanchionCount];
    const mid = pA.clone().add(pB).multiplyScalar(0.5);
    mid.y -= 0.22;
    const ropeCurve = new THREE.QuadraticBezierCurve3(pA, mid, pB);
    monument.add(new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 10, 0.032, 6, false), velvetMat));
  }

  // --- 4 Nave & Transept Floral Welcome Arches ---
  function buildFloralWelcomeArch(x, z, rotY) {
    const g = new THREE.Group();
    g.position.set(x, 1.2, z);
    g.rotation.y = rotY;

    const span = 2.6;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-span, 0, 0),
      new THREE.Vector3(-span, 3.0, 0),
      new THREE.Vector3(0, 4.45, 0),
      new THREE.Vector3(span, 3.0, 0),
      new THREE.Vector3(span, 0, 0)
    ]);
    const frame = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.16, 8, false), darkMossMat);
    frame.castShadow = true;
    g.add(frame);

    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    for (let i = 0; i <= 76; i++) {
      const pt = curve.getPoint(i / 76);
      const wx = x + pt.x * cosR + pt.z * sinR;
      const wz = z - pt.x * sinR + pt.z * cosR;
      for (let k = 0; k < 2; k++) {
        addBloom(
          wx + (rand() - 0.5) * 0.26,
          1.2 + pt.y + (rand() - 0.5) * 0.24,
          wz + (rand() - 0.5) * 0.26,
          0.95,
          (i + k) % 3 === 0 ? 1 : (i % 5 === 0 ? 4 : 0)
        );
      }
      if (i % 3 === 0) {
        addLeaf(wx + (rand() - 0.5) * 0.22, 1.2 + pt.y, wz + (rand() - 0.5) * 0.22, 0.85);
      }
    }
    flowerShowGroup.add(g);
  }

  buildFloralWelcomeArch(0, 7.6, 0);
  buildFloralWelcomeArch(0, -7.6, 0);
  buildFloralWelcomeArch(7.6, 0, Math.PI * 0.5);
  buildFloralWelcomeArch(-7.6, 0, Math.PI * 0.5);

  // --- Terraced Floral Display Stands ---
  function buildTerracedStand(cx, cz, len, rotY) {
    const sg = new THREE.Group();
    sg.position.set(cx, 1.2, cz);
    sg.rotation.y = rotY;

    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);

    for (let t = 0; t < 3; t++) {
      const w = 1.65 - t * 0.42;
      const h = 0.42;
      const y = 0.21 + t * 0.36;
      const box = new THREE.Mesh(new THREE.BoxGeometry(len, h, w), woodMat);
      box.position.set(0, y, 0);
      box.castShadow = true;
      box.receiveShadow = true;
      sg.add(box);

      const soil = new THREE.Mesh(new THREE.BoxGeometry(len - 0.08, 0.06, w - 0.08), darkMossMat);
      soil.position.set(0, y + h * 0.5 + 0.02, 0);
      sg.add(soil);

      const count = Math.floor(len * 24);
      for (let i = 0; i < count; i++) {
        const lx = (rand() - 0.5) * (len - 0.25);
        const lz = (rand() - 0.5) * (w - 0.22);
        const wx = cx + lx * cosR + lz * sinR;
        const wz = cz - lx * sinR + lz * cosR;
        const wy = 1.2 + y + h * 0.5 + 0.12 + rand() * 0.14;
        addBloom(wx, wy, wz, 0.92);
        if (i % 3 === 0) addLeaf(wx, wy - 0.06, wz, 0.85);
      }
    }

    flowerShowGroup.add(sg);
  }

  buildTerracedStand(-15.0, 9.6, 13.5, 0);
  buildTerracedStand(-15.0, -9.6, 13.5, 0);
  buildTerracedStand(15.0, 9.6, 13.5, 0);
  buildTerracedStand(15.0, -9.6, 13.5, 0);
  buildTerracedStand(-4.5, 14.5, 7.2, Math.PI * 0.5);
  buildTerracedStand(4.5, 14.5, 7.2, Math.PI * 0.5);
  buildTerracedStand(-4.5, -14.5, 7.2, Math.PI * 0.5);
  buildTerracedStand(4.5, -14.5, 7.2, Math.PI * 0.5);

  // --- Hanging Flower Baskets with Cascading Serrated Ferns ---
  const hangingBaskets = [];
  const bloomGeo = createFlowerHeadGeo();
  const basketFernGeo = createCurvedFernGeo(0.42, 0.62, 0.12, 0.34);

  function buildHangingBasket(x, yTop, z) {
    const bg = new THREE.Group();
    bg.position.set(x, yTop, z);

    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), darkIronMat);
    chain.position.set(0, -0.425, 0);
    bg.add(chain);

    const pot = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 10), terracottaMat);
    pot.rotation.x = Math.PI;
    pot.position.set(0, -1.05, 0);
    bg.add(pot);

    const moss = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), darkMossMat);
    moss.scale.set(1.1, 0.5, 1.1);
    moss.position.set(0, -0.84, 0);
    bg.add(moss);

    // Radiating serrated fern fronds spilling over the rim
    for (let f = 0; f < 8; f++) {
      const fa = (f / 8) * Math.PI * 2 + rand() * 0.2;
      const frond = new THREE.Mesh(basketFernGeo, fernLeafMat);
      frond.position.set(Math.cos(fa) * 0.22, -0.8, Math.sin(fa) * 0.22);
      frond.rotation.y = Math.atan2(Math.cos(fa), Math.sin(fa));
      bg.add(frond);
    }

    // Layered textured blooms on top
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 0.22 + rand() * 0.22;
      const b = new THREE.Mesh(
        bloomGeo,
        new THREE.MeshStandardMaterial({
          map: rosetteTex,
          color: PALETTE[i % PALETTE.length],
          roughness: 0.65,
          side: THREE.DoubleSide
        })
      );
      b.position.set(Math.cos(a) * r, -0.78 + (rand() - 0.3) * 0.18, Math.sin(a) * r);
      b.rotation.set((rand() - 0.5) * 0.6, a, (rand() - 0.5) * 0.6);
      b.scale.setScalar(0.95);
      bg.add(b);
    }

    flowerShowGroup.add(bg);
    hangingBaskets.push({ group: bg, phase: rand() * Math.PI * 2 });
  }

  for (const bx of [-18, -12, 12, 18]) {
    buildHangingBasket(bx, 5.55, 5.25);
    buildHangingBasket(bx, 5.55, -5.25);
  }
  for (const bz of [-15, -9, 9, 15]) {
    buildHangingBasket(5.25, 5.55, bz);
    buildHangingBasket(-5.25, 5.55, bz);
  }

  // --- Commit Instanced Cupped Rosette Blooms & Serrated Fern Leaves ---
  const bloomMat = new THREE.MeshStandardMaterial({
    map: rosetteTex,
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.03,
    side: THREE.DoubleSide
  });
  const bloomInst = new THREE.InstancedMesh(bloomGeo, bloomMat, bloomTransforms.length);
  bloomInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  bloomTransforms.forEach((b, idx) => {
    dummy.position.set(b.x, b.y, b.z);
    dummy.rotation.set(b.rx, b.ry, b.rz);
    dummy.scale.set(b.sx, b.sy, b.sz);
    dummy.updateMatrix();
    bloomInst.setMatrixAt(idx, dummy.matrix);
    bloomInst.setColorAt(idx, b.color);
  });
  bloomInst.instanceMatrix.needsUpdate = true;
  if (bloomInst.instanceColor) bloomInst.instanceColor.needsUpdate = true;
  flowerShowGroup.add(bloomInst);

  const leafGeo = createCurvedFernGeo(0.26, 0.38, 0.08, 0.14);
  const leafInstMat = new THREE.MeshStandardMaterial({
    map: fernTex,
    alphaTest: 0.42,
    color: 0xffffff,
    roughness: 0.68,
    side: THREE.DoubleSide
  });
  const leafInst = new THREE.InstancedMesh(leafGeo, leafInstMat, leafTransforms.length);
  leafTransforms.forEach((l, idx) => {
    dummy.position.set(l.x, l.y, l.z);
    dummy.rotation.set(l.rx, l.ry, l.rz);
    dummy.scale.setScalar(l.scale);
    dummy.updateMatrix();
    leafInst.setMatrixAt(idx, dummy.matrix);
    leafInst.setColorAt(idx, l.color);
  });
  leafInst.instanceMatrix.needsUpdate = true;
  if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;
  flowerShowGroup.add(leafInst);

  // =========================================================================
  // 2. BOTANICAL CONSERVATORY MODE (Curved Pinnate Palms, Ferns & Bird of Paradise)
  // =========================================================================
  const palmFrondSway = [];
  const palmTrunkMat = new THREE.MeshStandardMaterial({
    map: palmTrunkTex,
    roughness: 0.85
  });
  const palmFrondMat = new THREE.MeshStandardMaterial({
    map: palmFrondTex,
    alphaTest: 0.4,
    roughness: 0.56,
    side: THREE.DoubleSide
  });
  const paddleLeafMat = new THREE.MeshStandardMaterial({
    color: 0x26632a,
    roughness: 0.42,
    side: THREE.DoubleSide
  });
  const bopOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf4601a, roughness: 0.45, side: THREE.DoubleSide });
  const bopBlueMat = new THREE.MeshStandardMaterial({ color: 0x2d4de0, roughness: 0.4, side: THREE.DoubleSide });

  const potPalmFrondGeo = createCurvedPalmFrondGeo(1.75, 0.78, 0.56, 0.42);
  const potFernGeo = createCurvedFernGeo(0.46, 0.72, 0.24, 0.28);

  function addBirdOfParadise(parent, x, y, z, scale = 1.0) {
    const bop = new THREE.Group();
    bop.position.set(x, y, z);
    bop.scale.setScalar(scale);

    // Broad glossy paddle leaves fanning out
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.3;
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.8, 6), paddleLeafMat);
      stalk.position.set(Math.cos(a) * 0.14, 0.36, Math.sin(a) * 0.14);
      stalk.rotation.z = -Math.cos(a) * 0.36;
      stalk.rotation.x = Math.sin(a) * 0.36;
      bop.add(stalk);

      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.55), paddleLeafMat);
      blade.position.set(Math.cos(a) * 0.32, 0.75, Math.sin(a) * 0.32);
      blade.rotation.y = -a + Math.PI * 0.5;
      blade.rotation.x = -0.52;
      bop.add(blade);
    }

    // 2 Iconic Orange & Royal-Blue Crane Blossoms
    for (let f = 0; f < 2; f++) {
      const fa = f * 2.2 + 0.4;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.95, 6), paddleLeafMat);
      stem.position.set(Math.cos(fa) * 0.08, 0.48, Math.sin(fa) * 0.08);
      bop.add(stem);

      const spathe = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 5), paddleLeafMat);
      spathe.rotation.z = -Math.PI * 0.36;
      spathe.rotation.y = fa;
      spathe.position.set(Math.cos(fa) * 0.15, 0.96, Math.sin(fa) * 0.15);
      bop.add(spathe);

      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), bopOrangeMat);
      crest.position.set(Math.cos(fa) * 0.18, 1.04, Math.sin(fa) * 0.18);
      bop.add(crest);

      const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.12, 4), bopBlueMat);
      tongue.rotation.z = Math.PI * 0.25;
      tongue.position.set(Math.cos(fa) * 0.22, 1.03, Math.sin(fa) * 0.22);
      bop.add(tongue);
    }

    parent.add(bop);
  }

  function buildPottedPalm(x, z, scale = 1.0, withBop = false) {
    const pg = new THREE.Group();
    pg.position.set(x, 1.2, z);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56 * scale, 0.38 * scale, 0.78 * scale, 14),
      terracottaMat
    );
    pot.position.set(0, 0.39 * scale, 0);
    pot.castShadow = true;
    pot.receiveShadow = true;
    pg.add(pot);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.56 * scale, 0.055 * scale, 8, 18),
      terracottaMat
    );
    rim.rotation.x = Math.PI * 0.5;
    rim.position.set(0, 0.76 * scale, 0);
    pg.add(rim);

    // Multi-stemmed ringed Areca palm cluster
    const stems = scale > 1.2 ? 4 : 3;
    for (let s = 0; s < stems; s++) {
      const ang = (s / stems) * Math.PI * 2 + rand();
      const lean = 0.09 + rand() * 0.08;
      const h = (2.3 + rand() * 1.2) * scale;
      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ang) * 0.12, 0.68 * scale, Math.sin(ang) * 0.12),
        new THREE.Vector3(Math.cos(ang) * lean * h * 0.6, 0.68 * scale + h * 0.55, Math.sin(ang) * lean * h * 0.6),
        new THREE.Vector3(Math.cos(ang) * lean * h, 0.68 * scale + h, Math.sin(ang) * lean * h)
      ]);
      const stem = new THREE.Mesh(
        new THREE.TubeGeometry(stemCurve, 10, 0.044 * scale, 7, false),
        palmTrunkMat
      );
      stem.castShadow = true;
      pg.add(stem);

      const crownPos = stemCurve.getPoint(1);
      const crown = new THREE.Group();
      crown.position.copy(crownPos);
      const frondCount = 10;
      for (let f = 0; f < frondCount; f++) {
        const fa = (f / frondCount) * Math.PI * 2 + rand() * 0.3;
        const frond = new THREE.Mesh(potPalmFrondGeo, palmFrondMat);
        frond.rotation.y = fa;
        frond.rotation.x = (f % 2 === 0 ? -0.18 : 0.08) + (rand() - 0.5) * 0.1;
        frond.scale.setScalar(scale * (0.85 + rand() * 0.25));
        frond.castShadow = true;
        crown.add(frond);
      }
      pg.add(crown);
      palmFrondSway.push({ group: crown, phase: rand() * Math.PI * 2 });
    }

    // Lush serrated Boston Fern skirt spilling gracefully over the terracotta rim
    const fernCount = 10;
    for (let b = 0; b < fernCount; b++) {
      const ba = (b / fernCount) * Math.PI * 2 + rand() * 0.2;
      const frond = new THREE.Mesh(potFernGeo, fernLeafMat);
      frond.position.set(Math.cos(ba) * 0.26 * scale, 0.78 * scale, Math.sin(ba) * 0.26 * scale);
      frond.rotation.y = Math.atan2(Math.cos(ba), Math.sin(ba));
      frond.scale.setScalar(scale * 0.95);
      pg.add(frond);
    }

    if (withBop) {
      addBirdOfParadise(pg, 0.25 * scale, 0.76 * scale, 0.22 * scale, scale * 0.85);
    }

    conservatoryGroup.add(pg);
  }

  buildPottedPalm(0, 0, 1.32, true);
  for (const [px, pz, sc, bop] of [
    [-3.5, -3.5, 1.05, true],
    [3.5, -3.5, 1.05, true],
    [-3.5, 3.5, 1.05, false],
    [3.5, 3.5, 1.05, false],
    [-12, -4.5, 1.1, false],
    [-12, 4.5, 1.1, false],
    [12, -4.5, 1.1, false],
    [12, 4.5, 1.1, false],
    [-19, -8.5, 0.95, false],
    [-19, 8.5, 0.95, false],
    [19, -8.5, 0.95, false],
    [19, 8.5, 0.95, false],
    [-4.5, 12, 1.0, false],
    [4.5, 12, 1.0, false],
    [-4.5, -12, 1.0, false],
    [4.5, -12, 1.0, false]
  ]) {
    buildPottedPalm(px, pz, sc, bop);
  }

  // Victorian Cast-Iron & Teak Slat Benches
  function buildVictorianBench(x, z, rotY) {
    const bg = new THREE.Group();
    bg.position.set(x, 1.2, z);
    bg.rotation.y = rotY;

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.56), woodMat);
    seat.position.set(0, 0.46, 0);
    seat.castShadow = true;
    bg.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.44, 0.07), woodMat);
    back.position.set(0, 0.78, -0.24);
    back.rotation.x = -0.14;
    back.castShadow = true;
    bg.add(back);

    for (const lx of [-0.92, 0.92]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.52), darkIronMat);
      leg.position.set(lx, 0.23, 0);
      bg.add(leg);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.52), darkIronMat);
      arm.position.set(lx, 0.58, 0);
      bg.add(arm);
    }
    conservatoryGroup.add(bg);
  }

  for (const bx of [-15, -9, 9, 15]) {
    buildVictorianBench(bx, 5.2, 0);
    buildVictorianBench(bx, -5.2, Math.PI);
  }

  // Botanical Specimen Tables with Ferns & Bird-of-Paradise Pots
  for (const [tx, tz] of [
    [-16, 0],
    [16, 0],
    [0, -15],
    [0, 15]
  ]) {
    const tg = new THREE.Group();
    tg.position.set(tx, 1.2, tz);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), woodMat);
    top.position.set(0, 0.84, 0);
    top.castShadow = true;
    tg.add(top);

    for (const sx of [-1.05, 1.05]) {
      for (const sz of [-0.42, 0.42]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.84, 8), darkIronMat);
        leg.position.set(sx, 0.42, sz);
        tg.add(leg);
      }
    }

    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.28), goldMat);
    plaque.position.set(0, 0.9, 0.32);
    plaque.rotation.x = 0.35;
    tg.add(plaque);

    for (const px of [-0.55, 0, 0.55]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.24, 10), terracottaMat);
      pot.position.set(px, 1.0, -0.1);
      tg.add(pot);
      if (px === 0) {
        addBirdOfParadise(tg, 0, 1.08, -0.1, 0.55);
      } else {
        for (let f = 0; f < 5; f++) {
          const fa = (f / 5) * Math.PI * 2;
          const frond = new THREE.Mesh(potFernGeo, fernLeafMat);
          frond.position.set(px, 1.08, -0.1);
          frond.rotation.y = fa;
          frond.scale.setScalar(0.5);
          tg.add(frond);
        }
      }
    }

    conservatoryGroup.add(tg);
  }

  let currentMode = 'flower-show';
  function setDisplayMode(mode) {
    currentMode = mode === 'conservatory' ? 'conservatory' : 'flower-show';
    flowerShowGroup.visible = currentMode === 'flower-show';
    conservatoryGroup.visible = currentMode === 'conservatory';
  }

  function update(_dt, elapsed) {
    if (flowerShowGroup.visible) {
      for (const hb of hangingBaskets) {
        hb.group.rotation.z = Math.sin(elapsed * 0.9 + hb.phase) * 0.025;
        hb.group.rotation.x = Math.cos(elapsed * 0.7 + hb.phase) * 0.02;
      }
    }
    if (conservatoryGroup.visible) {
      for (const pf of palmFrondSway) {
        pf.group.rotation.z = Math.sin(elapsed * 0.75 + pf.phase) * 0.028;
      }
    }
  }

  return {
    group: root,
    setDisplayMode,
    getDisplayMode: () => currentMode,
    update,
    bloomCount: bloomTransforms.length
  };
}
