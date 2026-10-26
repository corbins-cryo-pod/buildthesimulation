# Cell Growth Lab — scientific model and implementation register

The Cell Growth Lab is a coarse-grained mechanochemical morphology model. Its
purpose is to make local growth decisions inspectable: how cytoskeletal state,
membrane demand, physical constraints, guidance, branching and contact change the
arbor produced by a developing neuron.

This document accompanies `/simulations/cell-growth/methods/`. The source of truth
for exact implemented formulas is `src/lib/cell-growth/engine.js`. Literature
supports mechanisms, while the release's numerical coefficients and developmental
clocks are exploratory choices. No parameter fit to a specific human cell line,
organoid protocol, injured nerve or biohybrid implant is claimed.

## 1. Evidence classes

| Class | Meaning |
| --- | --- |
| Experimental mechanism | A reported behavior or mechanism in a specified biological preparation. |
| Model assumption | An explicit mathematical reduction used by this engine. |
| Exploratory parameter | A chosen coefficient, geometry or time that has not been estimated for the user's target preparation. |
| Numerical verification | Checks on geometry, state, reproducibility and the implemented equations. |
| Empirical validation | Agreement with independent biological data; requires a separate calibration and validation study. |

The model is not a molecular dynamics simulation. A rendered surface is not a
resolved lipid bilayer. A force value in pN is an output of an assumed force law,
not an experimental measurement. A candidate geometric connection is not a
functional synapse.

## 2. Scientific rationale

Growth cones couple actin protrusion, retrograde flow, adhesion, membrane mechanics
and microtubule organization. The motor-clutch framework provides one route from
adhesion to traction [1], and membrane tension participates in the mechanical
balance [2]. Those components should affect the evolving state, rather than act
as independent animation controls.

Microtubule stabilization can participate in axon specification in cultured
hippocampal neurons [3]. Dendritic arbor development includes both extension and
retraction [4]. Cell-identity-dependent recognition supports self-avoidance in
particular mammalian neuron classes [5]. These findings motivate separate axon,
dendrite and contact rules rather than treating every process as the same random
line.

Mechanisms vary with environment: CNS axons have been shown to extend without
adhesions in particular 3D matrices [6]. Consequently, an adhesive plate model
cannot be advertised as an established law for organoids. Mechanical loading can
cause collapse and retraction [7], but an assay's pressure threshold is not a
universal collision-force constant. Axon branching and elongation have different
cytoskeletal requirements [8].

## 3. Implemented equations and units

The fundamental interpretation is overdamped: movement responds to local driving
and resisting terms. Physical units are micrometres for geometry,
hours for developmental time and piconewtons for forces. Force, surface tension
and stress must not be interchanged: their units are pN, pN/µm and pN/µm²,
respectively. An effective spring stiffness in pN/µm is not an elastic modulus
in kPa without a specified geometry.

### Representation (version 3)

Each soma is a **moving, deformable 162-vertex / 320-face closed cortex**. Its
nominal radius remains 6.8–7.7 µm; the culture initialization is flattened with
small fixed cell-to-cell shape differences. The membrane coordinates, nucleus
position, polarity, actin/MT fields, adhesion occupancies, contact reactions and
migration history are numerical state. No path or final cluster layout is given.
Neurites remain finite-radius trees. Their root vertices are attached to the
actual cortex; distal shafts remain substrate-anchored instead of translating
an entire arbor with its cell. Positive root stretching consumes extension
reserve and shortening recycles it under the same ledger as growth/retraction.

WebGL renders the solved cortex, spherical nucleus, overlapping finite-radius
shaft capsules and force-dependent growth-cone surfaces. A rotatable software
3D renderer uses the same state automatically when WebGL is unavailable.
Structural, brightfield-inspired, fluorescence-inspired and mechanical views
are color/lighting conventions, **not optical image-formation predictions**.
Individual internal filament lines are illustrative representations of coarse
MT support; they are not individually simulated polymers. Display radius gains
apply only to neurites/cones; measurements and collisions use physical radii.

### Quasi-steady clutch closure

The mean-field clutch calculation is a custom closure, not a replication of the
published stochastic model in [1]. Let `k_s` be the effective substrate spring
stiffness, `k_c` the clutch spring stiffness, `a_d` adhesion, and `v_r` retrograde
flow. At each iteration:

