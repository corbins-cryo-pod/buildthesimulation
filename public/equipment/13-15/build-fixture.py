"""Build fixed archived samples from two ideal geometric spheres, no attenuation or imaging chemistry."""
import json
from pathlib import Path
from itertools import groupby
def encode(row):
 return [[i,len(list(g))] for i,g in groupby(row)]
c=((11,18,8,480),(35,28,8,400))
def v(x,y,z):
 for i,(a,b,k,r) in enumerate(c,1):
  if (100*(x-a))**2+(100*(y-b))**2+(200*(z-k))**2<=r*r:
   return i
 return 0
w,h,n=48,44,17
slices=[{'id':f'CT-TOY-Z{k:02d}','index':k,'encoding':'rle-row-major','runs':encode([v(x,y,k) for y in range(h) for x in range(w)])} for k in range(n) if k!=6]
d={'schema':'bts.inert-label-stack.v1','sampleId':'BTS-CAL-TWO-BEAD-001','revision':1,'provenance':'BuildTheSimulation analytic inert geometry; each saved plane is a direct sample of two ideal spheres, no real scan or reconstruction','shapeVox':[w,h,n],'spacingMm':[.1,.1,.2],'originMm':[0,0,0],'coordinateConvention':'Voxel centers; +column right, +row down, +index in slice order; no patient frame','labels':{'0':'Background','1':'Bead A','2':'Bead B'},'slices':slices}
Path(__file__).with_name('phantom.json').write_text(json.dumps(d,separators=(',',':'))+'\n')
