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
rub=material('Graphite molded bumpers',(.50,.50,.41),0,.80)
case=material('Brushed enclosure, satin gray',(.12,.25,.29),.52,.42)
panel=material('Instrument face',(.51,.55,.48),.14,.5)
keys=material('Soft-touch switches',(.07,.095,.084),0,.48)
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
 vs=[(x,b,.090+z) for b in (y-depth/2,y+depth/2) for ring in path for x,z in ring]
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
pale=material('Light nickel engraving',(.75,.75,.68),.12,.4)
white=material('Ivory front switches',(.67,.65,.48),0,.46)
darkink=material('Printed lettering',(.026,.039,.033),0,.58)
red=material('Variable knob red caps',(.32,.035,.033),0,.46)
teal=material('Handle pivot paint',(.09,.19,.21),.12,.55)
olive=material('CRT beige frame',(.54,.53,.35),.13,.56)
screen=material('CRT tinted glass',(.035,.13,.15),.33,.30)
box('Blue metal wrap',(0,0,.0885),(.292,.407,.137),case,.0045)
box('Printed face',(0,-.207,.087),(.287,.007,.136),panel,.0028)
rectring('CRT surround',-.212,.009,.132,.105,.012,.010,olive)
box('CRT recess',(0,-.2113,.090),(.105,.002,.084),black,.001)
box('crt_graticule',(0,-.2125,.090),(.100,.001,.080),screen)
box('Back plate',(0,.207,.086),(.288,.008,.130),teal,.003)
for x in (-.113,.113):
 for y in (-.175,.177):box('Composite foot',(x,y,.011),(.027,.033,.022),black,.003)
for x in (-.146,.146):
 cyl('Folded handle knob',(x+(.009 if x>0 else -.009),.006,.085),.021,.018,teal,'x')
 o=box('Folded aluminum side link',(x+(.002 if x>0 else -.002),.10,.094),(.004,.183,.007),shiny,.0008);o.rotation_euler.x=.128
box('Folded handle grip',(0,.192,.104),(.287,.019,.014),foot if 'foot' in globals() else black,.003)
for side in (-1,1):
 holes=[]
 for i in range(7):
  for j in range(8):
   holes.append(cyl('Side perforation',(side*.1461,-.153+j*.004,.036+i*.007),.00125,.0003,black,'x'))
 group(holes,'Front side exhaust array')
def fluted(n,x,z,r,d,y=-.214,m=keys):
 vs=[];N=40
 for gy in (-d/2,d/2):
  for j in range(N):
   ang=j*2*math.pi/N;rr=r*(1 if j%2==0 else .87)
   vs.append((rr*math.cos(ang),gy,rr*math.sin(ang)))
 faces=[tuple(range(N)),tuple(reversed(range(N,N*2)))]
 for j in range(N):k=(j+1)%N;faces.append((j,j+N,k+N,k))
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],faces);me.update()
 o=bpy.data.objects.new(n,me);s.collection.objects.link(o);o.location=(x,y,z);return addmat(o,n,m)
def knob(n,x,z,r=.0068,d=.006,cap=False):
 o=fluted(n,x,z,r,d)
 if cap:cyl(n+' var cap',(x,-.215-d/2,z),r*.36,.0019,red)
 return o
knob('front_vdiv',-.101,.106,.013,.008,True)
knob('right_channel_vdiv',-.101,.047,.013,.008,True)
knob('front_time',.105,.093,.014,.008,True)
knob('front_level',.135,.049,.0072,.006)
knob('delayed_trigger_level',.135,.128,.0072,.006)
knob('delay_time_dial',.091,.129,.0107,.006)
knob('front_position',-.127,.129,.0066,.006)
knob('ch2_position',-.127,.065,.0066,.006)
knob('front_intensity',-.063,.029,.0061,.005)
knob('front_focus',-.040,.029,.0061,.005)
for n,x in [('scale illumination',-.016),('horizontal position',.040),('B intensity',.064),('trace separation',.084),('holdoff',.107)]:
 knob(n,x,.029,.0055,.004)
def key(n,x,z,w=.005,h=.006):
 return box(n,(x,-.2125,z),(w,.004,h),white,.0007)
for n,x,z in [('front_auto',.096,.064),('front_normal',.096,.055),('front_single',.096,.044),('front_ch1',-.080,.094),('front_ch2',-.080,.057),('front_slope',.123,.061),('front_coupling',-.104,.092),('front_power',.134,.080)]:
 key(n,x,z,.006,.006)
for x,z in [(-.080,.084),(-.080,.074),(-.079,.066),(.083,.074),(.083,.064),(.083,.054),(.083,.044),(-.089,.028),(-.073,.028),(.022,.029)]:
 key('Passive panel key',x,z)
for n,x,z in [('trigger_sliding_source',.119,.052),('trigger_sliding_coupling',.110,.052),('delayed_source',.119,.125),('delayed_coupling',.110,.125),('CH2 coupling',-.104,.036)]:
 box(n+' slot',(x,-.211,z),(.004,.002,.016),black,.0004)
 box(n+' slider',(x,-.213,z),(.0034,.003,.004),white,.0005)
