"""Heidelberg Instruments DWL 2000 exterior, interpreted from NIST NanoFab image. Cabinet sizes, transport/viewports and terminal schematic; 152.4 mm virtual blank is source-based. Blender -b -t 1 -P build-model.py. GLB metres."""
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
iv=m('Cream cabinet enamel',(.70,.64,.50));light=m('Inset beige',(.81,.74,.59));dark=m('Black glass gasket',(.065,.054,.045));rib=m('Steel motion hardware',(.31,.35,.30),.54);rub=m('Black hardware',(.025,.032,.029));red=m('Cabinet reference red',(.52,.045,.027));gl=m('Amber inspection viewport',(.67,.37,.095));gl.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.31;quart=m('Quartz silhouette',(.43,.67,.67));quart.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.87;steel=m('Rail satin alloy',(.56,.57,.49),.55);green=m('Ready marker',(.16,.49,.30));textc=m('Printed slate',(.13,.122,.105));screen=m('Console dark screen',(.04,.09,.099))
b('Lower_cabinet',(0,7,363),(1540,1051,696),iv,13);b('Bottom_rail',(0,-510,77),(1532,51,135),rib,6);b('Top_fascia',(0,-39,1755),(1550,997,508),light,12);b('Rear_cabinet',(0,471,1237),(1521,125,1485),iv,13)
for x in [-757,757]:b('Side_wall_'+str(x),(x,11,1015),(42,1042,1950),iv,8)
for x in [-709,709]:b('Optical_window_jamb_'+str(x),(x,-514,1055),(108,36,704),dark,4)
b('Window_upper_gasket',(0,-511,1400),(1320,34,37),dark,5);b('Window_bottom_red',(0,-521,735),(1350,34,33),red,6)
d=bpy.data.objects.new('Viewport_lift',None);s.collection.objects.link(d);d.location=p((0,-506,1060))
for n,z,w,h,ma in [('Lifted_amber_view',0,1262,632,gl),('Window_lower_handle',-288,215,24,dark)]:
 o=b(n,(0,0,z),(w,16,h),ma,3);o.parent=d;o.location=p((0,-11 if ma==dark else 0,z))
for x in [-658,658]:b('Cabinet_lower_door_'+str(x),(x,-522,395),(184,21,588),light,5)
b('Cabinet_service_face',(0,-524,438),(1110,18,548),light,9);b('Lower_seam',(0,-535,491),(1430,7,5),iv,1)
for x,z,n,ma in [(420,621,'EStop_visual',red),(544,633,'Ready_lamp',green),(544,581,'Idle_lamp',red)]:
 cyl(n,(x,-532,z),37 if x==420 else 19,12,ma)
text('Model_mark','DWL 2000',364,-541,1859,67,textc);text('Brand_mark','HEIDELBERG',-473,-541,1822,61,red)
b('Stage_floor',(0,39,812),(1210,815,55),rib,7);b('Stage_screw_base',(0,12,850),(400,462,25),dark,4)
for x in [-189,189]:b('Stage_linear_rail_'+str(x),(x,2,880),(40,535,32),steel,4)
carrier=bpy.data.objects.new('Dry_carrier_slide',None);s.collection.objects.link(carrier);carrier.location=p((0,-124,905))
for n,z,dim,ma in [('Carrier_key_surface',0,(274,219,31),steel),('Virtual_mask_blank',18.675,(152.4,152.4,6.35),quart),('Carrier_tab',0,(147,34,17),dark)]:
 o=b(n,(0,0,z),dim,ma,2 if n!='Virtual_mask_blank' else .2);o.parent=carrier;o.location=p((0,-108 if n=='Carrier_tab' else 0,z))
b('Dry_reference_ledge',(0,185,1159),(1109,140,133),iv,9)
for k in range(11):b('Rear_vent_'+str(k),(714,533,973+k*31),(87,3,12),dark)
b('Optional_console_pedestal',(1051,-19,506),(48,48,991),rib,4);b('Optional_console_surface',(1084,-160,1031),(573,408,29),rib,8);b('Console_monitor',(1086,-25,1341),(512,87,365),dark,10);b('Console_screen',(1086,-71,1341),(469,6,318),screen,3);b('Console_keyboard',(1070,-276,1066),(366,126,14),dark,4)
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'dwl2000.glb'),export_format='GLB',export_apply=True)
