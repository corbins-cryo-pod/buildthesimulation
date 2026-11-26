"""Original BTS enclosure and detached geometric storage gauge. No actual equipment or electrical interfaces. Input mm; GLB m."""
import bpy, math, os
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
def label(n,txt,x,y,z,size,mat,side='front',par=None):
 c=bpy.data.curves.new(n,'FONT');c.body=txt;c.align_x='CENTER';c.align_y='CENTER';c.size=size/1000;c.resolution_u=1
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.location=(x/1000,y/1000,z/1000);o.rotation_euler=(pi/2,0,0) if side=='front' else ((pi/2,0,pi) if side=='back' else (0,0,0))
 o.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
ivory=material('Cool white coated magnet shell',(.80,.84,.83),.08)
graph=material('Powder coated graphite shell',(.085,.099,.106),.40)
al=material('Brushed dark aluminum panels',(.25,.297,.30),.72)
blue=material('Blue-gray static bulkhead',(.072,.151,.194),.59)
coal=material('Rubber and unpowered fascia',(.021,.035,.046),.22)
gasket=material('Seam and trim',(.036,.071,.076),.35)
ivory=material('Ivory model mark',(.845,.830,.75),.09)
teal=material('Detached gauge green',(.055,.332,.236),.27)
gold=material('Amber inspection blocks',(.69,.321,.106),.39)
brass=material('Off-line controls',(.615,.442,.212),.41)
r=empty('UNBUILT_RESEARCH_BENCH_CLOSED',(-95,0,0))
box('ENCLOSURE_OUTER_DATUM',(0,0,47.5),(280,198,95),graph,r,9)
for x in [-103,103]:
 for y in [-68,68]:box('INTEGRAL_CORNER_PAD',(x,y,2),(35,28,4),coal,r,2)
box('PERIMETER_LID_SEAM',(0,0,70),(279,197,3),gasket,r,6)
box('TOP_RECESSED_DETAIL',(0,0,94.98),(255,170,.6),al,r,.3)
box('FRONT_BLANK_ALLOY_PANEL',(0,-98.74,51),(257,1.0,67),blue,r,.6)
box('FRONT_INACTIVE_VISUAL_FASCIA',(-39,-99.34,52),(145,.24,37),coal,r,.12)
box('LOW_FIXED_EXTERNAL_TRIM',(0,-99.31,21),(246,.24,3.5),al,r,.12)
for x in [-116,116]:
 for z in [26,76]:
  cyl('GENERIC_DUMMY_FASTENER',(x,-99.28,z),3,.3,al,r,'y',16)
label('FRONT_TITLE','BTS   /   15-13',-45,-99.51,57,12,ivory,'front',r)
label('FRONT_SUBTITLE','CLOSED DESIGN STUDY',-43,-99.51,44,6.2,ivory,'front',r)
label('FRONT_NO_OP','MOCK-UP',91,-99.49,52,8,ivory,'front',r)
box('REAR_BLANK_PANEL',(0,98.8,47),(247,.9,67),al,r,.5)
box('REAR_OPAQUE_VISUAL_ACCENT',(-20,99.35,43),(107,.1,22),blue,r,.05)
d=empty('DETACHED_LOCATOR_GAUGE',(190,0,0))
box('DETACHED_FOOT',(0,1,3),(143,157,6),coal,d,5)
box('GAUGE_FLOOR',(0,0,9),(108,116,6),graph,d,0)
# Flat contact faces. Rendered working faces are not filleted; equations use these exact planar edges.
for x in [-47,47]:box('X_RECESS_WALL',(x,-1,15),(10,84,6),teal,d)
box('REAR_EDGE',(0,38,15),(84,10,6),teal,d)
box('LEFT_OF_FRONT_TAB',(-17.5,-38.5,15),(49,11,6),teal,d)
box('RIGHT_OF_FRONT_TAB',(33.5,-38.5,15),(17,11,6),teal,d)
box('END_OF_FRONT_TAB',(16,-49,15),(18,10,6),teal,d)
for s in [-1,1]:box('GAUGE_CORNER_FRAME',(s*57,0,10),(6,116,8),gasket,d,2)
box('ACTION_CHECK',(33,-65,13),(28,17,14),brass,d,3)
box('ACTION_ROTATE',(-31,-65,13),(28,17,14),brass,d,3)
label('TAG_ACTION_CHECK','CHECK',33,-65,20.2,5.5,coal,'top',d)
label('TAG_ACTION_ROTATE','TURN',-31,-65,20.2,5.5,coal,'top',d)
label('GAUGE_NAME','DETACHED GAUGE',0,50,12.2,6.4,ivory,'top',d)
for k,w,h,tabW,tip in [('NOMINAL',80,62,14,42),('ZERO',84,66,18,44),('LARGE',86,70,20,47)]:
 q=empty('BLOCK_'+k,({'NOMINAL':0,'ZERO':-105,'LARGE':105}[k],0,52 if k=='NOMINAL' else 0),d)
 box('BODY_'+k,(0,0,7),(w,h,14),gold,q)
 box('KEY_'+k,(16,-(tip+h/2)/2,7),(tabW,tip-h/2,14),brass,q)
 label('TAG_'+k,k,0,-3,14.14,7.9,coal,'top',q)
bpy.ops.export_scene.gltf(filepath=OUT+'/detached-locator.glb',export_format='GLB',export_animations=False,export_yup=True)
