"""Leica EM UC7 inert exterior study, detachable synthetic comparison pad; Blender millimetres converted to metric glTF. No process parts or motion."""
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
iv=material('Warm ceramic polymer enclosure',(.69,.72,.70),.18);paper=material('Pearl optics cover',(.79,.78,.74),.13);dark=material('Black phenolic housing',(.032,.052,.052),.35);metal=material('Satin gray rings',(.42,.48,.48),.68);ruby=material('Crimson identity label',(.58,.069,.052));ink=material('Slate typography',(.16,.19,.187));lens=material('Dark coated glass visual',(.047,.13,.152),.29);teal=material('Inert pad trim',(.08,.27,.239),.37);gold=material('Brass pad marks',(.63,.45,.231),.49)
main=empty('LEICA_UC7_DOCUMENTARY')
for x in [-161,161]:
 for y in [-200,200]:cyl('FOOT_PAD',(x,y,7),20,14,dark,main,'z',22)
box('REFERENCE_FOOTPRINT',(0,0,27),(415,505,32),dark,main,17)
box('SHALLOW_FRONT_BASE',(0,-86,63),(410,328,57),iv,main,21)
box('CLOSED_FRONT_BAY',(0,-135,93),(230,182,13),dark,main,7)
box('EMPTY_INSERT_EXT',(5,-143,103),(171,124,13),metal,main,5)
box('CENTER_UPPER_SHELL',(0,70,165),(355,315,182),iv,main,53)
box('UPPER_NECK_BRIDGE',(0,22,265),(324,308,69),iv,main,30)
box('TOP_TAPER_SHELL',(0,66,232),(395,277,115),paper,main,48)
box('OUTER_MICROSCOPE_MOUNT',(0,-39,294),(203,150,93),dark,main,15)
cyl('SEALED_LOWER_OPTICS_SHROUD',(0,-122,284),63,49,dark,main,'z',44)
box('BINOCULAR_NECK',(0,-91,348),(172,142,100),paper,main,13)
for z in [386,394,402,410]:box('EYEPIECE_BELLOW',(0,-89,z),(155-(z-386)*.6,111,6),dark,main,4)
box('M80_BINOCULAR_HEAD',(0,-113,437),(178,127,89),paper,main,16)
for x in [-39,39]:
 rod('STATIC_OCULAR_TUBE',(x,-155,436),(x,-222,467),19,dark,main)
 cyl('REAR_GLASS_VISUAL',(x,-223,467),16,6,lens,main,'y',36)
 cyl('EYEPIECE_END_RING',(x,-220,467),20,7,dark,main,'y',36)
for y,z,r in [(92,147,31),(75,260,23),(20,267,21)]:
 cyl('MOLDED_SIDE_CAP',(196,y,z),r,26,paper,main,'x',36)
 cyl('BLANK_CAP_INSERT',(211,y,z),r*.66,6,dark,main,'x',28)
label('FRONT_LEICA','Leica',10,-250,65,18,ruby,'front',main)
label('UC7_NAME','EM UC7',0,-250,44,10,ink,'front',main)
for k in range(5):box('REAR_COSMETIC_SEAM',(118,225,152+k*10),(65,1.3,2),dark,main,.5)
ctrl=empty('INACTIVE_10_4_CONTROLLER',(-379,-71,0))
# 4:3 active-aspect assumption; diagonal is documentary, cabinet is not.
box('CONTROLLER_BASE',(0,0,16),(270,239,32),iv,ctrl,15)
s=empty('OFF_CONTROLLER_FACIA',(0,6,143),ctrl)
s.rotation_euler.x=math.radians(-12)
box('CONTROLLER_HOUSING',(0,0,0),(264,43,202),iv,s,8)
box('DISPLAY_DIAGONAL_10_4',(0,-23,5),(211.328,4,158.496),lens,s,2)
label('INACTIVE_LABEL','INACTIVE DISPLAY PROP',0,-26,5,9,metal,'front',s)
pad=empty('DETACHED_SYNTHETIC_PAD',(405,-113,0))
box('DETACHED_PAD_BASE',(0,0,17),(275,204,34),dark,pad,10)
q=empty('DRY_GAUGE_FACE',(0,-9,101),pad)
q.rotation_euler.x=math.radians(-14)
box('DRY_PAD_CASE',(0,0,0),(272,38,168),teal,q,9)
box('DRY_PAD_SCREEN',(0,-20,8),(235,2,123),dark,q,3)
for x,name,cap in [(-78,'PAIR_A','A'),(0,'PAIR_B','B'),(78,'GAUGE_ZOOM','ZOOM')]:
 box(name,(x,-23,-65),(55,4,18),gold,q,3);label('TAG_'+name,cap,x,-26,-65,9,dark,'front',q)
bpy.ops.export_scene.gltf(filepath=OUT+'/leica-uc7.glb',export_format='GLB',export_yup=True,export_animations=False)
