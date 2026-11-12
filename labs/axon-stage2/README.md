> Historical component preview. The coupled checkpoint now lives at `/simulations/biohybrid-axon-interface/stage2/`; current status is in `docs/axon-interface/stage2/STATUS.md`. Statements below describe the recovered component-only snapshot.

# Biohybrid Axon-Resolution Laboratory — Stage 2 component increment

**Status: working local component preview; Stage 2 is not complete. Not pushed or deployed.**

Open `biohybrid-stage2-preview.html` in a full browser. It is self-contained; computations run in a cancellable worker and need no network. The application offers selectivity-table auditing, a microcoil field/energy assay, photon transport, a four-state ChR2 voltage-clamp assay, and explicitly hypothetical spectral-overlap examples. No new optical or magnetic axon recruitment is claimed.

For the modular application:

```sh
npm run serve
# Open http://localhost:8765/simulations/biohybrid-axon-interface/stage2/workbench.html
```

## Reproduce component checks

Node22+ and Python with NumPy2.3.5, SciPy1.17.0, SymPy1.14.0 are the recorded environment. `reference/requirements.txt` pins the numerical Python dependencies. The code has no runtime npm dependencies.

```sh
npm test
node scripts/reference-fixtures.mjs
python3 reference/verify.py
node scripts/validate.mjs --browser
python3 scripts/build-standalone.py
```

The component tests and independent comparisons are intentionally separate from a coupled neural release. Read `docs/METHODS.md`, `docs/QUESTIONS.md`, `docs/acceptance.json`, `docs/parameter-register.json`, and `reports/validation.json`.

## Integrate without overwriting Stage1

The overlay is additive. It is intended for the Stage1 reviewed branch at90ff250, not an unrelated branch that lacks those sources.

```sh
python3 scripts/apply-overlay.py /path/to/buildthesimulation
python3 scripts/apply-overlay.py /path/to/buildthesimulation --apply
# In that repository, run its existing test/build commands and review the new route.
```

This checks the pinned membrane blob and refuses to overwrite nonidentical files. No Git commit, push, merge, permission change or deployment is performed. The native Astro wrapper is supplied, but a full repository build and hosted preview were **not** possible in this read-only session. The component's self-contained HTML browser tests (loaded in memory because this execution browser blocks localhost and file navigation) are the executed browser evidence.

Planned new route: `/simulations/biohybrid-axon-interface/stage2/`. The verified Stage1 landing page and methods are not modified. The package does not include the full repository or redistribute its fonts.

## What still blocks a completed Stage2

Couple the new drives to the same37°C bipolar membrane equations; execute all modality-specific matched interventions; compare propagated spikes and finite amplitude sweeps; verify tissue-corrected induction fields and membrane-surface photon estimators; quantify stochastic threshold uncertainty; run independent native membrane references; and pass the site build and hosted-browser checks. Stage3 biological growth and survival have not begun.

Build helpers use `mistune` to render the included methods and `playwright` with an installed Chromium executable for optional UI checks. No browser security policies were changed. The test script loads the delivered HTML via `page.set_content` and exercises real inputs, worker computation and downloads. It does not inject simulation outputs.
