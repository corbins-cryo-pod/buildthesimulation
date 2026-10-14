# Cortex Laboratory

Route: `/cortex/`. Public methods: `/cortex/methods/`.
Active engine: `cortex-active/0.2.0`; active experiment schema: `cortex-experiment/2`.

This is a shared scientific foundation and electrical workbench, not a completed population platform.
It contains one representative cortical slab, one published human temporal cell, and
the existing catalog's Utah 1.5 mm reference. Synaptic recording, intracellular
current clamp and extracellular stimulation use the **same physical world**.
The laboratory uses human temporal layer-2 spiny specimen
571654895: reconstructed dendrites, fitted section parameters, nine channel
mechanisms, calcium dynamics and the published synthetic 60 µm axon stub.
The human cell is the only selectable model and the default for initial load and reset. The simplified passive arbor is retired from the interactive laboratory; its mathematical kernel and original fixtures remain offline regression references.

## What works

- Physically scaled 3D patch with pia, illustrative I–VI boundaries, CSF and white
  matter guides; cutaway/opacity; orthographic/perspective views; physical scale
  bar; compartment, contact-coordinate and soma-distance inspection.
- Catalog-based implant translation/rotation/depth; physical sites remain
  separate from simultaneous channels and unknown channel assignment.
- Human active cable, total outward membrane currents, point/line-source
  recordings, explicit source/return stimulation and computed field section.
- Two ideal recording sites, infinity/bipolar reference, separated neural and
  applied-source signals, replay/step, pinned-run comparison, configuration
  round trip, CSV and self-contained provenance/results JSON.
- Worker execution, cancellation, bounded CPU fallback, numerical tests and
  reproducible Node benchmarks; pinned NEURON 9.0.1 uniform/branched-cable references
  and independent LFPykit 0.6.2 coefficients and recordings for all three protocols.

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
reports failed gates transparently; no deeper physical model is released.

```sh
node scripts/verify-cortex-examples.mjs
node scripts/cortex-refinement-study.mjs
node scripts/benchmark-cortex-workbench.mjs
```

## What does not work yet

No neural populations, regional tissue scans, layered conductivity, finite exposed Utah tip
model, acquisition electronics, mechanics or experimental validation. No clinical,
device-performance or tissue-safety inference is supported. See [ROADMAP](ROADMAP.md).
Active numerical verification is not held-out biological validation. The selected
cell is temporal, not M1; its axon is a model stub and kinetics have mixed-species
origins. See [ACTIVE_MODEL](ACTIVE_MODEL.md) for source, license and exact scope.

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

The structured evidence and parameter registry is
`src/lib/cortex/evidence.js`, used by the public methods page and JSON export.
Treat repository source and the exported versioned configuration as authoritative.
