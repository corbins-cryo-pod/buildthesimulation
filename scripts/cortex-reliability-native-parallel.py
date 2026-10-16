"""Resume the new native reference checkpoint in isolated worker processes.

Numerical routines and experiment definitions are unchanged. Completed cases are
kept only after validating their generator/input and compressed-payload hashes.
Each fresh worker imports NEURON independently (spawn, not fork).
"""
import concurrent.futures
import hashlib
import json
import multiprocessing
import os
import subprocess
from importlib.machinery import SourceFileLoader
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run_case(case):
    native = SourceFileLoader('reliability_parallel_worker', str(ROOT/'scripts/cortex-reliability-neuron-reference.py')).load_module()
    for line in (ROOT/'scripts/cortex-reference-requirements.txt').read_text().splitlines():
        if '==' in line and not line.startswith('#'):
            name, expected = line.split('==')
            assert version(name) == expected
    audit = native.audit_geometry(case)
    result = native.reference.run(case)
    result['geometryAudit'] = audit
    result['earliestLocalCrossing'] = min(
        ({'timeMs': t, 'id': case['nodes'][i]['id'], 'sectionId': case['nodes'][i]['sectionId'],
          'sectionX': case['nodes'][i]['sectionX'], 'positionUm': case['nodes'][i]['centerUm']}
         for i, t in enumerate(result['firstCrossingTimesMs']) if t is not None),
        key=lambda x: x['timeMs'], default=None)
    result['sampledSomaPeakMv'] = max(result['somaVoltageMv'])
    return result


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--workers', type=int, default=3)
    args = parser.parse_args()
    target = ROOT/'tests/fixtures/cortex-reliability-neuron.json'
    report = json.loads(target.read_text())
    for path, expected in report['generator']['sourceHashes'].items():
        if path == 'scripts/cortex-reliability-native-parallel.py' and sha(ROOT/path) != expected:
            # Preserve the exact prior orchestration source and failure record;
            # only process lifetime changes, never a numerical source or input.
            assert any(entry['sourceSha256'] == expected and
                       hashlib.sha256(entry['sourceText'].encode()).hexdigest() == expected
                       for entry in report['generator'].get('orchestrationHistory', [])), path
        else:
            assert sha(ROOT/path) == expected, path
    library = Path(os.environ['CORTEX_ACTIVE_MECHANISM_LIBRARY'])
    assert sha(library) == report['generator']['compiledMechanismLibrarySha256']
    raw = subprocess.check_output(['node', str(ROOT/'scripts/cortex-reliability-reference-input.mjs')], cwd=ROOT)
    assert hashlib.sha256(raw).hexdigest() == report['generator']['inputSha256']
    inputs = json.loads(raw)
    by_id = {c['id']: c for c in inputs}
    completed = {c['id'] for c in report['cases']}
    assert len(completed) == len(report['cases'])
    for case in report['cases']:
        assert case['config'] == by_id[case['id']]['config']
        assert sha(ROOT/'tests/fixtures'/case['completeTrace']['file']) == case['completeTrace']['sha256']
    report['generator']['sourceHashes']['scripts/cortex-reliability-native-parallel.py'] = sha(__file__)
    report['generator']['execution'] = {
        'method': 'Sequential checkpoint followed by isolated spawned native workers; unchanged numerical routines.',
        'resumedCaseIds': sorted(completed), 'workers': args.workers, 'maximumTasksPerWorker': 1}
    remaining = [c for c in inputs if c['id'] not in completed]
    print('Verified completed cases:', len(completed), 'remaining:', len(remaining), flush=True)
    def write():
        order = {c['id']: i for i, c in enumerate(inputs)}
        report['cases'].sort(key=lambda c: order[c['id']])
        pending = target.with_suffix('.json.pending')
        pending.write_text(json.dumps(report, separators=(',', ':'))+'\n')
        pending.replace(target)
    write()
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers, max_tasks_per_child=1,
                                               mp_context=multiprocessing.get_context('spawn')) as pool:
        futures = [pool.submit(run_case, case) for case in remaining]
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            report['cases'].append(result)
            write()
            print('Completed', result['id'], 'total', len(report['cases']), flush=True)
    assert len(report['cases']) == len(inputs)
    for path, expected in report['generator']['sourceHashes'].items():
        assert sha(ROOT/path) == expected, path
