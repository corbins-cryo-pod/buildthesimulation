# Finite-contact field — AI worker handoff

**Integration update:** The experimental single-cell disk benchmark is now
implemented at `/cortex/finite-contact/`. See [integration details and limits](FINITE_CONTACT_INTEGRATION.md).
The original package and the historical handoff below remain preserved.

This is the starting point for a worker integrating the independently verified
finite-disk field into Cortex Laboratory. The user requested that the completed
standalone package be placed in the Cortex project for handoff. This change
stores the package and instructions; it does not integrate or deploy it.

The follow-up website release publishes a download and handoff page at
`/cortex/finite-contact/`, linked from the laboratory and methods pages. That
release publishes these materials only; it does not enable the disk in the
simulation. The deployment work rebased this handoff onto upstream
`c115077b1ba706adb513905c3178bbcd689b27ce`, including the human-cell atlas and
synchronized replay update. The original code inspection below remains dated
to its stated commit; the next worker must inspect the current source again.

## Where everything is

The complete, unmodified version 1.0.0 package is in
[`workbench/cortex-finite-contact-field/`](../../workbench/cortex-finite-contact-field/).
It contains 78 files: source, mesh/solver pipeline, generated binary field,
JavaScript sampler, tests, examples, numerical checkpoints, results, plots,
primary references, dependency pins, license and checksums.

Read these first:

1. [Package README](../../workbench/cortex-finite-contact-field/README.md)
2. [Integration handoff](../../workbench/cortex-finite-contact-field/INTEGRATION_HANDOFF.md)
3. [Exact API and units](../../workbench/cortex-finite-contact-field/docs/INTEGRATION_GUIDE.md)
4. [Validation report](../../workbench/cortex-finite-contact-field/validation/REPORT.md)
5. [Physical specification](../../workbench/cortex-finite-contact-field/docs/PHYSICAL_MODEL.md)
6. [Arbitrary-geometry extension path](../../workbench/cortex-finite-contact-field/docs/ARBITRARY_GEOMETRY_PATH.md)

The original ZIP SHA-256 is
`74f9905905c7281c19e978ba5a0cea76784e327edc4b4f8b2daae79ff41407e0`.
It is not duplicated here; all its files are extracted for direct inspection.
The package's `SHA256SUMS` verifies the extracted contents. The website release
provides the ZIP at `/downloads/cortex/finite-contact-field-1.0.0.zip` and a
public introduction at `/cortex/finite-contact/`. Workers can also use this
repository copy directly without downloading an archive.

## Scope and verified status

The delivered geometry is an equipotential circular conducting disk of radius
25 µm in an insulating plane, with homogeneous isotropic 0.3 S/m tissue at
local z>0. A grounded cylinder of radius and height 50 mm approximates a
distant return. The solver prescribes total current, not uniform current
density. Its sharp rim has singular current density despite finite potential.

Final measurements: maximum reference potential error 0.7352%; final mesh
change 0.3071%; final domain change 0.6600%; weak current imbalance 1.31e-14.
Raw-gradient return-current error is separately 4.0115%. All 19 final release
gates pass; the initial domain failure and coarse flux failures remain in the
report. There is no electric-field sampler. Node and actual Chromium main
thread/Worker tests passed. At 100,000 points, the measured Worker sampling
time was 10.7 ms; the binary field is 956,564 bytes.

Accepted sampling coverage: r≤250 µm, 0<z≤250 µm, excluding points within
0.5 µm of the disk rim. This is empirical numerical coverage, not a universal
biological safe distance. The standalone component is experimental; it has
not yet passed Cortex integration tests or validated biological firing.

## Repository inspection and likely integration locations

This handoff inspected local checkout commit
`9d8391751443950cab380679eae46522298666ae` (branch `work`). No remote fetch was
performed, so this is not a claim to match the newest upstream revision.
Before implementing, inspect the target branch again and reconcile changes.

| File | Relevant behavior at the inspected revision |
|---|---|
| `src/lib/cortex/volume-conductor.js` | `pointTransferUvPerNa`, `pointField`, `leadField`; full-space 1/(4πσr), membrane-distance guardrail, and neural recording coefficients |
| `src/lib/cortex/experiment.js` | `runExperiment` builds `unitFieldMv` and `artifactPerUa`; scales into `extracellularMv`; `biphasicAverage` preserves step-averaged waveform timing; `fieldSection` and `resultBundle` describe/display/export the field |
| `src/lib/cortex/worker.js` | Simulation worker entry; load and verify assets before invoking the presently synchronous experiment path |
| `src/lib/cortex/active-cable.js` | `stepActiveCable` accepts `extracellularMv` and applies neighbor-potential differences through axial conductance |
| `src/lib/cortex/electrical.js` | `appliedTransferMvPerUa` and `appliedSlices` supply the displayed field; they must agree with the selected simulation model |
| `src/lib/cortex/config.js`, `world.js`, `implants.js` | Configuration, physical frame, source/return geometry and implant selection |
| `src/lib/cortex/placement.js`, `population.js` | Placement rejection and population exclusions; preserve explicit unsupported classifications |
| `src/lib/cortex/evidence.js` | Methods/provenance claims that must match implemented capabilities |

