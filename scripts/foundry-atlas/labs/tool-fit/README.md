# Tool Fit Bench

A standalone, dependency-free client for comparing a *requirement* against two specific stations. One decision column describes the named reference and another describes the current virtual experiment. Neither is evidence of physical fabrication, ownership, permission, calibration, traceable test results or clinical suitability. Missing evidence is never replaced by a model-family guess.

**Intended route:** `/simulations/foundry/tool-fit/`. Copy the generated `index.html` there or regenerate it from the current atlas equipment dictionary. The interactive page needs no API, network fetch, CDN, build-time package, or login. External references/other site routes open only when followed.
 
## Reproduce

From this folder (or use absolute paths):

```sh
python build.py ../../lanes/equipment.json index.html
node test.cjs index.html ../../lanes/equipment.json
# Python Playwright + an installed Chromium required only for UI tests:
CHROME_BIN=/path/to/chrome python browser.py index.html
```

The Python generator selects metadata, real record IDs, realization/scope, operation bindings, limitations, operating references, primary-source URLs and revision from `lanes/equipment.json`. The explicitly reviewed rule set lives in `engine.cjs`; it checks its expected operation binding at runtime and fails to unknown if a binding changes. Additional model-only dimensional limits were taken from the numerical contracts of the linked BuildTheSimulation tool experiments. Re-review these limits if a selected model changes. A new run embeds the SHA-256 of its input dictionary. The JS engine is shared by the browser and Node tests.

## Concrete gates

| Station | Named reference gate | Virtual boundary |
|---|---|---|
| 02-03 | [Heidelberg MLA 150 technical data](https://heidelberg-instruments.com/product/mla150/): Mode II 1.0 µm feature / 1.2 µm line *and* space; standard 150 × 150 mm writing, not optional 200 mm field. No inference of fixture fit from field alone. | Existing [two-stripe writer](https://buildthesimulation.com/simulations/equipment/02-03/simulator/) has 6–150 mm square samples and at most 1 × 0.5 mm modeled area. Not a CD prediction. |
| 02-01 | [NIST installed MA/BA6 Gen4](https://www.nist.gov/laboratories/tools-instruments/nanofab-tool-suss-microtec-maba6-gen4-mask-aligner): 75/100/150 mm round wafers, 150 mm illuminated diameter, 1 µm print resolution. Square panel holder and dense lines/spaces are not inferred. | [Selected contact/proximity example](https://buildthesimulation.com/simulations/equipment/02-01/simulator/) uses a 150 mm disk and 1.28 × 1.28 mm local dose raster. |
| 02-11 / 02-07 | Both are coating platform roles; a specific alternate chuck is not implied. | [02-11](https://buildthesimulation.com/simulations/equipment/02-11/simulator/) accepts a 200 mm round disc in its **dry handling** experiment; no coat revision. 02-07 models an AZ 1512 coating example. |
| 04-03 / 04-02 / 04-07 | A named silicon DRIE configuration, a calibrated ICP example, and a blade saw are different. [Manchester](https://research.manchester.ac.uk/en/equipments/oxford-instruments-plasmapro-100-cobra-300-reactive-ion-etcher-ri-2/) and [UCSB](https://wiki.nanofab.ucsb.edu/wiki/Oxford_ICP_Etcher_%28PlasmaPro_100_Cobra%29) demonstrate different materials for related Cobra stations. | [04-03](https://buildthesimulation.com/simulations/equipment/04-03/simulator/) has a 150 mm round-silicon isolated-trench model. Breakthrough/release is rejected. [04-02](https://buildthesimulation.com/simulations/equipment/04-02/simulator/) is a 100 mm ZEP/Si/SiO₂ experiment, not this DRIE. 04-07 displays a grid. |
| 09-01 / 09-12 | [Gamry 600+](https://www.gamry.com/support-2/legacy-devices/reference-600plus-legacy) supports EIS. The passive cell and the instrument have different roles. Neither register entry establishes a device-specific plating process. | An idealized impedance response is not a deposited coating. |
| 04-12 / 08-04 | [AggieFab](https://aggiefab.tamu.edu/equipment/evg-501-wafer-bonder/) lists ≤100 mm wafers on its EVG501 and the EVG610 companion aligner. Do not generalize to other [EVG configurations](https://www.evgroup.com/products/bonding/permanent-bonding-systems/evg501) or to dry flip-chip placement. | Area comparison and dry pad overlap produce no joined wafer. |
| 08-08 / 08-09 / 08-10 | A seam path, a helium detector, and an encapsulant dispenser do not establish real seal performance. | Only 08-08 maps a path here; only 08-09 replays a calibrated synthetic trace. No real package is tested. |

## What the tests cover

- 74 targeted metadata/boundary assertions, including exact vs just-off mode and field limits; carrier vs footprint; 150 mm vs 200 mm; scope mismatch; blank, non-finite and non-positive input; instrument vs fixture; verification vs fabrication; and missing IDs.
- Ten named scenarios × every one of 199 equipment entries (1,990 evaluations). Fourteen station IDs have a specific reviewed rule for at least one question. For stations without a relevant reviewed rule, "not established" is intentional.
- Chromium UI on 1366 px desktop, iPhone 13 emulation, and a 320 px small viewport. All ten presets checked for horizontal overflow at each size. Selectors, missing-field handling, per-gate transitions, evidence links, downloaded content and absence of browser errors checked.
- These are local functional and boundary tests. They neither test a physical instrument nor establish on-site hardware access. Deployment verification is separate.

## Guided playback

Play workflow starts with the current requirement, then checks each documented configuration gate, each virtual experiment gate, and a scoped decision. The comparison remains visible below; Previous and Next stage are available and stop autoplay. Changing any requirement or selected station cancels the active tour. The comparison JSON remains independent and pauses playback when downloaded. Pause and resume keep the current stage. Replay starts from the first stage for the current selections. Playback is opt-in; reduced-motion users receive the same sequence with no sliding markers or sweep effects.

The one-file builder in this directory inlines the shared scheduler from `../bench-play.js`. `node ../bench-play.test.cjs` verifies timer cancellation; `CHROME_BIN=/path/to/chromium python ../bench-play.browser.py` tests the bundled entry points on desktop, iPhone 13 emulation, and a narrow reduced-motion configuration.
