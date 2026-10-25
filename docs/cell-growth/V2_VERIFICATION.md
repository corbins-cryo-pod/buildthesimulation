# Cell Growth Laboratory V2: release verification

V2 extends the existing deterministic growth engine with an overdamped,
deformable membrane–cortex, a constrained moving nucleus, adhesion-driven
migration, local cell adhesion, and deforming exploratory growth cones.
Developmental gates and mechanical coefficients remain exploratory. This is
numerical verification of the implemented reduced model, not empirical
validation of a human cell preparation.

## Architecture and interpretation

| System | Solved state and coupling | Deliberate limit |
| --- | --- | --- |
| Soma cortex | 162 vertices, 320 faces; analytic area, volume, elastic-edge and graph-curvature forces | Fixed topology; no spatial convergence or molecular bilayer claim |
| Cytoskeleton | Local actin, MT support, contractility and adhesion occupancy; internal forces balanced separately from motor traction | Rendered internal spokes illustrate coarse support, not individual polymers |
| Locomotion | Overdamped vertex motion, front–rear polarity, basal/matrix traction, adhesion turnover, substrate and local contact response | Phenomenological coefficients; no fitted cell-type migration speed |
| Nucleus | Separate position, drag, tether, reciprocal MT forces and containment | Rigid sphere; no chromatin or nuclear-envelope mechanics |
| Neurites | Vertex-attached roots; finite tapered shafts; separate axon/dendrite growth, branching, retraction, resources and steering | Distal shafts remain anchored; no elastic beam network or interstitial branching |
| Growth cones | Twelve evolving rim radii; finite closed surface; five bounded sensing protrusions | Reduced radial model; probes are not retained cable or molecular actin |
| Population | Short-range adhesion and contact inhibition; connected contact groups | No prescribed cluster layout; no division, tissue patterning or solved nutrient diffusion |
| Connections | Physical encounter, continuous apposition, structural candidate, loss on separation | No functional synapse, electrical activity or myelination inferred |

All four environments reuse this mechanical foundation. The organoid preset is
a 3D microenvironment, not full organoid morphogenesis. Regeneration and
biohybrid presets model physical guidance and barriers, not clinical recovery.

## Numerical controls

The normal test suite includes `tests/cell-growth.mjs` and
`tests/cell-growth-mechanics.mjs`. The latter adds these controls:

| Behavior | Controlled check |
| --- | --- |
| Passive mechanics | Independent central differences of the stated energy; net internal force and torque; passive relaxation |
| Membrane constraints | Independently reconstructed volume/area, closed oriented topology, positive volume, minimum triangle quality |
| Active motion | Isolated polarized cell deforms and translates; nucleus follows; drag balances recorded forces and constraint reaction |
| Adhesion | Occupancy evolves continuously; no-adhesion control has zero motor traction; adhesion-dependent pair clustering |
| Contacts | Grazing, narrow-gap, simultaneous solid contacts, moving attached roots, approaching foreign cones, thin-barrier probes and safe process initiation |
| Retraction | Negative measured endpoint velocity and separate retraction metric; retained cable and reserve ledger remain consistent |
| Numerics | Outer-step subcycling invariance and a separate refinement of the actual mechanical integration step |
| State | Exact serialized continuation, bounded imported geometry and mechanical fields, shared solver/render cone topology |
| Morphometry | Sister-branch angles, projected dendritic coverage, Sholl profiles, topology and material accounting |

The mechanics report varies the actual internal step over 0.0125, 0.00625 and
0.003125 h in a four-hour isolated-cell control. Coarse-to-finest centroid and
vertex RMS differences must both be below 0.05 µm, and both intermediate errors
must decrease. The measured differences are approximately 0.0136/0.0137 µm at
the production step and 0.00453/0.00456 µm at the intermediate step. This does
not establish spatial convergence of the fixed mesh or convergence of every
stochastic, contact-rich arbor.

In the default eight-hour polarized-cell control, displacement is approximately
19.4 µm, volume strain is 0.58%, and area strain is −0.37%. The passive control
moves less than 0.001 µm. The no-adhesion control has exactly zero motor
traction and less than 0.1 µm displacement. These are predictions of these
equations under the report's conditions, not biological measurements.

Extreme drive with a soft cortex can reach the mesh-quality constraint. The
solver reduces or rejects invalid steps, records the rejection count, and shows
it in the inspector. A finite, non-inverted mesh in that stress case does not
mean its large area strain is biologically realistic.

## Full-population and material audits

`scripts/validate-cell-growth.mjs` runs 72-hour presets in culture, organoid,
regeneration and biohybrid environments. It independently audits all retained
shafts for obstacle, soma, boundary and unrelated-shaft penetration, and all
active cones for solid, foreign-soma, foreign-shaft and foreign-cone separation.
It reports an explicit allocation stop if a segment budget is exhausted.

The neurite reserve ledger is
`remaining = initial + supplied + recycled − used`, including changes in a
moving membrane-attached root. It does not conserve whole-cell lipid area:
elastic soma-area changes and full trafficking are outside that ledger.

Matched 24-hour neurite interventions clamp soma motion in both arms, isolating
tip extension from root stretching. Freely moving controls are in the separate
mechanics report. A structural candidate requires 0.3 h continuous geometric
apposition under the declared contact rule; its threshold is not fitted to a
synaptogenesis assay.

## Evidence, rendering and exports

The methods page links primary studies motivating membrane/cytoskeletal
coupling, motor-clutch behavior, migration, MT stabilization, branching,
self-recognition and mechanical responses. It distinguishes those mechanisms
from exploratory parameters and numerical checks. Published growth-cone force
and retrograde-flow measurements are provided as scale context with preparation
and unit differences stated; no parameter fit or held-out biological validation
is claimed.

Structural, brightfield-inspired, fluorescence-inspired and mechanics views
use the same numerical geometry. WebGL renders the finite mesh with cached soma
buffers and instanced shafts/junctions. A software 3D renderer draws that same
surface, nucleus, cones and probes when WebGL is unavailable. Neither renderer
models optical image formation. Radius exaggeration affects display only.

JSON preserves the complete numerical state, including nuclei, adhesion,
polarity, contacts, cone probes, RNG and material accounting. CSV exports
population history. SWC exports the selected cell's centerline morphology and
nominal soma radius; it does not encode the full deformable soma or nucleus.

The browser used for release inspection disables WebGL, so interactive visual
checks exercise the automatic software fallback. Hardware WebGL visual QA is
an explicitly unverified path in this environment; both renderers share the
unit-tested solved geometry.

## Reproduction and release gates

```sh
node --test tests/cell-growth.mjs tests/cell-growth-mechanics.mjs
node scripts/validate-cell-growth.mjs
node scripts/validate-cell-growth-mechanics.mjs
npm test
npm run build --ignore-scripts
node scripts/verify-cell-growth-build.mjs
```

Both JSON reports retain the model version, source hashes, runtime, input
conditions, tolerances and results. The build verifier requires all acceptance
gates to pass and rejects stale source hashes. Timings exclude browser rendering
and network transfer and depend on machine load; they are not a device-wide
performance guarantee. Repository CI also builds and checks the unrelated
laboratories before the upgrade can merge.
