"""Sutter P-1000 visual reference only (Sutter Rev. 3.07 cover, nominal dimensions). Fictional dry rod gauges replace all functional fabrication parts. Blender -b -t 1 -P build-model.py. Metres +Y up +Z toward operator."""
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
iv=m('Warm light steel fascia',(.70,.70,.60));dark=m('Black cabinet',(.042,.051,.051));rub=m('Feet and handles',(.026,.031,.031));metal=m('Polished inactive parts',(.49,.54,.53),.62);blue=m('Screen dark slate',(.073,.18,.19));green=m('Decorative left button',(.15,.40,.26));bluegray=m('Decorative right button',(.33,.43,.42));badge=m('Model dark print',(.09,.12,.12));gray=m('Gauge dry saddle',(.18,.26,.28),.35);off=m('Dark lid glazing',(.23,.27,.24));off.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.33
b('Cabinet_floor',(0,0,17),(530,360,17),dark,4)
for x in [-216,216]:
 for y in [-140,140]:cyl('Foot_'+str(x)+str(y),(x,y,4),39,8,rub,'Z')
for x in [-260,260]:b('Side_panel_'+str(x),(x,3,88),(10,354,148),dark,4)
b('Cabinet_rear',(0,175,149),(516,10,264),dark,4);b('Deck_plate',(0,4,136),(514,318,13),iv,5);b('Front_fascia',(0,-154,86),(530,28,139),iv,5).rotation_euler.x=-.12
for k in range(7):
 for j in range(2):b('Right_vent_'+str((k,j)),(265,105+k*8,57+j*22),(1,3,12),rub,.5)
b('Analog_static_panel',(0,-174,83),(142,9,95),dark,3);b('Inactive_touch_screen',(0,-179,83),(125,3,82),blue,2)
for i in range(4):
 for j in range(5):b('Decorative_screen_tile_'+str(i)+str(j),(-43+j*12,-180.5,64+i*12),(8,1,8),bluegray,1)
cyl('Static_dial',(134,-178,92),41,29,metal)
for xx,n,ma in [(141,'Static_indicator_left',green),(224,'Static_indicator_right',bluegray)]:cyl(n,(xx,-174,53),20,10,ma)
text('Model_mark','MODEL P-1000',-170,-174,110,18,badge);text('Maker_mark','SUTTER',-190,-175,42,15,badge)
for x in [-169,169]:
 b('Visual_rail_support_'+str(x),(x,23,149),(152,99,14),metal,3)
 for xx in [x-45,x+45]:
  cyl('Static_hardware_'+str(xx),(xx,37,160),19,12,dark,'Z')
 for j in range(3):cyl('Inset_screw_'+str(x)+str(j),(x-50+j*33,-21,155),12,9,metal,'Z')
# Dry callout fixture, unrelated to any real capillary size or mechanism.
for x,n in [(-48,'left'),(48,'right')]:
 b('Dry_saddle_'+n,(x,-44,155),(14,32,15),gray,2)
 b('Dry_band_'+n,(x,-43,165),(14,30,3),metal,.9)
 b('Dry_mount_'+n,(x,-44,146),(23,39,8),dark,2)
b('Inactive_center_blanking_piece',(0,29,164),(28,54,43),dark,3)
pivot=bpy.data.objects.new('Visual_cover_hinge',None);s.collection.objects.link(pivot);pivot.location=p((0,162,277))
def leaf(n,pos,dim,ma):
 o=b(n,(0,0,0),dim,ma,3);o.parent=pivot;o.location=p(pos)
leaf('Cover_smoked_main',(0,-147,0),(510,283,12),off)
leaf('Cover_rear_rail',(0,-6,0),(518,20,21),dark)
leaf('Cover_front_rail',(0,-291,0),(518,19,22),dark)
leaf('Cover_front_glazing',(0,-290,-58),(510,5,102),off)
for x in [-254,254]:b('Side_guard_'+str(x),(x,13,218),(10,293,110),dark,2)
for x in [-253,253]:leaf('Cover_side_'+str(x),(x,-147,0),(15,289,21),dark)
leaf('Cover_handle',(0,-304,10),(137,21,20),rub)
for x in [-145,145]:cyl('Hinge_reference_'+str(x),(x,165,277),25,36,metal,'X')
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'p1000.glb'),export_format='GLB',export_apply=True)
