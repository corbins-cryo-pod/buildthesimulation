# Whole-cell Remodeling Laboratory

Route: `/simulations/whole-cell-remodeling/`

An independent exploratory simulation, separate from Cell Growth Laboratory and Soft Neural Generator. This is not a fitted reconstruction or validated biological prediction. No private recording, embedded footage, original archive, or footage-derived screenshots are included.

## Run and reproduce

Open the published route, or open `public/simulations/whole-cell-remodeling/index.html` after building it with `python3 workbench/whole-cell-remodeling/build.py`. No runtime dependencies, accounts, or network requests are required by the simulation. The page includes a link back to the site's simulation directory.

Start with the Whole-cell remodeling preset and seed 2646. Playback starts at 12 nominal model minutes per real second. Pause and +1 min allow controlled inspection. Toggle Fluorescence, Membrane, and Mechanics to inspect the same computed state; these synthetic images are not experimental microscopy. Structural stabilization and Contractility change the balance of extension and withdrawal. Launch soma wave and Pulse selected tip apply distinct perturbations. Drag to pan, scroll to zoom, and Fit cell to reset the view.

Save state / Load state retain numerical state and the RNG. Export CSV distinguishes material length from geometric arclength. Snapshot PNG exports only the synthetic microscope image. Presets and the 45-minute checkpoint live in `examples/`.

## What is modeled

The numerical engine and observation renderer are separate modules.

**Soma:** 96 radial boundary nodes with activity, delayed inhibition, smooth
stochastic forcing, protrusion, contraction, radial restoring force, neighbor
smoothing, and a weak projected-area penalty. The boundary is star-convex,
which excludes arbitrary folds, membrane holes, and general cell topology.

**Processes:** finite-radius rendered membrane around an extensible material
chain. Overdamped stretch/bending/adhesion forces move the nodes. Anchors can
yield. Geometric arclength is distinguished from new material, so mechanical
stretch is not silently counted as growth.

**Growth cones:** a 48-node deformable fan per process, local activity,
structural support, transient exploratory filopodia, and activity-dependent
extension/withdrawal. Filopodia are not automatically counted as new branches.
Lateral process stabilization requires local activity and structural support;
unsupported lateral processes can withdraw.

**Shared coupling:** a reduced relaxation oscillator coordinates somatic
contraction and selectively initiates a traveling wave. Local activity still
has independent stochastic episodes. A shared effective neurite-length budget
limits material addition and recycles withdrawals.

**Observation:** a union of soma, flared shaft, fan, and filopodial membrane
shapes is rendered as a continuous projection. Structural fibers, puncta,
fluorescence grain, and optical blur are synthetic display elements. They are
not individually modeled molecular objects. The nuclear dark region is a
visual inclusion, not a mechanically simulated nucleus.

## Scientific scope and limitations

This is **not** a full membrane/cytoskeleton continuum model, a phase-field
solver, a 3D contact simulator, or a molecularly resolved neuron. It has no
synaptic connectivity, electrical activity, receptor kinetics, neurite identity
classification, growth-factor chemistry, or developmental differentiation.
Projection crossings do not create synapses or merge process graphs. There is
no steric collision solver or out-of-plane motion. A stored display-depth
attribute is not a physical 3D degree of freedom.

The resource budget accounts for modeled neurite material length, not full
membrane area, cell volume, or conserved actin/tubulin molecular mass. Nominal
micrometre and minute labels give inspectable scales but are not established
calibration to the uploaded recording. Most coefficients are exploratory.

The default wave speed (2.2 µm/min) is within the 2–3 µm/min average reported
by Winans et al. (2016). This single sourced parameter does not validate the
whole model, and experimental findings are preparation- and stage-dependent.

Limits: 14 concurrent processes, a 140 µm positive-growth cap per process,
bounded soma/fan radii, 2,400 recent one-minute samples, and 500 recent log
entries. These are explicit numerical/performance constraints. The original
five primary process slots persist as small buds; this version does not solve
general de novo primary-neurite topology or complete primary-neurite loss.

## Numerical implementation

The fixed default step is 0.04 model minutes. No numerical step is changed by
the playback speed selector. Explicit updates use bounded variables and an
overdamped mechanical update. Local bursts are stochastic on/off switches;
changing a seed changes the realization. Rendering never consumes the engine
random generator or alters its state. A full saved state includes the RNG.

The somatic oscillator is a **phenomenological** FitzHugh–Nagumo-type system:

```
du/dt = 0.86 * (u - u^3/3 - v + 0.64)
dv/dt = 0.86 * 0.085 * (u + 0.7 - 0.8*v)
```

A threshold crossing launches a selective wave when coupling is enabled.
There is no claim that these variables are identified molecular concentrations.
The exact activity, support, resource-allocation, membrane, and force updates
are inspectable in `src/engine.js`. The model notes in the app summarize them.

## Software verification

The numerical engine and renderer are byte-identical to the recovered October 26 prototype. The application removes its private comparison feature and validates imported file shapes before replacing the live state. The original engine and renderer are unchanged; site navigation, import-recovery coverage and privacy regression tests are added. The original 22 numerical assertions are retained. Numerical checks are software verification, not biological validation.

- `node workbench/whole-cell-remodeling/tests/engine.test.js`: numerical suite.
- `node --test tests/whole-cell-remodeling.test.mjs`: source, packaging, exclusion, and original numerical regression tests.
- `python3 workbench/whole-cell-remodeling/tests/browser.test.py`: starts a loopback static server and tests the real HTTP route, controls, import/export, malformed-file recovery, responsive layout and no runtime network dependencies. Requires Playwright and Chromium; the dedicated GitHub Actions workflow installs its pinned test dependencies.
- `npm run build`: complete Astro site and model-asset build.

Do not copy prior review images or private source archives into this directory. Browser artifacts created by the new media-free route are stored outside tracked source. The new workflow records its actual backend; software-rendered WebGL does not establish hardware-GPU fidelity. No biological calibration, general stochastic convergence, or full 3D mechanics is established.

## Primary references

1. *An intrinsic cytoskeletal oscillator establishes neuronal polarity.*
   Nature (2026). DOI: 10.1038/s41586-026-10755-6.
   https://doi.org/10.1038/s41586-026-10755-6
2. Winans AM, Collins SR, Meyer T. *Waves of actin and microtubule polymerization
   drive microtubule-based transport and neurite growth before single axon
   formation.* eLife (2016). DOI: 10.7554/eLife.12387.
   https://doi.org/10.7554/eLife.12387
3. *Stochastic Actin Polymerization and Steady Retrograde Flow Determine Growth
   Cone Advancement.* Biophysical Journal (2009).
   https://pmc.ncbi.nlm.nih.gov/articles/PMC2712033/
4. *Actin Waves Do Not Boost Neurite Outgrowth in the Early Stages of Neuron
   Maturation.* (2017).
   https://pmc.ncbi.nlm.nih.gov/articles/PMC5741660/
