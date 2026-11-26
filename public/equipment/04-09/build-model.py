"""Passive enclosure reconstruction: G&P POLI-500 AC from public product presentation, and disconnected radial reference. Input mm, metric glTF. No manufacturing components or controls."""
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
iv=material('Ivory service finish',(.635,.656,.604),.37);trim=material('Pale champagne trim',(.66,.669,.576),.31);dark=material('Black inactive bezels',(.037,.053,.053),.23);panel=material('Opaque pane / not a cutaway',(.112,.17,.177),.46);gray=material('Satin caster and lower trim',(.29,.34,.345),.62);amber=material('Amber published badge field',(.58,.298,.066));ink=material('Equipment name black',(.094,.111,.103));silver=material('Muted side sheet',(.52,.57,.559),.47);brass=material('Detached gauge selector',(.63,.465,.22),.56);teal=material('Detached radial gauge',(.085,.29,.279),.42)
main=empty('POLI500AC_DORMANT')
for x in [-426,426]:
 for y in [-447,434]:
  box('CASTER_TOP',(x,y,63),(100,80,50),gray,main,7);cyl('CASTER_WHEEL_DORMANT',(x,y,34),34,45,dark,main,'x',32)
box('CABINET_WIDTH_DEPTH_DATUM',(0,0,382),(1100,1150,640),iv,main,17)
box('LOWER_CAP',(0,0,722),(1094,1146,55),trim,main,11)
for x in [-245,245]:
 box('SEALED_SERVICE_DOOR',(x,-570,374),(474,9,535),iv,main,6)
 for z in [108,639]:box('SEALED_LOWER_DOOR_SEAM',(x,-575.2,z),(465,1.5,1.6),gray,main,.3)
for x in [-482,-8,8,482]:box('SEALED_VERTICAL_DOOR_LINE',(x,-575.2,374),(1.6,1.5,531),gray,main,.4)
for x in [-48,48]:box('DORMANT_LOWER_GRIP',(x,-576,374),(22,9,67),dark,main,3)
box('DORMANT_UPPER_CABINET',(0,0,1233),(1094,1142,982),silver,main,14)
for x in [-262,262]:
 box('SEALED_ACCESS_FRAME',(x,-564,1238),(517,20,921),trim,main,10)
 box('OPAQUE_CLOSED_PANEL',(x,-576,1246),(477,7,842),panel,main,8)
for x in [-493,493]:
 box('STATIC_OUTER_HINGE',(x,-573,966),(18,18,44),gray,main,2)
 box('STATIC_OUTER_HINGE',(x,-573,1517),(18,18,44),gray,main,2)
for x in [-28,28]:box('STATIC_ACCESS_GRIP',(x,-584,1246),(21,20,150),gray,main,5)
box('HEADER_HEIGHT_DATUM',(0,0,1781),(1100,1150,198),trim,main,12)
box('G_AND_P_PLATE',(-295,-576,1791),(411,4,93),iv,main,4)
box('G_AND_P_AMBER_SWATCH',(-482,-579,1791),(27,2,81),amber,main)
label('DRAWING_NAME','G&P  POLI-500 AC',-285,-580.5,1783,38,ink,'front',main)
box('DO_NOT_OPERATE_DISPLAY',(300,-577,1794),(195,11,104),dark,main,5)
for y in [-208,34,266]:
 for i in range(8):box('RIGHT_PASSIVE_LINING',(548,y,365+i*10),(2,164,2),gray,main,.6)
box('REAR_SIMPLE_ACCESS_PANEL',(0,568,371),(875,12,508),silver,main,4)
for i in range(14):box('REAR_GENERIC_GRILLE',(145,575,420+i*10),(419,2,3),gray,main,.4)
pad=empty('DETACHED_RADIAL_CHART',(893,-449,0))
box('CHART_BASE',(0,0,23),(464,369,46),dark,pad,12)
box('CHART_COLUMN',(0,93,472),(135,148,865),gray,pad,8)
box('READER_CASE',(0,5,1046),(529,83,431),teal,pad,17)
box('CHART_SCREEN',(0,-38,1055),(472,4,330),dark,pad,7)
for x,k,n in [(-157,'MARK_1','M1'),(0,'MARK_2','M2'),(157,'MARK_3','M3')]:
 box(k,(x,-42,862),(99,10,28),brass,pad,6);label('LEGEND_'+k,n,x,-48,862,14,ink,'front',pad)
label('CHART_LABEL','OFFLINE   /   RADIAL WITNESS',0,-38,1240,17,iv,'front',pad)
bpy.ops.export_scene.gltf(filepath=OUT+'/poli500.glb',export_format='GLB',export_animations=False,export_yup=True)
