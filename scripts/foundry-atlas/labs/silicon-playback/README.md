# Native playback for four Foundry labs

**Integration:** Copy each `out/<slug>/index.html` to `public/simulations/<slug>/index.html`. The input files match the unmodified files of the 4edaf79 base and the public deployed HTML consulted for this task. No checkout or remote writes were performed in this lane.

Alternatively, point the exact-anchor builder at a clean site's public simulations directory and use a separate output directory:

```sh
python build.py --source /path/to/repo/public/simulations --output /path/to/staging
```

The build adds only a standalone CSS block, before-stage playback controls, and a trailing player script. It does not recompile or modify the embedded native model. If an anchor has changed or an existing player is present it refuses to silently overwrite. No runtime package is needed.

| Lab | What playback does | Completion |
| --- | --- | --- |
| Utah Array Fabrication | Runs the next enabled native station action in order, including intermediate proposals, comparison, release and transfer. Stops if the active comparison case is blocked. No claim beyond authored geometry and symbolic identities. | Five stations, unchanged r6 exact inspection |
| Neuropixels 1.0 Foundry | Native witness preview, dwell and commit for each of 19 stations, then the native synthetic capture. No shortcut or alternate data. | 20 stages, real application ZIP of process and same-seed ideal control |
| Masmanidis 64D Foundry | Native witness preview, dwell and commit for each of 17 stations, then the native synthetic bench test. Leaves the current field and settings intact while playing. | 18 stages, unchanged native capture and ZIP |
| Neuropixels Family Routing | Visits the selected instrument, allocation check, existing fault, tagged fixture test and native output. It does not change the user's model, site/window, count, fault type, or shank. A rejected or unspecified selection does not advance into a fabricated result. | Five traceable views and normal native output export |

Play is opt-in. Pause clears the timer. A genuine manual interaction with native UI pauses before the event is delivered, without swallowing the interaction. Resume follows the new native state. Playback pauses when the page is hidden and skips visual animation with reduced motion; the same stage order remains. Replay preserves a family setup; the three process lanes ask before replacing manually edited work. Downloads are only invoked manually. On phones the active controls remain available during playback as a sticky box, and links open the current or completed native view.

## Browser verification

The checks use the generated HTML rather than a model of the wrong page, and validate the ordered action log and real native outputs. `CHROMIUM_PATH=/path/to/chrome python tests/smoke.py` serves the staged routes from a loopback server (desktop and emulated iPhone with reduced motion). This advances the browser clock for the real dwell timers and checks no automatic start, pause/hold/resume, manual event interruption, replay confirmation, all ordered native stages, the native download content, no horizontal overflow, and no external requests or page errors.

`CHROMIUM_PATH=/path/to/chrome python tests/guards.py` opens the downloaded HTML directly, checks four blocked paths (an invalid die, an invalid field, routing collision/unspecified fault, and an overlapping Utah label case), and verifies no replacement of the selected configuration. Browser automation does not stand in for a physical Safari or VR headset test.
