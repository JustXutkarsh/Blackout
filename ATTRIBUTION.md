# Asset attribution

License checked 16 October 2026 against [Poly Haven's asset license](https://polyhaven.com/license). It explicitly permits commercial use, modification and redistribution, including bundling assets in a product. All five third-party sets below are **CC0 1.0 Universal** ([legal text](https://creativecommons.org/publicdomain/zero/1.0/legalcode)). No paid assets, remote runtime requests or asset-host hotlinks are used.

| Asset / source | Creator credits from source catalog | Local files / modifications |
| --- | --- | --- |
| [Stone Wall 02](https://polyhaven.com/a/stone_wall_02) | Charlotte Baglioni: photography; Dario Barresi: processing | `public/assets/materials/stone_wall_02_*` — 1K JPEG base color, OpenGL normal, roughness. Tiled at approximately 2m, neutral tint. |
| [Grey Plaster 03](https://polyhaven.com/a/grey_plaster_03) | Rob Tuytel | `grey_plaster_03_*` — same channels/resolution; painted tints, restrained normal strength, world-space 2m tiling. |
| [Wood Planks Dirt](https://polyhaven.com/a/wood_planks_dirt) | Rob Tuytel | `wood_planks_dirt_*` — same channels/resolution; timber tints, approximately 1m world tiling; weapon UV mapping. |
| [Brown Mud Dry](https://polyhaven.com/a/brown_mud_dry) | Rob Tuytel | `brown_mud_dry_*` — same channels/resolution; lighter dusty tint, 2m world tiling, no displacement. |
| [Rusty Metal](https://polyhaven.com/a/rusty_metal) | Rob Tuytel | `rusty_metal_*` — same channels/resolution; painted roof/prop and dark firearm tints, controlled metalness, no displacement. |

`public/assets/manifest.json` records individual download URLs, creators, licenses, modifications and SHA-256 checksums. Source files were downloaded through Poly Haven's public asset catalog, not extracted from preview renders. Color maps use sRGB; normals and roughness use linear data color space. OpenGL normals are used without a DirectX green-channel inversion. Runtime geometry supplies meter-based projected UVs for buildings/terrain and conventional UVs for first-person models.

The village layout, modular geometry, roof corrugation, mountains, vegetation, vehicles, articulated character rigs, hands, weapon meshes, signs, contact-shadow texture, interface and synthesized audio are original project content. No third-party character, weapon, animation or building model is included. Characters use procedural joint animation rather than a downloaded motion-capture library. No GLB dependency was needed for these original runtime meshes.

Three.js and its RoundedBoxGeometry / RoomEnvironment addons are MIT licensed; see `node_modules/three/LICENSE`. Other npm dependencies retain their own licenses. Fonts are system fonts. Poly Haven logos, website text and preview images are not bundled.
