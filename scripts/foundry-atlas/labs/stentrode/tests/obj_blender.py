# Run with: blender -b -noaudio --python tests/obj_blender.py
# Imports the two original independent OBJ witnesses via Blender's standard importer.
from pathlib import Path
import json
import bpy
P=Path(__file__).resolve().parent.parent;v=P/'validation'
res=[]
for n,groups,faceexpected in [('nominal',9,8),('defect',10,8)]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 # Preserve exported file axes (X,Y,Z) rather than silently swapping them as a viewer convention.
 bpy.ops.wm.obj_import(filepath=str(v/(n+'.obj')),global_scale=.001,forward_axis='Y',up_axis='Z',use_split_objects=True)
 obj=list(bpy.context.scene.objects);assert len(obj)==groups,(len(obj),[x.name for x in obj])
 discs=[o for o in obj if 'Nominal_Platinum_Disc' in o.name];assert len(discs)==faceexpected
 frame=next(o for o in obj if 'Scaffold_Centerlines' in o.name)
 assert len(frame.data.vertices)==52 and len(frame.data.edges)==96,(len(frame.data.vertices),len(frame.data.edges))
 bounds=[]
 for o in discs:
  assert len(o.data.vertices)==72 and len(o.data.polygons)==38,(o.name,len(o.data.vertices),len(o.data.polygons))
  p=[o.matrix_world@v0.co for v0 in o.data.vertices];xspan=max(p,key=lambda v:v.x).x-min(p,key=lambda v:v.x).x
  assert abs(xspan-.00075)<.0000004,(o.name,xspan)
  bounds.append(xspan*1000)
 if n=='nominal':
  bpy.context.scene.unit_settings.system='METRIC'
  bpy.context.scene.unit_settings.length_unit='MILLIMETERS'
  frame['source']='Illustrative one-piece topology, not an actual nitinol strut section or manufacturer CAD.'
  frame['geometry']='Centerlines only; axial reference 31.1 mm, diameter 3.0 mm.'
  for o in discs:
   o['source']='Oxley et al. 2016 Fig 2c & methods: diameter 0.75 mm, thickness 0.05 mm.'
   o['placement']='Synthetic crossover and site order; not a recovered measured layout.'
  txt=bpy.data.texts.new('ABOUT THE BENCH SPECIMEN')
  txt.write('OX-16 nominal inert-phantom reconstruction. Scale is metres with a millimetre display.\nDOI: 10.1038/nbt.3428\nCenterline scaffold topology, polar placements and connector numbering are assumptions.\nDisc diameter/thickness are source values. No surgical, clinical or lifetime model.\nEdit source or use the browser Geometry OBJ export to explore variant poses.\n')
  bpy.ops.wm.save_as_mainfile(filepath=str(v/'OX-16-editable-reference.blend'),compress=True)
 res.append(dict(witness=n,browserOBJGroups=len(obj),independentBlenderImport='passed',centerlineVertices=len(frame.data.vertices),centerlineEdges=len(frame.data.edges),discCount=len(discs),minimumDiscDiameterMm=min(bounds),maximumDiscDiameterMm=max(bounds)))
bpy.ops.wm.open_mainfile(filepath=str(v/'OX-16-editable-reference.blend'))
assert len(bpy.context.scene.objects)==9 and bpy.context.scene.unit_settings.length_unit=='MILLIMETERS'
(v/'blender.json').write_text(json.dumps(dict(blender=bpy.app.version_string,witnesses=res,editableReopened=True),indent=2)+'\n')
print('PASS standard OBJ importer, disc dimensions, 96 scaffold edges and .blend reopen')
