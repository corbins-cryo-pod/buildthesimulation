"""Invitrogen Countess 3 FL AMQAF2000 sealed exterior. Manufacturer MAN0019567 F envelope, cosmetic dimensions inferred. Blender -b -t 1 -P build-model.py."""
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
iv=m('Warm white case',(.78,.77,.71),.15);dk=m('Graphite upper fascia',(.048,.055,.069),.29);vio=m('Trim indigo',(.085,.095,.215),.31);cap=m('Inactive blank screen',(.017,.032,.047),.20);instr=m('Sealed front recess',(.022,.025,.030),.24);gray=m('Warm gray marking',(.22,.25,.24));rub=m('Rubber foot',(.027,.036,.04));teal=m('Separate teaching stand',(.14,.35,.38));gold=m('Authored square tile',(.77,.51,.16));white=m('Card streak',(.72,.77,.71))
def prism(n,profile,x0,x1,ma,r):
 v=[p((x,y,z)) for x in [x0,x1] for y,z in profile];k=len(profile);f=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(ma)
 q=o.modifiers.new('Rounded profile','BEVEL');q.width=r*.001;q.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
prism('Countess_closed_outer_case',[(-76,12),(73,12),(85.09,27),(85.09,199),(76,224),(62,231),(-68,173),(-85.09,158),(-85.09,29)],-121.92,121.92,iv,8)
for x in [-92,92]:
 for y in [-59,59]:cyl('Countess_foot',(x,y,6),23,12,rub,'Z')
prism('Countess_indigo_molding',[(-82,159),(-68,165),(69,224),(80,225),(83,230),(71,236),(55,235),(-69,179),(-83,175)],-117,117,vio,5)
prism('Countess_dormant_fascia',[(-82,166),(-65,174),(73,229),(79,233),(71,238.76),(57,238.76),(-69,185),(-83,180)],-112,112,dk,4)
def panel(n,x,y,z,dx,dy,dz,mat):
 o=b(n,(x,y,z),(dx,dy,dz),mat,3);o.rotation_euler.x=math.radians(22);return o
panel('Countess_blank_display',-4,14,220.7,172,91,3,cap)
b('Countess_sealed_slot_impression',(58,-81.8,169),(69,4,14),instr,3)
b('Countess_blank_front_recess',(-26,-81.8,169),(20,4,10),instr,2)
b('Countess_rear_blank_plate',(0,84.55,118),(173,2.2,60),gray,4)
for x in [-62,-37,-12,13,38,63]:b('Countess_rear_static_detail',(x,85.72,117),(10,.22,24),instr,.1)
text('Countess_brand','Countess 3 FL',0,-85.17,112,15,gray)
text('Countess_badge','Invitrogen',0,-85.17,35,10,gray)
# Not a physical site accessory. The only pick target is the separate offline teaching tile.
b('Offline_badge_board_base',(254,-45,23),(178,147,46),teal,10)
b('Offline_badge_board_top',(254,-45,47),(165,133,9),dk,5)
b('Offline_count_plate',(254,-45,55),(124,91,13),gold,5)
for x in [-35,35]:
 for y in [-24,24]:b('Offline_badge_tile_square',(254+x,-45+y,61.8),(15,15,1),white,1)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'countess-3-fl.glb'),export_format='GLB',export_apply=True)
