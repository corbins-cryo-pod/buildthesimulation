"""Leica/Bioptigen Envisu C2300 legacy cart and sealed head exterior, source 2017 brochure. No electronics, optics, cable links, movement or acquisition. Blender -b -t 1 -P build-model.py."""
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
rail=m('Brushed gray outer frame',(.46,.50,.49),.61);slate=m('Dark cart shelves',(.072,.09,.099),.32);iv=m('Warm cosmetic panels',(.72,.72,.64),.26);dk=m('Graphite shells and tire silhouette',(.027,.035,.045),.31);blank=m('Opaque unpowered display',(.016,.022,.031),.25);teal=m('Muted original equipment accent',(.10,.38,.40),.26);ink=m('Dark decoration',(.13,.16,.17));white=m('Pale marking',(.78,.80,.75));board=m('Independent art stand teal',(.14,.37,.39));gold=m('Offline marker tab',(.77,.52,.17))
# Metric published cart shell, primary top 953 mm and total with monitor 1549 mm.
b('Cart_bottom_plinth',(0,0,139),(787,559,56),rail,14)
b('Cart_top_table',(0,0,929),(787,559,48),rail,15)
b('Cart_top_dark_insert',(0,-10,952.4),(713,495,4),slate,6)
for x in [-351,351]:
 for y in [-240,240]:
  b('Cart_vertical_outer_post',(x,y,537),(48,51,777),rail,6)
  b('Cart_caster_static_fork',(x,y*.9166667,113),(44,74,76),rail,8)
  cyl('Cart_caster_wheel',(x,y*.9166667,59),118,40,dk,'X')
  cyl('Cart_caster_hub',(x+(-21 if x<0 else 21),y*.9166667,59),57,6,rail,'X')
for x in [-340,340]:
 b('Cart_dark_side_sheet',(x,1,535),(26,446,728),slate,13)
b('Cart_dark_back_sheet',(0,236,537),(677,28,748),slate,8)
for z in [226,446,657,783]:
 b('Cart_static_shelf',(0,-8,z),(718,471,23),slate,6)
 b('Cart_shelf_front_metal_edge',(0,-246,z),(719,13,26),rail,2)
b('Cart_sealed_upper_case',(0,-43,820),(624,346,101),iv,13)
b('Cart_sealed_middle_case',(0,-35,704),(613,359,93),rail,11)
b('Cart_dormant_middle_badge',(138,-215,704),(167,2,25),teal,3)
b('Cart_closed_computer_silhouette',(-52,-35,527),(434,359,130),dk,15)
b('Cart_fixed_computer_face_accent',(146,-217,528),(30,4,82),teal,3)
b('Cart_closed_lower_small_shell',(181,-53,290),(149,222,117),iv,16)
text('Cart_small_name','ENVISU C2300',-34,-220,820,24,ink)
# Fixed display; no controls or image content.
cyl('Cart_monitor_pedestal',(41,136,968),160,24,dk,'Z')
cyl('Cart_monitor_support_pole',(41,136,1047),46,165,rail,'Z')
o=b('Cart_inactive_monitor_link',(53,111,1144),(54,63,164),dk,7);o.rotation_euler.x=math.radians(25)
b('Cart_closed_monitor_frame',(49,43,1390),(510,66,318),dk,18)
b('Cart_blank_monitor_screen',(49,8.7,1394),(474,4.4,281),blank,10)
# Opaque display head sits in an inferred noninteractive top cradle; no cable/mount.
b('Cart_dormant_head_display_rest',(-194,-91,967),(144,182,28),slate,10)
b('Head_white_shell',(-194,-22,1067),(80,144,166),iv,37)
b('Head_front_slope',(-194,-84,1038),(69,84,101),iv,24)
cyl('Head_fixed_sealed_nose_shell',(-194,-135,1015),70,84,dk)
cyl('Head_front_dormant_ring',(-194,-170,1018),55,15,slate)
cyl('Head_blank_end',(-194,-179,1018),43,2,blank)
# A physically independent art board, no relationship to any case.
b('Offline_art_pedestal',(650,-205,371),(331,306,742),board,19)
b('Offline_art_panel',(650,-205,757),(309,286,22),slate,10)
for i in range(6):
 x=650-95+i*34
 for j,z in enumerate([-53,29]):
  if i==3 and j==1:continue
  b('Offline_art_mark',(x,-205+z,773),(13,18,9),white,2)
b('Offline_column_tab',(754,-283,776),(52,37,14),gold,4)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'envisu-c2300.glb'),export_format='GLB',export_apply=True)
