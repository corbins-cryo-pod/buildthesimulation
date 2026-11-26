"""Write two fixed synthetic inert point-spread rasters. Values are authorial, not microscope measurements."""
from hashlib import sha256
from math import exp, log
from pathlib import Path
import json
p=Path(__file__).resolve().parent
grid=65
for name,width in (('wide',240),('narrow',80)):
    axis=[(i-grid//2)*10 for i in range(grid)]
    raster=[round(65535*(.02+.98*exp(-4*log(2)*(x*x+y*y)/(width*width)))) for y in axis for x in axis]
    out={'schema':'bts.synthetic-psf-image.v1','id':'LEICA-DEMO-'+name.upper(),'revision':1,'source':'wholly synthetic static profile, not a Leica image or measurement','sizePx':grid,'spacingNm':10,'backgroundQ16':1311,'case':name,'authorNominalFwhmNm':width,'pixelsQ16':raster}
    payload=(json.dumps(out,separators=(',',':'))+'\n').encode()
    (p/(name+'.json')).write_bytes(payload)
    print(name,sha256(payload).hexdigest())
