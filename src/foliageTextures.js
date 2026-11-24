import * as THREE from 'three';

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

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function finalizeTex(canvas, { repeat = false, srgb = true, maxAnisotropy = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Furrowed dark-umber tropical tree bark with moss-tinted crevices & pale lichen.
 */
export function createBarkTextures(maxAnisotropy = 8) {
  const w = 512;
  const h = 512;
  const { canvas: cMap, ctx: gMap } = makeCanvas(w, h);
  const { canvas: cBump, ctx: gBump } = makeCanvas(w, h);
  const rand = mulberry32(3101);

  gMap.fillStyle = '#473628';
  gMap.fillRect(0, 0, w, h);
  gBump.fillStyle = '#888888';
  gBump.fillRect(0, 0, w, h);

  // Vertical bark ridges & dark fissures
  for (let i = 0; i < 160; i++) {
    const x = rand() * w;
    const width = 4 + rand() * 14;
    const dark = rand() > 0.45;
    gMap.strokeStyle = dark
      ? `rgba(28, 20, 14, ${0.35 + rand() * 0.45})`
      : `rgba(105, 84, 64, ${0.25 + rand() * 0.35})`;
    gMap.lineWidth = width;
    gBump.strokeStyle = dark ? 'rgba(35,35,35,0.65)' : 'rgba(215,215,215,0.55)';
    gBump.lineWidth = width;

    const drawPath = (ctx, offsetX) => {
      ctx.beginPath();
      ctx.moveTo(x + offsetX, 0);
      let cx = x + offsetX;
      for (let y = 32; y <= h; y += 32) {
        cx += (rand() - 0.5) * 10;
        ctx.lineTo(cx, y);
      }
      ctx.stroke();
    };
    drawPath(gMap, 0);
    drawPath(gBump, 0);
  }

  // Moss-tinted crevices & pale tropical lichen patches
  for (let i = 0; i < 85; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const rx = 5 + rand() * 16;
    const ry = 8 + rand() * 24;
    gMap.fillStyle =
      rand() > 0.42
        ? `rgba(54, 78, 38, ${0.18 + rand() * 0.25})`
        : `rgba(148, 144, 125, ${0.15 + rand() * 0.22})`;
    gMap.beginPath();
    gMap.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    gMap.fill();
  }

  const map = finalizeTex(cMap, { repeat: true, srgb: true, maxAnisotropy });
  const bumpMap = finalizeTex(cBump, { repeat: true, srgb: false, maxAnisotropy });
  map.repeat.set(2, 4);
  bumpMap.repeat.set(2, 4);
  return { map, bumpMap };
}

/**
 * Grey-tan palm trunk bark with horizontal leaf-scar rings & fine vertical grain.
 */
export function createPalmTrunkTexture(maxAnisotropy = 8) {
  const w = 256;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = mulberry32(4411);

  const base = ctx.createLinearGradient(0, 0, w, 0);
  base.addColorStop(0, '#827868');
  base.addColorStop(0.5, '#9d9382');
  base.addColorStop(1, '#7a7061');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Fine vertical fiber streaks
  for (let i = 0; i < 420; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 14 + rand() * 48;
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(65, 58, 48, 0.16)' : 'rgba(210, 200, 185, 0.14)';
    ctx.lineWidth = 1 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 2, y + len);
    ctx.stroke();
  }

  // Distinct horizontal leaf-scar rings
  for (let y = 14; y < h; y += 22 + rand() * 8) {
    ctx.strokeStyle = 'rgba(58, 50, 40, 0.58)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.33, y + 3, w * 0.66, y - 2, w, y);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(220, 212, 198, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 3);
    ctx.lineTo(w, y + 3);
    ctx.stroke();
  }

  const tex = finalizeTex(canvas, { repeat: true, srgb: true, maxAnisotropy });
  tex.repeat.set(1, 4);
  return tex;
}

/**
 * Olive-emerald bamboo culm with pale tan nodal rings.
 */
export function createBambooCulmTexture(maxAnisotropy = 8) {
  const w = 256;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = mulberry32(5521);

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#4f7634');
  grad.addColorStop(0.5, '#689344');
  grad.addColorStop(1, '#4b7031');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 200; i++) {
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(145, 180, 96, 0.16)' : 'rgba(38, 62, 24, 0.15)';
    ctx.lineWidth = 1.2;
    const x = rand() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Nodal rings
  for (let y = 42; y < h; y += 92) {
    ctx.fillStyle = 'rgba(42, 61, 28, 0.72)';
    ctx.fillRect(0, y - 4, w, 4);
    ctx.fillStyle = '#c5be88';
    ctx.fillRect(0, y, w, 5);
    ctx.fillStyle = 'rgba(235, 228, 178, 0.6)';
    ctx.fillRect(0, y + 5, w, 2);
  }

  const tex = finalizeTex(canvas, { repeat: true, srgb: true, maxAnisotropy });
  tex.repeat.set(1, 3);
  return tex;
}

/**
 * Alpha-cutout feathery tropical tree foliage cards with air gaps for light & sky.
 * Species: 'rain' | 'gulmohar' | 'jacaranda' | 'bougainvillea'
 */
export function createTreeFoliageTexture(species = 'rain', maxAnisotropy = 8) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(
    species === 'rain' ? 7101 : species === 'gulmohar' ? 7202 : species === 'jacaranda' ? 7303 : 7404
  );

  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.52;

  // Fine dark woody branchlets radiating inside the cluster
  const twigCount = 12;
  const twigTips = [];
  for (let i = 0; i < twigCount; i++) {
    const angle = (i / twigCount) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const len = 115 + rand() * 90;
    const tx = cx + Math.cos(angle) * len;
    const ty = cy + Math.sin(angle) * len * 0.88;
    ctx.strokeStyle = '#3b2b1e';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + Math.cos(angle + 0.2) * len * 0.5,
      cy + Math.sin(angle + 0.2) * len * 0.45,
      tx,
      ty
    );
    ctx.stroke();
    twigTips.push({ angle, len, tx, ty });
  }

  const drawLeafletSpray = (ox, oy, ang, len, leafColor, w = 8, l = 20) => {
    const pairs = 7;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(ang);
    ctx.strokeStyle = '#334d22';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    for (let p = 1; p <= pairs; p++) {
      const px = (p / (pairs + 0.5)) * len;
      const scale = Math.sin((p / pairs) * Math.PI) * 0.65 + 0.45;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(px, 0);
        ctx.rotate(side * 0.72);
        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.ellipse(l * 0.5 * scale, 0, l * 0.5 * scale, w * 0.5 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  };

  if (species === 'rain') {
    const greens = ['#17391a', '#214d22', '#2d6329', '#3d7930', '#4f8b39'];
    // Back depth sprays
    for (let i = 0; i < 68; i++) {
      const a = rand() * Math.PI * 2;
      const dist = Math.pow(rand(), 0.6) * 185;
      const sx = cx + Math.cos(a) * dist;
      const sy = cy + Math.sin(a) * dist * 0.88;
      if (Math.hypot(sx - cx, sy - cy) > 224) continue;
      const col = greens[Math.floor(rand() * 3)];
      drawLeafletSpray(sx, sy, a + (rand() - 0.5) * 0.9, 44 + rand() * 24, col, 10, 22);
    }
    // Sunlit outer sprays
    for (let i = 0; i < 54; i++) {
      const a = rand() * Math.PI * 2;
      const dist = 35 + rand() * 155;
      const sx = cx + Math.cos(a) * dist;
      const sy = cy + Math.sin(a) * dist * 0.85;
      if (Math.hypot(sx - cx, sy - cy) > 226) continue;
      const col = greens[2 + Math.floor(rand() * 3)];
      drawLeafletSpray(sx, sy, a + (rand() - 0.5) * 0.7, 38 + rand() * 22, col, 9, 20);
    }
  } else if (species === 'gulmohar') {
    const fernGreens = ['#1d461d', '#2b5f27', '#39732f'];
    for (let i = 0; i < 58; i++) {
      const a = rand() * Math.PI * 2;
      const dist = Math.pow(rand(), 0.65) * 180;
      const sx = cx + Math.cos(a) * dist;
      const sy = cy + Math.sin(a) * dist * 0.88;
      if (Math.hypot(sx - cx, sy - cy) > 224) continue;
      drawLeafletSpray(sx, sy, a + (rand() - 0.5), 42 + rand() * 22, fernGreens[i % 3], 6, 15);
    }
    // Fiery 5-petal scarlet-vermilion blossoms with cream speckled throats
    const reds = ['#c92416', '#e6341c', '#f5521d', '#ff6e26'];
    for (let i = 0; i < 82; i++) {
      const a = rand() * Math.PI * 2;
      const dist = rand() * 195;
      const fx = cx + Math.cos(a) * dist;
      const fy = cy + Math.sin(a) * dist * 0.9;
      if (Math.hypot(fx - cx, fy - cy) > 224) continue;
      const r = 8 + rand() * 7;
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2 + rand() * 0.3;
        ctx.fillStyle = p === 0 ? '#ffd7b0' : reds[(i + p) % reds.length];
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(pa) * r * 0.62,
          fy + Math.sin(pa) * r * 0.62,
          r * 0.52,
          r * 0.34,
          pa,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(fx, fy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species === 'jacaranda') {
    const jGreens = ['#204a23', '#2e5e2c', '#3c6e34'];
    for (let i = 0; i < 52; i++) {
      const a = rand() * Math.PI * 2;
      const dist = Math.pow(rand(), 0.65) * 180;
      const sx = cx + Math.cos(a) * dist;
      const sy = cy + Math.sin(a) * dist * 0.88;
      if (Math.hypot(sx - cx, sy - cy) > 224) continue;
      drawLeafletSpray(sx, sy, a + (rand() - 0.5), 40 + rand() * 20, jGreens[i % 3], 6, 15);
    }
    // Cascading bell-shaped lavender-violet clusters
    const violets = ['#644db3', '#7a62c7', '#947ce0', '#b29ef0'];
    for (let i = 0; i < 96; i++) {
      const a = rand() * Math.PI * 2;
      const dist = rand() * 196;
      const fx = cx + Math.cos(a) * dist;
      const fy = cy + Math.sin(a) * dist * 0.9;
      if (Math.hypot(fx - cx, fy - cy) > 224) continue;
      for (let b = 0; b < 4; b++) {
        const ba = rand() * Math.PI * 2;
        const br = rand() * 8;
        ctx.fillStyle = violets[(i + b) % violets.length];
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(ba) * br,
          fy + Math.sin(ba) * br,
          6 + rand() * 4,
          4 + rand() * 3,
          ba,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  } else {
    // Bougainvillea: glossy dark-green leaves + papery magenta/crimson triple-bracts
    const bGreens = ['#19421c', '#245824', '#316b2b'];
    for (let i = 0; i < 72; i++) {
      const a = rand() * Math.PI * 2;
      const dist = rand() * 188;
      const lx = cx + Math.cos(a) * dist;
      const ly = cy + Math.sin(a) * dist * 0.9;
      if (Math.hypot(lx - cx, ly - cy) > 224) continue;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rand() * Math.PI * 2);
      ctx.fillStyle = bGreens[i % bGreens.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const magentas = ['#b8185a', '#d8226e', '#ed458c', '#c91b4a'];
    for (let i = 0; i < 78; i++) {
      const a = rand() * Math.PI * 2;
      const dist = rand() * 192;
      const fx = cx + Math.cos(a) * dist;
      const fy = cy + Math.sin(a) * dist * 0.9;
      if (Math.hypot(fx - cx, fy - cy) > 224) continue;
      for (let p = 0; p < 3; p++) {
        const pa = (p / 3) * Math.PI * 2 + rand() * 0.5;
        ctx.fillStyle = magentas[(i + p) % magentas.length];
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(pa) * 6, fy + Math.sin(pa) * 6, 8, 5.5, pa, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff5cc';
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy });
}

/**
 * Full graceful pinnate palm frond cutout (512x1024):
 * tapered yellow-green rachis + ~44 pairs of sleek curving pointed leaflets.
 */
export function createPalmFrondTexture(maxAnisotropy = 8) {
  const w = 512;
  const h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = mulberry32(6112);

  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5;

  // Central tapered rachis
  ctx.beginPath();
  ctx.moveTo(cx - 7, h);
  ctx.lineTo(cx + 7, h);
  ctx.lineTo(cx + 1.5, 22);
  ctx.lineTo(cx - 1.5, 22);
  ctx.closePath();
  const rGrad = ctx.createLinearGradient(0, h, 0, 22);
  rGrad.addColorStop(0, '#7c9a3d');
  rGrad.addColorStop(0.5, '#688c34');
  rGrad.addColorStop(1, '#85aa42');
  ctx.fillStyle = rGrad;
  ctx.fill();

  const pairs = 44;
  for (let i = 0; i < pairs; i++) {
    const t = i / (pairs - 1); // 0 at base -> 1 at tip
    const yBase = h - 42 - t * (h - 74);
    const span = Math.sin(Math.pow(t, 0.72) * Math.PI * 0.94) * 224 + 26;
    const sweep = 42 + t * 28;
    const lw = (1 - t * 0.42) * 16.5;

    for (const side of [-1, 1]) {
      const tipX = cx + side * span;
      const tipY = yBase - sweep - (rand() - 0.5) * 8;
      const ctrlX = cx + side * span * 0.52;
      const ctrlY = yBase - sweep * 0.85;

      const lGrad = ctx.createLinearGradient(cx, yBase, tipX, tipY);
      const darkBase = i % 2 === 0 ? '#1d4f1f' : '#255c25';
      const brightTip = i % 2 === 0 ? '#4a8834' : '#57963d';
      lGrad.addColorStop(0, darkBase);
      lGrad.addColorStop(0.65, '#34702b');
      lGrad.addColorStop(1, brightTip);

      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.moveTo(cx, yBase + lw * 0.55);
      ctx.quadraticCurveTo(ctrlX, ctrlY + lw * 0.45, tipX, tipY);
      ctx.quadraticCurveTo(ctrlX, ctrlY - lw * 0.45, cx, yBase - lw * 0.55);
      ctx.closePath();
      ctx.fill();

      // Subtle midrib highlight
      ctx.strokeStyle = 'rgba(166, 206, 100, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, yBase);
      ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
      ctx.stroke();
    }
  }

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy });
}

/**
 * Slender twigs with drooping clusters of narrow lance-shaped bamboo leaves.
 */
export function createBambooLeafTexture(maxAnisotropy = 8) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(8214);

  ctx.clearRect(0, 0, size, size);

  const greens = ['#326026', '#42762e', '#558b38', '#6a9e42'];
  // 5 drooping slender twigs
  for (let b = 0; b < 6; b++) {
    const sx = size * (0.2 + (b / 5) * 0.6);
    const sy = 14 + rand() * 35;
    const ex = sx + (rand() - 0.5) * 140;
    const ey = 260 + rand() * 190;
    ctx.strokeStyle = '#49632c';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) * 0.5, sy + 90, ex, ey);
    ctx.stroke();

    // Lance-shaped leaves radiating in fans along each twig
    for (let k = 0; k < 14; k++) {
      const t = 0.15 + (k / 13) * 0.85;
      const lx = sx + (ex - sx) * t;
      const ly = sy + (ey - sy) * (t * 0.85);
      const ang = Math.PI * 0.5 + (rand() - 0.5) * 1.5;
      const len = 62 + rand() * 44;
      const wid = 7 + rand() * 4;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(ang);
      ctx.fillStyle = greens[(b + k) % greens.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
      ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy });
}

/**
 * Detailed Boston / sword fern frond with serrated pinnae.
 */
export function createFernFrondTexture(maxAnisotropy = 8) {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(9104);

  ctx.clearRect(0, 0, size, size);
  const cx = size * 0.5;

  // Stem
  ctx.strokeStyle = '#386327';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, size);
  ctx.lineTo(cx, 20);
  ctx.stroke();

  const pinnae = 26;
  for (let i = 0; i < pinnae; i++) {
    const t = i / (pinnae - 1);
    const y = size - 28 - t * (size - 56);
    const len = Math.sin(Math.pow(t, 0.7) * Math.PI * 0.94) * 185 + 22;
    const pw = 13 * (1 - t * 0.45);
    for (const side of [-1, 1]) {
      ctx.fillStyle = i % 2 === 0 ? '#2b6127' : '#3d7933';
      ctx.beginPath();
      ctx.moveTo(cx, y - pw * 0.5);
      ctx.quadraticCurveTo(cx + side * len * 0.55, y - pw * 0.85, cx + side * len, y - 10);
      ctx.quadraticCurveTo(cx + side * len * 0.55, y + pw * 0.55, cx, y + pw * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Subtle tip glow
  void rand;
  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy });
}

/**
 * 35+ gently curving pointed grass blades darker at root and sunlit warm-green at tips.
 */
export function createGrassTuftTexture(maxAnisotropy = 8) {
  const w = 512;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const rand = mulberry32(3344);

  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < 42; i++) {
    const bx = 36 + (i / 41) * (w - 72) + (rand() - 0.5) * 14;
    const tipX = bx + (rand() - 0.5) * 68;
    const tipY = 14 + rand() * 95;
    const bw = 6 + rand() * 5;

    const grad = ctx.createLinearGradient(bx, h, tipX, tipY);
    grad.addColorStop(0, '#1c3e1a');
    grad.addColorStop(0.5, '#34692b');
    grad.addColorStop(1, '#689e3c');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, h);
    ctx.quadraticCurveTo((bx + tipX) * 0.5 - 6, (h + tipY) * 0.5, tipX, tipY);
    ctx.quadraticCurveTo((bx + tipX) * 0.5 + 6, (h + tipY) * 0.5, bx + bw * 0.5, h);
    ctx.closePath();
    ctx.fill();
  }

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy });
}

