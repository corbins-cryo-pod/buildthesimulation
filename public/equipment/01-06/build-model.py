"""Custom first-pass 12U rack in metres; own geometry, based on referenced interfaces rather than a surveyed installation."""
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
anchor=node('bts_bench_anchor',(0,0,0))
body=node('cabinet',(0,0,0));keep(body,anchor)
door=node('front_hinge',(-.279,-.294,.328));keep(door,body)
tray=node('nas_tray',(0,-.266,.233));keep(tray,body)
sled=node('compute_sled',(0,0,.4106));keep(sled,body)
steel=mat('Graphite painted panels',(.061,.08,.095),.25)
edge=mat('Charcoal frame',(.028,.034,.041),.24)
case=mat('Server anodized cases',(.12,.15,.17),.27)
rail=mat('Zinc-plated rack rails',(.44,.46,.47),.59)
black=mat('Vent slots and connectors',(.016,.021,.028),.16)
gold=mat('Case markings',(.68,.58,.38),.42)
green=mat('Virtual status green',(.13,.55,.38),.21)
amber=mat('Virtual attention amber',(.60,.33,.06))
glass=mat('Simplified mesh behind guard',(.06,.10,.115),.08,.48,.22)
def cu(n,p,d,m,grp=body,b=0):return cube(n,p,d,m,b,grp)
def Y(u,h):return .055+(u-1+h/2)*.04445
cu('Cabinet floor',(0,0,.020),(.600,.600,.040),steel,b=.003)
cu('Cabinet top',(0,0,.627),(.600,.600,.046),steel,b=.004)
for x in (-.291,.291):
 cu('Removable side panel',(x,.003,.322),(.018,.584,.583),steel,b=.002)
 for y in (-.276,.279):
  cu('Structural frame post',(x,y,.327),(.018,.034,.602),edge)
 for y in (-.222,.228):
  rx=math.copysign(.2325,x)
  cu('Vertical rack rail',(rx,y,.322),(.022,.022,.548),rail)
  for u in range(1,13):
   for off in (-.015875,0,.015875):cu('Rail slot marker',(rx,y-.012,Y(u,1)+off),(.009,.002,.0089),black)
 for y in (-.18,-.12,-.06,.0,.06,.12,.18):
  cu('Top exhaust slot',(x*.67,y,.650),(.092,.012,.001),black)
cu('Rear service panel',(0,.292,.318),(.568,.012,.555),steel)
for x in range(-3,4):
 for i in range(3):
  cu('Rear exhaust opening marker',(x*.048,.300,.525+i*.012),(.034,.003,.006),black)
for name,x,z in [('ups',.136,.103),('patch',-.075,.470)]:
 cu('Passive rear group '+name,(x,.300,z),(.108,.006,.055),black)
 keep(node('port_'+name,(x,.305,z)),body)
for x in (-.277,.277):cu('Door stile',(x,-.289,.327),(.025,.022,.576),edge,door)
for y in (.042,.610):cu('Door crossbar',(0,-.289,y),(.555,.023,.022),edge,door)
cu('Door mesh silhouette',(0,-.291,.325),(.533,.005,.545),glass,door)
for i in range(33):
 for x in (-.189,0,.189):cu('Simplified grille slat',(x,-.292,.062+i*.0164),(.155,.005,.0026),case,door)
cu('door_handle',(.254,-.308,.347),(.027,.016,.091),rail,door,.002)
def module(n,u,h,depth,m,group=body):
 z=Y(u,h)
 cu(n+' body',(0,-.246+depth/2,z),(.431,depth,.04445*h-.005),m,group,.0025)
 cu(n+' front echo',(0,-.244,z),(.4826,.012,.04445*h-.005),edge,group,.0018)
 return z
z=module('UPS 2U',1,2,.457,case)
cu('UPS silver panel inlay',(-.109,-.252,z),(.179,.004,.058),case)
cu('UPS LCD',(-.088,-.255,z+.009),(.080,.005,.022),green)
cu('ups_key',(.012,-.259,z+.008),(.019,.009,.017),green,body,.002)
for x in (.108,.125,.142,.159,.176,.193):
 cu('UPS front grille',(x,-.252,z),(.008,.003,.061),black)
z=module('NAS 2U',4,2,.410,case)
for x in (-.152,-.090,-.028,.034,.096,.158):
 if x==-.028:continue
 cu('NAS fixed drive bay',(x,-.253,z),(.051,.007,.062),case)
 cu('NAS status LED',(x+.013,-.257,z+.018),(.009,.002,.005),green)
cu('Sliding synthetic media caddy',(-.028,-.143,z),(.049,.223,.052),case,tray,.0015)
cu('nas_tray_pull',(-.028,-.262,z),(.045,.011,.051),rail,tray,.001)
for name,u,dep in [('Passive switch representation',8,.270),('Patch panel',10,.120)]:
 z=module(name,u,1,dep,case)
 for idx in range(12):
  x=-.205+idx*.035
  cu('Front unpowered connector marker',(x,-.252,z),(.020,.006,.020),black)
  cu('Port lower lip marker',(x,-.255,z-.010),(.020,.004,.004),rail)
z=module('Optional compute sled',9,1,.390,case,sled)
for idx in range(12):
 x=-.205+idx*.035
 cu('Sled front slot',(x,-.252,z),(.005,.006,.016),black,sled)
cu('Sled front LED',(.208,-.257,z-.007),(.010,.003,.007),amber,sled)
keep(node('mount_target',(.151,-.263,Y(9,1))),body)
freeze={'door_handle','nas_tray_pull','ups_key'}
for h in (body,door,tray,sled):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'rack.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'rack.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 sled.hide_render=True
 for a in sled.children:a.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=9;s.cycles.use_denoising=False
 s.render.resolution_x=750;s.render.resolution_y=550;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.58,.65,.69,1);bg.inputs['Strength'].default_value=.70
 cube('Floor',(0,0,-.008),(9,9,.015),mat('Room slate',(.28,.32,.34)))
 for p,w in [((.45,-1.4,1.55),140),((-1.1,-.8,1.25),90),((.52,1.01,1.44),105)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.15;l.rotation_euler=(Vector((0,0,.33))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent,angle,more in [('cabinet-view',(.96,-1.43,.91),(0,0,.33),1.06,0,0),('rail-view',(.49,-1.18,.71),(-.12,-.10,.31),1.04,-94,.12)]:
  door.rotation_euler.z=math.radians(angle);tray.location.y=-.266-more
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
