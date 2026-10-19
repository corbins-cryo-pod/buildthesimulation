# Cortex laboratories

Current routes: `/cortex/` for the detailed cell/reference workbench;
`/cortex/interface/` for the integrated twelve-cell neural interface.
Active engine: `cortex-active/0.2.0`; original active experiment schema:
`cortex-experiment/2`; integrated experiment schema: `cortex-interface/1`.

## Current capabilities

| Surface | Implemented scope | Current record |
| --- | --- | --- |
| Original Cortex Laboratory | Sixteen distinct human source specimens, current clamp, synaptic input, extracellular stimulation, physical implant placement, ideal recordings and detailed membrane replay | [Cell library](CELL_LIBRARY.md), [architecture](ARCHITECTURE.md) |
| Original population experiments | Distinct-specimen cloud/grid/shell placements within the available filtered pool and work/memory limits; unsupported placements are explicit | [Cell library](CELL_LIBRARY.md), [population history](POPULATIONS.md) |
| Finite-disk laboratory mode | Active human-cell coupling to a pinned disk field with restricted coverage and exact-case evidence | [Finite integration](FINITE_CONTACT_INTEGRATION.md), [finite rigor](FINITE_RIGOR.md) |
| Neural Interface Laboratory | Twelve distinct human active models, eight selectable finite rectangular pads on a hypothetical shank, complete compartment replay, ideal reciprocal recordings and soma-event rasters | [Integrated laboratory](INTERFACE_LABORATORY.md), [cell drive presets](INTERFACE_CELL_PRESETS.md) |
| Field benchmarks | Standalone finite-disk package and surface-geometry gallery with scoped numerical checks | [Finite contact handoff](FINITE_CONTACT_HANDOFF.md), [field gallery](FIELD_GALLERY.md) |

The integrated laboratory uses a joint contact solution with an **infinite
insulating backing plane**, not a solved finite shank body. The shank tip,
back and sides are visible geometry but do not yet shape its field. Repeated
baseline firing comes from explicit calibrated somatic current; the cells are
independent, without a synaptic network. Public methods are at
`/cortex/interface/methods/` and `/cortex/methods/`.

The source library includes fourteen human EAP fits and two explicitly described
human epilepsy basket-cell adaptations. Specimen 571654895 remains the original
human temporal layer-2 reference, not the only selectable model. Dendrites,
source-fitted channels and source-prescribed short axons retain their original
model identities. The former 64-copy population is historical; current selection
does not repeat specimen identities. Passive mathematical kernels and fixtures
remain offline regression references, not the interactive default.

Physical implant sites remain separate from hardware channels and unknown
channel assignment. The original workbench offers two ideal contact signals,
infinity/bipolar display references, separate neural/applied components,
configuration import, pinned comparisons and exports. The integrated workbench
records all eight pads and exports its protocol, signals and full replay.
Workers handle active solves; cancellation does not manufacture results.
Independent NEURON/LFPykit references and finite-field studies apply only to their
specified configurations; they do not certify the new interface generally.

Historical handoff documents retain the state and limitations of their dated
milestone. The retained offline disk package is at
[`workbench/cortex-finite-contact-field/`](../../workbench/cortex-finite-contact-field/).
The [platform review](../platform/REVIEW_2026-10-18.md) records the integration's
remaining gaps and staged development plan; proposed capabilities are not shipped
features.

## Electrical workbench milestone

The laboratory now follows Choose → Inspect → Run → Replay → Compare/export.
A concise first-run guide, nine complete human-cell examples, separate physical-quantity
legends, configurable applied-potential slices, labeled guide tips, shared
near-contact diagnostics and explicit pial/apex-depth controls connect the
geometry to the numerical experiment. Current input edits require rerunning;
display edits update immediately. Default replay is 1 biological ms/s, with
phase jumps and individual sample stepping.

See [EXAMPLES](EXAMPLES.md), [REFINEMENT](REFINEMENT.md) and the public methods
page. Example outcomes are reproduced calculations, not biological thresholds.
The 3×3 refinement study preserves physical morphology/channel totals and
reports failed gates transparently. These historical gates do not establish
convergence of the later finite-contact experiments.

```sh
node scripts/verify-cortex-examples.mjs
node scripts/cortex-refinement-study.mjs
node scripts/benchmark-cortex-workbench.mjs
```

## What does not work yet

No coupled networks, regional tissue scans, layered conductivity, solved finite
shank body or finite exposed Utah tip model, acquisition electronics, mechanics
or independent experimental validation. No clinical,
device-performance or tissue-safety inference is supported. See [ROADMAP](ROADMAP.md).
Active numerical verification is not held-out biological validation. The source
models are not a measured M1 circuit; their short axons and mixed-species channel
kinetics retain the limitations of the original fits. See
[ACTIVE_MODEL](ACTIVE_MODEL.md) for source, license and exact scope.

## Development

Use Node 22 and the existing lockfile. No website/runtime dependency was added.