/**
 * Grayscale/ivory multi-ring overlapping flower rosette texture so instanceColor
 * tints cleanly into realistic roses, marigolds, dahlias, and chrysanthemums.
 */
export function createBloomRosetteTexture(maxAnisotropy = 8) {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  const cx = size * 0.5;
  const cy = size * 0.5;

  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(0, 0, size, size);

  const rings = [
    { count: 12, r: 92, pw: 38, ph: 52, col: '#f5f5f5', edge: '#b8b8b8' },
    { count: 10, r: 64, pw: 32, ph: 44, col: '#ffffff', edge: '#a6a6a6' },
    { count: 8, r: 38, pw: 24, ph: 32, col: '#ececec', edge: '#8f8f8f' }
  ];

  for (let rIdx = 0; rIdx < rings.length; rIdx++) {
    const ring = rings[rIdx];
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + rIdx * 0.28;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * ring.r * 0.55, cy + Math.sin(a) * ring.r * 0.55);
      ctx.rotate(a + Math.PI * 0.5);
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, ring.ph);
      grad.addColorStop(0, ring.edge);
      grad.addColorStop(0.55, ring.col);
      grad.addColorStop(1, '#d8d8d8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.pw, ring.ph, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70, 70, 70, 0.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Darker textured stamen center
  const centerGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 28);
  centerGrad.addColorStop(0, '#5a5a5a');
  centerGrad.addColorStop(0.7, '#999999');
  centerGrad.addColorStop(1, 'rgba(200,200,200,0)');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy });
}

