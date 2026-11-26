"""Original metric TA Instruments Q50 with standard vertical furnace. Blender 4+: blender -b -t 3 --python build-model.py. BTS_EQUIPMENT_RENDER=1 for original reference stills."""
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
blue=mat('Q-series enamel blue',(.125,.242,.38),.17,.40)
edge=mat('Pale slate moulding',(.32,.43,.54),.20,.39)
dark=mat('Top smoked gray panel',(.038,.049,.061),.12,.44)
black=mat('Black ferrules and vent',(.018,.028,.030),.21,.53)
outline=mat('Bright nickel trim',(.56,.61,.66),.66,.31)
steel=mat('Pan support metal',(.54,.54,.50),.66,.36)
paper=mat('Pale legend',(.85,.88,.89))
amber=mat('Small passive warning label',(.66,.47,.055))
olive=mat('Virtual specimen marker',(.37,.47,.30),.10)
lamp=mat('Ready lamp lens',(.34,.64,.44))
cube('base_envelope',(0,0,.078),(.470,.559,.134),blue,.013)
cube('Front upper sloping strip',(0,-.246,.139),(.439,.056,.048),edge,.010)
cube('Forward black control inset',(0,-.276,.115),(.339,.007,.028),dark,.004)
for x in (-.172,.172):
 for y in (-.206,.199):cube('Isolation foot',(x,y,.0065),(.062,.062,.013),black,.005)
cube('TGA blue vertical bridge',(-.078,.114,.310),(.241,.230,.402),blue,.014)
cube('Thermobalance outer housing',(-.109,-.073,.456),(.220,.311,.130),dark,.010)
cube('Top head front recess',(-.109,-.229,.459),(.167,.008,.075),black,.008)
cube('Vertical housing right-hand electronics',(.132,.060,.258),(.150,.292,.253),dark,.011)
cube('Hood over electronics',(.132,.069,.392),(.153,.252,.022),edge,.006)
label('Model identification','Q50  TGA',(.125,-.095,.325),.020,paper)
label('Head instrument tag','THERMOBALANCE',(-.109,-.234,.468),.011,paper)
cube('Safety label backer',(-.109,-.235,.441),(.107,.001,.016),amber,.0005)
cube('Standby button',(-.125,-.281,.115),(.021,.006,.012),dark,.002)
cube('power_key',(-.131,-.283,.114),(.023,.007,.015),edge,.003)
cube('furnace_key',(-.070,-.283,.116),(.027,.006,.014),edge,.003)
cube('tare_key',(-.013,-.283,.116),(.024,.006,.014),edge,.003)
cube('run_key',(.063,-.283,.116),(.026,.006,.014),blue,.003)
cube('ready_lamp',(.116,-.282,.116),(.009,.006,.008),lamp,.001)
for n,t,x in [('p','POWER',-.131),('f','FURNACE',-.070),('t','TARE',-.013),('r','REPLAY',.064)]:
 label(n,t,(x,-.284,.100),.005,paper)
x,y=-.113,-.126
frame=node('balance_frame',(x,y,.403))
cylinder('Balance collar',(x,y,.396),.040,.025,outline,'z',frame)
cylinder('Vertical suspension rod',(x,y,.360),.048,.0035,steel,'z',frame)
def link(n,p,q,r,m):
 p,q=Vector(p),Vector(q)
 o=cylinder(n,(p+q)*.5,(q-p).length,r,m)
 o.rotation_euler=(q-p).to_track_quat('Z','Y').to_euler();return o
pan=node('pan_anchor',(x,y,.304));samp=node('specimen_anchor',(x,y,.306))
cylinder('pan_floor',(x,y,.3025),.0014,.005,steel,'z',pan)
for i in range(3):
 u=2*math.pi*i/3
 keep(link('Hanging pan wire',(x,y,.336),(x+.0045*math.cos(u),y+.0045*math.sin(u),.304),.0006,steel),pan)
cylinder('Specimen symbol',(x,y,.305),.0018,.003,olive,'z',samp)
keep(samp,pan)
# Draft geometry: vertical slide reveals the suspended pan. Actual dimensions and stroke are not claimed.
car=node('furnace_carriage',(x,y,.275))
cylinder('Furnace motor steel coupling',(x,y,.210),.047,.020,outline,'z',car)
cylinder('Furnace black barrel',(x,y,.274),.122,.050,black,'z',car)
cylinder('Furnace upper rim',(x,y,.336),.006,.053,outline,'z',car)
cylinder('Furnace ceramic throat',(x,y,.3395),.002,.035,dark,'z',car)
for j in range(5):cylinder('Furnace finishing band',(x,y,.233+j*.019),.0018,.051,edge,'z',car)
# Original shallow pan-loading landing controls.
cube('pan_key',(.052,-.151,.161),(.037,.027,.015),edge,.003)
cylinder('Inset park ring',(.116,-.147,.163),.005,.027,outline)
for p,px,pz in [('supply',.134,.163),('host',.086,.155),('passive',-.107,.173)]:
 cube('Rear recessed '+p,(px,.272,pz),(.036,.007,.014),black,.002)
 node('port_'+p,(px,.279,pz))
for i in range(10):cube('Rear relief vent',(.018+i*.016,.277,.212),(.008,.003,.040),black)
hold={'base_envelope','power_key','furnace_key','tare_key','run_key','pan_key','ready_lamp','pan_floor'}
for parent in (None,pan,samp,frame,car):
 for mat0 in list(bpy.data.materials):
  arr=sorted([o for o in s.objects if o.type=='MESH' and o.parent==parent and o.name not in hold and o.data.materials[:]==[mat0]],key=lambda o:o.name)
  if len(arr)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in arr:o.select_set(True)
  bpy.context.view_layer.objects.active=arr[0];bpy.ops.object.join();arr[0].name=(parent.name if parent else 'Q50 body')+' '+mat0.name
for o in list(s.objects):
 if o!=root and not o.parent:keep(o,root)
bpy.ops.export_scene.gltf(filepath=str(P/'q50.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'q50.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=730;s.render.resolution_y=505;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.58,.66,.73,1);bg.inputs['Strength'].default_value=.57
 cube('Studio granite',(0,0,-.006),(20,20,.011),mat('Slate lab table',(.25,.29,.31)))
 for p,power in [((.40,-1.03,.91),42),((-.74,-.48,.70),44),((.41,.60,.90),54)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=power;l.data.size=.53;l.rotation_euler=(Vector((0,0,.25))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,z,d in [('instrument-view',(.45,-1.23,.79),(0,0,.26),.83,0),('pan-view',(-.31,-.55,.46),(-.111,-.118,.284),.285,-.091)]:
  car.location.z+=d
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=z;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
  car.location.z-=d
