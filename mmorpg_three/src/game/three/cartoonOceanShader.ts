export const cartoonOceanVertexShader = `
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
  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;
  vUV = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const cartoonOceanFragmentShader = `
uniform vec3 shallowColor;
uniform vec3 deepColor;
uniform float time;

varying vec2 vUV;
varying vec3 vWorldPos;
varying float vWaveHeight;

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