```text
k_eff = k_s k_c / (k_s + k_c)
f = F_b ln[1 + k_eff (v_r/3600) / (k_off0 F_b)]
k_off = k_off0 exp[min(15, f/F_b)]
occupancy = k_on / (k_on + k_off)
F_traction = N_clutch a_d occupancy f
v_target = v_unloaded / (1 + F_traction/F_stall)
v_r <- 0.5 v_r + 0.5 v_target
```

The calculation starts at unloaded flow and performs 24 iterations. The division
by 3600 converts µm/h to µm/s. Rates are in s⁻¹; all resulting forces are pN.

| Baseline | Value | Provenance |
| --- | --- | --- |
| Unloaded retrograde flow | 66 µm/h | Exploratory |
| Clutch spring stiffness | 600 pN/µm | Exploratory |
| Binding rate | 0.4 s⁻¹ | Exploratory |
| Unloaded unbinding rate | 0.12 s⁻¹ | Exploratory |
| Bond force scale | 2.5 pN | Exploratory |
| Effective motor stall scale | 55 pN | Exploratory aggregate scale |
| Available clutch sites | 42 | Exploratory |
| Default effective substrate stiffness | 100 pN/µm | Exploratory; not kPa |

Traction affects the retrograde-flow closure. It is a diagnostic, not a separate
additive term in the following net-force equation.

### Extension force and microtubule support

Let `a` be the actin multiplier, `u` the microtubule multiplier, `S` dimensionless
cell supply, `R` reserve fraction, and `m` microtubule support:

```text
v_poly = 64 a (0.65 + 0.35 S)                    µm/h
F_actin = eta max(0, v_poly - v_r)               pN
F_MT = eta v_MT min(a, 1) m                     pN
F_membrane = 2 pi r_eff gamma                   pN
F_net = F_actin + F_MT - F_membrane             pN
v_tip = max(0, F_net/eta) g_kind g_age m_support min(S, R)

eta = 3 pN h/µm
v_MT = 12 µm/h in organoid mode; 8 otherwise
r_eff = 0.52 µm axon; 0.85 µm dendrite
g_kind = 1 axon; 0.58 dendrite
g_age = clamp((developmental age - 8 h)/6 h, 0.2, 1)
m_support = 0 if u=0; otherwise m
```

Microtubule support relaxes exponentially to
`clamp(u*(0.35+0.65*S),0,1)` with time constant 1.8 h, or 1 h when u is zero.
Established shaft support relaxes toward `min(1,u*S)` over 8 h.
The effective radius in the tension force is a declared fixed parameter, not
necessarily the radius of the current shaft or a filopodium. All coefficients in
this closure are exploratory. The fact that a=0 removes both active terms is a
chosen reduction; it is not a universal biological conclusion about actin in 3D.

Direction is calculated separately. The direction update normalizes the old
direction plus `0.8*dt` times cue, environment, avoidance, alignment and noise
terms. These are dimensionless steering weights, not solved receptor kinetics or
a tissue traction-stress field. Noise is an Ornstein–Uhlenbeck state with
correlation time 1.5 h and innovation standard deviation
`noise*0.65*sqrt(1-exp(-2*dt/1.5))`. Plate y noise is zero.

### Material accounting

The available extension-area capacity is `C=1.5*A_initial_soma_mesh`. Reserve R
starts at one. At each step:

```text
support(position) = 1 outside organoid mode
support(position) = clamp(|soma position|/100 µm, 0.28, 1) in organoid mode
S_target = support(position)/(1 + 0.035 max(0, activeTipCount-5))
S <- clamp(S + (S_target-S)*(1-exp(-0.5*dt)), 0, 1)
deltaR_supply = (1-R)*(1-exp(-0.8*membraneSupply*dt))
R <- R + deltaR_supply
suppliedArea <- suppliedArea + C*deltaR_supply
gamma = 7*tensionGain*(1+4*(1-R)^2)               pN/µm
```

An extension is bounded by `R*C/(2*pi*currentRadius)` as well as its calculated
speed. Actual cylindrical area demand `2*pi*addedRadius*deltaLength` is subtracted
from R and accumulated in `usedArea`. Each added micrometre also decreases S by
0.0007. Retraction returns 60% of the removed cylindrical area, subject to
available capacity, and accumulates `recycledArea`. With the initial reserve
included, the model budget is:

