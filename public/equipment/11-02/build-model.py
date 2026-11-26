"""Doric LDMD-1 and CLDM inert external shapes, and separate generic symbol viewer. Blender mm -> glTF m. No functional parts."""
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
anth=material('Black anodized external case',(.059,.066,.061),.57);dark=material('Unpowered screen',(.047,.082,.080),.34);steel=material('Satin capped solid dummy metal',(.50,.55,.53),.75);seam=material('Matte seam',(.033,.038,.032),.29);ink=material('Ivory identity lettering',(.74,.75,.681),.21);tag=material('Muted yellow label',(.57,.46,.099));teal=material('Detached teaching display',(.074,.258,.237),.33);brass=material('Offline symbol picker',(.56,.43,.22),.48)
drv=empty('DORIC_LDMD1_DORMANT',(-55,0,0))
box('DRIVER_ENVELOPE_BASE',(0,0,19),(175,105,38),anth,drv,4)
box('TOP_PLATE',(0,0,38),(167,100,3),anth,drv,3)
box('DARK_DISPLAY_PROP',(-38,-4,40),(75,41,1),dark,drv,3)
box('DISPLAY_PLACEHOLDER_BEZEL',(-38,-28,39.7),(76,1.75,1.5),steel,drv,.7)
# A solid, non-turnable patch only represents the exterior silhouette at the model height datum.
cyl('STATIC_CAP_HEIGHT_DATUM',(47,0,44.5),13.4,11,steel,drv,'z',40)
label('DORIC_NAME','doric',-37,29,39.65,11,ink,'top',drv)
label('DRIVER_NAME','LDMD-1    /    REFERENCE',-25,-39,39.65,6,ink,'top',drv)
box('DORMANT_FRONT_ID',(-25,-51.5,17),(48,1.4,10),tag,drv,1)
label('INACTIVE_ID','INACTIVE',-25,-52.3,17,5,seam,'front',drv)
for k in range(6):box('REAR_ABSTRACT_DETAIL',(-33+k*13,51,16),(7,1.5,2),seam,drv,.3)
cl=empty('DORIC_CLDM_CAPPED',(68,-7,0))
box('BASEPLATE_WIDTH_DEPTH_DATUM',(0,0,2.5),(64,56,5),anth,cl,3)
box('HEAD_NOMINAL_BODY',(0,-2,11),(24.6,36.8,12),anth,cl,3)
box('INACTIVE_LID',(0,-2,17.8),(20,30,1.4),seam,cl,2)
label('HEAD_ID','CLDM',0,1,18.55,5,ink,'top',cl)
# Solid end-cover only, no open port, thread, cable, optics or electrical geometry.
cyl('STATIC_HEAD_CLOSED_CAP',(0,-24,13),9,7,steel,cl,'y',32)
box('CLDM_STATIC_TOP_PAD',(0,-5,20),(11,13,4),anth,cl,2)
for x in [-23,23]:box('FLAT_BASE_EDGE_RECESS',(x,-8,4.6),(9,17,1.0),seam,cl,1.5)
p=empty('DETACHED_GENERIC_SYMBOL_CHART',(178,-47,0))
box('PAD_BASE',(0,0,6),(135,101,12),anth,p,5);box('PAD_STAND',(0,30,33),(42,36,47),steel,p,5)
box('CHART_CASE',(0,11,82),(143,32,106),teal,p,7)
box('SYMBOL_SCREEN',(0,-8,88),(122,4,63),dark,p,3)
for x,k in [(-42,'A'),(0,'B'),(42,'U')]:
 box('SYMBOL_'+k,(x,-8,44),(29,7,12),brass,p,3);label('TAG_SYMBOL_'+k,k,x,-12,44,6,seam,'front',p)
label('PAD_TITLE','GENERIC SHAPES',0,-6,127,7,ink,'front',p)
bpy.ops.export_scene.gltf(filepath=OUT+'/doric-closed.glb',export_format='GLB',export_animations=False,export_yup=True)
