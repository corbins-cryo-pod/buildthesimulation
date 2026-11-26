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
rub=material('Graphite molded bumpers',(.69,.68,.61),0,.80)
case=material('Brushed enclosure, satin gray',(.29,.30,.29),.52,.42)
panel=material('Instrument face',(.53,.55,.51),.14,.5)
keys=material('Soft-touch switches',(.075,.097,.092),0,.48)
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
 vs=[(x,b,.0509+z) for b in (y-depth/2,y+depth/2) for ring in path for x,z in ring]
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
box('Folded aluminum enclosure',(0,0,.0509),(.2058,.370,.076),case,.004)
rectring('Recessed front bezel',-.184,.009825,.206375,.076,.0043,.0054,rub)
box('Printed front panel',(0,-.185,.0509),(.197,.003,.067),panel,.0008)
box('Rear backplate',(0,.185,.0509),(.197,.005,.067),black,.001)
foot=material('Elastomer legs and vent fascia',(.018,.024,.023),0,.7)
pale=material('Panel white legends',(.93,.94,.88),0,.46)
ink=material('Panel carbon legends',(.039,.043,.036),0,.55)
reed=material('Supply POS socket',(.48,.041,.049),.1,.4)
for x in (-.075,.075):
 for y in (-.147,.147):box('Bench anti-slip foot',(x,y,.0065),(.017,.023,.013),foot,.0018)
for x in (-.103,.103):
 box('Horizontal side black fascia',(x,0,.047),(.001,.358,.028),foot,.0008)
 for y0 in (-.07,.075):
  a=[]
  for i in range(4):a.append(box('Slot',(x*1.004,y0+i*.005,.047),(.0005,.0017,.019),black))
  group(a,'Inclined air slots')
for x in (-.082,-.034,.045,.073):box('Panel group line',(x,-.1867,.059),(.001,.0007,.055),ink)
def button(n,x,z,w=.007,h=.008,m=keys):
 return box(n,(x,-.187,z),(w,.003,h),m,.001)
controls=[('front_hp_down',-.091,.058),('front_hp_up',-.068,.058),('front_rolloff',-.052,.061),('front_lp_down',-.035,.058),('front_lp_up',-.011,.058),
 ('front_coupling',-.079,.039),('front_source',-.052,.03),('front_invert',-.023,.039),('front_gain_up',.043,.058),('front_gain_down',.043,.04),
 ('front_gain_mode',.028,.074),('front_reset',.086,.074),('front_power',.080,.032)]
for n,x,z in controls:button(n,x,z,.012 if n=='front_power' else .008,.006 if n=='front_power' else .008,m=pale if n=='front_power' else keys)
def bnc(n,x,y,z,d,m=shiny):
 cyl(n,(x,y,z),.0055,.0016,m)
 tor(n+' shell',(x,y+.0014*d,z),.0039,.001,shiny)
 cyl(n+' insert',(x,y+.0013*d,z),.0033,.001,black)
 cyl(n+' center',(x,y+.0023*d,z),.0007,.0012,brass)
for n,x in [('input_a',-.076),('input_b',-.026),('output_600',.014),('output_50',.044)]:
 bnc(n,x,-.186,.024,-1)
for n,x,co in [('minus12',-.016,foot),('amp_ground',-.033,pale),('plus12',-.054,reed),('chassis_ground',-.079,green)]:
 bnc('rear_'+n,x,.185,.068,1,co)
