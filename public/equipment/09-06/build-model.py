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
rub=material('Graphite molded bumpers',(.035,.039,.043),0,.80)
case=material('Brushed enclosure, satin gray',(.29,.32,.34),.52,.42)
panel=material('Instrument face',(.09,.105,.11),.14,.5)
keys=material('Soft-touch switches',(.11,.126,.136),0,.48)
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
 vs=[(x,b,.0519+z) for b in (y-depth/2,y+depth/2) for ring in path for x,z in ring]
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
box('Main metal chassis',(0,0,.0519),(.2128,.2723,.0883),case,.005)
rectring('Front bumper',-.1436,.016,.2611,.1038,.013,.015,rub)
rectring('Rear bumper',.1436,.016,.2611,.1038,.013,.015,rub)
box('Operator face',(0,-.1377,.052),(.235,.009,.08),panel,.003)
box('Rear panel',(0,.14,.052),(.235,.008,.078),panel,.003)
for i,x in enumerate((-.117,.117)):
 cyl('Stowed handle hinge '+str(i),(x,-.087,.053),.019,.024,rub,'x')
ledgrey=material('White legends',(.77,.82,.83),0,.5)
# Active, separately named controls have stable transforms. The shape and label batches have no public names.
b=set(S)
for idx,x in enumerate((-.088,-.07,-.052,-.034,-.016,.002)):
 box('Soft '+str(idx),(x,-.1442,.022),(.015,.005,.007),keys,.0018)
for i,y in enumerate([.078,.068,.058,.048,.038,.028,.018]):
 box('Fixed '+str(i),(.017,-.1443,y),(.014,.005,.007),keys,.0018)
for i,num in enumerate('123456789·0±'):
 x=.037+(i%3)*.015; y=.078-(i//3)*.0102
 box('Key '+num,(x,-.1443,y),(.010,.0048,.0076),keys,.0015)
for x in (.092,.107):box('Cursor key',(x,-.1443,.042),(.012,.0048,.0076),keys,.0015)
group(S-b,'Static front switches')
for x,n,y in [(-.104,'front_power',.026),(.041,'front_trigger',.031),(.069,'front_ch1',.031),(.096,'front_ch2',.031)]:
 box(n,(x,-.1465,y),(.015,.0054,.0078),keys,.0018)
cyl('front_dial',(.098,-.1455,.064),.013,.010,rub)
box('Display bezel',(-.049,-.1445,.054),(.105,.0052,.057),black,.002)
box('front_lcd',(-.049,-.1475,.054),(.099,.001,.051),display)
box('Front USB A',(-.105,-.145,.050),(.006,.003,.013),black,.0005)
def bnc(n,x,z,y,direction,color):
 cyl(n,(x,y,z),.006,.0025,color)
 tor(n+' shell',(x,y+.0018*direction,z),.0042,.00115,shiny)
 cyl(n+' recess',(x,y+.0015*direction,z),.0036,.0018,black)
 cyl(n+' pin',(x,y+.0026*direction,z),.00085,.002,brass)
for n,x,m in [('sync',.04,shiny),('ch1',.069,yellow),('ch2',.097,green)]:
 bnc('port_'+n,x,.018,-.1465,-1,m)
for n,x,z in [('ref_in',.091,.074),('ref_out',.071,.074),('mod_in',.091,.032),('ext_trigger',.071,.032)]:
 bnc('rear_'+n,x,z,.1465,1,shiny)
# Rear layout follows the power/blank, fan, four BNC bank and ports in the inspected family rear photo.
for n,x,z,w,h in [('LAN',-.016,.024,.016,.010),('USB B',-.037,.024,.012,.011),('IEC input',-.082,.031,.03,.021),('GPIB cover',-.051,.066,.067,.026)]:
 box('Rear '+n,(x,.145,z),(w,.003,h),black,.0011)
cyl('Fan opening',(.032,.1455,.056),.027,.003,dark)
for r in (.007,.014,.021,.026):tor('Fan guard ring',(.032,.149,.056),r,.0005,shiny)
for ang in (math.pi/4,-math.pi/4):
 o=box('Fan guard brace',(.032,.149,.056),(.050,.001,.0011),shiny,.0002);o.rotation_euler.y=ang
# Batch the recess appearance on the metal side (not invisible cutout booleans).
side=[]
for i in range(8):
 for j in range(12):
  side.append(cyl('Vent impression',(.1067,-.041+j*.006+((i%2)*.003),.026+i*.005),.00155,.00055,black,'x'))
group(side,'Side ventilation array')
labs=[]
for name,t,x,z,size in [('Series','33622A   TRUEFORM',-.044,.086,.0042),('Power','I/O',-.104,.017,.0025),('1','1',.069,.036,.0027),('2','2',.096,.036,.0027),('SYNC','SYNC',.04,.0085,.0025),('ch1','CH 1',.069,.0085,.0025),('ch2','CH 2',.097,.0085,.0025),('Trig','TRIG',.041,.038,.0025)]:
 labs.append(label('Legend '+name,t,(x,-.1478,z),size,ledgrey))
for i,t in enumerate(['FUNC','PARAM','UNITS','MOD','SWEEP','BURST','SYS']):
 labs.append(label(t,t,(.017,-.1471,.078-i*.01),.0018,ledgrey))
for n,x,z in [('10 MHz IN',.091,.084),('10 MHz OUT',.071,.084),('MOD IN',.091,.044),('EXT TRIG',.071,.044),('LAN',-.016,.014),('USB',-.037,.014),('AC',-.082,.017)]:
 labs.append(label(n,n,(x,.148,z),.0024,ledgrey,True))
group(labs,'Panel legends')
frozen={'front_lcd','front_power','front_dial','front_trigger','front_ch1','front_ch2','port_ch1','port_ch2','port_sync','rear_ext_trigger'}
for m in sorted(bpy.data.materials,key=lambda m:m.name):
 batch=[o for o in s.objects if o.type=='MESH' and o.name not in frozen and len(o.data.materials)==1 and o.data.materials[0]==m]
 if len(batch)>1:group(batch,'Static · '+m.name)
for o in list(s.objects):
 if o!=root:o.parent=root
bpy.ops.export_scene.gltf(filepath=str(P/'33622a.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):
 bpy.ops.wm.save_as_mainfile(filepath=str(P/'33622a-source.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=False
 s.render.resolution_x=900;s.render.resolution_y=580;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio neutral');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.62,.66,.72,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
 ground=material('Reference sheet background',(.29,.35,.39),.05,.65)
 box('Studio floor',(0,0,-.005),(200,200,.008),ground)
 for n,loc,energy,size in [('Key',(.14,-.3,.55),19,.3),('Fill',(-.32,-.16,.32),11,.28),('Rim',(-.05,.25,.40),18,.3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=n;l.data.energy=energy;l.data.size=size;l.rotation_euler=(Vector((0,0,.04))-l.location).to_track_quat('-Z','Y').to_euler()
 for name,loc,center,scale in [('front-view',(.275,-.59,.29),(0,0,.048),.47),('rear-view',(-.025,.64,.125),(0,.08,.05),.33),('front-detail',(.004,-.49,.10),(.034,-.12,.05),.205)]:
  bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.rotation_euler=(Vector(center)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=scale;s.camera=c;s.render.filepath=str(P/(name+'.webp'));bpy.ops.render.render(write_still=True)
