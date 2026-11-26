"""Original documentary Bruker BioSpec USR 70/30 V2, and detached geometry chart. No scanner operation; Blender mm, GLB m."""
import bpy, math, os
from math import pi
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,rgb,metal=.0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.35
 return m
def empty(n,xyz=(0,0,0),parent=None):
 o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=[q/1000 for q in xyz];return o
def finish(o,n,xyz,mat,par):
 o.name=n;o.parent=par;o.location=[q/1000 for q in xyz];o.data.materials.append(mat);return o
def box(n,xyz,size,mat,par=None,bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object
 for v in o.data.vertices:
  for i in range(3):v.co[i]*=size[i]/1000
 if bev:
  mod=o.modifiers.new('Manufacturing edge radius','BEVEL');mod.width=bev/1000;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,n,xyz,mat,par)
def cyl(n,xyz,rad,length,mat,par=None,axis='y',segments=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=rad/1000,depth=length/1000)
 o=finish(bpy.context.object,n,xyz,mat,par);o.rotation_euler=({'x':(0,pi/2,0),'y':(pi/2,0,0),'z':(0,0,0)})[axis];return o
def label(n,txt,x,y,z,size,mat,side='front',par=None):
 c=bpy.data.curves.new(n,'FONT');c.body=txt;c.align_x='CENTER';c.align_y='CENTER';c.size=size/1000;c.resolution_u=1
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.location=(x/1000,y/1000,z/1000);o.rotation_euler=(pi/2,0,0) if side=='front' else ((pi/2,0,pi) if side=='back' else (0,0,0))
 o.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
ivory=material('Cool white coated magnet shell',(.80,.84,.83),.08)
face=material('White smooth fairing',(.89,.915,.89),.13)
pale=material('Warm grey painted shoes',(.50,.55,.54),.23)
steel=material('Brushed plinth rails',(.32,.39,.39),.65)
blue=material('Dark blue fixed bore rim',(.033,.100,.237),.37)
ink=material('Indigo faceplate lettering',(.028,.083,.217),.15)
black=material('Opaque dark backplate',(.020,.036,.051),.19)
gold=material('Detached chart brass selection',(.58,.394,.187),.38)
teal=material('Detached chart enamel',(.045,.215,.19),.37)
light=material('Detached lettering',(.84,.86,.75),.02)
def sweep(n,profile,xy,mat,par,steps=128):
 verts=[(xy[0]/1000+r/1000*math.cos(k*2*pi/steps),d/1000,xy[1]/1000+r/1000*math.sin(k*2*pi/steps)) for r,d in profile for k in range(steps)]
 faces=[(((i+1)%len(profile))*steps+k,((i+1)%len(profile))*steps+(k+1)%steps,i*steps+(k+1)%steps,i*steps+k) for i in range(len(profile)) for k in range(steps)]
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.parent=par;mesh.materials.append(mat)
 for p in mesh.polygons:p.use_smooth=True
 return o
r=empty('BRUKER_7030_USR_V2_DOCUMENTARY')
sweep('MAGNET_SHELL_1650',[(815,-772),(825,-740),(825,662),(818,698),(793,729),(148,729),(148,680),(783,680),(787,-721),(148,-721),(148,-772)],(0,985),ivory,r)
sweep('FRONT_FAIRING',[(790,-727),(815,-748),(820,-782),(813,-806),(795,-815),(180,-815),(174,-805),(174,-776),(194,-768),(790,-768)],(0,985),face,r)
sweep('BORE_RIM_300',[(174,-812),(183,-823),(180,-849),(171,-862),(150,-862),(150,-806),(153,-802)],(0,985),blue,r)
cyl('OPAQUE_BORE_DEPTH_STOP',(0,-780,985),152,6,black,r,'y',128)
for x in [-487,487]:
 box('REAR_FOOT_RAIL',(x,68,50),(155,1750,100),steel,r,12)
 for y in [-568,595]:
  box('LOWER_STATIC_SUPPORT',(x,y,192),(185,255,262),pale,r,18)
  o=box('TAPERED_SUPPORT_FASCIA',(x,y,267),(198,279,254),ivory,r,21)
  o.rotation_euler.y=-.27 if x<0 else .27
  box('SQUARE_SHOE',(x,y,31),(207,260,62),pale,r,10)
box('UPPER_CHASSIS_FAIRING',(0,0,1807),(941,1337,198),ivory,r,69)
box('UPPER_BLANK_HOUSING',(0,220,1963),(508,503,161),pale,r,31)
box('REAR_ENVELOPE_LIMIT',(0,931,1031),(840,212,1094),pale,r,59)
for x in [-225,0,225]:
 box('REAR_SHALLOW_BLANK_PANEL',(x,1035.5,1010),(171,5,550),ivory,r,13)
label('FRONT_BRAND_LETTERS','BRUKER',0,-817,1531,70,ink,'front',r)
label('FRONT_DEVICE_LETTERS','BioSpec 70/30 USR',0,-817,1408,53,ink,'front',r)
# Subtle recess-free visible fastener heads are cosmetic only.
for a in [pi*.15,pi*.33,pi*.67,pi*.85,pi*1.32,pi*1.68]:
 cyl('FRONT_ROUND_DETAIL',(790*math.cos(a),-815,985+790*math.sin(a)),8,7,pale,r,'y',16)
d=empty('DETACHED_CHART_STAND',(1240,-170,0))
box('DETACHED_FOOT',(0,0,18),(580,363,36),black,d,14)
box('DETACHED_UPRIGHT',(0,66,526),(83,115,985),steel,d,14)
box('DETACHED_READER',(0,0,1108),(633,91,424),teal,d,22)
box('CHART_FACE',(0,-46.5,1124),(607,7,299),black,d,8)
for x,k in [(-178,'A'),(0,'B'),(178,'U')]:
 box('FRAME_'+k,(x,-51,931),(137,18,47),gold,d,8)
 label('TAG_FRAME_'+k,k,x,-61,932,25,black,'front',d)
label('CHART_NAME','DETACHED  /  GEOMETRY CARD',0,-47,1303,23,light,'front',d)
bpy.ops.export_scene.gltf(filepath=OUT+'/biospec-closed.glb',export_format='GLB',export_animations=False,export_yup=True)
