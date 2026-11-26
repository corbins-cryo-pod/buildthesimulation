"""Documentary dormant Crossbeam 550 base enclosure, no internals or working apparatus. Numbers in mm, glTF meters. Adjacent panel is invented."""
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
iv=material('Warm off-white cabinet',(.64,.66,.654),.22);salt=material('Satin pale service enclosure',(.52,.57,.58),.52);grey=material('Cast trim grey',(.23,.27,.29),.42);dark=material('Black unused indicator and plinth',(.032,.038,.043),.37);blue=material('Badge enamel only',(.025,.078,.19),.1);white=material('Plate lettering',(.88,.891,.88));oldGold=material('Brass gauge etch',(.63,.44,.21),.55);teal=material('Offline data tablet trim',(.07,.265,.24),.31)
main=empty('CROSSBEAM550_DOCUMENTARY')
for x in [-319,319]:
 for y in [-427,427]:cyl('FLOOR_PAD',(x,y,19),40,38,dark,main,'z',32)
box('UNDERSIDE_FRAME',(0,0,40),(794,1036,28),dark,main,4)
box('CABINET_ENVELOPE',(0,0,437),(820,1083,790),iv,main,14)
box('LOWER_FASCIA_FLAT',(0,-533,392),(550,16,656),iv,main,7)
box('LEFT_PLINTH_SEAM',(-274,-542.2,403),(1.7,1,682),grey,main)
box('RIGHT_PLINTH_SEAM',(274,-542.2,403),(1.7,1,682),grey,main)
box('PLINTH_TOP_LINE',(0,-542.2,665),(804,1,1.3),grey,main)
label('MODEL_TEXT','Crossbeam 550',-88,-543.0,726,34,dark,'front',main)
for k in range(3):cyl('DORMANT_STATUS_PIP',(192+k*29,-542,684),6,5,dark,main,'y',16)
box('TOP_DECK',(0,0,815),(798,1058,31),salt,main,11)
# Blank external body; it cannot open or reveal underlying hardware.
box('SEALED_CHAMBER_SHROUD',(0,-128,1073),(579,655,490),salt,main,67)
box('STATIC_FRONT_COVER',(0,-457,1078),(434,24,441),iv,main,24)
box('BOLT_PLATE',(-82,-471,1083),(154,8,236),grey,main,12)
for z in [925,1030,1135,1230]:
 for x in [92,158]:cyl('INACTIVE_COVER_FASTENER',(x,-472,z),6,6,grey,main,'y',16)
for i in range(6):box('COSMETIC_GRILLE',(-83,-477,1141+i*10),(107,2,2),dark,main,1)
box('MAIN_VERTICAL_CAPPED_SHROUD',(0,-119,1510),(362,405,480),salt,main,33)
box('UPPER_FRONT_FASCIA',(0,-325,1517),(280,12,370),iv,main,13)
box('COBALT_ID_PLATE',(0,-333,1660),(70,3,67),blue,main,4)
label('BADGE_TEXT','ZEISS',0,-335,1660,17,white,'front',main)
label('TOP_LABEL','Gemini 2',0,-332,1355,21,dark,'front',main)
box('EXTERIOR_REAR_SERVICE_PANEL',(0,521,454),(596,14,624),salt,main,14)
for i in range(14):box('REAR_SCHEMA_SLOT',(0,531,457+i*12),(319,2,4),dark,main,1)
# Visible bevel outlines only, not scaled details of any beam components.
o=box('RIGHT_BLANK_FACET',(263,-54,1259),(123,151,223),grey,main,21);o.rotation_euler.y=-.53
o=box('LEFT_BLANK_FACET',(-255,-121,1243),(111,123,166),salt,main,24);o.rotation_euler.y=.35
panel=empty('DETACHED_OFFLINE_INSPECTOR',(851,-530,0))
box('INSPECTOR_STAND_FOOT',(0,0,23),(518,436,46),dark,panel,14)
box('INSPECTOR_NECK',(0,72,457),(123,130,839),grey,panel,14)
box('INSPECTOR_ENCLOSURE',(0,17,1135),(537,69,401),iv,panel,19)
box('INSPECTOR_SCREEN',(0,-19,1156),(487,4,307),dark,panel,6)
for x,n,t in [(-160,'BODY','BODY'),(0,'VOID','VOID'),(160,'DIAGONAL','DIAG')]:
 box('INSPECT_'+n,(x,-21,965),(129,10,30),teal,panel,5);label('BTN_'+n,t,x,-28,965,12,white,'front',panel)
label('PANEL_LABEL','OFFLINE   /   GEOMETRY',0,-18,1321,13,dark,'front',panel)
bpy.ops.export_scene.gltf(filepath=OUT+'/crossbeam550.glb',export_format='GLB',export_animations=False,export_yup=True)
