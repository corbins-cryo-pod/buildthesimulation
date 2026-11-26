"""Original custom benchtop teaching enclosure, not factory specification or measured construction. Blender -b -t 1 -P build-model.py. Metres, +Y up, +Z toward operator."""
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
al=m('Anodized steel frame',(.34,.42,.43),.65);corner=m('Graphite corner cap',(.053,.065,.069));bronze=m('Warm conductive mesh',(.47,.31,.13),.55);rub=m('Dark rubber',(.025,.027,.03));brass=m('Brass stud',(.64,.40,.09),.65);iv=m('Dummy fixture block',(.63,.64,.56));board=m('Dummy fixture PCB',(.080,.27,.21));white=m('Label matte',(.84,.82,.72));blue=m('Virtual signal connector',(.075,.33,.47));green=m('Virtual ground connector',(.18,.38,.20))
def grid(n,axes,origin,w,h,step,thick,mat,parent=None):
 origin=Vector(origin);U,V=(Vector(k) for k in axes);vertices=[];faces=[]
 def quad(x,y,sx,sy,z=0):
  j=len(vertices);N=U.cross(V)
  for a,b_ in [(0,0),(sx,0),(sx,sy),(0,sy)]:vertices.append(p(origin+U*(x+a)+V*(y+b_)+z*N))
  faces.append((j,j+1,j+2,j+3))
 for i in range(1,int(w//step)+1):quad(i*step,0,thick,h)
 for i in range(1,int(h//step)+1):quad(0,i*step,w,thick,.08)
 cube=bpy.data.meshes.new(n);cube.from_pydata(vertices,[],faces);cube.update();o=bpy.data.objects.new(n,cube);s.collection.objects.link(o);cube.materials.append(mat)
 if parent:o.parent=parent
 return o
b('Base_plate',(0,0,22),(600,540,26),al,3)
for x in [-260,260]:
 for y in [-228,228]:b('Foot_'+str(x)+str(y),(x,y,4),(42,42,8),rub,2)
for x in [-282,282]:
 for y in [-252,252]:b('Post_'+str(x)+str(y),(x,y,336),(29,29,615),al,2)
for x in [-282,282]:
 for z in [46,633]:b('Side_rail_'+str(x)+str(z),(x,0,z),(26,516,28),al,2)
for y in [-252,252]:
 for z in [46,633]:b('Cross_rail_'+str(y)+str(z),(0,y,z),(590,26,28),al,2)
for x in [-282,282]:
 for y in [-252,252]:
  for z in [42,633]:b('Corner_'+str(x)+str(y)+str(z),(x,y,z),(36,36,34),corner,2)
grid('Rear_mesh',((1,0,0),(0,0,1)),(-267,252,60),535,559,11,1.1,bronze)
for x in [-282,282]:grid('Side_mesh_'+str(x),((0,1,0),(0,0,1)),(x,-238,60),477,559,11,1.1,bronze)
grid('Roof_mesh',((1,0,0),(0,1,0)),(-268,-237,633),536,474,11,1.1,bronze)
door=bpy.data.objects.new('Door_hinge_pivot',None);s.collection.objects.link(door);door.location=p((-266,-261,62))
def dframe(n,rel,dim,mat=al,beveled=2):
 o=b(n,rel,dim,mat,beveled);o.parent=door;o.location=p(rel);return o
for x in [9,523]:dframe('Door_vertical_'+str(x),(x,0,280),(17,18,560))
for z in [9,552]:dframe('Door_cross_'+str(z),(266,0,z),(532,18,17))
grid('Door_mesh',((1,0,0),(0,0,1)),(19,0,18),495,526,11,1.1,bronze,door)
dframe('Door_handle',(504,-24,296),(23,33,95),corner,6)
for z in [149,517]:cyl('External_hinge_pin_'+str(z),(-266,-261,z),17,58,al,'Z')
b('Feedthrough_plate',(283,-171,177),(21,112,125),corner,3)
for z,n,ma in [(203,'Signal_feedthrough',blue),(144,'Ground_lug',green)]:
 cyl(n,(298,-171,z),26,22,ma,'X');cyl(n+'_socket',(310,-171,z),10,6,brass,'X')
# Dummy low-voltage loop, no biological tissue. Leads show only component identity.
b('Inert_probe_fixture',(7,-25,58),(255,227,46),iv,6);b('Dummy_input_board',(7,-25,82),(182,168,6),board,2)
for x in [-45,45]:
 cyl('Dummy_terminal_'+str(x),(x,-67,90),19,15,brass,'Z')
b('Inert_dummy_resistor',(0,-65,95),(46,16,15),iv,3);tube('Virtual_signal_lead',[(8,-62,95),(81,-95,99),(182,-151,80),(230,-151,103),(283,-171,203)],6,blue)
tube('Virtual_ground_lead',[(285,-171,145),(269,-175,108),(224,-167,55),(169,-137,40)],4,green)
text('Front_label','SHIELDED BENCH',3,-271,39,19,white)
for o in list(s.objects):
 if o.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'shielded-bench.glb'),export_format='GLB',export_apply=True)
