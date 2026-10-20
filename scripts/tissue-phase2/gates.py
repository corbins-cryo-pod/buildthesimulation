"""Fail CI if UI presets drift from independently fitted, pinned experimental data."""
import json, subprocess
from pathlib import Path
out=Path('artifacts/tissue-phase2')
report=json.loads((out/'calibration.json').read_text())
fits=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {STATIC_FITS} from './src/lib/tissue-mechanics/calibration-presets.mjs';console.log(JSON.stringify(STATIC_FITS))"],text=True))
for fit in fits:
    r=next(r for r in report['results'] if r['region']==fit['region'] and r['model']==fit['model'])
    assert abs(fit['mu']-r['parameters']['muKPa'])<1e-5
    key='alpha' if fit['model']=='ogden' else 'mix'
    if key in r['parameters']: assert abs(fit[key]-r['parameters'][key])<1e-4
    for mode in ['tension','compression','shear']:
        assert abs(fit['holdoutNRMSE'][mode]-r['holdout'][mode]['normalizedRMSE'])<1e-5
        assert abs(fit['reportedR2'][mode]-r['holdout'][mode]['R2'])<1e-4
summary={'presetCount':len(fits),'pinnedWorkbookVerified':(out/'experimental-source.json').exists(),'staticPresetsMatchIndependentCalibration':True}
if (out/'verification.json').exists():
    verification=json.loads((out/'verification.json').read_text())
    assert all(r['status']=='converged' for r in verification['sweep'])
    def force(n,nu,form):return abs(next(r for r in verification['sweep'] if r['n']==n and r['nu']==nu and r['formulation']==form)['reactionMN'][1])
    mixed=abs(force(4,.499,'mixed')/force(8,.499,'mixed')-1)
    tetra=abs(force(4,.499,'tetra')/force(8,.499,'tetra')-1)
    assert mixed<.06 and mixed<tetra/4
    summary.update(mixedCoarseToFineRelativeChange=mixed,tetraCoarseToFineRelativeChange=tetra)
(out/'acceptance-gates.json').write_text(json.dumps(summary,indent=2))
print('ACCEPTANCE_GATES',json.dumps(summary))
