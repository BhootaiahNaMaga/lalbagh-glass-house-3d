import * as THREE from 'three';

export const TIME_PRESETS = {
  morning: {
    label: 'Morning',
    sunAzimuth: 52,
    sunElevation: 28,
    zenith: new THREE.Color('#2864a8'),
    mid: new THREE.Color('#68a7db'),
    horizon: new THREE.Color('#dce9f2'),
    sunColor: new THREE.Color('#fff2d6'),
    sunIntensity: 2.35,
    hemiSky: new THREE.Color('#b6daf8'),
    hemiGround: new THREE.Color('#5a6e45'),
    hemiIntensity: 1.05,
    fillColor: new THREE.Color('#b8d6f5'),
    fillIntensity: 0.45,
    fogColor: new THREE.Color('#cfe1ea'),
    fogDensity: 0.0024,
    cloudTint: new THREE.Color('#ffffff'),
    cloudOpacity: 0.62,
    starIntensity: 0.0,
    nightGlow: 0.08,
    sunbeamOpacity: 0.24,
    exposure: 1.06
  },
  midday: {
    label: 'Midday',
    sunAzimuth: 18,
    sunElevation: 62,
    zenith: new THREE.Color('#1d5da8'),
    mid: new THREE.Color('#4f97db'),
    horizon: new THREE.Color('#cde6f6'),
    sunColor: new THREE.Color('#fffcf2'),
    sunIntensity: 2.8,
    hemiSky: new THREE.Color('#cbe7ff'),
    hemiGround: new THREE.Color('#647949'),
    hemiIntensity: 1.2,
    fillColor: new THREE.Color('#c7e1fa'),
    fillIntensity: 0.52,
    fogColor: new THREE.Color('#c8e1f0'),
    fogDensity: 0.0019,
    cloudTint: new THREE.Color('#ffffff'),
    cloudOpacity: 0.52,
    starIntensity: 0.0,
    nightGlow: 0.0,
    sunbeamOpacity: 0.06,
    exposure: 1.04
  },
  golden: {
    label: 'Golden Hour',
    sunAzimuth: -64,
    sunElevation: 11,
    zenith: new THREE.Color('#24396b'),
    mid: new THREE.Color('#9e646d'),
    horizon: new THREE.Color('#f6a662'),
    sunColor: new THREE.Color('#ffad5c'),
    sunIntensity: 2.45,
    hemiSky: new THREE.Color('#f4b487'),
    hemiGround: new THREE.Color('#4c4132'),
    hemiIntensity: 0.92,
    fillColor: new THREE.Color('#8096cc'),
    fillIntensity: 0.42,
    fogColor: new THREE.Color('#df9f74'),
    fogDensity: 0.0029,
    cloudTint: new THREE.Color('#ffd3a8'),
    cloudOpacity: 0.68,
    starIntensity: 0.0,
    nightGlow: 0.78,
    sunbeamOpacity: 0.34,
    exposure: 1.08
  },
  night: {
    label: 'Night',
    sunAzimuth: -118,
    sunElevation: 26,
    zenith: new THREE.Color('#040a18'),
    mid: new THREE.Color('#0c1b36'),
    horizon: new THREE.Color('#1a2c48'),
    sunColor: new THREE.Color('#9ab8eb'),
    sunIntensity: 0.58,
    hemiSky: new THREE.Color('#2d4875'),
    hemiGround: new THREE.Color('#13221a'),
    hemiIntensity: 0.52,
    fillColor: new THREE.Color('#4a6999'),
    fillIntensity: 0.25,
    fogColor: new THREE.Color('#101d30'),
    fogDensity: 0.0032,
    cloudTint: new THREE.Color('#293f60'),
    cloudOpacity: 0.35,
    starIntensity: 1.0,
    nightGlow: 1.85,
    sunbeamOpacity: 0.0,
    exposure: 1.18
  }
};

