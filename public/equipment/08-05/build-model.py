"""Original model in metres of the Davis-style FL300 open deck, pickup and optics. Cabinet and handling travel are inferred, not OEM dimensions. Blender 4+: blender -b -t 3 --python build-model.py; BTS_EQUIPMENT_RENDER=1 for views."""
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
stand=node('main_cell',(0,0,0))
cream=mat('Off-white powder coated cabinet',(.67,.67,.58),.12,.45)
al=mat('Satin rail and guide block',(.57,.62,.65),.65,.32)
black=mat('Black optical plate',(.022,.032,.046),.20,.54)
gray=mat('Anodized instrument charcoal',(.071,.092,.109),.27,.39)
gold=mat('Metric synthetic die pads',(.61,.43,.105),.70,.31)
teal=mat('Synthetic passive die',(.075,.37,.40),.27,.34)
green=mat('Status ring',(.18,.61,.39))
red=mat('Status controls',(.52,.088,.070))
acrylic=mat('Virtual guard translucent',(.15,.25,.28),.06,.31,.27)
ink=mat('Instrument controls legends',(.035,.049,.052))
cube('Cell envelope estimate',(0,0,.485),(.96,.79,.84),cream,.010,stand)
cube('Lower flange',(0,0,.093),(.931,.752,.039),gray,.006,stand)
for x in (-.365,.365):
 for y in (-.265,.260):cylinder('Leveling wheel',(x,y,.039),.078,.039,black,'z',stand)
for x in (-.227,.226):
 cube('Cabinet front door',(x,-.391,.459),(.444,.016,.659),cream,.007,stand)
 cube('Door recessed pull',(x+.154,-.405,.483),(.020,.014,.102),gray,.004,stand)
cube('Black deck',(0,0,.930),(.956,.778,.064),black,.007,stand)
cube('Front operator strip',(0,-.394,.879),(.913,.017,.088),cream,.004,stand)
for x,m in [(-.349,green),(-.291,red),(-.192,black),(.024,gray),(.335,red)]:
 cylinder('Operator auxiliary key',(x,-.408,.876),.012,.010,m,'y',stand)
for n,x,m in [('power_key',-.324,green),('head_key',-.245,gray),('run_key',-.111,teal),('load_key',.137,gray)]:
 cube(n,(x,-.410,.876),(.036,.015,.018),m,.003,stand)
label('Front cell marking','ficonTEC   FL300',(.208,-.406,.875),.017,ink,stand)
# Clearance frame over the open deck. Protective swing panel is an illustrative interface guard, not OEM hardware.
for x in (-.453,.453):
 cube('Rear frame post',(x,.342,1.315),(.045,.045,.764),al,.002,stand)
 cube('Upper support rail',(x,.021,1.690),(.045,.686,.037),al,.002,stand)
cube('Upper longitudinal rail',(0,.341,1.690),(.931,.042,.037),al,.002,stand)
guard=node('guard_hinge',(-.443,-.355,1.285));keep(guard,stand)
cube('Clear virtual guard',(0,-.355,1.298),(.874,.007,.613),acrylic,0,guard)
for x in (-.437,.437):cube('Guard vertical rim',(x,-.355,1.299),(.016,.018,.626),al,.001,guard)
for z in (.984,1.611):cube('Guard horizontal rim',(0,-.355,z),(.887,.018,.014),al,.001,guard)
cube('guard_handle',(.372,-.377,1.269),(.043,.028,.111),black,.004,guard)
cube('Central optical base',(0,-.061,.991),(.636,.472,.055),gray,.005,stand)
for x in (-.212,.211):
 cube('XYZ positioner base',(x,-.083,1.057),(.147,.198,.073),al,.005,stand)
 cube('Stage black positioner',(x,-.085,1.102),(.112,.184,.044),black,.004,stand)
 for z in (1.084,1.109):cylinder('Linear guided slider',(x,-.199,z),.057,.009,al,'y',stand)
