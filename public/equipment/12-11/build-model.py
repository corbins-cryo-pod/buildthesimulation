"""Leica LMD7 scanning-stage static exterior, source dimensions Leica August 2022 technical brochure. Blender -b -t 1 -P build-model.py. All switches and housings are dormant."""
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
iv=m('Warm white cast shell',(.74,.71,.64),.26);dk=m('Stage black',(.037,.051,.060),.34);gray=m('Guard gray polycarbonate',(.22,.26,.38),.25);silver=m('Satin machined gray',(.49,.52,.54),.65);cap=m('Dark unpowered windows',(.018,.028,.037),.28);red=m('Leica red accent',(.58,.045,.052));white=m('White writing',(.88,.87,.83));darkink=m('Dark writing',(.15,.18,.19));board=m('Independent teaching slate',(.13,.24,.26));teal=m('Reference patch',(.21,.53,.45));gold=m('Fictional calibration frame',(.68,.42,.13))
b('LMD7_base_plinth',(0,-16,47),(287,445,84),iv,20)
b('LMD7_base_skirt',(0,-16,12),(281,431,24),dk,7)
b('LMD7_rear_column',(-9,125,285),(230,223,476),iv,31)
b('LMD7_rear_head_cap',(-54,146,514),(160,172,122),iv,17)
b('LMD7_binocular_platform',(-23,-62,454),(261,184,69),iv,10)
b('LMD7_right_cantilever',(115,0,455),(204,167,52),iv,13)
b('LMD7_side_module_outer',(157,20,520),(137,101,164),dk,17)
b('LMD7_side_module_face',(157,-30.8,516),(103,2.8,131),iv,10)
b('LMD7_side_module_accent',(131,-32.5,466),(44,1.2,3),red,1)
text('LMD7_exterior_badge','LMD7',159,-32.6,544,19,darkink)
b('LMD7_eyepiece_yoke',(-51,-143,495),(147,103,88),iv,27)
for x in [-97,-5]:
 o=cyl('LMD7_angled_eyepiece',(x,-187,532),48,76,dk,'Z');o.rotation_euler.x=.63
 o=cyl('LMD7_eyepiece_front_ring',(x,-211,563),49,12,dk,'Z');o.rotation_euler.x=.63
 o=cyl('LMD7_eyepiece_blank',(x,-216,569),34,3,cap,'Z');o.rotation_euler.x=.63
cyl('LMD7_red_turret_accent',(-46,-86,419),161,23,red,'Z')
cyl('LMD7_lower_static_ring',(-46,-86,397),153,35,iv,'Z')
cyl('LMD7_static_guard_skirt',(-46,-87,335),163,115,gray,'Z')
cyl('LMD7_static_guard_upper',(-46,-87,387),166,9,dk,'Z')
cyl('LMD7_static_guard_lower',(-46,-87,282),169,7,dk,'Z')
for x in [-94,-31,14]:
 cyl('LMD7_guarded_lower_silhouette',(x,-87,270),28,24,silver,'Z')
b('LMD7_stage_main',(0,-112,238),(512,214,41),dk,6)
b('LMD7_stage_carriage',(0,-158,219),(280,223,24),dk,3)
b('LMD7_stage_inert_insert',(0,-158,264),(146,90,6),silver,4)
for side in [-1,1]:
 b('LMD7_wing_rail',(side*191,-140,207),(101,146,24),dk,6)
 b('LMD7_wing_outer_post',(side*249,-140,221),(12,147,48),dk,4)
for x in [-142,142]:
 cyl('LMD7_static_dial',(x,-79,104),57,28,dk,'X')
 for a in range(0,360,45):
  ar=math.radians(a);b('LMD7_dial_rib',(x, -79+27*math.cos(ar),104+27*math.sin(ar)),(19,3,3),cap,1)
b('LMD7_blank_base_console',(0,-298,49),(178,124,48),iv,7)
b('LMD7_console_dark_window',(0,-294,74),(132,79,3),gray,6)
for x in [-39,0,39]:b('LMD7_static_inlay',(x,-305,76),(25,12,1),cap,1)
cyl('LMD7_top_interface_shell',(-53,30,576),67,50,dk,'Z')
cyl('LMD7_top_interface_ring',(-53,30,594),59,20,silver,'Z')
b('LMD7_top_camera_shell',(-53,30,622.8),(64,57,53.6),iv,4)
b('LMD7_top_camera_dark_trim',(-53,30,599),(64,58,8),dk,2)
# Independent fictional graphic board, not Leica controls or stage.
b('Separate_annotation_board',(430,-276,18),(233,211,36),board,8)
b('Synthetic_grid_panel',(430,-276,38),(193,151,5),teal,3)
for i in [-60,-40,-20,0,20,40,60]:
 b('Board_line_dx',(430+i,-276,40.6),(.72,149,.4),iv,.05)
 if abs(i)<60:b('Board_line_dy',(430,-276+i,40.6),(190,.72,.4),iv,.05)
for x in [-34,34]:b('Offline_border_V',(430+x,-269,41),(2.8,55,1.4),gold,.5)
for y in [-27,27]:b('Offline_border_H',(430,-269+y,41),(67,2.8,1.4),gold,.5)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'lmd7.glb'),export_format='GLB',export_apply=True)
