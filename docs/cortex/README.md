# Cortex Laboratory

Route: `/cortex/`. Public methods: `/cortex/methods/`.
Engine: `cortex-passive/0.1.0`. Experiment schema: `cortex-experiment/1`.

This is the first shared scientific vertical slice, not the completed platform.
It contains one representative cortical slab, one synthetic passive arbor, and
the existing catalog's Utah 1.5 mm reference. Synaptic recording, intracellular
current clamp and extracellular stimulation use the **same physical world**.

## What works

- Physically scaled 3D patch with pia, illustrative I–VI boundaries, CSF and white
  matter guides; cutaway/opacity; orthographic/perspective views; physical scale
  bar; compartment, contact-coordinate and soma-distance inspection.
- Catalog-based implant translation/rotation/depth; physical sites remain
  separate from simultaneous channels and unknown channel assignment.
- Passive branched cable, total outward membrane currents, point/line-source
  recordings, explicit source/return stimulation and computed field section.
- Two ideal recording sites, infinity/bipolar reference, separated neural and
  applied-source signals, replay/step, pinned-run comparison, configuration
  round trip, CSV and self-contained provenance/results JSON.
- Worker execution, cancellation, bounded CPU fallback, numerical tests and
  reproducible Node benchmarks; an independent pinned NEURON 9.0.1 passive-cable fixture.

## What does not work yet

No active channels, action potentials, neural populations, human-specific fitted
models, curved anatomical scans, layered conductivity, finite exposed Utah tip
model, acquisition electronics, mechanics or experimental validation. No clinical,
device-performance or tissue-safety inference is supported. See [ROADMAP](ROADMAP.md).

## Development

Use Node 22 and the existing lockfile. No dependency was added for this feature.

```sh
npm ci
node --test tests/cortex-laboratory.mjs
npm test
npm run build
node scripts/verify-cortex-build.mjs
node scripts/benchmark-cortex.mjs
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
node --test tests/cortex-neuron-reference.mjs
```

Keep the environment outside the checkout if preferred; never commit it. The
fixture records package versions, NEURON build, generator hash and exact config.

## Documentation map

| Document | Purpose |
| --- | --- |
| [AUDIT](AUDIT.md) | Inspected base, reusable code and limitations |
| [ARCHITECTURE](ARCHITECTURE.md) | Boundaries, data contract and coupling |
| [RESEARCH](RESEARCH.md) | Scientific evidence, solver/license review and gaps |
| [PHYSICS](PHYSICS.md) | Equations, signs, units, boundaries and algorithms |
| [PARAMETERS](PARAMETERS.md) | Assumptions, defaults, uncertainty and provenance |
| [VALIDATION](VALIDATION.md) | Verification matrix versus empirical validation |
| [PERFORMANCE](PERFORMANCE.md) | Measured cost, limits and benchmark procedure |
| [DECISIONS](DECISIONS.md) | Accepted/rejected choices |
| [ROADMAP](ROADMAP.md) | Dependency-gated next work |
| [PROGRESS](PROGRESS.md) | Handoff, checks and review status |

The structured evidence and parameter registry is
`src/lib/cortex/evidence.js`, used by the public methods page and JSON export.
Treat repository source and the exported versioned configuration as authoritative.
