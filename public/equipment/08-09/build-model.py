"""Balzers HLT 160, original metric reconstruction from Balzers guide BG 800 387 BE/B and drawing BG 800 430 BE/A. Overall sizes are nominal reconstruction estimates, not documented exact factory dimensions. Blender -b -t 1 -P build-model.py."""
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
iv=m('Balzers warm light shell',(.67,.70,.65));gray=m('Inset metal panels',(.27,.30,.29));rub=m('Elastomer black',(.019,.021,.024));char=m('Controller graphite',(.056,.066,.068));steel=m('Port machined steel',(.50,.55,.55),.7);green=m('Indicator green',(.18,.57,.32));red=m('Display accent',(.60,.20,.16));amber=m('Amber indicator',(.67,.52,.15));white=m('Control key ivory',(.70,.73,.69));accent=m('Historical red label',(.43,.071,.071));glass=m('Display window',(.032,.13,.12),.2);fixture=m('Synthetic inert capsule',(.18,.35,.42),.45)
b('Cabinet_shell',(0,0,253),(520,260,498),iv,24);b('Toe_guard',(0,0,13),(511,255,26),rub,10);b('Right_side_access_panel',(261,4,238),(5,217,392),gray,6);b('Top_rear_ledge',(0,89,495),(497,76,22),iv,6)
for x in [-216,216]:
 for y in [-92,92]:cyl('Rubber_foot_'+str((x,y)),(x,y,5),52,10,rub,'Z')
b('Top_port_recess',(-118,-28,507),(147,115,14),char,6);cyl('Top_test_port_flange',(-117,-28,521),79,22,steel,'Z');cyl('Test_port_target',(-117,-28,534),61,8,char,'Z');cyl('Port_inner_shadow',(-117,-28,538),39,1,rub,'Z')
for k in range(8):
 t=2*math.pi*k/8;cyl('Port_pin_'+str(k),(-117+34*math.cos(t),-28+34*math.sin(t),533),4,3,char,'Z')
b('Port_clamp_bar',(-113,-77,518),(152,17,16),steel,4)
# Left ribbed housing and remote-like cylindrical front controls follow illustrated silhouettes.
cyl('Side_ribbed_housing',(-264,-22,359),85,267,char,'Z')
for k in range(21):cyl('Side_rib_'+str(k),(-264,-22,239+k*12),92,4,rub,'Z')
cyl('Side_upper_cap',(-264,-22,499),79,16,steel,'Z')
b('Front_controller_mount',(159,-129,358),(96,24,265),char,12);cyl('Controller_body',(158,-143,362),81,251,char,'Z');cyl('Controller_cap',(158,-143,490),84,28,rub,'Z')
b('Vertical_indicator_face',(158,-181,354),(60,8,181),gray,6);b('Vertical_readout',(140,-186,353),(18,4,154),glass,2);b('Readout_green_column',(140,-189,340),(6,2,113),green,1)
for i,n in enumerate(['Stop','Sample','Diagnostics','Cal','Replay']):b('Key_'+n,(177,-186,291+i*28),(18,6,20),white,2)
for x,n,ma in [(138,'Lamp_ready',green),(157,'Lamp_state',amber),(175,'Lamp_limit',red)]:cyl(n,(x,-188,436),6,5,ma)
for k in range(5):b('Lower_side_vent_'+str(k),(264,-27+18*k,97),(2.5,13,32),rub,.7)
b('Side_recessed_handle',(264,8,66),(5,114,33),rub,5);b('Side_upper_power_cutout',(264,51,388),(4,19,30),char,2)
for k in range(3):b('Rear_outline_'+str(k),(125-33*k,132,141),(24,6,15),char,3)
text('Maker_badge','BALZERS  HLT 160',21,-131,386,15,accent)
h=bpy.data.objects.new('Virtual_fixture_mount',None);s.collection.objects.link(h);h.location=p((-117,-28,539))
for n,z,d,ht,ma in [('Fixture_foot',4,50,8,steel),('Fixture_body',29,39,42,fixture),('Fixture_cap',53,41,10,steel)]:
 o=cyl(n,(-117,-28,539+z),d,ht,ma,'Z');o.parent=h;o.location=p((0,0,z))
# Parked protective coil: static visual cue, not a connection schematic.
curvepts=[(-259,-28,488),(-276,-57,504),(-277,-92,473),(-244,-115,440),(-209,-100,474),(-202,-88,499)]
tube('Parked_hose',curvepts,9,char)
for ob in list(s.objects):
 if ob.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'hlt160.glb'),export_format='GLB',export_apply=True)
