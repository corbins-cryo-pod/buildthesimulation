"""Keysight B1500A original metric study. Screen, panels and fan positions are photo-informed.
Run from this directory: blender -b -t 4 --python build-model.py .
Optional BTS_EQUIPMENT_RENDER=1 renders original reference perspectives.
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
def addmat(o,n,m):o.name=n; o.data.materials.append(m);S.add(o);return o
def box(n,p,d,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=addmat(bpy.context.object,n,m);o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Tool fillet','BEVEL');b.width=bevel;b.segments=2
  bpy.ops.object.modifier_apply(modifier=b.name)
 return o
def cyl(n,p,r,d,m,axis='y'):
 rot={'y':(math.pi/2,0,0),'x':(0,math.pi/2,0),'z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=r,depth=d,location=p,rotation=rot);return addmat(bpy.context.object,n,m)
def tor(n,p,r,rim,m):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=rim,major_segments=24,minor_segments=6,location=p,rotation=(math.pi/2,0,0));return addmat(bpy.context.object,n,m)
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
# Blender front = −Y, export front = +Z (glTF); world support plane at Z=0.
root=anchor('bts_bench_anchor',(0,0,0)); screen=anchor('display_anchor',(-.034,-.279,.174))
body=material('Powdered silver grey sides',(.46,.47,.45),.40,.45)
ivory=material('Warm light grey instrument front',(.68,.68,.62),.15,.39)
light=material('Light polymer control caps',(.62,.64,.60),.12,.48)
dark=material('Exhaust and port recess',(.025,.030,.033),0,.62)
black=material('Molded charcoal guards and feet',(.055,.064,.069),.02,.58)
glass=material('Unlit LCD glass',(.020,.034,.043),.18,.33)
metal=material('Nickel plated fittings',(.51,.53,.55),.68,.30)
gold=material('Triax center and fixture pads',(.68,.40,.08),.67,.28)
text=material('Graphite engraved legends',(.04,.043,.046),0,.56)
red=material('Stop glyph',(.50,.024,.025),0,.48)
green=material('Status indicator',(.22,.65,.27),.10,.28)
board=material('Reference coupon FR4',(.12,.29,.22),.05,.52)
base=box('chassis', (0,0,.170),(.414,.556,.320),body,.004)
box('Front face', (0,-.283,.170),(.416,.011,.320),ivory,.003)
box('Rear backplane', (0,.2805,.170),(.411,.010,.320),metal,.002)
for x in (-.197,.197):
 for y in (-.220,.210):
  box('Contact foot',(x*.87,y,.007),(.030,.049,.014),black,.003)
 for height in (.106,.213,.291):
  box('Side guard rail',(x*.997,0,height),(.027,.535,.009),black,.0016)
 for j in range(26):
  box('Side louver',(x*(.2064/.197),-.229+j*.017,.263),(.002,.011,.015),dark,.0005)
case=anchor('chassis.anchor',(0,0,0))
box('Display trim',(-.034,-.286,.171),(.322,.005,.247),light,.0025)
box('Display recess',(-.034,-.289,.171),(.309,.003,.234),black,.0015)
lcd=box('display_panel',(-.034,-.291,.171),(.3048,.0016,.2286),glass)
screen.location=(-.034,-.293,.171)
def cyl_y(n,x,z,y,r=.006,d=.004,m=metal):return cyl(n,(x,y,z),r,d,m,'y')
def front_key(n,x,z,dx=.016,dz=.007,m=light):
 return box(n,(x,-.287,z),(dx,.004,dz),m,.0009)
cyl_y('rotary_encoder',.158,.270,-.288,.017,.013,light)
cyl_y('Encoder inset',.158,.270,-.296,.013,.002,ivory)
front_key('front_measure',.146,.301,.015,.008);front_key('front_stop',.174,.301,.014,.008)
for z in (.236,.216,.196,.176,.156,.136,.116,.096):
 front_key('Passive front key',.149,z,.016,.007)
box('Front lower drive bay',(.105,-.286,.033),(.064,.003,.015),black,.0015)
box('Front drive slot',(.105,-.289,.035),(.054,.001,.003),dark)
for x in (-.143,-.125):box('Recessed anterior USB',(x,-.287,.031),(.013,.002,.007),dark,.0008)
front_key('front_standby',.181,.036,.017,.012)
front_key('led_standby',.163,.037,.004,.004,green)
for x in (-.103,-.087,-.071):front_key('Annunciator lamp',x,.032,.003,.0017,green)
for n,t,x,z,sz,m in [('branding','B1500A',-.127,.304,.0083,text),('branding2','SEMICONDUCTOR DEVICE ANALYZER',-.034,.304,.0042,text),('usb','USB',-.133,.042,.0034,text),('measure','MEASURE',.145,.313,.0033,text),('stop','STOP',.174,.313,.0036,red),('pwr','STANDBY',.173,.055,.0037,text)]:
 label(n,t,(x,-.289,z),sz,m)
def fan(name,x,z,r):
 cyl_y(name+' inlet',x,z,.284,r,.004,dark)
 cyl_y(name+' hub',x,z,.291,r*.26,.003,metal)
 for i,rr in enumerate((r*.33,r*.51,r*.70,r*.89)):
  ring=tor(name+' wire loop',(x,.293,z),rr,.0009,metal)
 for i in range(8):
  angle=i*math.pi/4
  o=box(name+' spoke',(x+math.sin(angle)*r*.62,.293,z+math.cos(angle)*r*.62),(.0015,.0017,r*.77),metal)
  o.rotation_euler.y=angle
fan('Left fan',.145,.077,.033)
fan('Upper fan',.063,.251,.040);fan('Lower fan',.063,.157,.040)
box('IEC inlet',(.149,.285,.161),(.023,.005,.031),black,.002)
for x in (.144,.150,.156):box('IEC key',(x,.288,.161),(.0018,.001,.011),metal)
for n,x,z,dx,dz in [('Rear monitor',.105,.278,.015,.039),('GPIB',.068,.044,.037,.012),('Rear Ethernet',.035,.056,.010,.011),('Rear USB pair',.036,.030,.014,.009),('Interlock',.099,.056,.014,.012),('Digital IO',.099,.036,.016,.009)]:
 box(n+' backing',(x,.284,z),(dx+.006,.003,dz+.003),metal,.001)
 box(n,(x,.286,z),(dx,.001,dz),dark,.0007)
for n,x,z in [('common',.124,.132),('ground',.142,.134)]:
 cyl_y(n,x,z,.289,.0043,.008,gold)
 anchor('port_'+n,(x,.294,z))
def socket(n,x,z,r,centre):
 cyl_y(n+' sleeve',x,z,.289,r,.009,metal)
 cyl_y(n+' opening',x,z,.2945,r*.73,.0024,black)
 cyl_y(n+' contact',x,z,.2961,r*.24,.0018,centre)
 anchor('port_'+n,(x,.299,z))
def label_back(n,t,x,z,size=.004):
 label(n,t,(x,.289,z),size,text,True)
for slot in range(1,11):
 z=.024+.0285*slot
 box('slot.'+str(slot),(-.091,.2867,z),(.207,.003,.0274),light if slot in (7,9) else metal,.0003)
 label_back('slot number',str(slot),-.188,z-.010,.0038)
 for x in (-.186,.004):cyl_y('Captive cover fastener',x,z,.287,.002,.003,metal)
 if slot == 7:
  label_back('HRSMU', 'B1517A HRSMU',-.163,z+.006,.0042)
  box('ASU recessed port',(-.111,.287,z),(.020,.004,.010),dark,.0008)
  for n,x in [('force',-.059),('sense',-.028)]:
   socket(n,x,z,.008,gold);label_back(n+' legend',n.upper(),x,z+.010)
 if slot == 9:
  label_back('MFCMU','B1520A MFCMU',-.163,z+.006,.0042)
  for n,x in zip(('lcur','lpot','hpot','hcur'),(-.120,-.091,-.062,-.033)):
   socket(n,x,z,.0054,metal);label_back(n+' legend',n.upper(),x,z+.010,.0036)
for x,z in ((-.176,.321),(.176,.321),(-.176,.020),(.176,.020)):
 cyl_y('Chassis back screw',x,z,.284,.0019,.002,black)
# Rig neutral, schematic probe fixture. It is not a dimensional reconstruction of N1295A or 16442B.
fixture=anchor('fixture_anchor',(.335,-.214,0))
box('Fixture cast base',(.335,-.204,.018),(.182,.179,.036),black,.007)
box('Fixture aluminum platen',(.335,-.200,.036),(.158,.144,.013),metal,.0035)
box('Coupon locator frame',(.335,-.215,.045),(.100,.072,.011),dark,.002)
box('Coupon board',(.335,-.215,.052),(.081,.052,.006),board,.002)
for n,x in [('hi',.320),('lo',.350)]:
 box('fixture_pad_'+n,(x,-.218,.055),(.012,.020,.0011),gold)
 anchor('contact_'+n,(x,-.218,.0556))
 o=box('Rail support',(x+.018,-.174,.078),(.013,.015,.058),metal,.001);o.rotation_euler.x=.12
box('Bridge crossmember',(.335,-.171,.106),(.109,.017,.014),metal,.002)
head=anchor('probe_travel',(.335,-.218,.095))
for i,x in enumerate((-.015,.015)):
 p=cyl('probe_housing_'+str(i),(x,0,-.017),.005,.029,black,'z');p.parent=head
 p=cyl('probe_tip_'+str(i),(x,0,-.034),.0014,.011,gold,'z');p.parent=head
def cable(n,pts,m,width=.0028):
 cv=bpy.data.curves.new(n,'CURVE');cv.dimensions='3D';cv.resolution_u=7;cv.bevel_depth=width;cv.bevel_resolution=1
 sp=cv.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for p,co in zip(sp.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,cv);s.collection.objects.link(o);cv.materials.append(m)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 return o
cvlead=anchor('wiring_CV',(0,0,0));ivlead=anchor('wiring_IV',(0,0,0))
for n,x,q,mod,port_z in [('SMU Force',-.059,.308,ivlead,.2235),('SMU Common',.124,.364,ivlead,.132),('CMU LCUR',-.120,.367,cvlead,.2805),('CMU LPOT',-.091,.371,cvlead,.2805),('CMU HPOT',-.062,.306,cvlead,.2805),('CMU HCUR',-.033,.300,cvlead,.2805)]:
 p=cable(n,[(x,.298,port_z),(x+.012,.322,port_z-.011),(.235,.328,.075),(.35,.236,.027),(q,-.108,.036),(q,-.138,.052)],text if q>.33 else red,.0017)
 p.parent=mod
freeze={'chassis','display_panel','front_measure','front_stop','front_standby','led_standby','rotary_encoder','fixture_pad_hi','fixture_pad_lo','probe_travel','wiring_IV','wiring_CV'}
for m in sorted(bpy.data.materials,key=lambda m:m.name):
 batch=[o for o in s.objects if o.type=='MESH' and o.parent is None and o.name not in freeze and len(o.data.materials)==1 and o.data.materials[0]==m]
 if len(batch)>1:group(batch,'Static '+m.name)
for o in list(s.objects):
 if o!=root and o.parent is None:o.parent=root
bpy.ops.export_scene.gltf(filepath=str(P/'b1500a.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'b1500a.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for child in cvlead.children:child.hide_render=True
 # Original boot-display proof view; live simulator screen is sourced from solver state.
 status=material('Reference UI placeholder',(.08,.17,.24),.08,.37)
 box('Reference UI plate',(-.034,-.292,.171),(.298,.0005,.222),status)
 for n,t,x,z,size,m in [('title','PARAMETRIC ANALYZER',-.034,.252,.016,ivory),('line','HRSMU · SOURCE / MONITOR',-.034,.225,.008,ivory),('line2','COMPONENT CHARACTERIZATION',-.034,.190,.0075,ivory),('line3','SOURCE   ·   MONITOR   ·   LIMIT',-.034,.158,.0075,ivory)]:
  label(n,t,(x,-.293,z),size,m)
 s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=False
 s.render.resolution_x=770;s.render.resolution_y=500;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.61,.67,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.44
 g=material('Matte concrete reference surface',(.24,.27,.31),0,.80);box('Studio table',(0,0,-.007),(20,20,.01),g)
 for n,p,e in [('Key',(.21,-.69,.92),26),('Fill',(-.7,-.29,.57),20),('Rim',(.29,.66,.77),30)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.name=n;l.data.energy=e;l.data.size=.60;l.rotation_euler=(Vector((.04,0,.12))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,z in [('front-view',(-.62,-1.18,.60),(.045,-.045,.148),.79),('rear-view',(0,1.0,.197),(0,.18,.169),.56),('probe-view',(.466,-.60,.32),(.335,-.206,.055),.212)]:
  bpy.ops.object.camera_add(location=p);c=bpy.context.object;c.rotation_euler=(Vector(t)-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=z;s.camera=c
  for child in ivlead.children:child.hide_render=n=='rear-view'
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
