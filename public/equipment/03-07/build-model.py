"""Oxford Plasmalab 80 Plus PECVD appearance only. Oxford Issue 6 installation diagrams 2-1/2-2 give 580×790×1430 mm main envelope. Dry inspection cutaway and fixture are authored, not operation or specifications. Blender -b -t 1 -P build-model.py."""
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
steel=m('Brushed steel enclosure',(.51,.55,.55),.62);blue=m('Oxford blue outer hood',(.038,.238,.54),.30);dark=m('Black panel seam',(.029,.041,.041));gray=m('Gray desk',(.33,.37,.37));rub=m('Station wheel rubber',(.024,.027,.030));yellow=m('Visible contrast switch surround',(.75,.61,.08));red=m('Decorative red release shape',(.55,.057,.061));iv=m('Ceramic dummy plate',(.62,.68,.68));green=m('Screen accent',(.076,.36,.31));pink=m('Stage witness ring',(.55,.31,.14));glass=m('Console dark screen',(.035,.072,.088));white=m('Nameplate light',(.65,.69,.68));headmat=m('Electrode shaped witness',(.36,.41,.41),.64)
b('Oxford_body',(0,0,602),(580,786,1086),steel,6);b('Rear_right_panel',(0,390,599),(543,8,1015),gray,4);b('Front_lower_cabinet_door',(0,-392,548),(550,6,969),steel,4)
for x in [-234,234]:
 for y in [-321,321]:
  cyl('Wheel_'+str(x)+str(y),(x,y,28),56,44,rub,'X');b('Castor_mount_'+str(x)+str(y),(x,y,50),(38,44,27),steel,2)
b('Front_black_seam',(0,-394,1033),(535,1.2,2),dark);b('Front_instrument_strip',(0,-392,1090),(553,6,77),white,3);b('Front_handle',(-177,-395,822),(70,10,19),dark,5)
for xx in [-224,-156,180,222]:cyl('Static_front_control_'+str(xx),(xx,-395,1091),19,5,blue)
cyl('Static_stop_surround',(18,-395,1092),43,4,yellow);cyl('Static_stop_button',(18,-397,1092),29,4,red)
text('Oxford_mark','OXFORD',-119,-396,962,39,blue);text('Model_mark','Plasmalab 80Plus',-40,-396,913,31,blue)
for k in range(13):b('Vent_'+str(k),(-288,150,317+k*11),(4,197,2),dark)
for k in range(4):b('Rear_connector_visual_'+str(k),(-120+57*k,395,199),(27,.5,22),dark,1)
b('Table_top',(0,1,1139),(567,779,12),steel,4)
ox,oy=-24,-96
cyl('Circular_chamber_lower',(ox,oy,1157),340,24,steel,'Z')
cyl('Inspection_stage',(ox,oy,1175),257,19,dark,'Z');cyl('Dry_120mm_reference',(ox,oy,1185),120,2,pink,'Z')
for i in range(3):
 t=2*math.pi*i/3;cyl('Dummy_locator_'+str(i),(ox+75*math.cos(t),oy+75*math.sin(t),1187),8,5,steel,'Z')
cap=bpy.data.objects.new('Inspection_cutaway_shell',None);s.collection.objects.link(cap);cap.location=p((ox,oy,1300))
def a(o,z,y=0,x=0):o.parent=cap;o.location=p((x,y,z))
a(b('Blue_chamber_hood',(0,0,0),(428,452,242),blue,19),9)
a(b('Hood_inspection_badge',(0,0,0),(111,2,64),white,2),1,-228,97)
a(b('Hood_inspection_handle',(0,0,0),(85,15,26),dark,3),-107,-228,44)
a(cyl('Underhood_disc',(0,0,0),324,39,headmat,'Z'),-91)
a(cyl('Underhood_inset',(0,0,0),262,5,steel,'Z'),-100)
b('Static_housing_upright',(-24,152,1211),(61,60,145),steel,4)
# A separate console is illustrative. No controls actuate anything.
b('Console_stand',(572,7,464),(54,54,916),gray,5);b('Console_foot',(575,83,22),(443,306,44),gray,6);b('Work_surface',(586,-86,935),(452,470,33),white,7)
b('Console_monitor',(589,-7,1116),(334,78,251),dark,9);b('Reference_screen',(589,-49,1116),(299,6,211),glass,3);b('Dummy_keyboard',(583,-186,964),(300,130,19),gray,5)
b('Rear_aux_cabinet',(540,262,1010),(318,144,778),steel,10)
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'oxford80plus.glb'),export_format='GLB',export_apply=True)
