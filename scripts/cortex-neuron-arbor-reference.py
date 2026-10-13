"""Independent NEURON reference for the declared Cortex Laboratory circuit.

The shared input contains only geometry and parameters, never browser-kernel
solutions or axial matrices. NEURON constructs and solves its own sections.
Five membrane-free connector sections represent the explicitly assumed radial
soma resistances; they are circuit adapters, not additional anatomical neurites.
"""
import hashlib
import importlib.metadata
import json
import math
import platform
import subprocess
from pathlib import Path

from neuron import h

SCRIPT = Path(__file__).resolve()
ROOT = SCRIPT.parent.parent
INPUT_SCRIPT = SCRIPT.with_name('cortex-reference-input.mjs')
if importlib.metadata.version('neuron') != '9.0.1':
    raise RuntimeError('Reference generation requires neuron==9.0.1')
INPUT_BYTES = subprocess.check_output(['node', str(INPUT_SCRIPT)], cwd=ROOT)
INPUTS = json.loads(INPUT_BYTES)
SAMPLE_STEPS = {0, 200, 201, 208, 209, 212, 213, 220, 221, 300, 400, 401, 800, 1600}
h.load_file('stdrun.hoc')
h.nlayer_extracellular(1)
h.CVode().active(0)
h.CVode().use_fast_imem(1)
h.secondorder = 0


def overlap(t, dt, start, duration):
    return max(0, min(t + dt, start + duration) - max(t, start)) / dt


def point_mv(position_um, source_um, current_na, conductivity):
    """Explicit SI calculation, converted to mV; independent of browser code."""
    radius_m = math.dist(position_um, source_um) * 1e-6
    return (current_na * 1e-9) / (4 * math.pi * conductivity * radius_m) * 1e3


def reference_case(spec, connector_segments=1, connector_offset_mv=0):
    c, nodes = spec['config'], spec['nodes']
    membrane, protocol = c['membrane'], c['protocol']
    mode, dt = protocol['mode'], c['solver']['dtMs']
    sections, connectors, mapping = [], [], []

    def section(name, length, diameter, count, has_membrane=True):
        sec = h.Section(name=name)
        sec.L, sec.diam, sec.nseg = length, diameter, count
        sec.Ra = membrane['axialResistivityOhmCm']
        sec.cm = membrane['capacitanceUfPerCm2'] if has_membrane else 0
        if has_membrane:
            sec.insert('pas')
            for seg in sec:
                seg.pas.g = 1 / membrane['resistanceOhmCm2']
                seg.pas.e = membrane['restMv']
        sec.insert('extracellular')
        for seg in sec:
            seg.xg[0], seg.xc[0], seg.xraxial[0] = 1e9, 0, 1e9
            seg.e_extracellular = 0
        sections.append(sec)
        return sec

    soma = section('soma', 20, 20, 1)
    mapping.append(soma(.5))
    branches = []
    for node in nodes[1:]:
        if node['parent'] == 0:
            branches.append([])
        branches[-1].append(node)
    for i, branch in enumerate(branches):
        # A separate 10 um axial path is specified for each radial soma edge.
        # Attaching all branches to soma(1) would create a different circuit.
        connector = section(f'radial_soma_adapter_{i}', 10, 20, connector_segments, False)
        connector.connect(soma(.5), 0)
        dendrite = section(f'dendrite_{i}', sum(n['lengthUm'] for n in branch),
                           branch[0]['diameterUm'], len(branch))
        dendrite.connect(connector(1), 0)
        connectors.append(connector)
        mapping.extend(list(dendrite))
    if len(mapping) != len(nodes):
        raise RuntimeError('Reference compartment mapping is incomplete')

    actual_geometry = [dict(id=node['id'], areaUm2=float(seg.area()),
                            diameterUm=float(seg.diam),
                            lengthUm=float(seg.sec.L / seg.sec.nseg))
                       for node, seg in zip(nodes, mapping)]
    for node, geometry in zip(nodes, actual_geometry):
        if abs(node['areaUm2'] - geometry['areaUm2']) > 1e-9:
            raise RuntimeError('NEURON membrane geometry differs from the shared input')
    clamp = h.IClamp(soma(.5))
    clamp.delay, clamp.dur, clamp.amp = 0, 1e9, 0
    h.dt = dt
    h.finitialize(membrane['restMv'])
    samples = []
    diagnostics = dict(maxPrescribedFieldErrorMv=0, maxConnectorCurrentNa=0,
                       maxConservationResidualNa=0)
    # Include zero-area endpoints exactly once, following NEURON's fast_imem
    # conservation convention; a child's connected endpoint is its parent's node.
    unique_nodes = [seg for sec in sections for seg in sec.allseg()
                    if not (seg.x == sec.orientation() and sec.parentseg() is not None)]

    def capture(step):
        samples.append(dict(step=step, timeMs=step * dt,
                            voltageMv=[float(seg.v) for seg in mapping],
                            membraneCurrentNa=[float(seg.i_membrane_) for seg in mapping]))

    capture(0)
    for step in range(round(c['solver']['durationMs'] / dt)):
        t = step * dt
        gate = overlap(t, dt, protocol['startMs'], protocol['durationMs'])
        injection_na = protocol['injectionNa'] * gate if mode == 'intracellular-current' else 0
        phase_ms = protocol['phaseUs'] / 1000
        pulse = (-overlap(t, dt, protocol['startMs'], phase_ms)
                 + overlap(t, dt, protocol['startMs'] + phase_ms + protocol['gapUs'] / 1000,
                           phase_ms))
        source_na = protocol['amplitudeUa'] * 1000 * pulse if mode == 'extracellular-stimulation' else 0
        clamp.amp = injection_na
        commanded = []
        for node, seg in zip(nodes, mapping):
            pos = node['centerUm']
            field_mv = 0
            if mode == 'extracellular-stimulation':
                field_mv = sum(point_mv(pos, site['positionUm'], source_na * sign,
                                        c['tissue']['conductivitySPerM'])
                               for site, sign in zip(spec['stimulatingSites'], [1, -1]))
            elif mode == 'intracellular-current':
                field_mv = point_mv(pos, protocol['bathReturnUm'], -injection_na,
                                    c['tissue']['conductivitySPerM'])
            seg.e_extracellular = field_mv
            commanded.append(field_mv)
            # Parallel leak and step-synaptic conductances have an exact
            # equivalent ohmic density and weighted reversal; NEURON pas solves it.
            synapse_s = (protocol['synapseNs'] * 1e-9 * node.get('synapseWeight', 0) * gate
                         if mode == 'synaptic-recording' else 0)
            synapse_density = synapse_s / (node['areaUm2'] * 1e-8)
            leak_density = 1 / membrane['resistanceOhmCm2']
            seg.pas.g = leak_density + synapse_density
            seg.pas.e = ((leak_density * membrane['restMv']
                          + synapse_density * protocol['synapseReversalMv']) / seg.pas.g)
        # Connector membrane area/capacitance/conductance does not contribute.
        # Their prescribed potential is arbitrary in the infinite-clamp limit;
        # use the soma command and measure finite-clamp error on actual segments.
        for connector in connectors:
            for seg in connector:
                seg.e_extracellular = commanded[0] + connector_offset_mv * math.sin(t)
        h.fadvance()
        diagnostics['maxPrescribedFieldErrorMv'] = max(
            diagnostics['maxPrescribedFieldErrorMv'],
            max(abs(float(seg.vext[0]) - command) for seg, command in zip(mapping, commanded)))
        connector_currents = [float(seg.i_membrane_) for sec in connectors for seg in sec]
        diagnostics['maxConnectorCurrentNa'] = max(
            diagnostics['maxConnectorCurrentNa'], max(abs(i) for i in connector_currents))
        diagnostics['maxConservationResidualNa'] = max(
            diagnostics['maxConservationResidualNa'],
            abs(sum(float(seg.i_membrane_) for seg in unique_nodes) - float(clamp.i)))
        if step + 1 in SAMPLE_STEPS:
            capture(step + 1)
    result = dict(id=spec['id'], config=c, compartmentIds=[node['id'] for node in nodes],
                  neuronGeometry=actual_geometry, diagnostics=diagnostics, samples=samples)
    for sec in sections:
        h.delete_section(sec=sec)
    return result


