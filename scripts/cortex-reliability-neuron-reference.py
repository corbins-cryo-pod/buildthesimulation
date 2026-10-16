"""New spatial-boundary dynamics from native NEURON and original NMODL.

Reuses the historical native integration/recording routine unchanged. It receives
only configurations and geometry, never JavaScript solver states or solutions.
Before each run, independently reconstructs SWC geometry, applies the declared
world transformation and checks membrane/axial invariants against input geometry.
"""
import hashlib
import json
import math
import os
import platform
import subprocess
import sys
from datetime import datetime, timezone
from importlib.machinery import SourceFileLoader
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
reference = SourceFileLoader('reliability_native_reference', str(ROOT / 'scripts/cortex-active-neuron-reference.py')).load_module()
model = reference.model
from neuron import h


def rotate(v, angles):
    x, y, z = v
    a, b, c = angles
    y, z = math.cos(a)*y-math.sin(a)*z, math.sin(a)*y+math.cos(a)*z
    x, z = math.cos(b)*x+math.sin(b)*z, -math.sin(b)*x+math.cos(b)*z
    return [math.cos(c)*x-math.sin(c)*y, math.sin(c)*x+math.cos(c)*y, z]


def audit_geometry(case):
    c = case['config']
    sections, soma, stub, center = model.make_cell(c['neuron']['segmentLengthUm'])
    native, _ = model.discretize(sections, soma, center)
    assert len(native) == len(case['nodes'])
    errors = {'worldPositionUm': 0., 'membraneGeometryAbsolute': 0.}
    def world(v):
        a = rotate(v, [-.010516, 0, -3.011895])
        p = rotate([a[0], a[2], -a[1]], [math.radians(x) for x in c['neuron']['rotationDeg']])
        return [v+c['neuron']['somaUm'][i] for i, v in enumerate(p)]
    for a, b in zip(native, case['nodes']):
        for key in ['id', 'parent', 'kind', 'sectionType', 'sectionId', 'sectionX']:
            assert a[key] == b[key], (case['id'], key, a[key], b[key])
        for key in ['areaUm2', 'lengthUm', 'diameterUm', 'edgeUs']:
            errors['membraneGeometryAbsolute'] = max(errors['membraneGeometryAbsolute'], abs(a[key]-b[key]))
        for key in ['startUm', 'endUm', 'centerUm']:
            errors['worldPositionUm'] = max(errors['worldPositionUm'], max(abs(x-y) for x, y in zip(world(a[key]), b[key])))
    assert errors['worldPositionUm'] < 1e-9, errors
    assert errors['membraneGeometryAbsolute'] < 1e-9, errors
    return errors


if __name__ == '__main__':
    # Check installed versions, including transitive pins, rather than recording
    # declared version strings as if they were runtime observations.
    packages = {}
    for line in (ROOT / 'scripts/cortex-reference-requirements.txt').read_text().splitlines():
        if '==' not in line or line.startswith('#'):
            continue
        name, expected = line.split('==')
        actual = version(name)
        assert actual == expected, (name, actual, expected)
        packages[name] = actual
    raw = subprocess.check_output(['node', str(ROOT/'scripts/cortex-reliability-reference-input.mjs')], cwd=ROOT)
    inputs = json.loads(raw)
    paths = ['scripts/cortex-reliability-neuron-reference.py', 'scripts/cortex-reliability-reference-input.mjs',
             'scripts/cortex-active-neuron-reference.py', 'scripts/cortex-active-model.py',
             'scripts/cortex-reference-requirements.txt',
             'public/models/cortex/allen571654895/571654895.swc',
             'public/models/cortex/allen571654895/optim_param_571654895.json']
    paths += [str(p.relative_to(ROOT)) for p in sorted(model.KINETICS.glob('*.mod'))]
    hashes = {p: model.sha(ROOT/p) for p in paths}
    library = Path(os.environ['CORTEX_ACTIVE_MECHANISM_LIBRARY'])
    report = {'schemaVersion': 'cortex-reliability-native/1', 'generator': {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'neuronVersion': version('neuron'), 'neuronBuild': h.nrnversion(),
        'lfpykitVersion': version('LFPykit'), 'pythonVersion': sys.version,
        'platform': platform.platform(), 'installedPackages': packages,
        'compiler': {name: subprocess.check_output([name, '--version'], text=True).splitlines()[0] for name in ['gcc', 'g++']},
        'compiledMechanismLibrarySha256': model.sha(library),
        'compiledMechanismLibraryBytes': library.stat().st_size,
        'inputSha256': hashlib.sha256(raw).hexdigest(), 'sourceHashes': hashes,
        'independence': 'Native SWC import, original NMODL and NEURON fixed-step solve; shared configuration/geometry only. No browser solution supplied.',
        'eventConvention': 'Upward -25 mV membrane crossing; soma crossings use 2 ms refractory. Local crossings alone do not establish propagated somatic action potentials.'}, 'cases': []}
    target = ROOT/'tests/fixtures/cortex-reliability-neuron.json'
    for case in inputs:
        audit = audit_geometry(case)
        result = reference.run(case)
        result['geometryAudit'] = audit
        result['earliestLocalCrossing'] = min(
            ({'timeMs': t, 'id': case['nodes'][i]['id'], 'sectionId': case['nodes'][i]['sectionId'],
              'sectionX': case['nodes'][i]['sectionX'], 'positionUm': case['nodes'][i]['centerUm']}
             for i, t in enumerate(result['firstCrossingTimesMs']) if t is not None),
            key=lambda x: x['timeMs'], default=None)
        result['sampledSomaPeakMv'] = max(result['somaVoltageMv'])
        report['cases'].append(result)
        target.write_text(json.dumps(report, separators=(',', ':'))+'\n')
    assert hashes == {p: model.sha(ROOT/p) for p in paths}, 'Reference sources changed during generation'
