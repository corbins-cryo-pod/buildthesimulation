"""Generate independent forward coefficients and NEURON-to-contact recordings.

LFPykit is the standalone forward-model package used by LFPy. This script uses
its public API offline; no package source is copied or shipped in the browser.
Shared inputs contain geometry/parameters only. Membrane currents come from the
independent NEURON fixture, never from the browser solver.
"""
import hashlib
import importlib.metadata
import json
import platform
import subprocess
from pathlib import Path

import numpy as np
from lfpykit import CellGeometry, RecExtElectrode, PointSourcePotential

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parent.parent
INPUT_SCRIPT = SCRIPT.with_name('cortex-reference-input.mjs')
NEURON_FIXTURE = ROOT / 'tests/fixtures/cortex-neuron-arbor.json'
if importlib.metadata.version('lfpykit') != '0.6.2':
    raise RuntimeError('Reference generation requires lfpykit==0.6.2')
input_bytes = subprocess.check_output(['node', str(INPUT_SCRIPT)], cwd=ROOT)
inputs = json.loads(input_bytes)
neuron_bytes = NEURON_FIXTURE.read_bytes()
neuron_fixture = json.loads(neuron_bytes)
if neuron_fixture['generator']['inputSha256'] != hashlib.sha256(input_bytes).hexdigest():
    raise RuntimeError('Regenerate the NEURON arbor reference for the current inputs first')


def point_geometry(positions):
    # Zero extent/diameter expresses ideal point sources, not an inferred
    # exposed electrode area. All observers are strictly separated from them.
    positions = np.asarray(positions, dtype=float)
    endpoints = np.repeat(positions[:, :, None], 2, axis=2)
    return CellGeometry(x=endpoints[:, 0], y=endpoints[:, 1], z=endpoints[:, 2],
                        d=np.zeros(len(positions)))


def average(t, dt, start, duration):
    return max(0, min(t + dt, start + duration) - max(t, start)) / dt


