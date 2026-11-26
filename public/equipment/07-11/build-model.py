"""Documentary SpectraMax i3x standalone outer shell and unconnected abstract chart. No working or biologic assemblies. Blender mm / GLB metres."""
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
iv=material('Warm ivory center',(.77,.767,.694),.23);navy=material('Deep cobalt wrap',(.060,.108,.29),.38);deep=material('Deep navy front trim',(.027,.044,.098),.44);blank=material('Inactive glass prop',(.12,.184,.218),.36);grey=material('Rear abstract grille',(.248,.29,.317),.5);ink=material('Pale header lettering',(.827,.87,.831),.1);amber=material('Orange model suffix',(.639,.284,.091));teal=material('Detached chart reader trim',(.074,.26,.239),.4);gold=material('Offline chart keys',(.59,.43,.215),.45)
root=empty('I3X_STANDALONE_DORMANT',(-91,0,0))
box('CABINET_DATUM',(0,5.375,166.5),(392,594.75,317),navy,root,10)
front=empty('STATIONARY_FRONT_FASCIAS',(0,10.75,0),root)
for x in [-145,145]:
 for y in [-237,237]:cyl('STATIC_FEET',(x,y,4),19,8,deep,root,'z',32)
def pol(n,coords,y,depth,mat):
 v=[(x/1000,Y/1000,z/1000) for Y in [y-depth/2,y+depth/2] for x,z in coords];q=len(coords);normal=sum(x*b-a*z for (x,z),(a,b) in zip(coords,coords[1:]+coords[:1]))
 a=[tuple(range(q)),tuple(reversed(range(q,q*2)))];a.extend((k+q,(k+1)%q+q,(k+1)%q,k) for k in range(q));f=[tuple(reversed(w)) for w in a] if normal<0 else a
 m=bpy.data.meshes.new(n);m.from_pydata(v,[],f);m.update();o=bpy.data.objects.new(n,m);bpy.context.collection.objects.link(o);o.parent=front;o.data.materials.append(mat)
 mod=o.modifiers.new('Rounded static panel edges','BEVEL');mod.width=.003;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
pol('TOP_TRAPEZOID_HEADER',[(-170,285),(170,285),(182,325),(-182,325)],-298.5,9,iv)
pol('DARK_NAMETAG',[(-160,289),(160,289),(174,321),(-174,321)],-304,3,deep)
label('NAME_SPECTRAMAX','SpectraMax',64,-306.5,305,22,ink,'front',front)
label('TAG_I3X','i3x',143,-306.5,305,21,amber,'front',front)
label('MD_NAME','MOLECULAR\nDEVICES',-120,-306.5,305,9.5,ink,'front',front)
pol('SEALED_IVORY_CENTER',[(-125,84),(125,84),(168,280),(-168,280)],-299,10,iv)
pol('LOWER_PANEL',[(-131,13),(131,13),(140,96),(-140,96)],-301,7,iv)
box('DORMANT_MID_BAND',(0,-306,96),(375,11,24),deep,front,3)
pol('BLANK_FACIA_BEZEL',[(-143,160),(-74,160),(-74,268),(-151,268)],-305,12,grey)
pol('BLANK_WINDOW',[(-135,172),(-85,172),(-85,251),(-141,251)],-312,3,blank)
box('DIAGONAL_STYLE_SEAM',(-71,-306,209),(1.0,1.5,137),grey,front)
for i in range(14):
 box('REAR_GENERIC_SLOT',(67,301,124+i*7),(133,2,2.3),grey,root,.6)
box('REAR_FAUX_SERVICE_PLATE',(-106,301,131),(94,2,64),deep,root,3)
x=empty('DETACHED_STATIC_INTENSITY_READER',(365,-167,0))
box('CHART_FOOT',(0,0,14),(296,221,28),deep,x,9)
box('CHART_STAND',(0,48,117),(83,66,194),grey,x,7)
box('CHART_CASE',(0,16,251),(328,63,262),teal,x,13)
box('CHART_SCREEN',(0,-17,255),(286,3,173),deep,x,5)
for p,k in [(-92,'A'),(0,'B'),(92,'U')]:
 box('PICK_'+k,(p,-22,141),(61,8,23),gold,x,4);label('TAG_PICK_'+k,k,p,-28,141,12,deep,'front',x)
label('DETACHED_LABEL','STATIC GRAPHIC ONLY',0,-17,358,11,ink,'front',x)
bpy.ops.export_scene.gltf(filepath=OUT+'/spectramax-i3x.glb',export_format='GLB',export_animations=False,export_yup=True)
