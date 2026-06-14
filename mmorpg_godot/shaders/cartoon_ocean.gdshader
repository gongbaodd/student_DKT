shader_type spatial;
render_mode unshaded, cull_disabled;

uniform float time : hint_range(0.0, 1000.0) = 0.0;
uniform float wave_amplitude : hint_range(0.0, 2.0) = 0.35;
uniform vec3 shallow_color : source_color = vec3(0.2, 0.75, 0.85);
uniform vec3 deep_color : source_color = vec3(0.05, 0.25, 0.55);

varying vec3 v_world_pos;
varying float v_wave_height;

void vertex() {
	vec3 pos = VERTEX;
	float wave1 = sin(pos.x * 0.15 + time * 1.2) * wave_amplitude;
	float wave2 = sin(pos.z * 0.12 + time * 0.9) * wave_amplitude * 0.6;
	float wave3 = sin((pos.x + pos.z) * 0.08 + time * 1.5) * wave_amplitude * 0.4;
	float wave = wave1 + wave2 + wave3;
	pos.y += wave;
	v_wave_height = wave;
	v_world_pos = (MODEL_MATRIX * vec4(pos, 1.0)).xyz;
	VERTEX = pos;
}

void fragment() {
	float dist = length(v_world_pos.xz) / 180.0;
	float depth = clamp(dist + v_wave_height * 0.5, 0.0, 1.0);
	float bands = floor(depth * 5.0) / 5.0;
	vec3 water_color = mix(shallow_color, deep_color, bands);

	float foam = smoothstep(0.08, 0.15, v_wave_height);
	float noise = fract(sin(dot(v_world_pos.xz * 0.5 + time * 0.3, vec2(127.1, 311.7))) * 43758.5453);
	foam *= step(0.55, noise);
	water_color = mix(water_color, vec3(1.0), foam * 0.6);

	ALBEDO = water_color;
}
