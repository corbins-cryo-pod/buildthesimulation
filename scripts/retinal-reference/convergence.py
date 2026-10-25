#!/usr/bin/env python3
"""Native-package discretization study. No browser-port calculation is used."""
import argparse
import json
from pathlib import Path
import tempfile
import numpy as np
from generate import cases, reference_predict, VERSION

def comparison(a, b, da=.5, db=.5):
    # a/b can differ in raster spacing only for their aggregate integral.
    integral_a=float(a.astype(np.float64).sum()*da*da)
    integral_b=float(b.astype(np.float64).sum()*db*db)
    out={'integralBaseline':integral_a,'integralComparison':integral_b,
         'relativeIntegralDifference':(integral_b-integral_a)/integral_a}
    if a.shape==b.shape:
        diff=b.astype(np.float64)-a.astype(np.float64);peak=float(a.max())
        out.update(peakNormalizedLocalMaximumDifference=float(np.abs(diff).max()/peak),
                   peakNormalizedRmsDifference=float(np.sqrt(np.mean(diff*diff))/peak))
    return out

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[2]/'tests/fixtures/retinal-percept/convergence.json');args=parser.parse_args()
    selected=dict(cases());records=[]
    with tempfile.TemporaryDirectory(prefix='retinal-convergence-') as folder:
        for name in ('biphasic-center','axon-dense-pattern','axon-peripheral-streak'):
            c=selected[name];coarse,_=reference_predict(c,Path(folder));fine,_=reference_predict({**c,'gridStepDeg':.25},Path(folder));trajectory,_=reference_predict(c,Path(folder),trajectory_scale=2)
            records.append({'case':name,'config':c,'visualSampling':comparison(coarse,fine,.5,.25),'trajectorySampling':comparison(coarse,trajectory)})
    report={'referenceVersion':VERSION,'baseline':{'gridStepDeg':.5,'bundles':1000,'radialSamples':500},'visualComparison':{'gridStepDeg':.25},'trajectoryComparison':{'bundles':2000,'radialSamples':1000},'cases':records,
      'interpretation':'Reproducing a pinned discrete model is distinct from convergence. Nearest-bundle assignments can cause large local changes under trajectory refinement even when aggregate integrals change little. No uniform pointwise convergence or patient validation is established.'}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':main()
