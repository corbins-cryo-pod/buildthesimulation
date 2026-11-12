# Reproduce the complete Stage 1 numerical evidence

The Stage 1 entry point is
[`scripts/axon-interface/reproduce-stage1.py`](../../scripts/axon-interface/reproduce-stage1.py).
Its default mode executes the complete declared numerical and integration
sequence. It does not replace or rewrite the retained electrical-core
`reproduce.py` entry point or historical `reproduction-report.json`.

From the repository root:

```bash
python3 scripts/axon-interface/reproduce-stage1.py
```

The default creates an isolated reference environment under
`scripts/axon-interface/.venv`, installing exactly NEURON 8.2.7, NumPy 2.3.5 and
SciPy 1.17.0. Node 24.22.1, Python 3.12.14 and GCC/G++ were used for the retained
release evidence. A working native compiler and sufficient memory for the full
256-well fixture are required. Resource limits produce errors; the script does
not reduce the population to make a run fit.

An existing Python environment may be selected without modifying its packages:

```bash
python3 scripts/axon-interface/reproduce-stage1.py --python /absolute/path/to/venv/bin/python
```

All three package versions must match the pins. The virtual-environment
executable path is preserved rather than resolving its symlink to the system
interpreter. The script selects GCC/G++ explicitly and compiles the unchanged
ModelDB mechanism in a fresh native output directory. Earlier ignored build
products are archived under `.reproduction/`; no source file is changed or old
binary counted as a successful fresh compilation. Do not run a native rebuild
concurrently with reference processes loading that same mechanism directory.

## What the default executes

The following commands run sequentially, with captured exit codes, timestamps,
logs and reference environment. The actual selected Node and Python paths are
recorded in the execution report.

| Stage | Producing command or operation | Required evidence |
|---|---|---|
| Native mechanism | Pinned environment's `nrnivmodl`, GCC/G++ | `native-build-report.json` |
| Layered benchmark field | `node scripts/axon-interface/field-validate.mjs` | `field-validation.json`, 12 checks |
| Motor membrane | `node scripts/axon-interface/mrg-validate.mjs` | `mrg-numerical-report.json`, 55 required checks |
| Motor plus production field | `node scripts/axon-interface/mrg-coupled-validate.mjs` | `mrg-coupled-report.json`, three native interventions |
| Explicit well field | `node scripts/axon-interface/field-stage1-validate.mjs` | `field-stage1-validation.json`, 21 checks |
| Adjacent wells | `node scripts/axon-interface/field-stage1-dense-validate.mjs` | `field-stage1-dense-validation.json`, 11 checks |
| Grounded-domain expansion | `node scripts/axon-interface/field-stage1-domain-validate.mjs` | `field-stage1-domain-validation.json`, two checks |
| Five-band bipolar component | `node scripts/axon-interface/bipolar-validate.mjs` | `bipolar-numerical-report.json`, 66 required checks |
| Actual-well soma refinement | `node scripts/axon-interface/bipolar-soma-spatial.mjs` | `bipolar-soma-spatial-report.json`, authoritative five-band selection |
| Actual-well native and time comparisons | `node scripts/axon-interface/bipolar-coupled-validate.mjs` | `bipolar-coupled-report.json`, 12 native and 16 temporal cases |
| Both integration suites | Node's test runner on the three files below | `integration-validation.json`, 24 passing tests |
| Full Stage 1 protocol | `node scripts/axon-interface/stage1-protocol-validate.mjs` | `stage1-protocol-validation.json`, actual four-cell and 256-cell fixtures |

Every native command receives `MRG_PYTHON` pointing to the pinned environment;
the field reference uses `AXON_REFERENCE_PYTHON`. The wrapper explicitly sets
`STAGE1_FIELD_EXPLORATORY=false`. A prototype soma study or exploratory coupled
report cannot satisfy the authoritative gate.

The combined integration command runs:

```bash
node --test --test-concurrency=1 \
  tests/axon-interface-contracts.mjs \
  scripts/axon-interface/field-contract-tests.mjs \
  tests/axon-interface-stage1-contracts.mjs
```

The wrapper requests JUnit output so that it can retain each actual result.
The report separates 15 legacy-core/field tests from nine Stage 1 tests. These
include real Worker termination and request-identity handling, strict imports,
source decomposition, deterministic geometry, exact phase integration,
budgets, fixed identity bookkeeping, disconnected-stump diagnostics and
retention of failed study samples. The protocol validator also performs its
own Stage 1 contracts before its two full simulations.

## Verify already executed evidence without rerunning it

```bash
python3 scripts/axon-interface/reproduce-stage1.py --verify-existing
```

This mode performs no numerical solve, native compilation, dependency
installation or full-population execution. It validates the current source
hashes and all required report contents, then writes the same aggregate path
with a different, explicit mode. It is appropriate when the declared studies
have already been executed separately against frozen sources. It cannot repair
a stale source hash, incomplete run or failed report.