```text
R*C = C + suppliedArea + recycledArea - usedArea
```

Initial seed processes are pre-supplied. Radius changes on axon assignment,
soma-shell area changes and lipid trafficking are not included in this extension
budget. Therefore this is explicit extension-resource accounting, not a complete
whole-cell lipid balance. The radial organoid multiplier is phenomenological; no
oxygen, nutrient reaction-diffusion or metabolic model is solved.

### Deformable membrane, cortex and nucleus (V2)

The numerical implementation is `mechanics.js`. With fixed graph topology, edge
lengths l, initial rest lengths l0 and umbrella graph Laplacian L:

```text
E = gamma A + KA/(2 A0) (A-A0)^2 + KV/(2 V0) (V-V0)^2
    - p0 (V-V0) + sum_edges ke/2 (l-l0)^2 + kb/2 sum_i |Lx_i|^2
p0 = 2 gamma / cbrt(3 V0 / (4 pi))
F_passive = -gradient(E)
```

KA=45 pN/µm; KV=180 pN/µm²; ke=48 × cortexStiffness pN/µm;
kb=24 × bending pN/µm. The curvature regularizer uses the **full L-transpose L
force**, is rotation/translation invariant, and is verified by finite differences.
It is not a continuum Helfrich discretization or a mesh-independent bending
modulus. Pressure p0 approximately balances baseline tension; penalty stiffness
controls the residual volume error. Area/volume targets are the actual initial
mesh values. The old 94–106% radial clamp has been removed.

The overdamped vertex update is x += dt F / zeta with zeta=3 pN h/µm and
substeps no larger than 0.0125 h. A line search rejects reversed faces, quality
below 0.10, volume below 65% of target, infeasible rooted processes, insufficient
root-stretch material, and penetrating conservative contact envelopes. This is
an explicit constrained solver, not a claim of unconditional stability. The
rejected-step count is retained in JSON. Mesh quality is 4 sqrt(3) A_triangle /
sum(edge²), with 1 for an equilateral triangle.

A rigid spherical nucleus of radius 0.38 times the nominal radius has a separate
position, drag 45 pN h/µm and 70 pN/µm centroid tether. Coarse MT spokes are radial
springs with stiffness 0.9 m_i pN/µm. Both tether and spokes apply equal/opposite
forces to nucleus and cortex. Outward face-plane constraints contain the nucleus.
This does not resolve nuclear envelope deformation or chromatin mechanics.

### Active cortex, adhesion and locomotion

Each vertex tracks actin, MT support and adhesion occupancy. Frontness is the
positive projection of its radial direction on a persistent cell polarity.
Actin relaxes to 0.12+0.88 front² over 1.2 h; MT support relaxes to
clamp(microtubules × (0.2+0.7 front),0,1) over 3 h. The active radial load is
18 × motility × actinControl × stageGain × (actin_i - 0.42 contractility rear).
Its mean is subtracted from all vertices: these internal protrusive/contractile
forces **cannot translate an isolated cell by themselves**.

Adhesion is integrated analytically during each substep:

```text
access = exp(-gap_to_dish / 2 µm) in culture, otherwise 1
on  = 5 adhesion (0.15 + front) access             h^-1
off = 0.8 (1 + 4 rear contractility)               h^-1
b_next = on/(on+off) + (b-on/(on+off)) exp(-(on+off) dt)
```

The substrate contact term is -3 b gap exp(-gap/2) pN along vertical y, with
impenetrable dish plane y=-5.8 µm. Transmitted motor traction is along polarity:

```text
T_i = gain Fmotor b_i front² stiffness/(stiffness+100) / (1+2 adhesion²)
gain = motility actinControl stageGain
Fmotor = 620 pN on the dish, 110 pN in the embedded-matrix modes
stageGain = 1 stem/precursor, 0.45 immature, 0.20 polarized, 0.08 maturing
```

85% of total traction is distributed through the cortical network, 15% remains
local. This is a declared coarse transmission closure. It is counted only once.
At zero adhesion there is no net motor traction. Rear detachment is faster, and
contact inhibition/cue steering rotates polarity; no random displacement is
added. Matrix-mode traction is a phenomenological effective coupling, not a
validated transfer of dish adhesion kinetics to organoids.

