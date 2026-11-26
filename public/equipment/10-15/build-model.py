"""A-M Systems Model 2100 nonpowered visual reference. Nominal enclosure from archived A-M Systems dimensions; separate not-connected fictional mechanical tokens. Blender -b -t 1 -P build-model.py. Metres +Y up +Z toward operator."""
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
b('Nominal_enclosure',(0,0,68),(432,286,106),satin,3)
for x in [-162,162]:
 for y in [-104,104]:cyl('Foot_'+str(x)+str(y),(x,y,7.5),29,15,rub,'Z')
b('Face_inlay',(0,-142,67),(423,2,97),iv,1)
for x in [-198,198]:
 tube('Exterior_handle_'+str(x),[(x,-144,26),(x,-155,29),(x,-155,99),(x,-144,105)],6,metal)
for i,x in enumerate([-139,-77,-14,50,129]):
 cyl('Static_face_knob_'+str(i),(x,-144,87),23 if i<4 else 21,13,metal)
 if i<4:
  b('Static_readout_'+str(i),(x,-143,51),(53,2.8,24),dk,2)
  for j in range(4):
   b('Static_level_'+str(i)+'_'+str(j),(x-17+j*11,-145,52),(9,3,15),dk,1)
   b('Static_glyph_'+str(i)+'_'+str(j),(x-17+j*11,-146.7,52),(3,.3,7),white,.1)
for x,z in [(-177,88),(-177,66),(-177,45),(-160,88),(18,100),(18,75),(18,48),(95,89),(95,73),(170,104),(170,89)]:
 cyl('Static_panel_feature_'+str(x)+str(z),(x,-143,z),7,4,metal if z<90 else dk)
for x in [99,132]:cyl('Static_lower_dial_'+str(x),(x,-145,49),21,16,metal)
for z,ma in [(66,red),(51,dk)]:cyl('Decorative_jack_shape_'+str(z),(170,-144,z),11,7,ma)
b('Static_status_window',(184,-144,58),(12,3,22),green,1)
for x in [-156,-96,-36,24,84,144]:
 for j in range(3):b('Rear_outline_'+str(x)+str(j),(x+j*8,142,60),(5,2.2,31),dk,.6)
text('Model_mark','A-M SYSTEMS  /  MODEL 2100',-45,-144,24,12,ink)
# Separate board: no connection with the device, no real connector type or pins.
b('Separate_training_board',(326,-82,13),(169,158,26),toy,5)
cyl('Round_training_slot',(326,-133,26),31,4,cyan,'Z');cyl('Round_recess',(326,-133,28.2),20,1,dk,'Z')
b('Square_training_slot',(326,-58,26),(28,28,4),yellow,2);b('Square_recess',(326,-58,28.2),(19,19,1),dk,1)
cyl('Round_sim_token',(369,-134,28),18,10,cyan,'Z');b('Square_sim_token',(369,-59,28),(18,18,10),yellow,1.5)
for n,xx,yy,ma in [('Round',369,-134,cyan),('Square',369,-59,yellow)]:
 tube(n+'_passive_lead',[(xx,yy,29),(395,yy,24),(404,yy+14,13),(399,yy+26,9),(389,yy+33,9)],4,ma)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'am2100.glb'),export_format='GLB',export_apply=True)
