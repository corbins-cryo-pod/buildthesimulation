"""Nordson EFD Ultimus V 7012590 plus illustrative Optimum-style 10 mL barrel and footswitch. Original Blender source, millimetres. GLB units metres."""
import bpy, math, os, sys
from mathutils import Vector
from math import pi
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,rgb,metal=.0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.35
 return m
def empty(n,xyz=(0,0,0),parent=None):
 o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=[q/1000 for q in xyz];return o
def finish(o,n,xyz,mat,par):
 o.name=n;o.parent=par;o.location=[q/1000 for q in xyz];o.data.materials.append(mat);return o
def box(n,xyz,size,mat,par=None,bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object
 for v in o.data.vertices:
  for i in range(3):v.co[i]*=size[i]/1000
 if bev:
  mod=o.modifiers.new('Manufacturing edge radius','BEVEL');mod.width=bev/1000;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,n,xyz,mat,par)
def cyl(n,xyz,rad,length,mat,par=None,axis='y',segments=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=rad/1000,depth=length/1000)
 o=finish(bpy.context.object,n,xyz,mat,par);o.rotation_euler=({'x':(0,pi/2,0),'y':(pi/2,0,0),'z':(0,0,0)})[axis];return o
def rod(n,a,b,r,m,par=None):
 a,b=Vector(a),Vector(b);v=b-a;mid=(a+b)/2
 o=cyl(n,mid,r,v.length,m,par,'z',12);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def cable(n,coords,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r/1000;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for pt,xyz in zip(s.bezier_points,coords):
  pt.co=[v/1000 for v in xyz];pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def label(n,txt,x,y,z,size,mat,side='front',par=None):
 c=bpy.data.curves.new(n,'FONT');c.body=txt;c.align_x='CENTER';c.align_y='CENTER';c.size=size/1000;c.resolution_u=1
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.location=(x/1000,y/1000,z/1000);o.rotation_euler=(pi/2,0,0) if side=='front' else ((pi/2,0,pi) if side=='back' else (0,0,0))
 o.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
iv=material('Warm grey powder coating',(.61,.65,.65),.25);off=material('Panel face',(.82,.86,.84));gray=material('Rear aluminum panel',(.48,.54,.54),.45);black=material('Graphite elastomer',(.028,.041,.047));steel=material('Turned steel',(.54,.60,.62),.8);blue=material('Keypad blue',(.055,.318,.57),.16);navy=material('Blue edge trim',(.02,.102,.18),.2);green=material('Cycle green',(.10,.48,.19));lcd=material('LCD periwinkle',(.085,.145,.35));gold=material('Masked contact',(.61,.42,.16),.7);wh=material('Screen legend',(.78,.83,.83));pc=material('Carrier emerald',(.084,.22,.18),.2)
root=empty('ULTIMUS_V_BENCH');ctrl=empty('ULTIMUS_V_7012590',(0,0,0),root)
box('CABINET',(0,0,55.5),(225,199,95),iv,ctrl,4)
box('face_trim',(0,-98.5,55.5),(224,3,94),navy,ctrl,4);box('face_overlay',(0,-100.1,55.5),(214,1.4,83),off,ctrl,1)
for x in (-86,86):
 for y in (-73,73):box('rubber_foot',(x,y,4),(28,24,8),black,ctrl,4)
label('Fascia','Nordson EFD   Ultimus V',-27,-101.0,90,6.5,navy,'front',ctrl)
box('LCD',(-42,-101,60),(64,1.4,35),lcd,ctrl,2)
for i,k in enumerate(['F1','F2','F3']):
 x=-64+i*22;box(k,(x,-101.6,33),(17,1.5,12),blue,ctrl,1);label(k+'_legend',k,x,-102.5,33,4,wh,'front',ctrl)
box('POWER',(-93,-102,31),(11,5,17),black,ctrl,1.1);box('front_DB9',(-92,-101.5,60),(15,2.5,8),steel,ctrl,.5);cyl('front_air_out',(12,-104,53),5.3,7,steel,ctrl,'y',24);cyl('air_bore',(12,-108,53),2.8,.8,black,ctrl,'y',20)
box('CYCLE',(12,-101.7,78),(15,2,13),green,ctrl,1);label('cycle_mark','▶',12,-103,78,5,wh,'front',ctrl)
for i,k in enumerate(['7','8','9','4','5','6','1','2','3','0','.','↵']):
 x,z=37+(i%3)*17,78-(i//3)*15.2;box('digit_'+str(i),(x,-101.5,z),(12,1.6,11),blue,ctrl,1);label('digit_'+str(i)+'_legend',k,x,-102.6,z,5.2,wh,'front',ctrl)
for z,k in [(74,'↑'),(42,'↓')]:box('adjust',(95,-101.5,z),(14,2,14),green,ctrl,2);label('adjust_legend',k,95,-103,z,7,wh,'front',ctrl)
box('rear_IO_panel',(0,99,55.5),(215,2,85),gray,ctrl,2)
for x,k in [(-57,'AIR IN'),(-32,'EXHAUST'),(-1,'PEDAL')]:
 cyl(k,(x,102,65),6.5,5,black,ctrl,'y',24);label(k+'_mark',k,x,101,77,4,black,'back',ctrl)
for x,w,k in [(25,18,'RS-232'),(66,26,'I/O'),(66,33,'AC')]:
 z=74 if k!='AC' else 37;box(k,(x,101.7,z),(w,5,12 if k!='AC' else 24),black,ctrl,2);label(k+'_mark',k,x,101.0,z+13,4,black,'back',ctrl)
stand=empty('STAND',(201,-13,0),root);box('fixture_base',(0,0,6),(112,139,12),steel,stand,5);cyl('mast',(37,36,95),5.5,190,steel,stand,'z',22)
box('mast_arm',(17,26,101),(53,64,14),iv,stand,4);box('holder_clamp',(0,0,96),(25,22,14),black,stand,4)
clr=material('Translucent barrel',(.69,.77,.76));clr.surface_render_method='DITHERED';clr.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.48
bar=empty('SYRINGE',(0,0,-10),stand);cyl('barrel_shell',(0,0,92),9,69,clr,bar,'z',32);cyl('barrel_contents',(0,0,85),7.5,47,navy,bar,'z',26);cyl('piston',(0,0,110),8,5,wh,bar,'z',24)
box('barrel_flanges',(0,0,126),(29,19,3),clr,bar,1);cyl('pneumatic_adapter',(0,0,134),9.9,15,blue,bar,'z',28);cyl('luer_hub',(0,0,54),4.3,11,green,bar,'z',24);cyl('dispense_tip',(0,0,38),.53,22,steel,bar,'z',18)
bo=empty('PLATE',(0,0,16),stand);box('coupon_support',(0,0,-2),(48,43,4),black,bo,2);box('canonical_rectangular_coupon',(0,0,-.35),(12,8,.70),pc,bo,.07)
ped=empty('PEDAL',(0,-186,0),root);box('pedal_base',(0,0,4),(75,93,8),black,ped,5);k=box('pedal_rocker',(0,0,12),(67,79,9),gray,ped,6);k.rotation_euler.x=pi/24;label('pedal_text','TRIGGER',0,-5,16.7,7,navy,'top',ped)
cable('pedal_cable',[(0,-146,11),(18,-119,14),(125,-129,11),(142,45,8),(120,116,11),(-1,110,65)],2,black)
cable('barrel_air_line',[(12,-111,53),(50,-132,65),(142,-78,120),(170,-18,186),(201,-13,131)],2.4,blue)
bpy.ops.export_scene.gltf(filepath=OUT+'/ultimus-v.glb',export_format='GLB',export_yup=True,export_animations=False)
