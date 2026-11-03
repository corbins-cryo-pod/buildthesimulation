# Coverslip Neuron Engine 3

Soft-bodied neurons on a patterned coverslip, seen from above (2.5-D). Cells spread like a wetting drop,
sprout minor neurites, pick an axon through tubulin competition, grow dendrites and spines, migrate,
branch, avoid themselves, tile, compete for trophic support, wire up and fire. Units are µm and minutes.

The model description and API are in the v2 guide ("Coverslip Neuron Engine v2 — Model & API Guide"); what
changed in v3, the recalibration and the validation runs are in "Neuron Engine v3 — Changes and Validation".
This file is the quick map of the code.

## What's new in v3

v3 fixes the problems found by the v2 experiment suite:

- **Revocable axon identity and a lesion API.** A sibling that out-grows the axon by `axonLead` for `axonHold`
  takes over. `e.transect(neurite, stumpUm)` cuts a neurite and clears a cut axon's label; `e.cutAt(x, y)` cuts
  whatever passes a point.
- **Stages follow growth.** Stage 4 needs `dendriteDelay` minutes and an axon of `dendriteAxonLen` µm; stage 5
  needs `spineDelay` minutes and `spineDendLen` µm of dendrite (per-cell ±20%). Stage 1 varies (`stage1Jitter`).
  Stage 3 is dated from the start of the winning lead; `cell.axonDecided` keeps the moment the rule fired.
- **Recalibrated hippocampal genome** (Dotti, Sullivan & Banker 1988): faster symmetry breaking, speed-limited
  axon and dendrite growth cones, minor neurites that hold their length once an axon exists (`minorRestrain`).
- **Death is a hazard**, not a timed cliff: rate = deficit² / `deathDelay` per minute after `deathGrace`.
- **Diffusible glial support** (`gliaDiffuse`, `gliaRange`) and a uniform `feeder` layer.
- **Per-type transport** (`feedback`, `promoterBack`, `dendTransport`), a clutch-slip tubulin cost
  (`tractionCoupling`; DRG 1) and a per-type speed dependence on clutch advance (`tractionSpeed`; hippocampal
  0.25), so DRG outgrowth peaks at intermediate stiffness while hippocampal outgrowth barely changes.
- **Step-size consistent mechanics** (`mechRef`, `mechMaxScale`): a step longer than `mechRef` is sub-stepped,
  so changing `dt` no longer changes neurite length.
- **Turning assay** with the pipette ~45° off the axons' path; cue fields can switch on later (`start`).
- **Optional extra axons** (`maxAxons`), **scripted interventions** (`e.addHook({ when, run })`), and a new
  Axon transection scenario. The page adds a Cut axon button and Alt-click to cut.

## Files

| Path | What it is |
|---|---|
| `engine/environment.js` | Substrate grid (coatings, stiffness, PDMS walls), diffusing cue fields, radial-glia fibers, zones, spawners |
| `engine/celltypes.js` | Cell-type genomes (`BASE` plus hippocampal, pyramidal, purkinje, granule, rgc, drg, interneuron, da, ipsc, astrocyte, sphere) and `registerType` |
| `engine/clutch.js` | Precomputed stochastic motor-clutch table (traction and retrograde flow vs substrate stiffness); generated |
| `engine/clutch-table.json` | Raw table the above is emitted from |
| `engine/activity.js` | Windowed Izhikevich spiking, synaptic depression, STDP, bursts |
| `engine/morphometrics.js` | Per-cell and population metrics, Sholl analysis, SWC export, stage timing |
| `engine/core.js` | `NeuriteEngine`: mechanics, tubulin economy, stages, growth cones, branching, migration, trophic support, synapses |
| `engine/presets.js` | The 15 scenarios behind the page, plus `buildScenario(key, opts)` |
| `engine/worker.js` | Web Worker glue: runs the engine off the main thread and posts compact snapshots |
| `src/page.html` | The interactive page (renderer, controls, inspector) |
| `build.py` | Inlines the engine and worker into the page: `python3 build.py` writes `dist/neuron-engine-v3.html` |
| `tools/clutch-table.js`, `tools/emit-clutch.js` | Regenerate the clutch table if you change clutch parameters |
| `tools/calibrate.js`, `tools/targets-hippocampal.json` | Fit genome numbers to measured targets (v3 targets from Dotti et al. 1988) |
| `exp/` | Experiment harness: `plan3.js` writes the v3 validation queues, `pool.js` runs them, `analyze3.js` summarises them next to the v2 runs |
| `examples/population.js` | Headless run that prints culture stats and writes `snapshot.json` plus one SWC per neuron |

