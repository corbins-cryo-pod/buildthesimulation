# Neuropixels family: the routing bench

**Deployable file:** `index.html`, one static, self-contained page (zero dependencies, fonts, analytics, fetches or hardware connections). Copy to `public/simulations/neuropixels-family/index.html`. The artifact is not a website deployment.

**Why a second lab:** The existing Neuropixels 1.0 foundry follows the wafer through a modeled AP/LFP signal. This optional family-wide instrument instead answers which selections can share simultaneous readouts, which claims are actually supported, and how digital faults differ. It links back to the appropriate fabrication traveler and the 1.0 foundry.

## Reproducible experiments

1. **Sites versus readout lines.** Compare original 1.0 sites 0 and 384. They cannot both have distinct lines. Replace 384 with 385 and the nominal map passes. Select bank 0, open physical site 0 and run, then select bank 1 without changing that fault: the missing word disappears. Dropping output line 0 instead affects both banks. The original 1.0 equation here is for nominal routing, not a guarantee that every reference position records biological signal.
2. **One count budget is insufficient.** Use the fixed-vs-shared shortcut: request 385, 383, 384 and 384. Quad Base rejects this even though the total is 1,536. Move the same request to NXT: it clears the published count bounds but is not certified address-routable. NXT does not output fabricated site IDs.
3. **A constant readout count can change axial coverage.** Try the four published 6,144-site Ultra footprints. Every pattern has 384 nominal sites. The 48-row and 384-row cases span 282 and 2,298 µm between end-row centers, calculated as (rows − 1) × 6 µm. These are not the nominal row-count × pitch or a measured neural volume.
4. **Four-shank geometry.** On 2.0 alpha, compare the same-depth four-ribbon and diagonal patterns or one complete 384-site group on one shank. On the diagonal pattern a synthetic shank-2 disconnection loses 96 words.
5. **Identity is different from packet count.** Swap the first two selected outputs. All packets arrive; two destination tags mismatch. The CSV records one row per requested input. A JSON file also records the model, evidence level, exact configuration, sources, injected fault and result.
6. **Optical addresses are not readout channels.** Toggling among the 14 positions at 450 and 638 nm in the Opto model leaves the electrical 384-channel budget unchanged. No light propagation or tissue outcome is simulated.

## Contract

- 9 revision-specific instruments: original 1.0; 2.0 alpha single and four; Ultra study revision; NHP 25 and 45 mm; Quad Base; NXT four-shank prototype; Opto.
- 31 selectable model/mode pairs, including free site/range selections, free per-shank counts, counterexamples, and color/emitter controls.
- A nominal 1.0 line check, an article-supported geometry with synthetic output order, documented capacity only, within bounds only, and hard rejection are deliberately separate evidence outcomes. The model does not generate IMRO command files. It does not infer vendor wiring from the documented NP3020 software fields.
- Synthetic test fixture IDs are distinct 18-bit integers, exported as integer values and displayed in hexadecimal. No physiological voltages, spikes, hardware data, or production acceptance tolerances are generated.
- The viewport redraws an original SVG. Shank height is normalized between devices; the shank art is not physical CAD. Ultra footprints portray selected-column counts without guessing column switch addresses.
- No external services are needed for the interactive calculations.

## Integration

Suggested hub label: **Neuropixels family routing bench**. Suggested description: *Compare channel limits across nine probe configurations, test site selections, and isolate faults using synthetic digital tags.*
 
| Atlas profile | Instrument deep link (same web origin) |
| --- | --- |
| si-np1 | Keep existing wafer-to-output lab as primary; add `/simulations/neuropixels-family/?model=np1` as secondary if supported |
| si-np2 | `/simulations/neuropixels-family/?model=np2m` (single-shank also available) |
| si-np-ultra | `/simulations/neuropixels-family/?model=ultra` |
| si-np-nhp | `/simulations/neuropixels-family/?model=nhp45` |
| si-np-quad | `/simulations/neuropixels-family/?model=quad` |
| si-np-nxt | `/simulations/neuropixels-family/?model=nxt` |
| si-np-opto | `/simulations/neuropixels-family/?model=opto` |

## Rebuild and test

`python build.py` regenerates the exact one-file artifact from `src/`.
`node tests/model.cjs` uses independent count, collision, alignment, span, and tag-equality oracles. Results: 460,320 distinct original 1.0 site pairs (768 collision pairs), 897 physical starts in the 2.0 single-shank blocker, 30,000 count vectors across three four-shank probe configurations, all 28 wavelength/emitter pairs, and all 31 presets exercised.

`CHROMIUM_PATH=/path/to/chrome python tests/browser.py` serves the delivered bundle to Chromium via an ephemeral loopback server. It uses desktop, iPhone 13 emulation and 320 px viewports. All 31 model/mode choices are exercised through actual page controls at each size (93 sweeps), plus fault/remap interaction, cross-model comparison, full CSV/JSON download round-trip, mobile overflow checks, direct URLs and invalid URLs. The tests require no outside network fetches. Emulation is not a physical Safari hardware test.
