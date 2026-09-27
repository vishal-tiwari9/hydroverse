export const skyVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const skyFragmentShader = /* glsl */ `
  precision mediump float;
  varying vec3 vDir;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }

  float cloudShape(vec2 uv) {
    float n  = noise(uv * 3.0) * 0.5;
           n += noise(uv * 6.0) * 0.25;
           n += noise(uv * 12.0) * 0.125;
    return smoothstep(0.48, 0.72, n);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    // Ocean daytime sky gradient
    vec3 cGround  = vec3(0.40, 0.65, 0.80);  // sea-level haze blue
    vec3 cHorizon = vec3(0.67, 0.87, 0.96);  // pale sky blue at horizon
    vec3 cLowSky  = vec3(0.35, 0.68, 0.93);  // mid-low sky blue
    vec3 cMidSky  = vec3(0.15, 0.48, 0.82);  // deeper mid-sky blue
    vec3 cZenith  = vec3(0.05, 0.22, 0.60);  // deep zenith blue

    vec3 sky;
    if      (h < -0.05) sky = cGround;
    else if (h <  0.05) sky = mix(cGround,  cHorizon, (h + 0.05) / 0.10);
    else if (h <  0.20) sky = mix(cHorizon, cLowSky,  (h - 0.05) / 0.15);
    else if (h <  0.50) sky = mix(cLowSky,  cMidSky,  (h - 0.20) / 0.30);
    else                sky = mix(cMidSky,  cZenith,  (h - 0.50) / 0.50);

    // Sun (high in sky, bright white-yellow)
    vec3 sunDir = normalize(vec3(0.4, 0.65, -0.6));
    float sunDot = dot(d, sunDir);
    float sun    = smoothstep(0.9985, 0.9995, sunDot);
    float corona = smoothstep(0.97, 0.9985, sunDot) * 0.5;
    float glow   = smoothstep(0.92, 0.97, sunDot) * 0.15;
    sky += vec3(1.0, 0.98, 0.90) * sun;
    sky += vec3(1.0, 0.90, 0.70) * corona;
    sky += vec3(0.8, 0.85, 1.00) * glow;

    // Atmospheric horizon haze (blue-white)
    float haze = exp(-abs(h) * 12.0) * 0.25;
    sky += vec3(0.75, 0.88, 1.0) * haze;

    // White fluffy clouds in mid-sky band
    if (h > 0.08 && h < 0.55) {
      vec2 cloudUV = d.xz / (d.y + 0.01) * 0.4;
      float c = cloudShape(cloudUV);
      float fade = (1.0 - smoothstep(0.08, 0.18, h)) + smoothstep(0.40, 0.55, h);
      c *= clamp(1.0 - fade, 0.0, 1.0);
      sky = mix(sky, vec3(1.0, 1.0, 1.0), c * 0.92);
      // Soft shadow on cloud undersides
      sky = mix(sky, vec3(0.78, 0.85, 0.95), c * 0.08);
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;
