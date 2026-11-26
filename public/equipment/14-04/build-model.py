"""Original MCR 302 / T-PTD 200 first-pass metric reconstruction. Blender 4.x: blender -b -P build-model.py. Dimensions in mm, glTF in m. Detailed exterior placement is inferred; reference links on equipment page."""
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
iv=material('Powder coated cool silver',(.61,.65,.68),.3);dark=material('Charcoal polymer',(.034,.045,.058));steel=material('Turned steel',(.58,.65,.7),.82);accent=material('Lacquer red ID stripe',(.60,.034,.03));scr=material('Display blue',(.021,.065,.102));wh=material('Screen light',(.72,.83,.8));phantom=material('Inert test coupons',(.42,.26,.12));root=empty('MCR302')
# Original brochure dimensions in order H,W,D, scaled via broad outrigger feet and column on the single instrument.
box('base_footprint',(0,0,66),(444,586,116),iv,root,17)
for sg in (-1,1):
 box('side_pod',(sg*165,12,134),(113,507,115),iv,root,14);box('pod_seam',(sg*166,-238,139),(105,3,4),dark,root,1)
 for y in (-230,225):cyl('level_foot',(sg*166,y,8),22,16,dark,root,'z',20)
box('front_console',(0,-122,129),(219,326,156),iv,root,10);box('front_red_trim',(0,-284.5,81),(205,2,5),accent,root,1);label('identity','MCR 302',60,-285.1,74,7,dark,'front',root)
box('LCD_frame',(-14,-285,149),(86,4,65),dark,root,2);box('DISPLAY',(-14,-288,149),(77,3,56),scr,root,1);label('display_id','TRIBOLOGY',-14,-290,155,7,wh,'front',root)
for i in range(4):box('function_key',(48,-287,175-15*i),(15,5,7),steel,root,1)
box('vertical_stand',(0,119,421),(154,209,514),iv,root,8);box('front_guide',(0,11,432),(34,9,367),steel,root,2)
box('motor_cap',(0,15,601),(171,233,154),iv,root,9);label('motor_mark','ANTON  PAAR',0,-103,626,7,dark,'front',root)
cyl('bearing_housing',(0,-45,520),29,24,dark,root,'z',32)
cell=empty('CELL',(0,-45,203),root);cyl('peltier_cell',(0,0,12),68,20,steel,cell,'z',48);cyl('fixture_bowl',(0,0,24),47,12,dark,cell,'z',48);cyl('insert_platform',(0,0,33),18,9,steel,cell,'z',40)
tri=empty('TRIAD',(0,0,42),cell);R=6.35;tilt=pi/4
for j in range(3):
 t=2*pi*j/3;rad=Vector((math.cos(t),math.sin(t),0));norm=Vector((-math.sin(tilt)*rad.x,-math.sin(tilt)*rad.y,math.cos(tilt)));loc=(rad*math.sin(tilt)-Vector((0,0,math.cos(tilt))))*R
 o=cyl('P'+str(j+1),loc-norm*2.5,2.75,5,phantom,tri,'z',24);o.rotation_euler=norm.to_track_quat('Z','Y').to_euler()
sp=empty('SPINDLE',(0,-45,245),root)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=R/1000);finish(bpy.context.object,'BALL_12_7',(0,0,0),steel,sp);cyl('ball_collet',(0,0,10),5,12,steel,sp,'z',28);cyl('shaft',(0,0,135),2.8,245,steel,sp,'z',24)
cyl('rotor_chuck',(0,0,261),11,27,dark,sp,'z',24);box('rotation_index',(7,0,261),(12,3,5),accent,sp)
for sg in (-1,1):cyl('temperature_port',(sg*48,135,109),6,11,steel,root,'y',20)
bpy.ops.export_scene.gltf(filepath=OUT+'/mcr302.glb',export_format='GLB',export_yup=True,export_animations=False)
