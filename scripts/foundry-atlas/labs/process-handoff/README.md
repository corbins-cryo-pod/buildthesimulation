# Process Handoff Bench

**Suggested route:** `/simulations/foundry/process-handoff/`. The ready-to-ship `index.html` is one file with no service, API, external script, CDN, login, machine connection or live data needed. It turns material, geometry, format, specimen identity and evidence boundary questions into staged acceptance checks. It is not a process planner or machine interpreter.

| Case file | Handoff that matters |
|---|---|
| Wafer → fixture | Dry 200 mm return can be traceable while the selected 150 mm DRIE model refuses the diameter. A recorded 150 mm transport succeeds only at the dimensional gate: it still lacks a masked-stack record and an importer. A printed dot grid is not a mounted cutting carrier or a singulation output. |
| Panel → writing field | A 12 × 8 mm design on a 178 mm carrier fits the standard field, but the carrier itself still needs a holder record. An actual 178 × 178 mm written extent exceeds the selected 150 × 150 mm field. Separately checks 1.2 µm dense lines and spaces, and a much smaller modeled two-stripe geometry. No developed critical dimension or material stack is inferred. |
| Dose map → develop | The 02-01 aligner export is compatible with the real 02-10 software validator and solver. 02-03's commanded-dose export is not. Pretending it has the accepted schema leaves the geometry and frame wrong. |
| Placed die → joint | The 08-04 export gives dry geometry. Compare 4/5 versus all five aligned; even 5/5 is not physical attachment, measured continuity or a seal. |
| Seam path → leak record | 100% virtual perimeter is not welded. The 08-09 calibrated synthetic reference is a different specimen from the seam draft, so its pass decision cannot be carried across package IDs or promoted to a measurement. |
| Connected net → recording | 08-01 emits a synthetic pad graph, not voltages. 10-01 emits a proven compatible voltage file for 10-02, but that establishes only an isolated software acquisition, not an end-to-end recording path. |

**Decisions:** “Matches this demand” means every selected narrow gate passed; it does not generalize to the tool family or a physical result. “Incompatible as supplied” means at least one supplied value, record class or simulator scope conflicts. “Not established” means no tested clash was found, but a required record, fixture, map or importer is missing. Known conflict takes precedence so a definite block cannot be hidden behind an unrelated unknown.

## Sources and reproduction

The build pins the atlas dictionary snapshot and its byte hash, checks the operation bindings of 13 registered stations, and extracts five current atlas profiles. It reads equipment-route and fixture files from the project, asserts their recorded schemas, embeds compact projections and per-record canonical hashes, and attaches per-source hashes for site files. The only authored values are explicit planning examples and two intentional format counterfactuals. Figures for Mode II use the [Heidelberg technical data](https://heidelberg-instruments.com/product/mla150/) and the site's [02-03 modeled contract](https://buildthesimulation.com/simulations/equipment/02-03/simulator/).

To generate elsewhere:

```sh
node build.mjs --repo /path/to/buildthesimulation --lanes /path/to/foundry-atlas/lanes --out index.html
node test.cjs index.html /path/to/foundry-atlas/lanes/equipment.json
CHROME_BIN=/path/to/chromium python browser.py index.html
```

The JS evaluator is shared by Node and the browser. The page does **not** rerun the other tools in production or inject an adapter. The build verifies two actual virtual imports, then embeds their deterministic receipts:

- **02-01 → 02-10:** [aligner export](https://buildthesimulation.com/equipment/02-01/example-result.json) executed against the [Delta solver](https://buildthesimulation.com/equipment/02-10/solver.mjs); preserves WAFER-MA6-001, revision 2 → 3, and returns 6,400 modeled cells (695 open). The real validator rejects the direct writer as exported and after a label-only substitution.
- **10-01 → 10-02:** the [MultiClamp example](https://buildthesimulation.com/equipment/10-01/primary-example.json) has exactly the same JSON value as the [supplied Digidata import](https://buildthesimulation.com/equipment/10-02/multiclamp-input.json). Running the [ADC simulator](https://buildthesimulation.com/equipment/10-02/adc.mjs) preserves PATCH1U-CH1, revision 1 → 2, and writes 131 signed codes on AI0. The ADC rejects both a pad graph and the otherwise identical example with its unit falsely changed to mV.

The build also invokes the real isolated-trench solver to show 150 mm acceptance and 200 mm rejection, reproduces 08-04 nominal and defect placement examples, and verifies the replay-generated low reference equals the saved 08-09 export. This verifies virtual behavior only.

## Verification and direct links

- All 43 allowed case/artifact/demand combinations exercised against independent expected matrices in Node and Chromium. Separate checks cover exact line/space/field boundaries, missing mounting records, malformed record labels/units, revisions, sample/fixture lineage, and unsupported-combination refusal.
- Chromium desktop, iPhone 13 emulation, and 320 px dark-mode mobile tested (129 scenario sweeps) with no external page requests or horizontal overflow. Also tested keyboard, deep links, pending/export interlock, stale receipt reset, evidence disclosure, and two JSON download round-trips.
- Receipt includes the typed demand, a compact source artifact, SHA-256 evidence, ordered gates, and the selected virtual result if one was executed at build. It is not a traveler.
- Example route suffixes: `?case=developer` is **not** valid; use `?case=develop&artifact=contact&demand=developer`. Further examples: `?case=panel&artifact=narrowSpace&demand=reference-field`, `?case=record&artifact=volts&demand=adc`, `?case=seal&artifact=leak&demand=named-package`. Omit optional artifact and demand for the default example in that case.

## Guided playback

Play workflow walks the selected requirement through each existing gate using the same results as manual inspection. The record marker crosses only when all gates match; an incompatible or unproven case stays held. Inspect next, Inspect all, Reset, and changed selections take precedence over autoplay. The JSON remains unavailable until all gates are inspected. Pause and resume keep the current stage. Replay starts from the first stage for the current selections. Playback is opt-in; reduced-motion users receive the same sequence with no sliding markers or sweep effects.

The one-file builder in this directory inlines the shared scheduler from `../bench-play.js`. `node ../bench-play.test.cjs` verifies timer cancellation; `CHROME_BIN=/path/to/chromium python ../bench-play.browser.py` tests the bundled entry points on desktop, iPhone 13 emulation, and a narrow reduced-motion configuration.