The engine modules have no dependencies. They load as CommonJS in Node and attach to `self.NE2` in a browser or worker.

## Run headless

```bash
node examples/population.js population 12 200    # scenario, simulated hours, cell count
node examples/population.js stripes 24
```

```js
const { NeuriteEngine, Environment, CellTypes } = require('./engine/core.js');

const env = new Environment(800, 600, { coat: 2 });          // 0 glass, 1 PDL, 2 laminin, 3 repellent
env.stripes(36, 80, Math.PI / 2, { coat: 0 });                // bare-glass stripes
const cue = env.addField('netrin', { lambda: 160, effect: { axon: 1, minor: 0.6, dendrite: 0 }, gain: 1.6 });
cue.addSource(700, 300, 1);

const e = new NeuriteEngine({ env, seed: 7, params: { activity: false } });
const c = e.addCell(150, 300, { type: 'hippocampal', spread: true });
e.step(Math.round(3 * 1440 / e.p.dt));                        // three simulated days

console.log(c.stage, e.metrics(c), e.stats());
require('fs').writeFileSync('cell.swc', e.swc(c));
```

Useful calls: `addCell(x, y, opts)`, `step(n)`, `setParams(obj)`, `stats()`, `metrics(cell)`, `population()`,
`swc(cell)`, `cellAt(x, y)`, `removeCell(cell)`, `snapshot()` / `transferables(snapshot)`, and in v3
`transect(neurite, stump, { resetIdentity })`, `cutAt(x, y, r)`, `addHook({ when, run, once })`.

```js
// cut the axon 10 µm from the soma 12 h after it is chosen, then watch a sibling take over
e.addHook({ when: (en) => c.axonDecided >= 0 && en.t - c.axonDecided > 720, run: (en) => en.transect(c.axonId, 10) });
```
`addCell` options include `type`, `spread`, `z`, `radius`, `angle`, `polarAngle`, `maxNeurites`, `maxLen`,
`migrating`, `migrateTime`.

## Add a cell type

```js
CellTypes.registerType('myCortical', {
  label: 'My cortical neuron',
  stage1Time: 300,                       // minutes before minor neurites sprout
  axon: { speed: 2.6, tSplit: 0 },       // nested objects merge over BASE
  dendrite: { maxLen: 400, branch: 1.3, selfAvoid: 1 },
  ephys: 'RS',
});
```

Anything left out is inherited from `CellTypes.BASE`.

## Build the page

```bash
python3 build.py      # -> dist/neuron-engine-v3.html (single self-contained file, ~230 KB)
```

The page runs the engine in a Web Worker and falls back to the main thread where workers are blocked.
`window.neuronApp` exposes the running app for scripting from the console.

## Calibrate

```bash
node tools/calibrate.js tools/targets-hippocampal.json 24 3    # targets file, trials, seeds per trial
```

Targets are `[value, relative tolerance]`; metrics include `stageN_h`, `axon_um@Xd`, `dendrite_um@Xd`,
`branchPoints@Xd` and `sholl_max@Xd`. The script prints the best genome patch to paste into `registerType`.

## Reproduce the v3 validation

```bash
node exp/plan3.js
node exp/pool.js exp/queues/v3a.json exp/results/v3a.jsonl 2     # single cells: timing, transection, time step
node exp/pool.js exp/queues/v3b.json exp/results/v3b.jsonl 2     # stiffness, turning, density, glia, feeder, performance
node exp/analyze3.js v1     # also v2, v4, v5, v7, perf; compares with ../neurosim2/exp/results if present
```

## Regenerate the clutch table

```bash
node tools/clutch-table.js && node tools/emit-clutch.js
```

## Known limitations

Top-down 2.5-D only (no stacked layers or 3-D gels); the hippocampal calibration covers days 0-7 only;
symmetry breaking is still a length-lead rule, so its match to transection data is partly by construction;
activity is a coarse 200 ms window per 3 s structural step, so it shapes wiring statistically rather than
reproducing spike timing; no glial guidance beyond trophic support and fiber scaffolds. The engine still
attaches to `self.NE2` for compatibility.
