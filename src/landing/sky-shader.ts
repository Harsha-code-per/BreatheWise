/**
 * GLSL for the landing sky: a winter skyline under drifting smog that thins as `u_clear`
 * rises from 0 to 1. `u_night` blends to a sodium-lit night palette for dark mode.
 */

export const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_clear;
uniform float u_night;

float hash(float n) { return fract(sin(n) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = i.x + i.y * 57.0;
  return mix(mix(hash(n), hash(n + 1.0), f.x), mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

float tower(float x, float width, float seed, float base, float spread) {
  return base + spread * hash(floor(x / width) * 7.31 + seed);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  float x = uv.x * aspect;
  float clear = smoothstep(0.0, 1.0, u_clear);

  vec3 smogTop = mix(vec3(0.56, 0.52, 0.47), vec3(0.12, 0.10, 0.09), u_night);
  vec3 smogLow = mix(vec3(0.86, 0.77, 0.62), vec3(0.45, 0.29, 0.14), u_night);
  vec3 clearTop = mix(vec3(0.15, 0.40, 0.78), vec3(0.03, 0.06, 0.16), u_night);
  vec3 clearLow = mix(vec3(0.76, 0.89, 0.97), vec3(0.11, 0.19, 0.35), u_night);
  vec3 sky = mix(mix(smogLow, smogTop, uv.y), mix(clearLow, clearTop, pow(uv.y, 0.8)), clear);

  vec3 sunColor = mix(vec3(1.0, 0.93, 0.78), vec3(0.90, 0.93, 1.0), u_night);
  float sunDistance = length(vec2(x, uv.y) - vec2(0.76 * aspect, 0.68));
  sky += sunColor * exp(-sunDistance * mix(9.0, 4.5, clear)) * mix(0.22, 0.55, clear);
  sky = mix(sky, sunColor, smoothstep(0.066, 0.06, sunDistance) * mix(0.5, 1.0, clear));

  float far = tower(x, 0.05, 1.7, 0.16, 0.17);
  float near = tower(x + 0.4, 0.075, 4.3, 0.08, 0.2);
  vec3 farColor = mix(vec3(0.42, 0.48, 0.58), vec3(0.07, 0.09, 0.15), u_night);
  vec3 nearColor = mix(vec3(0.22, 0.27, 0.37), vec3(0.03, 0.04, 0.08), u_night);
  sky = mix(sky, farColor, step(uv.y, far) * mix(0.2, 0.8, clear));
  sky = mix(sky, nearColor, step(uv.y, near) * mix(0.5, 1.0, clear));
  vec2 cell = vec2(x * 70.0, uv.y * 48.0);
  float pane = step(fract(cell.x), 0.55) * step(fract(cell.y), 0.5);
  float lit = step(0.86, hash(floor(cell.x) * 3.1 + floor(cell.y) * 17.7)) * pane * step(uv.y, near - 0.02);
  sky += vec3(1.0, 0.8, 0.5) * lit * u_night * 0.35;

  float drift = u_time * 0.015;
  float smoke = fbm(vec2(x * 1.6 + drift, uv.y * 3.0 - drift * 0.5));
  float density = (1.0 - clear) * smoothstep(1.15, 0.0, uv.y) * (0.5 + 0.65 * smoke);
  vec3 hazeColor = mix(vec3(0.80, 0.71, 0.57), vec3(0.38, 0.25, 0.13), u_night);
  sky = mix(sky, hazeColor, clamp(density, 0.0, 0.93));

  sky += (hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + u_time) - 0.5) * 0.018;
  gl_FragColor = vec4(sky, 1.0);
}
`;
