"""Original Blender geometry from documented enclosure and reference-informed details.
Run from this directory: blender -b -t 4 --python build-model.py .
Optional BTS_EQUIPMENT_RENDER=1 renders original annotated page's source views.
"""
import bpy, math, os
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene
s.unit_settings.system='METRIC'
s.unit_settings.scale_length=1
S=set()
def material(name,color,metal=0,rough=.42):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 return m
rub=material('Graphite molded bumpers',(.055,.059,.064),0,.80)
case=material('Brushed enclosure, satin gray',(.34,.37,.39),.52,.42)
panel=material('Instrument face',(.54,.56,.56),.14,.5)
keys=material('Soft-touch switches',(.69,.73,.71),0,.48)
black=material('Socket recesses',(.013,.018,.02),0,.66)
shiny=material('Nickel-plated connectors',(.58,.61,.63),.8,.25)
brass=material('BNC center conductor',(.65,.45,.20),.74,.3)
yellow=material('CH1 yellow',(.93,.58,.022),0,.36)
green=material('CH2 green',(.24,.63,.07),0,.36)
display=material('Display insert',(.037,.071,.078),.06,.35)
dark=material('Fan inlet',(.023,.027,.029),0,.68)
def addmat(o,n,m):o.name=n; o.data.materials.append(m);S.add(o);return o
def box(n,p,d,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=addmat(bpy.context.object,n,m);o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Tool fillet','BEVEL');b.width=bevel;b.segments=3
  bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def cyl(n,p,r,d,m,axis='y'):
 rot={'y':(math.pi/2,0,0),'x':(0,math.pi/2,0),'z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=d,location=p,rotation=rot);return addmat(bpy.context.object,n,m)
def tor(n,p,r,rim,m):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=rim,major_segments=24,minor_segments=8,location=p,rotation=(math.pi/2,0,0));return addmat(bpy.context.object,n,m)
def rectring(n,y,depth,w,h,thick,rad,m):
 def cornerline(w,h,rad):
  pts=[]
  for x,z,a in [(w/2-rad,h/2-rad,0),(-w/2+rad,h/2-rad,90),(-w/2+rad,-h/2+rad,180),(w/2-rad,-h/2+rad,270)]:
   for i in range(7):
    t=math.radians(a+i*15); pts.append((x+rad*math.cos(t),z+rad*math.sin(t)))
  return pts
 path=[cornerline(w,h,rad),cornerline(w-2*thick,h-2*thick,max(.003,rad-thick))]
 vs=[(x,b,.0525+z) for b in (y-depth/2,y+depth/2) for ring in path for x,z in ring]
 k=len(path[0]);fs=[]
 for i in range(k):
  j=(i+1)%k
  fs.extend([(i,j,j+k,i+k),(i+k,j+k,j+3*k,i+3*k),(i+3*k,j+3*k,j+2*k,i+2*k),(i+2*k,j+2*k,j,i)])
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],fs);me.update()
 o=bpy.data.objects.new(n,me);s.collection.objects.link(o);addmat(o,n,m)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 b=o.modifiers.new('Lip fillet','BEVEL');b.width=.0014;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def anchor(n, p):
 o=bpy.data.objects.new(n,None);s.collection.objects.link(o);o.location=p;o.empty_display_size=.01;return o
def label(n,string,p,size,m,back=False):
 c=bpy.data.curves.new(n,'FONT');c.body=string;c.size=size;c.align_x='CENTER';c.align_y='CENTER';c.materials.append(m);c.resolution_u=3
 o=bpy.data.objects.new(n,c);s.collection.objects.link(o);o.location=p;o.rotation_euler=(math.pi/2,0,math.pi if back else 0)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');S.add(o);return o
def group(members,n):
 obs=sorted(members,key=lambda o:o.name);bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0]
 if len(obs)>1:bpy.ops.object.join()
 obs[0].name=n
 return obs[0]
root=anchor('bts_bench_anchor',(0,0,0))
enclosure=anchor('e4980a_enclosure',(0,0,0));enclosure.parent=root
box('Gray metal chassis',(0,0,.0525),(.318,.361,.086),case,.006)
rectring('Front bumper',-.186,.018,.375,.105,.012,.014,rub)
rectring('Rear bumper',.186,.018,.375,.105,.012,.014,rub)
box('Operator face',(0,-.18,.0525),(.340,.009,.081),panel,.002)
box('Rear metal interface plate',(0,.18,.0525),(.340,.009,.080),case,.002)
for i,x in enumerate((-.172,.172)):
 cyl('Handle pivot '+str(i),(x,-.131,.056),.017,.023,rub,'x')
