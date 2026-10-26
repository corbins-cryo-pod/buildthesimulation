# Peripheral Nerve Laboratory — first remake

Date: 2026-10-25. Model version: 1.0.0.

Routes:
- `/simulations/peripheral-nerve/` — new laboratory.
- `/simulations/peripheral-nerve/methods/` — equations, parameter provenance, evidence and limitations.
- `/sim/` — historical original. Its page, libraries and tests are unchanged.

The simulations directory now names the historical entry “The First Simulation · Peripheral nerve cross-section.” The new page includes a dedicated link back to it. No original route is redirected and no legacy document is silently migrated to the new physical model.

## Implemented

Seven fascicles and 168 seeded representative myelinated fibers; selectable transverse section and longitudinal scene; directional, bipolar-ring, tripolar-ring and intrafascicular contact experiments; a homogeneous anisotropic softened finite-source field; a passive sealed nodal cable; replay of computed polarization; baseline comparisons; versioned JSON restoration and node-by-time CSV export. Copy/paste JSON supports browsers that restrict downloads. Three.js is loaded only for the scene, with an automatic SVG projection when WebGL is unavailable.

The conductor does not resolve fascicle boundaries, perineurium or cuff insulation. The cable has no active channels and produces no action potentials, recruitment thresholds or extracellular recordings. The source core is fixed at 25 µm; near-contact results are softened. The detailed public methods page is the model specification.

## Verification

- `node --test tests/peripheral-nerve.mjs`: 15 passed.
- `npm test`: 770 passed, 2 skipped, 0 failures (772 total).
- `npx astro build`: 527 pages generated successfully in the first build.
- The numerical suite compares the field against an analytically integrated ring source, and the cable against an independent continuous-time cosine-mode solution. It also checks exact pulse integration, current conservation, gauge invariance, scaling, non-overlap, containment, parameter bounds and document round-trips.
- `preset-refinement.json` records default-vs-refined peak polarization for the four presets. All four differ by less than 1%. This does not establish convergence over the entire parameter space or biological calibration.
- Browser checks: presets; selected fibers; replay; draft/applied-state distinction; pinning; current doubling (0.452 → 0.905 mV for the initial fiber); field-color switching; automatic 2D fallback; 390 and 768 px iframe layouts with no horizontal overflow and collapsed controls; light and dark presentation.
- Cloud browser WebGL is disabled. The WebGL renderer builds, but visual and interaction QA of the 3D canvas remains unverified in this environment. Native blob download attempts were rejected by the cloud browser; numerical serialization is tested and the explicit text export/import path was verified in the browser (show JSON → edit current → restore → recalculate).

## Code ownership

`src/lib/peripheral-nerve/model.js` contains the pure numerical model, geometry, pulse and document contract. `scene.js` owns the Three.js view. The Preact component owns browser interaction, SVG views and charts. Tests import the pure model without a browser.

## Next scientific stage

Introduce and verify a heterogeneous nerve/cuff field solver before interpreting fascicle selectivity. Add a published mammalian myelinated axon model with independent threshold and propagation checks, then derive recordings from transmembrane currents. Preserve this passive model as a diagnostic control and the original `/sim/` as the historical first simulation.
