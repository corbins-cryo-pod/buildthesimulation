#!/usr/bin/env python3
"""Run component verification and contracts; rebuild the portable laboratory."""
import hashlib, json, pathlib, platform, re, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for folder in ['docs/axon-interface/stage3','public/axon-stage3']: (ROOT/folder).mkdir(parents=True,exist_ok=True)
tests=subprocess.run(['node','--test','tests/axon-interface-stage3-contracts.mjs'],cwd=ROOT,capture_output=True,text=True)
(ROOT/'docs/axon-interface/stage3/test-report.tap').write_text(tests.stdout+tests.stderr)
if tests.returncode:print(tests.stdout+tests.stderr);sys.exit(tests.returncode)
reference=subprocess.run([sys.executable,'scripts/axon-interface-stage3/reference.py'],cwd=ROOT,capture_output=True,text=True)
(ROOT/'docs/axon-interface/stage3/reference-run.log').write_text(reference.stdout+reference.stderr)
if reference.returncode:print(reference.stdout+reference.stderr);sys.exit(reference.returncode)
ref=json.loads((ROOT/'docs/axon-interface/stage3/reference-report.json').read_text())
paths=['public/axon-stage3/engine.mjs','public/axon-stage3/ui.mjs','public/axon-stage3/index.html','tests/axon-interface-stage3-contracts.mjs','scripts/axon-interface-stage3/reference.py','scripts/axon-interface-stage3/reproduce.py','docs/axon-interface/stage3/ACCEPTANCE.json']
report={'schema':'buildthesimulation.axon-growth-verification.v1','modelVersion':'axon-growth/0.1.0-dev.1','status':'Component mathematics and software contracts verified; development preview only','contractTests':{'passed':int(re.search(r'^# pass (\d+)',tests.stdout,re.M)[1]),'failed':0,'skipped':0},'referenceChecks':ref,'sourceHashes':{p:digest(ROOT/p) for p in paths},'frozenAcceptanceSha256':digest(ROOT/'docs/axon-interface/stage3/ACCEPTANCE.json'),'biologicalValidation':False,'fullStochasticConvergence':False,'electricalCouplingValidated':False,'stage2Complete':False,'runtime':{'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':platform.python_version()},'scope':'The checks concern explicitly stated numerical components. They do not validate developmental rates, tissue mechanics, fate prediction, functional integration or electrical selectivity.'}
(ROOT/'public/axon-stage3/validation.json').write_text(json.dumps(report,indent=2)+'\n')
html=(ROOT/'public/axon-stage3/index.html').read_text()
engine=(ROOT/'public/axon-stage3/engine.mjs').read_text().replace('</script','<\\/script')
ui=(ROOT/'public/axon-stage3/ui.mjs').read_text().replace('</script','<\\/script')
embedded='<script id="engine-source" type="text/plain">'+engine+'</script>\n<script id="verification-source" type="application/json">'+json.dumps(report).replace('</','<\\/')+'</script>\n<script type="module">'+ui+'</script>'
html=html.replace('<script type="module" src="ui.mjs"></script>',embedded)
html=html.replace('href="/simulations/biohybrid-axon-interface/"','href="https://ba8843ac.buildthesimulation.pages.dev/simulations/biohybrid-axon-interface/"')
(ROOT/'axon-stage3-laboratory.html').write_text(html)
print(json.dumps({'tests':report['contractTests'],'references':{'passed':ref['passed'],'total':ref['total']},'portableHtml':str(ROOT/'axon-stage3-laboratory.html')},indent=2))
