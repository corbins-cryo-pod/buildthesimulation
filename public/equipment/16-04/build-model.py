"""Milli-Q IQ 7000 ZIQ7000T0C with one bench-top Q-POD. Simplified geometry from technical appendices. Blender 4.x, source mm, glTF m; not a service model."""
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
white=material('Satin high-impact shell',(.78,.81,.78),.15);iv=material('Warm accent polymer',(.63,.70,.69),.1);dark=material('Graphite bezel',(.027,.048,.051));teal=material('Teal instrument accent',(.013,.30,.34),.18);steel=material('Brushed column',(.54,.61,.62),.72);black=material('Bench foot dark elastomer',(.026,.040,.044));blue=material('Screen blue',(.04,.15,.23));ink=material('Light type',(.75,.84,.81));inset=material('Educational cassette cradle',(.21,.28,.28),.3);gold=material('Decorative cassette collar',(.53,.35,.10),.46)
root=empty('IQ7000_SYSTEM')
cab=empty('PRODUCTION_UNIT',(-173,30,0),root)
box('PRODUCTION_DATUM',(0,0,247),(265,350,494),white,cab,23)
for x in [-90,90]:
 for y in [-126,126]:box('recessed_foot',(x,y,2),(38,28,4),black,cab,2)
box('cap_crown',(0,1,492),(254,333,12),iv,cab,5)
caseback=box('rear_interface',(2,171,241),(235,7,397),iv,cab,11)
for i in range(10):box('rear_vent',(0,174,421-i*10),(153,2,3.5),dark,cab,.65)
for i,x in enumerate([-73,-25,24,72]):
 cyl('rear_service_port_'+str(i),(x,173,121),8,10,teal if i==1 else steel,cab,'y',20)
box('rear_power',(70,176,66),(27,5,21),black,cab,2)
# Separate cap is a deliberately illustrative cutaway toggle, not provision for real service.
panel=empty('CARTRIDGE_PANEL',(0,-177,248),cab)
box('front_shell_face',(0,0,0),(244,10,447),white,panel,18)
label('front_label','Milli-Q   IQ 7000',-43,-5.4,179,13,teal,'front',panel)
cyl('front_emblem',(90,-5.1,179),9,1.2,teal,panel,'y',22);label('front_M','M',-63,-5.4,-181,22,teal,'front',panel)
bay=empty('CARTRIDGE_CUTAWAY',(0,-204,252),cab)
box('cutaway_back',(0,19,0),(211,10,292),inset,bay,9)
for i,x in enumerate([-48,48]):
 cyl('ILLUSTRATIVE_CASSETTE_'+str(i),(x,0,0),24,236,iv,bay,'z',24);cyl('cassette_collar',(x,0,84),25,29,teal if i==0 else gold,bay,'z',24)
label('diagram_only','DISPLAY MOCKUP',0,-24,-129,10,ink,'front',bay)
pod=empty('Q_POD',(200,-15,0),root)
box('QPOD_BASE',(0,0,26.5),(211,270,53),white,pod,14)
box('QPOD_DRIP_TRAY',(0,-58,52),(166,136,3),iv,pod,9)
for x in [-62,-42,-22,-2,18,38,58]:box('drip_slot',(x,-64,53.5),(3,67,.7),dark,pod)
cyl('column_foot',(0,57,72),27,59,iv,pod,'z',32);cyl('column_guide',(0,57,386),12,628,steel,pod,'z',32)
box('rear_monitor_support',(0,57,673),(46,43,91),white,pod,9)
box('touch_console',(0,36,727),(151,63,130),white,pod,11)
box('touch_bezel',(0,2,741),(136,8,85),dark,pod,4)
box('QPOD_SCREEN',(0,-2.4,741),(109.0,2,65.4),blue,pod,3)
label('pod_header','QUALITY',0,-3.6,754,9,ink,'front',pod)
rod('angled_dispens_arm',(0,57,444),(0,-136,570),25,white,pod)
rod('arm_inner_accent',(14,55,435),(15,-135,554),3,iv,pod)
handle=empty('VIRTUAL_DIAL',(0,-141,499),pod)
box('hand_piece',(0,0,45),(57,65,171),white,handle,12);box('teal_wand_button',(0,-33,54),(15,4,28),teal,handle,3)
cyl('visual_spout',(0,-7,-45),14,31,iv,handle,'z',22);cyl('dial_band',(0,-7,-56),26,14,teal,handle,'z',28)
cable('illustrative_wand_tether',[(215,39,470),(236,39,361),(240,-73,400),(227,-138,441),(200,-163,466)],5.2,iv)
# Display-only bottle and fill overlay share a fixed stage anchor; no physical labeling claim.
bottle=empty('BOTTLE_250',(0,-146,54),pod)
shell=material('Transparent training bottle',(.34,.60,.66),.1);shell.surface_render_method='DITHERED';shell.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.32
cyl('bottle_outer',(0,0,71),34,142,shell,bottle,'z',36);cyl('bottle_neck',(0,0,152),16,24,shell,bottle,'z',24);label('bottle_id','250 mL',0,-34.2,64,13,teal,'front',bottle)
cable('illustrative_unit_sleeve',[(-101,202,121),(-74,234,82),(61,225,28),(132,164,16),(184,119,15)],5.4,iv)
bpy.ops.export_scene.gltf(filepath=OUT+'/iq7000.glb',export_format='GLB',export_animations=False,export_yup=True)
