"""Original metric Olympus/Evident VS200 single-tray exterior and passive inert artifact viewer, not operational CAD."""
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
scanner=node('vs200_documentary_cabinet',(0,0,0));keep(scanner,root)
monitor=node('review_monitor',(-.630,.032,0));keep(monitor,root)
dummy=node('slide_reference_plane',(-.598,-.224,.050));keep(dummy,root)
white=mat('Warm cabinet enamel',(.67,.71,.69),.15,.44)
shell=mat('Neutral white equipment trim',(.50,.55,.57),.18,.40)
edge=mat('Dark optical exteriors',(.033,.050,.065),.18,.41)
dark=mat('Graphite weathered display face',(.016,.026,.034),.15,.48)
blue=mat('Olive blue identification strip',(.030,.218,.42),.20,.39)
cyan=mat('Inert calibration artifact',(.064,.35,.41),.36,.39)
silver=mat('Passive black fascia surround',(.30,.38,.40),.38,.42)
ink=mat('Light instrument ink',(.74,.78,.77))
gold=mat('Matched fiducial paint',(.61,.45,.10),.44,.40)
# The chosen base-only footprint follows the catalog "Base Unit with Standard Camera" drawing.
cu('base_scanner_depth_reference',(0,0,.257),(.572,.5975,.514),white,scanner,.011)
cu('Blue band',(.003,-.2983,.110),(.545,.0055,.070),blue,scanner,.002)
cu('Upper camera riser shoulder',(0,.053,.523),(.317,.382,.014),shell,scanner,.004)
cylinder('enclosed_camera_silhouette',(.055,.041,.59175),.1415,.061,edge,group=scanner)
cylinder('Dormant camera top ring',(.055,.041,.648),.016,.060,shell,group=scanner)
cu('Front access silhouette',(-.038,-.2995,.331),(.366,.007,.239),shell,scanner,.003)
cu('Front recessed dormant window',(-.039,-.3034,.343),(.286,.0035,.129),dark,scanner,.001)
cu('Closed slot accent',(0,-.3036,.257),(.206,.004,.012),edge,scanner,.002)
cu('Passive right indicator frame',(.221,-.2985,.125),(.063,.003,.060),shell,scanner,.002)
cylinder('Blank dormant signal lens',(.220,-.3012,.127),.004,.012,silver,'y',scanner)
label('Fixed equipment badge','SLIDEVIEW VS200',(-.091,-.3014,.108),.022,ink,scanner)
for x in (-.267,.267):
 for i in range(17):cu('Vented side depiction',(x,.055+i*.011,.341),(.002,.004,.125),edge,scanner,.0004)
for x in (-.199,.199):
 for y in (-.191,.218):cylinder('Cabinet foot',(x,y,.009),.018,.027,edge,group=scanner)
cu('Rear exterior projection',(0,.3325,.363),(.195,.080,.268),shell,scanner,.008)
for x in (-.066,.064):
 cu('Schematic inactive rear insert',(x,.369,.304),(.096,.007,.047),dark,scanner,.002)
for n,x,z in [('cabinet',-.063,.306),('accessory',.065,.306)]:keep(node('documentary_rear_'+n,(x,.3725,z)),scanner)
# Generic unconnected read-only view station. This is not an image capture or automation console.
cu('Monitor mounting base',(-.625,.098,.018),(.286,.127,.028),dark,monitor,.004)
cu('Support riser',(-.625,.104,.149),(.039,.039,.244),edge,monitor,.005)
cu('Review monitor frame',(-.625,.083,.325),(.374,.043,.246),dark,monitor,.006)
cu('Generic screen window',(-.625,.057,.323),(.342,.012,.216),edge,monitor,.004)
cu('read_only_mosaic_tile',(-.625,.050,.324),(.313,.005,.185),cyan,monitor,.004)
cu('Generic desk control strip',(-.625,-.078,.018),(.290,.092,.022),dark,monitor,.004)
label('Monitor heading','INERT MOSAIC REVIEW',(-.626,.046,.406),.012,ink,monitor)
# Side exhibit. Slide corner origin is the left/rear edge; world +X follows 76 mm, +Z follows 26 mm.
cu('Standalone calibration slab pedestal',(-.560,-.237,.025),(.130,.065,.044),edge,root,.003)
cu('metric_inert_slide',(-.560,-.237,.0495),(.076,.026,.001),cyan,dummy,.00008)
for i in range(5):
 for j in range(3):
  cu('Inert demonstration mark',(-.588+i*.014,-.246+j*.009,.05002),(.003,.003,.00003),gold,dummy)
keep(node('image_cursor_anchor',(-.560,-.237,.05005)),dummy)
freeze={'base_scanner_depth_reference','enclosed_camera_silhouette','read_only_mosaic_tile','metric_inert_slide'}
for h in (scanner,monitor,dummy):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'vs200.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'vs200.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=520;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.54,.60,.64,1);bg.inputs['Strength'].default_value=.64
 cu('Neutral base',(0,0,-.007),(12,12,.013),mat('Bench neutral gray',(.29,.31,.32)),None)
 for p,w in [((.45,-1.4,1.4),93),((-1.14,-.39,.99),69),((.75,1.14,1.24),98)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.12;l.rotation_euler=(Vector((-.16,0,.20))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('cabinet-view',(.93,-1.77,.96),(-.25,.02,.31),1.65),('rear-view',(.91,1.35,.87),(0,.092,.31),1.11)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
