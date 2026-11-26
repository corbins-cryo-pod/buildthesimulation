"""JEOL JEM-1400Plus HC main TEM unit, documented overall geometry and inferred subassemblies. Static only. Blender -b -t 1 -P build-model.py."""
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
iv=m('Warm stone JEOL enamel',(.72,.69,.59),.23);sk=m('Warm-gray structural case',(.54,.55,.47),.29);blue=m('Ultramarine trim',(.081,.23,.43),.26);gray=m('Table neutral laminate',(.64,.63,.55));dk=m('Dark guards and inactive instruments',(.039,.051,.064),.27);steel=m('Static brushed alloy',(.52,.56,.54),.61);black=m('Black glass or plug',(.013,.021,.027));cream=m('White lettering',(.84,.82,.77));teal=m('Separate archival lattice board',(.11,.37,.36));gold=m('Separate grid glyph',(.73,.51,.22))
def prism(n,poly,z0,z1,mat,bevel):
 v=[p((x,y,z)) for z in [z0,z1] for x,y in poly];k=len(poly);f=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new(n,m);s.collection.objects.link(o);m.materials.append(mat)
 q=o.modifiers.new('Round countertop','BEVEL');q.width=bevel*.001;q.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
# Plan view on JEOL brochure p.11 with broad rounded right-hand peninsula.
poly=[(-1080,-411),(-1080,-190),(-1030,-145),(-875,-104),(-634,-69),(-412,53),(-127,50),(186,4),(550,-73),(884,-160),(1001,-244),(1080,-413),(1080,-745),(1035,-884),(938,-992),(788,-1060),(546,-1060),(342,-1010),(193,-915),(65,-773),(-64,-637),(-218,-549),(-473,-541),(-835,-549),(-1010,-498)]
prism('JEM_curved_desk',list(reversed(poly)),873,932,gray,21)
b('JEM_front_left_support',(-832,-321,424),(241,339,839),iv,27)
b('JEM_front_left_blue_inlay',(-923,-491,417),(79,4,756),blue,6)
b('JEM_right_skirt',(704,-608,425.5),(558,685,851),sk,26)
b('JEM_right_blue_inlay',(930,-952,420),(43,4,725),blue,5)
b('JEM_center_lower_console',(115,-191,429),(479,538,858),iv,25)
b('JEM_center_console_blank',(110,-461,455),(278,6,572),dk,18)
for x in [-849,-165,613,826]:
 cyl('JEM_cabinet_foot',(x,-441,11),53,22,dk,'Z')
b('JEM_rear_column_cabinet',(-569,361,712),(667,678,1424),iv,31)
b('JEM_rear_blue_side_strip',(-903,384,704),(4,385,1218),blue,10)
b('JEM_column_rear_upright',(-576,316,1501),(498,485,1357),sk,29)
b('JEM_column_offwhite_support',(-563,287,1405),(429,356,1227),iv,24)
for i,(z,d,h) in enumerate([(1058,460,234),(1206,340,207),(1361,317,174),(1530,282,217),(1704,254,154),(1882,227,241),(2121,216,261),(2256,178,109),(2333,102,63)]):
 cyl('JEM_static_column_section_'+str(i),(-495,-14,z),d,h,iv,'Z')
 cyl('JEM_static_column_seam_'+str(i),(-495,-14,z+h/2-4),d+7,9,sk,'Z')
# Nonfunctional capped silhouette, no holder movements or port operations.
cyl('JEM_capped_side_feature',(-327,-14,1512),114,84,steel,'X');cyl('JEM_no_access_dark_cap',(-277,-14,1512),91,26,dk,'X')
for z in [1140,1326,1610,1950]:
 cyl('JEM_blank_external_ring',(-495,-161 if z<1700 else -141,z),52,48,steel)
cyl('JEM_top_trim',(-495,-14,2422),49,136,dk,'Z')
b('JEM_lower_viewing_housing',(-492,-153,1076),(341,237,200),iv,42)
b('JEM_dormant_viewing_panel',(-488,-259,1054),(236,31,112),black,24)
b('JEM_monitor_base',(180,-148,947),(315,176,19),dk,13)
b('JEM_monitor_neck',(180,-97,1026),(70,58,163),dk,8)
b('JEM_blank_monitor_frame',(180,-109,1218),(550,77,337),dk,17)
b('JEM_blank_monitor_screen',(180,-149,1221),(493,4,271),black,12)
for j,x in enumerate([126,382]):
 b('JEM_dormant_console_panel',(x,-471-74*j,940),(195,159,18),dk,12)
 for i in range(4):cyl('JEM_static_switch_silhouette',(x-57+38*i,-452-74*j,951),16,7,sk,'Z')
text('JEM_model_badge','JEM-1400Plus',-493,-122,1973,22,dk)
# Independent display fixture (not included in the instrument bounds).
b('Offline_display_base',(1510,-628,49),(566,460,98),teal,34);b('Offline_display_stand',(1510,-628,369),(362,250,558),sk,25)
b('Offline_lattice_panel',(1510,-628,657),(469,350,23),dk,18)
for x in [-162,-81,0,81,162]:
 for y in [-86,0,86]:cyl('Offline_lattice_dot',(1510+x,-628+y,669),19,5,gold,'Z')
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'jem1400plus.glb'),export_format='GLB',export_apply=True)