cube('Center chuck',(0,-.167,1.040),(.115,.102,.035),black,.003,stand)
cube('sample_witness',(0,-.167,1.066),(.004,.004,.001),teal,.0001,stand)
cube('Detachable carrier block',(0,-.094,1.066),(.036,.069,.012),al,.002,stand)
emit=node('emitter_axis',(0,-.171,1.067));keep(emit,stand)
receive=node('receiver_motion',(0,-.072,1.067));keep(receive,stand)
cube('Receiver clamp',(.041,-.073,1.098),(.079,.087,.039),gray,.004,receive)
cylinder('Receiver ferrule',(0,-.108,1.067),.062,.003,al,'y',receive)
keep(node('receiver_axis',(0,-.139,1.067)),receive)
for x in (-.00075,.00075):cube('True scale witness die trace',(x,-.167,1.0665),(.000020,.000020,.00001),gold,0,stand)
cube('Vertical pick rail saddle',(0,.167,1.260),(.115,.185,.437),al,.006,stand)
cube('Z slip rail',(0,.070,1.224),(.092,.056,.316),gray,.004,stand)
head=node('pickup_head',(0,-.167,1.208));keep(head,stand)
cube('Pick motor body',(0,-.097,1.265),(.079,.199,.101),al,.005,head)
cylinder('Pickup shaft',(0,-.167,1.157),.112,.0065,al,'z',head)
cylinder('Actual pickup tip silhouette',(0,-.167,1.099),.006,.0014,gray,'z',head)
cube('Upper view camera',(-.107,-.198,1.329),(.044,.063,.072),gray,.004,stand)
cylinder('Upper camera objective',(-.107,-.198,1.279),.038,.020,black,'z',stand)
cube('Lower view optics mount',(.129,-.195,1.017),(.068,.062,.040),gray,.003,stand)
cylinder('Lower camera optic',(.129,-.195,1.045),.015,.016,black,'z',stand)
for n,x,z in [('motion',-.226,.463),('control',-.071,.452),('power',.144,.454)]:
 cube('Passive rear port '+n,(x,.395,z),(.036,.011,.022),black,.002,stand)
 keep(node('port_'+n,(x,.402,z)),stand)
# A generic two-monitor mount derived from the workspace photo, no serial inference.
work=node('operator_station',(.806,0,0));keep(work,root)
cube('Workstation base',(.806,.037,.050),(.340,.319,.078),gray,.013,work)
cylinder('Workstation upright',(.806,.051,.712),1.28,.042,al,'z',work)
cube('Keyboard tray',(.808,-.127,1.001),(.426,.252,.027),gray,.005,work)
for x in (.626,.984):
 cube('Monitor glass',(x,-.017,1.422),(.344,.042,.233),black,.009,work)
 cube('Inset screen',(x,-.043,1.423),(.315,.008,.204),gray,.003,work)
freeze={'guard_handle','power_key','head_key','run_key','load_key','sample_witness'}
for holder in (stand,guard,receive,head,work):
 for m in list(bpy.data.materials):
  v=sorted([o for o in holder.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]],key=lambda o:o.name)
  if len(v)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in v:o.select_set(True)
  bpy.context.view_layer.objects.active=v[0];bpy.ops.object.join();v[0].name=holder.name+' '+m.name
keep(stand,root)
bpy.ops.export_scene.gltf(filepath=str(P/'fl300.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'fl300.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=9;s.cycles.use_denoising=False
 s.render.resolution_x=800;s.render.resolution_y=515;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.64,.66,.69,1);bg.inputs['Strength'].default_value=.56
 cube('Floor',(0,0,-.007),(35,35,.012),mat('Graphite cleanroom floor',(.27,.28,.30)))
 for p,w in [((.43,-2.1,2.7),190),((-1.40,-1.41,2.1),160),((.74,1.82,2.32),170)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.4;l.rotation_euler=(Vector((0,0,1.03))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,z,opening in [('instrument-view',(.69,-3.41,2.32),(.27,0,.86),2.38,0),('stage-view',(-.47,-1.44,1.65),(0,-.085,1.12),.84,-72)]:
  guard.rotation_euler.z=math.radians(opening)
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=z;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
