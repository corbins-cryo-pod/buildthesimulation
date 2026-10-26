# Cell Growth V4: soma–arbor coupling and selective connectivity

This release addresses long straight proximal tethers left behind moving somata,
and makes local neuronal encounters develop into an explicit, inspectable contact
graph. It retains the V3 morphology, microscopy views, finite-radius crossings,
independent growth episodes, wave transport and branch precursors.

## Evidence and scope

These mechanisms are informed by primary experiments. The generic population,
kinetic constants, mechanical moduli and developmental clock are **not fitted**
to a particular cell preparation. Numerical verification does not establish
biological calibration.

- O'Toole, Lamoureux & Miller (2008), *A Physical Model of Axonal Elongation:
  Force, Viscosity, and Adhesions Govern the Mode of Outgrowth*,
  <https://pmc.ncbi.nlm.nih.gov/articles/PMC2267140/>,
  doi:10.1529/biophysj.107.117424. Calibrated-needle experiments on chick sensory
  neurons and tracked mitochondria support distributed tension, viscous material
  movement and substrate-dependent resistance. Their measured constants are
  preparation-specific; they are not copied into this generic model.
- Lamoureux et al. (2010), *Growth and elongation within and along the axon*,
  <https://pubmed.ncbi.nlm.nih.gov/19950193/>, doi:10.1002/dneu.20764.
  Marker motion and axonal width distinguish lengthening from material addition.
  This motivates separate geometric, stress-free and growth lengths.
- Hanein et al. (2011), *Neuronal soma migration is determined by neurite tension*,
  <https://cris.tau.ac.il/en/publications/neuronal-soma-migration-is-determined-by-neurite-tension/>,
  doi:10.1016/j.neuroscience.2010.10.022. Cultured locust neurons demonstrate
  neurite-mediated forces on somata. This is evidence against an absolute
  “first dendrite freezes soma” rule, not mammalian parameter calibration.
- Ziv & Smith (1996), *Evidence for a role of dendritic filopodia in synaptogenesis
  and spine formation*, <https://pubmed.ncbi.nlm.nih.gov/8755481/>,
  doi:10.1016/S0896-6273(00)80283-4. Live hippocampal cultures show local filopodial
  encounters with axons and selective stabilization associated with boutons.
- Lohmann & Bonhoeffer (2008), *A role for local calcium signaling in rapid
  synaptic partner selection by dendritic filopodia*,
  <https://pubmed.ncbi.nlm.nih.gov/18667153/>, doi:10.1016/j.neuron.2008.05.025.
  Contacts can be selected before mature synapses exist; local calcium signals
  accompany stabilization. Our scalar contact-response proxy is not a calcium
  concentration model or proof of synaptic activity.
- Scheiffele et al. (2000), *Neuroligin expressed in nonneuronal cells triggers
  presynaptic development in contacting axons*,
  <https://pubmed.ncbi.nlm.nih.gov/10892652/>, doi:10.1016/S0092-8674(00)80877-6.
  Molecular organizers can induce presynaptic differentiation at contact. The
  model uses generic organizer/receptivity factors, not resolved molecular binding.
- Christopherson et al. (2005), *Thrombospondins are astrocyte-secreted proteins
  that promote CNS synaptogenesis*, <https://pubmed.ncbi.nlm.nih.gov/15707899/>,
  doi:10.1016/j.cell.2004.12.020. Structural assemblies can remain postsynaptically
  silent. The model therefore separates presynaptic assembly, receptor recruitment,
  and electrical conductance. Its support factor does not explicitly simulate glia.
- de la Torre et al. (1997), *Turning of retinal growth cones in a netrin-1 gradient
  mediated by the netrin receptor DCC*, <https://pubmed.ncbi.nlm.nih.gov/9427245/>,
  doi:10.1016/S0896-6273(00)80413-4. Xenopus retinal growth cones respond to a
  supplied ligand through a receptor. This motivates optional source/receptor
  fields; it does not establish universal soma attraction in unpatterned cultures.

## Distributed mechanics

Each live segment stores a stress-free length L0, a substrate/matrix anchor,
adhesion occupancy, a preferred junction cosine, elastic strain and axial force.
An endpoint is shared by its parent and **every** daughter. At each 0.0125 h
mechanical substep:

1. Evaluate axial and junction-bending energy gradients. Root-start forces act
   on the corresponding cortex vertex. Endpoint forces are equal and opposite;
   bending forces preserve total force and torque.
2. Advance the cortex subject to the existing surface, nucleus, contact and
   membrane-budget guards. Root strain is included in that line search.
3. Advance shaft joints with drag and yielding adhesive anchors. Update all
   incident segments atomically. Swept finite-radius checks preserve obstacles,
   foreign somata, unrelated shafts, neighboring cones and world bounds.
4. Account for changed cylindrical membrane area; relax stress-free length on a
   separate 24 h viscoelastic timescale. Polymerization/retraction explicitly
   adds/removes stress-free material. A replaced terminal material point receives
   a local, initially unbound adhesive anchor; it does not inherit a distant
   tether. Moving a soma does not count as tip growth.

Exploratory energy laws:

