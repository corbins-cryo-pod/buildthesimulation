"""Long current steps in native NEURON/LFPykit using the existing reference kernel.

Use pinned scripts/cortex-reference-requirements.txt and the original compiled
NMODL library, as documented in docs/cortex/ACTIVE_MODEL.md. No JS solver results
are supplied to this generator. Original short-case fixtures remain untouched.
"""
import json
import subprocess
import hashlib
from pathlib import Path
from importlib.machinery import SourceFileLoader
from importlib.metadata import version

ROOT = Path(__file__).resolve().parents[1]
reference = SourceFileLoader('current_step_native_reference', str(ROOT/'scripts/cortex-active-neuron-reference.py')).load_module()
assert version('neuron') == '9.0.1'
assert version('LFPykit') == '0.6.2'
raw = subprocess.check_output(['node', str(ROOT/'scripts/cortex-current-step-reference-input.mjs')], cwd=ROOT)
inputs = json.loads(raw)
paths = ['scripts/cortex-current-step-reference.py', 'scripts/cortex-current-step-reference-input.mjs',
         'scripts/cortex-active-neuron-reference.py', 'scripts/cortex-active-model.py',
         'scripts/cortex-reference-requirements.txt',
         'public/models/cortex/allen571654895/571654895.swc',
         'public/models/cortex/allen571654895/optim_param_571654895.json']
paths += [str(p.relative_to(ROOT)) for p in sorted((ROOT/'scripts/cortex-active-mechanisms').glob('*.mod'))]
sha = lambda p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
hashes = {p: sha(p) for p in paths}
report = {'generator': {'neuronVersion': version('neuron'), 'lfpykitVersion': version('LFPykit'),
          'inputSha256': hashlib.sha256(raw).hexdigest(), 'sourceHashes': hashes},
          'cases': [reference.run(c) for c in inputs]}
assert hashes == {p: sha(p) for p in paths}, 'Sources changed during generation'
(ROOT/'tests/fixtures/cortex-current-step-neuron.json').write_text(json.dumps(report, separators=(',', ':'))+'\n')
