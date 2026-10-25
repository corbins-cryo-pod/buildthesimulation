# Optogenetics Laboratory — review edition 0.3

Open **optogenetics-laboratory.html** in a full desktop browser. The file contains all code, cell data, optical kernel and inline worker sources. No network resources or installation are required for the application. Attachment previews may block JavaScript/workers. The default workspace is the new Expanded Laboratory; calculation begins only after Calculate.

**Not published or pushed to GitHub.** This is a locally saved review build, continuing the supplied v0.2 package rather than replacing its neuron model.

## New executable workspaces and capabilities

- Source-equation ChR2 plus explicitly reduced Chronos-like, ChrimsonR-like and GtACR2-like options; editable kinetics, spectral weighting and color cross-activation hypotheses.
- Chloride Nernst reversal, dynamic compartment pools, somatic/axonal initial gradients, fixed-reservoir alternative, concentration recovery, localization and matched dark/current-drive comparisons.
- Movable finite rectangular microLEDs with per-site power, wavelength, size, orientation and efficiency; optical/electrical/device-loss accounting.
- One to eight independent reconstructed-cell copies, deterministic layouts, per-cell expression and opsin selection, synchronized traces and raster.
- A 3-D homogeneous heat-diffusion/perfusion solver with absorbed-light and electrical-loss sources and an energy ledger. Temperature is diagnostic only and does not feed back into firing.
- Local device/config import, explicit Designer electrode-to-emitter conversion, cleanroom recipe provenance, JSON/CSV export.

The original neuron experiment, H134R channel assay, response map and source evidence remain available. The new review defaults use 34 °C native mechanisms, not generic replacement neurons. No synapses or new specimen diversity are claimed.

## Start reviewing

Choose the chloride preset, Calculate, and compare the solid light-trial voltage with the dashed matched dark control. Inspect local Cl and ECl during and after illumination. Select the high-chloride challenge to explore a different declared expression/gradient experiment; it is not a one-variable comparison with the default.

Choose Three-site microLED probe or Four-cell optical selectivity, Calculate, then inspect individual emitters/cells and the synchronized light, voltage, photocurrent and temperature views. Open the heat ledger to inspect energy accounting and the unresolved-hotspot warning.

Use Preview sample designer layout, select contacts and explicitly convert them. No electrode silently becomes a light source. Apply a native device JSON to use independently specified optical properties. Eight runnable experiment files and import examples are in `examples/phase3/`.

## Evidence and limitations

Read **REVIEW.md**, **docs/ADVANCED_MODELS.md**, and **docs/IMPORT_CONTRACT.md**. The added opsins are exploratory surrogates, not experimentally fitted replacements for the original Williams H134R model. MicroLED optics are finite Lambertian direct-light approximations, not a new Monte Carlo solution. Hotspot temperature is strongly spatial-resolution dependent. Heat does not alter electrophysiology. Population cells are independent copies. Cleanroom recipes are archived, not converted into fabricated optical/thermal properties.

## Build and verify

No npm dependencies are required for the application or Node tests. Use Node 22+ and Python 3 for building. SciPy and Playwright/system Chromium are needed only for regenerating references/browser QA.

```sh
python3 tools/build.py
python3 tools/build-check.py
npm test
python3 tools/verify-advanced-reference.py
node tools/verify-thermal.mjs
node tools/run-advanced-demos.mjs
python3 tools/browser-advanced.py --part core
python3 tools/browser-advanced.py --part connections
python3 tools/browser-advanced.py --part population
```

Each demo executes in a fresh Node process, matching the fresh-worker browser architecture. The tests use retained independent numerical fixtures; rebuilding those fixtures does not require neuron fitting or external datasets. Historical v0.2 reference generators remain under tools, separately scoped from v0.3 additions. Actual executed results are in `validation/phase3/`.

## Files

`src/advanced/` contains the new engine, chloride, opsin, optical, thermal, import, plotting and workspace modules. `src/simulation.js` retains the original solver and now exposes its conditioning routine. `src/scene.js` adds multi-soma and finite-emitter rendering without changing electrical geometry. `tools/build.py` creates the standalone HTML and validates no font programs are embedded. `site/public/simulations/optogenetics/index.html` is a copy for later integration, not a deployed page.

The Allen model and derived mechanisms retain the full Allen Institute license, including its noncommercial redistribution condition, in `docs/LICENSE-Allen.txt`. No font binaries are bundled. System font fallbacks preserve the ivory/graphite technical-document styling.