- E_axial = EA (L − L0)^2 / (2 max(L0, 0.25 µm)); EA = 75 (r/0.5 µm)^2 pN.
- E_bend = 6 pN·µm (u_parent·u_child − cos_rest)^2 / 2.
- Endpoint drag = 12 + 90 adhesion pN·h/µm; anchor spring = 18 adhesion pN/µm.
- Anchors yield beyond 1.5 µm displacement and exchange continuously.
- A 4 µm/h displacement limiter and a 40% elastic-strain guard are numerical
  safeguards, **not measured failure thresholds**. They do not cap growth length.
- Soma settlement multiplier = 1 / [1 + settlement × substrate adhesion ×
  (1 − exp(−root age/8 h)) × min(20, total arbor length/15 µm)].

The settlement multiplier combines with the existing developmental motility gain.
It remains positive and does not stop growth-cone actin dynamics. Setting settlement
to zero retains the distributed mechanical forces; setting neurite coupling to
zero is an explicit ablation control, not the default.

This is a constrained discrete viscoelastic network, not a mesh-converged continuum
beam model. Root attachment is to a fixed cortex topology. Thin contact bridges
are reduced adhesion links, not separately meshed membranes or collision capsules.

## Contact and synapse state

Only a finite growth cone or filopodium encountering a foreign, opposite-kind
process can create a record. Self and axon–axon contacts do not create synaptic
records. Matching axon/dendrite sites are deduplicated; adjacent sites on the same
cell pair require 3 µm separation. Crossings alone do not create edges.

Compatibility combines developmental competence, presynaptic organizer expression,
postsynaptic receptivity and the recognition control. The initial population uses
an illustrative 4:1 excitatory/inhibitory assignment; it does not claim to represent
a sampled cortical population or reproduce cell-type-specific arbors. Synaptic
receptivity is currently restricted to dendritic targets. Axosomatic and axoaxonic
synapses, electrical gap junctions and molecular subtype matching are not modeled.

A successful encounter starts a continuous dwell interval and a local contact-response
proxy. After 0.3 h and sufficient adhesion it becomes a candidate. Presynaptic
assembly relaxes with a 3 h time constant; receptor assembly uses 8 h. A structural
state requires at least 2 h dwell and presynaptic assembly ≥0.3. A transmission-ready
state requires presynaptic assembly ≥0.6 and receptor assembly ≥0.55. These clocks
are exploratory; they are not a biological differentiation protocol. Readiness
creates conductance g = 1.2 × presynaptic × receptor nS.

A compliant tensile contact bond acts on both material sites. Loss of recognition,
loss of adhesion, segment removal, or separation exceeding its formation distance
by 1.2 µm removes the edge and its conductance. The local cone pauses briefly for
recognition, then can continue. Contacted segments are retained as growth advances,
so the contact is not carried along at the moving tip. Other branches remain free.

## Guidance without universal attraction

Compatible filopodial contacts bias local steering. The normal plate has no imposed
soma-secreted field (`cellSignals = 0`). The optional **Illustrative cell cue** assay
uses explicitly saved secretion and attraction/repulsion factors. It evaluates the
quasi-steady screened 3-D bath field c(r) = source × 8 exp(−r/35)/(r+8), with distances
in µm, and the gradient of saturating occupancy c/(1+c). This is a generic ligand
assay, not a calibrated netrin or neurotrophin concentration; diffusion transients,
ligand depletion, ligand-specific binding and cell fate changes are not solved.

## Electrical assay

Growth evolves in hours. Electrical testing uses a separate, frozen-geometry 200 ms
assay, without advancing or changing growth state or its random streams. Only
transmission-ready, still-apposed edges are included. The same stimulation is run
with synaptic transmission enabled and blocked.

C dV/dt = gL (EL − V) + gE (EE − V) + gI (EI − V) + I.

Defaults: C=100 pF, gL=5 nS, EL=−65 mV, threshold=−50 mV, reset=−65 mV,
refractory period=2 ms, EE=0 mV, EI=−75 mV, decay constants=5/10 ms,
fixed transmission delay=1 ms. The selected cell receives 220 pA from 20–80 ms.
The default step is 0.05 ms; membrane integration is exponential for frozen
midpoint conductances. Threshold events schedule conductance delivery; release
failures, channel waveforms, axonal propagation, dendritic cable filtering and
plasticity are not included. These are declared reduced-model parameters, not
inferred electrophysiology of the grown geometry. Activity-dependent structural
refinement remains outside this release.

## Saved-state compatibility and verification

V4 stores material lengths, anchors, receptor/organizer factors, contact sites,
bond strength and synaptic assembly. V3 files are rejected explicitly rather than
silently initialized with different mechanics. Full JSON carries the graph;
transmission-assay downloads include both control arms and all numerical parameters.

Tests check independent energy gradients, force/torque balance, original streaking
regression with settlement disabled, local sensing range, recognition failures,
distinct maturation stages, removal on separation, excitatory/inhibitory responses,
transmission blockade, numerical refinement and unchanged growth during an assay.
The existing collision, membrane budget, topology, replay and long-culture gates
remain required. Current numerical outputs are linked from the Methods page.
