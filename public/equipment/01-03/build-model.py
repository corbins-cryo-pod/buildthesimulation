"""ThinkStation P7 / NVIDIA RTX 6000 Ada reference. Sources: Lenovo PSREF front/rear and measured envelope; NVIDIA board size. Internal angles/details inferred. Blender -b -t 1 -P build-model.py. Metres +Y up, +Z front."""
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
black=m('Graphite plastics',(.022,.026,.028));anth=m('Powder-coated steel',(.065,.075,.078),.25);trim=m('ThinkStation red ring',(.48,.018,.033),.25);inner=m('Dark internal chassis',(.035,.043,.042));port=m('Port nickel shell',(.52,.56,.57),.7);ports=m('Dark port insert',(.014,.017,.017));gpu=m('NVIDIA black housing',(.027,.036,.039),.2);alu=m('Finned aluminium',(.43,.44,.39),.62);green=m('PCB dark green',(.024,.068,.056));white=m('Marking ivory',(.74,.76,.74));led=m('Status indicator',(.50,.73,.58))
# Enclosure with panel installed. Current PSREF with feet gives 175 W × 508 D × 434.4 H mm.
b('Floor_foot',(0,0,3),(173,475,6),black,2);b('Floor_pan',(0,0,11),(175,506,10),anth,2);b('Roof_panel',(0,0,429.4),(175,507,10),anth,2);b('Right_side_plate',(85,0,220.2),(5,503,406),anth,1)
b('Left_side_access_panel',(-85,0,220.2),(5,496,406),anth,1);b('Access_latch',(-87,193,323),(1,61,23),black,2)
# Back and interior layer.
b('Rear_bulkhead',(0,245.5,219),(170,7,420),inner,1)
b('Mainboard',(73,65,242),(2.8,311,357),green,1);b('Cpu_air_tower',(43,61,301),(48,100,94),black,4)
for k in range(8):b('DIMM_'+str(k),(55,134-k*10,343),(15,3,56),inner,1)
b('PSU',(18,172,50),(136,145,79),black,4)
for i in range(7):
 b('PCIe_slot_'+str(i),(-14,252.5,98+i*19),(96,1.5,10),port);b('Slot_center_'+str(i),(-14,253.3,98+i*19),(83,1,3),ports)
for i,(y,z) in enumerate([(34,260),(14,260),(34,240),(14,240),(32,199),(17,199),(36,159),(17,159)]):
 b('Rear_IO_case_'+str(i),(y,252.9,z),(12,1,10),port);b('Rear_IO_socket_'+str(i),(y,253.4,z),(7,1,6),ports)
b('Power_inlet',(48,252.8,43),(30,2,23),port,2);b('Power_inlet_inner',(48,253.4,43),(22,1,16),ports,1)
# Front red surround and original perforation mesh, with dark cavity behind.
for x in [-82,82]:b('Front_red_vertical_'+str(x),(x,-249,217),(11,10,421),trim,3)
for z in [10,424]:b('Front_red_cross_'+str(z),(0,-250,z),(168,8,10),trim,3)
b('Front_dark_socket',(0,-242,215),(153,3,402),ports,1)
verts=[];faces=[]
for r in range(31):
 for c in range(10):
  x=-69+14*c+(7 if r%2 else 0);z=32+12*r
  if x>62:continue
  j=len(verts)
  for R in [7,5.9]:
   for k in range(6):
    a=math.pi/3*k;verts.append(p((x+R*math.cos(a),-249,z+R*math.sin(a))))
  for k in range(6):faces.append((j+k,j+(k+1)%6,j+6+(k+1)%6,j+6+k))
me=bpy.data.meshes.new('Microperforated mesh grille');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('Hexagonal_front_grille',me);s.collection.objects.link(o);me.materials.append(black)
b('Front_io_strip',(68,-250,325),(14,6,165),anth,2);cyl('Power_button',(68,-252,395),12,3,ports)
for i in range(5):
 b('Front_port_trim_'+str(i),(68,-253.2,373-i*17),(10,1.1,7),port,1);b('Front_port_'+str(i),(68,-253.5,373-i*17),(6,.9,4),ports,1)
# One dual-slot NVIDIA RTX 6000 Ada envelope, with simplified bracket.
b('RTX6000_Ada_card',(-15,106,176),(111.76,266.7,39),gpu,3)
cyl('Gpu_blower',(-20,24,196.8),70,3.5,alu,'Z');cyl('Gpu_hub',(-20,24,199),34,2,black,'Z')
for k in range(12):
 t=2*math.pi*k/12;o=b('GPU_blade_'+str(k),(-20+25*math.cos(t),24+25*math.sin(t),198.7),(18,5,1.2),black,1);o.rotation_euler.z=t+.31
b('GPU_fin_bed',(-65,128,192),(4,129,9),alu,1)
for i in range(4):
 b('GPU_DP_shell_'+str(i),(-62+28*i,252.1,176),(16,2,7),port);b('GPU_DP_socket_'+str(i),(-62+28*i,253.1,176),(12,1,4),ports)
tube('GPU_power_cable',[(37,155,188),(57,174,192),(52,208,140),(42,203,78)],8,black)
for j,z in enumerate([116,239,363]):
 cyl('Intake_frame_'+str(j),(-3,-209,z),105,17,inner)
 cyl('Intake_hub_'+str(j),(-3,-218,z),42,4,anth)
 for i in range(6):
  t=i*math.pi/3;o=b('Intake_blade_'+str(j)+'_'+str(i),(-3+35*math.cos(t),-218,z+35*math.sin(t)),(30,2.5,9),black,2);o.rotation_euler.y=-t+.22
text('ThinkStation_mark','ThinkStation',-15,-250,100,15,white)
text('P7_mark','P7',65,-253,83,12,trim)
for ob in list(s.objects):
 if ob.type in {'FONT','CURVE'}:
  bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'p7-rtx6000.glb'),export_format='GLB',export_apply=True)