/**
 * Right-half butterfly wing cutout texture (256x256, root along left edge x=0).
 * Species: 'blue-mormon' | 'common-tiger' | 'crimson-rose'
 */
export function createButterflyWingTexture(species = 'blue-mormon') {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.clearRect(0, 0, size, size);

  const drawWingOutline = () => {
    ctx.beginPath();
    // Forewing (top)
    ctx.moveTo(4, 118);
    ctx.bezierCurveTo(60, 22, 210, 10, 242, 68);
    ctx.bezierCurveTo(246, 112, 180, 140, 90, 140);
    // Hindwing (bottom)
    ctx.bezierCurveTo(185, 146, 210, 210, 148, 236);
    ctx.bezierCurveTo(106, 250, 40, 226, 4, 152);
    ctx.closePath();
  };

  drawWingOutline();
  ctx.save();
  ctx.clip();

  if (species === 'blue-mormon') {
    ctx.fillStyle = '#14171f';
    ctx.fillRect(0, 0, size, size);
    // Luminous blue patches on forewing & hindwing
    const blueGrad = ctx.createLinearGradient(40, 40, 210, 210);
    blueGrad.addColorStop(0, '#62c4ff');
    blueGrad.addColorStop(0.5, '#2b7de0');
    blueGrad.addColorStop(1, '#1d4ea6');
    ctx.fillStyle = blueGrad;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(125 + i * 16, 62 + i * 9, 26, 7, -0.35 + i * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(108, 192, 54, 34, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Dark veins
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(10, 130);
      ctx.lineTo(220, 45 + i * 32);
      ctx.stroke();
    }
  } else if (species === 'common-tiger') {
    ctx.fillStyle = '#e87617';
    ctx.fillRect(0, 0, size, size);
    // Black outer margin with white spots
    ctx.strokeStyle = '#141110';
    ctx.lineWidth = 28;
    drawWingOutline();
    ctx.stroke();
    // Dark veins
    ctx.strokeStyle = '#141110';
    ctx.lineWidth = 4.5;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(8, 128);
      ctx.lineTo(225, 34 + i * 34);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff9ee';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(220 - i * 12, 55 + i * 32, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Crimson Rose swallowtail
    ctx.fillStyle = '#1a171c';
    ctx.fillRect(0, 0, size, size);
    // Pale veins on forewing
    ctx.strokeStyle = 'rgba(215, 205, 200, 0.45)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(30, 120);
      ctx.lineTo(215, 42 + i * 20);
      ctx.stroke();
    }
    // Ruby-crimson spots on hindwing
    ctx.fillStyle = '#d92140';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(75 + i * 24, 178 + (i % 2) * 20, 11, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy: 4 });
}

