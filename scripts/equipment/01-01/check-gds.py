"""Independent GDSII parser verification; pip install gdstk==0.9.61."""
import json,pathlib,gdstk
base=pathlib.Path(__file__).resolve().parents[3]/'public/equipment/01-01'
rows=[]
for case,n in [('intact',1),('open',2)]:
 lib=gdstk.read_gds(str(base/f'example-{case}.gds'));assert len(lib.cells)==1
 assert abs(lib.precision-1e-9)<1e-17 and abs(lib.unit-1e-6)<1e-14
 pads=[p for p in lib.cells[0].polygons if p.layer==1 and p.datatype==1];assert len(pads)==2
 nets=[p.get_gds_property(1).strip('\0') for p in pads];assert nets==['P1:N1','P2:N1'],nets
 c=sorted(float(p.points[:,0].mean()) for p in pads);spacing=c[1]-c[0]
 assert abs(spacing-40)<=.001
 assert sum(p.layer==1 and p.datatype==2 for p in lib.cells[0].polygons)==n
 rows.append({'file':f'example-{case}.gds','databaseUnitM':lib.precision,'ids':nets,'spacingUm':spacing,'toleranceUm':.001,'traceRectangles':n,'pass':True})
(base/'external-gds-check.json').write_text(json.dumps({'parser':'gdstk '+gdstk.__version__,'scope':'Independent parse of units, ID properties, geometry and datatype; net topology is covered by separate station tests.','rows':rows},indent=2)+'\n')
print(rows)
