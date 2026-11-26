"""SCS PDS 2010 Labcoter 2 exterior and display-only dry visual cutaway. Formal scale mm, glTF metres. Blender 4.x, original source; opaque control props do not operate."""
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
iv=material('Warm white cabinet panels',(.65,.68,.64),.2);steel=material('Satin stainless',(.52,.57,.58),.77);dark=material('Dark upper instrument tray',(.046,.056,.066),.36);black=material('Black chamber silhouette',(.025,.031,.042),.57);silver=material('Etched chamber collar',(.48,.51,.52),.85);bezel=material('Inactive keypad and display',(.11,.14,.15));blue=material('Passive viewport',(.048,.117,.143),.5);red=material('Identity plate red',(.58,.051,.035));gold=material('Contact marker brass',(.61,.44,.16),.65);couponMat=material('Inert witness silicon-like visual',(.064,.335,.335),.39);ink=material('Unpowered panel text',(.72,.78,.71));root=empty('SCS_PDS2010_LABCOTER2')
box('CABINET_FOOTPRINT',(0,0,437),(495,604,825),iv,root,9)
for x in [-187,187]:
 for y in [-239,239]:cyl('trolley_foot',(x,y,14),29,28,black,root,'z',24)
box('bottom_apron',(0,-297,75),(477,7,55),steel,root,4);box('front_door_plate',(0,-297,353),(461,8,522),iv,root,7)
box('front_trim',(0,-302,650),(472,2,12),steel,root,2);box('logo_plate',(170,-303,679),(88,3,18),red,root,3);label('SCS_badge','SCS',170,-305,679,12,ink,'front',root)
label('model_plate','PDS 2010    /    LABCOTER 2',-75,-301.5,720,14,dark,'front',root)
box('cabinet_handle',(0,-306,511),(158,11,19),steel,root,4)
box('control_panel',(0,-276,787),(466,23,95),dark,root,4);box('INACTIVE_SCREEN',(-95,-290,787),(145,5,46),blue,root,2)
for k in range(4):
 for j in range(2):box('inactive_key',(41+k*30,-289,779+j*19),(20,6,10),bezel,root,1)
label('DISPLAY_NOTE','REFERENCE  ONLY',-95,-294,783,10,ink,'front',root)
box('workdeck',(0,0,860),(495,604,32),steel,root,6)
box('rear_cover',(0,299,545),(470,4,580),iv,root,4)
for j in range(10):box('rear_service_louver',(0,302,689-j*10),(262,2,3),dark,root,.7)
box('rear_blank_panel',(0,302,358),(248,3,93),steel,root,2)
ch=empty('CHAMBER',(0,-18,978.2),root)
cyl('chamber_plinth',(0,0,-52),175,104,steel,ch,'z',56);cyl('dry_inert_platform',(0,0,5),139,9,silver,ch,'z',64)
cyl('foot_ring',(0,0,7),158,14,steel,ch,'z',64)
hood=empty('CHAMBER_PANE',(0,0,0),ch)
cyl('NOMINAL_CHAMBER',(0,0,152.4),152.4,304.8,black,hood,'z',64)
cyl('steel_top_band',(0,0,294),153,19,steel,hood,'z',64)
cyl('view_rim',(0,-151,178),39,17,steel,hood,'y',44);cyl('view_window',(0,-160,178),32,3.5,blue,hood,'y',44);cyl('view_fastener',(0,-162,178),3,3,gold,hood,'y',18)
for x in [-49,49]:box('handle_foot',(x,-99,275),(22,40,15),steel,hood,4)
rod('CHAMBER_VIEW_HANDLE',(-57,-132,278),(57,-132,278),8,silver,hood)
# Small real-scale rectangular coupon and purely illustrative removable support. No apparatus internals or settings.
rack=box('dry_witness_holder',(0,-42,20),(90,64,14),steel,ch,5)
coupon=empty('WITNESS_COUPON',(0,-54,27),ch);box('WITNESS_RECT',(0,0,.25),(8,5,.50),couponMat,coupon)
box('P1_MARK',(2.4,0,.53),(1.05,.95,.06),gold,coupon)
# Schematic outer jacket only: not tubing internals or an operating accessory map.
box('rear_secondary_jacket',(170,211,1025),(106,99,220),steel,root,12)
box('secondary_access_cap',(170,211,1140),(81,75,11),iv,root,7)
bpy.ops.export_scene.gltf(filepath=OUT+'/labcoter2.glb',export_format='GLB',export_animations=False,export_yup=True)
