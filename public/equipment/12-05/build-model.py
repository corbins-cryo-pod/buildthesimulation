"""Cited CSU-W1 horizontal T1 / nominal Nikon Eclipse Ti-E exterior. Static assemblies only; three separate data-plane cards. Blender -b -t 1 -P build-model.py."""
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
iv=m('Warm ivory cast finish',(.74,.72,.65),.22);dk=m('Charcoal finish',(.023,.034,.047),.31);gray=m('Gray shell',(.30,.34,.36),.26);steel=m('Brushed adapter',(.48,.52,.55),.63);glass=m('Black blank caps',(.015,.030,.035),.30);amber=m('Amber graphic',(.72,.45,.10));purple=m('Slate-blue teaching holder',(.12,.17,.29));badge=m('Warm gray branding',(.41,.42,.41));teal=m('Plane 0',(.12,.55,.52));blue=m('Plane 1',(.14,.42,.77));vio=m('Plane 2',(.54,.28,.66))
# Older Yokogawa bulletin 80C01D01-01E pp. 9–10; named envelope includes foot/adapter silhouettes.
def chamfercase(n,x0,x1,y0,y1,top,base,cut,mat):
 poly=[(x0,base),(x1,base),(x1,top-cut),(x1-cut,top),(x0,top)]
 vs=[p((x,y,z)) for y in (y0,y1) for x,z in poly];faces=[tuple(range(5)),tuple(reversed(range(5,10)))]+[(i,i+5,(i+1)%5+5,(i+1)%5) for i in range(5)]
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],faces);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(mat);q=o.modifiers.new('Edge round','BEVEL');q.width=.003;q.segments=3;return o
chamfercase('T1_vintage_conformal_shell',-500,-94,-163.5,163.5,252,22,81,iv)
chamfercase('T1_charcoal_front',-498,-97,-164.2,-157,242,24,75,dk)
b('T1_lower_plinth',(-297,0,15),(397,319,20),gray,4)
for x in [-472,-133]:
 for y in [-138,138]:cyl('T1_support_foot', (x,y,5),15,10,dk,'Z')
cyl('T1_camera_adapter_shell',(-516, -47,158),80,32,dk,'X');cyl('T1_camera_adapter_ring',(-534,-47,158),70,8,steel,'X');cyl('T1_camera_adapter_cap',(-538,-47,158),56,4,glass,'X')
cyl('T1_scope_adapter_shell',(-78,18,103),63,32,dk,'X');cyl('T1_scope_adapter_ring',(-63,18,103),57,6,steel,'X')
b('T1_unpowered_panel',(-376,-164.6,176),(180,1,59),gray,3);text('T1_model_mark','CSU-W1',-376,-165.2,179,24,iv);text('T1_static_brand','YOKOGAWA',-376,-165.2,157,9,iv)
b('T1_badge',(-388,-164.6,225),(47,1,11),amber,1)
for x in [-457,-422,-387,-352,-317,-282]:
 b('T1_rear_outline', (x,163,70),(12,1,52),dk,1)
# Nikon ECLIPSE Ti series vendor photo, housing and stage scale inferred, not Ti2.
b('TiE_lower_main_casting',(171,37,82),(315,445,129),iv,21)
b('TiE_base_skirt',(171,42,28),(304,431,37),dk,9)
b('TiE_rear_column',(195,181,229),(157,146,333),iv,30)
b('TiE_throat_underside',(180,128,142),(215,166,104),dk,9)
o=b('TiE_upper_cantilever',(195,94,405),(176,283,61),iv,18);o.rotation_euler.y=math.radians(-4)
cyl('TiE_passive_condenser_silhouette',(195,-19,350),83,67,dk,'Z')
cyl('TiE_condenser_endcap',(195,-19,308),61,20,gray,'Z')
b('TiE_tray_stage',(183,-25,228),(238,178,22),dk,8)
b('TiE_stage_inlay',(183,-25,241),(102,76,4),gray,3)
cyl('TiE_under_stage_turret',(184,-23,182),142,38,dk,'Z')
for x,y,z in [(145,-24,214),(217,-16,208),(179,26,204)]:
 cyl('TiE_fixed_objective_shape',(x,y,z),34,38,steel,'Z');cyl('TiE_static_endcap',(x,y,z+18),27,7,dk,'Z')
b('TiE_binocular_collar',(179,-191,147),(138,90,54),iv,10)
for x in [139,218]:
 o=cyl('TiE_eyepiece_housing',(x,-232,187),34,87,dk,'Z');o.rotation_euler.x=.65
 o=cyl('TiE_eyepiece_rubber',(x,-261,222),44,21,dk,'Z');o.rotation_euler.x=.65
for x in [7,338]:
 cyl('TiE_inert_side_knob',(x,-45,108),68,28,dk,'X')
 cyl('TiE_inert_inner_dial',(x+(-16 if x<100 else 16),-45,108),40,12,gray,'X')
b('TiE_side_attachment',(11,18,106),(26,60,56),dk,5);b('Nominal_passive_T1_to_TiE_transition',(-23,18,103),(75,60,60),dk,7)
text('TiE_badge','Nikon Ti-E',181,-186.5,95,22,badge)
# A deliberately separate stand for viewing synthetic data: not part of either product.
b('Fictional_data_plane_pedestal',(173,-434,26),(311,135,49),purple,7)
for i,(x,ma) in enumerate(zip([79,173,267],[teal,blue,vio])):
 b('Synthetic_plane_card_'+str(i),(x,-446,55),(78,79,12),ma,5)
 for j in [-24,0,24]:
  b('Fictional_grid_h_'+str(i)+'_'+str(j),(x,-446+j,61),(68,1.3,1),iv,.1)
  b('Fictional_grid_v_'+str(i)+'_'+str(j),(x+j,-446,61),(1.3,68,1),iv,.1)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'csu-w1-tie.glb'),export_format='GLB',export_apply=True)
