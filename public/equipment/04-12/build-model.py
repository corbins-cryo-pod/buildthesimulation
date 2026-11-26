"""EVG501 inert exterior with EV Group 501/510 cover visual reference. Dimensions are nominal, not vendor CAD. Blender -b -t 1 -P build-model.py."""
import bpy,math,os
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
out=Path(__file__).resolve().parent
s=bpy.context.scene;s.unit_settings.system='METRIC'
def m(n,rgb,metal=0):
 a=bpy.data.materials.new(n);a.diffuse_color=(*rgb,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=a.diffuse_color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.38;return a
def finish(n,mat):
 o=bpy.context.object;o.name=n;o.data.materials.append(mat);return o
def p(x):return tuple(v*.001 for v in x)
def b(n,pos,dim,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p(pos));o=finish(n,mat);o.dimensions=p(dim);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  q=o.modifiers.new('Fillet','BEVEL');q.width=bevel*.001;q.segments=3;q=o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cyl(n,pos,diam,depth,mat,axis='Y'):
 rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=diam*.0005,depth=depth*.001,location=p(pos),rotation=rot);return finish(n,mat)
def tube(n,pts,diam,mat):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_resolution=2;c.bevel_depth=diam*.0005
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for v,pt in zip(sp.bezier_points,pts):v.co=p(pt);v.handle_left_type=v.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);s.collection.objects.link(o);c.materials.append(mat);return o
def text(n,label,x,y,z,size,mat,back=False):
 c=bpy.data.curves.new(n,'FONT');c.body=label;c.size=size*.001;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=2;o=bpy.data.objects.new(n,c);s.collection.objects.link(o);o.location=p((x,y,z));o.rotation_euler=(math.pi/2,0,math.pi if back else 0);c.materials.append(mat);return o
satin=m('Blue-gray painted shell',(.25,.40,.43),.38);iv=m('Light metallic front overlay',(.70,.74,.70),.46);dk=m('Black molded detail',(.023,.033,.035));metal=m('Knob brushed alloy',(.52,.56,.55),.65);rub=m('Feet',(.021,.022,.024));white=m('Marking ivory',(.84,.83,.75));ink=m('Badge gray',(.084,.13,.13));red=m('Red exterior jack silhouette',(.51,.079,.064));green=m('Dark exterior green',(.095,.27,.22));toy=m('Fictional board slate',(.14,.24,.29));yellow=m('Fictional label wheat',(.77,.50,.15));cyan=m('Fictional label teal',(.17,.51,.49))
dk=m('Deep graphite cabinet',(.035,.051,.055),.30);dm=m('Dark plastic',(.018,.023,.027),.18);iv=m('Light gray console',(.62,.67,.65),.33);st=m('Brushed steel exterior',(.48,.53,.54),.68);pl=m('Black blank displays',(.017,.035,.043),.20);amber=m('Exterior badge yellow',(.72,.53,.14));red=m('Exterior red accent',(.62,.064,.048));teal=m('Detached teaching base',(.12,.38,.41));gold=m('Independent square A',(.75,.49,.17));cyan=m('Independent square B',(.19,.56,.55))
b('EVG_closed_dark_cabinet',(-244,0,474),(492,688,892),dk,12)
b('EVG_closed_console_cabinet',(252,0,474),(476,688,892),iv,12)
b('EVG_console_counter',(240,0,933),(489,700,39),st,9)
b('EVG_chamber_counter',(-244,0,932),(492,700,32),dk,9)
for x in [-430,-57,60,430]:
 for y in [-278,278]:cyl('EVG_ground_support',(x,y,15),48,30,dm,'Z')
b('EVG_console_face_fascia',(234,-346,849),(444,7,95),iv,4)
for i,z in enumerate([693,574,454,337,218]):
 b('EVG_inert_console_panel_'+str(i),(244,-347,z),(388,5,104),st,6)
 for j in range(11):b('EVG_grille_shape',(120+j*24,-350,z+9),(10,1.2,27),dm)
cyl('EVG_decorative_red_shape',(401,-352,849),41,10,red);text('EVG_model_badge','EVG 501',150,-351,847,30,dm)
b('EVG_blank_monitor_foot',(256,112,960),(259,203,22),dm,8)
b('EVG_monitor_static_neck',(256,146,1032),(65,58,135),dm,8)
b('EVG_blank_monitor_housing',(254,118,1202),(386,123,290),iv,20)
b('EVG_blank_monitor_screen',(254,53,1213),(329,10,220),pl,12)
b('EVG_keyboard_static_pavement',(251,-126,962),(326,128,19),iv,6)
for x in range(121,378,23):
 for y in [-163,-139,-115,-91]:b('EVG_key_silhouette',(x,y,973),(18,16,4),dm)
cyl('EVG_closed_lower_drum',(-237,-30,1065),390,232,st,'Z')
cyl('EVG_closed_lid_rim',(-237,-30,1170),409,28,st,'Z')
cyl('EVG_fitted_upper_drum',(-237,-30,1231),375,110,st,'Z')
b('EVG_drum_blank_plate',(-235,-224,1074),(120,7,60),iv,7)
text('EVG_drum_passive_mark','STATIC',-235,-228,1075,18,dm)
for i in range(4):
 a=math.pi/4+i*math.pi/2;x=-237+206*math.cos(a);y=-30+206*math.sin(a)
 cyl('EVG_fixed_exterior_fastener_'+str(i),(x,y,1031),28,52,st,'Z');cyl('EVG_fixed_dark_cap_'+str(i),(x,y,1065),52,18,dm,'Z')
b('EVG_tower_outer_exterior',(-237,25,1389),(153,132,270),iv,13)
cyl('EVG_tower_endcap_outline',(-237,25,1526),102,28,st,'Z')
for x in [-287,-187]:b('EVG_tower_pale_stripe',(x,-43,1395),(22,5,210),st,3)
for x in [-428,-263,-98,76,241,406]:b('EVG_rear_broad_inlay',(x,344,447),(89,10,491),dk,11)
# Detached unit-free comparison board, unrelated to the interior or instrument.
b('Offline_square_pedestal',(809,-181,398),(406,399,796),teal,22)
b('Offline_square_slated_top',(809,-181,797),(390,375,32),dm,13)
b('Offline_teal_square',(749,-183,819),(120,120,12),cyan,3)
b('Offline_gold_square',(749,-183,831),(120,120,12),gold,3)
for i in range(5):b('Offline_ruler_tick_'+str(i),(689+i*60,-85,815),(2,24,2),iv,.1)
# Combine repeated fixed detail into compact draw groups.
for prefix,group in [('EVG_grille_shape','EVG_grille_static_array'),('EVG_key_silhouette','EVG_keyboard_static_array')]:
 bpy.ops.object.select_all(action='DESELECT');items=[o for o in s.objects if o.name.startswith(prefix)]
 for item in items:item.select_set(True)
 bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();bpy.context.object.name=group
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'evg501.glb'),export_format='GLB',export_apply=True)
