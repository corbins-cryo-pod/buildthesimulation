# Neural Growth Laboratory V5 — implementation and model card

Engine: `neural-growth/5.0.0`. Checkpoint schema: `bts-neural-growth-v5`.

This is the functioning, exploratory implementation of the combined laboratory. It uses one growth engine across ten experiments, with microscope and structural views of the same geometry. It is not a calibrated prediction of a particular culture, nerve preparation, treatment or patient. The full design specification includes scientific validation and specialized biological modules that require further work and data; those gates are not represented as completed here.

## Start an experiment

Open `/simulations/neural-growth/`, or the full workspace at `/labs/neural-growth-v5/index.html`. Start with **First cell**, advance 6 hours, then 24 hours. Select cells and growth cones in the image or inspector. A process remains “minor” until the model's sustained asymmetry criterion selects an axonal root; identity is not guaranteed by a particular time. Try **Branch formation** for a developed arbor and **Developing culture** for interactions.

Sliders apply timestamped interventions and pause growth. “Compare next 4 hours” forks the complete current state, changes one mechanism in one copy, runs both, and leaves the original unchanged. The same initial random states do not guarantee the same subsequent random-event sequence when topology diverges. A pair of simulations is not a population estimate.

“Transect” cuts halfway along a segment near the middle of the selected process's ancestral path. It removes distal descendants, retires affected contacts and tips, recycles material and creates a proximal regrowth cone. It does not model Wallerian degeneration, inflammation or restored conduction.

## What was combined

| Source | V5 implementation |
|---|---|
| Cell Behavior V3 | Microscope-first interaction, compact controls, selection, lesion and experiment workflows; an illustrative microscopy renderer adapted to the unified state. |
| Cell Growth | Isolated adaptations of the triangulated soma, nucleus, shared-junction shaft mechanics, local exploration, branch precursors and contact maturation. The original engine remains unchanged. |
| Soft Neural Generator | Inspectable activator/recovery dynamics, a separate finite cytoskeletal supply ledger and path-following transport. These mechanisms were reimplemented with explicit units. |
| NeuroTissue V4.1 | Surface/volume/conduit experiment distinctions, physical field clocks, positivity-controlled diffusion, complete checkpoints and current-versus-ever bridge bookkeeping. Legacy recordings are not reused as new V5 output. |

## Experiments and evidence

All profiles are **mechanism motivated and exploratory**. Numerical checks are listed separately in `verification.json`. There are no fitted or held-out biological datasets in this release.

| Profile | Configuration | Reference run |
|---|---|---|
| First cell | One newly plated precursor-like neuron, shallow culture | 24 h |
| Soma & one process | One immature cell, one permitted primary process, branching off | 12 h |
| Growth cone close-up | One immature cell, three processes, branching off | 16 h |
| Branch formation | One immature cell, increased branch initiation | 36 h |
| Two-cell encounter | Two seeded cells at higher density; no imposed connection | 24 h |
| Developing culture | Six seeded cells | 24 h |
| Patterned substrate | Three cells in channels bounded by finite walls | 24 h |
| Growth in a gel | Three cells in a 360 × 200 × 300 µm volume | 24 h |
| Injury & repair | Two proximal neurons, support agents, a 300 µm abstract gap | 48 h |
| Neural interface culture | Four cells, channels and inert electrode surfaces | 24 h |

The culture is motivated by early rat hippocampal development, not a specified replicated plating protocol. “Precursor” is a morphological starting condition, not a stem-cell differentiation model. Gel chemistry, species and matrix modulus are not fitted. The repair setup has no assigned species or named nerve; it is a microscale mechanism experiment, not a rat sciatic-nerve prediction. Electrodes provide geometric exclusion, not an electric field.

## State, units and mechanics

Growth uses **µm, hours and pN** throughout the engine, preserving the audited mechanical modules' units. The design draft proposed minutes; this implementation retains hours and labels all clocks, rates and exports accordingly. Electrical assays use **ms, mV, pA, pF and nS**. Coordinates are right-handed x/y/z, with y normal to the dish. Microscopy projects x–z; the structural view is an orthographic projection with orbit controls.

Each soma has a 162-vertex triangulated cortex, a nucleus, elastic area/volume terms, local actin/MT variables and substrate attachments. Overdamped mechanics couple soma movement to distributed shaft loads. Each shaft stores radius, geometric and stress-free length, adhesive anchor, age and MT support. Bending and axial forces act on shared junctions. New growth deposits stress-free shaft length. Mechanical displacement and slower rest-length remodeling are distinct from new growth.

