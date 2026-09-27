// Anime / cel-shaded water shader
// Ported from: https://github.com/cortiz2894/water-anime-shader
// Voronoi F1/SmoothF1 cells, 3-stop color ramp, hard-edge ripples, sparkle stars

export const waterVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const waterFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3  uColorDeep;
  uniform vec3  uColorMid;
  uniform vec3  uColorHighlight;
  uniform vec3  uColorFoam;
  uniform float uScale;
  uniform float uSpeed;
  uniform vec3  uRipples[8];
  uniform int   uRippleCount;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  // ── Hash functions ──────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  vec2 hash2(vec2 p) {
    return fract(sin(vec2(
      dot(p, vec2(127.1, 311.7)),
      dot(p, vec2(269.5, 183.3))
    )) * 43758.5453);
  }

  // ── Value noise for UV distortion ──────────────────────────
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }

  // ── Voronoi F1 and SmoothF1 ────────────────────────────────
  vec2 voronoi(vec2 p) {
    vec2 i = floor(p);
    float F1 = 8.0, F2 = 8.0;
    vec2 mr;
    for (int y = -2; y <= 2; y++) {
      for (int x = -2; x <= 2; x++) {
        vec2 g = vec2(float(x), float(y));
        vec2 cell = i + g;
        vec2 r = g + hash2(cell) - fract(p);
        r += 0.3 * sin(uTime * uSpeed * 0.4 + hash2(cell) * 6.28318);
        float d = dot(r, r);
        if (d < F1) { F2 = F1; F1 = d; mr = r; }
        else if (d < F2) { F2 = d; }
      }
    }
    float smoothF1 = exp(-8.0 * F1);
    return vec2(sqrt(F1), smoothF1);
  }

  // ── 3-stop anime cel ramp ──────────────────────────────────
  vec3 celRamp(float v) {
    if (v < 0.25) return uColorDeep;
    if (v < 0.55) return uColorMid;
    return uColorHighlight;
  }

  // ── Foam edge outline (anime water border) ─────────────────
  float foamEdge(float F1) {
    return smoothstep(0.08, 0.0, F1 - 0.12);
  }

  void main() {
    // World XZ as base UV — pattern stationary in world space
    vec2 worldUV = vWorldPos.xz / uScale;

    // Flowing UV distortion via value noise (two independent axes)
    float nx = vnoise(worldUV * 1.8 + vec2(uTime * uSpeed * 0.12, 0.0));
    float ny = vnoise(worldUV * 1.8 + vec2(0.0, uTime * uSpeed * 0.12));
    vec2 distUV = worldUV + 0.18 * vec2(nx - 0.5, ny - 0.5);

    // Secondary layer offset for depth (cortiz2894 technique)
    float nx2 = vnoise(worldUV * 0.9 + vec2(uTime * uSpeed * 0.07 + 3.1, 1.7));
    float ny2 = vnoise(worldUV * 0.9 + vec2(2.4, uTime * uSpeed * 0.07));
    vec2 distUV2 = worldUV * 1.4 + 0.12 * vec2(nx2 - 0.5, ny2 - 0.5);

    // Dual Voronoi layers blended
    vec2 vor1 = voronoi(distUV);
    vec2 vor2 = voronoi(distUV2 + vec2(uTime * uSpeed * 0.05));
    float F1     = mix(vor1.x, vor2.x, 0.35);
    float sFactor = 1.0 - mix(vor1.y, vor2.y, 0.35);

    // Cel shading value
    float celVal = clamp(F1 * 1.4, 0.0, 1.0);
    vec3 col = celRamp(celVal);

    // Cell edge foam
    float edge = foamEdge(F1);
    col = mix(col, uColorFoam, edge * 0.75);

    // Surface specular highlight (bright glint on cell tops)
    float spec = smoothstep(0.82, 1.0, sFactor);
    col = mix(col, uColorFoam * 1.2, spec * 0.35);

    // ── Ripple rings ──────────────────────────────────────────
    float rippleMask = 0.0;
    for (int ri = 0; ri < 8; ri++) {
      if (ri >= uRippleCount) break;
      vec2  origin = uRipples[ri].xy;
      float age    = uRipples[ri].z;       // 0=new .. 1=expired
      float radius = age * 30.0;
      float dist   = length(vWorldPos.xz - origin);
      // 3 concentric hard-edge rings per ripple source
      for (float ri2 = 0.0; ri2 < 3.0; ri2++) {
        float ringR = radius - ri2 * 4.0;
        if (ringR < 0.0) continue;
        float ring = abs(dist - ringR);
        float mask = 1.0 - smoothstep(0.0, 0.8, ring);
        rippleMask += mask * (1.0 - age) * (1.0 - ri2 * 0.3);
      }
    }
    col = mix(col, uColorFoam, clamp(rippleMask, 0.0, 1.0) * 0.9);

    // ── Horizon distance fade ─────────────────────────────────
    float distFade = 1.0 - smoothstep(60.0, 120.0, length(vWorldPos.xz));

    // Slight transparency at distance for horizon blend
    float alpha = 0.88 + 0.06 * distFade;

    gl_FragColor = vec4(col, alpha);
  }
`;

export const waterUniforms = () => ({
  uTime:           { value: 0 },
  uColorDeep:      { value: [0.0, 0.39, 0.47] },      // #0796b3 deep teal
  uColorMid:       { value: [0.0, 0.72, 0.69] },      // #00b8b0 turquoise
  uColorHighlight: { value: [0.50, 1.0, 0.93] },      // #7fffee bright highlight
  uColorFoam:      { value: [1.0, 1.0, 1.0] },        // white foam
  uScale:          { value: 18.0 },
  uSpeed:          { value: 1.0 },
  uRipples:        { value: new Array(8).fill([0, 0, 1]) },
  uRippleCount:    { value: 0 },
});
