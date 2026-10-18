# Experimental finite disk integration

The `/cortex/finite-contact/` page now runs a human reconstructed cell with the
version 1.0 finite disk field. It is a separate half-space/distant-return
experiment, not a replacement model for Utah, Neuralink, or Neuropixels.

## Implementation

- `finite-contact.js` loads the binary with its pinned SHA-256 and manifest,
  transforms world µm to disk-local meters, checks complete membrane capsules,
  and caches all solver-node potentials including zero-area junctions.
- The disk is centered at world (0,0,1000) µm with normal +Z. It has radius
  25 µm; conductivity is fixed at 0.3 S/m. No geometry rescaling or
  conductivity adjustment is implied by this version.
- Complete polylines and maximum membrane radii must remain inside the
  validated r≤250 µm, z≤250 µm cylinder. Each capsule must also be at least
  25 µm above the plane. This conservative criterion preserves contact
  clearance and rules out plane/rim collisions throughout segments; it can
  reject otherwise acceptable lateral placements. There is no field fallback.
- Specimen 601927090 fits when centered. Other cells can be inspected but are
  excluded in full if they exceed coverage. They are never cropped or shrunk.
- `finite-experiment.js` derives the experiment orchestration from a028524
  and uses the existing active/passive cable and channel implementations.
  The point-source `experiment.js` stays byte-identical, preserving historical
  report provenance. Future orchestration changes must review both entrypoints.
- The preceding-step averaged biphasic waveform is preserved. V/A is converted
  to mV/µA by multiplying by 0.001. Spatial interpolation occurs once per node
  per run; waveform steps multiply cached coefficients only.
- `finite-worker.js` verifies assets, drops stale asynchronous loads, and
  transfers typed replay arrays. Stop/configuration changes terminate the worker.
- Tissue slices and sampled compartment Ve use the same pinned sampler and
  coefficients as the solver. Vm colors remain distinct from applied Ve.
- Recording, total signal and electric-field gradients are unsupported.
  Internal compatibility arrays contain NaN, and the dedicated result export
  omits them. The export has schema `cortex-finite-disk/1` and explicit field
  geometry, checksum, return, gauge, units, full nodes and response arrays.

## Verification in this integration session

The unchanged upstream package passed all SHA256SUMS checks and six sampler
tests. In a separate audit copy, all eight FEM cases were recomputed with
NumPy 2.3.5 and SciPy 1.17.0. Reproduced maximum independent-reference
potential error: 0.7352103%; final mesh change: 0.3071027%; final domain
change: 0.6599557%. All numerical release gates passed without changes to
tolerances. Historical domain/coarse-flux failures remain in the original
package. The separate current-loaded formulation agreed within 1.73e-14
relative to peak voltage. This shares the FEM operator and is not a second
independent spatial solver. Node export/interpolation validation also passed.

Five integration tests cover units, axisymmetry, invalid coverage, full-polyline
collision rejection, shifted geometry, fixed conductivity, passive-cable polarity
and gauge invariance, human replay, unsupported recordings, worker transfer,
stale asset loads and failed asset requests. Node worker tests are not browser
tests. This managed environment lacks the supported browser-control plugin;
interactive browser/visual QA was not performed during integration. The supplied
package's earlier Chromium verification is retained as historical evidence only.

`scripts/validate-cortex-finite-contact.mjs` produced
`finite-contact-integration-results.json` for specimen 601927090 at 40/20/10 µm
meshes and 0.005/0.0025 ms timesteps. At 1 µA, maximum soma waveform differences
were 0.000644 mV for timestep halving and 0.001590 mV across adjacent spatial
meshes. These small soma errors do not establish local waveform convergence.

At the sampled amplitudes 0, 1 and 100 µA, no somatic threshold events occurred.
At 100 µA, local crossing counts were 2, 4 and 5 for the respective spatial
meshes, at both timesteps. Counts also depend on compartment count and are not
equivalent physical initiation sites. No somatic threshold bracket was found;
the threshold-convergence gate is **not assessed**, not passed. Intermediate
amplitudes were not exhaustively searched, and monotonic recruitment is not
assumed from these endpoint observations. Propagation is not established.

No independent NEURON run was performed for the finite-field configuration.
Existing point-source numerical-convergence failures are not resolved by this
integration. This release supports an experimental polarization/replay workflow,
not biologically validated firing, safety, or single-neuron selectivity.

## Reproduce

From repository root:

```sh
node --test tests/cortex-finite-contact.mjs
node scripts/validate-cortex-finite-contact.mjs
npm test
npx astro build
```

For the field study, copy the unchanged workbench package to a separate audit
directory and follow its README. Regeneration changes reports, so do not
overwrite archived provenance just to make its checksum tests pass.
