"""Original study of Leica VT1200 S external housing, plus a separate invented tray. No operating parts. Blender mm inputs; output world Y-up metres."""
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
iv=material('Warm grey shell',(.64,.68,.71),.1);edge=material('Moulded finish',(.45,.49,.53),.1);base=material('Graphite base',(.037,.047,.058),.23);rubber=material('Dormant display bezel',(.062,.084,.092));red=material('Reference model plate',(.60,.085,.072));ink=material('Grey engraved plate',(.19,.215,.217));white=material('Tray markings',(.93,.90,.72));blue=material('Synthetic tray anodized teal',(.073,.24,.22),.35);teal=material('Opaque synthetic coupon',(.13,.55,.48),.3);gold=material('Inert landmark',(.85,.49,.105),.49)
root=empty('VT1200S_EXTERNAL')
# Length along the front/rear axis; photo establishes front at the shallow lip.
box('BASE_LENGTH_DATUM',(0,0,24),(250,600,48),base,root,9)
def shell(n,rows,mat):
 verts=[];faces=[]
 for y,w,z in rows:
  verts.extend([(x/1000,y/1000,h/1000) for x,h in [(-w/2,45),(w/2,45),(w/2,z-18),(.38*w,z),(-.38*w,z),(-w/2,z-18)]])
 for j in range(len(rows)-1):
  for k in range(6):a=j*6+k;b=j*6+(k+1)%6;faces.append((a,b,b+6,a+6))
 faces.extend([tuple(reversed(range(6))),tuple(range(len(verts)-6,len(verts)))])
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update()
 o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.parent=root;o.data.materials.append(mat)
 mod=o.modifiers.new('Rounded moulding','BEVEL');mod.width=.013;mod.segments=5;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
shell('EXTERIOR_REAR_HOUSING',[(-86,234,127),(-65,245,176),(-31,247,212),(17,248,225),(75,248,230),(241,248,230),(297,240,220)],iv)
box('TOP_HEIGHT_DATUM',(0,156,227),(175,140,6),iv,root,3)
box('FRONT_FASCIA',(0,-266,65),(230,62,43),iv,root,9)
box('FRONT_SHALLOW_DECK',(0,-192,72),(219,148,56),iv,root,10)
# Inactive covered surface only, no rendering of any usable mechanism or cutting element.
box('SEALED_REFERENCE_BAY',(0,-185,104),(148,129,11),rubber,root,8)
box('BLANK_FRONT_ACCESS_COVER',(0,-75,132),(125,43,61),base,root,10)
box('INACTIVE_REAR_PANEL',(0,296,129),(179,4,98),edge,root,3)
for j in range(7): box('UNPOWERED_REAR_SLOT',(14,299,100+j*8),(125,1,3),base,root)
for x in [-88,88]: box('FRONT_SEAM',(x,-294,65),(32,2,3),edge,root)
label('MODEL_ID','VT1200 S',0,-298,65,10,red,'front',root)
remote=empty('INACTIVE_CONTROLLER',(-263,-134,0))
box('CONTROLLER_DATUM',(0,0,36),(150,190,72),edge,remote,12)
box('UNPOWERED_DISPLAY',(0,43,71),(106,56,1),rubber,remote,3)
for y in [-64,-47,-30,-13,4]:
 for x in [-46,-23,0,23,46]:box('BLANK_INACTIVE_KEY',(x,y,72.3),(17,12,2.8),iv,remote,2)
label('INACTIVE_CONTROLLER_TAG','DISPLAY PROP',0,44,72,8,white,'top',remote)
tray=empty('WITNESS_TRAY',(243,-76,0))
box('TRAY_BASE',(0,0,5),(84,60,10),blue,tray,3)
for x in [-31.5,31.5]: box('OPENING_WALL_X',(x,0,14),(9,52,8),blue,tray)
for y in [-22,22]:box('OPENING_WALL_Z',(0,y,14),(54,10,8),blue,tray)
label('TRAY_MARK','A - FIT GAUGE',0,-29,10.15,4,white,'top',tray)
coupon=empty('COUPON_POSE',(0,0,10),tray)
box('COUPON_DATUM',(0,0,2),(48,28,4),teal,coupon,1)
for n,x,y in [('P1',-15,-7),('P2',15,7)]:
 cyl('LANDMARK_'+n,(x,y,4.45),2.5,.9,gold,coupon,'z',18)
 label('LABEL_'+n,n,x,y-5,4.1,4,white,'top',coupon)
bpy.ops.export_scene.gltf(filepath=OUT+'/vt1200s-reference.glb',export_format='GLB',export_animations=False,export_yup=True)
