"""Original metric TA Discovery HR-2, 40 mm parallel plate on Peltier stage. Blender 4+: blender -b -t 3 --python build-model.py. Set BTS_EQUIPMENT_RENDER=1 for original views."""
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
root=node('bts_bench_anchor',(0,0,0))
main=node('main_body',(0,0,0))
shell=mat('Graphite painted enclosure',(.049,.062,.075),.18,.39)
orange=mat('Amber anodized spine',(.70,.282,.035),.37,.40)
dark=mat('Deep graphite inset',(.018,.025,.033),.18,.39)
silver=mat('Brushed stainless steel',(.56,.59,.62),.77,.30)
bright=mat('Silver laminate display surround',(.60,.66,.72),.27,.34)
blue=mat('Front and controller indicator',(.068,.27,.45),.12,.32)
paper=mat('Light engraved identification',(.75,.81,.84))
liquid=mat('Modeled inert liquid disk',(.37,.635,.52),.04,.27)
floor=mat('Stage pads',(.031,.035,.039),.02,.62)
cube('envelope_base',(0,0,.073),(.32,.42,.12),shell,.022,main)
cube('Base heavy plinth',(0,.007,.125),(.294,.388,.043),shell,.015,main)
for x in (-.110,.110):
 for y in (-.155,.151):cube('Damping foot',(x,y,.0065),(.06,.061,.013),floor,.005,main)
cube('Spine backbone',(0,.125,.445),(.223,.125,.61),shell,.016,main)
cube('Rounded top cap',(0,.116,.734),(.214,.146,.052),shell,.015,main)
cube('Inner vertical support',(0,.056,.414),(.171,.026,.574),orange,.005,main)
cube('Vertical translation slot',(0,.032,.465),(.056,.019,.329),dark,.003,main)
cube('Base cheeks',(.0,-.091,.142),(.292,.233,.045),shell,.017,main)
cube('Front panel silver insert',(0,-.199,.107),(.235,.013,.050),bright,.008,main)
cube('Status window',(0,-.207,.116),(.122,.006,.023),blue,.002,main)
for x in (-.089,-.066,.061,.084):cube('Inlaid soft key',(x,-.207,.091),(.014,.006,.009),dark,.001,main)
cube('head_button',(-.083,-.210,.111),(.029,.011,.019),bright,.003,main)
cube('run_button',(.082,-.210,.111),(.030,.011,.019),blue,.003,main)
cube('power_button',(.113,-.205,.087),(.020,.012,.018),dark,.002,main)
label('Front label','DISCOVERY HR-2',(0,-.214,.067),.014,paper,main)
label('Badge','TA',(0,-.211,.116),.014,paper,main)
stage_y=-.079
cylinder('Peltier orange foundation',(0,stage_y,.179),.041,.070,orange,'z',main)
cylinder('Peltier mount',(0,stage_y,.208),.022,.059,orange,'z',main)
cylinder('Peltier lower heat sink',(0,stage_y,.227),.019,.048,silver,'z',main)
cylinder('lower_plate',(0,stage_y,.241),.012,.040,silver,'z',main)
cylinder('Peltier side return',(.052,stage_y,.195),.025,.005,silver,'x',main)
cube('sample_action',(-.085,-.124,.157),(.037,.026,.014),silver,.003,main)
anchor=node('plate_station_anchor',(0,stage_y,.247));keep(anchor,main)
sample=node('sample_gap',(0,stage_y,.247));keep(sample,main)
cylinder('sample_liquid',(0,stage_y,.2475),.001,.02,liquid,'z',sample)
head=node('head_carriage',(0,stage_y,.505));keep(head,main)
cube('Motor head main castings',(0,-.017,.495),(.204,.249,.266),shell,.018,head)
cube('Motor head front fascia',(0,-.138,.496),(.187,.022,.211),dark,.014,head)
cube('Head observer light',(0,-.151,.522),(.076,.009,.062),blue,.004,head)
label('Motor head badge','TA',(0,-.156,.520),.028,paper,head)
cylinder('Beneath head spindle surround',(0,stage_y,.346),.044,.044,bright,'z',head)
rotor=node('rotor_pivot',(0,stage_y,.248));keep(rotor,head)
cylinder('Rotating precision shaft',(0,stage_y,.304),.087,.010,silver,'z',rotor)
cylinder('Smart Swap fitting',(0,stage_y,.269),.025,.013,silver,'z',rotor)
cylinder('upper_40mm',(0,stage_y,.252),.008,.020,silver,'z',rotor)
cube('Shaft orientation witness',(.008,stage_y,.278),(.005,.006,.020),orange,.001,rotor)
for i in range(12):cube('Rear air slot',(-.065+i*.011,.19,.443),(.006,.003,.045),dark,0,main)
for n,x,z in [('control',.074,.138),('air',.041,.181),('peltier',-.054,.152)]:
 cube('Rear '+n+' well',(x,.202,z),(.029,.011,.019),dark,.001,main)
 keep(node('port_'+n,(x,.209,z)),main)
control=node('external_controller',(.367,.03,0));keep(control,root)
cube('ECM metal enclosure',(.367,.034,.178),(.2286,.4064,.33),shell,.011,control)
cube('ECM amber insert',(.367,-.172,.177),(.177,.01,.244),orange,.005,control)
cube('Controller handle',(.367,-.182,.263),(.091,.022,.018),gray if 'gray' in globals() else dark,.003,control)
for z in (.09,.107,.123):cube('ECM amber key',(.414,-.179,z),(.017,.006,.010),dark,.001,control)
label('Controller label','DHR CONTROLLER',(.368,-.181,.210),.013,paper,control)
hold={'envelope_base','upper_40mm','lower_plate','head_button','power_button','run_button','sample_action','sample_liquid'}
for p in (main,head,rotor,control):
 for m in list(bpy.data.materials):
  a=sorted([o for o in p.children if o.type=='MESH' and o.name not in hold and o.data.materials[:]==[m]],key=lambda o:o.name)
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=p.name+' '+m.name
keep(main,root)
bpy.ops.export_scene.gltf(filepath=str(P/'dhr2.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'dhr2.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=730;s.render.resolution_y=510;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.62,.66,.72,1);bg.inputs['Strength'].default_value=.53
 cube('Bench surface',(0,0,-.006),(20,20,.010),mat('Slate lab bench',(.25,.28,.29)))
 for p,w in [((.60,-.98,1.30),62),((-.70,-.57,.77),48),((.39,.61,1.06),51)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=.58;l.rotation_euler=(Vector((0,0,.35))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,size in [('instrument-view',(.53,-1.20,.91),(.12,0,.35),1.15),('fixture-view',(.27,-.52,.33),(0,-.07,.245),.25)]:
  bpy.ops.object.camera_add(location=p);c=bpy.context.object;c.rotation_euler=(Vector(t)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=size;s.camera=c
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
