"""Axon 200B 2U / CV203BU + fictional electronic resistor fixture. Editable Blender source, mm; metre-scale glTF. Exterior details by visual reference; no vendor CAD."""
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
navy=material('Blue powdercoat shell',(.046,.079,.16),.36);steel=material('Satin aluminum extrusion',(.56,.58,.54),.77);iv=material('Warm engraved fascia',(.72,.71,.64),.16);gray=material('Brushed white knobs',(.55,.56,.49),.65);dark=material('Black instrumentation plastic',(.035,.045,.050));red=material('Red LED window',(.16,.025,.015));gold=material('Nickel/gold contacts',(.57,.36,.12),.7);green=material('Dummy fixture marking',(.07,.36,.29));white=material('Readout print',(.82,.84,.78));
root=empty('AXOPATCH_200B');box('AXO_RACK_FACE',(0,-155.75,52.45),(482.6,6,88.9),iv,root,2)
box('AXO_SHELL',(0,3,52.45),(437,311.5,88.9),navy,root,4)
for x in [-217.8,217.8]:
 for z in [13,30,77,92]:box('extrusion',(x,5,z),(3.6,311,2),steel,root,.7)
 for j in range(13):box('side_chassis_slot',(x,47+j*6,54),(1,3,21),dark,root,.4)
for x in [-225,225]:
 for z in [14,91]:cyl('rack_mount_hole',(x,-158.95,z),3.8,1.2,dark,root,'y',18)
 for z in [22,81]:box('handle_mount',(x,-167,z),(13,20,7),steel,root,2)
 box('rack_handle',(x,-181,52),(10,12,65),steel,root,2)
for x in [-162,162]:
 for y in [-112,116]:box('rack_foot',(x,y,4),(40,31,8),dark,root,2)
label('instrument_name','AXON   /   AXOPATCH 200B',-129,-159,91,9,navy,'front',root)
def knob(n,t,x,z,r=8,m=gray):
 cyl(n,(x,-163,z),r,9,m,root,'y',26);cyl(n+'_cap',(x,-168,z),r*.77,1.1,iv,root,'y',22);box('pointer',(x,-169,z+r*.30),(1.1,1.2,r*.55),dark,root,.3);label(n+'_label',t,x,-159,z+r+7,4.1,dark,'front',root)
for j,(x,t) in enumerate([(-183,'OFFSET'),(-150,'HOLDING'),(-113,'SLOW'),(-79,'FAST'),(-42,'SERIES R')]):
 knob('left_knob_'+str(j),t,x,58,8.4);knob('trim_'+str(j),'',x,29,6.9)
box('AXO_METER',(38,-159.05,71),(66,2,25),red,root,2)
label('meter_text','6.000',38,-160.5,71,11,white,'front',root)
knob('GAIN','OUTPUT GAIN',61,35,8.9);knob('FILTER','LOW PASS',112,35,9.0)
for x,t in [(109,'MODE'),(147,'SCALED'),(184,'COMMAND')]:
 cyl('bnc_base',(x,-161,69),6.8,4.5,steel,root,'y',20);cyl('bnc_body',(x,-166,69),4.75,8.1,steel,root,'y',20);cyl('bnc_inside',(x,-170.3,69),2.5,.8,dark,root,'y',16);label(t+'_front',t,x,-159,82,4.6,dark,'front',root)
box('POWER',(188,-160.5,26),(14,6,11),dark,root,2);label('power_id','POWER',188,-159,39,4.2,dark,'front',root)
box('rear_plate',(0,157,52),(437,3,82),iv,root,3)
for j,t in enumerate(['CAP','INVALID','FILTER','GAIN','I','MODE','SCALED','V','TEST']):
 x=-177+j*37;z=66 if j%2 else 42;cyl('rear_'+t,(x,163,z),5.35,13,steel,root,'y',22);cyl('socket',(x,170,z),2.5,.7,dark,root,'y',18);label(t+'_rear',t,x,159,z+11,4.4,dark,'back',root)
box('CV203BU_DB15',(-104,161,26),(33,6,11),steel,root,1.5);box('IEC_MAINS',(188,162,55),(31,7,24),dark,root,2)
pod=empty('CV203BU',(-100,-295,0),root);box('CV203BU_CASE',(0,0,22),(17.78,106.68,19.05),dark,pod,2)
box('head_mount',(0,12,3.175),(50.8,63.5,6.35),steel,pod,2);label('head_id','CV 203BU',0,-1,31.83,4.5,white,'top',pod)
cyl('threaded_input',(0,-56,22),7.7,7,iv,pod,'y',28);cyl('input_recess',(0,-60,22),2.5,1,dark,pod,'y',18)
dummy=empty('DUMMY_SWITCHED_RESISTOR',(-100,-387,0),root);box('dummy_fixture_shell',(0,0,14),(42,39,27),green,dummy,3);label('fixture_tag','PASSIVE   R',0,0,27.8,6,white,'top',dummy)
cyl('dummy_contact',(0,20,20),5.6,10,gold,dummy,'y',24)
cable('illustrative_shortened_harness',[(-100,-233,22),(-185,-202,19),(-250,-115,12),(-253,107,14),(-104,167,26)],3,navy)
bpy.ops.export_scene.gltf(filepath=OUT+'/axopatch-200b.glb',export_format='GLB',export_animations=False,export_yup=True)
