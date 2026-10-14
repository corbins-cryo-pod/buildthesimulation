# Architecture and contracts

## Ownership

| Module | Owns | Must not own |
| --- | --- | --- |
| `config.js` | Versioned, bounded experiment input | Silent parameter correction |
| `world.js` | One anatomy, morphology, implant pose, contacts and units | Renderer-derived physical properties |
| Existing `devices/catalog.js` | Device identity, revision, source dimensions | Neural response claims |
| `passive-cable.js` | Capacitance, leak, axial tree solve, membrane currents | Three.js or device marketing metadata |
| `active-morphology.js`, `models/allen571654895.json` | Pinned native-SWC geometry/fit and rigid placement | Reference voltage solutions |
| `active-channels.js`, `active-cable.js` | Source channel kinetics, calcium and active tree solve | Scripted activation or rendering |
| `model-registry.js` | Model identity, species, source and scope | Unqualified human-channel claims |
| `buffers.js` | Unique nested output buffers for accounting/transfer | Copying or dropping channel histories |
| `volume-conductor.js` | Analytic transfer coefficients and point-source fields | Unlabeled radius clamps |
| `experiment.js` | Protocols, coupling, traces, diagnostics and serialization | Display-timed integration |
| `worker.js` | Request/result lifecycle and progress | Random defaults or hidden quality reduction |
| `electrical.js` | Cached applied-potential slices, explicit scales, replay indexing and run summaries | Neural volume inferred from contact traces |
| `placement.js` | Shared solver membrane-exclusion diagnostics and apex-depth translation | New collision physics |
| `examples.js` | Immutable complete experiments and verified example metadata | Hardcoded computed traces |
| `scene.js` | Uniform µm→mm conversion, shared device mesh, physical rendering | Signal fabrication |
| `CortexLaboratory.jsx` | Input, inspection, plots and local downloads | Physics hidden in UI callbacks |
| `evidence.js` | Source IDs, evidence categories, parameter default provenance | A claim of validation |

Pure numerical modules run in both a browser worker and Node tests. The scene
is dynamically loaded independently; lack of WebGL falls back to Three's software
SVG renderer. If both renderers fail, computation and exports remain accessible.

## State and coupling

`ExperimentConfig → makeWorld → protocol → selected cable → I_membrane → lead field → signals`.
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
only the inspected frame, at a selectable 0.25–10 biological ms per wall-clock second (default 1); it never
reintegrates the equations. Benchmarks time only the solve, not replay.

Completed workers remain available for subsequent runs. The active kernel may
reuse a bounded four-entry cache of its own no-drive conditioned state, keyed by
model, mesh, timestep and conditioning duration. Cancellation/error/unmount
terminate the worker and discard its cache. Reference-simulator solutions never
enter this cache. Active runs require a Worker; passive runs retain the bounded
main-thread fallback. Browser lifecycle behavior remains an explicitly unverified interactive QA item.

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
- `cortex-experiment/2`, `cortex-result/2`: explicit active model identity,
  pinned source fit/temperature, supported native meshes, cell rotation, separate
  integration/output periods and conditioning; results add source hashes/fit,
  grouped ionic/capacitive currents, calcium/NaV state and internal-step crossing
  events. Version-1 passive configurations retain their original semantics.
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

The offline adapter supports the selected pinned SWC through native NEURON;
there is no general browser SWC/SONATA/NeuroML/NWB importer. Config import accepts
the two explicit experiment versions and validates bounds before expensive work. Future adapters
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

The active boundary is `scripts/cortex-active-reference-input.mjs`: exact configs
and transformed geometry only. Native NEURON imports the original SWC, applies
the published directed axon processor and original NMODL, then supplies total
membrane currents to actual LFPykit. Every exported physical-compartment sample
is checked against hashed compressed fixtures; website CI needs only Node.

## Electrical workbench display contract

Display state is separate from experiment configuration: slice pose/extent/opacity,
visibility, color limits, selected component, plot reference and replay frame never
change solver coordinates or resolution. UI result downloads add a `visualization`
object to the result bundle; numerical schema and arrays retain their semantics.
CSV continues to contain both individual infinity-referenced contacts and A−B.
The UI plot-reference selector is a display choice, independent of the historical
configuration preferred-reference field.

Each loaded example replaces the full experiment and clears the current result;
one pinned result remains available. Comparisons enumerate changed fields and
retain each run’s own configuration. Baseline results are never overlaid onto a
changed geometry. Changing numerical input hides old electrical overlays and
plots; cancel terminates the worker, and unmount disposes scene buffers and labels.
Slice changes dispose replaced geometry/materials and reuse the device/neuron.

Slice-transfer caches are keyed by world identity and plane configuration, bounded
to four entries per live world. Result summaries use weak keys; trace paths are
memoized independently of the replay cursor. Replaying an unchanged pulse interval
reuses slice colors. No history scan is performed on every replay tick.