/**
 * Iridescent emerald-turquoise Indian Peacock tail train cutout (512x512)
 * with bronze-gold & royal-blue ocelli ("eye-spots") and delicate barbules.
 */
export function createPeacockTrainTexture() {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rand = mulberry32(1999);

  ctx.clearRect(0, 0, size, size);
  const rootX = size * 0.5;
  const rootY = size - 16;

  // Fan of shimmering emerald feather shafts & barbules
  for (let i = 0; i < 42; i++) {
    const a = -Math.PI * 0.5 + ((i / 41) - 0.5) * 1.95;
    const len = 260 + (i % 3) * 72 + rand() * 35;
    const ex = rootX + Math.cos(a) * len;
    const ey = rootY + Math.sin(a) * len;
    if (ey < 28 || ex < 28 || ex > size - 28) continue;

    ctx.strokeStyle = i % 2 === 0 ? '#1b6d4a' : '#26895a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rootX, rootY);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Fine barbules along feather shaft
    ctx.strokeStyle = 'rgba(48, 175, 110, 0.72)';
    ctx.lineWidth = 1.6;
    for (let s = 0.2; s < 0.92; s += 0.05) {
      const sx = rootX + Math.cos(a) * len * s;
      const sy = rootY + Math.sin(a) * len * s;
      for (const side of [-1, 1]) {
        const ba = a + side * 0.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(ba) * 20, sy + Math.sin(ba) * 20);
        ctx.stroke();
      }
    }

    // Iridescent ocellus eye-spot near feather tip
    ctx.fillStyle = '#2fa872';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 16, 20, a + Math.PI * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c98e2b';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 11, 14, a + Math.PI * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#183f9e';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 6.5, 8.5, a + Math.PI * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0b1433';
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTex(canvas, { repeat: false, srgb: true, maxAnisotropy: 8 });
}

