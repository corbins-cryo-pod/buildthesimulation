"""F&S 5600i base with 5630i thin-wire wedge-wedge head. Simplified editable model in mm; output glTF metres. Blender 4.x: blender -b -P build-model.py."""
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
iv=material('Painted instrument ivory',(.66,.67,.63),.17);black=material('Graphite polymer',(.033,.042,.049));steel=material('Machined aluminium',(.58,.64,.66),.75);red=material('5630i scarlet',(.58,.035,.032),.26);dark=material('Rear wiring chases',(.065,.077,.091));blue=material('Operator screen',(.018,.058,.082));gold=material('Bond fixture',(.47,.37,.15),.5);wh=material('Lettering',(.77,.84,.80));pc=material('Coupon carrier',(.065,.19,.13))
root=empty('BONDTEC_5630i');machine=empty('MACHINE_DATUM',parent=root)
box('base_shell',(0,0,71),(700,650,127),iv,machine,13);box('base_top',(0,-12,143),(655,588,24),steel,machine,6)
for x in [-291,291]:
 for y in [-263,264]:cyl('foot',(x,y,5),26,10,black,machine,'z',20)
 label('front_id','F&S BONDTEC',x*.65,-326,90,22,black,'front',machine)
box('front_rocker',(210,-326,64),(24,4,28),black,machine,2)
for x in [-273,270]:
 box('upright',(x,151,390),(75,137,477),iv,machine,16);box('roof_upright',(x,153,566),(85,140,162),steel,machine,11)
box('upper_gantry',(0,156,576),(574,131,149),iv,machine,17)
box('motor_crown',(110,101,662),(219,213,76),iv,machine,14);box('rail_front',(0,79,528),(574,15,111),steel,machine,3)
for j in range(9):box('rear_vent',(55+j*22,267,404),(11,3,106),dark,machine,1)
box('rear_chase',(145,254,401),(281,42,237),dark,machine,4);box('USB_LAN',(65,277,345),(31,5,17),black,machine,1);box('IEC_power',(235,277,345),(33,5,30),black,machine,1);cyl('vacuum_inlet',(166,280,345),6.5,10,steel,machine,'y',18)
sample=empty('ASSEMBLY_SEAT',(0,-84,223),machine)
box('stage_bottom',(0,-84,170),(241,260,31),black,machine,7);box('XY_stage',(0,-84,199),(185,188,34),steel,machine,3);box('vacuum_chuck',(0,-84,217),(100,100,12),black,machine,2)
for x in [-54,54]:box('jaw',(x,-84,224),(10,102,18),steel,machine,2)
box('inert_substrate',(0,0,-.4),(21,15,.8),pc,sample,.09)
for x in [-9.3,9.3]:box('substrate_clip',(x,0,.12),(1.9,15,.23),gold,sample,.06)
head=empty('BOND_TOOL',(0,-84,223),machine)
box('head_backplate',(0,89,259),(119,88,92),steel,head,5);box('head_cap',(0,44,210),(165,121,77),red,head,18)
label('head_label','5630i',0,-18,224,17,wh,'front',head)
box('transducer_block',(0,30,101),(52,58,95),steel,head,4)
cyl('transducer_end',(0,2,71),17,35,black,head,'z',26)
box('wedge_25_4',(0,0,12.7),(2.4,2,25.4),steel,head,.3)
cyl('wire_spool_hub',(105,51,240),25.4,22,black,head,'x',40)
for x in [92,118]:cyl('wire_flange',(x,51,240),25.4,3.5,steel,head,'x',40)
rod('illustrative_wire_guide',(103,51,218),(6,16,92),1.0,gold,head)
box('camera_mount',(-106,-1,242),(51,50,76),black,head,3);cyl('camera_objective',(-106,-1,192),20,35,steel,head,'z',24)
# Adjacent 22 inch 16:9 display. Claimed chassis limits exclude external console.
monitor=empty('CONSOLE',(624,75,0),root);box('monitor_base',(0,0,11),(277,210,22),black,monitor,8);box('monitor_mount',(0,24,160),(41,34,278),black,monitor,4)
box('monitor_enclosure',(0,19,395),(511,29,304),black,monitor,8);box('RUN_DISPLAY',(0,2,395),(487.2,4,274.1),blue,monitor,3);label('ui_caption','BOND PROGRAM   /   RUN',0,-.65,389,23,wh,'front',monitor)
box('keyboard_console',(0,-137,21),(405,136,21),iv,monitor,5)
for i in range(14):
 for j in range(4):box('key',(-176+i*24,-173+j*23,32),(18,17,3),black,monitor,.8)
bpy.ops.export_scene.gltf(filepath=OUT+'/bondtec-5630i.glb',export_format='GLB',export_animations=False,export_yup=True)
