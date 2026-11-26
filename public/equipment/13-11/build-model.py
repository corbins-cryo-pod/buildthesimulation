"""Leica EM CPD300 static exterior. Documented 06/12 outline, inferred subparts. Blender -b -t 1 -P build-model.py. Detached teaching cubes have no equipment relationship."""
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
iv=m('White satin shell',(.79,.77,.70),.21);gray=m('Cool offwhite',(.63,.67,.66),.22);dk=m('Charcoal side underframe',(.034,.043,.049),.27);steel=m('Brushed stainless',(.57,.60,.58),.62);glass=m('Dark inactive panel',(.021,.039,.047),.19);red=m('Exterior product badge',(.63,.046,.053));label=m('Charcoal writing',(.14,.16,.17));teal=m('Detached geometry stand',(.15,.39,.39),.18);gold=m('Abstract comparison cube',(.72,.44,.13),.20)
def xprism(n,profile,x0,x1,ma,r):
 v=[p((x,y,z)) for x in [x0,x1] for y,z in profile];k=len(profile);f=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(ma)
 q=o.modifiers.new('Closed perimeter fillet','BEVEL');q.width=r*.001;q.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
xprism('CPD_lower_black_infill',[(-200,12),(270,12),(291.75,37),(291.75,99),(121,86),(-65,59),(-200,20)],-167,167,dk,5)
xprism('CPD_white_outer_skin',[(-291.75,13),(-193,10),(-130,27),(-50,54),(87,79),(291.75,93),(291.75,150),(273,159),(213,159),(159,178),(148,266),(138,286),(-25,286),(-65,273),(-97,187),(-105,147),(-206,137),(-258,119),(-285,94),(-291.75,60)],-170,170,iv,8)
b('CPD_dark_front_seam',(0,-291.8,51),(275,.5,3),dk,.4)
b('CPD_front_plate',(0,-291.2,40),(274,1.4,20),gray,3)
b('CPD_top_static_riser',(0,-151,158),(149,116,70),iv,10)
cyl('CPD_circular_brushed_cover',(0,-154,203),94,24,steel,'Z')
for i in range(30):
 a=math.tau*i/30;o=b('CPD_texture_ridge',(46.3*math.cos(a),-154+46.3*math.sin(a),204),(1.6,1.2,15),steel,.1);o.rotation_euler.z=a
cyl('CPD_front_boss_outer',(0,-210,156),47,10,steel);cyl('CPD_front_boss_inactive_cap',(0,-216,156),34,4,glass)
def sl(n,y,z,dx,dy,dz,ma,r):
 o=b(n,(0,y,z),(dx,dy,dz),ma,r);o.rotation_euler.x=math.radians(-17);return o
sl('CPD_decorative_panel_rim',-79,235,187,10,92,gray,6);sl('CPD_blank_screen',-85,235,160,4,72,glass,4)
b('CPD_rear_accessory_shroud',(79,212,204),(106,142,172),iv,15)
cyl('CPD_closed_rear_upper_canister',(79,210,240),86,185,gray,'Z')
b('CPD_rear_decorative_plate',(-60,289,121),(133,4,50),gray,2)
for i in range(5):b('CPD_rear_decoration_'+str(i),(-95+i*18,291.85,118),(7,.44,29),dk,.5)
for x in [-126,126]:
 for y in [-189,228]:cyl('CPD_ground_foot',(x,y,7),28,14,dk,'Z')
text('CPD_red_badge','Leica',95,-287.7,87,24,red)
text('CPD_model_badge','EM CPD300',76,-291.6,66,11,label)
# Independent math plinth.
b('Offline_card_plinth',(343,-140,32),(231,191,64),teal,9)
b('Offline_cube_plot',(343,-140,65),(210,164,9),dk,7)
b('Offline_unit_cube',(298,-141,97.5),(56,56,56),teal,3)
b('Offline_comparison_cube',(390,-141,97.5),(56,56,56),gold,3)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'cpd300.glb'),export_format='GLB',export_apply=True)
