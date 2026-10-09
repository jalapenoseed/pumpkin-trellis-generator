# Pumpkin & Trellis Generator

Reusable procedural autumn assets and a touch-friendly 3D workshop, extracted from Skydancer without replacing its integration.

## Run locally

Requires Node.js 22+ and npm.

```sh
cd web
npm ci
npm test
npm start
```

Open http://localhost:8136/autumn.html. On a phone using the same Wi-Fi, use your computer's LAN IP with port 8136. The server listens on all interfaces; local firewall rules still apply. Stop with Ctrl+C. Set PORT to choose another port.

## Included

- Seeded round, tall, squat, flat, white, green and warty pumpkins; curved stems and recessed sockets.
- Lobed, cupped leaves, underside shading, raised veins, branching runners, blossoms and coiled tendrils.
- Metal arches, wooden trellises, fences and modular support parts.
- Seed, density, scale, growth, health, season, climbing and quality controls.
- Individual placement and session-only area painting, terrain/slope/exclusion hooks.
- Shared PBR materials, instancing, chunk culling and three geometry tiers.
- 57 versioned GLB models, closed glTF exports, thumbnails, material maps, presets and validation reports under web/assets/autumn/v0.2.2.
- Browser GLB export; runtime wind is not baked into static exports.

## Use in another game

Load Three.js 0.147.0 followed by web/src/autumn-core.js. The global AutumnAssets API accepts seeded options and terrain callbacks. The generator has no dependency on Skydancer. See the source and integration notes for available options and tier budgets.

web/src/autumn-state.js is an optional crop-state example used by the regression suite. integrations/skydancer/autumn-world.js is the existing game-specific adapter, provided as a reference; it is not loaded by this workshop.

## Export and verification

npm test checks determinism, controls, terrain exclusions, budgets and crop-state persistence. Existing export and browser QA scripts in web/tools require an isolated Chrome debugger on port 9275. Set AUTUMN_PREVIEW_URL to override their default workshop address (http://127.0.0.1:8136/autumn.html). Export with Node 22+; then run python tools/seal-autumn.py from web. Blender validation accepts the export directory after Blender's -- separator.

The imported reports describe the original Skydancer run, not a new certification of this standalone checkout. Physical iPhone Safari and console hardware remain unverified. See docs/SKYDANCER_INTEGRATION.md for historical game integration, performance measurements and known limits. Its game-build commands apply to Skydancer, not this repository.

## Provenance and status

Extracted from jalapenoseed/skydancer commit 450d9a5ff8d52837c391a3eb0feb91c9c9faa961, autumn system v0.2.2. Original procedural geometry and texture pixels; reference photographs are not redistributed. Three.js is an npm dependency under its own MIT license.

Private project; no open-source license is granted. Asset Forge entries remain technical candidates pending human visual approval. The existing Skydancer implementation remains intact. This repository is a separate development snapshot; updates are not automatically synchronized.

## Windows shell troubleshooting

If npm's default command shell exits silently on this PC, run `node tools/test-autumn.cjs` and `node tools/serve.cjs` directly from web, or use `npm test --script-shell=powershell.exe` / `npm start --script-shell=powershell.exe`. No global npm settings need to change.
