"""West-Bond 7700E as photographed at UC Davis; enclosure and accessory dimensions inferred. Blender -b -t 1 -P build-model.py. GLB metres, +Z toward operator."""
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
iv=m('Warm white painted chassis',(.71,.73,.69));face=m('Brushed gray panels',(.36,.41,.43),.55);dk=m('Anodized and keyboard',(.037,.046,.055));metal=m('Brushed metal',(.51,.56,.59),.65);blue=m('Optical glass',(.045,.12,.14),.5);cork=m('Visible workholder surround',(.34,.22,.12));gold=m('Pad gold',(.92,.56,.10),.68);chip=m('Silicon die',(.085,.12,.17),.23);pcb=m('Coupon laminate',(.15,.265,.17));cer=m('Capillary ceramic',(.78,.81,.75));green=m('LCD',(.33,.56,.075))
b('Left_stacking_foot',(-142,4,25),(220,369,32),iv,10)
for n,z,h in [('Thermal_controller',88,74),('Control_main',186,115),('Wire_unit',276,52),('Top_module',333,51)]:
 b(n,(-148,12,z),(194,246,h),iv,8);b(n+'_face',(-148,-112,z),(177,3,h-14),face,2)
b('LCD_7700E',(-134,-115,207),(121,3,23),green,2)
for i in range(5):cyl('Selector_'+str(i),(-211+i*30,-117,167),12,7,metal)
for z in [274,334]:
 for x in [-108,-74]:cyl('Aux_switch_'+str(z)+str(x),(x,-116,z),14,8,metal)
b('Open_throat_bridge',(44,63,257),(217,180,45),iv,8);b('Right_support',(168,18,192),(62,175,140),iv,8)
b('Workholder_base',(72,-112,22),(264,278,44),iv,10);b('Stage_metal',(72,-112,46),(252,266,7),metal,4);cyl('Stage_adjust_knob',(72,-257,25),19,17,metal)
cyl('Heater_mount',(72,-135,59),63,21,iv,'Z');b('Workholder_cork',(72,-135,73),(103,107,18),cork,5);b('Heater_plate',(72,-135,85.5),(88,97,7),metal,2)
b('Microscope_bracket',(73,3,234),(123,78,39),iv,7)
o=b('Stereo_binocular_body',(107,-58,260),(124,110,82),iv,22);o.rotation_euler.x=.14
for x in [80,130]:
 cyl('Eyepiece_housing_'+str(x),(x,-112,270),38,39,dk);cyl('Eyepiece_glass_'+str(x),(x,-132,270),23,2,blue)
for x in [44,164]:cyl('Scope_focus_'+str(x),(x,-28,245),36,20,dk,'X')
cyl('Stereo_objective',(108,-59,203),77,38,dk,'Z');cyl('Objective_shield',(108,-59,183),87,13,iv,'Z')
cyl('Spool_flange_rear',(30,58,279),59,8,iv,'X');cyl('Wire_spool',(34,58,279),50,25,gold,'X');cyl('Spool_flange_front',(48,58,279),59,7,iv,'X')
o=b('Manipulator_lever',(184,-104,114),(4,4,118),metal,1);o.rotation_euler=(.42,-.28,0)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=.013,location=p((200,-129,64)));finish('Manipulator_ball',iv)
head=bpy.data.objects.new('Capillary_Z_pivot',None);s.collection.objects.link(head);head.location=p((72,-135,95))
for n,z,d,h,ma in [('Capillary',7.9375,1.3,15.875,cer),('Tool_collet',17,8,9,metal),('Transducer',27,18,14,dk)]:
 o=cyl(n,(72,-135,95+z),d,h,ma,'Z');o.parent=head;o.location=p((0,0,z))
b('Head_mount',(72,-88,148),(49,55,36),iv,4)
# Fixed coupon coordinate frame: (72 mm X, 89 mm Y up, 135 mm +Z) in the GLB.
b('Carrier_coupon',(72,-136,89),(8,7,.9),pcb,.1);b('Die',(72,-134.6,89.626),(2.2,1.6,.35),chip,.04)
for tag,dx in [('A',-.45),('B',.45)]:
 b('D_'+tag,(72+dx,-135,89.803),(.1,.1,.004),gold)
 b('C_'+tag,(72+dx,-137.4,89.454),(.13,.13,.004),gold)
for k in range(3):b('Rear_feature_'+str(k),(-207+k*32,136,186),(15,2,8),dk,1)
bpy.ops.export_scene.gltf(filepath=str(out/'west-bond-7700e.glb'),export_format='GLB',export_apply=True)
