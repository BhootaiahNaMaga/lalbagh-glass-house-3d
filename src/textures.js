import * as THREE from 'three';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function configureTexture(tex, { repeatX = 1, repeatY = 1, srgb = true, maxAnisotropy = 8 } = {}) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Seeded pseudo-random helper so procedural textures look crisp and deterministic.
 */
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
 * Heritage checkered Bangalore stone & slate-green diamond floor tile textures.
 */
export function createFloorTileTextures(maxAnisotropy = 8) {
  const size = 512;
  const { canvas: cMap, ctx: gMap } = makeCanvas(size, size);
  const { canvas: cRough, ctx: gRough } = makeCanvas(size, size);
  const { canvas: cBump, ctx: gBump } = makeCanvas(size, size);
  const rand = mulberry32(1889);

  // Grout base
  gMap.fillStyle = '#8b8373';
  gMap.fillRect(0, 0, size, size);
  gRough.fillStyle = '#cfcfcf';
  gRough.fillRect(0, 0, size, size);
  gBump.fillStyle = '#404040';
  gBump.fillRect(0, 0, size, size);

  const cells = 4;
  const step = size / cells;
  const grout = 4;

  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const isDark = (row + col) % 2 === 0;
      const x = col * step + grout * 0.5;
      const y = row * step + grout * 0.5;
      const w = step - grout;

      // Subtle mineral color variation
      const jitter = Math.floor((rand() - 0.5) * 14);
      if (isDark) {
        gMap.fillStyle = `rgb(${40 + jitter}, ${61 + jitter}, ${51 + jitter})`;
        gRough.fillStyle = 'rgb(75,75,75)';
      } else {
        gMap.fillStyle = `rgb(${216 + jitter}, ${205 + jitter}, ${183 + jitter})`;
        gRough.fillStyle = 'rgb(96,96,96)';
      }
      gMap.fillRect(x, y, w, w);
      gRough.fillRect(x, y, w, w);
      gBump.fillStyle = '#dadada';
      gBump.fillRect(x, y, w, w);

      // Subtle stone flecks
      for (let i = 0; i < 48; i++) {
        const fx = x + rand() * w;
        const fy = y + rand() * w;
        const r = 1 + rand() * 2.4;
        gMap.fillStyle = isDark
          ? `rgba(255,255,255,${0.03 + rand() * 0.05})`
          : `rgba(90,78,56,${0.03 + rand() * 0.06})`;
        gMap.beginPath();
        gMap.arc(fx, fy, r, 0, Math.PI * 2);
        gMap.fill();
      }
    }
  }

  const map = configureTexture(new THREE.CanvasTexture(cMap), {
    repeatX: 1,
    repeatY: 1,
    srgb: true,
    maxAnisotropy
  });
  const roughnessMap = configureTexture(new THREE.CanvasTexture(cRough), {
    repeatX: 1,
    repeatY: 1,
    srgb: false,
    maxAnisotropy
  });
  const bumpMap = configureTexture(new THREE.CanvasTexture(cBump), {
    repeatX: 1,
    repeatY: 1,
    srgb: false,
    maxAnisotropy
  });

  return { map, roughnessMap, bumpMap };
}

/**
 * Grand circular Victorian botanical compass-lotus mosaic medallion under the Central Crossing.
 */
