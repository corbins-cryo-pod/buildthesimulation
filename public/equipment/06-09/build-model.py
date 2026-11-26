"""Dimensioned New Era NE-1000 bare dormant chassis, no fittings or controls, plus remote synthetic dimension card. Blender mm and GLB m."""
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
red=material('Red case powder coat',(.555,.055,.051),.36);red2=material('Dark seam red',(.34,.052,.043),.32);rub=material('Dark rubber feet',(.027,.039,.041));gray=material('Dark inactive bezel',(.053,.075,.075),.4);ink=material('White nominal lettering',(.82,.86,.81));silver=material('Underlying inactive metalwork',(.31,.41,.415),.64);teal=material('Detached inert gauge housing',(.065,.26,.237),.36);brass=material('Chart read keys',(.60,.47,.255),.44)
m=empty('NE1000_DORMANT_CHASSIS')
lo,hi=-111.125,111.125
profile=[(-72.898,7.366),(72.898,7.366),(72.898,80.518),(-18.0,80.518),(-72.898,23.1)]
v=[(x/1000,y/1000,z/1000) for x in [lo,hi] for y,z in profile]
f=[tuple(reversed(range(5))),tuple(range(5,10))]
for k in range(5):n=(k+1)%5;f.append((k,n,n+5,k+5))
mesh=bpy.data.meshes.new('Rev A bent sheet silhouette');mesh.from_pydata(v,[],f);mesh.update()
o=bpy.data.objects.new('CHASSIS_SKIN_DATUM',mesh);bpy.context.collection.objects.link(o);o.parent=m;o.data.materials.append(red)
mod=o.modifiers.new('Rounded cosmetic edges','BEVEL');mod.width=.0016;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=o.modifiers.new('Weighted exterior normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
for x in [-92,92]:
 for y in [-54,54]:cyl('RUBBER_FEET_DATUM',(x,y,3.683),8.1,7.366,rub,m,'z',32)
# Static fascia contained in the original slope. No actual front controls or actionable hardware features.
a=empty('BLANK_SLOPED_FASCIA',(0,-46.20,52.85),m);a.rotation_euler.x=math.atan2(57.418,54.898)
box('INACTIVE_FRONT_PANEL',(0,0,1),(167,37,1.8),red2,a,2)
box('UNPOWERED_LCD_BLANK',(-37,3,2),(65,17,1.2),gray,a,2)
label('FRONT_MODEL_TAG','NEW ERA   /   NE-1000',34,-1,2.2,7.4,ink,'top',a)
# Intentionally anonymous covers for the removed top assemblies; nothing moves or connects.
box('TOP_FIXED_FLAT_COVER',(0,26,80.118),(171,64,.8),red2,m,2)
box('BACK_GENERIC_SEAM',(0,72.2,42),(170,.7,1.5),silver,m,.2)
reader=empty('DETACHED_DIMENSION_CARD',(221,-42,0))
box('READER_FOOT',(0,0,5),(158,122,10),rub,reader,6)
box('READER_STAND',(0,27,43),(58,31,72),silver,reader,3)
box('READER_CASE',(0,14,101),(164,20,124),teal,reader,7)
box('DIMENSION_SCREEN',(0,3,110),(143,2.8,84),rub,reader,4)
for x,k in [(-48,'A'),(0,'B'),(48,'C')]:
 box('READ_'+k,(x,1,51),(32,5,13),brass,reader,3);label('TAG_READ_'+k,k,x,-2.3,51,7,gray,'front',reader)
bpy.ops.export_scene.gltf(filepath=OUT+'/ne1000-chassis.glb',export_format='GLB',export_animations=False,export_yup=True)