```sh
npm ci
node --test tests/cortex-laboratory.mjs
npm test
npm run build
node scripts/verify-cortex-build.mjs
node scripts/benchmark-cortex.mjs
node scripts/benchmark-cortex-active.mjs
npm run dev
```

The existing `prebuild` runs all `tests/*.mjs`; CI already calls `npm run build`.
Static artifact checks verify built routes, search integration and bundled worker
wiring. The Node worker bridge checks the actual worker module's protocol and
transferred output; neither substitutes for browser interaction QA.
The benchmark writes the small tracked `benchmarks/latest.json`, not raw recordings.
Client exports are local browser downloads and do not upload neural data.

Optional independent-reference regeneration (not required for normal website tests):

```sh
python -m venv .venv-cortex-reference
.venv-cortex-reference/bin/python -m pip install -r scripts/cortex-reference-requirements.txt
.venv-cortex-reference/bin/python scripts/cortex-neuron-reference.py
.venv-cortex-reference/bin/python scripts/cortex-neuron-arbor-reference.py
.venv-cortex-reference/bin/python scripts/cortex-lfpykit-reference.py
node --test tests/cortex-neuron-reference.mjs tests/cortex-neuron-arbor.mjs tests/cortex-lfpykit-reference.mjs
```

Keep the environment outside the checkout if preferred; never commit it. These
are offline reference packages, excluded from the website. Fixtures record
package versions, NEURON build, generator/input hashes and exact configurations.
Run the arbor generator before the LFPykit generator, which consumes its independent
membrane currents. See [REFERENCE_COMPARISONS](REFERENCE_COMPARISONS.md) for scope.

### Active reference reproduction

Original model assets and the noncommercial Allen Institute Software License are
retained at `public/models/cortex/allen571654895/`. Original NMODL sources and
license are in `scripts/cortex-active-mechanisms/`; they run offline, not in the
website. Compile them outside the checkout with the pinned NEURON installation:

```sh
# From the repository root; use the environment prepared above.
cortex_repo_dir="$PWD"
mkdir -p /tmp/cortex-active-reference-build
cd /tmp/cortex-active-reference-build
CC=gcc CXX=g++ "$cortex_repo_dir/.venv-cortex-reference/bin/nrnivmodl" "$cortex_repo_dir/scripts/cortex-active-mechanisms"
export CORTEX_ACTIVE_MECHANISM_LIBRARY="$PWD/x86_64/libnrnmech.so"
cd "$cortex_repo_dir"
.venv-cortex-reference/bin/python scripts/cortex-active-model.py
.venv-cortex-reference/bin/python scripts/cortex-active-neuron-reference.py
.venv-cortex-reference/bin/python scripts/cortex-active-threshold-reference.py
node --test tests/cortex-active.mjs tests/cortex-active-reference.mjs tests/cortex-active-thresholds.mjs
```

Compiler/library paths vary by host. This managed runtime additionally needed
`NMODL_PYLIB` pointing to its Python shared library. No compiled library is
committed. Full physical-compartment voltage/current references use hashed
gzip/int32 delta fixtures with explicit quantization far below test tolerances.
The main reference also retains exact snapshots, dense soma/contact signals,
internal-step crossing times and held-voltage channel trajectories.

## Documentation map

| Document | Purpose |
| --- | --- |
| [AUDIT](AUDIT.md) | Inspected base, reusable code and limitations |
| [ARCHITECTURE](ARCHITECTURE.md) | Boundaries, data contract and coupling |
| [RESEARCH](RESEARCH.md) | Scientific evidence, solver/license review and gaps |
| [PHYSICS](PHYSICS.md) | Equations, signs, units, boundaries and algorithms |
| [PARAMETERS](PARAMETERS.md) | Assumptions, defaults, uncertainty and provenance |
| [VALIDATION](VALIDATION.md) | Verification matrix versus empirical validation |
| [REFERENCE_COMPARISONS](REFERENCE_COMPARISONS.md) | Independent NEURON/LFPykit construction, results and limits |
| [EXAMPLES](EXAMPLES.md) | Exact curated experiments, measured outcomes and reproduction |
| [REFINEMENT](REFINEMENT.md) | Predeclared 3×3 convergence study and unresolved gates |
| [ACTIVE_MODEL](ACTIVE_MODEL.md) | Human active model provenance, conventions and verification gates |
| [PERFORMANCE](PERFORMANCE.md) | Measured cost, limits and benchmark procedure |
| [DECISIONS](DECISIONS.md) | Accepted/rejected choices |
| [ROADMAP](ROADMAP.md) | Dependency-gated next work |
| [PROGRESS](PROGRESS.md) | Handoff, checks and review status |
| [FINITE_CONTACT_HANDOFF](FINITE_CONTACT_HANDOFF.md) | Verified finite-disk source/data package and next-worker integration instructions |

The structured evidence and parameter registry is
`src/lib/cortex/evidence.js`, used by the public methods page and JSON export.
Treat repository source and the exported versioned configuration as authoritative.
