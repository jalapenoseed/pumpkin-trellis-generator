# Skydancer autumn system — 0.2.2

Implemented in the existing `Skydancer-integration` checkout on `feat/charles-gameplay-integration`, based on `18d9e3d`. The existing Pagosa world, Charles, river lighting, fly tying and cabin systems remain in place. This is a working implementation for visual review, not a claim of final photorealistic or shipping quality.

## Review on a phone

- Workshop: `http://192.168.1.88:8135/autumn.html`
- Existing game, at the garden: `http://192.168.1.88:8135/index.html?autumn=1`
- These are LAN URLs. The phone must share the PC's network. The server binds `0.0.0.0`; its LAN endpoint returned HTTP 200. Reachability from the actual iPhone has not been observed.
- One finger orbits; two fingers pan and pinch. Controls opens the mobile panel. Choose Patch, Pumpkins, Leaf, Vine or Trellis. Frame view fits the asset to the screen, including portrait screens.
- The workshop uses the project's installed Three.js 0.147 files, with no CDN requests or sign-in. Desktop defaults to Medium, narrow screens to Mobile. High is selectable.
- To restart after a PC reboot: from `Skydancer-integration/web`, run `python -m http.server 8135 --bind 0.0.0.0`.

## Geometry and materials

The earlier `skydancer_autumn_pack_v01.zip` was recovered and inspected. Its source confirms 12 demonstration pumpkins, leaves, runners, tendrils and a metal arch; it was an untextured prototype without LODs or gameplay. It was retained rather than used as proof of production quality.

The new independent `AutumnAssets` module builds ribbed round, tall, squat, flattened, white, green and warty fruit; recessed sockets; bent woody stems; lobed leaves with a thickness shell, cupping, curled/irregular margins and branching raised veins; branching spline runners, petioles, coiled tendrils and blossoms; metal arches, wooden lattices and fences. Climbing paths wind around the supports. The modular trellis export preserves named pipe, elbow, sleeve, joint, stake and brace nodes.

All geometry and material pixels were authored procedurally. The supplied photographs and orthographic sheet were visual references only; their pixels are not included in exported textures. No ownership or redistribution rights for the reference photos are asserted.

`web/assets/autumn/v0.2.2` contains 57 GLB models, corresponding dependency-closed glTF folders, individual rendered thumbnails, three PBR map sets (base color, OpenGL normal, roughness and height), presets, generator source and validation reports. Units are metres, Y is up. `manifest.json` records bounds, topology counts, hashes, provenance and versions. Standalone stems and blossoms intentionally use attachment origins rather than ground pivots.

GLB carries the PBR maps and static geometry. Height is supplied separately; it is not glTF displacement. Runtime wind is a Three.js shader and must be ported for another engine. Model reuse through GLB/glTF does not depend on Skydancer code. Botanically exact topology, scanned textures, and final aesthetic approval are not claimed.

## Generator interface

Load `web/src/autumn-core.js` after Three.js, then:

```js
const patch = AutumnAssets.build(THREE, {
  seed: 1935, width: 12, length: 10, density: 0.3,
  tier: 'mobile', scale: 1, sizeMin: 0.75, sizeMax: 1.25,
  shape: 'mixed', color: 'mixed', growth: 1,
  vineLength: 2.1, internode: 0.3, branching: 2, branchAngle: 0.7,
  leafDensity: 1, health: 'green', season: 'early-fall',
  trellis: 'arch', climbing: true,
  trellisWidth: 2.4, trellisHeight: 2.5, trellisLength: 2
}, {
  heightAt: (x, z) => terrainHeight(x, z),
  suitable: (x, z) => canPlantHere(x, z)
});
scene.add(patch.root);
// Each frame:
patch.update(camera, elapsedSeconds);
// When replacing a patch:
patch.dispose();
```

`layout` is renderer independent and deterministic. A higher density preserves the accepted prefix of a seeded layout. Terrain callbacks operate in patch-local x/z; height is returned in the same y frame as the patch. A caller supplies game-specific exclusions. The renderer uses shared, instanced fruit/stem/leaf geometry plus merged runner geometry per spatial chunk. Components are reusable for future crop families; squash/melon-specific silhouettes and gameplay are not implemented yet.

The workshop additionally provides single placement and patch painting. Painting is session-only and is cleared by regeneration; it is not a persistent terrain editor. Painting respects the active plant-count budget. It does not modify the live Pagosa map.

## Game integration

`autumn-world.js` adapts the generator to the existing terrain, land classification, river sampling, roads and collision owners. Placement rejects steep slopes, unsuitable land and occupied ground. It does not flatten or replace terrain. Regions load lazily as the camera approaches:

