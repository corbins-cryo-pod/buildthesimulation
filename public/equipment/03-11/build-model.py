"""RTP-600xp de-energized cabinet only, NIST front photo and MPT MAN-600xp-OPER-3.0 §6.4.1 nominal 610×350×580 mm. Dry tray dimensions are invented; no process/heat apparatus. Blender -b -t 1 -P build-model.py."""
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
iv=m('Warm gray steel paint',(.58,.58,.49));lit=m('Face cream trim',(.64,.64,.56));dark=m('Inactive control panel',(.024,.036,.038));char=m('Cabinet shadow',(.047,.052,.05));steel=m('Perforated stainless workstation',(.44,.47,.46),.62);rub=m('Dark feet',(.023,.024,.024));green=m('Blue-green visual detail',(.18,.34,.31));red=m('Static red control cap',(.52,.073,.047));white=m('Inactive panel lettering',(.72,.73,.62));gold=m('Dry clearance boundary',(.63,.49,.13),.53)
# Separate front pieces leave a real opening rather than a texture.
b('Cabinet_nominal_top',(0,0,342),(610,580,16),lit,4);b('Cabinet_base',(0,0,16),(610,580,17),iv,4)
for x in [-300,300]:b('Cabinet_side_'+str(x),(x,0,179),(10,580,324),iv,3)
b('Rear_inactive_plane',(0,286,177),(593,8,322),iv,3)
b('Upper_face_skin',(27,-286,251),(542,8,177),iv,3)
b('Left_face_below',(-131,-286,96),(236,8,138),iv,3);b('Right_face_below',(255,-286,96),(100,8,138),iv,3)
b('Face_lower_apron',(107,-286,49),(247,8,48),iv,3)
b('Static_control_column',(-245,-286,180),(110,8,321),dark,6)
b('Inactive_power_window',(-245,-290,267),(83,1.5,24),char,2);b('Controller_nameplate',(-245,-290,238),(89,1.5,12),white,1)
cyl('Decorative_red_button',(-246,-287,185),31,6,red)
for x in [-264,-226]:
 for z in [145,114]:b('Inactive_key_'+str(x)+str(z),(x,-289, z),(14,2,12),white,1)
cyl('Inactive_key_socket',(-245,-289,99),16,3,steel)
for x in [-254,254]:
 for y in [-245,245]:cyl('Foot_'+str(x)+str(y),(x,y,4),35,8,rub,'Z')
b('Opaque_chamber_void',(96,-110,132),(260,270,132),char,3)
b('Dark_opening_back',(96,-277,124),(216,4,97),char,2)
slide=bpy.data.objects.new('Dry_drawer_slide',None);s.collection.objects.link(slide);slide.location=p((96,-251,98))
def with_slide(o,xyz):o.parent=slide;o.location=p(xyz)
with_slide(b('Dry_drawer_face',(0,0,0),(253,14,90),lit,4),(0,-29,18))
with_slide(b('Dry_drawer_handle',(0,0,0),(204,19,12),steel,3),(0,-46,20))
for x in [-93,93]:with_slide(b('Handle_foot_'+str(x),(0,0,0),(13,16,37),steel,2),(x,-37,32))
with_slide(b('Inert_carrier_table',(0,0,0),(218,259,8),steel,3),(0,108,0))
for x in [-103,103]:with_slide(b('Dry_boundary_'+str(x),(0,0,0),(4,217,3),gold,1),(x,108,5))
for x in [-107,107]:with_slide(b('Dry_slide_marker_'+str(x),(0,0,0),(6,214,3),dark,1),(x,110,1))
# Top exhaust is a simple exterior silhouette. No internal structures or service routing.
cyl('Exterior_duct_outline',(130,218,423),77,146,steel,'Z')
for k in range(11):cyl('Duct_band_'+str(k),(130,218,361+k*12),80,3,steel,'Z')
b('Workbench_plate',(170,11,-18),(1090,705,36),steel,4)
for x in [-338,678]:
 for y in [-310,340]:b('Workbench_leg_'+str(x)+str(y),(x,y,-224),(37,38,412),steel,3)
b('View_only_console_foot',(527,-28,12),(240,185,24),char,4);b('Console_stalk',(527,-22,86),(32,45,140),dark,4);b('Console_monitor_housing',(527,-23,216),(312,51,199),dark,8);b('Inert_console_screen',(527,-52,219),(279,7,164),green,3)
b('Keyboard_silhouette',(498,-241,28),(276,153,16),dark,4)
text('Model_mark','RTP-600xp',130,-290,304,24,char)
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'rtp600xp.glb'),export_format='GLB',export_apply=True)