/**
 * Shared Wind-Sway Material Patcher using material.onBeforeCompile.
 * Safely applies world-space sinusoidal breeze sway scaled by local vertex height.
 */
export function applyWindSway(material, windUniforms, strength = 0.14, heightFactor = 0.25) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec4 swayRef = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          swayRef = instanceMatrix * swayRef;
        #endif
        float swayPhase = uTime * 1.45 + swayRef.x * 0.24 + swayRef.z * 0.22;
        float swayWeight = clamp(uv.y, 0.0, 1.0) * (0.55 + clamp(position.y * ${heightFactor.toFixed(3)}, 0.0, 0.65));
        transformed.x += sin(swayPhase) * ${strength.toFixed(4)} * swayWeight;
        transformed.z += cos(swayPhase * 0.85) * ${(strength * 0.72).toFixed(4)} * swayWeight;
        `
      );
  };
  material.customProgramCacheKey = () => `wind_sway_${strength.toFixed(3)}_${heightFactor.toFixed(3)}`;
  return material;
}

/**
 * Shared Curved V-Cambered Subdivided Palm Frond Ribbon Geometry (origin at petiole base (0,0,0), extending along +Z).
 */
export function createCurvedPalmFrondGeo(length = 3.2, width = 1.45, archLift = 1.05, droop = 0.85) {
  const segsZ = 10;
  const segsX = 2; // 0 (left), 1 (center spine), 2 (right) -> creates V-camber!
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let iz = 0; iz <= segsZ; iz++) {
    const t = iz / segsZ;
    const z = t * length;
    // Graceful upward arch then gentle tip droop
    const spineY = Math.sin(t * Math.PI * 0.72) * archLift - t * t * droop;
    // Slight V-camber fold down toward outer leaflet tips
    const camberDrop = 0.09 * width * Math.sin(t * Math.PI * 0.9);

    for (let ix = 0; ix <= segsX; ix++) {
      const u = ix / segsX; // 0, 0.5, 1
      const x = (u - 0.5) * width;
      const y = spineY - Math.abs(u - 0.5) * 2.0 * camberDrop;
      positions.push(x, y, z);
      uvs.push(u, t);
    }
  }

  for (let iz = 0; iz < segsZ; iz++) {
    for (let ix = 0; ix < segsX; ix++) {
      const a = iz * (segsX + 1) + ix;
      const b = a + 1;
      const c = a + (segsX + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