The release evidence was assembled using separately executed final field,
bipolar, legacy-refresh, integration and full-protocol commands. Existing
reports retain their own original measurement times. A successful verification
of those reports is not described as a new monolithic execution of the entire
sequence. A canonical producer command is identified by its validator source
hash; exact earlier shell arguments are only asserted where a captured command
record is available. The legacy refresh has its own
`legacy-membrane-refresh.json` command record. A later fresh native compilation
establishes rebuildability of the unchanged pinned inputs; it does not imply
that an earlier reference process loaded that newly compiled file.

The recorded release aggregation completed at
`2026-11-11T23:33:28.969095+00:00` in `verified-existing-evidence` mode: all 12
required reports passed, all 61 current source hashes matched, all ten frozen
acceptance/correction declarations matched, and zero numerical commands were
executed by that aggregation. The separate combined integration command passed
24/24 tests. The full 256-cell protocol passed 28/28 report checks, including
the small cohort, and retained all 1024 full-cohort intervention solves.

Both modes write
[`docs/axon-interface/reproduction-stage1-report.json`](reproduction-stage1-report.json).
The aggregate uses:

| Key | Meaning |
|---|---|
| `scope` | `stage1-complete-numerical-and-integration` |
| `mode` | `executed` or `verified-existing-evidence` |
| `measurementsRegenerated` | Whether this invocation executes the numerical sequence |
| `commandsExecutedThisInvocation` | Actual captured commands; empty in existing-evidence mode |
| `evidence` | Twelve required reports, report hashes, producer identities, original measurement timestamps and individual validation results |
| `sourceHashes`, `sourceHashesAfter` | Current numerical, vendor, validator, acceptance/correction and test source snapshots |
| `sourceChangedDuringRun` | Must be empty |
| `frozenAcceptance` | Exact frozen declaration/correction hashes and verification results |
| `status` | Pass only if every required evidence and source gate passes |

The aggregate validates every report's source hashes against the current files.
It requires the current motor reference, all three well-field reports,
five-band component and authoritative soma/coupled evidence, both integration
suites and complete full-population protocol. A 256-cell report must contain
all 256 physical wells, 256 cell/channel pairs, 1024 matched intervention
solves, four complete boolean matrices, all per-cell control summaries and
actual runtime and peak-memory measurements. A diagnostic `--small-only`
protocol report explicitly fails this release gate.

The original field validator records final source hashes without a separate
before/after field. This narrower provenance is identified in its aggregate
entry. Its current source must still match exactly; the default complete
wrapper additionally snapshots all sources before and after the entire run.

## Frozen tolerances and retained failures

The wrapper pins the exact acceptance files and the documented numerical
resolution corrections. The bipolar correction records preserve the failed
coarse time step and coarse soma segmentation. The supported five-band
resolution requires two consecutive passing declared refinements; the failed
one-to-three and three-to-five comparisons remain visible. No biological
outcome is forced to pass a numerical gate. Recruitment, soma necessity and
original-host identity preservation remain separate measured or structural
outcomes.

An aggregate failure is appended to `reproduction-stage1-history.jsonl`.
Field, membrane, coupled and integration histories remain separate. Sources
changing during a study, missing or stale evidence, skips, a failed native
build or a failed full-population allocation withhold a passing aggregate.
The script does not substitute an old report for a failed executed command.

## Regenerable intermediates and source storage

Compiled mechanisms, compiler intermediates, execution logs and raw reference
arrays are build products. A fresh clone needs the committed sources,
dependency pins, acceptance/correction files, compact reports and failure
histories; it does not need an architecture-specific binary or an old trace.

`field-stage1-validate.mjs` writes
`docs/axon-interface/field-stage1-reference-input.json` from the current
JavaScript mesh, contacts and loads, then invokes the independent Python
assembler to regenerate `field-stage1-reference.json`. Both files can be
ignored by Git. They are not hashed as fixed repository inputs. The compact
main report retains the independent comparison, threshold, source hashes and
runtime. The legacy field raw input and `mrg-reference-data/` are regenerated
in the same way. Bipolar native raw arrays are also generated from the current
fixtures. The full protocol writes compressed complete results outside the
repository and retains their hashes, dimensions, matrices and control summaries
in its compact report.

The bundled `cdt2d` module, exact dependency lock/pins and third-party licenses
are fixed source inputs and are hashed. No network download occurs during
browser meshing. The aggregate includes every current numerical module,
reference/validation script, ModelDB source, acceptance/correction declaration
and both integration suites. UI presentation changes are separate from these
numerical provenance checks.

## Scope of a passing result

A pass verifies the implemented equations, selected numerical resolution,
matched computational interventions and the completed declared population. It
does not validate human spiral-ganglion channel densities, biological growth,
selective target reinnervation, neuronal survival, charge-injection safety,
chronic tissue response or clinical function. The field and membrane methods
state the remaining geometric and physical approximations explicitly.
