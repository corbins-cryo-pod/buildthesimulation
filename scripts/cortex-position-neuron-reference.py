"""Reproduce the research-only 42/43 um native soma-waveform check.

This relocatable wrapper is supplied for reproduction. The audit record retains
the exact originally executed scratch wrapper separately; numerical routines,
mechanisms and serialized inputs are identical. Full physical trace files are
temporary because only the soma waveforms were compared for this supplement.
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    native = SourceFileLoader('position_native_reference', str(ROOT/'scripts/cortex-reliability-neuron-reference.py')).load_module()
    raw = subprocess.check_output(['node', str(ROOT/'scripts/cortex-position-reference-input.mjs')], cwd=ROOT)
    result = {'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'inputSha256': hashlib.sha256(raw).hexdigest(), 'cases': []}
    with tempfile.TemporaryDirectory(prefix='cortex-position-native-') as directory:
        native.reference.ROOT = Path(directory)
        (Path(directory)/'tests/fixtures').mkdir(parents=True)
        for case in json.loads(raw):
            audit = native.audit_geometry(case)
            full = native.reference.run(case)
            result['cases'].append({'id': case['id'], 'config': case['config'],
                'stimulatingSites': case['stimulatingSites'], 'geometryAudit': audit,
                'somaVoltageMv': full['somaVoltageMv'], 'spikeTimesMs': full['spikeTimesMs'],
                'firstCrossingTimesMs': full['firstCrossingTimesMs'],
                'maxConservationResidualNa': full['maxConservationResidualNa']})
    Path(args.output).write_text(json.dumps(result, separators=(',', ':'))+'\n')
