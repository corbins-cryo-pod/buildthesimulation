"""Author two intentionally simple preprinted chart rasters; no production or machining data."""
from pathlib import Path
import json
w,h=54,36
charts=[]
for k,width in [('A',18),('B',26)]:
 left=(w-width)//2
 rows=[[left,width,w-left-width] if 5<=y<=30 else [w,0,0] for y in range(h)]
 charts.append({'id':'R4-EXHIBIT-'+k,'encoding':'one-horizontal-ink-span-per-row','rows':rows})
f={'schema':'bts.synthetic-printed-chart-pair.v1','sampleId':'CAL-R4-PRINTED-PAIR-001','revision':1,'provenance':'BuildTheSimulation authorial inert preprinted chart rasters, no instrument acquisition','shapePx':[w,h],'pixelSizeMm':.25,'charts':charts}
Path(__file__).with_name('chart-pair.json').write_text(json.dumps(f,separators=(',',':'))+'\n')
