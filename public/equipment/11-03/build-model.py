"""Doric OTPG_4 inactive exterior, only catalog dimensional envelope and exterior shadows. Separate fictional coordinate board. Blender -b -t 1 -P build-model.py."""
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
black=m('Satin black face',(.028,.039,.044),.32);trim=m('Black anodized panel',(.042,.049,.051),.46);steel=m('Neutral blank connector rings',(.52,.55,.55),.65);cap=m('Sealed inert connector centers',(.018,.026,.029),.15);white=m('Muted white marking',(.76,.79,.73));rub=m('Ground contacts',(.013,.020,.022));teal=m('Detached teaching pad',(.14,.38,.39));grid=m('Detached grid charcoal',(.08,.17,.21));gold=m('Independent locator',(.80,.52,.14))
b('Doric_inactive_case',(0,1.4,10.6),(135,47.2,19.2),black,3.05)
b('Doric_opaque_top_plate',(0,1.4,20.0),(132,46,1.0),trim,.35)
b('Doric_front_fascia',(0,-22.8,10.8),(129,1.6,16.1),trim,.45)
for x in [-49,49]:
 for y in [-14,17]:cyl('Doric_ground_contact',(x,y,.8),7,1.6,rub,'Z')
for i,x in enumerate([-53.5,-27,0,26.4],1):
 cyl('Doric_fixed_collar_'+str(i),(x,-25.7,10.5),12,5.1,steel)
 cyl('Doric_inactive_ring_'+str(i),(x,-29.5,10.5),10.9,4.0,steel)
 cyl('Doric_solid_blind_cap_'+str(i),(x,-32.5,10.5),8.3,1.0,cap)
def top_text(n,v,x,y,z,size):
 o=text(n,v,x,y,z,size,white);o.rotation_euler=(0,0,0);return o
top_text('Doric_top_wordmark','doric',44,5,20.6,8.5)
top_text('Doric_model_name','OTPG_4',44,-6,20.6,4.6)
for i,x in enumerate([-53.5,-27,0,26.4],1):top_text('Doric_static_front_index',str(i),x,-17.5,20.6,3)
b('Doric_closed_front_impression',(54,-23.72,11.7),(11,.32,5),cap,1)
for x in [-40,10]:
 cyl('Doric_dormant_top_round_shape',(x,6,19.45),4.7,3.1,steel,'Z')
 cyl('Doric_blank_round_center',(x,6,20.5),3.0,.6,cap,'Z')
b('Doric_rear_plain_panel',(0,24.9,10.8),(108,.2,13),trim,.3)
# Physically separate abstract readout exercise, with no relationship to the unit.
b('Offline_coordinate_stand',(126,-1,7.5),(86,83,15),teal,5)
b('Offline_coordinate_card',(126,-1,16.4),(75,73,3.6),grid,3)
for i in range(-4,5):
 b('Offline_grid_h',(126,-1+i*6.3,18.35),(55,.7,.3),teal,.06)
 b('Offline_grid_v',(126+i*6.3,-1,18.35),(.7,55,.3),teal,.06)
cyl('Offline_locator_marker',(151.2,-19.9,19.8),8.8,3,gold,'Z')
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'otpg4.glb'),export_format='GLB',export_apply=True)
