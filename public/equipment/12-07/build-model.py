"""Editable ZEISS Lightsheet 7 dormant exterior, plus detached artificial replay panel. Blender mm; metric glTF. No operational parts."""
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
iv=material('Pearl white upper housing',(.73,.755,.759),.17);pale=material('Satin fascia',(.64,.669,.676),.2);grey=material('Silver service trim',(.32,.38,.43),.28);dark=material('Graphite recessed band',(.036,.050,.067),.24);ink=material('Charcoal legends',(.046,.061,.074));blue=material('Cobalt identification plate',(.018,.105,.28));white=material('Ivory label',(.84,.888,.88));black=material('Unpowered inset',(.02,.028,.031));leaf=material('Data replay buttons',(.27,.43,.37));root=empty('LIGHTSHEET7_MAIN_MODULE')
box('WIDTH_DEPTH_DATUM',(0,0,18),(800,450,36),dark,root,20)
# Width ribs, each outlining a near-constant-depth rounded lid. Distinctive ridge is gently right of center.
def lid(n,sections,mat):
 v=[];faces=[]
 for x,zd in sections:
  v.extend([(x/1000,y/1000,z/1000) for y,z in [(-216,35),(216,35),(218,zd-58),(171,zd),(-170,zd),(-217,zd-65)]])
 for j in range(len(sections)-1):
  for k in range(6):
   p=j*6+k;q=j*6+(k+1)%6;faces.append((p,q,q+6,p+6))
 faces.extend([tuple(reversed(range(6))),tuple(range(len(v)-6,len(v)))])
 m=bpy.data.meshes.new(n);m.from_pydata(v,[],faces);m.update();o=bpy.data.objects.new(n,m);bpy.context.collection.objects.link(o);o.parent=root;o.data.materials.append(mat)
 mod=o.modifiers.new('Rounded cover edges','BEVEL');mod.width=.029;mod.segments=6;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Weighted cover normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
lid('SCULPTED_COVER',[(-399,344),(-373,372),(-327,387),(-190,411),(-62,429),(4,442),(40,474),(76,500),(99,500),(137,478),(173,439),(252,424),(365,409),(399,390)],iv)
# Outer contours and passive fascia only. No open chamber or optical parts.
box('CENTER_CLOSED_FASCIA',(75,-216,228),(308,10,299),pale,root,14)
box('LEFT_CLOSED_PANEL',(-278,-217,193),(174,11,226),pale,root,12)
box('FRONT_PLINTH_TRIM',(0,-219,67),(755,11,63),iv,root,15)
box('INSET_FRONT_GRIP',(72,-224,90),(121,2,23),grey,root,7)
box('FRONT_LEFT_GRIP',(-184,-224,197),(10,2,79),grey,root,3)
box('RIGHT_BLANK_FASCIA',(309,-216,209),(133,10,116),pale,root,12)
box('STATUS_INDICATOR_OFF',(295,-222,277),(18,2,3),black,root)
box('FRONT_ID_BADGE',(80,-222,259),(31,3,28),blue,root,2);label('ID_Z','ZEISS',80,-224,258,6,white,'front',root)
label('MODEL_CAPTION','Lightsheet 7',-120,-222.5,288,13,ink,'front',root)
box('REAR_ABSTRACT_SERVICE_COVER',(0,217,224),(414,12,229),pale,root,10)
for i in range(8):box('REAR_VENT_OUTLINE',(94,223,220+i*8),(156,2,2),grey,root,1)
# The 500 mm model datum is a small part of the cover crown, within the declared envelope.
box('CROWN_DATUM',(85,0,499),(16,84,2),iv,root)
# Detached synthetic display; not depicted as ZEISS hardware.
tablet=empty('SYNTHETIC_REPLAY_PANEL',(666,-10,0))
box('REPLAY_PANEL_FOOT',(0,0,13),(322,186,26),dark,tablet,9)
box('REPLAY_PANEL_POST',(0,51,117),(107,49,190),grey,tablet,8)
box('REPLAY_PANEL_HOUSING',(0,20,234),(358,39,269),iv,tablet,15)
box('REPLAY_SCREEN',(0,-1,247),(304,3,190),dark,tablet,8)
box('REPLAY_PREV',(-114,-4,122),(62,6,23),leaf,tablet,5)
box('REPLAY_NEXT',(114,-4,122),(62,6,23),leaf,tablet,5)
label('REPLAY_PREV_TEXT','−',-114,-7.5,122,16,white,'front',tablet)
label('REPLAY_NEXT_TEXT','+',114,-7.5,122,16,white,'front',tablet)
label('REPLAY_TAG','UNCONNECTED SYNTHETIC VIEWER',0,-2,126,7,ink,'front',tablet)
bpy.ops.export_scene.gltf(filepath=OUT+'/lightsheet7.glb',export_format='GLB',export_animations=False,export_yup=True)