function dirFromAngles(azimuthDeg, elevationDeg, radius = 80) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  const cosEl = Math.cos(el);
  return new THREE.Vector3(
    Math.sin(az) * cosEl * radius,
    Math.sin(el) * radius,
    Math.cos(az) * cosEl * radius
  );
}

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uCloudTint;
  uniform float uCloudOpacity;
  uniform float uStarIntensity;
  uniform float uTime;

  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = rot * p * 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = clamp(dir.y, 0.0, 1.0);

    vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
    col = mix(col, uZenithColor, smoothstep(0.24, 0.92, h));

    // Solar / Lunar glow & disc
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float halo = pow(sunDot, 12.0) * 0.42 + pow(sunDot, 120.0) * 0.65;
    float disc = smoothstep(0.9993, 0.99975, sunDot);
    col += uSunColor * (halo + disc * 1.6);

    // Subtle animated wispy clouds above horizon
    if (dir.y > 0.02) {
      vec2 cloudUv = dir.xz / (dir.y + 0.18) * 1.15;
      cloudUv += vec2(uTime * 0.008, uTime * 0.004);
      float c = fbm(cloudUv);
      float mask = smoothstep(0.47, 0.78, c) * smoothstep(0.02, 0.22, dir.y) * uCloudOpacity;
      col = mix(col, uCloudTint, mask * 0.62);
    }

    // Pin-sharp circular twinkling starfield at night
    if (uStarIntensity > 0.01 && dir.y > 0.05) {
      vec2 starUv = dir.xz / (dir.y + 0.38) * 95.0;
      vec2 starCell = floor(starUv);
      vec2 starLocal = fract(starUv) - 0.5;
      float starRand = hash(starCell);
      if (starRand > 0.968) {
        vec2 offset = vec2(hash(starCell + 13.7), hash(starCell + 41.3)) * 0.5 - 0.25;
        float dist = length(starLocal - offset);
        float starSize = 0.06 + 0.08 * fract(starRand * 73.1);
        float point = smoothstep(starSize, 0.0, dist);
        float twinkle = 0.65 + 0.35 * sin(uTime * 2.2 + starRand * 90.0);
        float horizonFade = smoothstep(0.05, 0.36, dir.y);
        col += vec3(0.92, 0.96, 1.0) * point * twinkle * uStarIntensity * horizonFade * 1.35;
      }
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SUNBEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SUNBEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Soft horizontal fade & top-to-bottom fade
    float edgeX = sin(vUv.x * 3.14159265);
    edgeX = pow(max(edgeX, 0.0), 1.65);
    float fadeY = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.55, 1.0, 1.0 - vUv.y));
    float shimmer = 0.85 + 0.15 * sin(vUv.x * 18.0 + uTime * 0.65);
    float alpha = edgeX * fadeY * shimmer * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export function createSkyAndLighting(scene, renderer) {
  const group = new THREE.Group();
  group.name = 'SkyAndLighting';
  scene.add(group);

  // Fog
  const fog = new THREE.FogExp2(TIME_PRESETS.morning.fogColor.getHex(), TIME_PRESETS.morning.fogDensity);
  scene.fog = fog;

  // Sky Dome
  const skyUniforms = {
    uZenithColor: { value: TIME_PRESETS.morning.zenith.clone() },
    uMidColor: { value: TIME_PRESETS.morning.mid.clone() },
    uHorizonColor: { value: TIME_PRESETS.morning.horizon.clone() },
    uSunDir: { value: dirFromAngles(52, 28, 1).normalize() },
    uSunColor: { value: TIME_PRESETS.morning.sunColor.clone() },
    uCloudTint: { value: TIME_PRESETS.morning.cloudTint.clone() },
    uCloudOpacity: { value: TIME_PRESETS.morning.cloudOpacity },
    uStarIntensity: { value: 0 },
    uTime: { value: 0 }
  };

  const skyGeo = new THREE.SphereGeometry(240, 48, 32);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -10;
  group.add(skyDome);

  // Main Shadow-Casting Sun / Moon Light
  const sunLight = new THREE.DirectionalLight(0xfff2d6, 2.35);
  sunLight.position.copy(dirFromAngles(52, 28, 72));
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 180;
  sunLight.shadow.camera.left = -46;
  sunLight.shadow.camera.right = 46;
  sunLight.shadow.camera.top = 46;
  sunLight.shadow.camera.bottom = -46;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.035;
  group.add(sunLight);

  // Ambient & Bounce Hemisphere
  const hemiLight = new THREE.HemisphereLight(0xb6daf8, 0x5a6e45, 1.05);
  group.add(hemiLight);

  // Counter-fill directional light for delicate ironwork definition
  const fillLight = new THREE.DirectionalLight(0xb8d6f5, 0.45);
  fillLight.position.set(-50, 26, -42);
  group.add(fillLight);

  // Interior & Night Illumination Rig
  const floralSpot = new THREE.SpotLight(0xffe1a6, 0.8, 30, Math.PI * 0.28, 0.55, 1.1);
  floralSpot.position.set(0, 14.5, 0);
  floralSpot.target.position.set(0, 1.2, 0);
  group.add(floralSpot);
  group.add(floralSpot.target);

  const chandelierLights = [];
  const chandelierPositions = [
    [0, 10.6, 0, 2.2, 28],
    [-12, 8.2, 0, 1.5, 22],
    [12, 8.2, 0, 1.5, 22],
    [0, 8.2, -11, 1.5, 22],
    [0, 8.2, 11, 1.5, 22]
  ];
  for (const [x, y, z, baseIntensity, dist] of chandelierPositions) {
    const pt = new THREE.PointLight(0xffcb82, baseIntensity * 0.1, dist, 1.45);
    pt.position.set(x, y, z);
    group.add(pt);
    chandelierLights.push({ light: pt, baseIntensity });
  }

  const porticoLight = new THREE.PointLight(0xffd28d, 0.2, 18, 1.5);
  porticoLight.position.set(0, 6.2, 22.1);
  group.add(porticoLight);

  const fountainLight = new THREE.PointLight(0x7be8ff, 0.15, 18, 1.4);
  fountainLight.position.set(0, 1.8, 34);
  group.add(fountainLight);

  // Volumetric Sunbeam Shafts streaming down from upper barrel vault
  const sunbeamUniforms = {
    uColor: { value: new THREE.Color('#ffe8b6') },
    uOpacity: { value: TIME_PRESETS.morning.sunbeamOpacity },
    uTime: { value: 0 }
  };
  const sunbeamMat = new THREE.ShaderMaterial({
    uniforms: sunbeamUniforms,
    vertexShader: SUNBEAM_VERT,
    fragmentShader: SUNBEAM_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const sunbeamsGroup = new THREE.Group();
  const beamGeo = new THREE.PlaneGeometry(4.4, 15.5);
  const beamCoords = [
    [-15, 8.6, 0.4, 0.34, 0.18],
    [-7.5, 8.8, -0.3, 0.34, -0.14],
    [7.5, 8.8, 0.2, 0.34, 0.16],
    [15, 8.6, -0.4, 0.34, -0.18],
    [-0.5, 8.8, -11.5, 0.32, 1.15],
    [0.5, 8.8, 11.5, 0.32, -1.15],
    [-2.0, 9.6, -1.6, 0.26, 0.48],
    [2.0, 9.6, 1.6, 0.26, -0.48]
  ];
  for (const [bx, by, bz, tiltZ, rotY] of beamCoords) {
    const beam = new THREE.Mesh(beamGeo, sunbeamMat);
    beam.position.set(bx, by, bz);
    beam.rotation.set(0.18, rotY, tiltZ);
    beam.renderOrder = 3;
    sunbeamsGroup.add(beam);
  }
  group.add(sunbeamsGroup);

  // PMREM Environment Generator for realistic sky reflections on glass panes
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  const envSkyMat = new THREE.ShaderMaterial({
    uniforms: {
      uZenithColor: { value: TIME_PRESETS.morning.zenith.clone() },
      uMidColor: { value: TIME_PRESETS.morning.mid.clone() },
      uHorizonColor: { value: TIME_PRESETS.morning.horizon.clone() },
      uSunDir: { value: skyUniforms.uSunDir.value.clone() },
      uSunColor: { value: TIME_PRESETS.morning.sunColor.clone() },
      uCloudTint: { value: TIME_PRESETS.morning.cloudTint.clone() },
      uCloudOpacity: { value: TIME_PRESETS.morning.cloudOpacity },
      uStarIntensity: { value: 0 },
      uTime: { value: 0 }
    },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide
  });
  const envSkyMesh = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), envSkyMat);
  envScene.add(envSkyMesh);

  const envGroundMat = new THREE.MeshBasicMaterial({ color: 0x35532c });
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(55, 24), envGroundMat);
  envGround.rotation.x = -Math.PI * 0.5;
  envGround.position.y = -2;
  envScene.add(envGround);

  let currentEnvRT = null;
  function rebuildEnvMap(preset) {
    envSkyMat.uniforms.uZenithColor.value.copy(preset.zenith);
    envSkyMat.uniforms.uMidColor.value.copy(preset.mid);
    envSkyMat.uniforms.uHorizonColor.value.copy(preset.horizon);
    envSkyMat.uniforms.uSunColor.value.copy(preset.sunColor);
    envSkyMat.uniforms.uSunDir.value.copy(dirFromAngles(preset.sunAzimuth, preset.sunElevation, 1).normalize());
    envSkyMat.uniforms.uCloudTint.value.copy(preset.cloudTint);
    envSkyMat.uniforms.uCloudOpacity.value = preset.cloudOpacity;
    envSkyMat.uniforms.uStarIntensity.value = preset.starIntensity;
    envGroundMat.color.copy(preset.hemiGround).multiplyScalar(0.75);

    const nextRT = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = nextRT.texture;
    if (currentEnvRT) currentEnvRT.dispose();
    currentEnvRT = nextRT;
  }

  let activeMode = 'morning';
  let targetPreset = TIME_PRESETS.morning;
  const currentState = {
    azimuth: targetPreset.sunAzimuth,
    elevation: targetPreset.sunElevation,
    nightGlow: targetPreset.nightGlow,
    sunbeamOpacity: targetPreset.sunbeamOpacity,
    exposure: targetPreset.exposure
  };

  rebuildEnvMap(targetPreset);

  function setTimeOfDay(mode, immediate = false) {
    if (!TIME_PRESETS[mode]) return;
    activeMode = mode;
    targetPreset = TIME_PRESETS[mode];
    rebuildEnvMap(targetPreset);

    if (immediate) {
      currentState.azimuth = targetPreset.sunAzimuth;
      currentState.elevation = targetPreset.sunElevation;
      currentState.nightGlow = targetPreset.nightGlow;
      currentState.sunbeamOpacity = targetPreset.sunbeamOpacity;
      currentState.exposure = targetPreset.exposure;
      skyUniforms.uZenithColor.value.copy(targetPreset.zenith);
      skyUniforms.uMidColor.value.copy(targetPreset.mid);
      skyUniforms.uHorizonColor.value.copy(targetPreset.horizon);
      skyUniforms.uSunColor.value.copy(targetPreset.sunColor);
      skyUniforms.uCloudTint.value.copy(targetPreset.cloudTint);
      skyUniforms.uCloudOpacity.value = targetPreset.cloudOpacity;
      skyUniforms.uStarIntensity.value = targetPreset.starIntensity;
      sunLight.color.copy(targetPreset.sunColor);
      sunLight.intensity = targetPreset.sunIntensity;
      hemiLight.color.copy(targetPreset.hemiSky);
      hemiLight.groundColor.copy(targetPreset.hemiGround);
      hemiLight.intensity = targetPreset.hemiIntensity;
      fillLight.color.copy(targetPreset.fillColor);
      fillLight.intensity = targetPreset.fillIntensity;
      fog.color.copy(targetPreset.fogColor);
      fog.density = targetPreset.fogDensity;
      renderer.toneMappingExposure = targetPreset.exposure;
    }
  }

  function update(dt, elapsed, lightingTargets = null) {
    skyUniforms.uTime.value = elapsed;
    sunbeamUniforms.uTime.value = elapsed;

    const k = 1.0 - Math.exp(-dt * 2.8);
    currentState.azimuth += (targetPreset.sunAzimuth - currentState.azimuth) * k;
    currentState.elevation += (targetPreset.sunElevation - currentState.elevation) * k;
    currentState.nightGlow += (targetPreset.nightGlow - currentState.nightGlow) * k;
    currentState.sunbeamOpacity += (targetPreset.sunbeamOpacity - currentState.sunbeamOpacity) * k;
    currentState.exposure += (targetPreset.exposure - currentState.exposure) * k;

    const sunPos = dirFromAngles(currentState.azimuth, currentState.elevation, 76);
    sunLight.position.copy(sunPos);
    skyUniforms.uSunDir.value.copy(sunPos).normalize();
    fillLight.position.set(-sunPos.x * 0.65, Math.max(18, sunPos.y * 0.7), -sunPos.z * 0.65);

    skyUniforms.uZenithColor.value.lerp(targetPreset.zenith, k);
    skyUniforms.uMidColor.value.lerp(targetPreset.mid, k);
    skyUniforms.uHorizonColor.value.lerp(targetPreset.horizon, k);
    skyUniforms.uSunColor.value.lerp(targetPreset.sunColor, k);
    skyUniforms.uCloudTint.value.lerp(targetPreset.cloudTint, k);
    skyUniforms.uCloudOpacity.value += (targetPreset.cloudOpacity - skyUniforms.uCloudOpacity.value) * k;
    skyUniforms.uStarIntensity.value += (targetPreset.starIntensity - skyUniforms.uStarIntensity.value) * k;

    sunLight.color.lerp(targetPreset.sunColor, k);
    sunLight.intensity += (targetPreset.sunIntensity - sunLight.intensity) * k;
    hemiLight.color.lerp(targetPreset.hemiSky, k);
    hemiLight.groundColor.lerp(targetPreset.hemiGround, k);
    hemiLight.intensity += (targetPreset.hemiIntensity - hemiLight.intensity) * k;
    fillLight.color.lerp(targetPreset.fillColor, k);
    fillLight.intensity += (targetPreset.fillIntensity - fillLight.intensity) * k;

    fog.color.lerp(targetPreset.fogColor, k);
    fog.density += (targetPreset.fogDensity - fog.density) * k;
    renderer.toneMappingExposure = currentState.exposure;

    // Sunbeams
    sunbeamsGroup.visible = currentState.sunbeamOpacity > 0.015;
    sunbeamUniforms.uOpacity.value = currentState.sunbeamOpacity;
    sunbeamUniforms.uColor.value.lerp(targetPreset.sunColor, k);

    // Chandeliers, Spotlights & Lantern Emissives
    const glow = currentState.nightGlow;
    floralSpot.intensity = 1.2 + glow * 4.5;
    for (const item of chandelierLights) {
      item.light.intensity = item.baseIntensity * glow * 3.8;
    }
    porticoLight.intensity = 0.25 + glow * 3.6;
    fountainLight.intensity = glow * 4.2;

    if (lightingTargets) {
      for (const mat of lightingTargets.emissiveBulbs || []) {
        mat.emissiveIntensity = 0.35 + glow * 2.5;
      }
      for (const mat of lightingTargets.lampGlobes || []) {
        mat.emissiveIntensity = 0.15 + glow * 2.4;
      }
    }
  }

  function getTimeOfDay() {
    return activeMode;
  }

  return {
    group,
    setTimeOfDay,
    getTimeOfDay,
    update,
    dispose() {
      if (currentEnvRT) currentEnvRT.dispose();
      pmremGenerator.dispose();
    }
  };
}
