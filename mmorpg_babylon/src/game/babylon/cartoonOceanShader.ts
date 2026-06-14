import { Effect } from "@babylonjs/core/Materials/effect";

const VERTEX = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform float time;
uniform float waveAmplitude;

varying vec2 vUV;
varying vec3 vWorldPos;
varying float vWaveHeight;

void main() {
  vec3 pos = position;
  float wave1 = sin(pos.x * 0.15 + time * 1.2) * waveAmplitude;
  float wave2 = sin(pos.z * 0.12 + time * 0.9) * waveAmplitude * 0.6;
  float wave3 = sin((pos.x + pos.z) * 0.08 + time * 1.5) * waveAmplitude * 0.4;
  float wave = wave1 + wave2 + wave3;
  pos.y += wave;
  vWaveHeight = wave;
  vec4 worldPos = world * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vUV = uv;
  gl_Position = worldViewProjection * vec4(pos, 1.0);
}
`;

const FRAGMENT = `
precision highp float;

varying vec2 vUV;
varying vec3 vWorldPos;
varying float vWaveHeight;

uniform vec3 shallowColor;
uniform vec3 deepColor;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float dist = length(vWorldPos.xz) / 180.0;
  float depth = clamp(dist + vWaveHeight * 0.5, 0.0, 1.0);
  float bands = floor(depth * 5.0) / 5.0;
  vec3 waterColor = mix(shallowColor, deepColor, bands);

  float foam = smoothstep(0.08, 0.15, vWaveHeight);
  float noise = hash(vWorldPos.xz * 0.5 + time * 0.3);
  foam *= step(0.55, noise);
  waterColor = mix(waterColor, vec3(1.0), foam * 0.6);

  gl_FragColor = vec4(waterColor, 1.0);
}
`;

export function registerCartoonOceanShaders(): void {
  Effect.ShadersStore["cartoonOceanVertexShader"] = VERTEX;
  Effect.ShadersStore["cartoonOceanFragmentShader"] = FRAGMENT;
}
