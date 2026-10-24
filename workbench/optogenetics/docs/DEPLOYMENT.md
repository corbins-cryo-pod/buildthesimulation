# Website integration

Route: /simulations/optogenetics/
Source baseline: review edition 0.2.0, 24 October 2026.
The original review reports describe pre-integration checks, not deployment evidence.

Rebuild with `python3 workbench/optogenetics/tools/build.py`, then copy
`workbench/optogenetics/optogenetics-laboratory.html` to
`public/simulations/optogenetics/index.html`.
Run `node --test workbench/optogenetics/tests/*.test.mjs`.

Integration reran all 46 package tests successfully. The application retains
its inline Blob worker and self-contained assets. Safari, Firefox and physical
iPhone behavior remain unverified. Numerical and biological limits in REVIEW.md
remain applicable. Website navigation was added; solver inputs are unchanged.

## Integration verification — 24 October 2026

- Re-ran all 46 package tests: passed.
- Rebuilt HTML and compared it byte-for-byte with the public entry point: passed.
- Chromium preview completed the actual inline-Worker default calculation:
  3 somatic spikes, 3/3 exactly-one pulse associations, 0 extra events,
  first-pulse latency 5.96 ms, peak inward photocurrent 1.532 nA.
- CSV download completed and baseline pinning displayed the retained recording.
- Added a dedicated GitHub workflow for package tests and source/HTML parity.
- Prior package browser checks are retained as historical evidence; phone/tablet,
  Safari and Firefox were not re-tested during website integration.
- Full site checks and Cloudflare publication are tracked by the release PR;
  this file does not claim deployment before its terminal status is available.
