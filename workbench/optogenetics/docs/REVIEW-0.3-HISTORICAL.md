# Optogenetics Laboratory 0.3 — review report

**Completed locally on 25 October 2026. Not uploaded to GitHub or deployed.**

Open `optogenetics-laboratory.html`. The original application remains separately available in the supplied v0.2 attachment. This package preserves its native human neuron, H134R solver and original workspaces while adding a new Expanded Laboratory.

## Implemented and runnable

| Area | What the program actually calculates | Boundary |
|---|---|---|
| Additional opsins | Original H134R; reduced Chronos-like, ChrimsonR-like and GtACR2-like state dynamics; editable rates and spectral weighting | New options are explicitly exploratory surrogates, not experimentally fitted photocycle reproductions. |
| Chloride | Nernst reversal at 34 °C; separate initial somatic/axonal chloride; local current-driven concentration loading and homeostatic recovery; fixed-pool alternative | No bicarbonate, axial ion diffusion, transporter-specific kinetics, extracellular depletion or osmotic volume changes. |
| Inhibition comparisons | Native active cell under current drive; identical-drive matched dark trial; full-recording and illumination-window event counts | No hard-coded silencing; negative event reduction is allowed. This is not a network-causal assay. |
| MicroLEDs | Finite rectangular Lambertian scalar fluence, arbitrary pose, site enable, size, power, wavelength and efficiency; source power/energy accounting | Direct-light attenuation approximation, not scattering Monte Carlo. All emitters share one pulse program. |
| Populations | One to eight independent detailed solves with rigid placement, seeded layouts, cell-specific expression and optional opsin identity | Copies of one human model, not multiple specimens. No synapses, tissue displacement or collisions. |
| Heating | 3-D homogeneous diffusion/perfusion with optical absorption and separate electrical losses; spatial/temporal samples and energy ledger | Grid-dependent unresolved hotspots; no chip-layer or junction model. Heat does not change electrophysiology. |
| Imports | Explicit optoelectrode JSON, Designer v1 layout preview and selected-footprint conversion, reloadable experiment configurations | Cleanroom `microfabrication-1` records attach only as provenance, not as-fabricated optical or thermal simulation. |
| Review tools | Six linked plots, population raster, local compartment inspection, voltage/light/opening/chloride/ECl/temperature colors, replay, CSV and full JSON | Computed data are numerical outputs, not experimental recordings or established implant performance. |

## Executed demonstrations

All eight new presets ran to completion. Full configurations and actual summaries are retained in `examples/phase3/` and `validation/phase3/demo-*.json`.

| Demonstration | Computed result |
|---|---|
| Default somatic chloride model, 220 ms | Light trial: 3 whole-recording events; matched dark: 9. During 70–170 ms illumination: **0 versus 4**. |
| Elevated-chloride challenge | Light trial: 37 whole-recording events; matched dark: 9. During illumination: **26 versus 4**. This preset also changes expression distribution and density; do not treat it as a one-variable comparison with the default. |
| Fixed chloride reservoir | 3 versus 9 whole-recording events; 0 versus 4 during illumination; no concentration evolution. |
| Three-site microLED | Three somatic events, one per pulse; approximate soma exposure 1.362 mW/mm². Numerical grid maximum ΔT 0.557 °C at the default 80 µm spacing. |
| Four-cell optical selectivity | Event counts **[4, 3, 0, 0]**. Soma exposures approximately [2.085, 0.510, 0.178, 0.074] mW/mm². This includes prescribed expression variation. |
| Opsin-negative heating control | Zero photocurrent and zero spikes; heat solver still produces a nonzero temperature field. It does not simulate heat-induced changes in firing. |
| Chronos-like surrogate | Six events in the selected assumed-expression protocol; not one event per pulse. |
| ChrimsonR-like surrogate | Eighteen events in the selected assumed-expression protocol; not one event per pulse. |

The high-event counts in surrogate examples are not experimentally calibrated performance claims. They demonstrate actual numerical current/voltage calculations instead of scripted pulse-to-spike conversion. Source placement, expression, membrane excitability and channel persistence all matter in the chosen equations.

## Verification results

**100 automated tests passed; zero failed.** The combined run is retained in `validation/phase3/all-tests.tap`. This includes all **46 original core tests**, **43 new unit/reference/import/thermal tests**, and **11 new end-to-end engine tests**. No existing numerical test was removed or loosened.

