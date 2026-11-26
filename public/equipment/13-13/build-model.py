"""Closed dormant Leica CM3050 S bench reference with a separate inert chart. No operational hardware or mechanisms; dimensions in mm, glTF metres."""
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
iv=material('Pearl cryostat panels',(.73,.76,.72),.22);top=material('Ivory top frame',(.79,.80,.75),.14);rub=material('Dark floor wheels and textured pad',(.035,.047,.052),.29);grey=material('Satin steel trim',(.37,.45,.45),.44);hood=material('Opaque sealed viewport',(.085,.151,.176),.55);red=material('Nominative label red',(.55,.065,.038));ink=material('Dormant panel gray',(.163,.19,.192));off=material('Unlit display',(.074,.14,.088));teal=material('Detached concept board',(.077,.28,.24),.39);gold=material('Concept board select keys',(.665,.507,.27),.38)
m=empty('CM3050S_CLOSED_EQUIPMENT')
shell=empty('CABINET_CLOSED',(0,0,0),m)
box('REAR_HEIGHT_DATUM',(0,321,1017),(745,124,46),top,shell,9)
box('REAR_CABINET_SKIN',(0,204,443),(787,358,820),iv,shell,23)
box('KNEE_WALL_RECESSED',(0,-49,391),(644,156,679),iv,shell,17)
for x in [-364,364]:
 o=box('SIDE_LEG',(x,-181,398),(72,219,745),iv,shell,15);o.rotation_euler.x=.14
 for y in [-209,309]:
  box('CASTER_PLINTH',(x,y,27),(49,37,31),grey,shell,2);cyl('DORMANT_CASTER',(x,y,19),19,17,rub,shell,'x',28)
box('FULL_WIDTH_DEPTH_DATUM',(0,0,788),(800,766,104),iv,shell,14)
box('LOW_FRONT_ARMREST',(0,-333,824),(760,97,32),top,shell,8)
label('FRONT_BADGE','Leica',243,-383.3,800,24,red,'front',shell)
for x in [-363,358]:
 o=box('SIDE_SLOPE',(x,-56,888),(68,553,44),top,shell,13);o.rotation_euler.x=.25
o=box('OPAQUE_SEALED_LID',(43,-78,888),(614,408,21),hood,shell,10);o.rotation_euler.x=.24
o=box('LID_FRAME_BOTTOM',(43,-280,840),(625,33,22),grey,shell,6);o.rotation_euler.x=.24
o=box('BACK_TOP_DARK_MAT',(1,297,1036),(637,139,7),rub,shell,7)
upper=empty('BLANK_HMI_PROPS',(0,172,976),shell);upper.rotation_euler.x=-.18
box('TOP_ANGLE_FASCIA',(0,0,0),(749,90,104),top,upper,6)
box('FAUX_PANEL_PLATE',(0,-46,1),(674,5,79),iv,upper,5)
box('UNPOWERED_LCD',(-67,-49,1),(100,2,22),off,upper,4)
for y in [-1]:
 for x in [-291,-256,-221,-184,5,37]:box('STATIC_PANEL_KEY',(x,-50,y),(22,2.8,12),ink,upper,2)
label('PANEL_TYPE','LEICA   CM3050 S',221,-50,-1,19,ink,'front',upper)
for y in [37,146,241]:
 for j in range(7):box('RIGHT_PASSIVE_VENT',(399.9,y,606+7*j),(1.2,67,1.8),grey,shell,.4)
for j in range(12):box('BACK_INDICATED_VENT',(25,379,185+13*j),(273,2,3),ink,shell,.5)
box('REAR_GENERIC_SERVICE_LABEL',(-235,379,478),(117,3,42),grey,shell,2)
# Non-moving molded silhouette, no operating input. Measured total width spans −400 to +482 mm.
cyl('CAPPED_SIDE_WHEEL_STATIC',(421,14,735),106,43,top,m,'x',56)
cyl('WHEEL_OUTER_FASCIA',(447,14,735),81,10,iv,m,'x',48)
cyl('GRIP_LENGTH_DATUM',(468,11,799),12,28,rub,m,'x',32)
pad=empty('DETACHED_COORDINATE_READER',(777,-111,0))
box('READER_FOOT',(0,0,23),(335,286,46),rub,pad,8)
box('READER_SUPPORT',(0,81,257),(143,97,431),grey,pad,7)
box('READER_CASE',(0,40,562),(415,68,309),teal,pad,16)
box('READER_SCREEN',(0,4,573),(363,5,230),rub,pad,7)
for x,name,tag in [(-92,'READ_P','P'),(92,'READ_Q','Q')]:
 box(name,(x,-1,437),(86,11,28),gold,pad,6);label('TAG_'+name,tag,x,-8,437,17,ink,'front',pad)
label('READER_BRAND','COORDINATE CARD  |  OFFLINE',0,4,699,12,top,'front',pad)
bpy.ops.export_scene.gltf(filepath=OUT+'/cm3050s.glb',export_format='GLB',export_animations=False,export_yup=True)
