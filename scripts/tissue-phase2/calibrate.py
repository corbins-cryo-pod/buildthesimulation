"""Fit primary distributed brain curves; no synthetic curves are called experiments.
Time-independent fits are separate from the published finite-viscoelastic presets.
Leave-one-loading-mode-out validation is not independent-donor validation.
"""
import json, hashlib
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
ROOT=Path(__file__).resolve().parents[2]
source=json.loads((Path(__file__).with_name('primary-curves.json')).read_text())
out=ROOT/'artifacts/tissue-phase2';out.mkdir(parents=True,exist_ok=True)
# When the pinned workbook has been extracted in CI, verify every included value.
raw=out/'experimental-source.json'
if raw.exists():
 data=json.loads(raw.read_text());assert data['sha256']==source['sourceSha256']
 cells={k:v for row in data['sheets']['xl/worksheets/sheet2.xml'] for k,v in row.items()}
 for region,columns in {'cortex':['A','B','C','D','E','F'],'basal':['G','H','I','J','K','L'],'corona':['N','O','P','Q','R','S'],'callosum':['T','U','V','W','X','Y']}.items():
  for k,mode in enumerate(['tension','compression','shear']):
   x=source['shearGamma' if mode=='shear' else mode+'Lambda'];y=source['regions'][region][mode]
   for i in range(17):assert x[i]==cells[f'{columns[k*2]}{i+5}'] and y[i]==cells[f'{columns[k*2+1]}{i+5}']
 print('PINNED_WORKBOOK_CHECK: all 408 x/y values matched; duplicate sheets excluded')

def predict(model,theta,mode,x):
 mu=theta[0]
 if model=='ogden':
  alpha=theta[1]
  if mode!='shear':return 2*mu/alpha*(x**alpha-x**(-alpha/2))/x
  # Analytical principal stretches/directions for simple shear via batched eigensystem.
  F=np.tile(np.eye(3),(len(x),1,1));F[:,0,1]=x
  b=F@F.transpose(0,2,1);v,Q=np.linalg.eigh(b);t=2*mu/alpha*v**(alpha/2)
  tau=np.einsum('nik,nk,njk->nij',Q,t,Q);return tau[:,0,1]
 mix=theta[1] if model=='mooney' else 0
 if mode=='shear':return mu*x
 return mu*((1-mix)+mix/x)*(x-x**-2)

def fit(model,region,modes,indices):
 def residual(theta):
  return np.concatenate([(predict(model,theta,m,np.array(source['shearGamma' if m=='shear' else m+'Lambda'])[indices])-np.array(region[m])[indices])/max(abs(np.array(region[m])[indices])) for m in modes])
 starts=[([.5,-20],[.001,-50],[10,-.1]),([.5,20],[.001,.1],[10,50])] if model=='ogden' else [([.5,.25],[.001,0],[10,1])] if model=='mooney' else [([.5],[.001],[10])]
 solutions=[least_squares(residual,start,bounds=(lo,hi),xtol=1e-12,ftol=1e-12,gtol=1e-12) for start,lo,hi in starts]
 best=min(solutions,key=lambda x:np.sum(x.fun**2))
 assert best.success
 return best.x

def metrics(model,theta,region,mode,indices):
 y=np.array(region[mode])[indices];x=np.array(source['shearGamma' if mode=='shear' else mode+'Lambda'])[indices];p=predict(model,theta,mode,x)
 rmse=float(np.sqrt(np.mean((y-p)**2)));return {'rmseKPa':rmse,'normalizedRMSE':rmse/max(abs(np.array(region[mode]))),'R2':float(1-np.sum((y-p)**2)/np.sum((y-y.mean())**2))}

train=np.array([i for i in range(1,17) if i%4!=0]);test=np.array([4,8,12,16]);modes=['tension','compression','shear'];results=[]
for name,region in source['regions'].items():
 for model in ['neo','mooney','ogden']:
  theta=fit(model,region,modes,train)
  record={'region':name,'model':model,'parameters':dict(zip(['muKPa','alpha' if model=='ogden' else 'mix'],theta.tolist())),
          'holdout':{m:metrics(model,theta,region,m,test) for m in modes},'leaveModeOut':{}}
  for held in modes:
   t=fit(model,region,[m for m in modes if m!=held],np.arange(1,17));record['leaveModeOut'][held]={'parameters':t.tolist(),**metrics(model,t,region,held,np.arange(1,17))}
  results.append(record)
report={'source':{k:v for k,v in source.items() if k not in ['regions','tensionLambda','compressionLambda','shearGamma']},'trainingIndices':train.tolist(),'heldOutIndices':test.tolist(),'weighting':'Each mode scaled by its training peak stress; constrained nonnegative Mooney coefficients; both Ogden exponent signs tested.',
 'uncertainty':'No donor-level or confidence intervals inferred. Published viscoelastic parameters are independently transcribed, not refitted with these static curves.', 'results':results}
(out/'calibration.json').write_text(json.dumps(report,indent=2)+'\n')
for r in results:print('CALIBRATION',r['region'],r['model'],r['parameters'],'heldout NRMSE', {k:round(v['normalizedRMSE'],4) for k,v in r['holdout'].items()})
print('CALIBRATION_SUMMARY='+json.dumps({'results':results},separators=(',',':')))
