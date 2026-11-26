"""Eppendorf Research plus yellow 20–200 uL, visible proportions reconstructed from manufacturer FIG 3-1. Housing dimensions, tip and stand are original nominal estimates. Blender -b -t 1 -P build-model.py. Metres, +Y up, +Z operator."""
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
iv=m('Body ivory',(.72,.75,.72));white=m('Light shell accent',(.81,.83,.76));gray=m('Gray support grip',(.20,.24,.25));dk=m('Control dark',(.030,.043,.047));metal=m('Display silver',(.50,.55,.55),.55);ink=m('Teal print',(.065,.28,.36));gold=m('Yellow coded dial',(.88,.61,.06));fl=m('Synthetic ledger marker blue',(.09,.28,.46));fb=m('Synthetic ledger marker amber',(.62,.32,.10));box=m('Nominal stand plastic',(.285,.37,.39));glass=m('Translucent molded tip',(.72,.87,.81));glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.61
def loft(n,rings,ma,N=32):
 vv=[];ff=[]
 for z,rx,ry,y in rings:
  for i in range(N):
   t=2*math.pi*i/N;vv.append(p((rx*math.cos(t),y+ry*math.sin(t),z)))
 for j in range(len(rings)-1):
  for i in range(N):ff.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 ff.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+i for i in range(N))]);me=bpy.data.meshes.new(n);me.from_pydata(vv,[],ff);me.update();o=bpy.data.objects.new(n,me);s.collection.objects.link(o);me.materials.append(ma)
 for f in me.polygons:f.use_smooth=len(f.vertices)==4
 return o
b('Stand_base',(0,28,7),(152,103,14),box,5);b('Stand_back_column',(0,57,141),(27,25,255),gray,3);b('Stand_hook',(0,20,233),(63,91,12),box,5);b('Stand_front_saddle',(0,2,233),(33,19,14),gray,3)
loft('Main_handle',[(126,8.4,8.1,2),(133,10.9,10.2,2),(176,10.8,10.6,1.5),(217,12.2,12.1,.8),(238,14,13,0),(245,11,9,0)],iv)
loft('Lower_molded_shaft',[(66,1.5,1.5,0),(79,2,2,0),(114,4.5,4.5,0),(126,8.5,8.3,0),(132,8.2,8,0)],gray)
loft('Lower_shaft_light_sleeve',[(79,2.1,2.1,0),(98,3.1,3.1,0),(114,4.7,4.7,0),(121,5.7,5.7,0)],iv)
b('Angled_finger_hook',(-15,0,238),(23,18,10),gray,5).rotation_euler.y=-.22
b('Counter_window_bezel',(3,-10.7,204),(9.6,3,25),dk,2);b('Counter_glass',(3,-12.4,204),(6.9,1,22),metal,1)
b('Tip_ejector_button',(8,-9.8,227),(11,9,13),gray,4)
cyl('Dial_ring',(0,0,251),23,13,gold,'Z')
for k in range(18):
 t=2*math.pi*k/18;b('Volume_dial_grip_'+str(k),(11*math.cos(t),11*math.sin(t),251),(1.30,1.30,10),gold,.22)
cyl('Plunger_stem',(0,0,265),9,20,gray,'Z');cyl('Plunger_button',(0,0,277),17,5,gold,'Z')
b('Model_color_band',(3,-9,153),(8,3,12),gold,1)
tip=loft('Fitted_tip',[(29,.42,.42,0),(41,.87,.87,0),(49,1.42,1.42,0),(60,2.5,2.5,0),(70,4.3,4.3,0),(71,3.9,3.9,0),(62,2.1,2.1,0),(29,.24,.24,0)],glass)
loft('Parked_tip',[(2,.42,.42,0),(12,.8,.8,0),(17,1.42,1.42,0),(28,2.5,2.5,0),(39,4.3,4.3,0),(40,3.9,3.9,0),(31,2.1,2.1,0),(2,.24,.24,0)],glass).location=p((-49,-40,3))
for n,x,ma in [('Source',-42,fl),('Receiver',40,fb)]:
 cyl(n+'_dry_vessel',(x,-41,16),34,27,iv,'Z');cyl(n+'_rim',(x,-41,30),36,4,gray,'Z');cyl(n+'_dry_floor',(x,-41,32),29,.8,ma,'Z')
text('Body_brand','Research plus',.1,-11,173,5,ink)
for o in list(s.objects):
 if o.type=='FONT':
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'research-plus.glb'),export_format='GLB',export_apply=True)