| Region | Observed plants | Seed |
| --- | ---: | ---: |
| Homestead patch | 23 | 19351 |
| Cabin arch | 2 plus climbing foliage | 19352 |
| Harvest field | 291 on Medium/High; Mobile caps at 240 | 19353 |
| Barn doorway area | 4 | 19354 |
| Fence runners | 3 plus climbing foliage | 19355 |

Four additional cultivation beds sit beside the existing garden. Two start ripe; two start empty. Equip the existing trowel to plant. Equip/fill the existing watering can at the yard pump, then water. Growth advances only while water remains; maturity takes 240 active growth seconds, with 180 seconds of water per pour. Empty hands harvest; one pumpkin can be carried at a time and deposited in the porch crate. Harvesting returns two seeds. Existing hand reach/grip helpers support the carrying pose.

Field/decorative pumpkins are also individually harvestable. Stable seed/position IDs persist picked fruit and hide every corresponding LOD instance; repeated harvesting is rejected. Cultivation/replanting is currently in the four beds. Harvested field fruit stays picked; seasonal field reseeding is not implemented.

State is an additive `homestead.state.autumn` extension saved through the existing cabin save owner. Existing cabin version/migration logic remains unchanged. Unknown autumn versions are preserved and disabled rather than overwritten. Existing tools, water, cabin prompts and the player continue to own their behavior. Weather-driven plant physiology and an automatic calendar season adapter are not implemented; the game examples use early fall while the workshop exposes season controls.

## Performance controls

| Tier | Plant cap per generated patch | Leaves per plant before density/LOD | Near / far LOD distance | World cull |
| --- | ---: | ---: | --- | ---: |
| High | 600 | 12 | 17 / 48 m | 150 m |
| Medium | 400 | 10 | 14 / 45 m | 110 m |
| Mobile | 240 | 6 | 9 / 28 m | 75 m |

Three geometry levels use distance thresholds with hysteresis. Far LOD omits the detailed runners and foliage. The world culls chunks at the configured distance. The bounded workshop retains distant fruit while framing a whole patch; it still selects coarse LODs. Shadow/detail budgets differ by tier; instancing avoids one draw call per leaf or fruit. Terrain and scene ray/collision checks remain CPU work.

Current measured results and camera-dependent triangle/draw counts are in `docs/autumn-evidence/preview-results.json`. These are Windows Chrome headless measurements with an emulated phone viewport, not physical phone or console performance. Before the portrait framing fix, a closer 312-plant High view measured 28 FPS / 3.39 million rendered triangles on this PC, versus 60 FPS / 192k triangles for capped Mobile. High remains expensive on older hardware; select Medium or Mobile. Large regeneration can block the UI for roughly 1–3 seconds on this PC; generation is bounded but not yet moved into a worker.

## Verification and boundaries

- Determinism, density, tier caps, terrain/slope/exclusion callbacks, wet/dry growth, storage capacity, save roundtrip and unknown-version preservation: passed.
- Real browser rendering in five views, synthetic touch orbit/pinch, mobile controls, seed/density/scale changes and large fields: passed without runtime exceptions.
- Existing game boot, bed lifecycle, carry/store, field harvesting, duplicate rejection and save reload: passed.
- Existing homestead, activity/gardening and water regression checks: passed.
- GLB structural/finite-geometry checks and Blender 4.4.3 import of all 57 assets: passed.
- Asset Forge final harness: 45 tests passed, one skipped, zero failed; Vite build passed. Existing unrelated Mixamo files were left untouched.
- Actual iPhone Safari, console hardware, long play sessions and human visual review: not verified. Independent code/security review is still pending under the Asset Forge harness; no promotion or human approval was fabricated.

Useful commands from the Skydancer root:

```text
python web/build.py
node web/tools/test-autumn.cjs
node web/tools/verify-autumn.cjs
node web/tools/verify-autumn-world.cjs
node web/tools/export-autumn.cjs
python web/tools/seal-autumn.py
```

Browser checks/export expect an isolated Chrome debugging session on port 9275 and this preview server on port 8135. The isolated test profile does not use the player's normal browser saves. `validate-autumn-blender.py` accepts the absolute export folder after Blender's `--` separator.

## Asset Forge

The existing persistent library now contains 57 model candidates and three material candidates. Existing versions are retained; unchanged content deduplicates. Sources, presets and receipts live under `Procedural Generators/autumn/<version>`. Individual model cards show their actual rendered thumbnails and GLB download links. They remain pending human visual approval and are not silently promoted for automatic reuse.

The added `scripts/register-procedural-pack.mjs` uses the existing transaction/index and validators, verifies dependency closure and hashes, rejects traversal, and imposes byte/count budgets. Imported generator source is stored as data and is never executed by registration. No worker, queue, credential, approval gate, or unrelated model was replaced.
