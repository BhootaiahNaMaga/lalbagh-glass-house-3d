import * as THREE from 'three';
import {
  createButterflyWingTexture,
  createPeacockTrainTexture
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
 * Builds authentic living Bengaluru / Lalbagh wildlife:
 * - 10 Rose-Ringed Parakeets (2 flocks wheeling overhead)
 * - 3 Indian Peacocks (strolling & fanning iridescent trains on the lawns)
 * - 4 Three-Striped Palm Squirrels (scurrying with stop-and-go tail flicks)
 * - 18 Painted Butterflies (Blue Mormon, Common Tiger, Crimson Rose)
 * - 6 Shimmering Fountain Dragonflies
 * - 8 Swimming Koi / Golden Carp inside the Victorian fountain basin
 */
export function buildLalbaghFauna(maxAnisotropy = 8) {
  const root = new THREE.Group();
  root.name = 'LalbaghFauna';
  const rand = mulberry32(2089);

  // =========================================================================
  // 1. 10 ROSE-RINGED PARAKEETS (Psittacula krameri)
  // =========================================================================
  const parakeets = [];
  const parakeetGreenMat = new THREE.MeshStandardMaterial({ color: 0x32b84a, roughness: 0.48 });
  const parakeetWingMat = new THREE.MeshStandardMaterial({
    color: 0x269b3d,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
  const parakeetTailMat = new THREE.MeshStandardMaterial({ color: 0x1c7a52, roughness: 0.5 });
  const parakeetBeakMat = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.35 });
  const parakeetRingMat = new THREE.MeshStandardMaterial({ color: 0xd9385a, roughness: 0.4 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.15 });

  // Curved swept wing geometry
  const birdWingGeo = new THREE.PlaneGeometry(0.46, 0.18, 4, 2);
  const bwPos = birdWingGeo.attributes.position;
  for (let i = 0; i < bwPos.count; i++) {
    const x = bwPos.getX(i);
    const y = bwPos.getY(i);
    const u = Math.max(0, Math.min(1, (x + 0.23) / 0.46)); // 0..1 from root to tip
    bwPos.setX(i, u * 0.46); // pivot cleanly at x=0
    bwPos.setY(i, y * (1 - u * 0.55)); // taper tip
    bwPos.setZ(i, -Math.pow(u, 1.5) * 0.14); // swept back
  }
  birdWingGeo.computeVertexNormals();

  function createParakeet() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), parakeetGreenMat);
    body.scale.set(0.85, 0.85, 1.65);
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), parakeetGreenMat);
    head.position.set(0, 0.05, 0.17);
    g.add(head);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 6, 12), parakeetRingMat);
    ring.rotation.x = Math.PI * 0.42;
    ring.position.set(0, 0.02, 0.14);
    g.add(ring);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.075, 6), parakeetBeakMat);
    beak.rotation.x = Math.PI * 0.55;
    beak.position.set(0, 0.04, 0.26);
    g.add(beak);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.44, 6), parakeetTailMat);
    tail.rotation.x = -Math.PI * 0.5;
    tail.position.set(0, -0.01, -0.34);
    g.add(tail);

    const wingL = new THREE.Mesh(birdWingGeo, parakeetWingMat);
    wingL.scale.x = -1;
    wingL.position.set(-0.06, 0.03, 0.03);
    g.add(wingL);

    const wingR = new THREE.Mesh(birdWingGeo, parakeetWingMat);
    wingR.position.set(0.06, 0.03, 0.03);
    g.add(wingR);

    g.scale.setScalar(1.35);
    root.add(g);
    return { group: g, wingL, wingR };
  }

  for (let i = 0; i < 10; i++) {
    const flock = i < 5 ? 0 : 1;
    const mesh = createParakeet();
    parakeets.push({
      ...mesh,
      flock,
      offset: (i % 5) * 0.48,
      radialSpread: (rand() - 0.5) * 3.5,
      heightOffset: (rand() - 0.5) * 2.2,
      flapSpeed: 13 + rand() * 3,
      phase: rand() * Math.PI * 2,
      prevPos: new THREE.Vector3()
    });
  }

  // =========================================================================
  // 2. 3 INDIAN PEAFOWL / PEACOCKS (Pavo cristatus)
  // =========================================================================
  const peacocks = [];
  const peacockTrainTex = createPeacockTrainTexture();
  const peacockTrainMat = new THREE.MeshStandardMaterial({
    map: peacockTrainTex,
    alphaTest: 0.36,
    roughness: 0.42,
    metalness: 0.25,
    side: THREE.DoubleSide
  });
  const peacockNeckMat = new THREE.MeshStandardMaterial({
    color: 0x1644b8,
    roughness: 0.28,
    metalness: 0.48
  });
  const peacockBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e5c45,
    roughness: 0.45,
    metalness: 0.22
  });
  const goldCrestMat = new THREE.MeshStandardMaterial({ color: 0x2fa872, roughness: 0.35, metalness: 0.4 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x6b5c49, roughness: 0.78 });

  // Gently arched/cupped train plane (origin at bottom center (0, 0, 0))
  const trainGeo = new THREE.PlaneGeometry(1.75, 1.95, 8, 8);
  trainGeo.translate(0, 0.92, 0);
  const trPos = trainGeo.attributes.position;
  for (let i = 0; i < trPos.count; i++) {
    const x = trPos.getX(i);
    const y = trPos.getY(i);
    // Gentle concave fan curvature
    trPos.setZ(i, -(x * x) * 0.22 + Math.sin((y / 1.95) * Math.PI) * 0.08);
  }
  trainGeo.computeVertexNormals();

  function createPeacock(centerX, centerZ, loopR, speed, phase) {
    const g = new THREE.Group();
    g.position.set(centerX, 0, centerZ);

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), peacockBodyMat);
    body.scale.set(0.85, 0.85, 1.55);
    body.position.set(0, 0.56, 0);
    body.castShadow = true;
    g.add(body);

    // Legs
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.46, 6), legMat);
    legL.position.set(-0.09, 0.23, 0.02);
    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.46, 6), legMat);
    legR.position.set(0.09, 0.23, -0.02);
    g.add(legL, legR);

    // Neck & head pivot (for pecking/glancing animation)
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.65, 0.26);
    g.add(neckPivot);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.078, 0.48, 10), peacockNeckMat);
    neck.position.set(0, 0.22, 0.06);
    neck.rotation.x = 0.22;
    neck.castShadow = true;
    neckPivot.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), peacockNeckMat);
    head.position.set(0, 0.46, 0.12);
    neckPivot.add(head);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.085, 6), legMat);
    beak.rotation.x = Math.PI * 0.52;
    beak.position.set(0, 0.45, 0.21);
    neckPivot.add(beak);

    // 3-plume head crest
    for (const cx of [-0.028, 0, 0.028]) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.11, 5), legMat);
      stem.position.set(cx, 0.56, 0.1);
      stem.rotation.z = -cx * 4.5;
      neckPivot.add(stem);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), goldCrestMat);
      dot.position.set(cx * 1.4, 0.615, 0.1);
      neckPivot.add(dot);
    }

    // Sweeping feathered train
    const trainPivot = new THREE.Group();
    trainPivot.position.set(0, 0.58, -0.25);
    g.add(trainPivot);

    const train = new THREE.Mesh(trainGeo, peacockTrainMat);
    train.castShadow = true;
    trainPivot.add(train);

    root.add(g);
    peacocks.push({
      group: g,
      neckPivot,
      trainPivot,
      legL,
      legR,
      centerX,
      centerZ,
      loopR,
      speed,
      phase,
      prevPos: new THREE.Vector3(centerX, 0, centerZ)
    });
  }

  // Three scenic lawn areas clearly visible & clear of walkways/flowerbeds
  createPeacock(12.2, 27.5, 2.2, 0.28, 0.2);
  createPeacock(-13.2, 28.0, 2.2, 0.24, 2.1);
  createPeacock(29.5, 18.0, 2.5, 0.26, 4.0);

  // =========================================================================
  // 3. 4 INDIAN THREE-STRIPED PALM SQUIRRELS (Funambulus palmarum)
  // =========================================================================
  const squirrels = [];
  const sqBodyMat = new THREE.MeshStandardMaterial({ color: 0x7c5c3e, roughness: 0.85 });
  const sqStripeMat = new THREE.MeshStandardMaterial({ color: 0xe6dac1, roughness: 0.85 });
  const sqTailMat = new THREE.MeshStandardMaterial({ color: 0x6b4e35, roughness: 0.9 });

  function createPalmSquirrel(ax, az, radius, phase) {
    const g = new THREE.Group();
    g.position.set(ax, 0, az);

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), sqBodyMat);
    body.scale.set(0.75, 0.78, 1.65);
    body.position.set(0, 0.08, 0);
    body.castShadow = true;
    g.add(body);

    // 3 Pale dorsal stripes
    for (const sx of [-0.028, 0, 0.028]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.015, 0.19), sqStripeMat);
      stripe.position.set(sx, 0.142, -0.01);
      g.add(stripe);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), sqBodyMat);
    head.position.set(0, 0.125, 0.13);
    g.add(head);

    for (const ex of [-0.045, 0.045]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), eyeMat);
      eye.position.set(ex, 0.14, 0.155);
      g.add(eye);
    }

    // S-curved fluffy raised tail
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.1, -0.12);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.14, -0.08),
      new THREE.Vector3(0, 0.25, 0.01),
      new THREE.Vector3(0, 0.31, -0.06)
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.036, 6, false), sqTailMat);
    tailPivot.add(tail);
    g.add(tailPivot);

    g.scale.setScalar(1.35);
    root.add(g);
    squirrels.push({
      group: g,
      tailPivot,
      ax,
      az,
      radius,
      phase,
      prevPos: new THREE.Vector3(ax, 0, az)
    });
  }

  createPalmSquirrel(14.0, 39.5, 2.2, 0.5);
  createPalmSquirrel(-14.5, 39.0, 2.1, 2.2);
  createPalmSquirrel(-19.5, 16.5, 1.8, 3.8);
  createPalmSquirrel(18.5, 16.5, 1.8, 5.1);

  // =========================================================================
  // 4. 18 PAINTED BUTTERFLIES (Blue Mormon, Common Tiger, Crimson Rose)
  // =========================================================================
  const butterflies = [];
  const bfSpecies = ['blue-mormon', 'common-tiger', 'crimson-rose'];
  const bfMats = bfSpecies.map(
    (sp) =>
      new THREE.MeshStandardMaterial({
        map: createButterflyWingTexture(sp),
        alphaTest: 0.42,
        roughness: 0.55,
        side: THREE.DoubleSide
      })
  );

  // Right wing plane (x: 0..0.18, z: -0.09..0.09)
  const bfWingGeo = new THREE.PlaneGeometry(0.18, 0.18);
  bfWingGeo.rotateX(-Math.PI * 0.5);
  bfWingGeo.translate(0.09, 0, 0);

  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const mat = bfMats[i % bfMats.length];

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.11, 5), eyeMat);
    body.rotation.x = Math.PI * 0.5;
    g.add(body);

    const wingR = new THREE.Mesh(bfWingGeo, mat);
    const wingL = new THREE.Mesh(bfWingGeo, mat);
    wingL.scale.x = -1;
    g.add(wingL, wingR);

    // 4 inside the Glass House around the Flower Show, 14 in gardens & fountain plaza
    let ax, ay, az, rad;
    if (i < 4) {
      const a = (i / 4) * Math.PI * 2;
      ax = Math.cos(a) * 4.2;
      az = Math.sin(a) * 4.2;
      ay = 3.1 + (i % 2) * 0.9;
      rad = 1.6;
    } else if (i < 10) {
      ax = (i % 2 === 0 ? -1 : 1) * (12 + rand() * 5);
      az = 19.5 + (rand() - 0.5) * 4;
      ay = 1.2 + rand() * 0.8;
      rad = 2.6;
    } else {
      const a = rand() * Math.PI * 2;
      ax = Math.cos(a) * (6.2 + rand() * 2.5);
      az = 34 + Math.sin(a) * (6.2 + rand() * 2.5);
      ay = 1.3 + rand() * 0.9;
      rad = 2.4;
    }

    g.position.set(ax, ay, az);
    g.scale.setScalar(1.2);
    root.add(g);
    butterflies.push({
      group: g,
      wingL,
      wingR,
      ax,
      ay,
      az,
      radius: rad,
      phase: rand() * Math.PI * 2,
      speed: 0.7 + rand() * 0.65,
      prevPos: new THREE.Vector3(ax, ay, az)
    });
  }

  // =========================================================================
  // 5. 6 SHIMMERING FOUNTAIN DRAGONFLIES OVER (0, 1..2.5, 34)
  // =========================================================================
  const dragonflies = [];
  const dfBodyMat = new THREE.MeshStandardMaterial({
    color: 0x16a8b8,
    roughness: 0.25,
    metalness: 0.65
  });
  const dfWingMat = new THREE.MeshStandardMaterial({
    color: 0xe6f8ff,
    transparent: true,
    opacity: 0.52,
    roughness: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const dfWingGeo = new THREE.PlaneGeometry(0.16, 0.045);
  dfWingGeo.rotateX(-Math.PI * 0.5);
  dfWingGeo.translate(0.08, 0, 0);

  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.2, 6), dfBodyMat);
    abdomen.rotation.x = Math.PI * 0.5;
    g.add(abdomen);

    const wings = [];
    for (const zOff of [0.03, -0.01]) {
      const wR = new THREE.Mesh(dfWingGeo, dfWingMat);
      wR.position.set(0, 0.01, zOff);
      const wL = new THREE.Mesh(dfWingGeo, dfWingMat);
      wL.scale.x = -1;
      wL.position.set(0, 0.01, zOff);
      g.add(wL, wR);
      wings.push({ wL, wR });
    }

    const angle = (i / 6) * Math.PI * 2;
    g.position.set(Math.cos(angle) * 2.5, 1.35 + (i % 3) * 0.35, 34 + Math.sin(angle) * 2.5);
    g.scale.setScalar(1.35);
    root.add(g);
    dragonflies.push({
      group: g,
      wings,
      baseY: 1.25 + (i % 3) * 0.38,
      radius: 1.8 + rand() * 1.9,
      phase: rand() * Math.PI * 2,
      speed: 0.85 + rand() * 0.5,
      prevPos: g.position.clone()
    });
  }

  // =========================================================================
  // 6. 8 SWIMMING KOI / GOLDEN CARP IN THE VICTORIAN FOUNTAIN BASIN
  // =========================================================================
  const kois = [];
  const KOI_COLORS = [0xff6a1a, 0xff9b24, 0xf24b2e, 0xfff0d4];
  const koiFinMat = new THREE.MeshStandardMaterial({
    color: 0xffd2a6,
    roughness: 0.45,
    side: THREE.DoubleSide
  });

  for (let i = 0; i < 8; i++) {
    const g = new THREE.Group();
    const koiMat = new THREE.MeshStandardMaterial({
      color: KOI_COLORS[i % KOI_COLORS.length],
      roughness: 0.3,
      metalness: 0.1
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), koiMat);
    body.scale.set(0.75, 0.65, 2.35);
    g.add(body);

    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0, -0.18);
    const tailFin = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), koiFinMat);
    tailFin.rotation.y = Math.PI * 0.5;
    tailFin.position.set(0, 0, -0.07);
    tailPivot.add(tailFin);
    g.add(tailPivot);

    const orbitR = 1.9 + (i % 4) * 0.48;
    const phase = (i / 8) * Math.PI * 2;
    g.position.set(Math.cos(phase) * orbitR, 0.46, 34 + Math.sin(phase) * orbitR);
    g.scale.setScalar(1.25);
    root.add(g);
    kois.push({
      group: g,
      tailPivot,
      orbitR,
      phase,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 0.36 + rand() * 0.22,
      prevPos: g.position.clone()
    });
  }

  // =========================================================================
  // ANIMATION LOOP
  // =========================================================================
  const tmpPos = new THREE.Vector3();

  function update(dt, elapsed) {
    void dt;

    // 1. Parakeets wheeling smoothly overhead with wingbeat + glide cadence
    for (const pk of parakeets) {
      const t = elapsed * 0.26 + pk.offset;
      if (pk.flock === 0) {
        // Sweeping figure-8 over the Glass House crossing cupola & front plaza
        const rX = 28 + pk.radialSpread;
        const rZ = 22 + pk.radialSpread * 0.6;
        tmpPos.set(
          Math.sin(t) * rX,
          17.5 + pk.heightOffset + Math.sin(t * 2.0) * 2.2,
          6 + Math.sin(t * 2.0) * rZ * 0.55
        );
      } else {
        // Wide circling flock over Royal Palm avenue & gardens
        const r = 34 + pk.radialSpread;
        tmpPos.set(
          Math.cos(-t * 0.85) * r,
          14.5 + pk.heightOffset + Math.cos(t * 1.5) * 1.6,
          14 + Math.sin(-t * 0.85) * r * 0.82
        );
      }

      const dx = tmpPos.x - pk.prevPos.x;
      const dy = tmpPos.y - pk.prevPos.y;
      const dz = tmpPos.z - pk.prevPos.z;
      pk.group.position.copy(tmpPos);
      if (dx * dx + dz * dz > 0.0001) {
        pk.group.rotation.y = Math.atan2(dx, dz);
        pk.group.rotation.x = -THREE.MathUtils.clamp(dy * 2.2, -0.35, 0.35);
      }
      pk.prevPos.copy(tmpPos);

      // Alternate rapid wingbeats & brief soaring glides
      const glideCycle = Math.sin(elapsed * 0.9 + pk.phase);
      const flap = glideCycle > -0.35 ? Math.sin(elapsed * pk.flapSpeed + pk.phase) * 0.82 : 0.14;
      pk.wingL.rotation.z = -flap;
      pk.wingR.rotation.z = flap;
    }

    // 2. Strolling Peacocks with periodic pecking pause & train shimmer
    for (const pc of peacocks) {
      const cycle = (elapsed * pc.speed + pc.phase) % (Math.PI * 2);
      const walkPause = Math.sin(elapsed * 0.55 + pc.phase);
      const isPaused = walkPause > 0.45;
      const effAngle = isPaused
        ? cycle - (walkPause - 0.45) * 0.08
        : cycle;

      tmpPos.set(
        pc.centerX + Math.cos(effAngle) * pc.loopR,
        0,
        pc.centerZ + Math.sin(effAngle) * pc.loopR
      );
      const dx = tmpPos.x - pc.prevPos.x;
      const dz = tmpPos.z - pc.prevPos.z;
      pc.group.position.copy(tmpPos);
      if (dx * dx + dz * dz > 1e-6) {
        pc.group.rotation.y = Math.atan2(dx, dz);
      }
      pc.prevPos.copy(tmpPos);

      if (isPaused) {
        pc.legL.rotation.x *= 0.85;
        pc.legR.rotation.x *= 0.85;
        pc.neckPivot.rotation.x = 0.35 + Math.sin(elapsed * 5.0 + pc.phase) * 0.25;
        pc.trainPivot.rotation.x = -0.28 + Math.sin(elapsed * 1.8) * 0.06;
      } else {
        const stride = Math.sin(elapsed * 5.5 + pc.phase) * 0.36;
        pc.legL.rotation.x = stride;
        pc.legR.rotation.x = -stride;
        pc.neckPivot.rotation.x = Math.sin(elapsed * 5.5 + pc.phase) * 0.08;
        pc.trainPivot.rotation.x = -1.36 + Math.sin(elapsed * 2.4 + pc.phase) * 0.05;
      }
    }

    // 3. Stop-and-go scurrying Palm Squirrels with upright tail flicks
    for (const sq of squirrels) {
      const burst = Math.max(0, Math.sin(elapsed * 1.15 + sq.phase));
      const t = elapsed * 0.55 + burst * 0.35 + sq.phase;
      tmpPos.set(
        sq.ax + Math.cos(t) * sq.radius,
        burst > 0.15 ? Math.abs(Math.sin(elapsed * 14)) * 0.04 : 0,
        sq.az + Math.sin(t * 1.4) * sq.radius * 0.75
      );
      const dx = tmpPos.x - sq.prevPos.x;
      const dz = tmpPos.z - sq.prevPos.z;
      sq.group.position.copy(tmpPos);
      if (dx * dx + dz * dz > 1e-6) {
        sq.group.rotation.y = Math.atan2(dx, dz);
      }
      sq.prevPos.copy(tmpPos);
      sq.tailPivot.rotation.x = Math.sin(elapsed * 9.0 + sq.phase) * 0.24;
    }

    // 4. Painted Butterflies
    for (const bf of butterflies) {
      const t = elapsed * bf.speed + bf.phase;
      tmpPos.set(
        bf.ax + Math.cos(t) * bf.radius + Math.sin(t * 2.3) * 0.35,
        bf.ay + Math.sin(t * 2.7) * 0.42,
        bf.az + Math.sin(t * 1.3) * bf.radius
      );
      const dx = tmpPos.x - bf.prevPos.x;
      const dz = tmpPos.z - bf.prevPos.z;
      bf.group.position.copy(tmpPos);
      if (dx * dx + dz * dz > 1e-6) {
        bf.group.rotation.y = Math.atan2(dx, dz);
      }
      bf.prevPos.copy(tmpPos);
      const flap = Math.sin(elapsed * 18.0 + bf.phase) * 0.92;
      bf.wingL.rotation.z = -flap;
      bf.wingR.rotation.z = flap;
    }

    // 5. Shimmering Fountain Dragonflies (hover & dart)
    for (const df of dragonflies) {
      const t = elapsed * df.speed + df.phase;
      // Snappy hover-and-dart interpolation
      const dart = Math.sin(t) + Math.sin(t * 2.0) * 0.35;
      tmpPos.set(
        Math.cos(dart) * df.radius,
        df.baseY + Math.sin(elapsed * 2.1 + df.phase) * 0.25,
        34 + Math.sin(dart * 1.3) * df.radius
      );
      const dx = tmpPos.x - df.prevPos.x;
      const dz = tmpPos.z - df.prevPos.z;
      df.group.position.copy(tmpPos);
      if (dx * dx + dz * dz > 1e-5) {
        df.group.rotation.y = Math.atan2(dx, dz);
      }
      df.prevPos.copy(tmpPos);
      const buzz = Math.sin(elapsed * 42.0 + df.phase) * 0.42;
      for (const w of df.wings) {
        w.wL.rotation.z = -buzz;
        w.wR.rotation.z = buzz;
      }
    }

    // 6. Swimming Koi / Golden Carp in the Victorian Fountain
    for (const k of kois) {
      const a = elapsed * k.speed * k.dir + k.phase;
      const r = k.orbitR + Math.sin(a * 3.0) * 0.28;
      tmpPos.set(Math.cos(a) * r, 0.46, 34 + Math.sin(a) * r);
      const dx = tmpPos.x - k.prevPos.x;
      const dz = tmpPos.z - k.prevPos.z;
      k.group.position.copy(tmpPos);
      if (dx * dx + dz * dz > 1e-6) {
        k.group.rotation.y = Math.atan2(dx, dz);
      }
      k.prevPos.copy(tmpPos);
      k.tailPivot.rotation.y = Math.sin(elapsed * 8.5 + k.phase) * 0.45;
    }
  }

  return {
    group: root,
    faunaSummary: {
      parakeets: parakeets.length,
      peacocks: peacocks.length,
      squirrels: squirrels.length,
      butterflies: butterflies.length,
      dragonflies: dragonflies.length,
      koi: kois.length
    },
    update
  };
}
