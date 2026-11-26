"""Applied Biosystems QuantStudio 3 sealed exterior only, OEM unpacked cabinet envelope; no equipment functions. Blender -b -t 1 -P build-model.py."""
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
iv=m('Warm offwhite panel',(.78,.77,.70),.20);pale=m('Slightly warm offwhite face',(.83,.82,.75),.17);dk=m('Inactive graphite surround',(.036,.048,.063),.28);vio=m('Exterior indigo surround',(.075,.091,.211),.35);cap=m('Blank monitor glass',(.014,.024,.038),.20);gray=m('Blank rear molding',(.32,.38,.38),.34);rub=m('Rubber ground contact',(.034,.041,.044));teal=m('Separate teaching board',(.12,.35,.39),.18);gold=m('Independent geometric mark',(.76,.48,.14));white=m('Teaching datum highlight',(.82,.82,.70));ink=m('Muted slate product label',(.18,.21,.23))
def xprism(n,profile,x0,x1,ma,r):
 v=[p((x,y,z)) for x in [x0,x1] for y,z in profile];k=len(profile);f=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(ma)
 q=o.modifiers.new('Rounded outer profiles','BEVEL');q.width=r*.001;q.segments=5;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
pr=[(-237,31),(219,31),(250,51),(250,370),(231,400),(-91,400),(-122,391),(-181,333),(-236,279),(-246,261),(-246,69),(-246,51)]
xprism('QS3_closed_case',pr,-135,135,iv,13)
for x in [-100,100]:
 for y in [-172,178]:cyl('QS3_case_foot',(x,y,15.5),34,31,rub,'Z')
# Inferred decorative front and fixed dark upper slope; no access or internals.
b('QS3_closed_lower_apron',(0,-237,138),(237,26,208),pale,22)
b('QS3_closed_lower_apron_inset',(0,-250.08,113),(193,.3,115),iv,18)
b('QS3_decorative_front_seam',(0,-250.28,178),(190,.30,2.2),gray,.35)
b('QS3_closed_fascia_pocket',(-79,-250.25,202),(19,.45,8),cap,1)
text('QS3_product_mark','QuantStudio 3',17,-250.4,207,17,ink)
text('QS3_badge','Applied Biosystems',0,-250.4,72,8,ink)
# Fascia slope follows the catalog photo, with a deliberately blank display.
def face(n,y,z,dx,dy,dz,ma,r):
 o=b(n,(0,y,z),(dx,dy,dz),ma,r);o.rotation_euler.x=math.radians(40);return o
face('QS3_indigo_fascia',-175,338,241,171,11,vio,17)
face('QS3_dormant_graphite_fascia',-178,341,222,153,9,dk,15)
face('QS3_blank_screen',-183,346,167,122,4,cap,11)
b('QS3_rear_unpowered_plate',(0,248.5,151),(175,3.3,107),gray,8)
for x in [-62,-41,-20,1,22,43,64]:
 b('QS3_rear_relief',(x,250.25,160),(8,.4,37),dk,1)
# Independent classroom marker; dimensions intentionally unrelated to the case.
b('Offline_card_stand',(307,-123,54),(235,211,108),teal,13)
b('Offline_static_top', (307,-123,109),(217,198,9),dk,8)
b('Offline_geometry_card',(307,-123,118),(169,158,12),gray,4)
def line(n,p1,p2,mat=gold):
 x1,y1=p1;x2,y2=p2;o=b(n,((x1+x2)/2,(y1+y2)/2,125),(math.hypot(x2-x1,y2-y1),4,2),mat,.4);o.rotation_euler.z=math.atan2(y2-y1,x2-x1)
v=[(267,-163),(347,-163),(267,-103)]
for i in range(3):
 line('Offline_annotated_triangle_edge_'+str(i),v[i],v[(i+1)%3]); b('Offline_annotated_vertex_'+str(i),(v[i][0],v[i][1],126),(7,7,3),white,.8)
line('Offline_flat_edge',(267,-133),(347,-133))
for i,x in enumerate([267,317,347]):b('Offline_flat_vertex_'+str(i),(x,-133,126),(7,7,3),white,.8)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'quantstudio3.glb'),export_format='GLB',export_apply=True)
