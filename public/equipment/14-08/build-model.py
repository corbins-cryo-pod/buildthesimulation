"""TA Instruments Q20 manual-pan configuration from ITE photo and TA installation specification. Blender -b -t 1 -P build-model.py. Metres, +Z glTF toward operator."""
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
case=m('Powder-coated blue',(.145,.255,.39));trim=m('Bright blue edge',(.21,.34,.49));graph=m('Rear cabinet graphite',(.081,.088,.094));dark=m('Panel graphite',(.035,.038,.045));rub=m('Rubber feet',(.021,.024,.029));silver=m('Machined metal',(.55,.56,.56),.65);cell=m('Heat shield',(.74,.71,.58),.55);pan=m('Aluminium pan',(.70,.73,.74),.78);white=m('Control labels',(.86,.88,.88));green=m('Power indicator',(.11,.73,.22));red=m('Status indicator',(.83,.14,.12));puck=m('Synthetic blue specimen',(.13,.57,.65))
b('Base_casting',(0,0,46),(460,558,82),case,19);b('Front_lip',(0,-271,51),(456,16,40),trim,7);b('Rear_electronics_cabinet',(0,139,231),(438,269,358),graph,14);b('Rear_panel_inset',(0,274,197),(391,12,250),dark,6);b('Cabinet_top',(0,129,398),(435,275,24),graph,7);b('Front_furnace_module',(-96,-129,152),(249,275,179),case,15);b('Furnace_top_plate',(-96,-125,237),(248,275,19),trim,6);b('Convenience_tray',(122,-123,93),(190,270,35),graph,8);b('Tray_insert',(125,-119,111),(175,236,5),dark,6)
for x in [-188,188]:
 for y in [-235,229]:cyl('Foot_'+str((x,y)),(x,y,4),39,8,rub,'Z')
b('Control_plate',(0,-279.1,40),(304,1,33),dark,.45)
for n,x,ma in [('Control_power',-84,green),('Control_status',-59,red),('Control_ready',-104,white)]:cyl(n,(x,-279.7,40),10,.5,ma)
# Back hardware is iconographic, not measured.
for z in [229,238,247,256,265,274,283]:
 b('Rear_vent_'+str(z),(-112,279.35,z),(98,1.2,3),rub,1)
for n,x in [('Rear_mains',126),('Rear_control',163),('Rear_purge',78)]:
 b(n,(x,279.35,125),(21,1.2,18),silver,2)
b('Tray_forceps_A',(107,-183,122),(86,2,3),silver,1).rotation_euler.z=.14;b('Tray_forceps_B',(107,-179,122),(86,2,3),silver,1).rotation_euler.z=.06
X,Y=-94,-122
cyl('Furnace_boss',(X,Y,250),156,25,case,'Z');cyl('Furnace_annulus',(X,Y,264),140,8,silver,'Z');cyl('Furnace_inner_recess',(X,Y,269),110,3.5,dark,'Z');cyl('Exposed_cell_deck',(X,Y,271),94,3.5,cell,'Z')
for a in range(28):
 t=2*math.pi*a/28; o=b('Shield_fin_'+str(a),(X+64*math.cos(t),Y+64*math.sin(t),269),(9,2.1,2.8),dark,.4);o.rotation_euler.z=t
for n,x in [('Sample',X-22),('Reference',X+22)]:
 cyl(n+'_platform',(x,Y,274),23,5.7,silver,'Z');cyl(n+'_pan',(x,Y,278),17,3.4,pan,'Z')
cyl('Sample_charge',(X-22,Y,280.3),13,1.4,puck,'Z')
lid=bpy.data.objects.new('Lid_manual_slide_pivot',None);s.collection.objects.link(lid);lid.location=p((X,Y,299))
for n,z,d,dep,ma in [('Lid_lower',280,121,16,cell),('Lid_cap',291,109,27,cell),('Lid_shoulder',307,91,9,cell),('Lid_knob_stem',317,14,15,dark),('Lid_knob',325,32,8,dark)]:
 o=cyl(n,(X,Y,z),d,dep,ma,'Z');o.parent=lid;o.location=p((0,0,z-299))
# Lab-label outline only; device photo is linked, not incorporated.
c=bpy.data.curves.new('Label','FONT');c.body='Q20';c.size=.023;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=2;o=bpy.data.objects.new('Q20_mark',c);s.collection.objects.link(o);o.location=p((25,-279.9,40));o.rotation_euler.x=math.pi/2;c.materials.append(white)
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'q20.glb'),export_format='GLB',export_apply=True)
