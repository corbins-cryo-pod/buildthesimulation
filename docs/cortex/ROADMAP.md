# Dependency-gated roadmap

## Current state

Phase 0: repository/physics review and initial framework decisions implemented;
research is not exhaustive. Phase 1: shared slab/implant foundation implemented,
but regional/curved anatomy incomplete. Phase 2: verified **passive** recording
vertical slice implemented, without experimental validation. Phase 3: verified
subthreshold passive stimulation implemented; action potentials/recruitment remain
open. Phases 4–8 are not complete.

## Next review / engineering gate

1. Review draft PR, perform desktop/mobile browser QA, inspect scale/transforms,
   worker cancel/reset/stale-state behavior, exports and no-WebGL path.
2. Extend the completed NEURON 9.0.1 uniform-cable fixture to the exact branched
   geometry and extracellular intervention, and add an LFPy reference. Retain
   hashes/versions; do not generalize the existing fixture to untested regimes.
3. Add testable finite exposed contact geometry for a well-documented alternative
   device (e.g. Neuropixels recording or surface-grid contact). Do not treat all
   catalog modalities as electrically interchangeable.

## First active biological milestone

- Select a licensed human-region or explicitly nonhuman reference morphology and
  model with experimental traces. Separate calibration and validation observations.
- Adapt the existing active cable to the shared geometry/current contract; compare
  against reference solver and channel kinetics before enabling spiking.
- Verify timestep/spatial convergence, current conservation and reference behavior.
- Only then expose action-potential/recruitment curves; no radius-based activation.

## Populations and acquisition

Introduce source-backed cell types, heterogeneous parameters and connectivity,
stable seeded realizations and a population validation experiment. Add separate
generic front-end versus measured device electronics: noise, impedance, filtering,
sampling/anti-aliasing and quantization. No single-cell-resolution claim for ECoG
without appropriate evidence and forward geometry.

## Real anatomy and field solvers

Select region-specific, licensed surfaces and laminar estimates. Add curvature
without distorting implant dimensions. Compare full-space fields to a converged
layered/finite-element reference (Gmsh/FEniCSx) before enabling quantitative CSF,
white matter or implant-material effects. Quantify placement/conductivity uncertainty.

## Mechanics

Reproduce a specified small-strain stress/relaxation experiment with defined
region, rate, boundary conditions and constitutive law. Verify mesh/time convergence
and contact behavior. Begin one-way displacement-to-electrical geometry coupling
only after independent component verification; insertion damage is a separate model.

## Higher fidelity and performance

Profile supported browser/hardware cases, then choose CPU/WASM/GPU or offline
reduced-order approaches. Measure interpolation error and memory. Validate actual
SWC/SONATA/NeuroML/NWB adapters before claiming compatibility. Maintain the evidence,
verification matrix and source licenses with every added model revision.
