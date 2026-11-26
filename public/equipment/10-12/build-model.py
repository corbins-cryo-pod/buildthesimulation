"""MaxTwo nominal closed dock (400×160×120 mm) and empty six-well plate (127.8×85.8×16.1 mm). Reference: MaxWell Biosystems 2025 brochure p.5. Inert geometric labels only. Blender -b -t 1 -P build-model.py. Metres."""
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
iv=m('White powder coat',(.76,.81,.81));light=m('Door metallic',(.56,.63,.63),.4);blue=m('MaxWell blue jacket',(.042,.32,.62),.23);dk=m('Black carrier',(.028,.035,.039));black=m('Dark well polymer',(.055,.071,.076));steel=m('Knob stainless',(.55,.60,.58),.68);rub=m('Feet',(.023,.031,.032));inert=m('Inert centroid label',(.28,.51,.35));white=m('Silk screen milk',(.8,.81,.76));port=m('Decorative socket',(.16,.20,.21),.55)
b('Dock_base',(0,0,10),(160,400,20),iv,5)
b('Backend_shell',(0,123,60),(160,154,119.2),iv,9);b('Center_bay_roof',(0,-33,114),(160,188,12),blue,5)
for x in [-76,76]:b('Sleeve_side_'+str(x),(x,-33,60),(8,188,108),blue,4)
b('Drawer_left_seam',(-70,-122,56),(4,4,95),black,2);b('Drawer_right_seam',(70,-122,56),(4,4,95),black,2)
for x in [-64,64]:
 for y in [-172,172]:cyl('Pad_foot_'+str(x)+str(y),(x,y,2),23,4,rub,'Z')
cyl('Decorative_key_bezel',(0,162,119),16,2,steel,'Z');cyl('Inactive_button',(0,162,120),12,1,dk,'Z')
for i in range(5):b('Rear_outline_port_'+str(i),(-47+i*22,199.2,46),(12,1.3,14),port,1)
text('MaxTwo_mark','MaxTwo',-42,-129,98,13,white)
slide=bpy.data.objects.new('Dry_plate_drawer',None);s.collection.objects.link(slide);slide.location=p((0,-102,0))
def put(o,local):o.parent=slide;o.location=p(local);return o
put(b('Drawer_face_select',(0,0,0),(147,10,96),light,4),(0,-92,64));put(b('Drawer_face_shadow',(0,0,0),(148,6,96),black,3),(0,-85,61));put(b('Drawer_subframe',(0,0,0),(146,151,13),iv,3),(0,-6,33));put(b('Dock_recess',(0,0,0),(115,138,8),dk,2),(0,-4,40))
put(b('Plate_footprint',(0,0,0),(85.8,127.8,2.5),black,2.4),(0,-4,45.25))
for x in [-41.8,41.8]:put(b('Plate_long_side_'+str(x),(0,0,0),(2.2,124,13.6),dk,1),(x,-4,53.3))
for y in [-66.8,58.8]:put(b('Plate_end_'+str(y),(0,0,0),(83,2.2,13.6),dk,1),(0,y,53.3))
def cup(n):
 vv=[];ff=[];N=40
 for r,z in [(16.3,0),(16.4,13.5),(14.5,13.5),(14.5,1.5),(13.9,.9),(.001,.9)]:
  for i in range(N):
   a=2*math.pi*i/N;vv.append(p((r*math.cos(a),r*math.sin(a),z)))
 for j in range(5):
  for i in range(N):ff.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 ff.append(tuple((5*N)+i for i in range(N)));me=bpy.data.meshes.new(n);me.from_pydata(vv,[],ff);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(black)
 for q in me.polygons:q.use_smooth=len(q.vertices)==4
 return o
first=cup('Well_A1')
for r,x in [('A',-20.4),('B',20.4)]:
 for k,z in enumerate([37.7,0,-37.7],1):
  n=r+str(k);o=first if n=='A1' else first.copy()
  if o is not first:s.collection.objects.link(o)
  o.name='Well_'+n;put(o,(x,-z-4,46.6));put(b('Inert_target_'+n,(0,0,0),(3.85,2.10,.30),inert,.06),(x,-z-4,47.75))
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'maxtwo.glb'),export_format='GLB',export_apply=True)
