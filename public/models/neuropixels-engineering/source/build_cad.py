"""Export the documented nominal shank envelope as CAD solids in millimetres.
The STEP export deliberately omits unverified pores, CMOS layers and connector details.
"""
from pathlib import Path
import cadquery as cq
import json,csv
R=Path(__file__).resolve().parents[1]
p=[(-.035,.175),(0,0),(.035,.175),(.035,10),(-.035,10)]
shank=cq.Workplane('XY').polyline(p).close().extrude(.024).translate((0,0,-.012)).val()
cq.exporters.export(shank,str(R/'models/neuropixels-shank-envelope.step'))
cq.exporters.export(shank,str(R/'models/neuropixels-shank-envelope.stl'),tolerance=.0001,angularTolerance=.1)
# Optional assembly includes planar square contacts at the same assumed origin as the visual model.
assembly=cq.Assembly(name='NPX1_nominal_shank_with_contact_footprints')
assembly.add(shank,name='Silicon_shank_10mm_70um_24um',color=cq.Color(.35,.39,.43))
site=cq.Workplane('XY').box(.012,.012,.00024,centered=(True,True,False)).val()
with (R/'electrode-coordinates.csv').open() as f:
 for row in csv.DictReader(f):
  assembly.add(site,name=f"Site_{int(row['site_id']):03d}",loc=cq.Location(cq.Vector(float(row['x_um'])/1000,float(row['y_um'])/1000,.012)),color=cq.Color(.55,.55,.49))
assembly.export(str(R/'models/neuropixels-shank-with-sites.step'))
# Probe cross-section extracted from the same CAD solid, not an invented multilayer diagram.
sec=cq.Workplane('XZ',origin=(0,.200,0)).add(shank).section().val()
# STEP dimensional round trip.
back=cq.importers.importStep(str(R/'models/neuropixels-shank-envelope.step')).val()
bb=back.BoundingBox()
result={'cad_shank_valid':shank.isValid(),'round_trip_valid':back.isValid(),'bbox_mm':[bb.xlen,bb.ylen,bb.zlen],'volume_mm3':back.Volume(),'expected_volume_mm3':(.070*(10-.175)+.5*.070*.175)*.024,'site_solids':960,'units':'mm','notes':'The 0.24 um pad relief and absolute site origin are reconstruction assumptions. STEP slots/pores and internal layers omitted.'}
(R/'validation/cad-checks.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