Short-range cell adhesion acts only within 7 µm between conservative soma
envelopes, with force 900 × cellAdhesion × (1-gap/7) pN. There is no prescribed
cluster center. Envelopes conservatively enclose every shell vertex and exclude
other cells, foreign shafts and solids. This prevents penetration but does not
resolve exact triangle-to-triangle cell contact or cells squeezing through gaps
smaller than their bounding envelope. Contact-turning, constraints and deformation
change subsequent movement. Functional synapses are not inferred.

## 4. Developmental state

The initial precursor state represents competence to develop processes. It is
not a simulation of pluripotency, cell reprogramming, a differentiation protocol,
gene regulatory networks or molecular lineage commitment. A stage change enables
model behavior under explicit rules; it does not reconstruct every biological
event that normally precedes that change.

The developmental clock is assumed. Ohara et al. observed comparable early
morphological stages but slower axonal growth in their human iPSC-derived neurons
than in their rat comparison [9]. The model therefore must not equate an assumed
stage reached at a displayed hour with the completion of a human stem-cell
differentiation protocol.

The internal developmental age is elapsed age plus an offset: -48 h for stem,
0 for precursor and +8 h for immature. At internal age 8 h, four to six
2.5-µm seed processes are created. At 18 h one root arbor is assigned axonal
identity; at 48 h the state label becomes maturing. Thus stem-like starts initiate
at elapsed 56 h and polarize at 66 h, while precursor starts initiate at 8 h and
polarize at 18 h. An immature start begins with its seed processes and polarizes
at elapsed 10 h.

Axon selection maximizes total root-arbor length plus 6 µm times the root
direction's dot product with the cue direction. The complete selected root arbor
is reclassified. This is a length/orientation heuristic, not an emergent
microtubule-driven competition or a gene-regulatory polarity model. The maturing
label does not establish functional maturity.

## 5. Separate axon and dendrite analysis

### Dendrites

The useful unit of analysis is a growing and retracting arbor, not just a final
picture. Record branch births and deaths, branch order, branch lifetime, total
length, surviving tips and spatial coverage. Sholl intersections summarize
crossings of concentric shells around a soma; they do not alone identify a cell
type or establish functional maturity.

Self-avoidance should discriminate between same-cell and different-cell
processes. Avoidance of one's own arbor and population-level tiling are not
synonyms. Other cells' arbors may interdigitate while physical material still has
finite volume. These behaviors must be tested separately.

### Axons

Separate persistent extension, steering, target approach and collateral
branching. Quantify both path length and net displacement. Tortuosity helps
distinguish long but inefficient wandering from progress along a target axis.
An axon may align with an encountered process, turn, stall or retract depending
on local model rules. None of those geometric outcomes identifies a particular
cell adhesion molecule by itself.

Branching is not merely faster elongation. A control that changes branch hazard
must be distinguished from a control that changes tip advance. In biological
comparisons, perturbations may also alter both simultaneously; interpretation
requires matched measurements.

### Implemented process rules

| Rule | Axon | Dendrite |
| --- | --- | --- |
| Extension gain | 1 | 0.58 |
| Baseline tip-splitting hazard | 0.005 h⁻¹ | 0.012 h⁻¹ |
| Branch angle | 0.35–1.00 rad | 0.35–1.35 rad |
| Initial shaft radius | 0.52 µm | 1.05 µm |
| Minimum shaft radius | 0.23 µm | 0.30 µm |
| Low-driver retraction rate | 1.5 µm/h | 2.5 µm/h |
| Nearby-process rule | Align with other-cell axons | Avoid same-cell processes |

Branch hazard is multiplied by `branching*S*m/(1+0.3*branchOrder)`, and each step
uses `p=1-exp(-hazard*dt)`. Branching requires age≥3 h, support m≥0.45, reserve≥0.2,
an extending state, nonzero actin/MT controls, order<5 and remaining tip capacity.
Tip splitting is rare. Collateral branches instead start as visible shaft buds.
The per-cell bud hazard is `0.12 * branching * min(5, eligibleLength/70)` h⁻¹,
integrated as a saved exponential-hazard clock. Eligible non-root nodes are at
least 1 h old, have one continuation, lie outside the soma envelope plus 6 µm,
and have branch order below five. A bud starts at 0.1 µm, aims for 2.3–4.7 µm,
extends at `4*actin` µm/h and retracts at 5 µm/h. It must exceed 2 µm, survive
0.65–2.35 h, and have local MT support >0.45 and reserve >0.25 to consolidate.
The retained branch then extends through the ordinary swept growth solver.
Transient buds are sensing/protrusion geometry outside the retained-shaft area
ledger, as are exploratory filopodia; whole-cell lipid conservation is not claimed.

