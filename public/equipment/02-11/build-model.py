"""SUSS ACS200 Gen3 non-TE, simplified exterior and illustrative dry handling scene. Editable Blender 4.x, mm source, metre GLB. No service/calibration geometry."""
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
iv=material('Cool gray painted panels',(.62,.66,.66),.21);steel=material('Satin steel extrusion',(.46,.51,.54),.7);dark=material('Graphite services',(.039,.051,.057));black=material('Dark loading bay',(.063,.078,.082));green=material('SUSS marker green',(.018,.29,.167));glass=material('Illustrative shield glass',(.23,.38,.40));glass.surface_render_method='DITHERED';glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.28
amber=material('Amber wafer ID',(.55,.32,.077),.45);teal=material('Teal wafer ID',(.047,.31,.36),.46);silver=material('Gray wafer ID',(.57,.58,.57),.54);blue=material('Operator LCD',(.028,.066,.098));wh=material('Technical lettering',(.75,.83,.8));warning=material('Decorative status lamp',(.55,.038,.027));
root=empty('ACS200_GEN3');box('FOOTPRINT',(0,0,43),(1850,1500,86),dark,root,4);box('bottom_cabinet',(0,1,493),(1846,1496,820),iv,root,8)
for x in [-615,0,615]:
 box('front_lower_panel',(x,-744,489),(603,9,785),iv,root,5);box('lower_panel_pull',(x+238,-750,743),(29,7,92),steel,root,5)
for x in [-905,905]:
 for y in [-726,727]:box('frame_extrusion',(x,y,1518),(35,36,1290),steel,root,5)
box('roof',(0,0,2140),(1847,1498,46),iv,root,7);box('bay_floor',(0,0,936),(1770,1420,66),iv,root,3)
box('rear_service',(0,721,1522),(1798,44,1203),iv,root,8)
for x in [-899,899]:
 box('side_lower',(x,0,1095),(24,1433,298),iv,root,8)
 for y in [-603,0,603]:box('side_frame',(x,y,1635),(31,58,896),steel,root,3)
 for y in [-298,305]:box('side_glass',(x,y,1618),(13,560,865),glass,root,4)
for x,w in [(-781,268),(679,362)]:box('front_upper_cheek',(x,-725,1520),(w,40,1199),iv,root,4)
cover=empty('INSPECTION_COVER',(0,-728,1524),root)
for x in [-563,541]:box('inspection_frame',(x,0,0),(29,34,1194),steel,cover,4)
for z in [-580,580]:box('inspection_rail',(-12,0,z),(1125,34,34),steel,cover,4)
box('inspection_glass',(-11,0,0),(1096,16,1128),glass,cover,3)
box('COVER_HANDLE',(-520,-25,-175),(18,28,130),dark,cover,2)
label('system_mark','SUSS    ACS200 GEN3',-760,-747,2040,31,green,'front',root)
box('touch_mount',(723,-726,1512),(120,73,345),iv,root,5)
box('screen_back',(650,-768,1517),(340,44,267),iv,root,10)
box('DRY_SCREEN',(650,-792,1517),(299,8,206),blue,root,6);label('dry_only','DRY TRANSFER  /  VIEW',650,-797,1565,16,wh,'front',root)
box('virtual_console',(644,-758,1251),(356,72,79),steel,root,8)
box('ADVANCE_KEY',(642,-798,1258),(78,13,30),green,root,3);label('advance_mark','STEP',642,-806,1258,13,wh,'front',root)
for i,mt in enumerate([green,amber,warning]):cyl('status_stack',(851,-729,2074+i*27),20,25,mt,root,'z',24)
cass=empty('CAS_A',(-572,-300,825),root)
for x in [-118,118]:box('cassette_upright',(x,0,178),(18,248,291),steel,cass,3)
box('cassette_base',(0,0,38),(255,265,39),dark,cass,5);box('cassette_cap',(0,0,325),(255,265,25),iv,cass,4)
for z in [148,189,230]:
 for x in [-98,98]:box('slot_finger',(x,0,z),(32,232,9),steel,cass,1.4)
for x,tag,z in [(0,'01',229),(0,'02',188),(0,'03',147)]:label('slot_'+tag,tag,-151,-136,z,14,wh,'front',cass)
cyl('CHUCK_BASIN',(483,12,1004),158,80,iv,root,'z',48)
cyl('dry_bowl_liner',(483,12,1045),148,7,black,root,'z',48)
cyl('CH_200',(483,12,1048),100,12,steel,root,'z',64)
ped=empty('ROBOT_BASE',(0,235,925),root);cyl('robot_axis',(0,0,68),80,138,dark,ped,'z',32);cyl('robot_joint_cover',(0,0,139),65,19,steel,ped,'z',32)
arm=empty('TRANSFER_ARM',(0,-18,1062),root)
for x in [-47,47]:box('fork',(x,64,-5),(22,209,9),steel,arm,3)
box('end_effector_mount',(0,147,-5),(126,104,25),black,arm,5)
box('illustrative_arm',(0,244,-9),(104,144,33),iv,arm,4)
for i,(tag,z,mt) in enumerate([('01',1054,teal),('02',1013,amber),('03',972,silver)]):
 o=empty('DRY_W'+tag,(-572,-300,z),root);cyl('WAFER_'+tag,(0,0,.4),100,.8,mt,o,'z',64);label('wafer_mark_'+tag,'W'+tag,0,-36,.86,15,dark,'top',o)
bpy.ops.export_scene.gltf(filepath=OUT+'/acs200.glb',export_format='GLB',export_yup=True,export_animations=False)
