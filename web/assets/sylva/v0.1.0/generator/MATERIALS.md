# Sylva materials & shader spec

This document is the contract between the generator, the texture set and the
engine shaders. The Python reference shader is `sylva/material/season.py`. The
Godot implementation is `shaders/godot/*`. The two must stay numerically
identical: thumbnails, sheets and baked GLB albedo come from the Python side,
so what the library tool shows is what the game renders.

## 1. Colour management

- Palettes are authored in **sRGB hex**, picked against photo reference.
- Everything that feeds lighting is converted to **linear**. That includes LUT
  sampling (`source_color`), blends and bark ramps.
- Palette blends, such as interpolating seasons, run in linear light. Mixing in
  sRGB makes the mid-tones muddy and over-dark, which is exactly where autumn
  oranges live.
- Data textures (`leaf_mask`, `leaf_data`, `bark_orm`, `bark_height`) are
  **linear**. Import them in Godot as plain textures. Do **not** import them as
  normal maps or sRGB.

## 2. Foliage texture set

The atlas is a 2×2 grid. Cells 0 and 1 are card variants, which are the ones
the meshes use. Cells 2 and 3 are detail cells: a single leaf top and
underside, or a cone and fascicle.

| Texture | R | G | B | A |
|---|---|---|---|---|
| `leaf_mask` | detail luminance | **turn delay** | thickness | coverage |
| `leaf_data` | normal X | normal Y | **leaf id** | height |
| `leaf_normal` | X | Y | Z | – (glTF / DCC only) |
| `season_lut` | colour (sRGB) | | | presence |

The channels in bold are the ones that need explaining.

**Leaf id** marks what each texel belongs to:

- `0 … 0.9`: a leaf. Each leaf on a card gets its own id, so a single card shows several palette colours.
- `0.95`: twig texels, coloured with `twig_color`.
- `1.0`: accent texels (berries, cones, flowers), coloured with `accent_color`.

Ids are composited categorically, never blended across an edge.

**Turn delay** controls *where on the leaf* colour changes first. Real leaves
senesce from the margin and between the veins, and stay green along the veins
longest. The generator derives this from the distance to the edge and to the
veins. The shader then offsets the season per texel, so a mid-transition leaf
has gold edges and green veins instead of one flat cross-fade.

**Thickness** drives backlight transmission. Lamina is thin. Veins, petioles,
twigs and cones are close to opaque.

## 3. Season model

`sylva_season` is a global float from 0 to 4:

| Value | Season |
|---|---|
| 0 | summer |
| 1 | turning |
| 2 | peak |
| 3 | late |
| 4 | bare |

Per texel:

```
local  = season - (turn - 0.5) * 0.9 - (card_hash - 0.5) * 0.7
x      = fract(card_hash * 0.73 + leaf_id * 0.618)          # palette pick (nearest)
colour = LUT(x, local).rgb * detail * 1.18                    # linear, row-interpolated
keep   = fract(card_hash * 7.13 + leaf_id * 3.1) < LUT(x, season).a
```

- The **LUT x axis** is a weighted palette. Each colour's width is the fraction
  of leaves showing that colour. For example, aspen at peak is mostly gold,
  with about 6% orange and 1–2% red clones. The weights live in the species
  TOML.
- **Card hash** makes some branches lead and others lag, which matches real
  trees: the sunny side of the crown turns first.
- **Presence** (LUT alpha) drops individual leaves through `late` and `bare`.
  Twigs and accents never drop. Gambel oak keeps about 12% of its leaves at
  `bare`, because its dead leaves hang on into winter.
- **Evergreens** keep presence at 1. They shift hue subtly instead: older
  ponderosa needles yellow, and juniper bronzes in winter.

## 4. PBR targets (per species, in `[material]`)

| Parameter | Range used | Notes |
|---|---|---|
| `leaf_roughness` | 0.38 (glossy oak) – 0.62 (spruce, pinyon) | Gambel oak's upper surface is waxy and dark. |
| `leaf_specular` | 0.3 – 0.5 | Dielectric F0 of about 0.03–0.04 (Godot's default spec is 0.5). |
| `translucency` | 0.15 (needles) – 0.7 (maple) | Godot `BACKLIGHT`, scaled by (1 − thickness). |
| `normal_bend` | 0.45 – 0.65 | Spherical-normal blend. It softens canopies so they shade like a volume, not a pile of cards. |
| `wax` | 0 – 0.8 | Glaucous bloom: a Fresnel-weighted whitening plus extra roughness. Blue spruce is 0.8, juniper 0.55, Douglas-fir 0.25. |
| bark `roughness` | 0.45 (willow, maple) – 0.98 (juniper) | Stored in ORM G. Furrows rougher than plate faces. |

Bark maps:

- **Albedo**: sRGB.
- **Normal**: OpenGL convention (+Y, green up). This is what Godot and glTF expect.
- **ORM**: R = AO (cavity), G = roughness, B = metallic (0). This matches the
  glTF metallicRoughness layout, so the same image feeds both glTF and Godot.

Bark textures are tileable in both axes. Image y runs along the stem.
`tile_m` is the world size of one repeat. The mesher rounds the U repeat
count to an integer around each branch, so there is no seam.

## 5. Vertex contract

| Attribute | Content |
|---|---|
| `COLOR.r` | per-element hash: wind phase, palette pick, season lead |
| `COLOR.g` | height in tree, 0–1 |
| `COLOR.b` | crown-depth AO (cards deep in the crown are darker) |
| `COLOR.a` | flex: secondary motion weight (0 on the trunk) |
| `UV2` foliage | (distance from card pivot 0–1, across −0.5…0.5): used for flutter about the petiole |
| `UV2` bark | (level / 4, t along branch) |

## 6. Wind

The bark and foliage shaders share `sylva_wind_vertex`, so limbs and their
leaf cards stay glued together. It has three layers:

1. **Main bend**. Displacement grows with height² and the vertex is then
   renormalised to keep its length (GPU Gems 3, ch. 16). It is gust-modulated,
   and stiff species bend less and more slowly.
2. **Branch motion** is weighted by `COLOR.a` and phased per element.
3. **Leaf flutter** follows the card normal and scales with `UV2.x`, so cards
   pivot at their stems. Aspen sets `flutter = 1.0` for its signature
   trembling.

## 7. Snow, lichen, base darkening

- `sylva_snow` (global) settles on upward-facing normals for both bark and foliage.
- `lichen` puts pale yellow-green on the upper side of low limbs. It is used on aspen.
- `base_darkening` blends to a dark, rough tint near the ground. It produces the black, furrowed aspen base without a second texture set.

## 8. Known gaps / next passes

- No impostor or billboard LOD3 yet. That is the next asset-side task for
  forest-scale rendering.
- No three.js/WebGL port of the foliage shader yet for the Skydancer web build.
  The math in §3 is small and ports directly.
- The scaly bark recipes (spruce, oak, pinyon) still read slightly "paved"
  up close. They need another pass with layered flake depth.
- Ponderosa and pinyon cones are stylised. The seed-cone cells need a
  photogrammetry-referenced pass.
