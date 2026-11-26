"""Nominal Reynolds Tech-inspired deactivated dry enclosure (not installed equipment). NIST cover image informed broad shapes; dimensions are scene design. Blender -b -t 1 -P build-model.py."""
import bpy,math,os
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
out=Path(__file__).resolve().parent
s=bpy.context.scene;s.unit_settings.system='METRIC'
def m(n,rgb,metal=0):
 a=bpy.data.materials.new(n);a.diffuse_color=(*rgb,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=a.diffuse_color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.38;return a
def finish(n,mat):
 o=bpy.context.object;o.name=n;o.data.materials.append(mat);return o
def p(x):return tuple(v*.001 for v in x)
def b(n,pos,dim,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p(pos));o=finish(n,mat);o.dimensions=p(dim);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  q=o.modifiers.new('Fillet','BEVEL');q.width=bevel*.001;q.segments=3;q=o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cyl(n,pos,diam,depth,mat,axis='Y'):
 rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=diam*.0005,depth=depth*.001,location=p(pos),rotation=rot);return finish(n,mat)
def tube(n,pts,diam,mat):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_resolution=2;c.bevel_depth=diam*.0005
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for v,pt in zip(sp.bezier_points,pts):v.co=p(pt);v.handle_left_type=v.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);s.collection.objects.link(o);c.materials.append(mat);return o
def text(n,label,x,y,z,size,mat,back=False):
 c=bpy.data.curves.new(n,'FONT');c.body=label;c.size=size*.001;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=2;o=bpy.data.objects.new(n,c);s.collection.objects.link(o);o.location=p((x,y,z));o.rotation_euler=(math.pi/2,0,math.pi if back else 0);c.materials.append(mat);return o
satin=m('Blue-gray painted shell',(.25,.40,.43),.38);iv=m('Light metallic front overlay',(.70,.74,.70),.46);dk=m('Black molded detail',(.023,.033,.035));metal=m('Knob brushed alloy',(.52,.56,.55),.65);rub=m('Feet',(.021,.022,.024));white=m('Marking ivory',(.84,.83,.75));ink=m('Badge gray',(.084,.13,.13));red=m('Red exterior jack silhouette',(.51,.079,.064));green=m('Dark exterior green',(.095,.27,.22));toy=m('Fictional board slate',(.14,.24,.29));yellow=m('Fictional label wheat',(.77,.50,.15));cyan=m('Fictional label teal',(.17,.51,.49))
iv=m('Cream polypropylene-like finish',(.75,.73,.63),.13);gray=m('Cool recess',(.49,.54,.52),.22);dk=m('Inactive dark detail',(.032,.040,.052),.25);blue=m('Deep blue trim',(.071,.133,.239),.31);steel=m('Neutral accent',(.55,.59,.56),.51);gold=m('Detached card amber',(.77,.51,.20));ink=m('Muted dark markings',(.16,.17,.15));teal=m('Abstract fixture frame finish',(.13,.43,.42),.18);white=m('Soft white',(.82,.82,.74))
clear=m('Static clear-sheet silhouette',(.47,.65,.65),.0);bs=clear.node_tree.nodes.get('Principled BSDF');bs.inputs['Alpha'].default_value=.21;bs.inputs['Roughness'].default_value=.17
# Front photo-derived enclosure style, nominal six-foot class and explicitly authored H/D.
b('Bench_main_back', (0,279,839),(1828.8,312,1611),iv,24)
b('Bench_front_undertray',(0,-278,565),(1828.8,310,615),iv,17)
for i,x in enumerate([-713,713]):
 b('Bench_solid_side_foot_'+str(i),(x,-39,147),(361,733,294),iv,19)
b('Bench_lower_blue_band',(0,-431,293),(1778,11,24),blue,4)
b('Bench_top_blue_band',(0,-414,1668),(1782,13,24),blue,4)
b('Bench_enclosure_cap',(0,0,1651),(1828.8,880,58),iv,14)
# Visible non-draining recesses under an inactive hood, no plumbing, wiring or process paths.
b('Bench_dry_counter_base',(0,-159,874),(1785,559,61),gray,7)
for name,pos,dim in [('left_edge',(-896,-155,915),(31,571,22)),('right_edge',(896,-155,915),(31,571,22)),('front_edge',(0,-428,917),(1785,23,25)),('back_edge',(0,116,916),(1782,22,23)),('divider',(0,-154,916),(29,539,22))]:
 b('Bench_dry_rim_'+name,pos,dim,iv,6)
for i,x in enumerate([-440,440]):
 b('Bench_dry_recess_'+str(i),(x,-161,903),(747,424,9),gray,8)
b('Bench_passive_backsplash',(0,110,1169),(1665,30,489),iv,18)
for i in range(38):
 b('Bench_blind_vertical_slot_'+str(i),(-743+i*40.2,93,1054),(13,5,72),gray,4)
b('Bench_upper_inactive_panel',(0,-368,1519),(1732,104,253),iv,13)
for x in [-731,-576,-421,-266,-111,44,199,354,509,664]:
 b('Bench_blank_molded_inlay', (x,-423,1519),(56,8,48),dk,6);cyl('Bench_round_decorative_shape',(x+23,-424,1458),22,6,blue)
cyl('Bench_dormant_dial_shape',(792,-426,1530),81,10,dk);cyl('Bench_blank_dial_face',(792,-433,1530),60,6,gray)
for x in [-882,882]:
 b('Bench_clear_sheet_support',(x,-354,1129),(28,95,438),steel,9)
b('Bench_fixed_sheet',(0,-389,1198),(1745,11,356),clear,3)
b('Bench_fixed_sheet_upper_edge',(0,-395,1381),(1760,31,28),steel,5)
b('Bench_fixed_sheet_lower_edge',(0,-401,1018),(1758,27,17),steel,4)
text('Bench_nominal_label','04-06   /   DOCUMENTARY BENCH',0,-435,756,29,ink)
# Detached teaching gauge, entirely outside the real cabinet, authored 160 × 110 mm opening.
b('Footprint_separate_stand',(1200,-290,421),(320,294,842),teal,24)
b('Footprint_demo_plinth',(1200,-290,853),(272,228,25),dk,12)
for dx in [-84,84]:b('Footprint_frame_long',(1200+dx,-290,870),(8,126,13),teal,2)
for dy in [-59,59]:b('Footprint_frame_short',(1200,-290+dy,870),(160,8,13),teal,2)
b('Footprint_gold_token',(1200,-290,881),(105,145,10),gold,3)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'wet-bench.glb'),export_format='GLB',export_apply=True)
