"""CELLINK BIO X6 Gen 3 documentary enclosure and detached generic printed ruler. Nonfunctional shell. Blender mm to glTF metres."""
import bpy, math, os, sys
from mathutils import Vector
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
def rod(n,a,b,r,m,par=None):
 a,b=Vector(a),Vector(b);v=b-a;mid=(a+b)/2
 o=cyl(n,mid,r,v.length,m,par,'z',12);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def cable(n,coords,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r/1000;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for pt,xyz in zip(s.bezier_points,coords):
  pt.co=[v/1000 for v in xyz];pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def label(n,txt,x,y,z,size,mat,side='front',par=None):
 c=bpy.data.curves.new(n,'FONT');c.body=txt;c.align_x='CENTER';c.align_y='CENTER';c.size=size/1000;c.resolution_u=1
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.location=(x/1000,y/1000,z/1000);o.rotation_euler=(pi/2,0,0) if side=='front' else ((pi/2,0,pi) if side=='back' else (0,0,0))
 o.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
iv=material('Powder white enclosure',(.78,.805,.799),.24);shade=material('Satin trim around front',(.43,.5,.51),.65);frost=material('Opaque gray viewport shield',(.41,.47,.48),.41);ice=material('Recessed lid accent band',(.46,.53,.53),.4);grey=material('Cooling exterior abstractions',(.22,.279,.297),.4);dark=material('Nonfunctional dark plinth',(.046,.067,.069),.25);tag=material('Nominal model label',(.17,.24,.25));teal=material('Generic coordinate display',(.065,.25,.224),.28);brass=material('Read-only locator keys',(.66,.49,.25),.55)
m=empty('BIO_X6_GEN3_CLOSED')
box('FLOOR_BAND',(0,0,24),(800,400,48),iv,m,19)
box('TOP_SIZE_DATUM',(0,0,474),(800,400,52),iv,m,17)
box('REAR_CLOSED_ENCLOSURE',(0,169,252),(781,58,425),iv,m,17)
box('RIGHT_WRAP_SUPPORT',(370,22,250),(60,354,427),iv,m,20)
box('LEFT_FRAME_SUPPORT',(-382,18,252),(31,360,426),iv,m,9)
box('FRONT_CLOSED_SHROUD',(0,-176,249),(744,27,431),frost,m,31)
box('EDGE_RECESS_LOWER',(0,-194,54),(751,10,13),shade,m,5)
box('EDGE_RECESS_UPPER',(0,-192,446),(748,11,12),shade,m,5)
box('RIGHT_WRAP_SEAL',(363,-175,249),(17,32,395),ice,m,7)
box('LEFT_SHROUD_EDGE',(-366,-191,249),(13,4,365),shade,m,5)
label('IDENTITY_TAG','BIO X6',-314,-201.0,478,21,tag,'front',m)
label('MANUFACTURER_TAG','CELLINK',285,-201.0,474,15,tag,'front',m)
for i in range(7):box('ABSTRACT_REAR_SEAM',(-132,199,337+i*9),(170,1,2),grey,m,.5)
# Separate geometry card viewer, physically unattached to the shell.
reader=empty('DETACHED_GENERIC_RULER',(632,-160,0))
box('READER_FOOT',(0,0,12),(301,203,24),dark,reader,9)
box('READER_STAND',(0,45,93),(83,56,162),shade,reader,7)
box('RULER_OUTER',(0,6,227),(337,61,236),teal,reader,12)
box('RULER_SCREEN',(0,-26,235),(302,4,156),dark,reader,6)
for x,n,k in [(-90,'CARD_LEFT','L'),(90,'CARD_RIGHT','R')]:
 box(n,(x,-30,139),(64,7,20),brass,reader,4);label('TAG_'+n,k,x,-35,139,12,dark,'front',reader)
label('OFFLINE_MARK','GENERIC  /  PRINTED SCALE',0,-27,330,13,iv,'front',reader)
bpy.ops.export_scene.gltf(filepath=OUT+'/bio-x6-gen3.glb',export_format='GLB',export_animations=False,export_yup=True)