export function createCrossingMedallionTexture(maxAnisotropy = 8) {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.clearRect(0, 0, size, size);

  // Outer granite ring
  ctx.beginPath();
  ctx.arc(cx, cy, 496, 0, Math.PI * 2);
  ctx.fillStyle = '#2d443a';
  ctx.fill();

  // Brass border ring
  ctx.beginPath();
  ctx.arc(cx, cy, 480, 0, Math.PI * 2);
  ctx.strokeStyle = '#c8a256';
  ctx.lineWidth = 10;
  ctx.stroke();

  // Sandstone field
  ctx.beginPath();
  ctx.arc(cx, cy, 466, 0, Math.PI * 2);
  ctx.fillStyle = '#ddd1b6';
  ctx.fill();

  // Outer botanical scalloped ring (16 alternating petals)
  const petalCount = 16;
  for (let i = 0; i < petalCount; i++) {
    const a0 = (i / petalCount) * Math.PI * 2;
    const a1 = ((i + 1) / petalCount) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 432, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#314d40' : '#7b3228';
    ctx.fill();
    ctx.strokeStyle = '#d4b46a';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Inner cream circle
  ctx.beginPath();
  ctx.arc(cx, cy, 315, 0, Math.PI * 2);
  ctx.fillStyle = '#e4d9c0';
  ctx.fill();
  ctx.strokeStyle = '#314d40';
  ctx.lineWidth = 14;
  ctx.stroke();

  // 8-point Victorian compass star
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -290);
    ctx.lineTo(38, -70);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#b7893a' : '#2f4b3e';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -290);
    ctx.lineTo(-38, -70);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? '#8c6525' : '#22362d';
    ctx.fill();
    ctx.restore();
  }

  // Central lotus rosette
  ctx.beginPath();
  ctx.arc(cx, cy, 96, 0, Math.PI * 2);
  ctx.fillStyle = '#253c32';
  ctx.fill();
  ctx.strokeStyle = '#d7b46a';
  ctx.lineWidth = 8;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -48, 16, 34, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#d9b56c' : '#8d392c';
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#e5c67e';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Bangalore Peninsular Gneiss speckled ashlar granite plinth textures.
 */
export function createGraniteTextures(maxAnisotropy = 8) {
  const size = 512;
  const { canvas: cMap, ctx: gMap } = makeCanvas(size, size);
  const { canvas: cBump, ctx: gBump } = makeCanvas(size, size);
  const rand = mulberry32(4211);

  gMap.fillStyle = '#8b8a84';
  gMap.fillRect(0, 0, size, size);
  gBump.fillStyle = '#808080';
  gBump.fillRect(0, 0, size, size);

  const rows = 4;
  const cols = 2;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset;
      const y = r * rowH;
      const shade = Math.floor(132 + (rand() - 0.5) * 26);
      const warm = Math.floor((rand() - 0.5) * 10);

      gMap.fillStyle = `rgb(${shade + warm + 4}, ${shade + 2}, ${shade - 4})`;
      gMap.fillRect(x + 3, y + 3, colW - 6, rowH - 6);

      gBump.fillStyle = `rgb(${155 + Math.floor((rand() - 0.5) * 30)}, ${155}, ${155})`;
      gBump.fillRect(x + 3, y + 3, colW - 6, rowH - 6);

      // Granite mineral speckles
      for (let i = 0; i < 160; i++) {
        const sx = x + 4 + rand() * (colW - 8);
        const sy = y + 4 + rand() * (rowH - 8);
        const sr = 0.8 + rand() * 2.2;
        const dark = rand() > 0.48;
        gMap.fillStyle = dark
          ? `rgba(46,48,46,${0.18 + rand() * 0.25})`
          : `rgba(232,226,214,${0.14 + rand() * 0.2})`;
        gMap.fillRect(sx, sy, sr, sr);
      }

      // Mortar bevel
      gMap.strokeStyle = 'rgba(65, 63, 58, 0.72)';
      gMap.lineWidth = 4;
      gMap.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);

      gBump.strokeStyle = '#383838';
      gBump.lineWidth = 5;
      gBump.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);
    }
  }

  const map = configureTexture(new THREE.CanvasTexture(cMap), {
    repeatX: 2,
    repeatY: 1,
    srgb: true,
    maxAnisotropy
  });
  const bumpMap = configureTexture(new THREE.CanvasTexture(cBump), {
    repeatX: 2,
    repeatY: 1,
    srgb: false,
    maxAnisotropy
  });
  return { map, bumpMap };
}

/**
 * Richly dappled tropical Bangalore garden lawn texture (organic variation, never flat neon green).
 */
