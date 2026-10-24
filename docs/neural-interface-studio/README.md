# Neural Interface Studio v2 reconstruction

Route: `/simulations/neural-interface-studio/` (release candidate verified; production deployment recorded in PR #335).

The original Studio source could not be recovered. `recovered-project-v1.json`
is the surviving unmodified project export with six historical run records.
Version 2 is a new implementation; the prior report of 74 passing tests is not
validation of this implementation.

The Studio supports nine editable examples, arbitrary bounded layouts through
JSON, process stages and recipe controls, raster continuity/isolation/exposure,
a finite-volume sheet-resistance solve, recorded runs, project import/export,
local browser saves and conductor SVG export. Model equations and limitations
are documented in the methods page. This is an educational model without
measured cleanroom calibration or implant-performance prediction.

## Verification, 2026-10-24

- 19 dedicated model checks pass, including independent rectangular resistance,
  geometry-based faults, parameter scaling, stage ordering, resolution comparison,
  v1 import, v2 round trip and bounded invalid inputs.
- `npm run build` completed, including the full repository test suite and asset
  exports. The suite reports 627 tests, 626 passes, zero failures, one skipped.
- An earlier suite attempt overlapped replacement of a dependency symlink and
  failed to resolve `three` in four existing tests. After a clean local dependency
  installation, the complete suite and build were rerun successfully.
- Browser preview verified 13.664 ohm reference results on all four channels;
  bridge diagnosis shorts N02/N03 and suppresses their independent resistances;
  run recording and browser save display success; project JSON download produces
  a nonempty 15,123-byte file.
- SVG browser download timed out twice. The download helper was changed to attach
  the download anchor and retain its object URL longer, but the fix has not yet
  been verified in the browser.
- The browser's recovered-project file chooser stalled and was interrupted.
  Automated parser validation passes; browser import remains unverified.
- Responsive phone/tablet checks and final production verification remain pending.

The 4 micrometre grid quantizes the reference's 12 micrometre trace to 16
micrometres, yielding 10.309 ohm instead of 13.664 ohm at 2 micrometres. The UI
warns about this. The 1 micrometre reference agrees with 2 micrometres within
0.5%; arbitrary designs need their own refinement checks.

## Release verification follow-up, 2026-10-24

- Re-ran all 19 Studio tests successfully (zero failures).
- Both GitHub verification workflows passed for 901f25c; Cloudflare preview deployed.
- Preview reference run reproduced 13.664 ohms on all four channels.
- Conductor SVG download succeeded with the patched helper.
- Browser import of the preserved v1 project succeeded, retaining all six historical
  reports and restoring the covered-contact recipe.
- Responsive CSS reviewed: one-column workspace at 900 px, stacked views and
  toolbar at 560 px, bounded horizontally scrolling result tables. This browser
  API does not expose viewport resizing; phone/tablet visual and physical-device
  checks remain unverified, not counted as passed.
- User explicitly requested website deployment after the draft status review.
  Remaining device QA is recorded as a release limitation.

The previously published Microfabrication Laboratory is unchanged.
