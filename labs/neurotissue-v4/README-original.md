# NeuroTissue v4

v4 replaces the dish-only engine of v1–v3 with one core that runs a coverslip, a block of gel and
a nerve conduit. Geometry belongs to the scenario. The engine itself has no notion of 2-D or 3-D.

## What is new

| Area | v3 | v4 |
|---|---|---|
| Geometry | 2-D coverslip, with a 2.5-D height for cells | `Space` objects: `Surface` (2-D), `Volume` (3-D box), `Tube` (3-D cylinder with regions). Every position is a 3-vector, and a 2-D space holds z at 0 |
| Materials | fixed substrate | functions of position: stiffness, adhesion, confinement density, fibre direction (contact guidance) |
| Fields | explicit diffusion on a 2-D grid | 3-D grids with diffusion, decay, sources and reactions, solved by an exact implicit line solve split by axis (Thomas algorithm), stable at any interval. Matrix fields such as fibrin can be deposited and degraded |
| Cell types | neurons and glia with fixed code paths | behaviour genomes (data): neurites, migration, cohesion, division with contact inhibition, secretion, consumption, life span, activation delay |
| Mechanics | explicit forces, sub-stepped | quasi-static constraint relaxation (segment length, bending, anchors, soma overlap, containment), stable at 3-minute steps |
| Storage | objects | node state in typed arrays; uniform spatial hash over cells |
| Time | live only | a recorder writes compact frames (cells, simplified neurite polylines, growth cones, down-sampled fields). The same format serves the recorded library and live runs, so both can be scrubbed |

## Scenarios

- `dish`: rat hippocampal neurons on poly-lysine glass. The v3 calibration, refitted for the new
  grip model (Dotti, Sullivan & Banker 1988).
- `gel` / `gelSurface`: DRG neurons inside a hydrogel, or on its surface, at a chosen stiffness
  (trend from Balgude et al. 2001).
- `conduit`: a cut rat sciatic nerve with both stumps in a silicone tube. Exudate from the cut faces
  clots into a fibrin cable above a threshold concentration. Schwann cells convert to repair cells
  (about 5 days), migrate along the cable from both stumps as cohesive columns, and divide up to a
  carrying capacity. Macrophages clear myelin debris. Axons from the proximal stump grow only where
  repair Schwann cells are, and debris slows them. Options: gap length, and `graft` (the gap starts
  filled with Schwann cell bands, like a nerve autograft).

## Files

```
engine/space.js      spaces, materials, fields (implicit line-solve diffusion)
engine/types.js      cell-type genomes
engine/clutch.js     motor-clutch lookup table (from v3)
engine/core.js       the engine: cells, neurites, mechanics, hash, lesions, metrics, snapshot
engine/scenarios.js  dish, gel, gelSurface, conduit (+ metrics)
engine/recorder.js   frame encoder/decoder and run container
engine/worker.js     live runs in a Web Worker
src/page.html, src/app.js   viewer (plain WebGL, no libraries)
tools/build.js       builds dist/index.html, writes dist/runs/*.txt and the validation table
tools/tune-fibrin.js field-only tuning of the conduit chemistry
exp/record.js        record a run for the library
exp/lib-queue.sh     record the whole library
exp/gel-trend.js     stiffness series for the gel scenarios
exp/validate4.js     validation suite (dish seeds, conduit timeline, performance)
```

## Running

```
node exp/record.js conduit-8mm conduit '{"gap":8,"seed":3}' 720 240   # id, scenario, options, hours, frame interval (min)
node tools/build.js                                                     # dist/index.html + dist/runs/*.txt
```

Recorded runs live in `runs/<id>.bin` (gzipped). The page fetches `runs/<id>.txt` next to itself (see Publishing).

## Validation (v4 milestone)

| Scenario | Measure | Literature | v4 |
|---|---|---|---|
| 8 mm gap | Fibrin matrix continuous | days 2-7 (Díaz-Flores et al. 1995) | day 2.3 |
| 8 mm gap | Schwann cells in gap from both stumps | from day 7 | day 4.5 (early) |
| 8 mm gap | Schwann fronts meet | days 7-21 | day 17.7 |
| 8 mm gap | Axons in distal stump | nerve re-forms days 21-30 | day 21; 40/40 by day 30 |
| 10 mm gap | Matrix and regeneration | limit of regeneration (Lundborg et al. 1982) | thin axial strand; fronts stall; leading axons 6.2 mm in by day 30 |
| 15 mm gap | Regeneration | fails (Lundborg et al. 1982) | no matrix mid-gap; fronts stall at 3.75 / 3.5 mm; no axon crosses |
| 8 mm nerve graft | Rate / delay | 1.5 mm/day, 3.6 days (Kanje et al.) | 1.31 mm/day, 5.1 days (delay too long) |
| Dish, 6 runs × 6 neurons | Stage 2 / stage 3 / stage 4 | ~13 h / ~19 h / ~day 4 (Dotti et al. 1988) | 13 ± 1 h / 23 ± 1 h / 3.7 ± 0.3 d |
| Dish | Axon day 4 / day 7; dendrites day 7 | ~250 / ~420 µm; ~270 µm | 166 ± 27 / 421 ± 64 µm; 268 ± 47 µm |
| DRG in gel, 3 seeds | Neurite length at 48 h vs stiffness | falls as the gel stiffens (Balgude et al. 2001) | 0.5 kPa 125, 1 kPa 72, 2 kPa 35, 4 kPa 16 µm (0.25 kPa: 104) |
| DRG on gel surface | same | model prediction | rises with stiffness to 2 kPa (200 to 421 µm) |

Known gaps. One repair-cell activation clock cannot give both the late Schwann invasion of conduits
(day 7) and the short axon delay of grafts (3.6 days), which suggests conduit invasion is limited by
something not yet modelled (fibroblasts and blood vessels that lead Schwann cells across a bridge).
Axons at day 4 in the dish are about a third short of Dotti's value.

Performance (one CPU core, Node): an 8 mm conduit (about 4,000 cells and 40 regenerating units) runs
30 days in about 4 minutes at a 5-minute step; the dish runs 7 days in about a minute at 3-second steps.

## Publishing

Artifacts serve text, so `tools/build.js` writes each gzipped run as base64 text
(`dist/runs/<id>.txt`). The page decodes the base64 and gunzips it with `DecompressionStream`.