export function createLawnTexture(maxAnisotropy = 8) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(9901);

  ctx.fillStyle = '#365b2d';
  ctx.fillRect(0, 0, size, size);

  // Soft mossy patches
  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 14 + rand() * 42;
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    const warm = rand() > 0.45;
    grad.addColorStop(0, warm ? 'rgba(72, 109, 45, 0.28)' : 'rgba(38, 72, 34, 0.28)');
    grad.addColorStop(1, 'rgba(54, 91, 45, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine grass blades
  for (let i = 0; i < 6500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 3 + rand() * 6;
    const g = 75 + Math.floor(rand() * 55);
    const r = 34 + Math.floor(rand() * 35);
    const b = 26 + Math.floor(rand() * 20);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.42)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 3, y - len);
    ctx.stroke();
  }

  return configureTexture(new THREE.CanvasTexture(canvas), {
    repeatX: 28,
    repeatY: 28,
    srgb: true,
    maxAnisotropy
  });
}

/**
 * Warm terracotta-ochre red Bangalore garden gravel texture.
 */
export function createGravelPathTexture(maxAnisotropy = 8) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(7731);

  ctx.fillStyle = '#9e7454';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 160; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 12 + rand() * 32;
    const grad = ctx.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, rand() > 0.5 ? 'rgba(176, 129, 92, 0.24)' : 'rgba(122, 86, 60, 0.22)');
    grad.addColorStop(1, 'rgba(158, 116, 84, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 5500; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 0.8 + rand() * 2.2;
    const tone = rand();
    if (tone < 0.33) ctx.fillStyle = 'rgba(196, 155, 118, 0.45)';
    else if (tone < 0.66) ctx.fillStyle = 'rgba(120, 82, 56, 0.42)';
    else ctx.fillStyle = 'rgba(218, 187, 150, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return configureTexture(new THREE.CanvasTexture(canvas), {
    repeatX: 12,
    repeatY: 12,
    srgb: true,
    maxAnisotropy
  });
}

/**
 * Crisp heritage fascia signboard mounted on the Front Portico.
 */
export function createSignboardTexture(
  title = 'LALBAGH GLASS HOUSE',
  subtitle = 'EST. 1889  •  ALBERT VICTOR CONSERVATORY  •  BENGALURU',
  maxAnisotropy = 8
) {
  const w = 1024;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);

  // Deep botanical green enamel
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#133529');
  bg.addColorStop(0.5, '#0f2b21');
  bg.addColorStop(1, '#0b2119');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Outer & inner brass molding borders
  ctx.strokeStyle = '#d7b267';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.strokeStyle = 'rgba(229, 198, 126, 0.48)';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  // Corner floral rivets
  const corners = [
    [40, 40],
    [w - 40, 40],
    [40, h - 40],
    [w - 40, h - 40]
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e5c67e';
    ctx.fill();
  }

  // Crisp serif lettering
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5e8c2';
  ctx.font = 'bold 62px Georgia, "Times New Roman", serif';
  ctx.fillText(title, w * 0.5, h * 0.43);

  ctx.fillStyle = '#d5b16a';
  ctx.font = '600 22px Georgia, "Times New Roman", serif';
  ctx.fillText(subtitle, w * 0.5, h * 0.74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Soft radial glow sprite texture for dust motes, spray droplets, and lantern halos.
 */
export function createSoftGlowTexture() {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size, size);
  const c = size * 0.5;
  const grad = ctx.createRadialGradient(c, c, 2, c, c, c);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.28, 'rgba(255, 248, 228, 0.78)');
  grad.addColorStop(0.65, 'rgba(255, 240, 210, 0.22)');
  grad.addColorStop(1, 'rgba(255, 240, 210, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Delicate flower petal texture for floating botanical particles.
 */
export function createPetalTexture() {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size * 0.5, size * 0.5);
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.bezierCurveTo(20, -16, 22, 16, 0, 24);
  ctx.bezierCurveTo(-22, 16, -20, -16, 0, -24);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, -24, 0, 24);
  grad.addColorStop(0, '#fff4f7');
  grad.addColorStop(0.55, '#f6a7c1');
  grad.addColorStop(1, '#d9577f');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
