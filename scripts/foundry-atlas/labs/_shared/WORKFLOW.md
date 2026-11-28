# Native Foundry workflow playback

The workflows are offline single-file apps. The shared player is embedded by each build, not fetched from a network. All step changes must use that lab's native stage/state machinery so visual playback and exported evidence agree. The player should not infer a new scientific step, skip an uncommitted operation, or convert simulated acceptance to physical qualification.

The acquisition/inspection models and evidence notes stay with the individual lab sources. This helper handles only the 1.3 s clock, Play/Pause/Replay state, progress reading, visibility changes and manual interruption. The same discrete stage order applies under reduced motion, without transition effects. Manual inspection or changes always pause playback. A lab may replay existing saved choices rather than resetting its experiment (Flex-rigid ECoG does so).

## Rebuild exact standalone app outputs

Run these from the repository root. Rebuild to temporary files first and compare before updating a public app:

    python scripts/foundry-atlas/labs/graphene-stack-compare/build.py --out /tmp/graphene-playback.html
    python scripts/foundry-atlas/labs/mesh-electronics/build.py --repo . --out /tmp/mesh-playback.html
    python scripts/foundry-atlas/labs/ptnrgrid/build.py /tmp/ptnrgrid-playback.html
    python scripts/foundry-atlas/labs/flex-rigid-ecog/rebuild-playback.py /tmp/flex-ecog-playback.html

The ECoG build is a checked transformation of its original Git-pinned standalone bundle, because the original source was not committed to this repository. Do not replace the deployable HTML with an older offline copy: rerun the injector using the baseline, or use a compatible new export with the explicit --source argument. If a new export changes its stage controller anchors, port the adapter before replacing the file. The injector refuses unknown versions rather than making a page with missing playback.

The optional actual-route browser suite runs with Python/Playwright and Playwright’s Chromium, or a local Chromium with CHROMIUM_BIN set:

    python scripts/foundry-atlas/labs/_shared/test-workflow-play.py

It serves the public files locally and uses the Playwright clock to test playback without sixteen real interactions. It checks all four labs at desktop, touch and narrow widths. Touch emulation is not physical Safari. No remote resources or feature telemetry depart a playing lab.

## Cleanroom walkthrough

Each native workflow remains the process and playback authority. The shared browser module at
`public/simulations/foundry/cleanroom-player.js` renders the workpiece transfer, load, setup, run and
unload using normalized phase progress. It never advances or assigns a manufacturing recipe.
`cleanroom-models.js` lists existing Equipment Register geometry and the subset with bounded
dry-handling paths. Keep explicit workpiece shape and size distinct from a fixture's demonstration
defaults. A mismatch is a hold, not an insertion. A display-only cabinet can be inspected without
asserting what the inside or actual load path looks like. Physical geometry and derived cross-sections
remain independent of the native lab's engineering results.

Use the three explicit layer/artifact data modules and the native phase keys for alternate routes.
The retinal annotations are regenerated with `node scripts/foundry-atlas/labs/_shared/build-cleanroom-evidence.cjs`.
Run `python scripts/foundry-atlas/update_lab_ledger.py` after generating the public HTML.
The browser smoke test is `python scripts/foundry-atlas/tests/cleanroom.browser.py --include-benches`
(use `CHROME_BIN` if Chromium is not installed in Playwright's default cache).
Run the Foundry Node checks, including `tests/foundry-cleanroom.mjs`, before publication.
