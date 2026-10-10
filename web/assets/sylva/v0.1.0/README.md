# Existing Sylva foliage outputs

These are the author's existing Sylva 0.1.0 assets, copied from the registered Asset Forge pack. No replacement foliage generator was authored for the autumn workshop.

The runtime uses the self-contained `models/sylva_<species>/asset.glb` and `lod1.glb` files. All 13 original species are included. `manifest.json` and `validation.json` retain the original pack's metadata and historical validation. The source manifest describes split glTF files and material PNGs in the full pack; those duplicate representations are not included in this runtime subset. Embedded GLB textures are used instead.

The `generator/` directory retains original species presets, Godot shaders, botanical references and pipeline/material documentation. It is supporting source data, not an executable Python generator installation.

Ownership remains `LicenseRef-User-Owned`, as recorded by the source manifest; this folder is excluded from the repository's general MIT asset grant. No third-party foliage was downloaded. The browser adapter decodes Sylva's COLOR_0 hash/height/AO/flex fields, preserves the generated PBR maps, and implements browser wind. Native Godot seasonal LUT and snow shaders remain in the source pack; browser season controls tint the baked peak-fall textures and thin leaf cards.