Filopodial precursors are chosen with probability 0.65. Their illustrative
persistent fraction is 0.62, versus 0.34 for lamellar precursors. Nonpersistent
lifetimes are 0.2–1 h; persistent lifetimes allow the consolidation delay plus
1 h. New retained branches receive stability factors 0.82 or 0.45 respectively.
For the first five hours their pruning hazard is `(1-stability)*0.10` h⁻¹ for
axons or `(1-stability)*0.24` for dendrites. These are exploratory choices inspired
by precursor-dependent branch survival, not fitted hazard ratios. No more than
eight unresolved buds and 32 active tips per cell are admitted by default.

Physical capsule radius tapers by 0.996 between ordinary segments and by 0.79 on
a higher-order branch, with identity-specific bounds. A continuous visual
profile is reconstructed inside those conservative capsules; it is explicitly
separate from the cylindrical material ledger and SWC radius.

### Local growth, traveling packets and exploratory contacts (3.0)

The supplied recordings (172638, 172736 and 172913, 2026-10-25) and primary
research movies were inspected as time-ordered frame sequences. See
[V3_RESEARCH.md](V3_RESEARCH.md) for the observation-to-implementation record.
Unknown recording species, scale and time intervals are not inferred.

Independent tip episodes retain the 2.1 growth/pause/retraction process: growing
intervals 0.3–1.5 h, pauses 0.2–1.7 h, occasional retractions 0.1–0.35 h, and an
analytically integrated 0.12 h relaxation toward gains 1.8, 0 or −0.3. They are
now combined with finite-speed actin-associated packets. Each root has its own
saved source RNG and waiting time. Immature roots launch at 1.4 h⁻¹, polarized
roots at 0.77 h⁻¹ and maturing roots at 0.35 h⁻¹. Speeds are sampled over
120–180 µm/h, anchored to the 2–3 µm/min range reported by Winans et al. for
DIV1 rat hippocampal culture. The source frequency and its stage multipliers
are model choices, not a universal measured rate.

Packets traverse the actual retained tree and choose one daughter, rather than
stimulating all tips together. Arrival adds 0.65–1 to a local pulse (cap 1.6)
that decays with a 0.42 h time constant. The episodic/wave mixture weights the
wave term by 0.88, 0.48 or 0.12 with developmental stage. Growth episodes = 0
restores continuous drive and removes packets. Negative local episodes retract
at up to 0.9 µm/h, scaled by the control. Zero actin or zero MT support prevents
packets and stable extension. This is a transport/activity proxy, not a
reaction–diffusion model, vesicle tracker or electrophysiological simulation.

Nine filopodia and twelve lamellar sectors have individually saved renewal
streams. Filopodia have exploratory lengths up to 7 µm, free extension speed
26 µm/h and faster withdrawal; membrane load shortens the visible length.
Extension and withdrawal durations have separate exponential draws and directions
renew near collapse, so the cone is not a rotating or breathing star. Every
protrusion sweeps finite geometry against obstacles, foreign shafts/cones,
somata and boundaries. The rates are exploratory. Sector activity relaxes with
a 0.075 h time constant and drives the asymmetric membrane rim.

Young unbranched shaft joints within ten ancestors of an active tip relax
locally toward the straight chord, with 0.22 h⁻¹ mobility attenuated by adhesion
and age, and a 0.6 µm/h displacement ceiling. Shafts aged 12 h or more and branch
junctions remain anchored. Expanded candidate envelopes contain the entire
joint sweep, and positive/negative area changes consume/recycle the membrane
reserve. This is a local overdamped reduction, not a whole-tree elastic solver.
Plate crossing routes remain a geometric approximation checked by the same
finite collision constraints.

The save version is 3.0.0. Earlier versions are rejected explicitly because their
stochastic state and growth rules differ. Display interpolation never enters
physics, measurements, random streams or exported state.

