import * as THREE from 'three';
import {
  createCrossingMedallionTexture,
  createFloorTileTextures,
  createGraniteTextures,
  createSignboardTexture
} from './textures.js';

/**
 * Helper to create a curved extruded ribbon arch with rectangular profile in the XY plane,
 * spanning angle [thetaStart, thetaEnd] around (0, 0).
 */
function createArchRibbonGeometry(rInner, rOuter, depthZ, thetaStart = 0, thetaEnd = Math.PI, segments = 32) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const t = thetaStart + (i / segments) * (thetaEnd - thetaStart);
    const x = Math.cos(t) * rOuter;
    const y = Math.sin(t) * rOuter;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = segments; i >= 0; i--) {
    const t = thetaStart + (i / segments) * (thetaEnd - thetaStart);
    const x = Math.cos(t) * rInner;
    const y = Math.sin(t) * rInner;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depthZ,
    bevelEnabled: false,
    curveSegments: segments
  });
  geo.translate(0, 0, -depthZ * 0.5);
  return geo;
}

/**
 * Helper to create a triangular gable/wedge prism for side-aisle ends.
 */
function createWedgeGeometry(width, height, thickness) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false
  });
  geo.translate(0, 0, -thickness * 0.5);
  return geo;
}

/**
 * Builds the complete Lalbagh Glass House (Albert Victor Conservatory, 1889)
 * on a unified 3.0m bay structural grid centered at (0, 0, 0).
 */
