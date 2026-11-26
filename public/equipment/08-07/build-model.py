"""EVG 810, UC Davis photographic layout, inferred rack/enclosure sizes and manual-access teaching scene. Blender -b -t 1 -P build-model.py. Metres, +Y up, +Z toward operator."""
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
ch=m('Charcoal frame',(.064,.071,.071));slot=m('Black coated cabinetry',(.028,.032,.036));light=m('Service cabinet beige',(.64,.65,.61));metal=m('Stainless/aluminium',(.61,.66,.67),.66);dark=m('Graphite monitor',(.032,.043,.047));screen=m('Inactive display',(.036,.097,.081));led=m('Green ready lamp',(.20,.63,.21));amber=m('Label ocher',(.62,.43,.15));blue=m('Inert fixture marker face A',(.12,.39,.58));lav=m('Inert fixture marker face B',(.51,.31,.58));wafer=m('Synthetic silicon wafer',(.25,.30,.36),.55)
b('Lower_chamber_cabinet',(0,0,360),(740,690,700),slot,18);b('Equipment_real_footprint_reference',(0,0,20),(735,685,40),ch,8);b('Front_cabinet_door',(0,-349,349),(688,16,637),slot,12);b('Cabinet_latch',(271,-365,385),(30,24,122),metal,7)
for x in [-354,354]:
 for y in [-326,326]:b('Frame_upright_'+str(x)+str(y),(x,y,1313),(39,39,1236),ch,5)
for y in [-326,326]:
 for z in [706,1918]:b('Frame_span_'+str(y)+str(z),(0,y,z),(735,40,42),ch,5)
for x in [-354,354]:
 for z in [706,1918]:b('Frame_side_'+str(x)+str(z),(x,0,z),(40,680,42),ch,5)
glass=m('Transparent inspection enclosure',(.69,.87,.86));nodes=glass.node_tree;bs=nodes.nodes.get('Principled BSDF');bs.inputs['Alpha'].default_value=.11
for x in [-353,353]:b('Inspection_side_'+str(x),(x,0,1324),(4,630,1150),glass)
b('Inspection_back',(0,323,1324),(673,4,1150),glass);b('Open_front_viewport',(0,-326,1571),(669,4,658),glass)
b('Equipment_deck',(0,0,715),(685,630,33),metal,6)
for i in range(22):b('Deck_channel_'+str(i),(i*28-294,-102,734),(4,340,.8),ch)
b('Rack_accessory',(-699,60,602),(565,583,1190),light,12);b('Rack_door_frame',(-699,-241,606),(535,22,1110),light,13);b('Rack_dark_panel',(-693,-256,620),(387,7,917),dark,9);b('Rack_door_latch',(-918,-272,583),(30,26,132),ch,9)
for z in [305,448,589,719,843]:b('Rack_shelf_face_'+str(z),(-693,-261,z),(356,8,83),metal,3)
for i in range(8):cyl('Rack_knob_'+str(i),(-851+35*i,-269,719),12,15,led if i in [0,2,6] else ch)
b('Monitor_articulation',(367,-49,1124),(339,38,40),metal,7);b('Monitor_post',(496,1,1105),(43,43,692),ch,8);b('Monitor_pedestal',(494,-76,1205),(48,166,42),metal,6)
b('Monitor_housing',(485,-218,1390),(445,47,325),dark,12);b('Monitor_bezel',(485,-248,1390),(422,15,303),light,6);b('Monitor_screen',(485,-257,1390),(388,5,266),screen,5)
b('Console_shelf',(500,-335,986),(487,252,22),metal,8);b('Console_keyboard',(477,-361,1004),(291,145,16),light,5)
for row in range(4):
 for col in range(12):b('Console_key_'+str(row)+'_'+str(col),(357+col*20.4,-321-row*26,1013),(15,15,2.8),ch,.4)
b('Console_trackball_mount',(673,-365,1007),(68,60,22),light,6)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,radius=.016,location=p((674,-365,1022)));finish('Console_trackball',dark)
# Height and clearances inferred; 150 mm wafer drawn at precise diameter.
cyl('Reaction_chamber_base',(-116,-88,834),270,186,metal,'Z');cyl('Stage_flange',(-116,-88,932),320,29,metal,'Z');cyl('Chamber_recess',(-116,-88,949),236,4,slot,'Z');cyl('Wafer_carrier',(-116,-88,956),181,10,ch,'Z')
for i in range(3):
 t=2*math.pi*i/3;cyl('Chuck_pin_'+str(i),(-116+84*math.cos(t),-88+84*math.sin(t),963),4,8,metal,'Z')
holder=bpy.data.objects.new('Wafer_flip_pivot',None);s.collection.objects.link(holder);holder.location=p((-116,-88,965))
for n,z,diam,thick,mat in [('Wafer_body',0,150,1.25,wafer),('Wafer_face_A',.67,149.9,.10,blue),('Wafer_face_B',-.67,149.9,.10,lav)]:
 o=cyl(n,(-116,-88,965+z),diam,thick,mat,'Z');o.parent=holder;o.location=p((0,0,z))
h=bpy.data.objects.new('Chamber_head_slide',None);s.collection.objects.link(h);h.location=p((-116,-88,1001))
for n,z,diam,ht,mat in [('Chamber_lid',0,270,68,metal),('Lid_upper_ring',36,219,18,ch),('Lid_drop_arm',79,75,75,metal)]:
 o=cyl(n,(-116,-88,1001+z),diam,ht,mat,'Z');o.parent=h;o.location=p((0,0,z))
# Annular perimeter bridges the seal gap without filling the teaching sample cavity.
vertices=[];faces=[];N=64
for radius,z in [(135,-55),(135,-33),(117,-33),(117,-55)]:
 for i in range(N):
  t=2*math.pi*i/N;vertices.append(p((radius*math.cos(t),radius*math.sin(t),z)))
for j in range(4):
 for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,((j+1)%4)*N+(i+1)%N,((j+1)%4)*N+i))
me=bpy.data.meshes.new('Seal ring');me.from_pydata(vertices,[],faces);me.update();o=bpy.data.objects.new('Lid_seal_ring',me);s.collection.objects.link(o);o.parent=h;me.materials.append(ch)
b('Lift_column',(-116,129,1143),(77,53,809),metal,5);b('Lift_brace',(-116,36,1258),(61,189,28),metal,5)
bpy.ops.export_scene.gltf(filepath=str(out/'evg810.glb'),export_format='GLB',export_apply=True)
