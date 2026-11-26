"""Original documentary 2021+ Incucyte S3 exterior, plus disconnected generic static graphic review. Blender mm -> metric glTF. No acquisition or operating hardware."""
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
iv=material('Soft white microscope housing',(.75,.776,.734),.29);silver=material('Brushed upper finish',(.56,.604,.595),.70);gray=material('Soft gray contact finish',(.23,.30,.308),.48);deep=material('Closed graphite fascia',(.025,.037,.040),.38);slate=material('Blank display visual',(.055,.088,.097),.37);ink=material('Pearl lettering',(.81,.847,.806));accent=material('Chart viewer teal',(.09,.288,.245),.36);brass=material('Graphic reader inert keys',(.64,.47,.205),.44)
im=empty('S3_DORMANT_MICROSCOPE',(-248,0,0))
box('MICROSCOPE_DATUM',(0,0,164.75),(450,478,309.5),iv,im,20)
for x in [-171,171]:
 for y in [-193,193]:cyl('STATIC_FOOT',(x,y,5),14,10,deep,im,'z',28)
box('MICROSCOPE_TOP_TRIM',(43,49,318),(293,348,4),silver,im,3)
def polygon(n,points,y,depth,mat,parent):
 v=[(x/1000,Y/1000,z/1000) for Y in [y-depth/2,y+depth/2] for x,z in points];q=len(points)
 f=[tuple(reversed(range(q))),tuple(range(q,q*2))];f.extend((a+q,(a+1)%q+q,(a+1)%q,a) for a in range(q))
 m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new(n,m);bpy.context.collection.objects.link(o);o.parent=parent;o.data.materials.append(mat)
 mod=o.modifiers.new('Soft molded edge','BEVEL');mod.width=.003;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
# The S3 lower-left diagonal motif is visually distinctive. Shape is solid and does not open.
polygon('CLOSED_FASCIA_POLYGON',[(-206,147),(-206,290),(206,290),(206,43),(-100,43)],-239,5,deep,im)
polygon('LOW_LEFT_TRIANGLE',[(-204,91),(-152,43),(-204,43)],-239,5,deep,im)
box('CLOSED_HORIZONTAL_SEAM',(0,-242,167),(410,1.5,2),gray,im,.7)
label('S3_GANTRY_SIGNATURE','INCUCYTE  S3',139,-242.4,60,14,gray,'front',im)
for x in [-222,222]:
 for j in range(13):box('PASSIVE_SIDE_SLOT',(x,-164+j*26,253),(3,11,48),gray,im,1)
box('ABSTRACT_MICROSCOPE_REAR',(0,238,135),(338,2,107),silver,im,2)
ctl=empty('S3_DORMANT_CONTROLLER',(257,31,0))
box('CONTROLLER_DATUM',(0,0,73),(432,577,134),iv,ctl,11)
for x in [-178,178]:
 for y in [-237,237]:cyl('CTRL_STATIC_FOOT',(x,y,3),11,6,deep,ctl,'z',22)
box('CONTROLLER_DARK_BEZEL',(0,-286,72),(400,11,104),deep,ctl,5)
box('CTRL_BLANK_SCREEN',(-126,-293,80),(103,3,56),slate,ctl,3)
for x in [10,65,120,175]:
 for i in range(7):box('SEALED_FASCIA_SLOT',(x,-293,60+i*7),(39,1,1.7),gray,ctl,.4)
label('S3_CONTROLLER_SIGNATURE','INCUCYTE  S3',139,-294,34,14,ink,'front',ctl)
box('GENERIC_CONTROLLER_REAR',(0,286,60),(260,4,80),silver,ctl,5)
# Separate author-invented image viewer; no control cable, no biology, no equipment state.
p=empty('DETACHED_STATIC_GRAPHIC_READER',(724,-139,0))
box('READER_FOOT',(0,0,15),(276,234,30),deep,p,9)
box('READER_SUPPORT',(0,48,111),(79,54,180),gray,p,7)
box('READER_SHELL',(0,1,255),(359,59,273),accent,p,12)
box('INK_GAUGE_SCREEN',(0,-31,262),(313,4,190),deep,p,5)
for x,name,key in [(-106,'REVIEW_A','A'),(0,'REVIEW_B','B'),(106,'REVIEW_U','U')]:
 box(name,(x,-35,137),(69,7,24),brass,p,4);label('MARK_'+name,key,x,-39,137,13,deep,'front',p)
label('READER_TAG','OFFLINE  /  GRAPHIC MASK',0,-32,373,12,ink,'front',p)
bpy.ops.export_scene.gltf(filepath=OUT+'/incucyte-s3.glb',export_format='GLB',export_animations=False,export_yup=True)
