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

### Representation

Positions have three components, with y as the vertical coordinate. Plate
neurites are constrained to y=0. Somata have fixed centers and nominal radii of
6.8–7.7 µm. A soma surface has 42 vertices and 80 triangular faces, obtained by
one subdivision of an icosahedron. The calculated mesh area and enclosed volume,
not the analytical area of a sphere, initialize its targets.

Neurites are finite-radius, straight segments linked as trees. A tip carries
direction, identity, age, microtubule support, noise state, stall history and force
diagnostics. Only soma membranes are elastic meshes. Existing neurites are not
fully deformable beams or elastic rods; somata do not migrate, divide or pack
through a tissue-mechanics solver.

The default view is a rotatable orthographic projection of the solved 3D
coordinates with a scale bar. An optional WebGL surface view reads the same
geometry. The 2× and 3× radius settings enlarge the display only; collision
geometry and measurements retain the simulated radii. Nuclei and individual
growth-cone filaments are schematic visual aids, not resolved subcellular
mechanical state. Visual overlap in a projection does not establish contact.

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
`noise*0.32*sqrt(1-exp(-2*dt/1.5))`. Plate y noise is zero.

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

### Soma shell relaxation

For mesh area A, volume V and nominal radius r:

```text
P = 2*gamma/r + 40*(V_target-V)/V_target          pN/µm²
F_i = -gamma*grad_i(A) + P*grad_i(V) + F_edges + F_root
E_edges = 0.5 * sum_edges 10*(length-restLength)^2  pN µm
x_i <- x_i + 0.0025*F_i                         µm
```

Edge stiffness is 10 pN/µm and rest lengths derive from the initial mesh. For each
active tip, a vertex near its root direction receives a radial force of
`0.13*min(20,max(0,F_net))` pN. After initialization, relaxation occurs at the
first solver step at least 0.25 h after its previous update and uses one iteration
with displacement coefficient 0.0025 µm/pN. Vertex radii are
restricted to `[0.94*r,1.06*r]`. That radial restriction is a numerical/model
constraint, not a measured limit of membrane strain.

Root starts are reattached to the resulting surface by directional interpolation.
The reported `elasticEnergy` contains only edge spring energy. There is no
Helfrich bending energy, fluid membrane shear relaxation or cell-volume growth
law. This is a membrane/cortex surrogate, not a quantitatively calibrated bilayer.

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
0 for precursor and +8 h for immature. At internal age 8 h, four or five
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
| Baseline branch hazard | 0.012 h⁻¹ | 0.045 h⁻¹ |
| Branch angle | 0.48 rad | 0.68 rad |
| Initial shaft radius | 0.52 µm | 1.05 µm |
| Minimum shaft radius | 0.23 µm | 0.30 µm |
| Low-driver retraction rate | 1.5 µm/h | 2.5 µm/h |
| Nearby-process rule | Align with other-cell axons | Avoid same-cell processes |

Branch hazard is multiplied by `branching*S*m/(1+0.3*branchOrder)`, and each step
uses `p=1-exp(-hazard*dt)`. Branching requires age≥3 h, support m≥0.45, reserve≥0.2,
an extending state, nonzero actin/MT controls, order<5 and remaining tip capacity.
Each event creates two continuations from the current tip. It is tip bifurcation,
not arbitrary interstitial branching along an existing shaft. The default active
tip cap is 32 per cell. Radius tapers by 0.996 between ordinary segments and by
0.79 on a higher-order branch, subject to the minimum and identity-specific root
radius.

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
envelope at 1.06 times nominal radius, rather than exact triangle collision.
Adjacent parents and shared branch junctions have explicit geometric exclusions.

For rigid obstacles, somata and world boundaries, the effective moving cone
radius is 1.8 µm for axons or 2.1 µm for dendrites. Neurite–neurite exclusion uses
the shaft radii; soft exploratory cone envelopes can overlap. The visual fan of
a cone is not an independently solved colliding membrane mesh. An additional
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

The plate has finite sphere/box obstacles and a localized cue direction. The
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
node --test tests/cell-growth.mjs
node scripts/validate-cell-growth.mjs
npm run build
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
