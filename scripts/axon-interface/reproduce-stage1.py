#!/usr/bin/env python3
"""Reproduce the declared Stage 1 numerical and integration evidence.

The default executes every required reference/validation command. The explicit
--verify-existing mode executes no numerical study: it verifies already executed
reports, their current sources, frozen acceptance and full 256-cell fixture.
Neither mode treats numerical verification as biological validation.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DOCS = ROOT / 'docs/axon-interface'
CACHE = HERE / '.reproduction'
REPORT = DOCS / 'reproduction-stage1-report.json'
HISTORY = DOCS / 'reproduction-stage1-history.jsonl'
SCOPE = 'stage1-complete-numerical-and-integration'
spec = importlib.util.spec_from_file_location('axon_core_reproduction', HERE / 'reproduce.py')
core = importlib.util.module_from_spec(spec)
spec.loader.exec_module(core)

# These declarations predate their studies. Resolution corrections preserve the
# original failures and thresholds; changing a gate requires a new release.
FROZEN_ACCEPTANCE = {
    'field-acceptance.json': '93f9471d7435aa54b0fd5a7bc4222b7c32c80fa9ad6109cb8f5b7835030e6b53',
    'mrg-acceptance.json': 'a565c572245357e51dbbb960594befb3142a1983a5c743d705f300cc146c0274',
    'field-stage1-acceptance.json': 'ae35cf03dc5c67061e5e3d9feddb8ffe174c65efb30f2166eb8f0bc4cab02f33',
    'field-stage1-dense-acceptance.json': '58c0d5effa596270d5bc3fb2f058ca8ff2d800dd9e2e1a8232e439b3fc1b5402',
    'field-stage1-domain-acceptance.json': '6bff51700c832aad7662560a211383a0cf0857e926a8bd06cf75984571e46f5d',
    'bipolar-acceptance.json': '9d0bf929490004022deccdce7d28260cf4de8a5f78dee82da92fc7c4b16a94d0',
    'bipolar-resolution-correction.json': 'fe5d1c9b499b78e79220e207f26dc5892d03855f861529d99ecd18e0d5692f1e',
    'bipolar-soma-resolution-correction.json': '7756463dfefc8f1644fcea144a2ad87b1d090ac171a0bd03bcc3655762e36472',
    'bipolar-soma-spatial-acceptance.json': 'bc9f1f00780d1b87ba5d4e5955744c3dcfd34cfe579dd42e97853bfbdf8e461c',
    'bipolar-coupled-acceptance.json': '957d45e22de2c6e34ea4b175ff7f83bd073e824cb49f49aca33de63919d98b8a',
}

STUDIES = [
    ('field', 'field-validation.json', 'field-validate.mjs'),
    ('membrane', 'mrg-numerical-report.json', 'mrg-validate.mjs'),
    ('motorCoupled', 'mrg-coupled-report.json', 'mrg-coupled-validate.mjs'),
    ('wellField', 'field-stage1-validation.json', 'field-stage1-validate.mjs'),
    ('denseWells', 'field-stage1-dense-validation.json', 'field-stage1-dense-validate.mjs'),
    ('wellBoundary', 'field-stage1-domain-validation.json', 'field-stage1-domain-validate.mjs'),
    ('bipolar', 'bipolar-numerical-report.json', 'bipolar-validate.mjs'),
    ('somaSpatial', 'bipolar-soma-spatial-report.json', 'bipolar-soma-spatial.mjs'),
    ('bipolarCoupled', 'bipolar-coupled-report.json', 'bipolar-coupled-validate.mjs'),
    ('protocol', 'stage1-protocol-validation.json', 'stage1-protocol-validate.mjs'),
]


def read_json(path):
    def reject(value):
        raise ValueError(f'Nonfinite JSON value {value} in {path}')
    return json.loads(path.read_text(), parse_constant=reject)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + f'.tmp-{os.getpid()}')
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')
    temporary.replace(path)


def relative(path):
    return str(path.relative_to(ROOT))


def source_path(name):
    if not isinstance(name, str) or Path(name).is_absolute():
        raise ValueError(f'Source path must be repository-relative: {name!r}')
    path = (ROOT / name).resolve()
    if not path.is_relative_to(ROOT) or path == ROOT:
        raise ValueError(f'Source path leaves the repository: {name}')
    return path


def source_snapshot():
    files = set()
    for p in (ROOT / 'src/lib/axon-interface').rglob('*'):
        if p.is_file() and p.suffix in ('.mjs', '.json', '.md'):
            files.add(p)
    for pattern in ('*.mjs', '*.py', '*.sh', '*requirements.txt'):
        files.update(HERE.glob(pattern))
    for pattern in ('*.mod', '*.hoc', 'README'):
        files.update((HERE / 'mrg-modeldb').glob(pattern))
    for pattern in ('*acceptance.json', '*correction.json'):
        files.update(DOCS.glob(pattern))
    files.update((ROOT / 'tests').glob('axon-interface*.mjs'))
    files.add(ROOT / 'tests/helpers/axon-interface-worker-harness.mjs')
    return {relative(p): core.sha256(p) for p in sorted(files)}


def differences(before, after):
    return sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p))


def command(name, arguments, *, env=None, cwd=ROOT):
    CACHE.mkdir(parents=True, exist_ok=True)
    started = core.timestamp()
    result = core.command(name, arguments, env=env, cwd=cwd)
    result.update(startedAt=started, completedAt=core.timestamp(), cwd=relative(cwd),
                  mode='executed', executedByThisInvocation=True)
    if env:
        result['referenceEnvironment'] = {k: env[k] for k in
            ('MRG_PYTHON', 'AXON_REFERENCE_PYTHON', 'STAGE1_FIELD_EXPLORATORY', 'CC', 'CXX') if k in env}
    return result


def reference_environment(explicit):
    python, metadata = core.python_environment(explicit)
    env = os.environ.copy()
    env.update(MRG_PYTHON=str(python), AXON_REFERENCE_PYTHON=str(python),
               STAGE1_FIELD_EXPLORATORY='false')
    env['PATH'] = str(python.parent) + os.pathsep + env.get('PATH', '')
    gcc, gpp = shutil.which('gcc'), shutil.which('g++')
    if not gcc or not gpp:
        raise RuntimeError('GCC and G++ are required for the pinned native reference.')
    env.update(CC=gcc, CXX=gpp)
    metadata.update(cCompiler=subprocess.check_output([gcc, '--version'], text=True).splitlines()[0],
                    cxxCompiler=subprocess.check_output([gpp, '--version'], text=True).splitlines()[0])
    return python, metadata, env


def native_build(python, metadata, env):
    """Build fresh mechanism products; never count a saved binary as a rebuild."""
    model = HERE / 'mrg-modeldb'
    compiler = python.parent / ('nrnivmodl.exe' if os.name == 'nt' else 'nrnivmodl')
    if not compiler.is_file():
        raise RuntimeError('Pinned NEURON environment has no nrnivmodl executable.')
    paths = [model / 'AXNODE.mod', model / 'MRGaxon.hoc', model / 'README',
             HERE / 'requirements.txt', HERE / 'reproduce-stage1.py', HERE / 'reproduce.py']
    before = {relative(p): core.sha256(p) for p in paths}
    # Only ignored native build products are moved; model sources are untouched.
    # Do not invoke concurrently with a native reference using this directory.
    architecture = model / platform.machine()
    previous = None
    if architecture.exists():
        previous = CACHE / ('native-build-before-' + str(time.time_ns()))
        architecture.rename(previous)
    execution = command('stage1-native-mechanism-build', [compiler], env=env, cwd=model)
    products = {relative(p): core.sha256(p) for p in architecture.rglob('*')
                if p.is_file() and p.suffix in ('.so', '.dll', '.dylib')} if architecture.exists() else {}
    after = {relative(p): core.sha256(p) for p in paths}
    changed = differences(before, after)
    report = {'schema': 'buildthesimulation.axon-interface.native-build.v1',
              'status': 'pass' if execution['status'] == 'pass' and products and not changed else 'fail',
              'startedAt': execution['startedAt'], 'completedAt': execution['completedAt'],
              'execution': execution, 'referencePython': metadata, 'sourceHashes': before,
              'sourceChangedDuringRun': changed, 'buildProducts': products,
              'freshBuildDirectory': True,
              'previousBuildArchived': relative(previous) if previous else None,
              'meaning': 'Actual fresh compilation of pinned mechanism sources. Generated binaries are local build products, not committed evidence or prerequisites for a fresh clone.'}
    write_json(DOCS / 'native-build-report.json', report)
    return execution, report


def integration(node):
    """Execute both current integration suites plus the legacy field contracts."""
    before = source_snapshot()
    xml = CACHE / 'stage1-all-integration-tests.xml'
    args = [node, '--test', '--test-concurrency=1', '--test-reporter=junit',
            f'--test-reporter-destination={xml}', 'tests/axon-interface-contracts.mjs',
            'scripts/axon-interface/field-contract-tests.mjs', 'tests/axon-interface-stage1-contracts.mjs']
    execution = command('stage1-all-integration-tests', args)
    try:
        cases = core.junit_report(xml)
    except Exception as error:
        cases = [{'name': 'Machine-readable integration report', 'status': 'fail', 'failure': str(error)}]
    for case in cases:
        case['suite'] = 'stage1' if case.get('name', '').startswith('Stage 1:') else 'legacy-core-and-field'
    summary = {key: sum(c['status'] == value for c in cases)
               for key, value in (('passed', 'pass'), ('failed', 'fail'), ('skipped', 'skipped'))}
    suites = {name: {'passed': sum(c['suite'] == name and c['status'] == 'pass' for c in cases),
                     'failed': sum(c['suite'] == name and c['status'] == 'fail' for c in cases),
                     'skipped': sum(c['suite'] == name and c['status'] == 'skipped' for c in cases)}
              for name in ('legacy-core-and-field', 'stage1')}
    changed = differences(before, source_snapshot())
    complete = suites['legacy-core-and-field']['passed'] == 15 and suites['stage1']['passed'] == 9
    history = DOCS / 'integration-history.jsonl'
    failures = [dict(timestamp=core.timestamp(), event='failed-integration-test', **c)
                for c in cases if c['status'] != 'pass']
    if changed:
        failures.append({'timestamp': core.timestamp(), 'event': 'integration-source-changed', 'paths': changed})
    if failures:
        with history.open('a') as stream:
            for failure in failures:
                stream.write(json.dumps(failure, allow_nan=False) + '\n')
    retained = [json.loads(line) for line in history.read_text().splitlines() if line] if history.exists() else []
    report = {'schema': 'buildthesimulation.axon-interface.integration-validation.v2',
              'generatedAt': core.timestamp(), 'scope': 'Executed current core, field, Stage 1 and production Worker contracts.',
              'status': 'pass' if execution['status'] == 'pass' and complete and summary['failed'] == summary['skipped'] == 0 and not changed else 'fail',
              'summary': summary, 'suites': suites, 'tests': cases, 'execution': execution,
              'sourceHashes': before, 'sourceChangedDuringRun': changed, 'retainedFailures': retained,
              'limitations': ['These software contracts do not establish biological repair or device safety.',
                              'The separate protocol report must contain its actual complete 256-cell fixture.']}
    write_json(DOCS / 'integration-validation.json', report)
    return execution, report


def ensure(condition, reason):
    if not condition:
        raise ValueError(reason)


def verify_source_hashes(report, *, legacy_field=False):
    hashes = report.get('sourceHashes')
    ensure(isinstance(hashes, dict) and hashes, 'Report has no source hashes.')
    mismatches = []
    for name, expected in hashes.items():
        p = source_path(name)
        if not p.is_file() or core.sha256(p) != expected:
            mismatches.append(name)
    ensure(not mismatches, 'Stale or missing sources: ' + ', '.join(mismatches))
    if legacy_field:
        ensure('sourceChangedDuringRun' not in report or report['sourceChangedDuringRun'] in ([], False),
               'Legacy field reports changed sources.')
    else:
        ensure('sourceChangedDuringRun' in report and report['sourceChangedDuringRun'] in ([], False),
               'Report lacks an unchanged-source result.')
    return len(hashes)


def passing_rows(rows, count, label):
    ensure(isinstance(rows, list) and len(rows) == count, f'{label}: expected exactly {count} rows.')
    ensure(all(r.get('status') == 'pass' for r in rows), f'{label}: a row failed or was skipped.')


def verify_protocol_cohort(c, count, label):
    ensure(isinstance(c, dict), f'{label}: absent fixture.')
    for key, expected in {'fixture': label, 'status': 'pass', 'cohortCount': count,
                          'physicalWellCount': count, 'channelCount': 1,
                          'resolvedCellChannelPairs': count, 'completedInterventionSolves': count * 4,
                          'membraneCompartmentCount': 323, 'activeSiteCount': 23,
                          'noSkippedCells': True, 'noSkippedControls': True, 'auditValid': True,
                          'sourceChangedDuringRun': False}.items():
        ensure(c.get(key) == expected, f'{label}: {key} must be {expected!r}.')
    verify_source_hashes(c)
    ensure(c.get('changedSourcePaths') == [], f'{label}: source-change paths are not empty.')
    ensure(c.get('settings', {}).get('somaSegments') == 5, f'{label}: five soma bands required.')
    ensure(c.get('settings', {}).get('amplitudeUa') == .5, f'{label}: declared amplitude differs.')
    ensure(c.get('settings', {}).get('fascicleRadiusUm') == (350 if count == 256 else 250), f'{label}: declared radius differs.')
    ensure(len(c.get('perChannelCellControlSummary', [])) == count, f'{label}: omitted control summaries.')
    matrices = c.get('matrices', {})
    ensure(set(matrices) == {'assigned', 'localSilenced', 'wholeSilenced', 'somaSilenced'}, f'{label}: four intervention matrices required.')
    for matrix in matrices.values():
        ensure(len(matrix) == 1 and len(matrix[0]) == count and all(type(v) is bool for v in matrix[0]),
               f'{label}: incomplete or nonbinary intervention matrix.')
    ensure(c.get('tests') and all(t.get('status') == 'pass' for t in c['tests']), f'{label}: a protocol check failed.')
    absent = c.get('noDevice', {})
    for key in ('implantedCellIds', 'wellIds', 'contactIds', 'nativeRemnantIds', 'membraneTraces'):
        ensure(absent.get(key) == [], f'{label}: no-device {key} is not empty.')
    for key in ('implantDriveUa', 'excitablePopulationCount', 'sourceCurrentNa', 'fieldPotentialMv', 'evokedOutputCount'):
        ensure(absent.get(key) == 0, f'{label}: no-device {key} is not zero.')
    ensure(absent.get('recording') is None and c.get('identitySummary', {}).get('originalRemnantState', {}).get('matched') is True,
           f'{label}: no-device populations are not matched.')
    ensure(c.get('peakRSSBytes', 0) > 0 and c.get('runtimeMs', 0) > 0, f'{label}: actual resource measurements absent.')


def validate_report(kind, r):
    if kind in ('field', 'wellField', 'denseWells', 'wellBoundary'):
        ensure(r.get('status') == 'pass', 'Field report did not pass.')
        passing_rows(r.get('results'), {'field': 12, 'wellField': 21, 'denseWells': 11, 'wellBoundary': 2}[kind], kind)
    elif kind in ('membrane', 'bipolar'):
        s = r.get('summary', {})
        count = 55 if kind == 'membrane' else 66
        ensure(s.get('requiredFail') == 0 and s.get('requiredPass') == count and s.get('numericalGatePassed') is True,
               'Required membrane gates did not pass.')
        passing_rows([t for t in r.get('tests', []) if t.get('required') is not False], count, kind)
        ensure(s.get('biologicalValidation') is False, 'Numerical evidence must not claim biological validation.')
        if kind == 'bipolar':
            ensure(r.get('complete') is True and r.get('supportedSomaSegments') == 5 and r.get('supportedDtMs') == .000625,
                   'Bipolar component report does not support current numerical resolution.')
    elif kind == 'motorCoupled':
        ensure(r.get('passed') is True, 'Legacy coupled reference did not pass.')
        passing_rows(r.get('rows'), 3, kind)
        ensure({row.get('intervention') for row in r['rows']} == {'assigned', 'proximal-silenced', 'whole-silenced'},
               'Legacy coupled interventions are incomplete.')
        ensure(all(row.get('exactObservationTimestamps') is True for row in r['rows']), 'Native observation grids were altered.')
    elif kind == 'somaSpatial':
        for key in ('complete', 'fieldValidated', 'numericalComparisonsPassed', 'authoritative'):
            ensure(r.get(key) is True, f'Soma-spatial report lacks {key}.')
        ensure(r.get('exploratory') is False and r.get('supportedSomaSegments') == 5, 'Exploratory or unsupported soma report.')
        acceptance = r.get('acceptance', {})
        levels = r.get('levels', [])
        ensure(len(levels) == 5 and all(len(x.get('cases', [])) == 24 for x in levels), 'Soma refinement omitted a level, amplitude or intervention.')
        comparisons = r.get('comparisons', [])
        ensure(len(comparisons) == 4, 'Soma refinement comparisons absent.')
        for a, b in ((5, 9), (9, 13)):
            row = next((x for x in comparisons if x.get('from') == a and x.get('to') == b), {})
            ensure(row.get('passed') is True and len(row.get('details', [])) == 24 and all(x.get('passed') is True for x in row['details']),
                   f'Supported soma comparison {a} to {b} did not pass all cases.')
        ensure(acceptance == read_json(DOCS / 'bipolar-soma-spatial-acceptance.json'), 'Embedded soma acceptance changed.')
    elif kind == 'bipolarCoupled':
        for key in ('passed', 'complete', 'fieldValidated', 'numericalComparisonsPassed'):
            ensure(r.get(key) is True, f'Coupled report lacks {key}.')
        ensure(r.get('status') == 'pass' and r.get('exploratory') is False, 'Exploratory or failed coupled report.')
        passing_rows(r.get('rows'), 12, 'native well-field reference')
        passing_rows(r.get('temporalRows'), 16, 'well-field time refinement')
        for row in r['rows'] + r['temporalRows']:
            ensure(row.get('exactObservationTimestamps') is True and row.get('identicalCrossingCounts') is True,
                   'Coupled grids or crossing counts differ.')
        ensure(all(row.get('exactSharedInitialState') is True for row in r['rows']), 'Native interventions lack matched initial states.')
        ensure(r.get('summary', {}).get('nativeFail') == 0 and r.get('summary', {}).get('timeFail') == 0, 'Coupled failures remain.')
    elif kind == 'protocol':
        ensure(r.get('status') == 'pass' and r.get('sourceChangedDuringRun') is False and r.get('changedSourcePaths') == [],
               'Full protocol report did not pass against fixed sources.')
        ensure(r.get('contracts', {}).get('status') == 'pass', 'Protocol contract command failed.')
        ensure(r.get('tests') and all(t.get('status') == 'pass' for t in r['tests']), 'Protocol has absent, failed or omitted checks.')
        verify_protocol_cohort(r.get('smallCohort'), 4, 'small')
        verify_protocol_cohort(r.get('fullCohort'), 256, 'full')
    elif kind == 'integration':
        ensure(r.get('status') == 'pass' and r.get('summary') == {'passed': 24, 'failed': 0, 'skipped': 0},
               'Current combined integration must pass all 24 tests without skips.')
        passing_rows(r.get('tests'), 24, kind)
        for name, count in (('legacy-core-and-field', 15), ('stage1', 9)):
            ensure(r.get('suites', {}).get(name) == {'passed': count, 'failed': 0, 'skipped': 0}, f'Integration suite {name} incomplete.')
    elif kind == 'nativeBuild':
        ensure(r.get('status') == 'pass' and r.get('freshBuildDirectory') is True and r.get('buildProducts'),
               'Fresh native mechanism build provenance absent or failed.')
        ensure(r.get('referencePython', {}).get('packages') == core.PINNED, 'Native dependency pins differ.')
        ensure(r.get('execution', {}).get('exitCode') == 0, 'Native build command failed.')


def verify_evidence(executed):
    evidence = []
    rows = [('nativeBuild', 'native-build-report.json', None), *STUDIES,
            ('integration', 'integration-validation.json', None)]
    for kind, filename, producer in rows:
        p = DOCS / filename
        entry = {'name': kind, 'report': relative(p),
                 'mode': 'executed' if kind in executed else 'verified-from-existing',
                 'executedByThisInvocation': kind in executed}
        try:
            r = read_json(p)
            entry['reportSha256'] = core.sha256(p)
            entry['sourceHashCount'] = verify_source_hashes(r, legacy_field=kind == 'field')
            if producer:
                ensure('scripts/axon-interface/' + producer in r['sourceHashes'], 'Producer validator is missing from report provenance.')
                entry['producerCommand'] = ['node', 'scripts/axon-interface/' + producer]
                entry['producerCommandMeaning'] = 'Canonical producing validator identified by the retained report source hash; exact original shell invocation is not asserted unless a captured execution is included.'
                entry['requiredEnvironment'] = {'STAGE1_FIELD_EXPLORATORY': 'false'} if kind in ('somaSpatial', 'bipolarCoupled') else {}
            validate_report(kind, r)
            entry.update(status='pass', measurementStartedAt=r.get('startedAt', r.get('started')),
                         measurementCompletedAt=r.get('completedAt', r.get('generatedAt', r.get('completed'))))
            if kind in executed:
                entry['capturedExecution'] = executed[kind]
            elif r.get('execution'):
                entry['capturedExecution'] = r['execution']
                entry['capturedExecutionMeaning'] = 'Retained earlier command record; not executed by this verification invocation.'
            if kind == 'protocol':
                full = r['fullCohort']
                entry['fullCohort'] = {key: full[key] for key in ('cohortCount', 'physicalWellCount', 'channelCount',
                    'resolvedCellChannelPairs', 'completedInterventionSolves', 'membraneCompartmentCount',
                    'noSkippedCells', 'noSkippedControls', 'auditValid', 'runtimeMs', 'peakRSSBytes')}
            if kind == 'field':
                entry['stabilityScope'] = 'This legacy validator records final source hashes but does not separately record a before/after source-stability field. All current files match; aggregate commands separately enforce fixed sources when executed together.'
        except Exception as error:
            entry.update(status='fail', error=str(error))
        evidence.append(entry)
    return evidence


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--python', help='Existing Python with the exact pinned NEURON, NumPy and scipy packages; packages are not modified.')
    parser.add_argument('--node', default='node', help='Node executable; release checked with Node 24.22.1.')
    parser.add_argument('--verify-existing', action='store_true', help='Validate existing complete evidence and source hashes without executing numerical commands.')
    args = parser.parse_args()
    DOCS.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(parents=True, exist_ok=True)
    before = source_snapshot()
    report = {'schema': 'buildthesimulation.axon-interface.stage1-reproduction.v1', 'scope': SCOPE,
              'mode': 'verified-existing-evidence' if args.verify_existing else 'executed',
              'startedAt': core.timestamp(), 'status': 'running', 'sourceHashes': before,
              'commandsExecutedThisInvocation': [], 'measurementsRegenerated': not args.verify_existing,
              'acceptanceChanged': False, 'evidence': [], 'frozenAcceptance': {},
              'runtime': {'hostPython': platform.python_version(), 'platform': platform.platform(), **core.hardware()},
              'meaning': ('This invocation verifies separately executed retained reports; their original timestamps and commands remain separate. No numerical study or full population was rerun.' if args.verify_existing else
                          'This invocation executes all required reference, refinement and integration commands in order, then validates their reports and exact sources.'),
              'limitations': ['Numerical verification is conditional on the stated geometry, membrane and volume-conductor hypotheses; it is not biological calibration, reinnervation, clinical performance or device safety.',
                              'Failed coarse resolution and exploratory physiological comparisons remain retained. Their existence is not hidden by passing supported-resolution gates.',
                              'Raw arrays and architecture-specific native binaries are regenerable outputs, not fixed repository inputs.']}
    executed = {}
    try:
        for filename, expected in FROZEN_ACCEPTANCE.items():
            actual = core.sha256(DOCS / filename)
            report['frozenAcceptance'][relative(DOCS / filename)] = {'sha256': actual, 'expectedSha256': expected,
                'status': 'pass' if actual == expected else 'fail'}
        ensure(all(x['status'] == 'pass' for x in report['frozenAcceptance'].values()), 'A frozen acceptance or retained resolution correction changed.')
        if not args.verify_existing:
            node = shutil.which(args.node) or args.node
            report['runtime']['node'] = subprocess.check_output([node, '--version'], text=True).strip()
            python, metadata, env = reference_environment(args.python)
            report['runtime']['referencePython'] = metadata
            execution, built = native_build(python, metadata, env)
            report['commandsExecutedThisInvocation'].append(execution)
            executed['nativeBuild'] = execution
            ensure(built['status'] == 'pass', 'Fresh native mechanism build failed.')
            for kind, filename, producer in STUDIES:
                # Integration has its own aggregate report and includes both suites.
                if kind == 'protocol':
                    execution, checked = integration(node)
                    report['commandsExecutedThisInvocation'].append(execution)
                    executed['integration'] = execution
                    ensure(checked['status'] == 'pass', 'Combined current integration tests failed.')
                execution = command('stage1-' + kind, [node, HERE / producer], env=env)
                report['commandsExecutedThisInvocation'].append(execution)
                executed[kind] = execution
                ensure(execution['status'] == 'pass', f'{producer} failed; old evidence is not a substitute.')
                ensure((DOCS / filename).is_file(), f'{producer} did not produce its required report.')
        report['evidence'] = verify_evidence(executed)
        provenance = DOCS / 'legacy-membrane-refresh.json'
        if provenance.exists():
            captured = read_json(provenance)
            report['separateLegacyRefresh'] = {'path': relative(provenance), 'sha256': core.sha256(provenance),
                'meaning': 'Supplementary captured commands from the separately executed legacy refresh; numerical acceptance is determined from the required current reports above.', 'executionRecord': captured}
        after = source_snapshot()
        changed = differences(before, after)
        report['sourceChangedDuringRun'] = changed
        report['sourceHashesAfter'] = after
        ensure(not changed, 'Sources changed during aggregate execution/verification: ' + ', '.join(changed))
        ensure(all(e['status'] == 'pass' for e in report['evidence']), 'One or more required reports failed evidence verification.')
        report['status'] = 'pass'
    except Exception as error:
        report['status'] = 'fail'
        report['error'] = str(error)
        if not report['evidence']:
            report['evidence'] = verify_evidence(executed)
        report['sourceChangedDuringRun'] = differences(before, source_snapshot())
        print(str(error), file=sys.stderr, flush=True)
    report['completedAt'] = core.timestamp()
    report['summary'] = {'passed': sum(x.get('status') == 'pass' for x in report['evidence']),
                         'failed': sum(x.get('status') == 'fail' for x in report['evidence']),
                         'requiredEvidenceCount': 12,
                         'commandsExecuted': len(report['commandsExecutedThisInvocation'])}
    if report['status'] == 'fail':
        with HISTORY.open('a') as stream:
            stream.write(json.dumps({'timestamp': report['completedAt'], 'event': 'failed-stage1-reproduction',
                'mode': report['mode'], 'error': report.get('error'), 'sourceHashes': before,
                'failedEvidence': [x for x in report['evidence'] if x.get('status') != 'pass']}, allow_nan=False) + '\n')
    report['retainedFailures'] = [json.loads(line) for line in HISTORY.read_text().splitlines() if line] if HISTORY.exists() else []
    write_json(REPORT, report)
    print(json.dumps({'status': report['status'], 'scope': report['scope'], 'mode': report['mode'],
                      'report': relative(REPORT), 'summary': report['summary']}), flush=True)
    return 0 if report['status'] == 'pass' else 1


if __name__ == '__main__':
    raise SystemExit(main())