export function buildLalbaghGlassHouse(maxAnisotropy = 8) {
  const root = new THREE.Group();
  root.name = 'LalbaghGlassHouse';

  // --- Shared Materials ---
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0xf4f2ea,
    roughness: 0.42,
    metalness: 0.28
  });

  const ironTrimMat = new THREE.MeshStandardMaterial({
    color: 0xe6e3d8,
    roughness: 0.45,
    metalness: 0.34
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4ad5a,
    roughness: 0.28,
    metalness: 0.85
  });

  const stuccoMat = new THREE.MeshStandardMaterial({
    color: 0xede6d6,
    roughness: 0.82,
    metalness: 0.04
  });

  const darkGreenFrameMat = new THREE.MeshStandardMaterial({
    color: 0x16382b,
    roughness: 0.48,
    metalness: 0.25
  });

  const graniteTex = createGraniteTextures(maxAnisotropy);
  const graniteMat = new THREE.MeshStandardMaterial({
    map: graniteTex.map,
    bumpMap: graniteTex.bumpMap,
    bumpScale: 0.025,
    roughness: 0.86,
    metalness: 0.05
  });

  const graniteCapMat = new THREE.MeshStandardMaterial({
    color: 0xa29f95,
    roughness: 0.72,
    metalness: 0.06
  });

  // Reflective Victorian Glass (NO transmission > 0 so nested interior objects & transparencies remain visible!)
  const wallGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8eff8,
    transparent: true,
    opacity: 0.27,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.65,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const roofGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd0ebf7,
    transparent: true,
    opacity: 0.34,
    roughness: 0.07,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.75,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const bulbGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff3d4,
    emissive: new THREE.Color(0xffbe66),
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.0
  });

  const emissiveBulbs = [bulbGlowMat];

  // Instance Collectors for crisp performance
  const columnPlacements = [];
  const finialPlacements = [];
  const crestingPlacements = [];

  function addColumn(x, yBase, z, height, radius = 0.12) {
    columnPlacements.push({ x, yBase, z, height, radius });
  }

  function addFinial(x, y, z, scale = 1.0) {
    finialPlacements.push({ x, y, z, scale });
  }

  function addCrestRun(x0, z0, x1, z1, y, step = 0.42) {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const count = Math.max(1, Math.floor(len / step));
    const rotY = Math.atan2(dx, dz);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      crestingPlacements.push({
        x: x0 + dx * t,
        y,
        z: z0 + dz * t,
        rotY
      });
    }
  }

  // =========================================================================
  // 1. GRANITE ASHLAR PLINTH (y = 0.0 -> 1.2) — 3 non-overlapping blocks + Portico
  // =========================================================================
  const plinthGroup = new THREE.Group();
  plinthGroup.name = 'GranitePlinth';
  root.add(plinthGroup);

  function addPlinthBlock(cx, cz, w, d) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 1.12, d), graniteMat);
    body.position.set(cx, 0.56, cz);
    body.castShadow = true;
    body.receiveShadow = true;
    plinthGroup.add(body);

    // Base water-table step
    const baseStep = new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, 0.24, d + 0.36), graniteCapMat);
    baseStep.position.set(cx, 0.12, cz);
    baseStep.receiveShadow = true;
    plinthGroup.add(baseStep);

    // Upper granite coping ledge at y = 1.12..1.20
    const coping = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.08, d + 0.22), graniteCapMat);
    coping.position.set(cx, 1.16, cz);
    coping.receiveShadow = true;
    plinthGroup.add(coping);
  }

  // Non-overlapping cruciform decomposition
  addPlinthBlock(0, 0, 12.0, 42.0);      // N-S Transept spine
  addPlinthBlock(-15.0, 0, 18.0, 24.0);  // West E-W wing + side aisles
  addPlinthBlock(15.0, 0, 18.0, 24.0);   // East E-W wing + side aisles
  addPlinthBlock(0, 22.1, 8.4, 2.2);     // Projecting Front Portico plinth

  // =========================================================================
  // 2. HERITAGE TILED INTERIOR FLOOR (y = 1.205) & CROSSING MEDALLION
  // =========================================================================
  const floorGroup = new THREE.Group();
  floorGroup.name = 'InteriorFloor';
  root.add(floorGroup);

  const tileTex = createFloorTileTextures(maxAnisotropy);
  function makeTiledFloorMesh(cx, cz, w, d) {
    const texMap = tileTex.map.clone();
    texMap.repeat.set(w / 2.4, d / 2.4);
    texMap.needsUpdate = true;
    const texRough = tileTex.roughnessMap.clone();
    texRough.repeat.set(w / 2.4, d / 2.4);
    texRough.needsUpdate = true;
    const texBump = tileTex.bumpMap.clone();
    texBump.repeat.set(w / 2.4, d / 2.4);
    texBump.needsUpdate = true;

    const mat = new THREE.MeshStandardMaterial({
      map: texMap,
      roughnessMap: texRough,
      bumpMap: texBump,
      bumpScale: 0.012,
      roughness: 0.42,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.set(cx, 1.205, cz);
    mesh.receiveShadow = true;
    floorGroup.add(mesh);
  }

  // Exact non-overlapping floor strips
  makeTiledFloorMesh(0, 0, 11.9, 41.9);
  makeTiledFloorMesh(-14.95, 0, 18.0, 23.9);
  makeTiledFloorMesh(14.95, 0, 18.0, 23.9);
  makeTiledFloorMesh(0, 22.05, 8.2, 2.2);

  // Grand Circular Botanical Medallion at Central Crossing (0, 1.212, 0)
  const medallionTex = createCrossingMedallionTexture(maxAnisotropy);
  const medallionMat = new THREE.MeshStandardMaterial({
    map: medallionTex,
    transparent: true,
    roughness: 0.35,
    metalness: 0.1
  });
  const medallion = new THREE.Mesh(new THREE.CircleGeometry(5.6, 64), medallionMat);
  medallion.rotation.x = -Math.PI * 0.5;
  medallion.position.set(0, 1.214, 0);
  medallion.receiveShadow = true;
  floorGroup.add(medallion);

  // =========================================================================
  // 3. FOUR CARDINAL GRANITE STAIRCASES WITH CHEEK WALLS & GLOBE LAMPS
  // =========================================================================
  const stairsGroup = new THREE.Group();
  stairsGroup.name = 'CardinalStairs';
  root.add(stairsGroup);

  function buildStaircase({ x, z, rotY, width, numSteps = 6, depthPerStep = 0.42, withLamps = true }) {
    const sg = new THREE.Group();
    sg.position.set(x, 0, z);
    sg.rotation.y = rotY;

    const totalLen = numSteps * depthPerStep;
    const stepH = 1.2 / (numSteps + 1);
    for (let i = 0; i < numSteps; i++) {
      const topY = 1.2 - (i + 1) * stepH;
      const stepGeo = new THREE.BoxGeometry(width, topY, depthPerStep + 0.02);
      const stepMesh = new THREE.Mesh(stepGeo, graniteCapMat);
      stepMesh.position.set(0, topY * 0.5, i * depthPerStep + depthPerStep * 0.5);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      sg.add(stepMesh);
    }

    // Flanking stepped cheek walls
    for (const side of [-1, 1]) {
      const cx = side * (width * 0.5 + 0.28);
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.38, totalLen + 0.25), graniteMat);
      cheek.position.set(cx, 0.69, totalLen * 0.42);
      cheek.castShadow = true;
      cheek.receiveShadow = true;
      sg.add(cheek);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.12, totalLen + 0.35), graniteCapMat);
      cap.position.set(cx, 1.41, totalLen * 0.42);
      sg.add(cap);

      // End newel pier
      const pierZ = totalLen + 0.06;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.62, 0.76), graniteMat);
      pier.position.set(cx, 0.81, pierZ);
      pier.castShadow = true;
      sg.add(pier);

      const pierCap = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.86), graniteCapMat);
      pierCap.position.set(cx, 1.66, pierZ);
      sg.add(pierCap);

      if (withLamps) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.45, 12), darkGreenFrameMat);
        post.position.set(cx, 2.42, pierZ);
        post.castShadow = true;
        sg.add(post);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.14, 12), brassMat);
        collar.position.set(cx, 3.16, pierZ);
        sg.add(collar);

        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), bulbGlowMat);
        globe.position.set(cx, 3.42, pierZ);
        sg.add(globe);

        const capCrown = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.16, 10), brassMat);
        capCrown.position.set(cx, 3.68, pierZ);
        sg.add(capCrown);
      }
    }

    stairsGroup.add(sg);
  }

  buildStaircase({ x: 0, z: 23.2, rotY: 0, width: 8.0, withLamps: true });              // Front (+Z)
  buildStaircase({ x: 0, z: -21.0, rotY: Math.PI, width: 6.0, withLamps: true });     // Rear 1935 (-Z)
  buildStaircase({ x: 24.0, z: 0, rotY: Math.PI * 0.5, width: 6.0, withLamps: true }); // East (+X)
  buildStaircase({ x: -24.0, z: 0, rotY: -Math.PI * 0.5, width: 6.0, withLamps: true }); // West (-X)

  // =========================================================================
  // 4. PERIMETER KNEE WALLS, ARCHED VICTORIAN WINDOWS & COLONNADE
  // =========================================================================
  const wallsGroup = new THREE.Group();
  wallsGroup.name = 'PerimeterWalls';
  root.add(wallsGroup);

  const windowArchGeo = createArchRibbonGeometry(1.18, 1.32, 0.08, 0, Math.PI, 18);
  const windowRingGeo = new THREE.TorusGeometry(0.2, 0.032, 8, 16);

  /**
   * Builds a 3.0m-wide Victorian wall bay along local X from -1.5 to +1.5, at height yBase..yTop.
   */
  function buildGlazedBay({ x, z, rotY, yBase = 1.2, yTop = 5.6, hasKneeWall = true, isDoor = false }) {
    const bay = new THREE.Group();
    bay.position.set(x, 0, z);
    bay.rotation.y = rotY;

    const glassStartY = hasKneeWall && !isDoor ? 2.1 : yBase;

    if (hasKneeWall && !isDoor) {
      // Stucco knee wall y = 1.2..2.05
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.85, 0.24), stuccoMat);
      wall.position.set(0, 1.625, 0);
      wall.castShadow = true;
      wall.receiveShadow = true;
      bay.add(wall);

      // Recessed Victorian panel trim
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.48, 0.28), ironTrimMat);
      panel.position.set(0, 1.625, 0);
      bay.add(panel);

      // Stone sill ledge
      const sill = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.08, 0.34), graniteCapMat);
      sill.position.set(0, 2.07, 0);
      bay.add(sill);
    }

    if (isDoor) {
      // Open doorway bay! Only build upper arched fanlight transom above y = 5.2 (for tall walls)
      if (yTop > 5.4) {
        const header = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.14, 0.18), ironMat);
        header.position.set(0, 5.2, 0);
        bay.add(header);

        const upperH = yTop - 5.27;
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.86, upperH), wallGlassMat);
        pane.position.set(0, 5.27 + upperH * 0.5, 0);
        pane.renderOrder = 2;
        bay.add(pane);

        const arch = new THREE.Mesh(windowArchGeo, ironMat);
        arch.position.set(0, 5.25, 0);
        bay.add(arch);
      }
      wallsGroup.add(bay);
      return;
    }

    // Glazed pane
    const paneH = yTop - glassStartY;
    const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(2.86, paneH), wallGlassMat);
    glassPane.position.set(0, glassStartY + paneH * 0.5, 0);
    glassPane.renderOrder = 2;
    bay.add(glassPane);

    // Fine vertical glazing mullions (4 sub-panes per 3m bay)
    for (const mx of [-0.72, 0, 0.72]) {
      const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.045, paneH, 0.06), ironMat);
      mullion.position.set(mx, glassStartY + paneH * 0.5, 0);
      bay.add(mullion);
    }

    // Horizontal glazing transoms
    const midY = glassStartY + paneH * 0.45;
    const transom = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.05, 0.08), ironMat);
    transom.position.set(0, midY, 0);
    bay.add(transom);

    // Victorian arch & spandrel rings near top
    const springY = yTop - 1.4;
    if (springY > glassStartY + 0.5) {
      const springBar = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.06, 0.09), ironMat);
      springBar.position.set(0, springY, 0);
      bay.add(springBar);

      const arch = new THREE.Mesh(windowArchGeo, ironMat);
      arch.position.set(0, springY, 0);
      bay.add(arch);

      for (const sx of [-1.06, 1.06]) {
        const ring = new THREE.Mesh(windowRingGeo, ironMat);
        ring.position.set(sx, yTop - 0.34, 0);
        bay.add(ring);
      }
    }

    // Top cornice beam
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.16, 0.22), ironMat);
    topBeam.position.set(0, yTop, 0);
    bay.add(topBeam);

    wallsGroup.add(bay);
  }

  // --- Side-aisle outer long walls (z = ±12, x in [-24,-6] and [6,24]) ---
  for (const sideZ of [-12, 12]) {
    const rotY = sideZ > 0 ? 0 : Math.PI;
    for (const startX of [-24, 6]) {
      for (let i = 0; i < 6; i++) {
        const cx = startX + i * 3 + 1.5;
        buildGlazedBay({ x: cx, z: sideZ, rotY, yBase: 1.2, yTop: 5.6, hasKneeWall: true });
      }
    }
    // Outer columns along z = ±12
    for (let x = -24; x <= -6; x += 3) addColumn(x, 1.2, sideZ, 4.4, 0.11);
    for (let x = 6; x <= 24; x += 3) addColumn(x, 1.2, sideZ, 4.4, 0.11);
  }

  // --- Side-aisle end walls (x = ±24, z in [-12,-6] and [6,12]) + sloped triangular wedges ---
  const wedgeGeo = createWedgeGeometry(6.0, 1.8, 0.05);
  const wedgeFrameDiagLen = Math.hypot(6.0, 1.8);
  const wedgeAngle = Math.atan2(1.8, 6.0);

  for (const sideX of [-24, 24]) {
    const rotY = sideX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    for (const startZ of [-12, 6]) {
      for (let i = 0; i < 2; i++) {
        const cz = startZ + i * 3 + 1.5;
        buildGlazedBay({ x: sideX, z: cz, rotY, yBase: 1.2, yTop: 5.6, hasKneeWall: true });
      }

      // Triangular glass wedge between y=5.6 and lean-to roof (y=5.6 at |z|=12 to y=7.4 at |z|=6)
      const signZ = startZ < 0 ? -1 : 1;
      const wedge = new THREE.Mesh(wedgeGeo, wallGlassMat);
      wedge.position.set(sideX, 5.6, signZ * 12);
      // In local shape, +X goes from 0->6, +Y goes 0->1.8. Rotate so +X points toward z = signZ * 6.
      wedge.rotation.y = signZ > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      wedge.renderOrder = 2;
      wallsGroup.add(wedge);

      // Sloped iron rafter capping the wedge
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, wedgeFrameDiagLen + 0.15), ironMat);
      rafter.position.set(sideX, 6.5, signZ * 9.0);
      rafter.rotation.x = signZ > 0 ? -wedgeAngle : wedgeAngle;
      wallsGroup.add(rafter);

      // Intermediate column at |z| = 9
      addColumn(sideX, 1.2, signZ * 9, 4.4, 0.11);
    }
  }

  // --- N-S Transept outer long walls (x = ±6, z in [-21,-12] and [12,21]) ---
  for (const sideX of [-6, 6]) {
    const rotY = sideX > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    for (const startZ of [-21, 12]) {
      for (let i = 0; i < 3; i++) {
        const cz = startZ + i * 3 + 1.5;
        buildGlazedBay({ x: sideX, z: cz, rotY, yBase: 1.2, yTop: 7.4, hasKneeWall: true });
        // Clerestory band y = 7.4..9.0
        buildGlazedBay({ x: sideX, z: cz, rotY, yBase: 7.4, yTop: 9.0, hasKneeWall: false });
      }
    }
  }

  // --- Tall Nave & Transept Inner Columns (along z = ±6 and x = ±6) ---
  // E-W Nave columns along z = ±6 (skipping x = ±6 since covered by transept)
  for (const zCol of [-6, 6]) {
    for (let x = -24; x <= 24; x += 3) {
      addColumn(x, 1.2, zCol, 7.8, Math.abs(x) === 6 ? 0.16 : 0.13);
    }
  }
  // N-S Transept columns along x = ±6 (skipping z = ±6 already added above)
  for (const xCol of [-6, 6]) {
    for (let z = -21; z <= 21; z += 3) {
      if (Math.abs(z) === 6) continue;
      addColumn(xCol, 1.2, z, 7.8, 0.13);
    }
    // Also interior aisle columns at x = ±6, z = ±9
    addColumn(xCol, 1.2, -9, 7.8, 0.12);
    addColumn(xCol, 1.2, 9, 7.8, 0.12);
  }

  // --- Longitudinal Clerestories & Scrollwork Arcade Spandrels along Nave & Transepts ---
  const arcadeRingGeo = new THREE.TorusGeometry(0.45, 0.04, 8, 20);
  const arcadeArchGeo = createArchRibbonGeometry(1.22, 1.38, 0.12, 0, Math.PI, 20);

  function buildClerestoryAndArcade(x, z, rotY, includeArcade = true) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotY;

    // Clerestory glass ribbon y = 7.4..9.0
    const clGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.88, 1.52), wallGlassMat);
    clGlass.position.set(0, 8.2, 0);
    clGlass.renderOrder = 2;
    g.add(clGlass);

    for (const mx of [-0.72, 0, 0.72]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.54, 0.06), ironMat);
      m.position.set(mx, 8.2, 0);
      g.add(m);
    }

    // Upper wallplate girder at y = 9.0 & lower girder at y = 7.4
    const topGirder = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.2, 0.26), ironMat);
    topGirder.position.set(0, 9.0, 0);
    g.add(topGirder);

    const midGirder = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.18, 0.24), ironMat);
    midGirder.position.set(0, 7.4, 0);
    g.add(midGirder);

    if (includeArcade) {
      // Decorative Victorian scrollwork arch between y = 5.6..7.35 (open interior span!)
      const lowerBar = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.08, 0.14), ironMat);
      lowerBar.position.set(0, 5.65, 0);
      g.add(lowerBar);

      const arch = new THREE.Mesh(arcadeArchGeo, ironMat);
      arch.position.set(0, 5.68, 0);
      g.add(arch);

      for (const sx of [-1.05, 1.05]) {
        const ring = new THREE.Mesh(arcadeRingGeo, ironMat);
        ring.scale.setScalar(0.55);
        ring.position.set(sx, 6.86, 0);
        g.add(ring);
      }
    }

    wallsGroup.add(g);
  }

  // E-W Nave interior clerestories & arcades along z = ±6 (x in [-24,-6] and [6,24])
  for (const zSide of [-6, 6]) {
    for (const startX of [-24, 6]) {
      for (let i = 0; i < 6; i++) {
        buildClerestoryAndArcade(startX + i * 3 + 1.5, zSide, 0, true);
      }
    }
  }

  // N-S Transept interior clerestories & arcades along x = ±6 for z in [-12,-6] and [6,12]
  for (const xSide of [-6, 6]) {
    for (const cz of [-10.5, -7.5, 7.5, 10.5]) {
      buildClerestoryAndArcade(xSide, cz, Math.PI * 0.5, true);
    }
  }

  // =========================================================================
  // 5. SIDE-AISLE SLOPED LEAN-TO GLAZED ROOFS (y = 5.6 at |z|=12 -> y = 7.4 at |z|=6)
  // =========================================================================
  const sideRoofGroup = new THREE.Group();
  sideRoofGroup.name = 'SideAisleRoofs';
  root.add(sideRoofGroup);

  const aisleSlopeLen = Math.hypot(6.0, 1.8);
  const aisleSlopeAngle = Math.atan2(1.8, 6.0);

  for (const signZ of [-1, 1]) {
    for (const startX of [-24, 6]) {
      const centerX = startX + 9.0; // 18m span
      const centerZ = signZ * 9.0;

      // Continuous glass roof slope
      const glassSlope = new THREE.Mesh(new THREE.PlaneGeometry(18.0, aisleSlopeLen), roofGlassMat);
      glassSlope.position.set(centerX, 6.5, centerZ);
      glassSlope.rotation.x = signZ > 0 ? -Math.PI * 0.5 + aisleSlopeAngle : Math.PI * 0.5 - aisleSlopeAngle;
      glassSlope.renderOrder = 2;
      sideRoofGroup.add(glassSlope);

      // Iron rafters every 1.5m (every 3m major, 1.5m minor)
      for (let rx = startX; rx <= startX + 18; rx += 1.5) {
        const isMajor = Math.abs(rx % 3) < 0.01;
        const rafter = new THREE.Mesh(
          new THREE.BoxGeometry(isMajor ? 0.11 : 0.055, isMajor ? 0.14 : 0.07, aisleSlopeLen + 0.12),
          ironMat
        );
        rafter.position.set(rx, 6.5, centerZ);
        rafter.rotation.x = signZ > 0 ? -aisleSlopeAngle : aisleSlopeAngle;
        sideRoofGroup.add(rafter);
      }

      // Horizontal purlins along the slope
      for (const frac of [0.25, 0.5, 0.75, 1.0]) {
        const pz = signZ * (12.0 - frac * 6.0);
        const py = 5.6 + frac * 1.8;
        const purlin = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.07, 0.07), ironMat);
        purlin.position.set(centerX, py, pz);
        sideRoofGroup.add(purlin);
      }

      // Outer eave cresting along |z| = 12, y = 5.75
      addCrestRun(startX, signZ * 12, startX + 18, signZ * 12, 5.72, 0.45);
    }
  }

  // =========================================================================
  // 6. FOUR CARDINAL FACADES + ICONIC SUNBURST ARCHED GABLES (R = 6.0m)
  // =========================================================================
  const facadesGroup = new THREE.Group();
  facadesGroup.name = 'SunburstGables';
  root.add(facadesGroup);

  const outerGableArch = createArchRibbonGeometry(5.62, 6.06, 0.24, 0, Math.PI, 40);
  const midRingArch46 = createArchRibbonGeometry(4.48, 4.64, 0.1, 0, Math.PI, 32);
  const innerRingArch26 = createArchRibbonGeometry(2.5, 2.66, 0.1, 0, Math.PI, 26);
  const coreRingArch10 = createArchRibbonGeometry(0.92, 1.06, 0.12, 0, Math.PI, 20);
  const gableGlassShape = new THREE.Shape();
  gableGlassShape.absarc(0, 0, 5.85, 0, Math.PI, false);
  gableGlassShape.closePath();
  const gableGlassGeo = new THREE.ShapeGeometry(gableGlassShape, 36);

  function buildCardinalFacade({ x, z, rotY, isFrontPortico = false }) {
    const fg = new THREE.Group();
    fg.position.set(x, 0, z);
    fg.rotation.y = rotY;

    // Lower walls: 4 bays of 3m across [-6..+6]. Central 4.8m is open doorway!
    // Left flanking wall x in [-6..-2.4], Right flanking wall x in [+2.4..+6]
    for (const side of [-1, 1]) {
      const wx = side * 4.2;
      const wWidth = 3.6;

      // Knee wall y = 1.2..2.05
      const knee = new THREE.Mesh(new THREE.BoxGeometry(wWidth, 0.85, 0.24), stuccoMat);
      knee.position.set(wx, 1.625, 0);
      knee.castShadow = true;
      knee.receiveShadow = true;
      fg.add(knee);

      const sill = new THREE.Mesh(new THREE.BoxGeometry(wWidth + 0.08, 0.08, 0.34), graniteCapMat);
      sill.position.set(wx, 2.07, 0);
      fg.add(sill);

      // Flanking glazing y = 2.1..9.0
      const sidePane = new THREE.Mesh(new THREE.PlaneGeometry(wWidth - 0.12, 6.85), wallGlassMat);
      sidePane.position.set(wx, 5.52, 0);
      sidePane.renderOrder = 2;
      fg.add(sidePane);

      // Vertical mullions & intermediate column
      for (const mx of [side * 3.3, side * 4.2, side * 5.1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.055, 6.85, 0.08), ironMat);
        m.position.set(mx, 5.52, 0);
        fg.add(m);
      }

      // Flanking columns at doorway jamb (x = ±2.45)
      const jambCol = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 7.8, 14), ironMat);
      jambCol.position.set(side * 2.45, 5.1, 0);
      jambCol.castShadow = true;
      fg.add(jambCol);
    }

    // Center doorway header beam at y = 5.8 and transom glazing y = 5.8..9.0
    const doorBeam = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.22, 0.26), ironMat);
    doorBeam.position.set(0, 5.85, 0);
    fg.add(doorBeam);

    const doorwayArch = new THREE.Mesh(createArchRibbonGeometry(2.15, 2.38, 0.16, 0, Math.PI, 28), ironMat);
    doorwayArch.position.set(0, 5.95, 0);
    fg.add(doorwayArch);

    const centerTransomPane = new THREE.Mesh(new THREE.PlaneGeometry(4.78, 3.05), wallGlassMat);
    centerTransomPane.position.set(0, 7.42, 0);
    centerTransomPane.renderOrder = 2;
    fg.add(centerTransomPane);

    // Horizontal springline entablature across full 12m width at y = 9.0
    const springBeam = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.28, 0.34), ironMat);
    springBeam.position.set(0, 9.0, 0);
    fg.add(springBeam);

    // --- Iconic Semi-Circular Sunburst Glass Gable (y = 9.0..15.0, R = 6.0m) ---
    const gable = new THREE.Group();
    gable.position.set(0, 9.0, 0);

    const glass = new THREE.Mesh(gableGlassGeo, wallGlassMat);
    glass.renderOrder = 2;
    gable.add(glass);

    gable.add(new THREE.Mesh(outerGableArch, ironMat));
    gable.add(new THREE.Mesh(midRingArch46, ironMat));
    gable.add(new THREE.Mesh(innerRingArch26, ironMat));
    gable.add(new THREE.Mesh(coreRingArch10, ironMat));

    // 15 Radiating sunburst glazing bars (from r=0.95 to r=5.85)
    const rayCount = 16;
    for (let i = 1; i < rayCount; i++) {
      const theta = (i / rayCount) * Math.PI;
      const len = 4.92;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.11), ironMat);
      const midR = 0.95 + len * 0.5;
      bar.position.set(Math.cos(theta) * midR, Math.sin(theta) * midR, 0);
      bar.rotation.z = theta;
      gable.add(bar);
    }

    // Center vertical king-post bar & ornate apex pediment crest
    const kingPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.0, 0.2), ironMat);
    kingPost.position.set(0, 3.0, 0);
    gable.add(kingPost);

    // Decorative scalloped cresting along outer arch perimeter
    for (let i = 2; i <= 18; i++) {
      const theta = (i / 20) * Math.PI;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 6), ironMat);
      spike.position.set(Math.cos(theta) * 6.22, Math.sin(theta) * 6.22, 0);
      spike.rotation.z = theta - Math.PI * 0.5;
      gable.add(spike);
    }

    // Tall apex finial rising above the arch peak (y = 15.0 + 1.8 = 16.8m)
    const apexPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.45, 10), ironMat);
    apexPedestal.position.set(0, 6.22, 0);
    gable.add(apexPedestal);

    fg.add(gable);
    addFinial(
      x + Math.sin(rotY) * 0,
      15.45,
      z + Math.cos(rotY) * 0,
      1.35
    );

    // --- Projecting Grand Entrance Portico (+Z) ---
    if (isFrontPortico) {
      const pg = new THREE.Group();
      pg.position.set(0, 0, 0);

      // Paired outer fluted portico columns at z = +2.05
      for (const px of [-3.75, -2.55, 2.55, 3.75]) {
        addColumn(px, 1.2, z + 2.05, 4.6, 0.13);
      }

      // Portico entablature beams at y = 5.8
      const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.36, 0.34), ironMat);
      frontBeam.position.set(0, 5.88, 2.05);
      pg.add(frontBeam);

      for (const sideX of [-3.85, 3.85]) {
        const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 2.2), ironMat);
        sideBeam.position.set(sideX, 5.88, 1.05);
        pg.add(sideBeam);
      }

      // Arched Portico Canopy (R = 3.85m, center y = 5.9, spanning z = 0..2.15)
      const canopyR = 3.85;
      const canopyLen = 2.25;
      const canopyGeo = new THREE.CylinderGeometry(canopyR, canopyR, canopyLen, 28, 1, true, -Math.PI * 0.5, Math.PI);
      canopyGeo.rotateZ(Math.PI * 0.5);
      canopyGeo.rotateY(Math.PI * 0.5);
      // Wait: let's orient barrel cleanly along Z using an explicit Extrude or curved cylinder!
      const pRoof = new THREE.Mesh(
        new THREE.CylinderGeometry(canopyR, canopyR, canopyLen, 28, 1, true, 0, Math.PI),
        roofGlassMat
      );
      pRoof.rotation.x = Math.PI * 0.5;
      pRoof.rotation.z = Math.PI * 0.5;
      // Rotate so curved arc sits in XY plane (+Y up) and cylinder axis runs along Z!
      pRoof.rotation.set(Math.PI * 0.5, 0, -Math.PI * 0.5);
      // Let's double check CylinderGeometry axis: default cylinder axis is Y.
      // Rotating X by +PI/2 aligns cylinder axis along Z!
      // With thetaStart=0..PI, angles go from +Z around +X to -Z initially, then after rotX(PI/2) let's test explicitly with clean Ribbon & Lathe/Arch!
      pRoof.visible = false;

      // Build unambiguous curved canopy glass via thin arch extrusion along Z!
      const canopyShape = new THREE.Shape();
      const segs = 28;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI;
        const ax = Math.cos(a) * canopyR;
        const ay = Math.sin(a) * (canopyR * 0.62); // Graceful elliptical Victorian arch
        if (i === 0) canopyShape.moveTo(ax, ay);
        else canopyShape.lineTo(ax, ay);
      }
      for (let i = segs; i >= 0; i--) {
        const a = (i / segs) * Math.PI;
        const ax = Math.cos(a) * (canopyR - 0.04);
        const ay = Math.sin(a) * ((canopyR - 0.04) * 0.62);
        canopyShape.lineTo(ax, ay);
      }
      canopyShape.closePath();

      const canopyGlassGeo = new THREE.ExtrudeGeometry(canopyShape, { depth: 2.2, bevelEnabled: false });
      const canopyGlass = new THREE.Mesh(canopyGlassGeo, roofGlassMat);
      canopyGlass.position.set(0, 5.95, 0);
      canopyGlass.renderOrder = 2;
      pg.add(canopyGlass);

      // Front & mid portico iron arch ribs
      const ribShape = new THREE.Shape();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI;
        const ax = Math.cos(a) * (canopyR + 0.08);
        const ay = Math.sin(a) * ((canopyR + 0.08) * 0.62);
        if (i === 0) ribShape.moveTo(ax, ay);
        else ribShape.lineTo(ax, ay);
      }
      for (let i = segs; i >= 0; i--) {
        const a = (i / segs) * Math.PI;
        const ax = Math.cos(a) * (canopyR - 0.24);
        const ay = Math.sin(a) * ((canopyR - 0.24) * 0.62);
        ribShape.lineTo(ax, ay);
      }
      ribShape.closePath();
      const ribGeo = new THREE.ExtrudeGeometry(ribShape, { depth: 0.14, bevelEnabled: false });

      for (const rz of [0.05, 1.05, 2.08]) {
        const rib = new THREE.Mesh(ribGeo, ironMat);
        rib.position.set(0, 5.95, rz);
        pg.add(rib);
      }

      // Portico longitudinal purlins & apex crest
      for (let i = 1; i <= 7; i++) {
        const a = (i / 8) * Math.PI;
        const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.25), ironMat);
        purlin.position.set(Math.cos(a) * canopyR, 5.95 + Math.sin(a) * (canopyR * 0.62), 1.1);
        pg.add(purlin);
      }
      addFinial(0, 8.32, z + 2.1, 0.78);

      // Heritage Signboard ("LALBAGH GLASS HOUSE • EST. 1889")
      const signTex = createSignboardTexture(
        'LALBAGH GLASS HOUSE',
        'EST. 1889  •  ALBERT VICTOR CONSERVATORY  •  BENGALURU',
        maxAnisotropy
      );
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(5.1, 1.08, 0.14),
        [
          brassMat,
          brassMat,
          brassMat,
          brassMat,
          new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.35, metalness: 0.15 }),
          darkGreenFrameMat
        ]
      );
      signBoard.position.set(0, 6.22, 2.22);
      pg.add(signBoard);

      // Hanging Wrought-Iron Porch Lantern
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.25, 8), darkGreenFrameMat);
      chain.position.set(0, 6.75, 1.2);
      pg.add(chain);

      const lanternCage = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.18, 0.48, 6), darkGreenFrameMat);
      lanternCage.position.set(0, 6.02, 1.2);
      pg.add(lanternCage);

      const lanternBulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bulbGlowMat);
      lanternBulb.position.set(0, 6.02, 1.2);
      pg.add(lanternBulb);

      fg.add(pg);
    }

    facadesGroup.add(fg);
  }

  buildCardinalFacade({ x: 0, z: 21.0, rotY: 0, isFrontPortico: true });
  buildCardinalFacade({ x: 0, z: -21.0, rotY: Math.PI, isFrontPortico: false });
  buildCardinalFacade({ x: 24.0, z: 0, rotY: Math.PI * 0.5, isFrontPortico: false });
  buildCardinalFacade({ x: -24.0, z: 0, rotY: -Math.PI * 0.5, isFrontPortico: false });

  // =========================================================================
  // 7. FOUR BARREL-VAULTED GLASS ROOFS (y = 9.0..15.0, R = 6.0m)
  //    Stopped cleanly at x = ±6 / z = ±6 so vaults NEVER overlap!
  // =========================================================================
  const vaultsGroup = new THREE.Group();
  vaultsGroup.name = 'BarrelVaults';
  root.add(vaultsGroup);

  const vaultOuterR = 6.0;
  const vaultTrussOuter = createArchRibbonGeometry(5.6, 6.04, 0.16, 0, Math.PI, 36);
  const vaultInnerRingGeo = new THREE.TorusGeometry(0.15, 0.025, 6, 12);

  // Build thin curved vault glazing mesh using ExtrudeGeometry along local +Z from -len/2 to +len/2
  function createVaultGlassGeo(radius, length) {
    const segs = 32;
    const shape = new THREE.Shape();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    for (let i = segs; i >= 0; i--) {
      const a = (i / segs) * Math.PI;
      const px = Math.cos(a) * (radius - 0.04);
      const py = Math.sin(a) * (radius - 0.04);
      shape.lineTo(px, py);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
    geo.translate(0, 0, -length * 0.5);
    return geo;
  }

  function buildBarrelVaultArm({ centerX, centerZ, length, rotY, bayStep = 3.0 }) {
    const vg = new THREE.Group();
    vg.position.set(centerX, 9.0, centerZ);
    vg.rotation.y = rotY;

    // Glass shell
    const glass = new THREE.Mesh(createVaultGlassGeo(vaultOuterR, length), roofGlassMat);
    glass.renderOrder = 2;
    vg.add(glass);

    // Double-chord webbed iron arch trusses every 3.0m
    const numBays = Math.round(length / bayStep);
    for (let i = 0; i <= numBays; i++) {
      const lz = -length * 0.5 + i * bayStep;
      const truss = new THREE.Mesh(vaultTrussOuter, ironMat);
      truss.position.set(0, 0, lz);
      vg.add(truss);

      // Radial struts & filigree rings between inner (5.6) & outer (6.0) chords
      for (let s = 1; s < 12; s++) {
        const a = (s / 12) * Math.PI;
        const ring = new THREE.Mesh(vaultInnerRingGeo, ironMat);
        ring.position.set(Math.cos(a) * 5.81, Math.sin(a) * 5.81, lz);
        vg.add(ring);
      }

      // Delicate intermediate glazing ribs every 1.5m
      if (i < numBays) {
        const subRib = new THREE.Mesh(
          createArchRibbonGeometry(5.92, 6.02, 0.06, 0, Math.PI, 28),
          ironMat
        );
        subRib.position.set(0, 0, lz + bayStep * 0.5);
        vg.add(subRib);
      }
    }

    // Longitudinal purlins along the curved vault
    for (let p = 1; p < 12; p++) {
      if (p === 6) continue; // apex handled by ventilation monitor
      const a = (p / 12) * Math.PI;
      const purlin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, length), ironMat);
      purlin.position.set(Math.cos(a) * 5.98, Math.sin(a) * 5.98, 0);
      vg.add(purlin);
    }

    // Raised Ridge Ventilation Monitor (local y = 5.8..7.0 -> world y = 14.8..16.0)
    const monW = 2.0;
    const monBaseY = 5.85;
    const monSideH = 0.72;
    for (const sx of [-monW * 0.5, monW * 0.5]) {
      const louverGlass = new THREE.Mesh(new THREE.PlaneGeometry(length, monSideH), wallGlassMat);
      louverGlass.rotation.y = Math.PI * 0.5;
      louverGlass.position.set(sx, monBaseY + monSideH * 0.5, 0);
      louverGlass.renderOrder = 2;
      vg.add(louverGlass);

      const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, length), ironMat);
      topRail.position.set(sx, monBaseY + monSideH, 0);
      vg.add(topRail);
    }

    // Pitched ridge cap over the ventilation monitor
    const capSlopeLen = 1.24;
    const capAngle = 0.52;
    for (const side of [-1, 1]) {
      const capGlass = new THREE.Mesh(new THREE.PlaneGeometry(capSlopeLen, length), roofGlassMat);
      capGlass.rotation.x = -Math.PI * 0.5;
      capGlass.rotation.z = side * -capAngle;
      capGlass.position.set(side * 0.52, monBaseY + monSideH + 0.25, 0);
      capGlass.renderOrder = 2;
      vg.add(capGlass);

      const capEave = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, length), ironMat);
      capEave.position.set(side * 1.05, monBaseY + monSideH, 0);
      vg.add(capEave);
    }

    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, length), ironMat);
    ridgeBeam.position.set(0, monBaseY + monSideH + 0.52, 0);
    vg.add(ridgeBeam);

    // Register decorative cresting along top ridge
    const worldStart = new THREE.Vector3(0, 9.0 + monBaseY + monSideH + 0.58, -length * 0.5)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
      .add(new THREE.Vector3(centerX, 0, centerZ));
    const worldEnd = new THREE.Vector3(0, 9.0 + monBaseY + monSideH + 0.58, length * 0.5)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
      .add(new THREE.Vector3(centerX, 0, centerZ));
    addCrestRun(worldStart.x, worldStart.z, worldEnd.x, worldEnd.z, worldStart.y, 0.42);

    vaultsGroup.add(vg);
  }

  // Exact non-overlapping barrel vault lengths:
  // West Arm: x in [-24, -6] -> centerX = -15, length = 18m
  buildBarrelVaultArm({ centerX: -15.0, centerZ: 0, length: 18.0, rotY: Math.PI * 0.5 });
  // East Arm: x in [+6, +24] -> centerX = +15, length = 18m
  buildBarrelVaultArm({ centerX: 15.0, centerZ: 0, length: 18.0, rotY: Math.PI * 0.5 });
  // North 1935 Arm: z in [-21, -6] -> centerZ = -13.5, length = 15m
  buildBarrelVaultArm({ centerX: 0, centerZ: -13.5, length: 15.0, rotY: 0 });
  // South Front Arm: z in [+6, +21] -> centerZ = +13.5, length = 15m
  buildBarrelVaultArm({ centerX: 0, centerZ: 13.5, length: 15.0, rotY: 0 });

  // =========================================================================
  // 8. CENTRAL CROSSING DOME & OCTAGONAL LANTERN CUPOLA (x,z in [-6, +6])
  // =========================================================================
  const crossingGroup = new THREE.Group();
  crossingGroup.name = 'CrossingCupola';
  root.add(crossingGroup);

  // Corner crossing pier capitals & diagonal pendentive ribs (y = 9.0..15.0)
  for (const sx of [-6, 6]) {
    for (const sz of [-6, 6]) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.45), ironMat);
      cap.position.set(sx, 9.05, sz);
      crossingGroup.add(cap);
    }
  }

  // 4 grand crossing arch frames at x = ±6 and z = ±6 already sit at the ends of the barrel vaults,
  // plus add 2 intersecting diagonal crossing ribs curving from (±6, 9, ±6) up to the cupola ring at y=16.5!
  for (const angle of [Math.PI * 0.25, Math.PI * 0.75]) {
    const diagCurvePoints = [];
    const diagSpan = Math.SQRT2 * 6.0;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const s = -diagSpan + t * 2 * diagSpan;
      const y = 9.0 + Math.cos((s / diagSpan) * Math.PI * 0.5) * 7.5;
      diagCurvePoints.push(new THREE.Vector3(Math.cos(angle) * s, y, Math.sin(angle) * s));
    }
    const diagGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(diagCurvePoints), 24, 0.14, 8, false);
    crossingGroup.add(new THREE.Mesh(diagGeo, ironMat));
  }

  // Curved square-to-octagon hipped glazed crossing roof skirt (y = 15.0..16.5)
  // Built cleanly as 4 trapezoidal sloped glass planes + diagonal hip rafters connecting the 12x12 vault apexes to the octagonal base (R = 3.6m at y = 16.5)
  const skirtR = 3.55;
  for (let side = 0; side < 4; side++) {
    const rot = side * Math.PI * 0.5;
    const sg = new THREE.Group();
    sg.rotation.y = rot;

    // Glazed hip triangle/trapezoid from outer corner (-6..+6, y=9..15) up to octagonal collar (y=16.5)
    const pA = new THREE.Vector3(-6, 9.0, 6);
    const pB = new THREE.Vector3(6, 9.0, 6);
    const pC = new THREE.Vector3(2.5, 16.5, 2.5);
    const pD = new THREE.Vector3(-2.5, 16.5, 2.5);
    const pPeak = new THREE.Vector3(0, 15.0, 6);

    const skirtGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      // Left spandrel triangle
      pA.x, pA.y, pA.z,   pPeak.x, pPeak.y, pPeak.z,   pD.x, pD.y, pD.z,
      // Center crown quad (2 tris)
      pPeak.x, pPeak.y, pPeak.z,   pC.x, pC.y, pC.z,   pD.x, pD.y, pD.z,
      // Right spandrel triangle
      pPeak.x, pPeak.y, pPeak.z,   pB.x, pB.y, pB.z,   pC.x, pC.y, pC.z
    ]);
    skirtGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    skirtGeo.computeVertexNormals();
    const skirtMesh = new THREE.Mesh(skirtGeo, roofGlassMat);
    skirtMesh.renderOrder = 2;
    sg.add(skirtMesh);

    crossingGroup.add(sg);
  }

  // Octagonal Cupola Base Ring (y = 16.5)
  const cupolaBaseRing = new THREE.Mesh(new THREE.CylinderGeometry(skirtR, skirtR + 0.18, 0.36, 8), ironMat);
  cupolaBaseRing.position.set(0, 16.5, 0);
  cupolaBaseRing.rotation.y = Math.PI / 8;
  crossingGroup.add(cupolaBaseRing);

  // Octagonal Glazed Lantern Cupola (y = 16.65..19.25, radius = 3.2m)
  const cupR = 3.2;
  const cupBaseY = 16.65;
  const cupH = 2.6;

  for (let i = 0; i < 8; i++) {
    const theta0 = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const theta1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const midTheta = (theta0 + theta1) * 0.5;
    const faceW = 2 * cupR * Math.sin(Math.PI / 8);

    // Corner post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, cupH + 0.2, 10), ironMat);
    post.position.set(Math.cos(theta0) * cupR, cupBaseY + cupH * 0.5, Math.sin(theta0) * cupR);
    crossingGroup.add(post);

    // Face glazed window
    const faceGroup = new THREE.Group();
    faceGroup.position.set(Math.cos(midTheta) * (cupR * Math.cos(Math.PI / 8)), cupBaseY, Math.sin(midTheta) * (cupR * Math.cos(Math.PI / 8)));
    faceGroup.rotation.y = Math.atan2(Math.cos(midTheta), Math.sin(midTheta));

    const cGlass = new THREE.Mesh(new THREE.PlaneGeometry(faceW - 0.12, cupH - 0.15), wallGlassMat);
    cGlass.position.set(0, cupH * 0.5, 0);
    cGlass.renderOrder = 2;
    faceGroup.add(cGlass);

    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.05, cupH - 0.15, 0.06), ironMat);
    mullion.position.set(0, cupH * 0.5, 0);
    faceGroup.add(mullion);

    const cupolaArch = new THREE.Mesh(createArchRibbonGeometry(faceW * 0.36, faceW * 0.46, 0.08, 0, Math.PI, 16), ironMat);
    cupolaArch.position.set(0, cupH - faceW * 0.45, 0);
    faceGroup.add(cupolaArch);

    crossingGroup.add(faceGroup);
  }

  // Cupola Cornice Ring (y = 19.25)
  const cupolaCornice = new THREE.Mesh(new THREE.CylinderGeometry(cupR + 0.18, cupR + 0.05, 0.28, 8), ironMat);
  cupolaCornice.position.set(0, 19.25, 0);
  cupolaCornice.rotation.y = Math.PI / 8;
  crossingGroup.add(cupolaCornice);

  // Ogee / Domed Octagonal Glass Cap (y = 19.35..21.4)
  const domePoints = [
    new THREE.Vector2(cupR, 0.0),
    new THREE.Vector2(cupR * 0.88, 0.65),
    new THREE.Vector2(cupR * 0.62, 1.3),
    new THREE.Vector2(cupR * 0.28, 1.85),
    new THREE.Vector2(0.24, 2.15)
  ];
  const domeGlassGeo = new THREE.LatheGeometry(domePoints, 8);
  domeGlassGeo.rotateY(Math.PI / 8);
  const domeGlass = new THREE.Mesh(domeGlassGeo, roofGlassMat);
  domeGlass.position.set(0, 19.35, 0);
  domeGlass.renderOrder = 2;
  crossingGroup.add(domeGlass);

  // 8 Curved Iron Dome Ribs
  for (let i = 0; i < 8; i++) {
    const theta = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const ribPts = domePoints.map(
      (p) => new THREE.Vector3(Math.cos(theta) * p.x, 19.35 + p.y, Math.sin(theta) * p.x)
    );
    const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 16, 0.065, 8, false);
    crossingGroup.add(new THREE.Mesh(ribGeo, ironMat));
  }

  // Cupola Crown Ring & Tall Wrought-Iron Spire Finial (y = 21.4..23.2m)
  const crownOrb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), brassMat);
  crownOrb.position.set(0, 21.55, 0);
  crossingGroup.add(crownOrb);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.55, 10), ironMat);
  spire.position.set(0, 22.42, 0);
  crossingGroup.add(spire);

  const spireTip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), brassMat);
  spireTip.position.set(0, 23.2, 0);
  crossingGroup.add(spireTip);

  // =========================================================================
  // 9. SUSPENDED VICTORIAN WROUGHT-IRON CHANDELIERS (9 total)
  // =========================================================================
  const chandeliersGroup = new THREE.Group();
  chandeliersGroup.name = 'Chandeliers';
  root.add(chandeliersGroup);

  function buildChandelier(x, yTop, z, dropLen, radius, arms) {
    const cg = new THREE.Group();
    cg.position.set(x, yTop, z);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, dropLen, 8), darkGreenFrameMat);
    rod.position.set(0, -dropLen * 0.5, 0);
    cg.add(rod);

    const hubY = -dropLen;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.04, 8, 24), brassMat);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.set(0, hubY, 0);
    cg.add(ring);

    const centerPendant = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bulbGlowMat);
    centerPendant.position.set(0, hubY - 0.14, 0);
    cg.add(centerPendant);

    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2;
      const bx = Math.cos(a) * radius;
      const bz = Math.sin(a) * radius;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, radius, 6), darkGreenFrameMat);
      spoke.rotation.z = Math.PI * 0.5;
      spoke.rotation.y = -a;
      spoke.position.set(bx * 0.5, hubY, bz * 0.5);
      cg.add(spoke);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), bulbGlowMat);
      globe.position.set(bx, hubY + 0.12, bz);
      cg.add(globe);
    }

    chandeliersGroup.add(cg);
  }

  // Grand central crossing chandelier suspended from cupola crown
  buildChandelier(0, 19.2, 0, 7.6, 1.55, 8);
  // 2 chandeliers along each of the 4 barrel-vault arms
  for (const cx of [-18, -10, 10, 18]) buildChandelier(cx, 14.8, 0, 5.2, 0.9, 6);
  for (const cz of [-16, -9, 9, 16]) buildChandelier(0, 14.8, cz, 5.2, 0.9, 6);

  // =========================================================================
  // 10. INSTANCED CAST-IRON COLUMNS, FINIALS & ROOF CRESTING PICKETS
  // =========================================================================
  // Deduplicate exact column coordinates
  const uniqueCols = [];
  const colSeen = new Set();
  for (const c of columnPlacements) {
    const key = `${c.x.toFixed(2)},${c.z.toFixed(2)},${c.height.toFixed(2)}`;
    if (colSeen.has(key)) continue;
    colSeen.add(key);
    uniqueCols.push(c);
  }

  const colShaftGeo = new THREE.CylinderGeometry(1.0, 1.12, 1.0, 12);
  const colCapGeo = new THREE.CylinderGeometry(1.65, 1.1, 0.24, 12);
  const colBaseGeo = new THREE.BoxGeometry(2.8, 0.28, 2.8);

  const shaftInst = new THREE.InstancedMesh(colShaftGeo, ironMat, uniqueCols.length);
  const capInst = new THREE.InstancedMesh(colCapGeo, ironMat, uniqueCols.length);
  const baseInst = new THREE.InstancedMesh(colBaseGeo, ironTrimMat, uniqueCols.length);
  shaftInst.castShadow = true;
  shaftInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  uniqueCols.forEach((c, idx) => {
    dummy.position.set(c.x, c.yBase + c.height * 0.5, c.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(c.radius, c.height, c.radius);
    dummy.updateMatrix();
    shaftInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(c.x, c.yBase + c.height - 0.14, c.z);
    dummy.scale.set(c.radius, 1, c.radius);
    dummy.updateMatrix();
    capInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(c.x, c.yBase + 0.14, c.z);
    dummy.scale.set(c.radius, 1, c.radius);
    dummy.updateMatrix();
    baseInst.setMatrixAt(idx, dummy.matrix);
  });
  shaftInst.instanceMatrix.needsUpdate = true;
  capInst.instanceMatrix.needsUpdate = true;
  baseInst.instanceMatrix.needsUpdate = true;
  root.add(shaftInst, capInst, baseInst);

  // Instanced Finials
  const finialGeo = new THREE.ConeGeometry(0.14, 1.25, 8);
  const finialInst = new THREE.InstancedMesh(finialGeo, ironMat, finialPlacements.length);
  finialPlacements.forEach((f, idx) => {
    dummy.position.set(f.x, f.y + 0.62 * f.scale, f.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(f.scale);
    dummy.updateMatrix();
    finialInst.setMatrixAt(idx, dummy.matrix);
  });
  finialInst.instanceMatrix.needsUpdate = true;
  root.add(finialInst);

  // Instanced Roof Cresting Pickets
  const picketGeo = new THREE.ConeGeometry(0.05, 0.36, 5);
  const picketInst = new THREE.InstancedMesh(picketGeo, ironMat, crestingPlacements.length);
  crestingPlacements.forEach((p, idx) => {
    dummy.position.set(p.x, p.y + 0.16, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    picketInst.setMatrixAt(idx, dummy.matrix);
  });
  picketInst.instanceMatrix.needsUpdate = true;
  root.add(picketInst);

  return {
    group: root,
    emissiveBulbs,
    glassMats: [wallGlassMat, roofGlassMat]
  };
}
