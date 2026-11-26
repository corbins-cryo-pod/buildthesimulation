"""Original documentary Thorlabs LEDD1B bare exterior, M470F1 legacy family housing, and disconnected abstract length card. No hardware operation. Blender mm; GLB m."""
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
anth=material('Black anodized cases',(.045,.054,.054),.52);coal=material('Charcoal recessed face',(.022,.037,.038),.48);steel=material('Satin blank end cover',(.50,.55,.55),.70);shadow=material('Graphite ribs',(.078,.092,.091),.56);ink=material('Pale external letter shapes',(.79,.82,.740),.19);dark=material('Unpowered fascia',(.046,.068,.079),.24);teal=material('Detached length card reader',(.062,.251,.221),.4);gold=material('Offline read buttons',(.6,.446,.21),.44)
d=empty('LEDD1B_BARE_CUBE',(-52,0,0))
box('CUBE_BODY_DATUM',(0,0,23.5),(60,60,47),anth,d,2.5)
box('CUBE_FACE_INACTIVE',(0,0,46.2),(53,53,1.5),dark,d,2.5)
for x in [-22,22]:
 box('CUBE_TOP_BORDER',(x,0,46.95),(1,48,.08),ink,d,.03)
for y in [-23,23]:box('CUBE_TOP_BORDER',(0,y,46.95),(46,1,.08),ink,d,.03)
box('BLANK_FIXED_TOP_DISK',(0,-2,46.955),(19,18,.09),shadow,d,4)
label('DORMANT_CUBE_TITLE','LEDD1B',0,-16,47.01,5.2,ink,'top',d)
label('DORMANT_CUBE_MARK','THORLABS',0,16,47.01,3.7,ink,'top',d)
box('FRONT_BLANK_PLATE',(0,-29.7,18),(51,.5,17),coal,d,1)
for k in range(5):box('REAR_GENERIC_SEAM',(-19+9*k,29.5,17),(4,.7,15),shadow,d,.4)
m=empty('M470F1_FAMILY_CAPPED',(19,-12,0))
box('ESTIMATED_MOUNT_FOOT',(0,1.5,2.4),(51,42,4.8),anth,m,3)
box('ESTIMATED_MAIN_SINK',(0,0,19),(32,34,31),anth,m,3.2)
# Fin length/diameter and pitch here are only proportions from the visible family silhouette.
for y in [-13.8,-11.2,-8.6,-6,-3.4,-.8,1.8,4.4,7,9.6,12.2,14.8]:
 box('OUTER_GEOMETRIC_RIB',(0,y,21),(33.2,1.15,28),shadow,m,1.2)
box('CLOSED_FACE_PLATE',(0,-16,19),(31.8,2,29),coal,m,2.5)
cyl('STATIC_FULL_END_CAP',(0,-18.45,18),5.6,2.9,steel,m,'y',32)
label('LEGACY_FAMILY_STAMP','M470F1',0,-17.4,29,4.3,ink,'front',m)
# Independent abstract scale aid, not an accessory or an interface to the displayed parts.
p=empty('DETACHED_LENGTH_CARD',(113,-34,0))
box('CARD_FOOT',(0,0,6),(132,103,12),coal,p,6)
box('CARD_STAND',(0,23,32),(43,34,48),steel,p,5)
box('CARD_HOUSING',(0,11,78),(147,28,100),teal,p,7)
box('CARD_FACE',(0,-4.1,83),(128,2,57),coal,p,3)
for x,k in [(-49,'A'),(-16,'B'),(16,'U'),(49,'UNIT')]:
 box('READ_'+k,(x,-6,40),(26,5,11),gold,p,3);label('TAG_READ_'+k,k,x,-9,40,5.2,coal,'front',p)
label('CARD_ID','DETACHED  /  DISPLAY UNITS',0,-4,121,6,ink,'front',p)
bpy.ops.export_scene.gltf(filepath=OUT+'/thorlabs-closed.glb',export_format='GLB',export_animations=False,export_yup=True)
