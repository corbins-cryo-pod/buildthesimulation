"""Hamamatsu ORCA-Flash4.0 V3 C13440-20CU camera, documentary inactive exterior. Spec and drawings ver.1.9, physical dimensions except parts marked inferred. Blender -b -t 1 -P build-model.py."""
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
dk=m('Dark cast graphite camera',(.052,.067,.074),.40);black=m('Dark grooves/caps',(.018,.028,.034),.32);slate=m('Anodized face casting',(.084,.101,.111),.44);alu=m('Brushed dormant mount and external caps',(.59,.63,.63),.70);sealed=m('Opaque lens blank',(.012,.020,.024),.17);gray=m('Muted gray markings',(.52,.58,.57));red=m('Muted logo accent',(.59,.071,.079));teal=m('Separate graphic stand',(.14,.37,.40));board=m('Fixed illustration surface',(.10,.19,.23));gold=m('Offline selection tile',(.79,.54,.19));light=m('Offline checker ink',(.37,.58,.54))
b('ORCA_body_exterior',(0,3.5,50.75),(85,113,85.5),dk,5.2)
b('ORCA_front_radiused_profile',(0,-53.2,50.75),(84,9.6,84),slate,4)
b('ORCA_bottom_mount_base',(0,4,4),(73,91,8),dk,2)
cyl('ORCA_C_mount_outer_flange',(0,-59.2,51),72.5,7.6,alu)
cyl('ORCA_mount_inner_bezel',(0,-63,51),36.5,2.7,alu)
cyl('ORCA_opaque_mount_blank',(0,-64.45,51),25.5,1.1,sealed)
for xx,zz in [(0,82.8),(-32,51),(32,51),(0,19.1)]:
 cyl('ORCA_mount_fastener',(xx,-63.1,zz),6.5,1.5,alu)
 cyl('ORCA_mount_fastener_blank',(xx,-64.0,zz),2.8,.8,black)
for x in [-37.5,37.5]:
 for z in [13,87.8]:
  cyl('ORCA_small_corner_relief',(x,-57.6,z),6.5,1.1,black)
# Named cooling-rib silhouettes. No functional sensor, optics, cooling or electrical interface.
for x in [-41.8,41.8]:
 for i in range(11):b('ORCA_lateral_raised_rib',(x,2,22+i*5.25),(1.4,91,2.3),black,.3)
for i in range(13):b('ORCA_roof_rib',(-34+i*5.5,2,92.1),(1.9,88,2.2),black,.3)
b('ORCA_rear_outline',(0,59.3,50.7),(80,1.4,77),slate,3)
b('ORCA_rear_vent_cover',(-3,60.08,54),(42,.4,40),black,2)
for i in range(9):b('ORCA_rear_relief_bar',(-21+i*4.3,60.36,54),(1.5,.25,35),alu,.15)
for z in [31,40,49,58,67]:cyl('ORCA_rear_blind_detail',(25,60.11,z),4.4,1,black)
# Projections called out separately from the published 85 mm nominal body width.
for z in [35.5,64.5]:
 cyl('Projection_side_fixed_sleeve',(-47.6,-22,z),9.6,9.5,alu,'X')
 cyl('Projection_side_closed_end',(-54.2,-23,z),11.4,3.6,alu,'X')
b('ORCA_side_brand_plate',(-42.1,7,84),(1,95,11),slate,2)
def side_text(n,value,y,z,size,ma):
 o=text(n,value,-42.65,y,z,size,ma);o.rotation_euler=(math.pi/2,0,-math.pi/2)
side_text('ORCA_model_mark','ORCA-Flash4.0 V3',1,84.1,7.9,gray)
side_text('ORCA_brand','HAMAMATSU',3,14.5,6.4,red)
# Independent still image graphic and pickable ruler legend, not a camera attachment.
b('Offline_graphic_base',(132,-31,14),(82,89,28),teal,5)
b('Offline_graphic_surface',(132,-31,29),(74,77,5),board,3)
for x in [-21,-7,7,21]:
 for y in [-18,-6,6,18]:
  if (x//14+y//12)%2==0:b('Offline_graphic_checker',(132+x,-31+y,31.8),(7,7,.7),light,.35)
b('Offline_scale_legend',(148,-58,32.7),(21,9,4),gold,1.5)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'orca-v3.glb'),export_format='GLB',export_apply=True)