Nearby-process steering acts within 12 µm. Same-cell repulsion is applied to
dendritic tips; alignment applies to axon tips near another cell's axon. The hard
collision constraint is still present when the recognition weights are zero.
Noise, guidance and branching share a saved seeded random state; changing the
events can alter later random draws and trajectories.

Speed below 0.02 µm/h for more than 2 h permits retraction when an active driver
is zero, reserve<0.08 or net force<0. Persistent non-neurite collision for over
1.8 h permits retraction at 2.2 µm/h. Retraction removes distal segments along
their actual path and stops before removing a parent with surviving children.
These are specified state rules, not a model of calcium signaling or
activity-dependent synaptic pruning.

## 6. Collision and connection semantics

Physical collision, contact-dependent behavior and functional connection are
separate concepts. Finite-radius geometry must reject a penetrating extension
even when a large timestep places its endpoint beyond the obstacle. Contact
behavior may then steer, pause, align or retract the tip; it should not be
represented as an inertial bounce.

Full segment bounding boxes are entered in a spatial hash with 16-µm cells.
The narrow phase uses swept point/sphere, point/capsule and expanded-box
intersections. Sphere
and capsule intersections are analytic. A box expanded independently along all
axes is conservative at its corners. Somata use a conservative spherical
envelope equal to the greater of the maximum solved vertex radius and 1.06 times nominal radius, rather than exact triangle collision.
Adjacent parents and shared branch junctions have explicit geometric exclusions.

For rigid obstacles, somata and world boundaries, the effective moving cone
radius is the maximum radius of the solved growth-cone rim (initial values 1.8 µm for axons and 2.1 µm for dendrites). Neurite–neurite exclusion uses
the shaft radii. Moving cones exclude foreign shafts and foreign active cones using their current rim envelopes; local constraints compress the rim. Shared same-cell branch junctions are excluded. The cone rim has twelve overdamped radial degrees of freedom driven by its actin, MT and membrane state; the collision envelope remains conservative. An additional
check of the proposed terminal-shaft chord prevents corner cutting by an
endpoint update. The accepted extension stops short of first contact;
direction turns toward a tangent with a small outward contribution. The solver
does not move pre-existing neurite shafts in response to these contacts.

A crossing on screen can also be a projection of spatially separated 3D
processes. The underlying coordinates, not the rendered overlap, determine
contact. Artificial visual enlargement of a neurite must never alter the
collision radius silently.

Geometric apposition provides a candidate for later synapse formation. Maturation,
recognition, synaptic machinery and cellular interactions affect receptivity
[10]. Structural candidates alone do not demonstrate vesicle release,
postsynaptic response, reliable transmission or target-specific function. The
growth clock also must not be confused with an action-potential timescale.

Only an axon/dendrite encounter between different cells can register a candidate.
Repeated encounter accumulates dwell time; a gap exceeding 1.5 current timesteps
resets dwell. At 0.3 h the record is promoted. After growth, contact registration
updates the linked segment identities. At every solver step a record becomes
lost if either linked segment is removed or their exact closest-centerline
distance exceeds the sum of their shaft radii plus 0.5 µm. A renewed encounter
after loss begins a new dwell interval. Thus a candidate requires continued
geometric proximity but has no solved mechanical bond or synaptic machinery.
Candidate counts are distinct from the total count of apposition records.

## 7. Environmental interpretation

| Context | Scientific question | Interpretation boundary |
| --- | --- | --- |
| In vitro plate | How do surface interactions, obstacles, neighboring processes and local cues shape an arbor? | Coating chemistry, media composition and a specific culture protocol are not inferred from generic coefficients. |
| Organoid volume | How do 3D confinement, crowding and local environmental terms alter growth? | No complete organoid self-organization, cortical layers, ventricular zones, vasculature or tissue folding. |
| Nerve regeneration | How do guidance geometry, obstruction, extension and branching affect traversal? | No clinical recovery, functional target reinnervation, scar remodeling or patient regeneration rate. |
| Biohybrid interface | How do living processes approach and organize around a scaffold or interface? | No electrode seal, recording sensitivity, functional living electrode or chronic integration prediction. |

The default plate is unpatterned, spans ±900 µm in x and z, and has zero
imposed guidance. Selecting the obstacle assay adds finite sphere/box solids;
a localized cue direction matters only when guidance gain is positive. The
organoid domain is a sphere of radius 185 µm with a 29-µm central lumen; inward
axon and outward dendrite radial steering are prescribed, not emergent cortical
organization. Regeneration initializes proximal/distal groups, conduit walls and
scar obstacles. Biohybrid mode initializes graft/host groups with channel and
inert-electrode obstacles. No field from those electrodes is solved.

