"""Original support-prop kit; editable source in mm, glTF metres. Cabinet, stool, decorative case, amber screen and task lamp. No PPE or photometric ratings."""
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
iv=material('Warm cream enamel',(.70,.63,.48),.18);olive=material('Olive woven vinyl',(.19,.22,.096),.0);dark=material('Graphite coating',(.043,.058,.061),.25);steel=material('Brushed steel',(.52,.57,.59),.76);brass=material('Antique brass',(.61,.39,.14),.68);case=material('Teal protective-case prop',(.048,.255,.2),.13);white=material('Soft lettering',(.81,.80,.69));light=material('Frosted lens',(.74,.64,.47));amber=material('Decorative amber panel',(.62,.288,.027));amber.surface_render_method='DITHERED';amber.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.47
root=empty('BTS_PROPS_MK1');cab=empty('CABINET_ROOT',(0,0,0),root)
box('CABINET_PLINTH',(0,0,33),(620,510,66),iv,cab,7);box('CABINET_CROWN',(0,0,1159),(620,510,42),steel,cab,5)
for x in [-300,300]:box('cabinet_cheek',(x,0,605),(20,510,1116),iv,cab,5)
box('cabinet_rear',(0,247,597),(592,14,1103),iv,cab,3)
for z in [255,463,791]:box('interior_shelf',(0,10,z),(581,469,21),steel,cab,4)
for z,h in [(152,154),(357,175),(550,126)]:
 box('fixed_drawer_face',(0,-242,z),(575,23,h),iv,cab,5);box('fixed_drawer_pull',(0,-263,z+18),(146,24,13),brass,cab,3)
dr=empty('SUPPORT_DRAWER',(0,-5,672),cab)
box('DRAWER_BED',(0,0,-7),(560,430,14),steel,dr,4)
for x in [-275,275]:box('drawer_flank',(x,0,42),(9,436,92),iv,dr,4)
box('drawer_back',(0,211,37),(552,14,87),steel,dr,3);box('drawer_face',(0,-237,47),(572,25,133),iv,dr,4)
box('SUPPORT_DRAWER_HANDLE',(0,-264,57),(160,26,15),brass,dr,3);label('drawer_mark','D1  /  STORAGE',0,-251,88,11,dark,'front',dr)
door=empty('UPPER_CABINET_DOOR',(-278,-254,923),cab)
box('upper_door_panel',(278,0,36),(556,22,353),iv,door,6);box('SUPPORT_DOOR_HANDLE',(505,-16,42),(17,31,133),brass,door,4)
for z in [-84,158]:cyl('hinge',(0,0,z),6,34,steel,door,'z',24)
label('cabinet_logo','BTS',261,-12,129,17,dark,'front',door)
prop=empty('PPE_CASE_01',(-120,-111,1180),cab);box('case_bottom',(0,0,12),(180,90,24),case,prop,5);box('case_lid',(0,0,31),(179,89,14),case,prop,5)
for x in [-57,57]:box('latch',(x,-43,19),(16,4,11),brass,prop,2)
label('case_id','PPE  /  CASE  01',0,0,38.12,9,white,'top',prop)
stool=empty('STOOL',(-660,-208,0),root);cyl('stool_pedestal',(0,0,195),33,290,steel,stool,'z',28)
for i in range(5):
 a=i*2*pi/5;x,y=216*math.cos(a),216*math.sin(a);rod('stool_leg',(0,0,67),(x,y,41),13,steel,stool);cyl('stool_foot',(x,y,13),24,26,dark,stool,'z',20)
bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=8,major_radius=.142,minor_radius=.009);finish(bpy.context.object,'foot_ring',(0,0,180),steel,stool)
seat=empty('STOOL_SEAT',(0,0,485),stool);cyl('seat_cushion',(0,0,-21),173,42,olive,seat,'z',52);cyl('hollow_piston',(0,0,-100),12,160,steel,seat,'z',22);cyl('seat_pan',(0,0,-43),157,11,dark,seat,'z',40)
pane=empty('AMBER_PARTITION',(629,166,0),root)
for x in (-293,293):box('panel_stile',(x,0,812),(35,34,1616),dark,pane,5);box('panel_foot',(x,0,24),(94,137,48),steel,pane,6)
for z in [91,1604]:box('panel_rail',(0,0,z),(557,34,32),dark,pane,4)
box('AMBER_PANE',(0,0,865),(550,8,1468),amber,pane,1)
lamp=empty('TASK_LAMP',(245,-102,1180),cab);cyl('lamp_base',(0,0,12),43,24,brass,lamp,'z',28)
rod('lamp_mast',(0,0,24),(0,44,334),11,steel,lamp);rod('hinged_arm',(0,44,334),(0,0,468),9,brass,lamp)
bpy.ops.mesh.primitive_cone_add(vertices=40,radius1=.065,radius2=.033,depth=.051);finish(bpy.context.object,'lampshade',(0,0,463),iv,lamp);cyl('LAMP_LENS',(0,0,437),58,2,light,lamp,'z',40);box('TASK_LAMP_SWITCH',(18,-35,22),(14,14,8),dark,lamp,2)
bpy.ops.export_scene.gltf(filepath=OUT+'/lab-support.glb',export_format='GLB',export_yup=True,export_animations=False)
