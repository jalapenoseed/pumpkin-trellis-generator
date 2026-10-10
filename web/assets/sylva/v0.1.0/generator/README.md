# Sylva Godot 4 shaders

These shaders are tested on **Godot 4.5**. The test imports a GLB, assigns the generated
`.tres` materials and renders a frame with the Compatibility renderer. The shaders use no
renderer-specific features, so they also work in Forward+ and Mobile.

| File | Purpose |
|---|---|
| `sylva_common.gdshaderinc` | Globals, wind, snow mask. Included by both shaders. |
| `sylva_foliage.gdshader` | Leaves, needles, scale sprays and grass. Handles the season LUT, leaf drop, wax bloom, backlight transmission and alpha scissor. |
| `sylva_bark.gdshader` | Bark. Uses the same wind code, plus base darkening, lichen and snow. |

The shaders include `res://sylva/shaders/sylva_common.gdshaderinc`. If you place them
somewhere else, edit that include path.

## Project globals

Paste this block into `project.godot`, or add the globals under
Project Settings → Shader Globals:

```
[shader_globals]

sylva_wind={
"type": "vec4",
"value": Vector4(1, 0, 0.3, 0.35)
}
sylva_season={
"type": "float",
"value": 0.0
}
sylva_snow={
"type": "float",
"value": 0.0
}
```

Drive the globals at runtime:

```gdscript
RenderingServer.global_shader_parameter_set("sylva_season", 2.0)   # peak fall
RenderingServer.global_shader_parameter_set("sylva_wind", Vector4(dir.x, 0, dir.z, strength))
RenderingServer.global_shader_parameter_set("sylva_snow", 0.0)
```

To preview a single tree in another season, set `season_override` on its material. A value
of `-1` follows the global.

## Import settings

Import these textures as plain textures. Do not use the Normal Map preset or sRGB, because
they hold linear data:

- `leaf_mask.png`
- `leaf_data.png`
- `bark_orm.png`

`season_lut.png` is read with `source_color`, so leave it on the defaults. Turn off
mipmaps for the LUT if your import preset adds them.
