# Architecture and contracts

## Ownership

| Module | Owns | Must not own |
| --- | --- | --- |
| `config.js` | Versioned, bounded experiment input | Silent parameter correction |
| `world.js` | One anatomy, morphology, implant pose, contacts and units | Renderer-derived physical properties |
| Existing `devices/catalog.js` | Device identity, revision, source dimensions | Neural response claims |
| `passive-cable.js` | Capacitance, leak, axial tree solve, membrane currents | Three.js or device marketing metadata |
| `volume-conductor.js` | Analytic transfer coefficients and point-source fields | Unlabeled radius clamps |
| `experiment.js` | Protocols, coupling, traces, diagnostics and serialization | Display-timed integration |
| `worker.js` | Request/result lifecycle and progress | Random defaults or hidden quality reduction |
| `scene.js` | Uniform µm→mm conversion, shared device mesh, physical rendering | Signal fabrication |
| `CortexLaboratory.jsx` | Input, inspection, plots and local downloads | Physics hidden in UI callbacks |
| `evidence.js` | Source IDs, evidence categories, parameter default provenance | A claim of validation |

Pure numerical modules run in both a browser worker and Node tests. The scene
is dynamically loaded independently; lack of WebGL falls back to Three's software
SVG renderer. If both renderers fail, computation and exports remain accessible.

## State and coupling

`ExperimentConfig → makeWorld → protocol → passive cable → I_membrane → lead field → signals`.
Both scene and kernel derive the same contacts and morphology from the config.
Mode changes do not regenerate a different cortex. Rigid pose is computed before
any field/lead matrix. Moving the array changes distances and coefficients.

- **Synaptic mode:** fixed physical conductance region → cable → recording.
- **Current-clamp mode:** soma injection + prescribed bath-return field → cable;
  neural currents and bath potential are separately recorded and then summed.
- **Extracellular mode:** explicit bipolar source field → cable; separately record
  neural currents and direct stimulus artifact. This is one-way sequential coupling.
- No ephaptic feedback, conductor alteration by the cell, tissue displacement,
  or coupled mechanical solve. No implicit claim of fully coupled multiphysics.

Worker messages contain a monotonically increasing run ID. Edits are disabled
while solving; cancellation terminates the worker and invalidates its ID. Any
config change after a run hides stale traces and membrane colors. Replay changes
only the inspected frame, at 10 biological ms per wall-clock second; it never
reintegrates the equations. Benchmarks time only the solve, not replay.

## Units and transforms

Numerical geometry: µm; +Z into cortex; pia=0. Rotations X then Y then Z in degrees,
translation afterward. Implant origin and dimensions retain catalog meaning.
The renderer converts all coordinates to mm and uses Euler order `ZYX`, verified
against `rotateVector`. Neurite centerlines and selection crosshairs are annotated
overlays, not physical diameters or activation radii.

Electrical kernel units: mV, ms, nA, nF, µS; conductivity S/m. Public stimulation
amplitude is µA with explicit conversion. Recording output is µV.

## Implemented schemas

- `cortex-experiment/1`: anatomy dimensions; versioned implant and rigid pose;
  synthetic neuron location/discretization; tissue coefficient; passive membrane;
  recording site IDs/source approximation/reference/exclusion; protocol; solver.
- `cortex-result/1`: exact config and engine ID, time array, frame-major compartment
  voltage/current arrays, two neural/applied/total potential arrays, differential
  total signal, interval-average drive, numerical diagnostics and limitations.
- `cortex-evidence/1`: source IDs, URL/DOI/date/locator, species, category, usage
  license notes, limitations and open questions. Null means unknown/not applicable.
- `cortex-comparison/1`: two complete result bundles. Different interventions may
  confound a comparison; no automated causal or commercial superiority inference.
- `cortex-benchmark/1`: configs, hardware/runtime, samples, metrics and refinements.

Geometry/result exports contain catalog revision, physicalContacts,
simultaneousChannels and `channelMap: null`. Selecting geometric sites does not
assign hardware channel numbers. Array packing is `frame * compartments + index`.
CSV exports the chosen component for A/B/A−B, soma voltage, drive and all membrane
currents. JSON records the drive units and end-of-step/interval-average convention.

## Interoperability and growth

No SWC/SONATA/NeuroML/NWB compatibility is claimed. Current config import accepts
only its exact version and validates bounds before expensive work. Future adapters
must pass the external format's validator and round-trip tests. Separate anatomy,
mesh, connectivity, waveform and material schemas should be introduced when their
semantics are implemented, not populated with pretend data now.

Independent reference boundary: `scripts/cortex-reference-input.mjs` exports only
geometry and parameters, not solver outputs or matrices. Offline NEURON builds its
own section circuit and produces compartment currents; offline LFPykit converts
those currents to recording potentials. Node CI compares the browser modules
against hashed fixtures. The generator hashes and exact input hashes detect stale
references. A future finite-element solver replaces transfer matrices while
retaining the coordinate/unit contract; worker and UI must not depend on its internals.
