"""Write fixed synthetic binary outline/annotation rasters. No CT acquisition or reconstruction."""
from pathlib import Path
from itertools import groupby
import json
def rle(vals):return [[v,len(list(g))] for v,g in groupby(vals)]
w,h,planes=32,24,3
def saved(k):
 obj=rle(int(k==0 and 9<=x<=22 and 5<=y<=18 and not(13<=x<=18 and 9<=y<=14)) for y in range(h) for x in range(w))
 marks=rle(int(y==11 and 2<=x<=29) for y in range(h) for x in range(w))
 return {'id':f'FRAME-{k}','index':k,'object':{'id':f'OUTLINE-{k}','runs':obj},'annotation':{'id':f'ANNOTATION-{k}','runs':marks}}
d={'schema':'bts.synthetic-two-layer-phantom.v1','archiveId':'SS1276-GEOMETRIC-FRAMES-001','revision':1,
   'source':'BuildTheSimulation authorial rectangular-ring labels and independent chart annotation; no acquired data',
   'shapeVox':[w,h,planes],'spacingMm':[.2,.25,.5],'frame':'Cell indices increase right, down and through the saved frame list; first cell center is the origin',
   'missingIndices':[2],'planes':[saved(k) for k in [0,1]]}
Path(__file__).with_name('saved-phantom.json').write_text(json.dumps(d,separators=(',',':'))+'\n')
