# Reproduce the electrical-core release

This page retains the original motor-fiber electrical-core workflow. The
complete explicit-well, five-band bipolar Stage 1 workflow is documented in
[STAGE1_REPRODUCTION.md](STAGE1_REPRODUCTION.md), with its separate
`reproduce-stage1.py` entry point and `reproduction-stage1-report.json` aggregate.
The historical core report is not relabeled as a current full Stage 1 run.

The single entry point rebuilds the native NEURON mechanism, regenerates the
independently assembled Python field reference, executes the membrane and
field numerical studies, and executes the software/Worker integration tests.
It retains failed studies and does not change acceptance thresholds.

From the repository root:

```bash
python3 scripts/axon-interface/reproduce.py
```

The script creates an isolated Python environment under
`scripts/axon-interface/.venv` and installs these exact versions:

- NEURON 8.2.7
- NumPy 2.3.5
- scipy 1.17.0

Node 24.22.1 and Python 3.12.14 were used for the release checks. A working GCC
and G++ toolchain is required to compile the original ModelDB `AXNODE.mod`.
The script explicitly selects GCC/G++ because the NEURON wheel's default
compiler choice requested an unavailable `clang++` in the original environment.
That initial build failure remains documented with the numerical report.

To use an already provisioned environment without changing its packages:

```bash
python3 scripts/axon-interface/reproduce.py --python /absolute/path/to/venv/bin/python
```

The script checks that all three dependency versions match the pinned versions.
It refuses a mismatched environment. Do not replace a failed native reference
with a same-language reimplementation or treat an old compiled binary as a
successful native rebuild.

## Outputs

| File | Contents |
|---|---|
| `docs/axon-interface/field-validation.json` | Field residuals, analytic tests, refinements, sensitivity and retained failures |
| `docs/axon-interface/field-reference.json` | Independently assembled scipy comparison |
| `docs/axon-interface/mrg-numerical-report.json` | Membrane studies, native NEURON comparisons and retained failures |
| `docs/axon-interface/mrg-coupled-report.json` | Native NEURON checks using actual production FEM transfer coefficients and matched silencing interventions |
| `docs/axon-interface/integration-validation.json` | Actual executed software and production Worker test results |
| `docs/axon-interface/reproduction-report.json` | Commands, runtime, hardware, pinned versions, source hashes and overall status |

Native mechanism binaries and execution logs are generated build products and
are ignored by Git. Commit the mechanism source and reported numerical evidence,
not architecture-specific `.so`, `.o`, `special`, or compiler intermediates.

The large raw numerical arrays are regenerated on every full reproduction and
are not prerequisites for a fresh clone. The field validator writes
`docs/axon-interface/field-reference-input.json` from the current JavaScript
geometry before invoking the independent Python assembly. The MRG validators
create `docs/axon-interface/mrg-reference-data/`, write each current fixture,
execute native NEURON and then write its raw traces and comparison arrays.
These generated raw inputs and outputs can be excluded from version control.
Keep the compact reports, source pins, acceptance files and failure histories
with the source. No successful current comparison is inferred from a saved old
raw trace or from an old compiled mechanism.

Every relevant model, reference script, acceptance file and integration test is
hashed. If one changes while verification runs, the reproduction report fails
its source-stability check. Re-run against a fixed revision; do not relabel the
old measurements as verification of the changed source.

For a quick software integration check:

```bash
python3 scripts/axon-interface/reproduce.py --integration-only
```

This explicitly reports the narrower scope and **does not** claim that native
reference or numerical studies were regenerated. For CI's normal software
tests, `node --test tests/axon-interface-contracts.mjs` runs the same production
integration cases without rebuilding NEURON.

## What a passing report establishes

A passing numerical report establishes agreement and convergence for the
declared electrical equations and tested configurations. It does not establish
a biological ganglion replacement, an organoid-to-host synapse, preserved host
identities, appropriate reinnervation, implant safety, or human function.

Exploratory model failures—especially the active enlarged-soma case—remain in
the report. A passing motor-fiber benchmark does not convert them into passing
biological models.
