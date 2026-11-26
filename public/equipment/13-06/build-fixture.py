"""Build immutable, explicitly synthetic 8-bit geometric exhibit rasters, no microscopy model."""
import json, math
from pathlib import Path
p=Path(__file__).resolve().parent
left=[12,20]; right=[36,20]; crest=[18,36]; n=56
def raster(mirrored):
 def sample(x,y):
  x=n-1-x if mirrored else x
  v=51+((3*x+19*y+x*y)%11)
  if 10<=x<=40 and 17<=y<=23: v=131
  if 15<=x<=21 and 18<=y<=37: v=174
  if math.hypot(x-35,y-35)<=6:v=104
  if any((x-a)**2+(y-b)**2<=4 for a,b in [left,right,crest]):v=228
  return v
 return [sample(x,y) for y in range(n) for x in range(n)]
items=[]
for key,mirror in [('A',False),('M',True)]:
 items.append({'id':'GLA2-EXH-'+key,'basisImageId':'GLA2-EXH-A','orientation':'mirror-x' if mirror else 'native','landmarks':{k:[n-1-q[0],q[1]] if mirror else q for k,q in zip('ABC',[left,right,crest])},'pixels':raster(mirror)})
put={'schema':'bts.synthetic-image-archive.v1','source':'BuildTheSimulation authorial inert geometric exhibit; no acquisition, no FEM or microscopy model','sampleId':'GLA2-INERT-SYMBOL-001','revision':1,'frame':{'sizePx':[56,56],'pixelSizeNm':2.5,'rowOrigin':'top','scaleProvenance':'invented fixture coordinate scale, not vendor sampling'},'images':items}
(p/'fixture.json').write_text(json.dumps(put,separators=(',',':'))+'\n')