## Important: this is a different boundary-value problem

The current application models bipolar point sources in a full-space conductor.
This package models one surface disk in an insulating half-space, with an
artificial distant grounded return. Its far-field factor is 1/(2πσr).
Do not globally replace `pointTransferUvPerNa`, retain an incompatible old
return configuration, or subtract two independently placed disk fields to
pretend that a multi-contact implant has been solved.

Introduce an explicit experimental disk benchmark configuration with its own
geometry, plane, coordinate transform, return, and provenance. It is not a
finite Utah tip, Neuralink contact or Neuropixels shank. Do not silently map
the existing Utah catalog entry to this disk.

Neural recording is also a conductor-boundary problem: the old full-space
recording lead field is not automatically consistent with the new half-space
and conducting contact. Either independently implement/verify matching
recording physics, or explicitly restrict the experimental mode's claims and
disable unsupported recording outputs. Do not claim a single consistent
physical world while mixing incompatible conductors.

## Implementation sequence for the next worker

1. Read the package and current Cortex code. Start an isolated development
   branch/worktree; retain the existing point-source model as an explicitly
   separate model and regression baseline.
2. Add a versioned experimental field-model config. Include the artifact
   checksum, disk pose, conductivity, return/gauge and validity restrictions in
   exported results. Reject unsupported combinations rather than guessing.
3. Copy/bundle the dependency-free `js/field-sampler.js` appropriately and serve
   only `artifacts/disk-v1/field.json` and `field.bin` as runtime assets. Keep
   Python, checkpoint files and validation tooling offline under `workbench/`.
   Make worker loading asynchronous and preserve cancellation/stale-run logic.
4. Transform physical compartment coordinates from world µm to local meters:
   `p_local = R_world_to_disk * (p_world_um*1e-6 - center_world_m)`.
   Do not use arbitrary Three.js display scales as physical coordinates.
   Include the algebraic junction nodes needed by the cable solver, and check
   how those coordinates and extracellular values are represented.
5. Classify every query and cache unit potentials once for stationary geometry.
   Check every status; invalid samples are NaN even at zero current. Unsupported
   full neurons must be explicitly excluded, never silently partially sampled.
   Retain the existing 25 µm application guardrail and check full segments and
   finite membrane radii against actual surfaces/solids.
6. Convert cached V/A to existing stimulation coefficient units carefully:
   `mV/µA = (V/A)*1e-3`. Then `extracellularMv[i] = coefficient[i]*currentUa`.
   Applied artifact coefficients in `µV/µA` are numerically equal to V/A.
   Preserve the current step-averaged waveform convention and cable signs;
   do not replace `biphasicAverage` with a single endpoint waveform sample.
7. Use the same field model for applied-potential slices and supported applied
   artifacts. Disable unsupported electric-field magnitude outputs; do not
   differentiate P1 data and call the resulting gradients verified. Rebuild
   caches when pose, nodes, conductivity, return or artifact changes.
8. Add integration tests for units, signs, field-model config round trips,
   worker asset loading/cancellation, cache invalidation, invalid tissue,
   whole-neuron exclusion, and agreement between simulation/display/export.
   Keep existing point-source regressions intact. Test a passive cable fixture
   before interpreting active human-cell responses.
9. Run relevant repository tests, build/artifact checks and real-browser QA.
   Independently revisit neural spatial/timestep convergence and stimulation
   thresholds. Field accuracy does not resolve the historical neural failures.
   Do not deploy until the integration is reviewed and deployment authorized.

## Quick verification of the supplied package

From the repository root:

```sh
cd workbench/cortex-finite-contact-field
sha256sum -c SHA256SUMS
npm test
node --expose-gc tests/validate-js.mjs
node examples/waveform.mjs
```

`npm test` needs no package installation for the sampler. The shipped runtime
was tested with Node 24.19.0; the package declares Node ≥22, while the Cortex
repository recommends Node 22. Verify the actual integration target runtime.
The numerical and real-browser reproduction commands are in the package README.
Regenerating reports intentionally changes checksummed generated files; verify
the delivered contents before regeneration and regenerate the package manifest
after intentional changes.

## Copy-paste task for another worker AI

> Read `docs/cortex/FINITE_CONTACT_HANDOFF.md` and the complete standalone package
> in `workbench/cortex-finite-contact-field/`. Inspect the current target branch
> before editing. Integrate the verified disk as an explicit experimental
> half-space/distant-return field mode, preserving the separate point-source
> baseline, 25 µm guardrail and unresolved neural-convergence limitations. Do
> not treat it as a Utah model or a multi-contact solver. Implement worker
> loading, SI transforms, cached compartment potentials, explicit invalid-region
> handling and consistent supported display/export behavior. Resolve or disable
> incompatible recording/E-field outputs. Run appropriate integration and
> browser tests and report limitations. Do not deploy without authorization.
