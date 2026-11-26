"""Editable procedural source. blender -b -P build-model.py; GLB is written alongside this file.
Original reconstruction in millimeters. Manufacturer envelope: folded feet, handle upright.
See the simulator evidence section for sourced vs inferred dimensions. No enclosure internals."""
import bpy,math,os
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
out=Path(__file__).resolve().parent
s=bpy.context.scene;s.unit_settings.system='METRIC'
def m(n,rgb,metal=0):
 a=bpy.data.materials.new(n);a.diffuse_color=(*rgb,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=a.diffuse_color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.38;return a
iv=m('Warm ceramic polymer',(.8,.82,.79));blue=m('Instrument blue',(.022,.285,.465));dark=m('Recess charcoal',(.025,.035,.045));gray=m('Control gray',(.48,.50,.48));steel=m('Brushed steel',(.58,.63,.64),.8);brass=m('BNC gold',(.66,.41,.09),.75);rub=m('Dark grip',(.10,.12,.13));white=m('Silk screen',(.91,.94,.94));colors=[m('CH'+str(i+1),c) for i,c in enumerate([(.99,.71,.03),(.03,.76,.88),(.88,.13,.20),(.24,.68,.19)])]
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
# X width, +Y rear, Z up. glTF export converts to Y up and +Z front.
b('Main_enclosure',(0,1,154.5),(438,176,293),iv,10);b('Rear_blue_shell',(0,87,153),(430,14,271),blue,7)
b('Front_bezel',(0,-84,155),(435,13,281),iv,7)
for sign in [-1,1]:
 b('Side_blue_grille'+str(sign),(sign*218,7,151),(2,131,218),blue,1)
 for i in range(19):
  b('Vent_'+str(sign)+'_'+str(i),(sign*219.3,7,61+i*10),(1,111,3),dark,.3)
 for y in (72,-55):b('Foot_'+str(sign)+'_'+str(y),(sign*159,y,7),(34,35 if y<0 else 56,14),rub,2)
 cyl('Handle_pivot_hub_'+str(sign),(sign*222,0,213),36,10,gray,'X')
 b('Handle_yoke_'+str(sign),(sign*219,0,285),(6,17,141),steel,2)
 b('Handle_upper_bend_'+str(sign),(sign*208,0,352),(29,16,16),gray,4)
b('Handle_spine',(0,0,358),(410,16,13),steel,5);b('Handle_blue_grip',(0,0,358),(379,24,26),blue,6)
b('Display_bezel',(-36,-91,174),(357,4,214),dark,4)
b('Display_active',(-36,-93.1,174),(344.28,.6,193.66),dark)
text('Series_label','6 SERIES   /   MIXED SIGNAL OSCILLOSCOPE',56,-93.2,276,3.5,white);text('Model_mark','MSO64B',-195,-91.5,52,4,dark)
for j,x in enumerate([-156,-79,-2,75]):
 idx=j+1;b('Flex_'+str(idx)+'_recess',(x,-92,43),(25,5,38),dark,3)
 b('Flex_'+str(idx)+'_smart_contacts',(x,-95.3,56),(15,2,6),brass,1)
 cyl('Flex_'+str(idx)+'_barrel',(x,-97,39),15,9,brass);cyl('Flex_'+str(idx)+'_dielectric',(x,-101.7,39),10,1,iv);cyl('Flex_'+str(idx)+'_center',(x,-102.4,39),2.4,1,brass)
 b('Channel_stripe_'+str(idx),(x,-91.5,64),(24,1,1.8),colors[j]);text('Channel_label_'+str(idx),str(idx),x-16,-92,64,4,dark)
cyl('Power_key',(-196,-94,31),12,4,gray);cyl('Aux_in',(117,-95,40),7,5,brass)
for i,x in enumerate((155,179,202)):b('USB_Front_'+str(i),(x,-91.6,27),(15,2,5),blue if i==0 else dark,1)
for z in (51,61):cyl('Comp_post_'+str(z),(199,-95,z),4,8,brass)
text('Comp_label','PROBE COMP',186,-91.5,70,3,dark)
b('Controls_field',(178,-91,181),(67,2,195),gray,1)
for x,z,r,n in [(157,246,18,'Multifunction_A'),(157,216,18,'Multifunction_B'),(194,232,13,'Trigger_level'),(159,183,13,'Vertical_position'),(159,153,18,'Vertical_scale'),(159,118,12,'Horizontal_position'),(159,95,14,'Timebase_scale'),(194,110,17,'Zoom')]:
 cyl(n+'_ring',(x,-93,z),r+2,3,colors[0] if n in ('Trigger_level','Vertical_scale') else dark);o=cyl(n,(x,-99,z),r,12,gray);b(n+'_index',(x,-105,z+r*.25),(1.2,.2,r*.27),dark)
for n,label,x,z in [('Run_key','RUN',158,269),('Single_key','SINGLE',194,269),('Force','FORCE',187,248),('Slope','SLOPE',193,217),('Mode','MODE',193,206)]:
 b(n,(x,-94,z),(19,4,8),iv,1);text(n+'_text',label,x,-96.2,z,2.6,dark)
for z,l in [(198,'VERTICAL'),(129,'HORIZONTAL')]:
 b('Separator_'+l,(178,-92.4,z),(62,1,6),dark);text(l+'_legend',l,178,-93,z,3.2,white)
for j in range(4):
 z=187-13*j;b('Select_CH'+str(j+1),(194,-94,z),(18,4,9),colors[j],1);text('Select_CH_label'+str(j+1),str(j+1),194,-96.2,z,4,dark)
# Rear connectivity field: addresses only; actuator strokes or exact port-to-port spacing not documented.
b('Rear_IO_panel',(52,95,121),(198,3,103),blue,2)
for i,(n,x) in enumerate([('REF_IN',42),('AUX_OUT',83),('AFG_option_blank',125)]):
 cyl(n,(x,97,151),12,5,steel if i<2 else dark);text(n+'_legend',n,x,97.2,164,3.5,white,True)
b('IEC_power',(-15,96,151),(35,5,23),dark,1)
for k,(n,x,z,w,h) in enumerate([('Ethernet',-7,116,19,15),('USB_2_pair',-7,95,18,10),('USB_3_pair',21,95,18,10),('USBTMC',45,95,13,12),('DisplayPort',72,95,15,9),('DVI',121,95,32,12),('VGA',121,114,25,10)]):
 b(n,(x,96.9,z),(w,3,h),dark,1)
for i in range(24):b('Rear_cooling_'+str(i),(-133+i%12*7.5,94.3,95+(i//12)*65),(3,1,46),dark,.5)
# A detachable passive probe assembly; hanging lead is shortened for inspection, not a cable-length claim.
b('Probe_CH1_TekVPI',(-156,-115,43),(24,27,36),rub,3);tube('Probe_CH1_lead',[(-156,-124,32),(-156,-147,15),(-132,-183,8),(-10,-200,6),(107,-151,17),(152,-142,33)],3.8,rub)
tube('Probe_CH1_barrel',[(149,-144,31),(176,-117,48)],8.5,dark);tube('Probe_CH1_tip',[(176,-117,48),(199,-99,61)],2,steel)
# Convert text/curves to meshes; limit font outlines for efficient download.
for o in list(s.objects):
 if o.type in ('FONT','CURVE'):
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'mso64b.glb'),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
