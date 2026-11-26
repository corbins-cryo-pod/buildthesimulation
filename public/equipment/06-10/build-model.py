"""Original custom dry bench concept; no process apparatus. Nominal design dimensions, common 60×30-inch tabletop class. Blender -b -t 1 -P build-model.py."""
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
silver=m('Satin silver top finish',(.49,.53,.54),.67);slate=m('Tone-matched gray frame',(.21,.26,.29),.31);iv=m('Soft ivory drawer finish',(.65,.64,.57),.17);dk=m('Dark floor contact',(.030,.043,.048),.22);steel=m('Brushed drawer pulls',(.46,.51,.53),.65);teal=m('Detached exhibit stand',(.14,.36,.40),.23);gold=m('Detached footprint outline',(.76,.48,.13));grass=m('Frame green',(.19,.50,.45));white=m('Etched face marking',(.77,.81,.76))
b('Dry_bench_empty_top',(0,0,891.4),(1524,762,46),silver,13)
for x in [-708,708]:
 for y in [-319,319]:
  b('Dry_bench_leg',(x,y,447),(56,56,864),slate,4)
  b('Dry_bench_foot',(x,y,8),(69,65,16),dk,5)
for y in [-319,319]:b('Dry_bench_long_rail',(0,y,829),(1400,47,58),slate,5)
for x in [-708,708]:
 for z in [191,830]:b('Dry_bench_short_rails',(x,0,z),(39,619,49),slate,5)
b('Dry_bench_rear_crossrail',(0,319,194),(1409,34,48),slate,4)
b('Dry_bench_nominal_lower_shelf',(0,137,188),(1380,309,22),silver,4)
for z in [277,672]:b('Dry_empty_storage_support',(480,62,z),(434,511,43),slate,8)
b('Dry_storage_box_outer',(480,61,471),(434,508,385),iv,13)
for i,z in enumerate([354,475,601]):
 b('Dry_storage_static_drawer_'+str(i),(480,-194,z),(418,25,113),iv,6)
 tube('Dry_storage_blank_pull_'+str(i),[(424,-210,z),(433,-225,z),(526,-225,z),(536,-210,z)],10,steel)
for x in [-670,670]:
 for y in [-293,293]:b('Dry_underside_gusset',(x,y,788),(91,49,64),slate,5)
text('Dry_bench_display_mark','06-10   /   DRY TABLE STUDY',-182,-344,829,22,white)
# Independent scaled footprint teaching board, no shared bounds or transforms with bench.
b('Offline_projection_pedestal',(1106,-159,334),(415,361,668),teal,25)
b('Offline_projection_top',(1106,-159,673),(402,356,24),dk,12)
for x in [-132,132]:b('Offline_projection_frame_side',(1106+x,-159,694),(8,236,14),grass,2)
for y in [-114,114]:b('Offline_projection_frame_end',(1106,-159+y,694),(256,8,14),grass,2)
b('Offline_footprint_token',(1106,-159,711),(240,100,13),gold,5)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'dry-table.glb'),export_format='GLB',export_apply=True)
