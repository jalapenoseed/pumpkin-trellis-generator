// Sylva foliage: leaf clusters, needle sprays, scale sprays, grass blades.
// One material per species; the season is a global so a whole valley
// turns together, each card leading or lagging by its hash.
// Jalapeño Seed Productions
shader_type spatial;
render_mode cull_disabled, depth_draw_opaque, diffuse_burley, specular_schlick_ggx;

#include "res://sylva/shaders/sylva_common.gdshaderinc"

// Texture set (import all three as plain linear textures, NOT as normal
// maps: leaf_data.b carries the per-leaf id and must survive compression).
uniform sampler2D leaf_mask : hint_default_white, filter_linear_mipmap_anisotropic, repeat_disable;
// R detail luminance | G turn delay | B thickness | A coverage
uniform sampler2D leaf_data : hint_default_black, filter_linear_mipmap_anisotropic, repeat_disable;
// RG tangent normal (OpenGL) | B leaf id (0..0.9 leaf, 0.95 twig, 1.0 accent) | A height
uniform sampler2D season_lut : source_color, filter_linear, repeat_disable;
// 256 x 5: x palette, rows summer..bare, A = fraction of leaves attached

uniform vec4 twig_color : source_color = vec4(0.42, 0.3, 0.22, 1.0);
uniform vec4 accent_color : source_color = vec4(0.27, 0.35, 0.54, 1.0);
uniform float leaf_roughness : hint_range(0.0, 1.0) = 0.55;
uniform float leaf_specular : hint_range(0.0, 1.0) = 0.4;
uniform float translucency : hint_range(0.0, 1.0) = 0.5;
uniform float wax : hint_range(0.0, 1.0) = 0.0;
uniform vec4 wax_color : source_color = vec4(0.81, 0.88, 0.9, 1.0);
uniform float normal_strength : hint_range(0.0, 2.0) = 1.0;
uniform float alpha_cutoff : hint_range(0.0, 1.0) = 0.5;
uniform float season_override : hint_range(-1.0, 4.0) = -1.0; // >=0 ignores the global

// Must match sylva/material/season.py
const float TURN_SPREAD = 0.9;
const float CARD_SPREAD = 0.7;
const float DETAIL_GAIN = 1.18;
const float LUT_W = 256.0;
const float LUT_ROWS = 5.0;

varying vec3 world_normal;

void vertex() {
	VERTEX = sylva_wind_vertex(VERTEX, NORMAL, COLOR, UV2, MODEL_MATRIX, TIME, true);
	world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

vec4 lut_at(float x, float season_row) {
	float xc = (floor(clamp(x, 0.0, 0.9999) * LUT_W) + 0.5) / LUT_W;   // nearest in x
	float y = (clamp(season_row, 0.0, LUT_ROWS - 1.0) + 0.5) / LUT_ROWS; // linear in season
	return texture(season_lut, vec2(xc, y));
}

void fragment() {
	vec4 m = texture(leaf_mask, UV);
	vec4 d = texture(leaf_data, UV);
	float season = season_override >= 0.0 ? season_override : sylva_season;
	float card_hash = COLOR.r;
	float id = d.b;
	bool twig = id > 0.925 && id < 0.975;
	bool accent = id >= 0.975;

	float local = season - (m.g - 0.5) * TURN_SPREAD - (card_hash - 0.5) * CARD_SPREAD;
	float x = fract(card_hash * 0.73 + id * 0.618);
	vec3 col = lut_at(x, local).rgb * m.r * DETAIL_GAIN;
	if (accent) col = accent_color.rgb * m.r;
	if (twig) col = twig_color.rgb * m.r;

	// leaf drop: each leaf falls once the season's presence drops below its hash
	float presence = lut_at(x, season).a;
	float drop_hash = fract(card_hash * 7.13 + id * 3.1);
	float keep = (drop_hash < presence || accent || twig) ? 1.0 : 0.0;

	// glaucous wax bloom (blue spruce, juniper): view-dependent whitening,
	// strongest on fresh growth early in the year
	float ndv = clamp(dot(NORMAL, VIEW), 0.0, 1.0);
	float fres = pow(1.0 - ndv, 3.0);
	float bloom = wax * (0.35 + 0.65 * fres) * (1.0 - 0.25 * clamp(season / 4.0, 0.0, 1.0));
	if (!twig && !accent) col = mix(col, wax_color.rgb * m.r, bloom);

	// snow settles on upward-facing cards
	float snow = sylva_snow_mask(world_normal, -0.1);
	col = mix(col, vec3(0.9, 0.92, 0.95), snow);

	ALBEDO = col;
	ROUGHNESS = mix(mix(leaf_roughness, 0.8, bloom * 0.6), 0.75, snow);
	SPECULAR = leaf_specular;
	AO = COLOR.b;
	AO_LIGHT_AFFECT = 0.6;
	vec2 nxy = (d.rg * 2.0 - 1.0) * normal_strength;
	NORMAL_MAP = vec3(nxy * 0.5 + 0.5, 1.0);
	// thin tissue transmits light; veins, twigs and snow do not
	BACKLIGHT = col * translucency * (1.0 - m.b) * (1.0 - snow);
	ALPHA = m.a * keep;
	ALPHA_SCISSOR_THRESHOLD = alpha_cutoff;
}