bnc('rear_blanking',-.079,.184,.047,1)
box('Rear transformer cover',(.066,.186,.050),(.050,.004,.050),shiny,.004)
box('Rear IEC and fuse inlet',(.018,.186,.051),(.025,.003,.051),foot,.0012)
box('Rear DB25 shell',(-.062,.185,.032),(.042,.004,.012),shiny,.0014)
box('Rear DB25 pin base',(-.062,.1872,.032),(.039,.001,.009),black,.0014)
for i in range(25):
 x=-.080+(i%13)*.0029;z=.034-(i//13)*.004
 cyl('Serial socket',(x,.1877,z),.00043,.0005,shiny)
for x in (-.016,-.054):cyl('Battery primary fuse cap',(x,.186,.047),.005,.0025,foot)
for u,name,z in [(-.015,'charger',.026),(-.039,'maintenance',.026)]:
 cyl('Rear LED '+name,(u,.187,.027),.0015,.001,reed if name=='charger' else yellow)
for i,(n,x,z) in enumerate([('a',-.067,.043),('ab',-.055,.043),('b',-.043,.043),('dc',-.094,.039),('ac',-.094,.043),('gnd',-.094,.035),('inv',-.013,.039),('line',.085,.04),('overload',.075,.074),('hp',-.083,.064),('lp',-.016,.064)]):
 box('led_'+n,(x,-.1868,z),(.0035,.0017,.002),green if n!='overload' else reed)
lab=[]
for name,w,x,z,size in [('badge','STANFORD RESEARCH SYSTEMS      SR560',0,.082,.0043),('filter','FILTER CUTOFFS (Hz)',-.053,.075,.0030),
('hp','HIGH-PASS',-.081,.066,.0029),('lp','LOW-PASS',-.025,.066,.0029),('rof','ROLLOFF',-.052,.052,.0020),('input','SOURCE',-.053,.049,.0030),
('couple','COUPLING',-.085,.049,.0029),('invert','INVERT',-.018,.049,.0029),('gain','GAIN',.025,.066,.0030),('gainmode','GAIN MODE',.029,.079,.0028),
('output','OUTPUT',.028,.033,.0027),('portsA','A',-.088,.024,.0030),('portsB','B',-.015,.024,.0030),('50','50 Ω',.052,.017,.0027),('600','600 Ω',.006,.017,.0027),
('reset','RESET',.081,.079,.0029),('status','STATUS',.081,.064,.0029),('power','POWER',.081,.046,.0029)]:
 lab.append(label(name,w,(x,-.1878,z),size,ink))
for key,text_,x,z in [('SER','RS232',-.062,.041),('B','BLANKING IN',-.079,.056),('FL','FUSED AC',.039,.078),('POS','+12 V',-.054,.075),('NEG','-12 V',-.016,.075),('AMP','AMP GND',-.033,.075),('G','CHASSIS',-.079,.075),('Warn','ELECTRONICS ONLY - NOT FOR HUMAN USE',-.034,.018)]:
 lab.append(label(key,text_,(x,.1883,z),.0027,pale,True))
group(lab,'Original panel legends')
for n in ['input_a','input_b','output_50','output_600','rear_blanking']:
 o=bpy.data.objects[n];o.name=n+' visual base';anchor(n,o.location.copy())
frozen={n for n,_,_ in controls if n!='front_gain_mode'}|{o.name for o in s.objects if o.name.startswith('led_')}
for m in sorted(bpy.data.materials,key=lambda m:m.name):
 batch=[o for o in s.objects if o.type=='MESH' and o.name not in frozen and len(o.data.materials)==1 and o.data.materials[0]==m]
 if len(batch)>1:group(batch,'Static · '+m.name)
for o in list(s.objects):
 if o!=root:o.parent=root
bpy.ops.export_scene.gltf(filepath=str(P/'sr560.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):
 bpy.ops.wm.save_as_mainfile(filepath=str(P/'sr560-source.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
 s.render.resolution_x=800;s.render.resolution_y=500;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=86
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.58,.65,.70,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.36
 ground=material('Reference sheet background',(.27,.31,.33),0,.65);box('Studio floor',(0,0,-.005),(200,200,.008),ground)
 for name,loc,energy in [('Key',(.24,-.34,.45),12),('Fill',(-.35,-.19,.35),9),('Rim',(-.02,.25,.45),13)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=energy;l.data.size=.30;l.rotation_euler=(Vector((0,0,.045))-l.location).to_track_quat('-Z','Y').to_euler()
 for name,loc,cnt,scale in [('front-view',(.270,-.64,.30),(0,0,.045),.53),('rear-view',(0,.62,.125),(0,.1,.05),.29),('source-detail',(0,-.51,.095),(-.037,-.170,.043),.162)]:
  bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.rotation_euler=(Vector(cnt)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=scale;s.camera=c;s.render.filepath=str(P/(name+'.webp'));bpy.ops.render.render(write_still=True)
