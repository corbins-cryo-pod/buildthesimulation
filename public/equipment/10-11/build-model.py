"""MaxWell MaxOne hub and recorder with one empty MaxOne+ PSM format. Editable authored mm, glTF metres; dimensions checked, exact internals not modeled."""
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
silver=material('Satin brushed shell',(.61,.63,.64),.69);white=material('PCB support satin grey',(.56,.59,.58),.25);dark=material('Recorder graphite body',(.048,.060,.064),.32);black=material('Port plastic',(.019,.027,.035));green=material('Status LED',(.044,.44,.25));blue=material('Data cable aqua',(.018,.28,.48));gold=material('Chip electrode area',(.59,.36,.095),.68);sil=material('Inert silicon appearance',(.14,.255,.217),.38);txt=material('Brand/type',(.75,.82,.78))
root=empty('MAXONE_PASSIVE_SYSTEM');hub=empty('MAXONE_HUB',(-106,45,0),root)
box('HUB_DATUM',(0,0,45),(280,185,90),silver,hub,5)
for y in [-90,90]:box('hub_panel',(0,y,43),(279,5,83),dark,hub,4)
box('hub_backplate',(0,93,42),(267,2,65),white,hub,4);label('hub_identifier','MAXONE   /   HUB',-86,95,61,12,black,'back',hub)
for x,k,w in [(-103,'LINK',17),(-57,'SYNC',28),(1,'USB',14),(70,'POWER',25),(111,'SWITCH',13)]:
 box('hub_'+k,(x,94,41),(w,6,13),black,hub,1.4);label('rear_'+k,k,x,95,54,4.5,black,'back',hub)
for x in [-100,100]:
 for y in [-67,67]:box('hub_foot',(x,y,3),(21,24,6),black,hub,2)
box('hub_front_accent',(0,-92,49),(267,4,49),dark,hub,3);label('hub_front_id','MAXWELL     BIOSYSTEMS',0,-95,53,10,txt,'front',hub);cyl('HUB_STATUS',(109,-94,33),2.2,1.3,green,hub,'y',16)
rec=empty('MAXONE_RECORDER',(124,-18,0),root)
box('RECORDER_DATUM',(0,0,12.5),(95,150,25),dark,rec,6);box('RECORDER_SHIELD',(0,35,25.3),(83,55,.6),silver,rec,3)
box('recorder_data_socket',(0,74,13),(16,4,10),black,rec,1);cyl('REC_LED',(34,-57,25.45),2.2,.9,green,rec,'z',20)
label('rec_label','MaxOne',-26,-60,25.9,8,txt,'top',rec)
cyl('carrier_ring_seat',(0,-22,25.5),37,2.8,silver,rec,'z',64);cyl('dark_seat',(0,-22,27.4),33,3.6,black,rec,'z',64)
chip=empty('PSM_CHIP',(0,-22,29),rec)
box('CHIP_CARRIER',(0,0,1.4),(29,28,2.8),white,chip,2.5)
for i in [-1,1]:
 for j in [-1,1]:cyl('fastener', (i*11.5,j*10.5,2.9),1.1,.9,silver,chip,'z',18)
def ring(n,od,id,h,mat):
 N=64;verts=[]
 for z,r in ((2.8,od/2),(2.8,id/2),(2.8+h,od/2),(2.8+h,id/2)):
  for i in range(N):a=i*2*pi/N;verts.append((math.cos(a)*r/1000,math.sin(a)*r/1000,z/1000))
 f=[] 
 for i in range(N):
  j=(i+1)%N;f.extend([(i,j,2*N+j,2*N+i),(N+i,3*N+i,3*N+j,N+j),(2*N+i,2*N+j,3*N+j,3*N+i),(i,N+i,N+j,j)])
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(verts,[],f);mesh.update();o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.parent=chip;o.data.materials.append(mat)
ring('PSM_RING',24,19,8,silver);box('chip_die',(0,0,3),(9.1,7.9,.8),sil,chip,.4)
box('SENSING_AREA',(0,0,3.45),(3.85,2.10,.1),gold,chip)
cable('illustrative_shortened_data_link',[(-208,146,41),(-195,172,20),(-96,191,7),(39,127,8),(123,76,11),(124,58,13)],2.2,blue)
bpy.ops.export_scene.gltf(filepath=OUT+'/maxone.glb',export_format='GLB',export_animations=False,export_yup=True)
