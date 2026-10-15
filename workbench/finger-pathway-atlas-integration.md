# Finger Pathway Atlas V3 — historical website integration

This records the original V3 integration. V4 now occupies the production atlas route; see `finger-pathway-atlas-v4.md` for the current implementation. The original V3 viewer remains available under `v3-viewer`.

The supplied V3 anatomical atlas is integrated at `/simulations/finger-pathway-atlas/`, with the full-size comparison plates and original reference figures at `/simulations/finger-pathway-atlas/references/`.

## Imported material

- 86 source anatomical meshes and 10 human tracing sources.
- 50 supplied comparison plates, 42 original figures, and all source/provenance records.
- The original self-contained HTML is available as an offline download, byte for byte.

`scripts/import-finger-atlas.py <atlas.html> <comparison-packet.zip>` reproduces the imported files and gallery metadata. Pillow creates only the gallery thumbnails. The original figures, plates and compressed anatomy are unchanged; their SHA-256 values are tracked in `asset-integrity.json`. The application scripts were separated from the HTML, and the embedded base64 gzip anatomy became two binary requests reassembled before decompression. The original HTML download is reconstructed from three binary parts. This keeps uploads below the connector's request size limit; checksum verification proves both reconstructed files match their supplied bytes. The geometry-generating algorithms and source coordinates were not edited.

The embedded viewer keeps the supplied dark anatomical presentation and controls. The surrounding pages use the existing website layout and theme. Gallery region/search filtering, an accessible native image dialog, original-figure links, full-plate downloads, and links to corresponding 3D regions are included. Both pages appear in site search; the launcher includes the atlas.

## Scope

This integration preserves **V3**, rather than claiming the V4 anatomy development is complete. Pathways and noncortical microanatomy remain constructed examples; cortical source cells are human temporal/frontal traces, not measured finger S1/M1 cells. There is no electrical or biomechanics solver. The supplied species, tissue, modality, independent-magnification notice, model comparison notes, and source reuse notices are retained.

The original PDF and ZIP exceed the static host's 25 MiB per-file ceiling, so their component plates, figures and provenance are published individually. No oversized PDF or ZIP is added to the deployment. Every deployed atlas asset is below that limit.

## Verification

The atlas smoke check executes the imported engine and generators without a renderer, checks all 15 view definitions and 11 distinct geometry scenes for finite positions and valid indices, checks 1:20 / 1:30 / 1:40 sampling counts, validates every imported asset hash and reference mapping, and checks the production route/search artifacts. It does not establish biological validity or substitute for WebGL/browser testing.

Local results: `npm run build` passed all 160 existing tests and generated 456 pages. `node scripts/verify-finger-atlas.mjs --build` passed, checking 1,014 scene objects and 4,266,810 unique geometry vertices including every source-cell morphology and each cortex detail setting. `node scripts/verify-cortex-build.mjs` also passed. Interactive browser QA was unavailable in this managed environment.
