"""Generate an independent passive-cable fixture with pinned NEURON 9.0.1.

Run in a separate virtual environment; NEURON is NOT a website dependency.
This fixture tests a uniform cable, not the full cortical arbor or human biology.
"""
import hashlib
import importlib.metadata
import json
import math
import platform
from pathlib import Path

import neuron
from neuron import h

if importlib.metadata.version('neuron') != '9.0.1':
    raise RuntimeError('Reference generation requires neuron==9.0.1')

h.load_file('stdrun.hoc')
config = dict(lengthUm=1000, diameterUm=2, compartments=41, dtMs=.025,
              durationMs=40, capacitanceUfPerCm2=1, resistanceOhmCm2=20000,
              axialResistivityOhmCm=150, restMv=-65, injectionNa=.005,
              onsetMs=5, injectionDurationMs=5)
cable = h.Section(name='uniform_passive_reference')
cable.L = config['lengthUm']
cable.diam = config['diameterUm']
cable.nseg = config['compartments']
cable.Ra = config['axialResistivityOhmCm']
cable.cm = config['capacitanceUfPerCm2']
cable.insert('pas')
for seg in cable:
    seg.pas.g = 1 / config['resistanceOhmCm2']
    seg.pas.e = config['restMv']
clamp = h.IClamp(cable(.5 / cable.nseg))
clamp.delay = 0
clamp.dur = 1e9
clamp.amp = 0
h.CVode().active(0)
h.CVode().use_fast_imem(1)
h.secondorder = 0  # backward Euler, matching the browser kernel
h.dt = config['dtMs']
h.finitialize(config['restMv'])
sample_steps = [0, 200, 201, 220, 300, 400, 401, 440, 800, 1600]
samples = []

def capture(step):
    samples.append(dict(step=step, timeMs=step * config['dtMs'],
                        voltageMv=[float(seg.v) for seg in cable],
                        membraneCurrentNa=[float(seg.i_membrane_) for seg in cable]))

capture(0)
for step in range(int(round(config['durationMs'] / config['dtMs']))):
    t, dt = step * config['dtMs'], config['dtMs']
    overlap = max(0, min(t + dt, config['onsetMs'] + config['injectionDurationMs']) - max(t, config['onsetMs']))
    clamp.amp = config['injectionNa'] * overlap / dt
    h.fadvance()
    if step + 1 in sample_steps:
        capture(step + 1)

script_path = Path(__file__).resolve()
payload = dict(schemaVersion='cortex-neuron-fixture/1',
               generator=dict(neuronVersion=importlib.metadata.version('neuron'),
                              neuronBuild=h.nrnversion(), pythonVersion=platform.python_version(),
                              scriptSha256=hashlib.sha256(script_path.read_bytes()).hexdigest(),
                              packages={name: importlib.metadata.version(name) for name in ['numpy', 'sympy', 'packaging', 'find-libpython', 'setuptools', 'mpmath']}),
               scope='Uniform sealed passive cylinder; intracellular current into first compartment; numerical cross-solver comparison only, not experimental validation.',
               method='NEURON pas, IClamp, secondorder=0, CVode disabled, use_fast_imem(1); total outward current in nA excludes electrode-current process itself.',
               config=config, sourceUrls=['https://pypi.org/project/neuron/9.0.1/', 'https://www.neuronsimulator.org/en/9.0.0/progref/simctrl/cvode.html'],
               samples=samples)
path = script_path.parent.parent / 'tests/fixtures/cortex-neuron-passive.json'
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(payload, indent=2) + '\n')
print(f'Generated {path.name}: {len(samples)} frames × {cable.nseg} compartments; NEURON {neuron.__version__}')
