# Reviewed neural growth laboratories

Revision: 2026-11-03. This is an exploratory simulation release, not a clinically or independently biologically validated predictor.

## Two independent additions

- `/simulations/neuron-growth/`: **Cell Behavior Laboratory · V3**. The original coverslip canvas, deformable soma, growth, presets, and simplified electrical-network model remain. The seven scientific engine files are byte-identical to the uploaded V3. Worker idle polling and the surrounding interface were adjusted, not the growth equations.
- `/simulations/neural-tissue/`: **Tissue Growth & Nerve Repair · V4.1**. Separate surfaces, 3-D gels and conduits. It does not replace V3 or the site's existing Cell Growth, Soft Neural Generator, or Nerve Regeneration laboratories.

Both use the site's native compact Layout, navigation, manual-style typography, a wide workspace, full-window link, evidence notes and responsive controls. The microscope canvases retain their dark scientific palettes. No font binaries are included; optional font URLs refer to fonts already owned by the website.

## Scientific and reporting corrections

1. **Lundborg comparison.** Both proximal and distal stumps were present in the cited 10 mm condition that regenerated. The model's original 0/40 crossing result is now a mismatch, not an expected success. The 8 mm example is not scored as an exact gap-condition match. Matching a gap length is still not matching the complete experimental protocol, endpoint, observation time or uncertainty. DOI: 10.1016/0014-4886(82)90215-1; PMID 7095058.
2. **Raw measurements.** Current Schwann-front positions and bridge state are no longer overwritten by historical maxima. The eight-millimetre archived recording retains 13 true-to-false density-bin bridge transitions. These are threshold-measurement reversals, not proof of physical bridge destruction. Historical maxima, first bridge time and ever-formed status are separately labelled and exported.
3. **Exact local kinetics.** Source and decay have analytic exponential updates around implicit diffusion. The isolated 75-minute decay with a 30-minute time constant now agrees with `exp(-75/30)` (0.082085), rather than the old 0.285714. This is a local numerical result, not a quantified whole-model error estimate.
4. **Field/reaction substeps.** The coupled engine splits field batches into at most five-minute substeps, updates time-dependent source scaling at midpoint, and uses a bounded analytic fibrin accumulation rule. Cells and mechanics are not subcycled together with these fields. Full coupled convergence remains outstanding.
5. **Population capacity.** Dead cells free living-population capacity. A separate allocation limit protects memory and stable IDs. This does not implement biological cell replacement automatically; a specified division or spawning mechanism must create a new agent.
6. **Evidence categories.** Author-selected calibration bands are not experimental confidence intervals. Day-4 and day-7 hippocampal targets are evaluated independently. Fresh graft, pre-degenerated graft and crush conditions are not merged into one acceptance interval. The graft front90 fit is labelled a different endpoint from a sensory pinch test.
7. **Input handling.** Invalid calibration keys, missing sample days and invalid fitted-parameter ranges fail clearly. V4 rejects unknown/non-finite engine parameters and invalid live seeds.

## Recordings and rendering

Eight original recordings remain unchanged and visibly labelled **archived original V4**. Four fresh recordings (soft gel, stiff gel, gel surface, seven-day coverslip) carry model revision `neurotissue-v4.1-review-2026-11-03`. The four long conduit/graft recordings have NOT been regenerated with the corrected coupled solver. Their outcomes must not be attributed to V4.1.

The HTML loads each binary recording on demand instead of embedding roughly 32 MB into the initial page. A real 3-D-coordinate Canvas projection keeps playback and live simulations available when WebGL cannot initialize. It deliberately lacks depth occlusion and field-volume rendering; unavailable controls are disabled. The original WebGL path remains available but was not successfully exercised in this environment.

## Executed verification

- **46 numerical/data-integrity assertions passed, zero failed.** This includes all 15 V3 presets and four V4 scenario classes in short finite-state checks, seeded reproducibility, exact decay/source checks, conservation, positivity, temporal and spatial diffusion-refinement checks, capacity handling, benchmark classification, measurement immutability, recording decoding and calibration rejection.
- **42 Chromium browser checks passed, zero failed.** V3 preset changes and two-day fast-forward; 390 px layouts; all twelve V4 recordings; raw bridge reversals; timeline playback and scrubbing; measurement export; camera presets; invalid seed handling; live worker progress, pause and return to recordings. No script exceptions in tested desktop/mobile layouts.
- Browser tests used actual built application HTML and locally fulfilled file responses. They did not run the complete native Astro site. WebGL, Safari, physical phones, and full coupled tissue-model convergence are not verified.
- Machine-readable reports are included in the source bundle; browser screenshots are retained separately with the review artifacts. Passing software checks is not biological validation.

Commands from the repository root:

```sh
python3 tools/build-reviewed-growth-labs.py
node tools/register-reviewed-growth-labs.mjs
node tests/neural-growth/verify.cjs
python3 tests/neural-growth/browser.py  # requires Python Playwright and Chromium
npm test
npm run build
```

The last two commands require the complete website checkout; they were not executed in the isolated local overlay. The repository import workflow runs them before merging.

## Primary references

- Dotti CH, Sullivan CA, Banker GA (1988). The establishment of polarity by hippocampal neurons in culture. DOI 10.1523/JNEUROSCI.08-04-01454.1988. https://pubmed.ncbi.nlm.nih.gov/3282038/
- Lundborg G et al. (1982). Nerve regeneration in silicone chambers: influence of gap length and of distal stump components. DOI 10.1016/0014-4886(82)90215-1. https://pubmed.ncbi.nlm.nih.gov/7095058/
- Balgude AP et al. (2001). Agarose gel stiffness determines rate of DRG neurite extension in 3D cultures. DOI 10.1016/S0142-9612(00)00350-1. https://pubmed.ncbi.nlm.nih.gov/11352088/
- Holmquist B et al. (1993). A mathematical model for regeneration rate and initial delay following surgical repair of peripheral nerves. DOI 10.1016/S0165-0270(05)80004-4. https://pubmed.ncbi.nlm.nih.gov/8377520/
- Danielsen N et al. (1994). Pre-degenerated nerve grafts enhance regeneration by shortening the initial delay period. DOI 10.1016/0006-8993(94)90779-X. https://pubmed.ncbi.nlm.nih.gov/7882035/

The reference list does not certify every inherited model parameter. Approximate digitization and mechanistic assumptions remain disclosed as calibration or hypotheses. Vascular guidance, remyelination, reliable conduction and functional recovery are not established by this release.
