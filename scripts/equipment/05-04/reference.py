"""Independent reference: admittance/characteristic-matrix method; Python complex arithmetic.
Inputs are synthetic constants by design, not an instrument calibration or real material library.
"""
import cmath,math,json
from pathlib import Path
D=Path(__file__).resolve().parents[3]/'public'/'equipment'/'05-04'
def forward(wave,angle,indices,widths):
 px=indices[0]*math.sin(math.radians(angle))
 q=[cmath.sqrt(n*n-px*px) for n in indices]
 f=[]
 for mode in ('s','p'):
  Y=[n*n/v if mode=='p' else v for n,v in zip(indices,q)]
  a,b,c,d=1,0,0,1
  for v,y,length in zip(q[1:-1],Y[1:-1],widths):
   phase=2*math.pi*v*length/wave;C=cmath.cos(phase);S=-1j*cmath.sin(phase)
   a,b,c,d=a*C+b*S*y,a*S/y+b*C,c*C+d*S*y,c*S/y+d*C
  yin=(c+d*Y[-1])/(a+b*Y[-1]);r=(Y[0]-yin)/(Y[0]+yin);f.append(-r if mode=='p' else r)
 r=f[1]/f[0];return {'wavelengthNm':wave,'angleDeg':angle,'psiDeg':math.degrees(math.atan(abs(r))),'deltaDeg':math.degrees(cmath.phase(r))%360}
stack=[{'name':'film','n':1.46,'k':0,'thicknessNm':0}];sub={'name':'high-index standard','n':3.85,'k':.03}
w=list(range(380,901,20));series=[forward(wav,angle,[1,1.46,3.85+.03j],[123.4]) for angle in (65,70,75) for wav in w]
def file(n,v):(D/n).write_text(json.dumps(v,indent=2)+'\n')
file('independent-spectrum.json',{'schema':'bts.ellipsometry-spectrum.v1','sampleId':'DIELECTRIC-REF-1234','revision':0,'stack':stack,'substrate':sub,'rows':series,'provenance':{'kind':'synthetic independent reference','method':'separate Python complex characteristic-matrix implementation','knownThicknessNm':123.4,'acceptanceIntervalNm':[123.38,123.42],'warning':'Synthetic optical constants; not traceable hardware or measured wafer.'}})
file('reference-cases.json',{'declaredBeforeSolver':True,'polarizationConvention':'rho=rp/rs; passive index n+ik, time exp(-iωt), reflection basis p sign opposite at normal incidence. Delta wrapped 0–360°.',
'cases':[
 {'id':'bare','input':'vacuum to n=1.5 lossless at normal incidence, no film','expected':{'rs':-.2,'rp':.2,'psiDeg':45,'deltaDeg':180},'tolerance':1e-10,'source':'analytic normal-incidence Fresnel coefficients'},
 {'id':'matched','input':'First film n identical to substrate at all wavelengths','expected':'indistinguishable response for all thicknesses','tolerance':1e-9,'source':'no optical discontinuity at buried interface'},
 {'id':'reference-fit','input':'Independent Python characteristic matrix; 27 wavelengths and three angles, fixed known optical constants','expected':123.4,'unit':'nm','tolerance':.02},
 {'id':'order-alias','input':'Lossless film n=1.46 at λ=600 nm, 70°; optically equivalent thicknesses separated by dλ=λ/(2 sqrt(n²−sin² θ))','expected':600/(2*math.sqrt(1.46**2-math.sin(math.radians(70))**2)),'unit':'nm','tolerance':.02},
 {'id':'interlock','input':'Source=65°, detector=70°','expected':'Reject measurement with no exported stale result'}
 ]})
