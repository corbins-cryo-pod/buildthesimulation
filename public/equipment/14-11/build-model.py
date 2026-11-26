"""BTS dual-bath soak witness Mk I. Original illustrative CAD in mm; Blender 4.x: blender -b -P build-model.py. No measured manufacturer dimensions exist."""
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
def cable(n,coords,r,m,par=None):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r/1000;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for pt,xyz in zip(s.bezier_points,coords):
  pt.co=[v/1000 for v in xyz];pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def label(n,txt,x,y,z,size,mat,side='front',par=None):
 c=bpy.data.curves.new(n,'FONT');c.body=txt;c.align_x='CENTER';c.align_y='CENTER';c.size=size/1000;c.resolution_u=1
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.location=(x/1000,y/1000,z/1000);o.rotation_euler=(pi/2,0,0) if side=='front' else ((pi/2,0,pi) if side=='back' else (0,0,0))
 o.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
iv=material('Dry anodized silver',(.55,.59,.61),.42);black=material('Charcoal liner',(.038,.047,.055));steel=material('Brushed stainless',(.58,.62,.62),.64);gold=material('Gold plated contacts',(.66,.44,.14),.63);poly=material('Dry electrical isolation PCB',(.07,.19,.15));teal=material('Blue key',(.08,.34,.35));blue=material('Off screen',(.028,.066,.085));wh=material('Panel silkscreen',(.78,.82,.78))
water=material('Illustrative clear bath surface',(.099,.30,.39));water.surface_render_method='DITHERED';water.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.22
glass=material('Transparent cover',(.24,.41,.46));glass.surface_render_method='DITHERED';glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.33
root=empty('BTS_SOAK_WITNESS_MK1')
box('BENCH_DATUM',(0,0,23),(620,365,34),iv,root,8)
for x in (-281,281):
 for y in (-155,155):cyl('level_foot',(x,y,3),14,6,black,root,'z',20)
label('title','BTS    SOAK WITNESS    /    MK I',0,-183,22,11,black,'front',root)
for j,x in enumerate((-145,145)):
 tag='AB'[j];b=empty('BATH_'+tag,(x,-35,40),root)
 box(tag+'_BLOCK',(0,0,22),(226,198,44),steel,b,9);box(tag+'_BATH_FLOOR',(0,0,45),(218,185,4),black,b,3)
 for m in (-1,1):box(tag+'_BANK',(m*108,0,91),(10,198,96),iv,b,2);box(tag+'_LIP',(0,m*94,91),(206,10,96),iv,b,2)
 box(tag+'_WATER',(0,0,119),(206,177,1),water,b)
 for xx in (-56,56):box(tag+'_RACK',(xx,0,88),(7,143,53),poly,b,2)
 for yy in [-60,-36,-12,12,36,60]:box(tag+'_RIB',(0,yy,95),(116,5,9),poly,b,1)
 box(tag+'_COUPON',(0,8,100),(62,33,4),gold if j else black,b,2)
 box(tag+'_INSULATION',(0,8,103),(51,27,2),poly,b,2)
 cyl(tag+'_TEMP_SENSOR',(82,64,106),2.8,69,steel,b,'z',18);cyl(tag+'_PT100_CONNECTOR',(82,64,143),7,13,black,b,'z',18)
 # Coarse dimensions are original design, not a physically manufactured temperature stabilizer.
 box(tag+'_PASS_THROUGH',(0,-79,143),(77,21,17),black,b,3)
 plug=empty(tag+'_PLUG',(0,-79,155),b);box(tag+'_PLUG_BODY',(0,0,7),(41,18,14),teal,plug,3);label(tag+'_PLUG_ID','PKG-'+tag,0,-10,7,5,wh,'front',plug)
 for xx in (-11,11):cyl(tag+'_CONTACT',(xx,0,-5),2.8,10,gold,plug,'z',18)
 for xx,yy in [(-11,4),(11,12)]:cable(tag+'_SENSE',[(xx,-79,145),(xx*1.4,-65,120),(xx*1.6,-34,112),(xx*1.4,yy,104)],1.4,black,b)
 label(tag+'_STAMP','BATH '+tag,x,-136,121,12,black,'front',root)
cover=empty('LID_PIVOT',(0,64,192),root)
for x in [-258,258]:box('lid_edge',(x,-104,0),(7,215,9),steel,cover,2)
for y in [-212,0]:box('lid_edge',(0,y,0),(520,8,9),steel,cover,2)
box('lid_glazing',(0,-105,0),(511,204,2),glass,cover,0)
rod('lid_handle',(-35,-194,15),(35,-194,15),6,black,cover)
for x in (-212,212):cyl('hinge',(x,0,0),7,25,steel,cover,'x',24)
box('logger_body',(0,127,103),(303,95,126),iv,root,9);box('LOGGER_SCREEN',(0,77.2,112),(135,4,70),blue,root,3)
label('logger','DUAL CHANNEL LOGGER',0,74.5,134,9,wh,'front',root);label('logger_run','ACQUIRE',0,74.5,103,8,wh,'front',root)
for j,x in enumerate((-110,110)):
 tag='AB'[j];cyl(tag+'_FEED_PORT',(x,76,101),8,16,steel,root,'y',20);cyl(tag+'_JACK',(x,67,101),4.8,1,black,root,'y')
 for a in (-1,1):box(tag+'_PORT_TRIM',(x+a*19,79,101),(18,3,11),teal,root,2)
for n,x,w in [('USB',-62,16),('POWER',62,25)]:box(n,(x,177,99),(w,6,12),black,root,1)
bpy.ops.export_scene.gltf(filepath=OUT+'/soak-witness.glb',export_format='GLB',export_yup=True,export_animations=False)
