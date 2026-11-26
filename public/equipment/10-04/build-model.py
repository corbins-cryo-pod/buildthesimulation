"""Original HEKA EPC 10 USB Single envelope, Red Star headstage and generic workstation. Metric, passive electronic dummy only."""
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
main=node('main_cabinet',(0,0,0));keep(main,root)
head=node('headstage_body',(.331,-.092,.049));keep(head,root)
dummy=node('dummy_slider',(.331,-.149,.049));keep(dummy,root)
work=node('generic_host',(.557,.081,0));keep(work,root)
shell=mat('Satin steel and pale coated panels',(.60,.64,.65),.41,.36)
membrane=mat('Pale front silkscreen panel',(.71,.74,.73),.09,.43)
edge=mat('Rack black extrusions',(.034,.054,.068),.20,.42)
steel=mat('Connector nickel body',(.54,.60,.63),.66,.30)
dark=mat('Black coax center',(.021,.029,.036),.13,.41)
blue=mat('HEKA style blue legend',(.028,.15,.35),.13,.38)
red=mat('Red Star accent and clipping lens',(.59,.042,.047),.23,.34)
green=mat('Power marker',(.15,.50,.33),.27,.34)
teal=mat('Virtual fixture screen',(.045,.20,.24),.20,.36)
amber=mat('Banana contact bead',(.60,.41,.076),.55,.31)
cu('envelope_frame',(0,0,.0765),(.428,.311,.137),shell,main,.005)
cu('Front panel',(0,-.150,.076),(.448,.010,.126),membrane,main,.003)
for x in (-.2285,.2285):
 cu('Rack mounting ear',(x,-.151,.077),(.026,.009,.135),shell,main,.002)
 for Y in (.028,.126):cu('Face ear aperture',(x,-.156,Y),(.010,.002,.014),dark,main,.0008)
for x in (-.160,.160):
 for y in (-.103,.098):cylinder('Bench foot',(x,y,.004),.008,.012,edge,group=main)
for z in (.013,.138):cu('Dark front seam',(0,-.156,z),(.425,.004,.004),edge,main,.001)
for x in (-.209,.209):
 for i in range(11):cu('Case vent',(x,-.034+.011*i,.104),(.002,.004,.014),edge,main,.0004)
for i in range(16):cu('Top ventilation slot',(-.169+i*.010,.077,.145),(.004,.027,.001),edge,main,.0005)
def bnc(n,x,y,z,g=main,back=False):
 d=1 if back else -1
 cylinder(n+' body',(x,y,z),.012,.0074,steel,'y',g)
 cylinder(n+' dark opening',(x,y+d*.007,z),.005,.0048,dark,'y',g)
 for u in (-1,1):cu(n+' retention lug',(x+u*.0062,y+d*.003,z),(.0032,.005,.0028),steel,g,.0006)
for col,(name,x) in enumerate([('DAC',-.192),('ADC',-.148),('TRIG',-.104),('EXT',-.044),('MON',.021),('FILTER',.069)]):
 for z in (.051,.087):bnc(name,x,-.154,z)
 label('Group '+name,name,(x,-.158,.115),.0057,blue,main)
cu('probe_port',(-.070,-.156,.047),(.025,.012,.014),edge,main,.0015)
label('Probe label','PROBE',(-.070,-.158,.031),.0051,blue,main)
for n,x,z,m in [('signal_ground',.111,.053,dark),('chassis',.191,.046,amber),('run_light',.130,.103,green),('clip_light',.154,.103,red)]:
 cylinder(n,(x,-.157,z),.008,.0043,m,axis='y',group=main)
cu('power_switch',(.189,-.156,.074),(.018,.012,.021),edge,main,.0009)
label('Main brand','HEKA',(.165,-.158,.126),.012,blue,main)
label('Main panel title','EPC 10 USB',(.153,-.158,.021),.012,blue,main)
for n,x,z,w,h in [('power',-.177,.074,.025,.027),('digital',-.101,.078,.036,.015),('usb',-.038,.067,.014,.012),('sync_a',.010,.068,.016,.014),('sync_b',.041,.068,.016,.014),('telegraph',.131,.073,.037,.016)]:
 cu('Rear connector '+n,(x,.154,z),(w,.010,h),dark,main,.001)
 keep(node('rear_'+n,(x,.160,z)),main)
