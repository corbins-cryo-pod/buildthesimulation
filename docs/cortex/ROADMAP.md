# Dependency-gated roadmap

## Current state

Phase 0: repository/physics review and initial framework decisions implemented;
research is not exhaustive. Phase 1: shared slab/implant foundation implemented,
but regional/curved anatomy incomplete. Phase 2: verified **passive** recording
vertical slice implemented, without experimental validation. Phase 3 now has a
review-stage published human temporal single-neuron extension with active channels,
native morphology and independent intracellular/extracellular numerical checks.
The passive foundation is live; the user approved active publication on 2026-10-14.
Population recruitment and phases 4–8 are not complete.

## Next review / engineering gate

1. Review the active feature PR, perform desktop/mobile browser QA, inspect scale/transforms,
   worker cancel/reset/stale-state behavior, exports and no-WebGL path.
2. Retain the eight active NEURON/LFPykit cases and native threshold brackets.
   Resolve the measured extracellular threshold's spatial sensitivity before
   interpreting it quantitatively. Fixed cases do not cover all allowed settings.
3. Follow the bounded experimental comparison milestone below, then select finite
   exposed contact geometry with source dimensions. Catalog modalities are not
   electrically interchangeable.

## Next bounded milestone: experimental comparison and convergence

- Keep specimen 571654895 and the passive regression model; add no population.
- Import a small source NWB sweep set with explicit junction-potential correction,
  preparation metadata and fitting-sweep identity. Reproduce original somatic
  current protocols in both solvers, without refitting merely to improve agreement.
- Report voltage/spike-feature errors against observations and their provenance.
  Only call a comparison held-out validation if that role can be established.
- Extend native threshold/refinement cases to the 10 µm mesh and changed electrode
  poses, with predeclared sensitivity gates and local-versus-somatic event criteria.
- Complete supported desktop/mobile, keyboard, WebGL/fallback, cancellation,
  stale-result and export QA. Profile browser startup/solver/rendering separately.

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
