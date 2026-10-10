# Sylva generation pipeline

```
species TOML ──► skeleton ──► mesh (LOD0-2) ──► GLB + Godot .tres + manifest
      │              │
      │              └──► reference-sheet renders (ortho, seasons, variation)
      ├──► leaf outlines ──► vector raster ──► card atlas (mask / data / normal)
      ├──► bark recipe ──► albedo / normal / ORM / height
      └──► palettes ──► season LUT ──► (shader | baked albedo | sheets)
```

## Seeds

`core/rng.stream(seed, *path)` derives an independent generator for every
decision. Examples are `("quaking_aspen", "children", 17)` and
`("quaking_aspen", "cards")`.

Because each stream is independent, editing one subsystem never reshuffles
another. You can change leaf density and the branch skeleton will not move.
This lets a `(species, seed, age)` triple act as a stable asset ID in the
library tool.

## Growth (skeleton/tree.py)

1. **Stems.** A single trunk can lean. Shrubs grow several stems from a base
   cluster (`stems`, `stem_spread_m`, `stem_angle_deg`). Decurrent species
   fork into leaders at `trunk_reach`. That is what turns a spire into an oak
   or cottonwood crown.
2. **Level-1 branches.** Placement is set by `whorl`, `opposite` or the
   phyllotaxis angle. Their **length is solved from the crown envelope**.
   - The branch is grown once.
   - Its real horizontal reach is measured, after tropism has curled it.
   - It is regrown with the same random stream, scaled so the tip lands on the
     envelope.
   - Every tip is then capped below its stem's apex.

   The envelope curve therefore *is* the silhouette.
3. **Deeper levels.** Each deeper level uses per-metre density, length as a
   fraction of the parent, a down-angle profile along the parent, and tropism
   along the child (+ bends up). All of these are monotone cubic profiles that
   never overshoot their control points.
4. **Foliage cards** sit on the `on_levels` carriers. They are spread around
   the twig and tilted toward the sky by `up_bias`. They get crown-depth AO
   and are capped at `card_budget`.

## Clumps (skeleton/clump.py)

- **Bunchgrass blades** are ribbons with quadratic droop, plus seed-head cards.
- **Alpine avens** is a golden-angle rosette of leaf cards lying close to the soil.

## Leaves (leaf/)

- **Outlines** come in two families:
  - **Midrib** profiles w(s), with optional rounded lobing (oak, avens).
  - **Palmate** polar smooth-max lobes with pointed tips (maple).
- **Margins** (crenate, serrate, doubly serrate) are applied by arc length, so
  teeth stay evenly spaced.
- **Leaves are drawn from their vectors** straight into the card canvas, which
  keeps edges crisp. This includes petioles, a marched pinnate or palmate vein
  network, cellular tertiary reticulation, contact shadows on leaves
  underneath, and categorical leaf ids.
- **Physical scale is preserved.** A cell spans the species' mean card size in
  metres, so a 5 cm aspen leaf is 5 cm on the card.
- **Conifer cards** are built from needle strokes:
  - pine tufts: fascicles of 2–3 crowded at the tip
  - Douglas-fir: flat two-ranked sprays
  - spruce: all-round stiff bottle-brushes
  - juniper: braided scale cords with glaucous berry-cones

## LOD

| LOD | Bark | Cards |
|---|---|---|
| 0 | every branch ≥ 4 mm, except the card-painted twig level | 100% |
| 1 | ≥ 12 mm, half the radial segments | 45%, enlarged by 1/√keep to hold coverage |
| 2 | ≥ 35 mm | 18% |

Typical LOD0 budgets are 10–50k triangles. Plains cottonwood is the outlier
because it is a 25 m giant.

## Extending

- **New species**: copy the closest TOML, adjust it, then run
  `sylva sheet <id>` and iterate on the sheet.
- **New leaf shape**: add a profile to `leaf/outline.PROFILES` or a branch in
  `make()`.
- **New bark**: add a recipe to `texture/bark.RECIPES`. It returns height,
  tone, roughness and an optional accent mask.
