# Cortical stimulation lab — model and implementation plan

Version: cortical-stimulation-1.0.0. Route: `/simulations/cortical-stimulation/`.
The public methods document is `/simulations/cortical-stimulation/guide/`.

## Purpose

Explore direct electrical recruitment at realistic cellular scale, with electrode geometry,
current allocation, pulse duration and material-dependent deliverability kept explicit.
Never infer activation by painting a threshold on field magnitude or by using soma distance
alone. Distinguish anatomical background from cells whose membrane equations were solved.

## Implemented stages

1. Scientific specification: primary anatomy, field, interface and membrane references;
   explicit separation of measurements, equations and new reduced-model assumptions.
2. Reproducible population: seeded human V1 L2/3-sized soma volume, nonoverlap packing,
   full-density soma rendering, stable random dynamic sample and idealized branched arbors.
3. Electrical sources: disks, rectangles, annuli and spheres; position/orientation,
   finite-area quadrature, diagonal conductivity tensor, signed current superposition.
4. Interfaces: area-scaled RC polarization, consistent tissue access matrix, shared
   voltage-compliance limiting, actual charge accounting and ideal-source comparison.
5. Active cells: extracellular cable equation, Na/K/M/leak dynamics, independent trees,
   Rush–Larsen gates, implicit Hines voltage solve, separate axon and soma event times.
6. Exploration: electrode arrangements, current steering, field section, 3D inspection,
   first-recruitment replay, response/current/interface traces, recruitment-distance bins,
   saved A/B comparison, configuration and result exports, source-linked methods guide.
7. Verification: analytical field/RC oracles, conservation/invariance checks, active-cell
   convergence, deterministic packing and integrated local-return run; Astro production build.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `config.js` | Bounded reproducible parameters, pulse timing, material examples and arrangements |
| `field.js` | Full-space anisotropic kernel, finite-contact quadrature, area, access and RC/compliance |
| `anatomy.js` | Soma population, reproducible sampling and reduced branched morphology |
| `membrane.js` | Active ionic kinetics, tree cable construction, implicit time integration |
| `experiment.js` | Contact exclusions, coupling, pulse integration, recruitment and output arrays |
| `worker.js` | Cancellable off-main-thread experiment lifecycle |
| `view.js` | Physical-scale 3D somata/neurites/contacts and fixed quantitative field color maps |

## Validation scope

`tests/cortical-stimulation.mjs` checks numerical correctness under explicit analytical and
benchmark cases. It does not experimentally validate human activation thresholds. The
geometry and spatial channel distribution are a new reduced model, not a port of an
experimentally fitted reconstructed neuron. See the public guide for complete equations,
units, assumptions and sources. No synaptic network or optical model is represented.

## Extension boundary

For optogenetics, retain anatomy, membrane states, sample identity and analysis. Implement a
separate wavelength-dependent light-transport source and opsin photocycle current; validate
both against appropriate measurements. Do not reuse the electrical inverse-distance kernel
as a light model. Reconstructed morphologies, tissue/CSF boundaries, equipotential contact
solves, myelin and synapses are independent future upgrades, each requiring new benchmarks.