Success in one context does not validate the others. Each requires its own
initial conditions, parameter provenance and independent dataset. The presets
are model experiments, not empirical claims that all four biological systems
share one calibrated growth law.

Myelination is outside this release. There is no Schwann-cell or oligodendrocyte
wrapping process, internode formation, g-ratio, saltatory conduction or
remyelination. Mechanical membrane calculations do not imply membrane voltage,
ion-channel kinetics, spiking or extracellular recording calculations.

## 8. Verification, uncertainty and empirical calibration

See `docs/cell-growth/VALIDATION.md` for the numerical acceptance criteria.
Geometric tests, finite-state checks, deterministic replay, resource sensitivity
and timestep refinement verify the implementation within tested conditions.
They do not constitute a biological validation dataset.

The generated quantitative evidence is `src/data/cell-growth-validation.json`.
It records the model version, exact conditions, acceptance criteria, measured
results, source SHA-256 hashes and Node runtime. Reproduce it using:

```sh
node --test tests/cell-growth*.mjs
node scripts/validate-cell-growth.mjs
node scripts/validate-cell-growth-mechanics.mjs
node scripts/validate-cell-growth-cohort.mjs 16
npm run build
node scripts/verify-cell-growth-build.mjs
```

The default growth step is 0.05 h. A new segment is created once its predecessor
has reached roughly 2.5 µm; a single movement can exceed that nominal segment
length. Full-path collisions still apply. A fixed-duration call is subdivided
into numerical steps and a possible final partial step. The default allocation
cap is 18,000 segments, including retired segments; hitting it stops further
stepping. This is the global default used by the culture and regeneration
presets; the organoid and biohybrid presets explicitly raise the budget to 26,000.
Requested duration and simulated duration must be reported separately when a
budget stops a run. The generated environment studies record both durations,
their allocation budgets and whether a cap was reached. The engine accepts at
most 720 modeled hours overall, while the worker workbench imposes tighter
interactive horizons.

Metrics include separate axon/dendrite lengths, branch nodes and order counts,
active tips by identity, longest paths, radial reach, shaft area, mean cone speed,
live/allocated segments, candidates/appositions, and membrane state. Longest
paths start on the soma surface; reach is measured from the soma center. Shaft
area sums cylinder lateral areas separately from the soma mesh area. Collision
episodes combine consecutive hits by one tip on one modeled object; another
object or a gap longer than 1.5 timesteps begins a new episode. Internal collision
steps and retraction steps remain update counts. Sholl uses exact
segment–sphere intersections at 15, 30, 45, 60, 90, 120, 160, 200 and 260 µm and
returns combined (`sholl`), axon-only (`shollAxon`) and dendrite-only
(`shollDendrite`) profiles per cell. Summary history is sampled
approximately hourly (cap 1,450) and events retain the most recent 300 entries.
Saved JSON preserves topology, state, clocks and PRNG state. CSV is summary
history; SWC is one cell's morphology, not the complete mechanical model.

Different random seeds are different model realizations, not biological donors.
A spread across seeds is not a clinical confidence interval. Coefficient
uncertainty, structural model uncertainty and stochastic variation should be
reported separately when experimental fitting is introduced.

### Minimal calibration study

1. Fix one preparation: species, neuronal class, cell line, differentiation stage,
   coating, matrix, density and imaging protocol.
2. Collect time-lapse trajectories with independently annotated axons and
   dendrites. Record extension/retraction speed distributions, turning,
   branch lifetime/order, Sholl profiles and contact outcomes.
3. Add at least one mechanistic observation or perturbation: actin flow,
   microtubule state, traction, membrane area or tension. Morphology alone rarely
   identifies all coefficients uniquely.
4. Fit only a limited parameter set. Separate fitting cells/experiments from
   held-out cells, times and perturbations. Lock the model before the held-out
   assessment; publish residuals and failed cases.
5. Require simultaneous agreement with several observables. Total length alone
   can be matched by incorrect combinations of growth and retraction.
6. Repeat validation in each environment. Add electrophysiological or controlled
   functional-imaging measurements before calling structural candidates
   functional synapses.