# Active compact front controls remain separate from the face and legends.
blue=material('Recall keys',(.12,.23,.42),0,.47)
pale=material('Legends and contact substrate',(.83,.85,.80),0,.45)
legend=material('Dark engraved legends',(.017,.022,.021),0,.5)
fixturebody=material('Fixture textured base',(.55,.53,.48),.04,.55)
silver=material('Elastic steel clamps',(.53,.53,.53),.8,.24)
b= set(S)
for i,z in enumerate((.078,.068,.058,.048,.038,.027)):box('Display side key '+str(i),(-.056,-.186,z),(.012,.004,.007),keys,.0017)
for i,n in enumerate('7894561230.±'):
 x=.002+(i%3)*.015;z=.079-(i//3)*.0104
 box('Key '+n,(x,-.186,z),(.010,.004,.0075),keys,.0015)
for x,z in [(-.033,.080),(-.021,.069),(-.033,.058),(-.045,.069)]:
 box('Cursor key',(x,-.186,z),(.010,.004,.008),keys,.0017)
group(S-b,'Static navigation and menu keys')
for i,x in enumerate((-.137,-.119,-.101,-.083,-.065)):
 box('Recall '+str(i),(x,-.186,.016),(.014,.004,.007),blue,.0015)
box('Blue display bezel',(-.109,-.185,.056),(.090,.005,.061),black,.0015)
box('front_lcd',(-.109,-.1878,.056),(.087,.001,.058),display)
box('front_power',(-.154,-.187,.024),(.012,.004,.010),green,.002)
box('front_trigger',(-.154,-.187,.068),(.014,.004,.011),keys,.002)
box('front_preset',(-.154,-.187,.082),(.014,.004,.008),green,.002)
box('Front DC bias key',(-.154,-.186,.051),(.014,.004,.008),keys,.002)
box('Front DC source key',(-.154,-.186,.039),(.014,.004,.008),keys,.002)
box('front_format',(-.033,-.187,.044),(.014,.004,.009),keys,.002)
box('front_correction',(-.012,-.187,.044),(.014,.004,.009),keys,.002)
box('Front USB A',(.149,-.185,.077),(.014,.003,.007),black,.0008)
box('DC Option panel',(.012,-.185,.024),(.077,.003,.023),keys,.001)
box('Discharge label surround',(.120,-.186,.052),(.071,.001,.008),yellow,.0005)
def bnc(n,x,y,z,direction,col=shiny):
 cyl(n,(x,y,z),.0064,.0025,col)
 tor(n+' shell',(x,y+.0018*direction,z),.0045,.0011,shiny)
 cyl(n+' recess',(x,y+.0015*direction,z),.0041,.0014,black)
 cyl(n+' pin',(x,y+.0026*direction,z),.00082,.002,brass)
for label_,x in [('lcur',.083),('lpot',.107),('hpot',.131),('hcur',.155)]:bnc('port_'+label_,x,-.190,.027,-1)
bnc('front_dc_source',-.028,-.190,.026,-1)
bnc('front_chassis_ground',.035,-.190,.026,-1)
# Rear view matches handbook Fig. 2-2, which has factory interface blanks.
for n,x,z,d in [('AC power',.045,.039,(.029,.003,.025)),('GPIB',.046,.075,(.033,.003,.012)),('USB B',-.061,.076,(.010,.003,.009)),('LAN',-.115,.076,(.014,.003,.009)),('Interface blank 1',-.025,.038,(.060,.003,.031)),('Interface blank 2',-.096,.038,(.067,.003,.031))]:
 box(n,(x,.185,z),d,black,.001)
bnc('rear_ext_trigger',-.145,.190,.073,1)
for i in range(9):
 box('Rear fan slot '+str(i),(.091+i*.006,.185,.054),(.003,.002,.050),black,.001)
for side in (-1,1):
 shapes=[]
 for i in range(5):
  for j in range(13):
   shapes.append(box('Side vent',(side*.1595,-.010+j*.006,.029+.009*i),(.001,.004,.003),black))
 group(shapes,'Side ventilation '+str(side))
labs=[]
frontlabels=[
 ('Name','E4980A  PRECISION LCR METER',-.109,.091,.004),('Trigger','TRIG',-.154,.068,.0026),
 ('Preset','PRESET',-.154,.082,.0022),('Pwr','I/O',-.154,.024,.0026),
 ('Display','FORMAT',-.033,.044,.0018),('Correction','SETUP',-.012,.044,.0023),
 ('DC','DC SOURCE',.008,.026,.0023),('Setup','UNKNOWN',.120,.063,.003),
 ('Warning','DISCHARGE DUT BEFORE CONNECTING',.120,.052,.0025)]
for key,t,x,z,u in frontlabels:labs.append(label(key,t,(x,-.1892,z),u,legend))
for n,x in [('LCUR',.083),('LPOT',.107),('HPOT',.131),('HCUR',.155)]:
 labs.append(label(n,n,(x,-.1872,.037),.0026,legend))
for n,x,z in [('GPIB',.046,.085),('AC',.045,.025),('USB',-.061,.086),('LAN',-.115,.085),('EXT TRIG',-.145,.086)]:
 labs.append(label(n,n,(x,.187,z),.0025,pale,True))
group(labs,'Meter legends')
frozen={'front_lcd','front_power','front_trigger','front_preset','front_format','front_correction','port_lcur','port_lpot','port_hpot','port_hcur','rear_ext_trigger'}
for m in sorted(bpy.data.materials,key=lambda m:m.name):
 batch=[o for o in s.objects if o.type=='MESH' and o.name not in frozen and len(o.data.materials)==1 and o.data.materials[0]==m]
 if len(batch)>1:group(batch,'Static meter · '+m.name)
for o in list(s.objects):
 if o.type=='MESH':o.parent=enclosure
# 16034E-style fixture: documented family envelope; contacts and jaw movement inferred.
before=set(s.objects)
fx=anchor('fixture_16034e',(.119,-.225,.0))
# Build in global scene coordinates, then preserve pose while assigning fixture parent.
box('Fixture body',(.119,-.230,.023),(.128,.052,.032),fixturebody,.003)
box('Contact support',(.119,-.239,.040),(.014,.028,.008),pale,.0017)
for label_,x in [('lcur',.083),('lpot',.107),('hpot',.131),('hcur',.155)]:
 cyl('Fixture mate '+label_,(x,-.201,.027),.0054,.017,shiny)
cyl('fixture_jaw',(.097,-.239,.046),.0052,.025,silver,'x')
cyl('Fixture fixed jaw',(.141,-.239,.046),.0052,.025,silver,'x')
cyl('Fixture left probe',(.110,-.239,.046),.0017,.014,brass,'x')
cyl('Fixture right probe',(.128,-.239,.046),.0017,.014,brass,'x')
box('fixture_mount_control',(.072,-.243,.048),(.012,.015,.012),rub,.002)
box('chip_short',(.119,-.239,.046),(.010,.0035,.0018),shiny,.00025)
box('chip_dut',(.119,-.239,.046),(.0075,.0032,.0022),green,.0003)
for n,x in [('L',.094),('H',.142)]:
 label('Fixture '+n,n,(x,-.2567,.027),.0038,legend)
label('Fixture legend','16034E   SMD TEST FIXTURE',(.119,-.2566,.016),.0034,legend)
bpy.context.view_layer.update()
fx.parent=root
fa={'fixture_jaw','fixture_mount_control','chip_short','chip_dut'}
for m in sorted(bpy.data.materials,key=lambda m:m.name):
 batch=[o for o in s.objects if o not in before and o.type=='MESH' and o.name not in fa and len(o.data.materials)==1 and o.data.materials[0]==m]
 if len(batch)>1:group(batch,'Static fixture · '+m.name)
for o in list(s.objects):
 if o not in before and o.type=='MESH':
  mw=o.matrix_world.copy();o.parent=fx;o.matrix_world=mw
bpy.ops.export_scene.gltf(filepath=str(P/'e4980a.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):
 bpy.ops.wm.save_as_mainfile(filepath=str(P/'e4980a-source.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 bpy.data.objects['chip_short'].hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
 s.render.resolution_x=800;s.render.resolution_y=505;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio neutral');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.60,.68,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
 ground=material('Reference sheet background',(.30,.35,.39),.05,.65)
 box('Studio floor',(0,0,-.005),(200,200,.008),ground)
 for n,loc,energy,size in [('Key',(.14,-.3,.55),12,.3),('Fill',(-.32,-.16,.32),8,.28),('Rim',(-.05,.25,.40),13,.3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=n;l.data.energy=energy;l.data.size=size;l.rotation_euler=(Vector((0,0,.04))-l.location).to_track_quat('-Z','Y').to_euler()
 for name,loc,center,scale in [('front-view',(.34,-.70,.33),(0,-.02,.041),.58),('rear-view',(-.01,.66,.145),(0,.10,.055),.46),('fixture-detail',(.19,-.43,.19),(.12,-.232,.043),.205)]:
  bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.rotation_euler=(Vector(center)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=scale;s.camera=c;s.render.filepath=str(P/(name+'.webp'));bpy.ops.render.render(write_still=True)
