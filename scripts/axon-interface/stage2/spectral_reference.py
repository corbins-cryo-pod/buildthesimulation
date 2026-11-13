"""Independent NumPy/SciPy reference. No JS rates, states or currents imported."""
import json, math, sys
import numpy as np
from scipy.linalg import expm

# Whole-cell nS and /ms. Cleo pinned parameter sets, not Williams H134R.
CH2=dict(Gd1=.066,Gd2=.01,Gr0=.000333,g0=3.2,phim=1e16,k1=.4,k2=.12,Gf0=.018,Gb0=.008,kf=.01,kb=.008,gamma=.05,p=1,q=1,E=0)
RED=dict(Gd1=.041,Gd2=.01,Gr0=6.67e-7,g0=22,phim=2e14,k1=.05,k2=.5,Gf0=.001,Gb0=.01,kf=.01,kb=.004,gamma=.05,p=1,q=1,E=0)
VF=dict(Gd1=.37,Gd2=.175,Gr0=6.67e-7,g0=17.5,phim=1.5e16,k1=3,k2=.2,Gf0=.02,Gb0=.0032,kf=.01,kb=.01,gamma=.05,p=1,q=1,E=0)
PARAMETERS={'chr2':CH2,'chrimson':RED,'vfchrimson':VF,'hypothetical-green':{**CH2,'phim':3e15,'g0':8}}
SPECTRA={'chr2':[(400,.34),(422,.65),(460,.96),(470,1),(473,1),(500,.57),(520,.22),(540,.06),(560,.01)],'chrimson':[(470,.31),(490,.47),(510,.69),(530,.75),(550,.88),(570,.97),(590,1),(610,.88),(630,.55)],'vfchrimson':[(470,.34),(490,.51),(510,.71),(530,.75),(550,.86),(570,1),(590,1),(610,.8),(630,.48)],'hypothetical-green':[(nm,.2+.8*math.exp(-.5*((nm-530)/22)**2)) for nm in range(470,561,10)]}

def photon_flux(model_id,bins,convention='declared'):
    table=SPECTRA[model_id];total=0.
    for b in bins:
        nm=b['nm'];power=b['irradianceMwMm2']
        if nm<table[0][0] or nm>table[-1][0] or power<0:raise ValueError('Outside spectrum support')
        weight=float(np.interp(nm,[q[0] for q in table],[q[1] for q in table]))
        if model_id=='chr2' and convention!='alternate':weight*=470/nm
        total+=power*1e-3*nm*1e-9/(6.62607015e-34*299792458)*weight
    return total

def generator(p,flux,scale=1):
    hp=0 if flux==0 else flux**p['p']/(flux**p['p']+p['phim']**p['p'])
    hq=0 if flux==0 else flux**p['q']/(flux**p['q']+p['phim']**p['q'])
    a=p['k1']*hp;b=p['k2']*hp;f=p['Gf0']+p['kf']*hq;r=p['Gb0']+p['kb']*hq
    return scale*np.array([[-a,p['Gd1'],0,p['Gr0']],[a,-p['Gd1']-f,r,0],[0,f,-p['Gd2']-r,b],[0,0,p['Gd2'],-b-p['Gr0']]])

def assay(case):
    p=PARAMETERS[case['modelId']];state=np.array([1.,0,0,0]);rows=[]
    for interval in case['intervals']:
        flux=photon_flux(case['modelId'],interval['bins'],case.get('convention','declared'))
        state=expm(generator(p,flux,case.get('rateScale',1))*interval['durationMs'])@state
        currents=[p['g0']*(state[1]+p['gamma']*state[2])*(v-p['E'])/1000 for v in [-100,-60,0,40]]
        rows.append(dict(flux=flux,state=state.tolist(),currentsNa=currents))
    return rows

if __name__=='__main__':
    cases=json.load(open(sys.argv[1]));json.dump([assay(c) for c in cases],open(sys.argv[2],'w'),allow_nan=False)
