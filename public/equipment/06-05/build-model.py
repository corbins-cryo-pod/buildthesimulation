"""Inovenso NE200, July 2022 product sheet: sealed visual reference only, no internals. Blender -b -t 1 -P build-model.py."""
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
iv=m('Metallic gray exterior',(.55,.59,.60),.38);steel=m('Brush-finished highlights',(.49,.54,.56),.61);dk=m('Graphite hinge shapes',(.035,.046,.053),.28);fog=m('Opaque smoked blank window',(.10,.17,.19),.24);cap=m('Unpowered fascia glass',(.022,.036,.048),.18);blue=m('Blue product mark',(.085,.33,.57));amber=m('Inactive exterior amber',(.77,.56,.10));red=m('Inactive decorative red',(.66,.050,.046));white=m('Nameplate white',(.82,.81,.75));gray=m('Blank rear break panel',(.30,.34,.37),.41);teal=m('Separate teaching board',(.15,.36,.39));gold=m('Independent rectangle',(.71,.47,.17))
def xprism(n,profile,x0,x1,ma,r):
 v=[p((x,y,z)) for x in [x0,x1] for y,z in profile];k=len(profile);f=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(ma)
 q=o.modifiers.new('Edge rounds','BEVEL');q.width=r*.001;q.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
b('NE200_rear_and_sides',(0,140,513),(766,395,942),iv,12)
b('NE200_enclosed_lower_plinth',(0,55,96),(754,536,145),iv,15)
xprism('NE200_slanted_fascia',[(-339.8,35),(-299,21),(-120,22),(-134,229),(-242,244)],-385,385,iv,7)
b('NE200_roof',(0,5,970),(770,643,34),iv,9)
for x in [-332,332]:
 for y in [-253,264]:cyl('NE200_ext_foot',(x,y,12),49,24,dk,'Z')
b('NE200_fixed_front_assembly',(0,-233,603),(729,68,687),iv,11)
b('NE200_opaque_front_window',(0,-268,632),(528,4,446),fog,13)
b('NE200_front_window_light_streak',(-215,-271,665),(12,.8,360),gray,1)
for x in [-326,326]:
 b('NE200_sealed_hinge_shape',(x,-270,924),(39,8,43),dk,5)
 b('NE200_fixed_rail_end',(x,-279,357),(36,22,65),dk,5)
cyl('NE200_static_horizontal_handle',(0,-288,345),27,657,steel,'X')
b('NE200_opaque_right_glazing',(383,86,629),(4,331,415),fog,14)
b('NE200_opaque_left_glazing',(-383,86,629),(4,331,415),fog,14)
b('NE200_static_right_relief',(384,76,287),(2,317,77),gray,1)
for y in [-39,4,47,90,133,176]:
 b('NE200_blank_right_relief_detail',(384.9,y,286),(.8,24,33),dk,.1)
def panel(n,x,y,z,dx,dy,dz,ma):
 o=b(n,(x,y,z),(dx,dy,dz),ma,5);o.rotation_euler.x=math.radians(-23);return o
panel('NE200_blank_fascia_panel',0,-298,139,619,10,165,gray)
panel('NE200_unpowered_screen',-162,-305,146,239,12,132,cap)
for i,x in enumerate([17,73,129,190,252]):
 o=cyl('NE200_decorative_fascia_detail',(x,-304,135),22 if i<4 else 44,17,red if i==4 else (amber if i==0 else dk));o.rotation_euler.x=math.radians(67)
cyl('NE200_top_beacon_base',(131,188,995),79,13,dk,'Z')
cyl('NE200_inactive_amber_beacon',(131,188,1018.25),61,43.5,amber,'Z')
for i in range(10):b('NE200_rear_blank_rib',(-227+i*50,337.05,345),(20,1.8,228),dk,1)
text('NE200_model_name','NE200',243,-269.6,892,29,blue)
# A physically independent educational stand. These shapes have no scale relationship to the cabinet.
b('Offline_rectangle_stand',(648,-98,262),(289,279,524),teal,13)
b('Offline_rectangle_board',(648,-98,528),(264,238,19),dk,7)
b('Offline_gold_rect',(648,-98,542.5),(100,100,10),gold,3)
for x in [-100,-50,0,50,100]:b('Offline_engraved_tick',(648+x,-186,538),(2,24,1),white,.1)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'ne200.glb'),export_format='GLB',export_apply=True)
