# BuildTheSimulation — Optogenetics Laboratory
## Review edition 0.2.0 · 24 October 2026

**Start here:** open `optogenetics-laboratory.html` in a full desktop browser. It contains the application, real reconstructed-cell geometry, fitted membrane parameters, optical kernel, solver, and worker code. No server, account, package installation, CDN, or network resource is needed to run it. Some attachment previewers do not execute JavaScript or Blob workers; use the downloaded file in a full browser rather than an attachment preview.

**Publication status:** review package only. Nothing has been pushed, merged, deployed, or changed on GitHub or Cloudflare. The proposed route is `/simulations/optogenetics/`. `site/public/simulations/optogenetics/index.html` is a staging copy, not evidence of a live route.

This edition continues a recovered earlier numerical build; it does not replace the existing Cortex Laboratory. The biological interpretation remains provisional even where numerical tests pass.

## Try these experiments

**Follow the default train.** The starting setup runs automatically: whole-cell ChR2(H134R), 0.35 mS/cm² assumed expression, uniform 1 mW/mm², three 5 ms pulses at 20 Hz, 250 ms recording. The current default is a 0.005 ms integration step and 40 µm maximum segment length. In the recorded regression this produces three somatic events, one in each association window. Play the trace, select a branch, and switch between voltage, light, effective opening, and expression. Light can be off while photocurrent and depolarization persist; these are calculated channel dynamics, not a replay error.

**Compare expression.** Pin the baseline; select `Apical dendrites only`, `Soma only`, `Basal dendrites only`, or select a compartment and press `Express this section`. Run again. Changing a parameter clears the old active result but retains the pinned soma/patch baseline. The baseline comparison is a soma/patch trace; it does not claim a correspondence between different branch meshes.

**Position the fiber.** Choose `Fiber aimed at soma`, adjust aim, distance, azimuth, and elevation, and inspect `Local light field`. Click a compartment and press `Aim fiber at this compartment`. `Match here to ...` changes emitted power to match the stored uniform-light reference at that compartment only. It does not equalize total illuminated area or the other branches. The dashed cone is a positioning guide; the colored field and electrical solver use the same Monte Carlo sampling function.

**Inspect the channel alone.** Open `Channel assay`. Choose a sustained step or paired pulses. The ideal isopotential patch has the source soma area, 843.356 µm², but no native membrane channels or dendritic cable. View the current, fixed voltage, and C₁/O₁/O₂/C₂/p occupancy at the shared time cursor. This is not a perfectly space-clamped branched neuron.

**Build a response map.** Set the desired neuronal expression and numerical settings in the neuron workspace, then open `Response map`. Enter comma-separated exposure levels and pulse widths. Every cell is a full independent neuron calculation, with uniform light, one pulse at 20 ms, and at least 50 ms after pulse offset. Select a completed cell to open its actual recorded traces. The map counts post-onset soma events, not a stochastic spike probability. The map is limited to 16 trials and 64 MiB of estimated recording arrays.

**Save your experiment.** `Save setup` writes a configuration with model provenance. `Load setup` validates it and never imports executable code. `Export traces · CSV` writes all saved frames for the soma, selected compartment, and whole-cell photocurrent. `Export result · JSON` also includes full compartment arrays and geometry. The array layout is frame-major: `frame * n + compartment`.

## What is implemented

One human temporal layer-2 spiny cell, specimen 571654895; two source meshes; nine active native channel mechanisms plus calcium dynamics and leak; the Williams ChR2(H134R) state model; uniform illumination; one fixed 100 µm-core, NA 0.22, 470 nm fiber kernel; independently selectable illumination and expression; single/paired/train/step protocols; full replay and inspection; baseline comparison; response maps; deterministic exports; light/dark themes and mobile controls.

The published morphology's dendrites are retained. The source-prescribed **60 µm synthetic axon stub** remains explicitly distinguished from reconstructed biological anatomy. No simplified substitute neuron, scripted action-potential waveform, or binary “light means spike” rule is used.

## Scientific boundaries

The app is a computational research/learning review, not a calibrated optical threshold predictor or a biological safety tool. Expression density is assumed. The channel fit is used outside its characterization voltage range during this neuron's resting state and spikes. Scalar tissue fluence is mapped to the channel's calibrated optical input under an explicit transfer assumption. The recovered photon transport generator and raw independent seed tallies were not recovered; a newly reproduced MCX comparison is **not** claimed.

The finer mesh changes the timing and waveform in the checked single-pulse case. Passing probability conservation, KCL, independent channel integration, and matrix-solver checks does not establish full model convergence or experimental validity. See `REVIEW.md` and `docs/SCIENCE.md`.

Other opsins, inhibition/chloride, microLEDs, multiple emitters, connected populations, heating, electrode artifacts, extracellular recordings, feedback control, two-photon optics, and digital-cleanroom imports are not implemented in this edition. Unsupported source geometries and wavelengths are rejected rather than silently treated as a fiber.

## Source and reproduction

The delivered HTML is generated from readable modules; it is not the sole copy of the implementation.

```sh
# No JavaScript package installation is required.
node --test tests/*.test.mjs
python3 tools/build.py

# Independent reference checks require the supplied Python environment pins.
python3 -m pip install -r requirements-validation.txt
python3 tools/reference_opsin.py
node --test tests/reference.test.mjs
node tools/cable_fixtures.mjs
python3 tools/reference_cable.py
node tools/refinement.mjs

# A system Chromium executable must be available for these browser checks.
python3 tools/browser_regression.py --part core
python3 tools/browser_regression.py --part map
python3 tools/browser_regression.py --part mobile
python3 tools/browser_startup.py
```

Tests were run using Node 22.16.0 and Python 3.13.5 in the review environment. The browser tests use real Chromium with `set_content` and an inline Blob worker because direct file/HTTP navigation is administratively restricted in that environment. File launching on every operating system, Safari, Firefox, and an actual iPhone are not covered by these Chromium checks.

`src/` contains the application and new optogenetic engine; `vendor/cortex/` contains the recovered native-channel/cable implementation; `data/` contains the bundled model; `examples/` contains reloadable setups; `validation/` contains actual current results and clearly named archival reports; `docs/` contains equations, provenance, license, and integration instructions; `previews/` contains screenshots from the working application.

The Allen-derived material has a noncommercial redistribution condition; see `docs/LICENSE-Allen.txt`. No font binaries are bundled. Installed C059/Century Schoolbook and URW Gothic are requested through CSS `local()`, with system serif/sans fallbacks. The site can supply its existing typography during later integration without adding font files to this review package.
