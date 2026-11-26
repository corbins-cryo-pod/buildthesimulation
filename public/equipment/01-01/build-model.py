"""BTS original Desk / Mask Console Mk I. Not a vendor product. Blender 4.x source in mm; glTF metres. Blender -b -P build-model.py."""
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
iv=material('Warm ivory desk and terminal',(.69,.64,.53),.21);iv2=material('Ivory enamel inset',(.61,.56,.45));dark=material('Graphite powdercoat',(.053,.062,.057),.28);steel=material('Brushed stainless legs',(.46,.47,.46),.77);gold=material('Brass identification',(.59,.37,.13),.64);crt=material('Inactive emerald phosphor',(.024,.079,.059));win=material('Green status lamp',(.12,.46,.28));red=material('Red check lamp',(.52,.10,.049));ink=material('Screen / lettering',(.78,.80,.67))
root=empty('BTS_MASK_CONSOLE_MK1')
for x in [-647,647]:
 for y in [-288,288]:
  box('leg',(x,y,350),(59,57,690),steel,root,6);box('rubber_foot',(x,y,5),(75,65,10),dark,root,6)
 box('short_brace',(x,0,456),(42,559,50),dark,root,4)
box('rear_crossbrace',(0,255,535),(1295,55,68),steel,root,5)
box('DESK_DATUM',(0,0,720),(1440,730,40),iv,root,8);box('desk_apron',(0,339,683),(1414,33,41),dark,root,3)
for x in [-510,510]:box('under_desk_rail',(x,63,691),(39,538,25),steel,root,3)
desk=empty('TECH_WORKSURFACE',(0,0,740),root)
arm=empty('MONITOR_ARM',(-150,166,0),desk);box('post_foot',(0,0,8),(188,172,16),dark,arm,9);cyl('post',(0,14,154),17,285,steel,arm,'z',28);cyl('arm_joint',(0,0,271),26,61,dark,arm,'x',26);rod('arm_link',(0,0,270),(0,-181,221),18,steel,arm);cyl('terminal_vibration_pad',(0,-178,153),44,26,dark,arm,'z',28)
monitor=empty('MONITOR',(-150,63,0),desk);box('terminal_shell',(0,0,211),(454,407,321),iv,monitor,28);box('shadow_border',(0,-194,209),(403,22,269),dark,monitor,13)
box('CRT_GLASS',(0,-207,210),(350,5,219),crt,monitor,8);box('bezel_legend_plaque',(0,-206,71),(374,4,19),gold,monitor,3);label('crt_id','BTS   /   MASK LAYOUT CONSOLE',0,-209,70,9,dark,'front',monitor)
for j in range(12):box('crt_vent',(113+j*6,202,245),(3,1.1,52),dark,monitor,1)
box('signal_socket',(0,205,115),(26,4,18),steel,monitor,1)
tower=empty('WORKSTATION_CHASSIS',(467,108,0),desk)
box('retro_case',(0,0,205),(237,415,410),iv,tower,16);box('mount_gray',(0,-203,200),(201,7,362),dark,tower,9)
label('tower_badge','BTS   WORKSTATION',0,-209,330,10,ink,'front',tower)
for j in range(2):box('panel_slot',(0,-209,247-j*32),(150,3,12),steel,tower,2)
for i in range(8):box('tower_grille',(0,-209,133-i*8),(150,3,3),gold,tower,.9)
cyl('power_lamp',(67,-210,48),6,4,win,tower,'y',22)
box('rear_vent',(0,207,270),(156,3,126),dark,tower,5)
for x,k,w in [(-59,'POWER',28),(-16,'VIDEO',23),(31,'USB',16),(65,'LAN',19)]:box(k,(x,210,91),(w,7,14),dark,tower,2);label(k+'_legend',k,x,214,103,6,dark,'back',tower)
keys=empty('KEYBOARD',(-147,-212,0),desk);box('keyboard_case',(0,0,17),(431,159,34),iv2,keys,8)
for i in range(14):
 for j in range(4):box('key',(-186+i*28,-53+j*28,35),(20,19,8),iv if j!=3 else dark,keys,1.8)
box('space_bar',(0,57,35),(137,14,8),iv,keys,1.8)
pad=empty('INSPECTION_KEYS',(245,-252,0),desk);box('control_pad',(0,0,13),(170,114,26),iv2,pad,7)
for x,n,caption,mt in [(-50,'LAYER_PADS','PADS',gold),(0,'LAYER_TRACES','ROUTE',dark),(50,'RUN_CHECK','CHECK',red)]:
 box(n,(x,0,29),(39,38,8),mt,pad,4);label(n+'_legend',caption,x,1,33.2,6,ink,'top',pad)
cable('display_cable',[(-150,268,854),(-164,315,817),(27,316,785),(280,329,779),(455,325,831)],3, dark)
bpy.ops.export_scene.gltf(filepath=OUT+'/mask-console.glb',export_format='GLB',export_animations=False,export_yup=True)
