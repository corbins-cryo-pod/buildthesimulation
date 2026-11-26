"""FLIR E95 24° educational geometry, Blender -b -t 1 -P build-model.py. Helpers use mm; exported metres, +Y up, +Z lens outward. Enclosure envelope from catalog p.214; all component profiles inferred."""
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
dk=m('Camera rubber',(.028,.031,.034));case=m('Anthracite polycarbonate',(.061,.066,.071));gr=m('Grip rib',(.095,.099,.104));ink=m('Light-gray markings',(.80,.83,.82));blue=m('Coated IR window',(.025,.15,.19),.55);refl=m('Optical highlight',(.052,.25,.33),.55);screen=m('Display glass',(.034,.090,.086),.17);metal=m('USB-C edge',(.53,.54,.52),.68)
def loft(name,rings,mat):
 # rings = (Z, Y centre, X radius, Y radius, superellipse exponent)
 vv=[];ff=[];N=48
 for z,y,rx,ry,exp in rings:
  for i in range(N):
   t=2*math.pi*i/N;c=math.cos(t);s_=math.sin(t);vv.append(p((rx*math.copysign(abs(c)**exp,c),y+ry*math.copysign(abs(s_)**exp,s_),z)))
 for j in range(len(rings)-1):
  for i in range(N): ff.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 ff.extend([tuple(reversed(range(N))),tuple((len(rings)-1)*N+i for i in range(N))]);me=bpy.data.meshes.new(name);me.from_pydata(vv,[],ff);me.update();o=bpy.data.objects.new(name,me);s.collection.objects.link(o);me.materials.append(mat)
 for f in me.polygons:f.use_smooth=len(f.vertices)==4
 return o
loft('Battery_foot',[(0,9,18,14,.7),(4,9,23,19,.7),(12,9,25,20,.7),(21,8,23,19,.7)],dk)
loft('Pistol_grip',[(15,9,21,19,.8),(41,7,19,16,.8),(100,-1,19,17,.8),(141,-7,23,20,.8),(171,-5,25,22,.8)],case)
for i in range(8):
 z=32+10*i;y=9-(z-15)*.115;loft('Grip_welt_'+str(i),[(z,y,19.6,17.4,.8),(z+2,y,19.8,17.5,.8)],dk)
loft('Head_shell',[(149,5,34,30,.52),(158,5,50,39,.48),(175,5,57,40,.4),(225,5,58.05,39,.36),(261,5,56,36,.42),(274,5,50,31,.55),(278.4,5,38,24,.65)],case)
for n,y,diam,dep,ma in [('Lens_collar',-35,80,16,dk),('Lens_barrel',-45,70,13,case),('Focus_ring',-54,68,10,gr),('Lens_rim',-59,66,7,dk),('Lens_recess',-62.8,51,1,case),('Germanium_window',-63.48,44,.90,blue),('Window_center',-64,30,.2,refl)]:
 cyl(n,(0,y,207),diam,dep,ma)
for i in range(32):
 t=2*math.pi*i/32;o=b('Focus_grip_'+str(i),(34*math.cos(t),-54,207+34*math.sin(t)),(1.8,8,2.5),dk,.4);o.rotation_euler.y=-t
b('Alignment_sensor_panel',(0,-30.4,252),(54,11,18),dk,4)
for xx,zz,dd in [(-15,252,8),(0,252,10),(16,252,5)]:cyl('Front_aux_'+str(xx),(xx,-36,zz),dd,1.8,blue)
b('Trigger_capture',(0,-27,143),(21,10,23),gr,4)
b('Rear_display_bezel',(0,42.5,215),(101,10,96),dk,6)
b('Touch_panel',(0,47.9,222),(83,1.8,62.5),screen,1)
b('Key_Menu',(0,47.8,176),(17,2.4,15),gr,2.8)
for xx,zz,nn in [(-20,181,'Gallery'),(-20,171,'Programmable'),(20,181,'Back'),(20,171,'Power'),(0,164,'Lamp')]:
 b('Key_'+nn,(xx,47.8,zz),(12,2.4,7),gr,2)
b('USB_SD_seal',(-55,4,219),(3,29,47),dk,2)
for k in range(4):b('Port_grip_'+str(k),(-56.5,0,210+k*3),(1,16,1),gr)
tube('Hand_strap',[(-40,11,156),(-46,14,131),(-50,19,85),(-41,20,43),(-23,14,17)],5,dk)
for ob in list(s.objects):
 if ob.type=='CURVE':
  bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'e95.glb'),export_format='GLB',export_apply=True)
