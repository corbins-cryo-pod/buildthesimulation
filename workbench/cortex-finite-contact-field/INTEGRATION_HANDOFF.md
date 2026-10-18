# Integration handoff

1. **Implemented and independently verified.** A 50 µm diameter,
zero-thickness equipotential disk in an insulating plane, prescribed total
current into 0.3 S/m homogeneous isotropic tissue, with a grounded distant
cylinder return approximation. The final cylinder radius/height is 50 mm.
The axisymmetric P1 FEM is independently benchmarked against the matching
analytical half-space disk solution. Three mesh levels, four domain sizes,
boundary fluxes, a current-loaded algebraic cross-check, export/interpolation,
SI conversions, invalid regions, and a 97-compartment branching fixture are
tested. JavaScript runs in Node, actual Chromium, and a Chromium Web Worker.

2. **Incomplete.** Arbitrary 3D contacts, finite return electrodes, insulating
shanks, inactive floating metal contacts, multi-contact basis generation,
anisotropic/heterogeneous tissue, interface impedance/capacitance and field
gradients are not implemented. The extension plan is in
`docs/ARBITRARY_GEOMETRY_PATH.md`; it is not a completed arbitrary-geometry
solver. This benchmark is not a validated Utah, Neuralink or Neuropixels model.

3. **Replace the point-source potential evaluation.** Load
`artifacts/disk-v1/field.json` and `field.bin` in the simulation worker, convert
compartment coordinates from µm to local meters, classify them, then call
`cacheUnitPotentials` once for stationary compartments. At each waveform
update, use `combineCached` with current in amperes and convert volts to mV.
Feed this `Ve` to the existing cable model with its verified sign convention.
Reject non-OK statuses explicitly; failed queries contain NaN. Do not
reinterpolate at each timestep. Use the exact API in the integration guide.

4. **What the simulator must still verify.** Keep the existing 25 µm
application guardrail. Independently test whole compartment segments and
finite membrane radii against the actual implant solids, not just centers.
Confirm extracellular coupling signs, neural compartment and timestep
convergence, waveform resolution, mechanisms, reconstructed-neuron data,
stimulation thresholds, and selectivity. This fixture validates the field
interface and spatial potential differences; it does not validate firing.

5. **Readiness: experimental use only, ready for a limited integration
trial with this exact benchmark geometry.** All final release gates pass.
Maximum observed potential error is 0.7352%; last mesh and domain changes
are 0.3071% and 0.6600%. Accepted tissue is `r≤250 µm,0<z≤250 µm`, excluding
a 0.5 µm tube about the sharp rim. Coverage is empirical, not a uniform error
guarantee. The original 1.337% domain-change failure is retained; doubling
the domain corrected it without changing tolerances. Raw-gradient return
current still differs by 4.0115%, despite weak current balance at
1.31×10⁻¹⁴; this is a potential-only component, not a validated local-current
or electric-field estimator. No claim of biological safety or accurate
single-neuron selectivity follows.
