"""Nikon SMZ25 motorized catalog set, documentary exterior; no optics or operating mechanism. Scale from Nikon 2CJ-MJHH-7 printed p.14. Blender -b -t 1 -P build-model.py."""
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
iv=m('Nikon warm white sides and base',(.72,.71,.64),.24);dk=m('Graphite motorized silhouette',(.036,.047,.056),.29);rub=m('Dark rubber eyecup and pads',(.025,.034,.042));steel=m('Brushed silver decorative rings',(.49,.53,.54),.65);sealed=m('Opaque optical blank',(.031,.038,.058),.18);plate=m('Opaque gray stage insert',(.41,.49,.45),.42);gold=m('Passive objective trim',(.72,.50,.21),.31);white=m('Light lettering',(.78,.80,.75));teal=m('Separate chart pedestal',(.15,.37,.37));board=m('Independent chart plate',(.096,.18,.22));amber=m('Offline zoom tile',(.75,.51,.18))
b('SMZ_base_nominal',(0,-7,47),(298,444,68),iv,25)
for x in [-108,108]:
 for y in [-173,159]:cyl('SMZ_fixed_foot',(x,y,7),39,14,rub,'Z')
cyl('SMZ_inactive_stage_outer_disc',(0,-120,80),193,9,plate,'Z')
cyl('SMZ_inactive_stage_inner_ring',(0,-120,85.2),107,3,steel,'Z')
cyl('SMZ_stage_opaque_center',(0,-120,86.65),78,1.4,sealed,'Z')
b('SMZ_black_back_arch',(0,135,318),(177,160,500),dk,56)
b('SMZ_back_spine_insert',(0,189,279),(91,28,291),rub,8)
for x in [-42,42]:b('SMZ_back_decorative_channel',(x,130,322),(11,111,228),steel,6)
b('SMZ_outboard_white_collar',(0,63,245),(207,153,217),iv,35)
b('SMZ_motorized_white_shoulder',(0,-1,290),(218,172,124),iv,31)
b('SMZ_overhanging_arm',(0,-60,298),(216,230,101),iv,26)
for x in [-107,107]:
 cyl('SMZ_frozen_side_dial',(x,-10,240),66,25,rub,'X')
b('SMZ_dark_zoom_body',(0,-113,302),(175,185,233),dk,24)
cyl('SMZ_dark_upper_head_rim',(0,-107,398),198,48,dk,'Z')
cyl('SMZ_fixed_lower_barrel',(0,-118,176),111,77,dk,'Z')
cyl('SMZ_lower_decorative_trim',(0,-118,149),102,5,gold,'Z')
cyl('SMZ_opaque_barrel_cap',(0,-118,136),85,6,sealed,'Z')
b('SMZ_upper_tube_casting',(0,-143,467),(170,183,138),iv,25)
b('SMZ_upper_graphite_band',(0,-163,510),(165,150,53),dk,22)
for x in [-45,45]:
 b('SMZ_ocular_support', (x,-220,472),(65,107,85),dk,19)
 o=cyl('SMZ_ocular_outer_housing',(x,-263,474),48,64,rub);o.rotation_euler.x=math.radians(79)
 # Disconnected exterior projection beyond the nominal main depth, as separately indicated in the drawing.
 o=cyl('Projection_ocular_rubber',(x,-307.5,483),44,25,rub);o.rotation_euler.x=math.radians(79)
 o=cyl('Projection_ocular_opaque_center',(x,-318.5,486),29,3,sealed);o.rotation_euler.x=math.radians(79)
b('SMZ_fixed_top_covered_mount',(0,-59,523),(75,71,28),dk,6)
text('SMZ_model_nikon','Nikon',0,-207.5,351,15,white)
text('SMZ_model_mark','SMZ25',0,-207.5,332,13,white)
# Separate diagram stand, no part of the microscope, sole pickable mark is the gold ruler tile.
b('Offline_chart_stand',(307,-44,37),(185,195,74),teal,9)
b('Offline_chart_mount',(307,-44,76),(170,171,12),board,5)
for x in [-48,-24,0,24,48]:
 b('Offline_chart_tick',(307+x,-36,83),(2,67,2),plate,.2)
b('Offline_zoom_tile',(343,-93,85),(63,26,7),amber,3)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'smz25.glb'),export_format='GLB',export_apply=True)
