import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const BLOOM_BY_TIME = {
  morning: 0.18,
  midday: 0.12,
  golden: 0.26,
  night: 0.45
};

const CINEMATIC_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.04 },
    uSaturation: { value: 1.04 },
    uVignette: { value: 0.15 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignette;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;

      // Subtle photographic micro-contrast
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);

      // Gentle saturation polish preserving natural greens & brass
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSaturation);

      // Soft lens vignette
      vec2 centered = vUv - 0.5;
      float dist2 = dot(centered, centered);
      col *= 1.0 - dist2 * uVignette * 2.1;

      // Subtle anti-banding dither
      col += (hash12(gl_FragCoord.xy) - 0.5) * 0.004;

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), texel.a);
    }
  `
};

function hasNoGtaoFlag(obj) {
  let cur = obj;
  while (cur) {
    if (cur.userData && cur.userData.noGTAO) return true;
    cur = cur.parent;
  }
  return false;
}

/**
 * Level 1 Post-Processing Pipeline:
 * HalfFloat MSAA Composer -> RenderPass -> GTAO (with transparent/cutout filter)
 * -> HDR Thresholded UnrealBloomPass -> OutputPass (ACESFilmic) -> CinematicGradePass.
 */
export function createPostProcessing(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const width = Math.max(1, size.x);
  const height = Math.max(1, size.y);

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: renderer.capabilities.isWebGL2 ? 4 : 0
  });
  renderTarget.texture.name = 'CinematicHDRTarget';

  const composer = new EffectComposer(renderer, renderTarget);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const gtaoPass = new GTAOPass(scene, camera, width, height);
  gtaoPass.output = GTAOPass.OUTPUT.Default;
  gtaoPass.blendIntensity = 0.56;
  gtaoPass.updateGtaoMaterial({
    radius: 0.72,
    distanceExponent: 1.65,
    thickness: 1.35,
    distanceFallOff: 0.85,
    scale: 1.0,
    samples: 12
  });
  gtaoPass.updatePdMaterial({
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3,
    radius: 5,
    rings: 2,
    samples: 12
  });

  // Hide glass panes, sunbeams, sky dome & alpha-cutout foliage during GTAO G-buffer pass
  gtaoPass.overrideVisibility = function () {
    const cache = this._visibilityCache;
    scene.traverse((object) => {
      cache.set(object, object.visible);
      if (!object.visible) return;
      if (object.isPoints || object.isLine || hasNoGtaoFlag(object)) {
        object.visible = false;
        return;
      }
      if (object.isMesh && object.material) {
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        if (mats.some((m) => m && (m.transparent === true || m.depthWrite === false || m.alphaTest > 0))) {
          object.visible = false;
        }
      }
    });
  };
  composer.addPass(gtaoPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), BLOOM_BY_TIME.morning, 0.52, 1.18);
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const gradePass = new ShaderPass(CINEMATIC_GRADE_SHADER);
  composer.addPass(gradePass);

  // Sync sizes cleanly after all passes are registered
  composer.setSize(width, height);

  let quality = 'cinematic';
  let targetBloom = BLOOM_BY_TIME.morning;

  function setQuality(nextQuality) {
    quality = nextQuality === 'standard' ? 'standard' : 'cinematic';
  }

  function setTimeMode(mode) {
    targetBloom = BLOOM_BY_TIME[mode] ?? BLOOM_BY_TIME.morning;
  }

  function setSize(w, h) {
    const safeW = Math.max(1, w);
    const safeH = Math.max(1, h);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(safeW, safeH);
  }

  function render(dt) {
    if (quality === 'cinematic') {
      const k = 1.0 - Math.exp(-dt * 3.0);
      bloomPass.strength += (targetBloom - bloomPass.strength) * k;
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  return {
    render,
    setQuality,
    getQuality: () => quality,
    setTimeMode,
    setSize,
    dispose() {
      gtaoPass.dispose();
      bloomPass.dispose();
      outputPass.dispose();
      gradePass.dispose();
      composer.dispose();
      renderTarget.dispose();
    }
  };
}