for x in (.088,.175):bnc('Rear monitor',x,.154,.072,main,True)
# Manufacturer headstage envelope excludes its BNC/HDMI-style connectors.
cu('red_star_core',(.331,-.092,.049),(.017,.090,.0145),steel,head,.0007)
for t in (-.104,-.080):cu('Red Star accent',(.331,t,.057),(.013,.012,.0025),red,head,.0005)
cu('Headstage rear connector',(.331,-.041,.049),(.017,.012,.012),edge,head,.0008)
cylinder('Headstage contact',(.331,-.142,.049),.012,.0063,steel,'y',head)
cu('Headstage generic cradle',(.331,-.086,.024),(.069,.136,.045),edge,root,.003)
cu('Dummy casing',(.331,-.174,.049),(.028,.037,.018),teal,dummy,.0018)
cylinder('Passive plug silhouette',(.331,-.152,.049),.012,.005,steel,'y',dummy)
label('Dummy sticker','RC',(.331,-.194,.051),.0065,membrane,dummy)
keep(node('fixture_tip',(.331,-.149,.049)),dummy)
def cord(n,points,r,m,g):
 d=bpy.data.curves.new(n,'CURVE');d.dimensions='3D';d.resolution_u=7;d.bevel_depth=r;d.bevel_resolution=2
 sp=d.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for p,v in zip(sp.bezier_points,points):
  p.co=v;p.handle_left_type=p.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.data.materials.append(m)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return keep(o,g)
cord('Illustrative cable from bench headstage',[(-.069,-.168,.047),(-.070,-.229,.018),(.18,-.236,.012),(.290,-.164,.014),(.334,-.032,.048)],.0036,edge,root)
cu('Host laptop base',(.557,.061,.013),(.282,.208,.019),edge,work,.004)
cu('Key deck',(.557,.025,.025),(.245,.097,.005),dark,work,.002)
cu('Trackpad',(.554,-.045,.025),(.062,.035,.003),shell,work,.001)
cu('Host monitor chassis',(.557,.149,.115),(.285,.019,.196),edge,work,.004)
cu('Host abstract screen',(.557,.135,.116),(.262,.012,.167),teal,work,.003)
for i in range(5):cu('Screen trace line',(.540,.128,.065+i*.018),(.126,.002,.002),blue,work)
for n,x,m in [('software_run',.628,green),('software_mode',.572,blue),('software_usb',.483,shell)]:
 cu(n,(x,.127,.170),(.035,.008,.020),m,work,.001)
freeze={'envelope_frame','probe_port','power_switch','run_light','clip_light','red_star_core','software_run','software_mode','software_usb'}
for g in (main,head,dummy,work):
 for m in list(bpy.data.materials):
  o=[q for q in g.children if q.type=='MESH' and q.name not in freeze and q.data.materials[:]==[m]]
  if len(o)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for q in o:q.select_set(True)
  bpy.context.view_layer.objects.active=o[0];bpy.ops.object.join();o[0].name=g.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'epc10.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'epc10.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=800;s.render.resolution_y=490;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.56,.62,.67,1);bg.inputs['Strength'].default_value=.66
 cu('Floor',(0,0,-.007),(10,10,.013),mat('Bench neutral gray',(.29,.31,.32)),None)
 for p,w in [((.44,-1.25,1.18),83),((-.83,-.49,.64),62),((.64,.86,.80),70)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=.95;l.rotation_euler=(Vector((.12,0,.09))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('bench-view',(.83,-1.12,.68),(.225,-.03,.07),1.18),('rear-view',(-.37,.76,.38),(0,.035,.071),.78),('headstage-view',(.481,-.350,.19),(.332,-.100,.045),.225)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