cases = [reference_case(spec) for spec in INPUTS]
adapter_checks = []
for name, options in [('connector-segmentation', dict(connector_segments=3)),
                      ('connector-field-offset', dict(connector_offset_mv=20))]:
    variant = reference_case(INPUTS[-1], **options)
    baseline = cases[-1]
    errors = {field: max(abs(a - b)
                         for left, right in zip(baseline['samples'], variant['samples'])
                         for a, b in zip(left[field], right[field]))
              for field in ['voltageMv', 'membraneCurrentNa']}
    if errors['voltageMv'] >= 1e-8 or errors['membraneCurrentNa'] >= 1e-10:
        raise RuntimeError(f'Numerical soma adapter is not invariant: {name} {errors}')
    adapter_checks.append(dict(name=name, caseId=baseline['id'], options=options,
                               maxVoltageDifferenceMv=errors['voltageMv'],
                               maxCurrentDifferenceNa=errors['membraneCurrentNa'],
                               diagnostics=variant['diagnostics']))
payload = dict(
    schemaVersion='cortex-neuron-arbor-fixture/1',
    generator=dict(neuronVersion=importlib.metadata.version('neuron'), neuronBuild=h.nrnversion(),
                   pythonVersion=platform.python_version(),
                   scriptSha256=hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
                   inputScriptSha256=hashlib.sha256(INPUT_SCRIPT.read_bytes()).hexdigest(),
                   inputSha256=hashlib.sha256(INPUT_BYTES).hexdigest(),
                   packages={name: importlib.metadata.version(name) for name in
                             ['numpy', 'sympy', 'packaging', 'find-libpython', 'setuptools', 'mpmath']}),
    scope='Declared 48-compartment passive radial-soma circuit, three protocols and a rotated/nonaligned pulse case; numerical cross-solver comparison, not experimental validation.',
    method='NEURON sections/pas/IClamp/extracellular; secondorder=0; fixed dt; fast_imem total outward nA. Five separate membrane-free 10x20 um connector sections represent the declared soma-edge resistance. No browser solver output or matrix is imported.',
    prescribedField=dict(layers=1, xgSPerCm2=1e9, xcUfPerCm2=0, xraxialMOhmPerCm=1e9),
    sourceUrls=[
        'https://www.neuronsimulator.org/en/9.0.1/progref/modelspec/programmatic/topology/geometry.html',
        'https://www.neuronsimulator.org/en/9.0.1/progref/modelspec/programmatic/mechanisms/mech.html#extracellular',
        'https://www.neuronsimulator.org/en/9.0.1/progref/simctrl/cvode.html#CVode.use_fast_imem'],
    adapterChecks=adapter_checks, cases=cases)
path = ROOT / 'tests/fixtures/cortex-neuron-arbor.json'
path.write_text(json.dumps(payload, indent=2) + '\n')
print(f'Generated {path.name}: {len(cases)} cases; NEURON 9.0.1')
for case in cases:
    print(case['id'], json.dumps(case['diagnostics']))
