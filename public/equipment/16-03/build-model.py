"""BTS Steel 1800 bench, original furniture design. Editable Blender source in mm, GLB in m, no manufacturer or load rating."""
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
steel=material('Brushed satin steel',(.51,.55,.55),.78);grey=material('Scotchbrite inner drawer',(.33,.39,.39),.55);cream=material('Warm cream enamel',(.74,.67,.53),.13);dark=material('Graphite feet and handles',(.032,.049,.053),.28);black=material('Storage tray lining',(.048,.060,.060));teal=material('Tray A teal',(.062,.31,.29));amber=material('Tray B amber',(.50,.23,.078),.24);case=material('Case C black polymer',(.05,.065,.085),.31);brass=material('Plate / anchor labels',(.73,.52,.25),.53);ink=material('Bright identification',(.79,.81,.71))
root=empty('BTS_STEEL_1800')
box('WORKTOP',(0,0,881),(1800,750,38),steel,root,8)
for x in (-846,846):
 for y in (-310,309):
  box('welded_tube_leg',(x,y,455),(56,56,815),grey,root,4);cyl('level_screw',(x,y,37),9,42,steel,root,'z',20);cyl('adjustable_foot',(x,y,8),30,16,dark,root,'z',22)
 for z in (227,809):box('side_rail',(x,0,z),(45,626,42),grey,root,4)
for y,z in [(309,201),(316,806),(-318,822)]:box('cross_brace',(0,y,z),(1657,43,40),grey,root,4)
for x in [-641,641]:
 cyl('cable_grommet',(x,277,900),26,0.1,dark,root,'z',36);box('split_grommet',(x,277,900.05),(28,4,.1),grey,root)
drawer=empty('DRAWER_SLIDE',(-550,-15,688),root)
for x in (-182,182):box('cabinet_side',(-550+x,24,579),(21,534,472),cream,root,4)
box('cabinet_underside',(-550,24,352),(367,534,18),cream,root,3);box('cabinet_roof',(-550,24,800),(367,534,28),cream,root,3);box('cabinet_back',(-550,277,579),(362,23,471),cream,root,2)
for z in [416,523,628]:
 box('inactive_drawer_face',(-550,-245,z),(349,24,100),cream,root,3);box('inactive_handle',(-550,-269,z+20),(124,30,11),dark,root,3)
box('DRAWER_BED',(0,0,-7),(356,436,14),grey,drawer,3)
for x in [-176,176]:box('drawer_side_wall',(x,0,35),(12,436,70),grey,drawer,3)
for y in [-216,216]:box('drawer_edge',(0,y,35),(340,12,70),grey,drawer,3)
box('active_drawer_face',(0,-230,29),(357,26,103),cream,drawer,4)
for x in [-61,61]:box('handle_standoff',(x,-248,36),(15,19,13),dark,drawer,3)
box('DRAWER_HANDLE',(0,-262,36),(145,20,17),dark,drawer,4)
label('active_drawer_id','STORAGE   /   01',0,-244,63,10,ink,'front',drawer)
# Passive right cabinet with door and vertical pull (not part of simulated action scope).
right=empty('RIGHT_CABINET',(595,25,0),root)
box('cream_right_body',(0,0,511),(328,513,646),cream,right,8)
box('right_door',(0,-255,507),(314,19,615),cream,right,6)
box('door_stile',(-105,-278,578),(14,34,133),dark,right,4)
for x in (-86,86):
 for z in (259,753):cyl('cabinet_fastener',(x,-267,z),3,4,steel,right,'y',18)
def tray(name,xyz,w,h,d,m,text):
 o=empty(name,xyz,root);box(name+'_base',(0,0,5),(w,d,10),m,o,4)
 for x in [-w/2+4,w/2-4]:box(name+'_wall',(x,0,h/2),(8,d,h),m,o,3)
 for y in [-d/2+4,d/2-4]:box(name+'_rail',(0,y,h/2),(w-16,8,h),m,o,3)
 box(name+'_liner',(0,0,11),(w-17,d-17,2),black,o,2)
 label(name+'_tag',text,0,-d/2-.04,h/2,9,ink,'front',o)
 return o
tray('TRAY_A',(-440,-135,900),280,42,340,teal,'TRAY A')
tray('TRAY_B',(448,-135,900),300,47,380,amber,'TRAY B')
o=empty('CASE_C',(20,219,900),root);box('CASE_C_body',(0,0,28),(420,230,56),case,o,8);box('CASE_C_faceplate',(0,-112.6,28),(249,4,32),grey,o,4);label('CASE_C_tag','CASE C',0,-115.02,29,13,ink,'front',o)
label('bench_name','BTS   /   STEEL 1800',32,-376,882,15,dark,'front',root)
bpy.ops.export_scene.gltf(filepath=OUT+'/steel-bench.glb',export_format='GLB',export_yup=True,export_animations=False)
