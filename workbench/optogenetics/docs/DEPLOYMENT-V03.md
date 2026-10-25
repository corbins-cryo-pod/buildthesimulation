# Optogenetics 0.3 website integration

Route: `/simulations/optogenetics/`. Prepared from the reviewed v0.3 source on top of main commit 836b9e38323137a26e2ecdf79b2b5dee22b27e93. Existing website navigation and all earlier workspaces are retained. No font programs or external dependencies are added.

Rebuild: `python3 workbench/optogenetics/tools/build.py`; then copy the generated HTML to `public/simulations/optogenetics/index.html`. Test: `node --test workbench/optogenetics/tests/*.test.mjs`.

Local deployment checks re-executed: 100/100 Node tests; Chromium expanded-laboratory core workflow including actual chloride solve, matched dark control, trace exports, setup import, rejected invalid input, and cancellation/restart. Review reports remain historical evidence; production status must be verified separately.

Additional opsins remain reduced exploratory models. MicroLED optics are approximate. Populations are independent copies, not circuits. Thermal hotspots are not mesh-converged, and temperature does not feed back into electrophysiology. Cleanroom imports are provenance-only.
