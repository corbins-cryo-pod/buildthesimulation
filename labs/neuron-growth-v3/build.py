import pathlib
root = pathlib.Path(__file__).parent
order = ['environment.js', 'celltypes.js', 'clutch.js', 'activity.js', 'morphometrics.js', 'core.js', 'presets.js']
engine = '\n'.join((root / 'engine' / f).read_text() for f in order)
assert '</script' not in engine
page = (root / 'src/page.html').read_text()
page = page.replace('/*__ENGINE__*/', engine).replace('/*__WORKER__*/', (root / 'engine/worker.js').read_text())
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/neuron-engine-v3.html').write_text(page)
print('bytes', len(page))
