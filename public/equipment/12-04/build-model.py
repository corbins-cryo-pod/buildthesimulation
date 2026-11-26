"""Original metric editorial Leica STELLARIS 8/DMi8-style dormant exterior. No optical path, internal modules or operational geometry."""
import bpy, math, os
from mathutils import Vector
from pathlib import Path
P=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene;s.unit_settings.system='METRIC'
def mat(name,rgb,metal=0,rough=.45,alpha=1):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,alpha);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
 if alpha<1 and hasattr(m,'surface_render_method'):m.surface_render_method='BLENDED'
 return m
def node(n,p):
 o=bpy.data.objects.new(n,None);s.collection.objects.link(o);o.location=p;return o
def keep(o,p):
 if p:
  bpy.context.view_layer.update();w=o.matrix_world.copy();o.parent=p;o.matrix_world=w
 return o
def cube(n,p,dim,m,b=0,group=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:
  q=o.modifiers.new('Molded edge','BEVEL');q.width=b;q.segments=2;bpy.ops.object.modifier_apply(modifier=q.name)
 return keep(o,group)
def cylinder(n,p,d,r,m,axis='z',group=None):
 a={'z':(0,0,0),'x':(0,math.pi/2,0),'y':(math.pi/2,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=d,location=p,rotation=a)
 o=bpy.context.object;o.name=n;o.data.materials.append(m);return keep(o,group)
def shape(n,v,f,m,parent=None):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update()
 o=bpy.data.objects.new(n,me);s.collection.objects.link(o);o.data.materials.append(m);return keep(o,parent)
def section(n,xz,y0,y1,m):
 k=len(xz);v=[(x,y,z) for y in (y0,y1) for x,z in xz]
 return shape(n,v,[tuple(reversed(range(k))),tuple(range(k,k*2))]+[(j,(j+1)%k,(j+1)%k+k,j+k) for j in range(k)],m)
def label(n,word,p,z,m,grp=None):
 c=bpy.data.curves.new(n,'FONT');c.body=word;c.size=z;c.align_x='CENTER';c.align_y='CENTER';c.materials.append(m)
 o=bpy.data.objects.new(n,c);s.collection.objects.link(o);o.rotation_euler.x=math.pi/2;o.location=p
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return keep(o,grp)
def cu(n,p,d,m,g,b=0):return cube(n,p,d,m,b,g)
root=node('bts_bench_anchor',(0,0,0))
stand=node('dmi8_documentary_stand',(0,0,0));keep(stand,root)
head=node('stellaris_scanhead',(-.354,.049,.118));keep(head,root)
rear=node('sealed_auxiliary_unit',(-.360,.286,0));keep(rear,root)
work=node('review_terminal',(.364,.105,0));keep(work,root)
body=mat('Leica pale grey cast cover',(.50,.55,.57),.24,.44)
slate=mat('Graphite dormant instrument',(.032,.043,.052),.19,.44)
black=mat('Knob and eyepiece charcoal',(.013,.018,.025),.18,.36)
steel=mat('Satin inactive mechanism',(.34,.40,.43),.63,.32)
red=mat('Dormant Leica-style trim',(.59,.037,.046),.24,.32)
screen=mat('Dark glass dormant display',(.026,.072,.091),.23,.30)
teal=mat('Original synthetic review marker',(.08,.34,.40),.29,.35)
ivory=mat('Small text contrast',(.68,.75,.72))
# Envelope proxied from the Leica industrial family drawing, not claimed as an OEM CS-specific drawing.
cu('stand_nominal_proxy',(0,.008,.046),(.310,.500,.092),body,stand,.011)
cu('Stand lower side inlay',(0,.009,.029),(.291,.471,.022),slate,stand,.005)
cu('Gray upright cast body',(0,.132,.180),(.235,.206,.265),body,stand,.020)
cu('Black inset face of stand',(0,.025,.182),(.190,.031,.211),slate,stand,.008)
cu('Fixed rear stand bridge',(0,.197,.330),(.200,.090,.135),body,stand,.011)
for x in (-.112,.112):
 for y in (-.157,.187):cylinder('Chassis leveling foot',(x,y,.005),.010,.014,black,group=stand)
cu('Fixed stage support',(0,-.080,.238),(.233,.219,.045),slate,stand,.005)
cu('Stage plate, documentary only',(0,-.108,.272),(.262,.215,.012),steel,stand,.002)
cu('Fixed holder blank',(0,-.133,.280),(.110,.077,.007),slate,stand,.002)
cylinder('Stationary underside turret',(0,-.107,.192),.026,.066,slate,group=stand)
for x,y,l in ((-.045,-.104,.058),(.000,-.073,.053),(.045,-.110,.057),(.003,-.157,.069)):
 cylinder('Fixed objective silhouette',(x,y,.216),l,.018,black,group=stand)
 cylinder('Objective collar',(x,y,.226),.009,.0188,steel,group=stand)
cylinder('Front manual exterior knob',(-.147,-.135,.107),.029,.040,black,'x',stand)
cylinder('Right manual exterior knob',(.147,-.135,.107),.029,.040,black,'x',stand)
cu('Binocular housing',(0,-.126,.344),(.177,.137,.073),body,stand,.011)
for x in (-.044,.044):
 for n,y,z,d,r,m in [('Viewer angled tube',-.201,.387,.086,.029,black),('Tubular red trim',-.233,.411,.014,.027,red),('Read-only eyecup silhouette',-.244,.423,.017,.028,black)]:
  o=cylinder(n,(x,y,z),d,r,m,group=stand);o.rotation_euler.x=math.radians(48)
label('Stand exterior name','DMi8',(0,-.247,.077),.016,slate,stand)
cu('Dormant original touchpanel',(.105,-.195,.115),(.079,.034,.050),screen,stand,.006)
# Scan head and equipment enclosure exterior only. Deliberately blank panels; no controls or optical settings.
cu('Scanhead body exterior',(-.355,.050,.116),(.320,.363,.216),slate,head,.012)
cu('Scanhead face red trim',(-.355,-.134,.111),(.298,.011,.190),red,head,.008)
cu('Opaque dormant face',(-.355,-.143,.111),(.282,.013,.176),black,head,.008)
for i in range(14):
 cu('Scanhead passive vent slot',(-.515,.005+i*.013,.118),(.004,.005,.130),steel,head,.001)
label('Leica face legend','Leica',(-.438,-.151,.143),.024,red,head)
label('Scanhead name','STELLARIS 8',(-.351,-.151,.093),.025,ivory,head)
cu('Attached back projection',(-.199,.101,.151),(.071,.181,.120),slate,head,.008)
cu('Sealed external support chassis',(-.365,.290,.092),(.311,.219,.184),slate,rear,.009)
cu('Closed rear panel',(-.365,.404,.090),(.281,.011,.147),steel,rear,.005)
for i in range(3):
 cu('Blank rear service plate',(-.444+i*.081,.410,.100),(.047,.005,.032),black,rear,.001)
for n,x,z in [('module',-.443,.10),('stand',.057,.12)]:keep(node('documentary_rear_'+n,(x,.411 if x<0 else .249,z)),root)
# Generic image-review monitor and passive viewing puck, not OEM controls or electronically connected.
cu('Viewing monitor pedestal',(.363,.168,.079),(.038,.033,.141),slate,work,.005)
cu('Monitor stable base',(.363,.158,.008),(.181,.105,.014),slate,work,.006)
cu('Viewing terminal frame',(.363,.151,.231),(.327,.034,.217),slate,work,.007)
cu('Viewing terminal glass',(.363,.130,.231),(.302,.008,.182),screen,work,.003)
cu('image_comparator_tile',(.363,.123,.226),(.258,.006,.140),teal,work,.004)
cu('Image review keyboard',(.363,-.060,.012),(.243,.122,.020),black,work,.005)
label('Read-only monitor label','SYNTHETIC REVIEW',(.362,.118,.285),.012,ivory,work)
keep(node('stage_inspection_anchor',(0,-.112,.283)),stand)
freeze={'stand_nominal_proxy','image_comparator_tile'}
for h in (stand,head,rear,work):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'stellaris8.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'stellaris8.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=520;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.54,.60,.64,1);bg.inputs['Strength'].default_value=.65
 cu('Neutral base',(0,0,-.007),(12,12,.013),mat('Bench neutral gray',(.29,.31,.32)),None)
 for p,w in [((.45,-1.2,1.3),94),((-.99,-.48,.85),72),((.64,1.02,1.05),100)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=.98;l.rotation_euler=(Vector((0,0,.17))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('benchtop-view',(.81,-1.33,.83),(0,.04,.18),1.53),('stand-view',(.461,-.651,.46),(.013,-.073,.206),.62)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