def bnc(n,x,z,y,d):
 o=cyl(n,(x,y,z),.0060,.0020,shiny)
 tor(n+' shell',(x,y+.0017*d,z),.0042,.001,shiny)
 cyl(n+' dielectric',(x,y+.0016*d,z),.0036,.001,black)
 cyl(n+' contact',(x,y+.0022*d,z),.0008,.001,brass)
 return o
for n,x,z in [('in_ch1',-.126,.085),('in_ch2',-.126,.032),('ext_a',.136,.033),('ext_b',.136,.103)]:
 o=bnc(n,x,z,-.213,-1);o.name=n+' visual';anchor(n,o.location.copy())
box('front_calibrator',(.001,-.2125,.029),(.019,.002,.009),keys,.0015)
box('Calibrator metal bar',(.001,-.214,.028),(.013,.0009,.002),shiny,.0003)
for n,x,z in [('rear_gate_a',.049,.123),('rear_gate_b',.049,.102),('rear_ch1_out',.049,.080),('rear_z',.049,.058)]:
 o=bnc(n,x,z,.210,1);o.name=n+' visual';anchor(n,o.location.copy())
box('Rear fan recess',(-.084,.211,.081),(.061,.003,.065),black,.003)
for i in range(12):
 for ang in (math.pi/4,-math.pi/4):
  o=box('Aluminum fan mesh',(-.084,.213,.056+i*.0045),(.054,.0007,.0011),shiny)
  # the fixed slanted slats imply the pictured grille without detailed woven CAD
  o.rotation_euler.y=ang*.24
box('Rear selector plate',(.099,.212,.055),(.038,.004,.038),black,.002)
fluted('Line selector caps',.099,.052,.004,.004,.215,shiny)
for x in (-.126,.126):
 for z in (.038,.131):box('Rear bumper socket',(x,.211,z),(.026,.013,.022),black,.003)
for name,x,z in [('ready',.120,.070),('trigger',.120,.060),('power',.132,.092)]:
 box('led_'+name,(x,-.212,z),(.0036,.0014,.0036),green,.0008)
labs=[]
front=[
 ('brand','TEKTRONIX 465B',-.109,.144,.0051),('volts','VOLTS/DIV',-.101,.126,.0031),('time','A AND B TIME/DIV',.105,.112,.003),
 ('CH1','CH 1 OR X',-.126,.098,.003),('CH2','CH 2 OR Y',-.126,.046,.003),
 ('source','TRIGGER',.126,.067,.0026),('a','AUTO',.102,.064,.0019),('b','NORM',.103,.055,.0019),('c','SINGLE',.104,.044,.0019),
 ('cal','300 mV  1 kHz',.001,.036,.0027),('int','INTENSITY',-.063,.022,.0022),
 ('focus','FOCUS',-.040,.022,.0022),('pos','POSITION',-.127,.140,.0025),('lvl','LEVEL',.134,.058,.0023)]
for n,t,x,z,d in front:labs.append(label(n,t,(x,-.211,z),d,darkink))
for n,t,x,z in [('rearA','A + GATE',.025,.123),('rearB','B + GATE',.025,.102),('rearC','CH1 OUT',.025,.080),('rearD','EXT Z',.025,.058),('case','465B  ANALOG OSCILLOSCOPE',.006,.136)]:
 labs.append(label(n,t,(x,.2118,z),.003,pale,True))
group(labs,'Instrument legends')
frozen={'front_vdiv','front_time','front_level','front_intensity','front_focus','front_coupling','front_slope','front_power','front_auto','front_normal','front_single','front_position','crt_graticule','front_calibrator'}|{o.name for o in s.objects if o.name.startswith('led_')}
for m in sorted(bpy.data.materials,key=lambda m:m.name):
 batch=[o for o in s.objects if o.type=='MESH' and o.name not in frozen and len(o.data.materials)==1 and o.data.materials[0]==m]
 if len(batch)>1:group(batch,'Static · '+m.name)
for o in list(s.objects):
 if o!=root:o.parent=root
bpy.ops.export_scene.gltf(filepath=str(P/'465b.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):
 bpy.ops.wm.save_as_mainfile(filepath=str(P/'465b-source.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
 s.render.resolution_x=800;s.render.resolution_y=515;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.57,.61,.66,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.32
 ground=material('Reference floor',(.27,.31,.34),0,.68);box('Studio floor',(0,0,-.005),(200,200,.008),ground)
 for n,p,e in [('Key',(.27,-.38,.62),12),('Fill',(-.42,-.21,.37),8),('Rim',(-.04,.34,.52),14)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.name=n;l.data.energy=e;l.data.size=.39;l.rotation_euler=(Vector((0,0,.070))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,l,z in [('front-view',(.35,-.66,.33),(0,0,.078),.58),('rear-view',(0,.65,.14),(0,.115,.074),.41),('crt-detail',(0,-.51,.12),(0,-.195,.085),.193)]:
  bpy.ops.object.camera_add(location=p);c=bpy.context.object;c.rotation_euler=(Vector(l)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=z;s.camera=c;s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