A quasi-steady motor/clutch closure computes traction and retrograde flow. A positive net drive, available membrane and delivered cargo constrain extension. The gel profile supplies an explicit reduced MT-based drive without requiring substrate adhesion. This is a mechanism-level regime switch, not a reconstructed 3D cytoskeleton.

Growth cones have independent stochastic extension/pause/withdrawal episodes, local lamellar sectors and finite filopodia. Collision sweeps test finite geometry. Terminal splitting and shaft buds are separate pathways. Bud survival and MT consolidation are phenomenological rules. Apparent image crossings may be separated in y.

New processes are `minor`. After the eligible developmental stage, the leading root family's total live length must exceed 12 µm and the second largest by 18%; the selected length/guidance score must persist for one hour. One root family becomes axonal and the others dendritic. These thresholds are declared model assumptions, not measured fate determinants. They are computed from physical state, independent of the renderer. Lesion-induced repolarization is not implemented.

## Excitation alternatives

Only one excitation hypothesis is selected at a time; their growth drives are not summed.

* **Local activity:** root initiation events feed a local activator `a` and recovery `h` on the graph: `da/dt = 45a(1−a)(a−0.16) − 10ha + 12(a_parent−a)`, `dh/dt = 1.6a − 0.7h`. Explicit substeps are at most 0.005 h, with declared bounds. These dimensionless variables are not measured calcium or actin concentrations. Coupling is per graph segment, so changing spatial resolution requires reassessment.
* **Traveling packets:** independently timed events move along the graph at 120–180 µm/h. Packet arrival changes local activity rather than directly inserting a fixed neurite length. The speed range is motivated by the DIV1 culture in [Winans et al. (2016)](https://elifesciences.org/articles/12387); other coefficients are exploratory.
* **Soma oscillator:** an explicitly assumed 2.5 h phase cycle selects one root, excites it and temporarily inhibits other roots before polarity selection. It is a reduced hypothesis motivated by [Lin et al. (2026)](https://pubmed.ncbi.nlm.nih.gov/42420447/), not that paper's fitted molecular mechanism. Coordination ends after an axonal root is selected.
* **Tonic drive:** a comparison condition without an activity multiplier. Stochastic exploratory/retraction state still exists.

Wave-driven outgrowth is not a universal assumption: [a contrasting 2017 study](https://pubmed.ncbi.nlm.nih.gov/29326552/) reported different wave/outgrowth relationships. These alternatives permit mechanism comparisons; this release has not selected a winning hypothesis against biological data.

## Separate material accounts

Membrane reserve is an area budget in µm². Cytoskeletal cargo is an abstract **µm-equivalent of newly deposited shaft**, not molecular mass, ATP or tubulin molarity. A cell begins with 200 equivalents and receives up to 24 equivalents/hour by default. The free pool is capped at 400; tips request up to 16 equivalents/hour toward a stock-plus-transit target of 24.

Parcels withdraw from the shared free pool and travel at 120 µm/h by default along the saved ancestral segment path to the destination tip compartment. They are not duplicated at branches. Their dispatch route is fixed; subsequent distal extension is treated as part of the terminal supply compartment. This approximation does not resolve transport to a continuously moving physical growth-cone boundary.

The invariant is `initial + supplied = free + tip stock + in transit + incorporated + lost`. Growth consumes stock; withdrawal recycles 60% and records 40% as loss. Dead destination/routes refund undelivered parcels to the soma. “Incorporated” is the model's material ledger, not the current sum of geometrical or remodeled rest lengths. Radius changes and viscoelastic remodeling are not a complete molecular-volume conservation law.

## Environment and repair

Gel and repair use a scalar relative guidance cue with `dc/dt = D ∇²c − kc + source`. Defaults are D = 1800 µm²/h, k = 0.2/h, grid spacing 20 µm. Source/decay uses analytic half updates around finite-volume diffusion. The explicit diffusion step is bounded by `0.8 Δx²/(6D)`; no-flux outer and masked boundaries are supported. Field updates also respect a requested maximum interval, 0.05 h by default. Source strength is relative, not a concentration of a named ligand. The visual field is a y≈0 slice normalized to the current maximum.

The repair profile has 12 explicit **effective support agents**, six per end, moving toward the gap centre at up to 2 µm/h times the support setting and depositing relative cue. They are not interchangeable simulated astrocytes, macrophages and Schwann cells. Current front separation, current/ever bridge and first formation time are saved. A bridge means the two leading support fronts are within 20 µm. It does not establish axonal crossing, reinnervation, myelination or recovery. Matrix deposition, immune clearance, vascular guidance and cell-type-specific repair physiology remain unimplemented. Culture “contact support” is a scalar maturation factor, not a resolved astrocyte population.

The patterned environment uses walls, not a quantitatively calibrated ligand coating. The inherited effective contact stiffness is not presented as a measured Young's modulus.

## Contacts and electrical assays

Contacts require local physical encounters and compatible axon/dendrite identities from different cells. They progress through apposition, candidate, structural and functional states, with separate presynaptic/receptor/conductance variables. Separation, loss of adhesion or removal of a bearing segment can retire a contact. [Christopherson et al. (2005)](https://pubmed.ncbi.nlm.nih.gov/15707899/) motivates distinguishing structure from postsynaptic function; it does not calibrate these rates.

Both electrical tests freeze growth and use the current morphology/contact graph:

1. **Passive tree cable:** soma plus a node at each live shaft endpoint; half of each shaft's membrane area is assigned to each endpoint. Axial conductance is `10⁵ πr²/(Ra L)` nS for r,L in µm. Backward Euler and tree elimination solve the coupled voltages. Illustrative defaults are Cm = 1 µF/cm², leak = 0.1 mS/cm², Ra = 150 Ω·cm, resting voltage −65 mV and a 10 pA soma pulse from 20–80 ms. These are assumptions, not sourced measurements of the grown preparation. Minimum electrical edge length is 0.1 µm. There are no active channels or action-potential conduction claims.
2. **Reduced network:** point-neuron conductance-based integrate-and-fire cells, 220 pA at the selected cell from 20–80 ms, 200 ms assay window, 0.05 ms step. Only retained functional contacts can transmit. A matched transmission-blocked run separates source firing from transferred events. No functional edges means no transmission, even when cells appear connected in projection.

Activity-dependent structural growth and extracellular electrode-field calculations are outside this release.

## Saving, performance and verification

The worker owns all physical state. Camera, view, selection and display refresh cannot change the simulation. The growth step defaults to 0.05 h, mechanics have finer internal substeps, and excitation/fields have independent update constraints. The browser processes growth in 0.1 h chunks, yielding between chunks, and emits observations at most approximately every 150 ms. This is a throughput policy, not a claim of 60 frames/s.

The timeline retains the last 16 complete checkpoints, taken every 2 h and on explicit boundaries. Resume restores actual state and discards later timeline entries. The JSON export contains geometry, material, fields, random streams, contacts, history and interventions. Summary history is hourly, event history retains the last 300 events, and the intervention log allows 2,000 actions. CSV contains summary measurements; SWC contains the selected live cell, with type 0 for uncommitted processes. Legacy checkpoints and SWC are not accepted as complete V5 continuation states.

The UI horizon is 168 h; the core accepts up to 720 h. Default budgets are 18,000 allocated segments and 32 active tips/cell. Segment or attempted tip-budget exhaustion stops growth with an explicit computational-limit message. Contacts and exploratory buds also have fixed recorded implementation limits. Snapshot import is capped at 32 MB. These limits are not biological death or arrest mechanisms.

Run `node --test tests/neural-growth-v5.mjs` and `node scripts/verify-neural-growth-v5.mjs`. The latter executes the tests, all ten advertised reference runs, exact checkpoint continuations, diffusion/cable diagnostics and a small stochastic growth timestep comparison, then writes the public and repository verification reports. Those reports hash the actual source files tested. Tests include force/torque balance, energy gradients, topology after cutting, material conservation, field positivity, analytic RC charging, electrical refinement and worker comparison/replay.

Full coupled mesh/segment/field-grid convergence, optical validation, kymographs, dense trajectory recordings, cell-type-specific tissue models, preparation calibration and held-out prediction remain open work. The four prior laboratories remain available. No inherited test result or legacy recording is counted as biological validation of V5.

Additional mechanism sources: [Dotti et al. (1988), culture polarity](https://pubmed.ncbi.nlm.nih.gov/3282038/); [Santos et al. (2020), adhesion-independent 3D CNS growth](https://pubmed.ncbi.nlm.nih.gov/32698008/). These support particular modeling questions, not all numerical coefficients or environments.