cases = []
for spec, neuron_case in zip(inputs, neuron_fixture['cases']):
    if spec['id'] != neuron_case['id']:
        raise RuntimeError('NEURON cases do not match the shared input')
    c, nodes = spec['config'], spec['nodes']
    starts = np.asarray([node['startUm'] for node in nodes], dtype=float)
    ends = np.asarray([node['endUm'] for node in nodes], dtype=float)
    centers = (starts + ends) / 2
    diameters = np.asarray([node['diameterUm'] for node in nodes], dtype=float)
    # Give the root a nonzero equivalent-cylinder axis so LFPykit's intermediate
    # line calculation is defined before root_as_point replaces it. Its midpoint
    # is unchanged; neither selected approximation uses this root axis as a line.
    starts[0] = centers[0] - np.asarray([0, 0, nodes[0]['lengthUm'] / 2])
    ends[0] = centers[0] + np.asarray([0, 0, nodes[0]['lengthUm'] / 2])
    cell = CellGeometry(x=np.column_stack([starts[:, 0], ends[:, 0]]),
                        y=np.column_stack([starts[:, 1], ends[:, 1]]),
                        z=np.column_stack([starts[:, 2], ends[:, 2]]), d=diameters)
    positions = np.asarray([site['positionUm'] for site in spec['recordingSites']])
    kwargs = dict(x=positions[:, 0], y=positions[:, 1], z=positions[:, 2],
                  sigma=c['tissue']['conductivitySPerM'])
    # LFPykit clamps near-axis distances to segment radius. These reference
    # cases must not trigger that behavior, which differs from our rejection rule.
    directions = ends[1:] - starts[1:]
    lengths = np.linalg.norm(directions, axis=1)
    min_axis_clearance_um = float('inf')
    for position in positions:
        point_clearance = np.linalg.norm(centers - position, axis=1) - diameters / 2
        if np.min(point_clearance) <= 0:
            raise RuntimeError('Reference would invoke point-source distance regularization')
        axis_distance = np.linalg.norm(np.cross(position - starts[1:], directions), axis=1) / lengths
        min_axis_clearance_um = min(min_axis_clearance_um, float(np.min(axis_distance - diameters[1:] / 2)))
    if min_axis_clearance_um <= 0:
        raise RuntimeError('Reference would invoke line-source radius regularization')
    source_matrix = PointSourcePotential(
        point_geometry([site['positionUm'] for site in spec['stimulatingSites']]),
        **kwargs).get_transformation_matrix()
    return_matrix = PointSourcePotential(
        point_geometry([c['protocol']['bathReturnUm']]), **kwargs).get_transformation_matrix()
    currents_na = np.asarray([s['membraneCurrentNa'] for s in neuron_case['samples']]).T
    for approximation, method in [('point', 'pointsource'), ('line', 'root_as_point')]:
        # root_as_point uses the first (soma) segment as a point, all others as
        # uniform line sources, matching the explicitly selected approximation.
        matrix_mv_per_na = RecExtElectrode(cell, method=method, **kwargs).get_transformation_matrix()
        if not np.isfinite(matrix_mv_per_na).all():
            raise RuntimeError('Non-finite forward matrix')
        neural_uv = 1000 * matrix_mv_per_na @ currents_na
        applied_uv = np.zeros_like(neural_uv)
        p, dt = c['protocol'], c['solver']['dtMs']
        for k, sample in enumerate(neuron_case['samples']):
            if sample['step'] == 0:
                continue
            t = (sample['step'] - 1) * dt
            if p['mode'] == 'extracellular-stimulation':
                phase_ms = p['phaseUs'] / 1000
                pulse = (-average(t, dt, p['startMs'], phase_ms)
                         + average(t, dt, p['startMs'] + phase_ms + p['gapUs'] / 1000, phase_ms))
                current_na = p['amplitudeUa'] * 1000 * pulse
                applied_uv[:, k] = 1000 * source_matrix @ np.asarray([current_na, -current_na])
            elif p['mode'] == 'intracellular-current':
                current_na = p['injectionNa'] * average(t, dt, p['startMs'], p['durationMs'])
                applied_uv[:, k] = -1000 * return_matrix[:, 0] * current_na
        total_uv = neural_uv + applied_uv
        cases.append(dict(id=spec['id'], approximation=approximation,
                          minAxisClearanceUm=min_axis_clearance_um,
                          coefficientsUvPerNa=(1000 * matrix_mv_per_na).tolist(),
                          samples=[dict(step=s['step'], timeMs=s['timeMs'],
                                        neuralUv=neural_uv[:, k].tolist(),
                                        appliedUv=applied_uv[:, k].tolist(),
                                        totalUv=total_uv[:, k].tolist(),
                                        differentialUv=float(total_uv[0, k] - total_uv[1, k]))
                                   for k, s in enumerate(neuron_case['samples'])]))

payload = dict(
    schemaVersion='cortex-lfpykit-fixture/1',
    generator=dict(lfpykitVersion=importlib.metadata.version('lfpykit'),
                   pythonVersion=platform.python_version(),
                   scriptSha256=hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
                   inputScriptSha256=hashlib.sha256(INPUT_SCRIPT.read_bytes()).hexdigest(),
                   inputSha256=hashlib.sha256(input_bytes).hexdigest(),
                   neuronFixtureSha256=hashlib.sha256(neuron_bytes).hexdigest(),
                   packages={name: importlib.metadata.version(name) for name in
                             ['numpy', 'scipy', 'meautility', 'matplotlib', 'pyyaml',
                              'contourpy', 'cycler', 'fonttools', 'kiwisolver', 'pillow',
                              'pyparsing', 'python-dateutil', 'six', 'packaging']}),
    scope='Independent LFPykit point/line forward coefficients and recordings from independent NEURON currents; two ideal contacts, homogeneous infinite conductor, no experimental validation.',
    method='LFPykit RecExtElectrode pointsource/root_as_point for membrane currents; PointSourcePotential for applied source and bath return. mV/nA matrices converted to uV/nA. No near-axis radius regularization is triggered by these cases.',
    sourceUrls=['https://lfpykit.readthedocs.io/en/latest/',
                'https://pypi.org/project/LFPykit/0.6.2/', 'https://github.com/LFPy/LFPykit'],
    cases=cases)
path = ROOT / 'tests/fixtures/cortex-lfpykit-forward.json'
path.write_text(json.dumps(payload, indent=2) + '\n')
print(f'Generated {path.name}: {len(cases)} cases; LFPykit 0.6.2')
