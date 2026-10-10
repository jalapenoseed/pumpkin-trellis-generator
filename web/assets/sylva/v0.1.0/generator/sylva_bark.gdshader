// Sylva bark. Shares the wind code with foliage so branches and their
// leaf cards move as one.
// Jalapeño Seed Productions
shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

#include "res://sylva/shaders/sylva_common.gdshaderinc"

uniform sampler2D bark_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D bark_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D bark_orm : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
// R ambient occlusion | G roughness | B metallic (0)
uniform float normal_strength : hint_range(0.0, 3.0) = 1.0;
uniform vec2 uv_scale = vec2(1.0);

// Aspen-style dark, rough base and a young/old blend up the stem
uniform float base_darkening : hint_range(0.0, 1.0) = 0.0;
uniform float base_height : hint_range(0.0, 0.5) = 0.08;  // in height01
uniform vec4 base_tint : source_color = vec4(0.25, 0.22, 0.2, 1.0);

// Lichen / moss on the windward-upper side of lower limbs
uniform float lichen : hint_range(0.0, 1.0) = 0.0;
uniform vec4 lichen_color : source_color = vec4(0.62, 0.66, 0.42, 1.0);

varying vec3 world_normal;
varying float height01;

void vertex() {
	VERTEX = sylva_wind_vertex(VERTEX, NORMAL, COLOR, UV2, MODEL_MATRIX, TIME, false);
	world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	height01 = COLOR.g;
}

void fragment() {
	vec2 uv = UV * uv_scale;
	vec3 alb = texture(bark_albedo, uv).rgb;
	vec3 orm = texture(bark_orm, uv).rgb;
	float rough = orm.g;

	float base = (1.0 - smoothstep(0.0, base_height, height01)) * base_darkening;
	alb = mix(alb, alb * base_tint.rgb * 2.0, base);
	rough = mix(rough, 0.95, base);

	float up = world_normal.y;
	float lich = lichen * smoothstep(0.1, 0.7, up) * (1.0 - smoothstep(0.4, 0.9, height01));
	lich *= smoothstep(0.35, 0.65, texture(bark_orm, uv * 0.37).r);   // break it up
	alb = mix(alb, lichen_color.rgb, lich);

	float snow = sylva_snow_mask(world_normal, 0.0);
	alb = mix(alb, vec3(0.9, 0.92, 0.95), snow);

	ALBEDO = alb;
	ROUGHNESS = mix(rough, 0.8, snow);
	METALLIC = 0.0;
	AO = orm.r;
	AO_LIGHT_AFFECT = 0.4;
	NORMAL_MAP = texture(bark_normal, uv).rgb;
	NORMAL_MAP_DEPTH = normal_strength * (1.0 - snow * 0.7);
}
