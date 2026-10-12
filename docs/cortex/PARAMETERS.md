# Parameter registry and uncertainty

Machine-readable defaults and evidence: `src/lib/cortex/evidence.js`.
Actual selected values: exported `config`. Exact dimensional device properties:
existing `src/lib/devices/catalog.js` / BTSD-0001 revision 1, not a second catalog.

| Quantity | Default | Units | Category and scope |
| --- | ---: | --- | --- |
| Patch width / depth | 6000 / 4000 | µm | Assumed representative slab |
| Layer boundaries, depth fractions | 0/.06/.16/.46/.50/.75/1 | dimensionless | Illustrative, not measured human M1 lamination |
| CSF / white matter visual extent | 250 / 1000 | µm | Anatomy guides, no electrical contrast |
| Soma center | −100, −200, 1500 | µm | Assumed position |
| Soma diameter | 20 | µm | Synthetic sphere |
| Apical branch length / diameter | 600 / 3 | µm | Synthetic cylinder from soma surface |
| Basal branches | four; length √(250²+150²), diameter 2 | µm | Synthetic; no axon or inhibitory class |
| Conductivity | .3 | S/m | LFPy modeling default, not human M1 measurement |
| Specific capacitance | 1 | µF/cm² | Canonical assumption |
| Membrane resistance | 20000 | Ωcm² | Canonical assumption |
| Axial resistivity | 150 | Ωcm | Canonical assumption |
| Leak reversal / initial voltage | −65 | mV | Equilibrium assumption |
| Total synaptic conductance / reversal | 1 / 0 | nS / mV | Prescribed test input, not measured synapse ensemble |
| Intracellular current | .05 | nA | Prescribed test input |
| Bipolar stimulation current / phase / gap | 1 / 200 / 100 | µA / µs / µs | Prescribed test input |
| dt / experiment duration | .025 / 40 | ms | Numerical choice; 1601 frames |
| Maximum segment length | 40 | µm | 48 compartments; actual branch spacing ≤40 |
| Source/membrane exclusion | 25 | µm | Numerical-domain rule, not a validated accuracy limit |

Utah's 400 µm pitch, 4×4×.2 mm substrate and selected 1.5 mm length are
manufacturer-linked geometry. The catalog's assumed shaft/tip dimensions remain
explicitly illustrative. The 100 sites are separate from nominal 96 channels;
the channel map and exposed area are unknown. No human device efficacy is inferred.

## Evidence categories

- **Published measurement:** cited anatomy/device observations with provenance.
- **Established model:** passive cable and homogeneous Green functions.
- **Calibrated parameter:** none used by this implementation. Eyal temporal L2/3
  fits are future comparators, not default human M1 parameters.
- **Modeling assumption:** geometry, passive values and generic conductivity.
- **Illustrative/unvalidated:** interpretation as a cortical implant experiment.

## Sensitivity, not confidence intervals

The benchmark evaluates conductivity .15/.3/.6 S/m and an array X shift of −100 µm.
These are user-defined sensitivity points, not empirically measured uncertainty
bounds. The synaptic membrane solution is invariant to conductivity; the recording
scales inversely. A changed pose modifies its transfer matrix without changing the
unforced cell's currents. Stimulation is not invariant because Ve changes.

Biological variability in morphology, temperature, membrane parameters, layer
boundaries, return paths, electrode placement and interface behavior dominates
many small numerical errors. No probabilistic uncertainty interval is claimed.
Future calibrated parameters must identify a fitting dataset and leave a separate
independent dataset for validation.