Useful future extensions include reconstructed cell-class priors, local
mechanochemical calibration, stronger three-dimensional tissue models,
experimental morphology import and a separately verified electrical model on the
grown tree. These are future directions, not implemented capabilities.

## 9. Primary sources

1. Pulido Cifuentes L et al. (2024). *A modified motor-clutch model reveals that
   neuronal growth cones respond faster to soft substrates.* Molecular Biology of
   the Cell 35:ar47. DOI: [10.1091/mbc.E23-09-0364](https://doi.org/10.1091/mbc.E23-09-0364).
   [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC11064671/).
2. Craig EM, Van Goor D, Forscher P, Mogilner A (2012). *Membrane tension, myosin
   force, and actin turnover maintain actin treadmill in the nerve growth cone.*
   Biophysical Journal 102:1503–1513. DOI:
   [10.1016/j.bpj.2012.03.003](https://doi.org/10.1016/j.bpj.2012.03.003).
3. Witte H, Neukirchen D, Bradke F (2008). *Microtubule stabilization specifies
   initial neuronal polarization.* Journal of Cell Biology 180:619–632. DOI:
   [10.1083/jcb.200707042](https://doi.org/10.1083/jcb.200707042).
   [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC2234250/).
4. Ferreira Castro A et al. (2020). *Achieving functional neuronal dendrite
   structure through sequential stochastic growth and retraction.* eLife
   9:e60920. DOI: [10.7554/eLife.60920](https://doi.org/10.7554/eLife.60920).
5. Lefebvre JL et al. (2012). *Protocadherins mediate dendritic self-avoidance in the
   mammalian nervous system.* Nature 488:517–521. DOI:
   [10.1038/nature11305](https://doi.org/10.1038/nature11305).
6. Santos TE et al. (2020). *Axon growth of CNS neurons in three dimensions is
   amoeboid and independent of adhesions.* Cell Reports 32:107907. DOI:
   [10.1016/j.celrep.2020.107907](https://doi.org/10.1016/j.celrep.2020.107907).
7. Franze K et al. (2009). *Neurite branch retraction is caused by a
   threshold-dependent mechanical impact.* Biophysical Journal 97:1883–1890.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/19804718/).
8. Dent EW, Kalil K (2001). *Axon branching requires interactions between dynamic
   microtubules and actin filaments.* Journal of Neuroscience 21:9757–9769. DOI:
   [10.1523/JNEUROSCI.21-24-09757.2001](https://doi.org/10.1523/JNEUROSCI.21-24-09757.2001).
9. Ohara Y et al. (2015). *Early-stage development of human induced pluripotent
   stem cell-derived neurons.* Journal of Neuroscience Research 93:1804–1813.
   DOI: [10.1002/jnr.23666](https://doi.org/10.1002/jnr.23666).
10. Barker AJ et al. (2008). *Developmental control of synaptic receptivity.*
    Journal of Neuroscience 28:8150–8160.
    [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC2566963/).

## V2 evidence additions

- Vargas et al. (2020), *Modeling of Mechanosensing Mechanisms Reveals Distinct
  Cell Migration Modes…*, https://doi.org/10.3389/fbioe.2020.00459. A triangulated
  cortex with internal counterforce and dynamic adhesion motivates the architecture.
  V2 is not a reproduction of that model or its fitted parameters.
- Koch et al. (2012), *Strength in the periphery*, https://pubmed.ncbi.nlm.nih.gov/22325267/.
  Hippocampal and DRG growth cones differ in retrograde flow and traction. Values
  belong to their reported culture/substrate conditions; they do not calibrate the
  current generic neuron.
- Betz et al. (2011), *Growth cones as soft and weak force generators*,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3158236/. NG108-15 retrograde flow was
  reported as 1.46 ± 0.60 µm/min (SEM), compared with this model's exploratory
  unloaded baseline 1.10 µm/min. Similar order of magnitude is not validation.

Read `V2_VERIFICATION.md` for the mechanics checks and remaining limitations.


### Exploratory protrusions and contact stabilization

Version 3 replaces the five sinusoidal probes with nine independent renewal
processes described above. The geometric contact-stabilization rule remains:
heterocellular axon–dendrite apposition can hold a tip at cellAdhesion ≥0.3,
requires continuous proximity and does not create a functional synapse.