**65 Chromium browser assertions passed across three flows; zero failed.** They exercise real Blob-worker calculations, traces, replay, cell selection, all six overlay types, run/cancel/restart, invalid-value recovery, source direction validation, configuration round-trips, CSV/JSON downloads, native device and Designer conversion, inert malicious-looking labels, recipe-only provenance, four-cell thermal results, light/dark theme, a 390-pixel mobile layout, and retained legacy navigation/single-pulse calculation. There were no uncaught page exceptions and no runtime HTTP requests. The three flows repeat some startup/network assertions; 65 is the executed assertion total, not 65 distinct scientific experiments.

Browser QA used Playwright to load the self-contained HTML into Chromium and run its inline workers. Physical iPhone and Safari were not tested. The package does not claim cross-browser certification.

### Independent numerical checks

- **48 reduced-photocycle protocols** compared with independent SciPy matrix exponentials. Maximum state difference about **9.77 × 10⁻¹⁵**.
- **Nine chloride loading/recovery protocols** compared with independent DOP853 integration. Maximum concentration difference about **5.60 × 10⁻¹⁴ mM**.
- Finite-emitter centerline solid angle, bounded near field, far-field emitted-power integration, source superposition, spectral contributions, orientation, zero-output and efficiency separation.
- Thermal manufactured eigenmode compared with both its exact discrete decay and the continuum analytical solution. Continuum-mode maximum amplitude error decreased from **9.89 × 10⁻⁴** at 40 µm spacing to **2.13 × 10⁻⁴** at 20 µm spacing for the retained test.
- Default microLED heat ledger residual approximately **1.52 × 10⁻¹⁹ J**. This is accounting precision, not physical temperature accuracy.
- The inherited independent ChR2 and cable-matrix fixture checks also continue to pass. A new native NEURON reference for the combined chloride extension was not executed.

### Refinement and honest limits

For the retained short somatic-inhibition test, reducing dt from 0.01 to 0.005 ms left event classification unchanged. Maximum soma-voltage difference was **0.00239 mV**, and maximum soma-chloride difference was **1.56 × 10⁻⁶ mM**. This does not establish convergence for every parameter setting or the fine morphology mesh.

Thermal spatial refinement is not satisfactory for hotspot claims. At a fixed 1.92 mm domain width, the microLED peak changed:

| Voxel spacing | Numerical peak ΔT | Numerical soma peak ΔT |
|---|---:|---:|
| 80 µm | 0.557 °C | 0.137 °C |
| 60 µm | 0.977 °C | 0.151 °C |
| 48 µm | 1.012 °C | 0.174 °C |

Halving the thermal timestep at 80 µm changed the peak to 0.552 °C. Expanding the domain at fixed 80 µm spacing left the short-protocol peak essentially unchanged. The dominant hotspot issue is spatial source deposition and omitted device layers. The application and diagnostics explicitly flag unresolved hotspots; no tissue-safety interpretation is justified.

The original 40→20 µm neural waveform/event sensitivity also remains. Biological optical firing thresholds, source efficiency, true expression, chloride distribution and reduced-opsin kinetics are unvalidated in this cell. Wavelength-specific tissue optics, full radiative transport, connected populations, temperature feedback, a real device thermal stack, and an as-fabricated cleanroom adapter remain future work.

## Suggested review sequence

Start with the default chloride experiment and inspect solid versus dashed voltage, local current polarity, chloride and reversal over time. Then inspect the high-chloride challenge using its own matched dark trial.

Move to Three-site microLED probe. Change one emitter's output or direction, rerun, and verify that its local light and calculated response change together. Compare optical and electrical power; inspect the heat warning and ledger rather than treating the peak as a safety estimate.

Run Four-cell optical selectivity, choose each cell, and replay its voltage/current/raster. Use a zero expression multiplier on one cell as a negative control. Finally, preview the sample Designer JSON and convert only selected contacts; save the resulting device and reload the experiment JSON.

## Included and not included

The review ZIP contains the standalone HTML, editable ES modules, raw cell data, original licenses, eight new experiment setups, three import examples, all automated tests, independent-reference generators and results, screenshots, source provenance, and a prepared standalone site directory. No GitHub changes or deployments were made. No font programs, remote dependencies, credentials or private tokens are included.

See `docs/ADVANCED_MODELS.md` for equations, parameter evidence tiers and primary-source references, `docs/IMPORT_CONTRACT.md` for versioned inputs, and `docs/INTEGRATION.md` for later website integration. The older review remains under `docs/REVIEW-0.2-HISTORICAL.md`; historical validation files are not silently relabeled as new experiments.
