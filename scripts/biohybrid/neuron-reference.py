#!/usr/bin/env python3
"""Independent native NEURON reference for the Biohybrid HH cable laboratory.

Run reference-input.mjs first, then:
    python scripts/biohybrid/neuron-reference.py INPUT.json.gz OUTPUT.json

NEURON supplies its native hh, Exp2Syn, NetCon and tree cable solver. This
script does not import or port the JavaScript time integrator. Morphological
coordinates and settings are common model inputs. Axial resistances and disk
fields are independently reconstructed in Python. The prescribed extracellular
field is applied as mathematically equivalent current sources G_ij(Ve_j-Ve_i)
at the native cable nodes (including massless branch points). This avoids a
separate NEURON extracellular-layer/end-point discretization assumption.

All acceptance criteria are frozen in the input before native results exist.
No time alignment, offset subtraction, or amplitude rescaling is performed.
This validates a specified numerical benchmark, not graft biology.
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import math
import platform
import time
from pathlib import Path

import numpy as np
import neuron
from neuron import h

h.load_file('stdrun.hoc')
h.secondorder = 0
h.usetable_hh = 0
h.CVode().active(0)
h.CVode().use_fast_imem(1)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def points_on_disk(contact):
    """Equal-area radial midpoint quadrature, 4 annuli x 12 angles."""
    center = np.asarray(contact['positionUm'], dtype=float)
    normal = np.asarray(contact.get('normal', [0, 0, 1]), dtype=float)
    if not np.allclose(normal, [0, 0, 1]):
        raise ValueError('This benchmark specifies XY-plane contact disks.')
    points = []
    for ring in range(4):
        radius = float(contact['radiusUm']) * math.sqrt((ring + 0.5) / 4)
        for angle_index in range(12):
            angle = 2 * math.pi * (angle_index + (0.5 if ring % 2 else 0)) / 12
            points.append(center + [radius * math.cos(angle), radius * math.sin(angle), 0])
    return np.asarray(points)


def mean_pulse(a, b, settings):
    # Integrate each rectangular phase analytically across the complete step.
    integral = 0.0
    for pulse in range(settings['pulseCount']):
        onset = settings['stimStartMs'] + pulse * settings['pulseIntervalMs']
        for sign, start in [(1, onset), (-1, onset + settings['pulseWidthMs'] + settings['pulseGapMs'])]:
            overlap = max(0.0, min(b, start + settings['pulseWidthMs']) - max(a, start))
            integral += sign * settings['stimAmplitudeUa'] * overlap
    return integral / (b - a)


def independent_geometry(geometry, settings):
    nodes = geometry['nodes']
    xy = np.asarray([node['centerUm'] for node in nodes], dtype=float)
    contacts = geometry['contacts']
    source = next(contact for contact in contacts if contact['kind'] == 'stim')
    sink = next(contact for contact in contacts if contact['kind'] == 'return')
    sigma = settings['conductivitySPerM']
    phi = np.zeros(len(nodes))
    for sign, contact in [(1, source), (-1, sink)]:
        r_um = np.linalg.norm(xy[:, None, :] - points_on_disk(contact)[None, :, :], axis=2)
        # 1000/(4*pi*sigma*r_um) is mV / µA.
        phi += sign * np.mean(1000 / (4 * math.pi * sigma * r_um), axis=1)
    edge_us = np.zeros(len(nodes))
    def half_resistance(node):
        if node['areaUm2'] == 0:
            return 0.0
        # Convert µm to cm; resistance is ohms.
        length_cm = node['lengthUm'] * 1e-4
        cross_section_cm2 = math.pi * (node['diameterUm'] * 0.5e-4) ** 2
        return settings['axialResistivityOhmCm'] * length_cm / (2 * cross_section_cm2)
    drive_na_per_ua = np.zeros(len(nodes))
    for i, node in enumerate(nodes):
        p = node['parent']
        if p < 0:
            continue
        edge_us[i] = 1e6 / (half_resistance(node) + half_resistance(nodes[p]))
        force = edge_us[i] * (phi[p] - phi[i])
        drive_na_per_ua[i] += force
        drive_na_per_ua[p] -= force
    discrepancy = max(abs(edge_us[i] - node['edgeUs']) for i, node in enumerate(nodes))
    return drive_na_per_ua, edge_us, discrepancy


def recording_matrix(geometry, settings):
    """Independently integrate a unit membrane current along each cylinder."""
    nodes = geometry['nodes']
    contacts = [contact for contact in geometry['contacts'] if contact['kind'] == 'record']
    coefficients = np.zeros((len(contacts), len(nodes)))
    for contact_index, contact in enumerate(contacts):
        samples = points_on_disk(contact)
        for i, node in enumerate(nodes):
            if node['areaUm2'] == 0:
                continue
            if node['kind'] == 'soma':
                integral = 1 / np.linalg.norm(samples - node['centerUm'], axis=1)
            else:
                a = np.asarray(node['startUm'])
                b = np.asarray(node['endUm'])
                length = np.linalg.norm(b - a)
                # Exact integral of a uniform line source, written in the
                # endpoint-distance logarithmic form (not the JS asinh code).
                ra = np.linalg.norm(samples - a, axis=1)
                rb = np.linalg.norm(samples - b, axis=1)
                integral = np.log((ra + rb + length) / (ra + rb - length)) / length
            coefficients[contact_index, i] = 1000 / (4 * math.pi * settings['conductivitySPerM']) * np.mean(integral)
    return coefficients


def threshold_crossings(times, values, threshold=0.0):
    where = np.flatnonzero((values[:-1] < threshold) & (values[1:] >= threshold))
    return [float(times[j] + (threshold - values[j]) / (values[j + 1] - values[j]) * (times[j + 1] - times[j])) for j in where]


def native_case(case):
    started = time.perf_counter()
    geometry, settings = case['geometry'], case['settings']
    nodes = geometry['nodes']
    drive, independently_computed_edges, edge_error = independent_geometry(geometry, settings)
    sections = {}
    native_nodes = {}
    for i, node in enumerate(nodes):
        if node['areaUm2'] <= 0:
            continue
        sec = h.Section(name=f"biohybrid_{case['id'].replace('-', '_')}_{i}")
        sec.nseg = 1
        sec.L = node['lengthUm']
        sec.diam = node['diameterUm']
        sec.Ra = settings['axialResistivityOhmCm']
        sec.cm = 1
        sec.insert('hh')
        sec.ena = 50
        sec.ek = -77
        sec.gnabar_hh = 0.12 * settings['sodiumScale']
        sec.gkbar_hh = 0.036 * settings['potassiumScale']
        sec.gl_hh = 0.0003
        sec.el_hh = -54.3
        sections[i] = sec
        native_nodes[i] = sec(0.5)
    for i, node in enumerate(nodes):
        if node['areaUm2'] == 0:
            parent = node['parent']
            while nodes[parent]['areaUm2'] == 0:
                parent = nodes[parent]['parent']
            native_nodes[i] = sections[parent](1)
        else:
            parent = node['parent']
            if parent < 0:
                continue
            while nodes[parent]['areaUm2'] == 0:
                parent = nodes[parent]['parent']
            sections[i].connect(sections[parent](1), 0)
    clamps = []
    for i in range(len(nodes)):
        clamp = h.IClamp(native_nodes[i])
        clamp.delay = 0
        clamp.dur = settings['durationMs'] + 1
        clamp.amp = 0
        clamps.append(clamp)
    synapses, netcons, event_records = [], [], []
    for connection in geometry['synapses']:
        if connection['weightUs'] <= 0:
            continue
        synapse = h.Exp2Syn(native_nodes[connection['postIndex']])
        synapse.tau1 = settings['synapticRiseMs']
        synapse.tau2 = settings['synapticDecayMs']
        synapse.e = 0
        pre = sections[connection['preIndex']]
        netcon = h.NetCon(pre(0.5)._ref_v, synapse, sec=pre)
        netcon.threshold = 0
        netcon.delay = connection['delayMs']
        netcon.weight[0] = connection['weightUs']
        event_times = h.Vector()
        netcon.record(event_times)
        synapses.append(synapse)
        netcons.append(netcon)
        event_records.append((connection['id'], event_times))
    dt = settings['dtMs']
    sample_dt = settings['sampleDtMs']
    h.dt = dt
    h.steps_per_ms = 1 / dt
    h.celsius = settings['temperatureC']
    times = h.Vector().record(h._ref_t, sample_dt)
    voltages = [h.Vector().record(native_nodes[i]._ref_v, sample_dt) for i in range(len(nodes))]
    current_vectors = {i: h.Vector().record(sections[i](0.5)._ref_i_membrane_, sample_dt) for i in sections}
    spike_monitors = []
    fine_times = h.Vector().record(h._ref_t)
    for cell in geometry['neurons']:
        for kind, index in [('soma', cell['somaIndex']), ('terminal', cell['terminalIndex'])]:
            spike_monitors.append((cell['id'], kind, h.Vector().record(native_nodes[index]._ref_v)))
    h.finitialize(case['diagnostics']['restMv'])
    previous_amplitude = None
    steps = int(round(settings['durationMs'] / dt))
    for step in range(steps):
        amplitude = mean_pulse(step * dt, (step + 1) * dt, settings)
        if previous_amplitude is None or abs(amplitude - previous_amplitude) > 1e-7:
            for i, clamp in enumerate(clamps):
                clamp.amp = float(drive[i] * amplitude)
            previous_amplitude = amplitude
        h.fadvance()
    native_times = np.asarray(times).copy()
    native_voltages = np.asarray([np.asarray(v).copy() for v in voltages]).T
    expected_times = np.asarray(case['timeMs'])
    expected_voltages = np.asarray(case['voltageMv']).reshape(len(expected_times), len(nodes))
    endpoint_collected = False
    # NEURON's scheduled sample can fall a few femtoseconds beyond the final
    # accumulated h.t. Read the already-computed endpoint state in that case;
    # do not advance, interpolate, or shift any voltage trace to manufacture it.
    if len(native_times) + 1 == len(expected_times) and abs(float(h.t) - expected_times[-1]) < 1e-8:
        native_times = np.append(native_times, float(h.t))
        native_voltages = np.vstack((native_voltages, [native_nodes[i].v for i in range(len(nodes))]))
        endpoint_collected = True
    if native_times.shape != expected_times.shape:
        raise RuntimeError(f"Native sample count {len(native_times)} != requested {len(expected_times)}")
    time_grid_error = float(np.max(abs(native_times - expected_times)))
    if time_grid_error > 1e-8:
        raise RuntimeError(f"Unaligned physical time grids: {time_grid_error} ms")
    errors = native_voltages - expected_voltages
    membrane = np.asarray([node['areaUm2'] > 0 for node in nodes])
    all_rms = float(np.sqrt(np.mean(errors[:, membrane] ** 2)))
    all_max = float(np.max(abs(errors[:, membrane])))
    native_spikes = []
    fine_t = np.asarray(fine_times)
    for cell_id, kind, vector in spike_monitors:
        for event_time in threshold_crossings(fine_t, np.asarray(vector)):
            native_spikes.append({'neuronId': cell_id, 'kind': kind, 'timeMs': event_time})
    native_spikes.sort(key=lambda item: item['timeMs'])
    spike_comparisons = []
    spike_count_agreement = True
    spike_error_ms = 0.0
    for cell in geometry['neurons']:
        for kind in ['soma', 'terminal']:
            a = [s['timeMs'] for s in case['spikes'] if s['neuronId'] == cell['id'] and s['kind'] == kind]
            b = [s['timeMs'] for s in native_spikes if s['neuronId'] == cell['id'] and s['kind'] == kind]
            match = len(a) == len(b)
            spike_count_agreement = spike_count_agreement and match
            timing = [abs(x - y) for x, y in zip(a, b)]
            spike_error_ms = max(spike_error_ms, max(timing, default=0))
            spike_comparisons.append({'neuronId': cell['id'], 'kind': kind, 'javascriptTimesMs': a, 'nativeTimesMs': b,
                                      'countAgreement': match, 'maximumTimingErrorMs': max(timing, default=None)})
    traces = []
    worst_trace_rms = 0.0
    for trace in case['traces']:
        i = trace['nodeIndex']
        difference = native_voltages[:, i] - np.asarray(trace['values'])
        rms = float(np.sqrt(np.mean(difference ** 2)))
        worst_trace_rms = max(worst_trace_rms, rms)
        traces.append({'id': trace['id'], 'label': trace['label'], 'nodeIndex': i,
                       'rmsErrorMv': rms, 'maximumAbsoluteErrorMv': float(np.max(abs(difference))),
                       'nativeVoltageMv': np.round(native_voltages[:, i], 9).tolist()})
    native_currents = np.zeros_like(native_voltages)
    for i, vector in current_vectors.items():
        values = np.asarray(vector)
        if endpoint_collected:
            values = np.append(values, sections[i](0.5).i_membrane_)
        native_currents[:, i] = values
    transfer = recording_matrix(geometry, settings)
    recorded = native_currents @ transfer.T
    graft_mask = np.asarray([node['role'] == 'graft' for node in nodes])
    host_mask = np.asarray([node['role'] == 'host' for node in nodes])
    graft_recorded = native_currents[:, graft_mask] @ transfer[:, graft_mask].T
    host_recorded = native_currents[:, host_mask] @ transfer[:, host_mask].T
    graft_expected = np.asarray([recording['graftUv'] for recording in case['recordings']]).T
    host_expected = np.asarray([recording['hostUv'] for recording in case['recordings']]).T
    expected_recordings = np.asarray([recording['neuralUv'] for recording in case['recordings']]).T
    recording_difference = recorded - expected_recordings
    max_current_balance = float(np.max(abs(native_currents.sum(axis=1))))
    result = {
        'id': case['id'], 'description': case['description'], 'settings': settings,
        'inputSha256': case['inputSha256'],
        'counts': {'nativeSections': len(sections), 'electricalNodes': len(nodes), 'masslessJunctions': len(nodes) - len(sections), 'synapses': len(synapses), 'samples': len(native_times)},
        'comparison': {'membraneRmsErrorMv': all_rms, 'membraneMaximumAbsoluteErrorMv': all_max,
                       'worstMonitorRmsErrorMv': worst_trace_rms, 'maximumSpikeTimingErrorMs': spike_error_ms,
                       'spikeCountAgreement': spike_count_agreement,
                       'maximumTimeGridErrorMs': time_grid_error, 'independentAxialConductanceErrorUs': edge_error,
                       'maximumNativeCurrentImbalanceNa': max_current_balance,
                       'extracellularRmsErrorUv': float(np.sqrt(np.mean(recording_difference ** 2))),
                       'extracellularMaximumAbsoluteErrorUv': float(np.max(abs(recording_difference))),
                       'graftSourceMaximumErrorUv': float(np.max(abs(graft_recorded - graft_expected))),
                       'hostSourceMaximumErrorUv': float(np.max(abs(host_recorded - host_expected))),
                       'nativeSourcePartitionResidualUv': float(np.max(abs(recorded - graft_recorded - host_recorded)))},
        'sampling': {'endpointCollectedDirectly': endpoint_collected,
                     'explanation': 'An omitted terminal scheduled sample is read directly from the final native state when h.t and requested endpoint agree within 1e-8 ms; no integration step, time shift or interpolation is added.'},
        'nativePresynapticEventTimes': [{'synapseId': label, 'timesMs': list(vector)} for label, vector in event_records],
        'spikes': spike_comparisons, 'timeMs': expected_times.tolist(), 'traces': traces,
        'nativeRecordingUv': np.round(recorded.T, 9).tolist(),
        'nativeGraftRecordingUv': np.round(graft_recorded.T, 9).tolist(),
        'nativeHostRecordingUv': np.round(host_recorded.T, 9).tolist(),
        'elapsedSeconds': time.perf_counter() - started,
    }
    # Copy values before the native objects are deleted, then remove sections to
    # keep later cases independent of earlier cells and event queues.
    for section in list(sections.values()):
        h.delete_section(sec=section)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', nargs='?', default='/tmp/biohybrid-current-reference-input.json.gz')
    parser.add_argument('output', nargs='?', default='docs/biohybrid/neuron-validation.json')
    parser.add_argument('--case', action='append', help='Run only the named case(s).')
    args = parser.parse_args()
    payload = json.loads(gzip.decompress(Path(args.input).read_bytes()))
    criteria = payload['criteria']
    results = []
    for case in payload['cases']:
        if args.case and case['id'] not in args.case:
            continue
        result = native_case(case)
        c = result['comparison']
        result['checks'] = {
            'membraneRms': c['membraneRmsErrorMv'] <= criteria['rootMeanSquareVoltageMv'],
            'everyMonitorRms': c['worstMonitorRmsErrorMv'] <= criteria['rootMeanSquareVoltageMv'],
            'spikeCounts': c['spikeCountAgreement'],
            'spikeTiming': c['maximumSpikeTimingErrorMs'] <= criteria['maximumSpikeTimingErrorMs'],
            'strictPointwiseDiagnostic': c['membraneMaximumAbsoluteErrorMv'] <= criteria['strictPointwiseVoltageMv'],
            'extracellularForward': c['extracellularMaximumAbsoluteErrorUv'] <= criteria['extracellularMaximumErrorUv'],
            'graftSourceForward': c['graftSourceMaximumErrorUv'] <= criteria['sourceComponentMaximumErrorUv'],
            'hostSourceForward': c['hostSourceMaximumErrorUv'] <= criteria['sourceComponentMaximumErrorUv'],
        }
        result['acceptancePassed'] = all(value for key, value in result['checks'].items() if key != 'strictPointwiseDiagnostic')
        results.append(result)
        print(result['id'], json.dumps({'comparison': c, 'checks': result['checks']}), flush=True)
    output = {
        'schema': 'biohybrid-neuron-validation/1', 'modelVersion': payload['modelVersion'], 'observationVersion': payload['observationVersion'],
        'reference': {'name': 'NEURON', 'version': neuron.__version__, 'nativeVersion': h.nrnversion(), 'pythonVersion': platform.python_version(),
                      'voltageIntegrator': 'Native fixed-step backward Euler, secondorder=0',
                      'membrane': 'Native hh with usetable_hh=0, cm=1, ena=50, ek=-77, el=-54.3',
                      'synapses': 'Native Exp2Syn + voltage-threshold NetCon; event timing independently produced by NEURON',
                      'field': 'Independent 48-point disk quadrature; source/sink field transformed into exact node-wise axial current forcing',
                      'geometry': 'Each physical compartment is nseg=1 native Section; zero-area branch nodes are section endpoints',
                      'extracellular': 'Native total membrane current (fast_imem) with independently implemented endpoint-log line-source and disk averaging',
                      'scope': 'Complete branched 2-graft/3-host numerical benchmark. Synthetic canonical-HH cells at stated temperature. No empirical biological validation.'},
        'criteria': criteria, 'sourceSha256': payload['sourceSha256'],
        'referenceScriptSha256': sha256(__file__), 'inputSha256': sha256(args.input),
        'cases': results,
        'allAcceptancePassed': all(result['acceptancePassed'] for result in results),
        'strictPointwiseAllPassed': all(result['checks']['strictPointwiseDiagnostic'] for result in results),
        'retainedDiscrepancies': [{'caseId': result['id'], 'failedChecks': [key for key, passed in result['checks'].items() if not passed], 'comparison': result['comparison']}
                                  for result in results if not all(result['checks'].values())],
        'developmentDiscrepancies': [{
            'caseId': 'relay-dt0025',
            'stage': 'Native reference sample collection, first run',
            'observed': 'NEURON scheduled Vector.record returned 800 of 801 requested samples; accumulated h.t was within floating-point error of the 40 ms final boundary.',
            'resolution': 'Read the final already-computed native state directly, only when h.t and the requested endpoint agree within 1e-8 ms.',
            'impact': 'No model equation, numerical timestep, initial condition, voltage tolerance, waveform alignment, or synaptic timing was altered.'
        }],
        'limitations': ['Agreement is with independently implemented numerical mechanisms, not measured graft recordings.',
                        'Matched-timestep agreement verifies software equivalence; separate timestep and spatial refinement tests assess convergence toward the continuous equations.',
                        'Uniform prescribed disk current in an unbounded isotropic conductor does not model polarization or insulating substrates.',
                        'Native NetCon threshold/event delivery and JS interpolation/ceil delivery may differ by a numerical step; no timing alignment is applied.',
                        'The strict 0.5 mV pointwise diagnostic is retained even when RMS and spike-timing acceptance pass.'],
    }
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, separators=(',', ':')) + '\n')
    print('OUTPUT', str(target), 'ACCEPTANCE', output['allAcceptancePassed'], 'STRICT_POINTWISE', output['strictPointwiseAllPassed'])

if __name__ == '__main__':
    main()
