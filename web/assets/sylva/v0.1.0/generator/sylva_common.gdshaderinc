// Sylva shared shader code: wind + season globals.
// Jalapeño Seed Productions
//
// Required project globals (Project Settings > Shader Globals, or paste
// the [shader_globals] block from shaders/godot/README.md into project.godot):
//   sylva_wind    vec4   xyz = world wind direction, w = strength 0..1
//   sylva_season  float  0 summer, 1 turning, 2 peak, 3 late, 4 bare
//   sylva_snow    float  0..1 snow cover on upward faces
//
// Vertex contract (see sylva/mesh/build.py):
//   COLOR.r hash, COLOR.g height01, COLOR.b AO, COLOR.a flex
//   UV2 foliage = (along card 0..1, across -0.5..0.5); bark = (level/4, t)

global uniform vec4 sylva_wind;
global uniform float sylva_season;
global uniform float sylva_snow;

// TAU is a Godot built-in constant.
// Per-asset motion tuning (values come from the species TOML [material]).
uniform float tree_height = 15.0;
uniform float sway : hint_range(0.0, 2.0) = 0.3;
uniform float stiffness : hint_range(0.0, 1.0) = 0.5;
uniform float flutter : hint_range(0.0, 2.0) = 0.3;


// Main trunk bend (after GPU Gems 3, ch. 16 "Vegetation Procedural
// Animation"): displaces with height^2 and renormalises so the trunk keeps
// its length instead of stretching.
vec3 sylva_main_bend(vec3 v, vec3 wind_os, float scale) {
	float len = length(v);
	float bf = max(v.y, 0.0) * scale;
	bf += 1.0;
	bf *= bf;
	bf = bf * bf - bf;
	vec3 nv = v;
	nv.xz += wind_os.xz * bf;
	return len > 0.0001 ? normalize(nv) * len : v;
}

// Returns the displaced object-space vertex.
vec3 sylva_wind_vertex(vec3 v, vec3 n, vec4 col, vec2 uv2, mat4 model, float time, bool leaf) {
	vec3 wdir = sylva_wind.xyz;
	wdir.y = 0.0;
	wdir = length(wdir) > 0.0001 ? normalize(wdir) : vec3(1.0, 0.0, 0.0);
	float strength = clamp(sylva_wind.w, 0.0, 1.5);
	vec3 origin = model[3].xyz;
	float tree_phase = dot(origin.xz, vec2(0.137, 0.173));
	mat3 to_obj = inverse(mat3(model));
	vec3 wind_os = to_obj * wdir;

	// 1. gusting main sway; stiff species sway slower and less
	float gust = 0.55 + 0.45 * sin(time * 0.31 + tree_phase) * sin(time * 0.127 + tree_phase * 1.7);
	float freq = mix(1.1, 0.55, stiffness);
	float osc = 0.7 + 0.3 * sin(time * freq + tree_phase);
	float bend = strength * gust * osc * sway * (1.0 - 0.6 * stiffness);
	vec3 p = sylva_main_bend(v, wind_os, bend * 0.18 / max(tree_height, 0.5));

	// 2. branch / blade secondary motion, out of phase per element
	float ph = col.r * TAU;
	float br = sin(time * (1.7 + col.r) + ph + tree_phase) + 0.5 * sin(time * 3.1 + ph * 2.3);
	vec3 bdir = normalize(wind_os * 0.7 + vec3(0.0, 0.3, 0.0));
	p += bdir * br * col.a * strength * sway * 0.06 * (0.5 + col.g);

	// 3. leaf flutter about the petiole (UV2.x = distance from pivot)
	if (leaf) {
		float f = sin(time * (7.0 + 5.0 * col.r) + ph * 13.0) * sin(time * 2.3 + ph * 5.0);
		p += n * f * uv2.x * flutter * (0.25 + strength) * 0.035;
	}
	return p;
}

float sylva_snow_mask(vec3 world_normal, float bias) {
	return smoothstep(0.35, 0.85, world_normal.y + bias) * clamp(sylva_snow, 0.0, 1.0);
}
