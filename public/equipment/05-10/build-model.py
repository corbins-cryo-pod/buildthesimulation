"""Original metric HR Evolution benchtop model; Blender 4+; optional BTS_EQUIPMENT_RENDER=1.
Geometry matched to HORIBA manual front/plan and Cambridge chamber references.
"""
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
frame=mat('Warm silver molded panels',(.72,.75,.78),.12,.40)
base=mat('Instrument shell grey',(.50,.55,.60),.29,.42)
navy=mat('HR blue accent',(.037,.18,.37),.21,.36)
deep=mat('Black optical enclosure',(.024,.030,.036),.22,.51)
gray=mat('Graphite anodized stage',(.058,.074,.086),.35,.38)
nickel=mat('Chromed objective barrels',(.57,.61,.65),.78,.29)
brass=mat('Gold lens retaining bands',(.58,.36,.073),.65,.36)
cyan=mat('Focus standard substrate',(.37,.58,.64),.27,.37)
black=mat('Instrument print',(.035,.052,.066),0,.55)
yellow=mat('Warning labels',(.68,.45,.078),.03,.65)
green=mat('Optical ready indicator',(.24,.65,.38))
glass=mat('Camera glass',(.008,.071,.103),.1,.24)
white=mat('White instruction legend',(.77,.80,.83))
# Closed standalone envelope from 2013 manual p. 37, no axial Dewar or external bench extension.
cube('instrument_base',(0,0,.059),(1.133,.817,.092),base,.012)
cube('Right optical cabinet',(.226,.037,.218),(.681,.74,.322),frame,.010)
cube('Right cabinet fascia',(.226,-.342,.216),(.661,.028,.303),frame,.005)
cube('Main upper lip',(.226,.053,.397),(.679,.693,.051),frame,.009)
cube('Inboard top cover',(.055,.051,.444),(.277,.674,.058),base,.007)
cube('Outboard top cover',(.425,.137,.434),(.269,.522,.078),frame,.008)
section('Chamfered console ledge',[(-.112,.325),(.561,.325),(.561,.389),(.494,.411),(-.087,.411)],-.334,-.271,frame)
cube('Inset top service panel',(.305,-.034,.429),(.275,.307,.009),base,.003)
for x in (-.538,-.160):
 cube('Left bay structural rail',(x,.023,.234),(.055,.725,.344),navy,.005)
 cube('White side flank',(x,.14,.241),(.062,.479,.357),frame,.006)
cube('Lower microscope shelf',(-.354,-.166,.106),(.371,.442,.028),gray,.005)
cube('Top microscope bridge',(-.352,-.081,.431),(.418,.493,.081),frame,.009)
cube('Vibration isolation bottom',(-.349,.005,.095),(.354,.372,.030),deep,.005)
cube('Microscope support back',(-.359,.144,.247),(.260,.226,.289),deep,.011)
cube('Microscope control box',(-.349,-.104,.325),(.185,.222,.103),deep,.01)
cube('Viewing camera housing',(-.350,-.078,.383),(.081,.104,.048),base,.004)
cylinder('Video nose',(-.350,-.132,.383),.015,.026,glass,'y')
for x in (-.467,.465):
 for y in (-.346,.318):cube('Recessed bench foot',(x,y,.0065),(.085,.082,.013),deep,.005)
# The Cambridge chamber visor is reproduced as an illustrative operable cover. Exact pivot and opening angle are inferred.
door=node('door_hinge',(-.356,-.036,.410))
cube('door_leaf',(-.356,-.285,.395),(.404,.231,.020),frame,.005,door)
cube('door_grip',(-.356,-.394,.395),(.186,.023,.021),gray,.003,door)
cube('Closed cover leading skirt',(-.356,-.375,.358),(.378,.044,.065),frame,.008,door)
cube('Cover amber warning',(-.438,-.399,.368),(.063,.0008,.025),yellow,.0005,door)
label('Optical bay logo','MICROSCOPE',(-.355,-.399,.341),.011,black,door)
stage=node('stage_xy',(-.348,-.268,.133))
for n,pos,dim,m in [('Coarse support',(-.348,-.269,.125),(.213,.205,.033),deep),('Cross travel plate',(-.348,-.271,.149),(.156,.172,.023),gray),('Positioning platen',(-.348,-.271,.169),(.121,.128,.019),base)]:
 cube(n,pos,dim,m,.002,stage)
for x in (-.390,-.303):cylinder('Stage locating screw',(x,-.312,.177),.005,.004,nickel,'z',stage)
sample=node('coupon_anchor',(-.348,-.275,.180))
cube('Substrate carrier',(-.348,-.275,.180),(.032,.025,.0020),cyan,.0007,sample)
for r in range(4):
 for c in range(5):
  cube('Decorative coupon pattern',(-.358+c*.005,-.282+r*.0045,.181),(.0048,.0042,.0004),nickel if (c+r)%2 else gray,0,sample)
keep(sample,stage)
turret=node('objective_turret',(-.348,-.245,.260))
cylinder('Objective disk',(-.348,-.245,.257),.018,.049,gray,'z',turret)
for i in range(3):
 ang=math.tau*i/3;x=-.348+.031*math.sin(ang);y=-.245-.031*math.cos(ang)
 cylinder('Objective body',(x,y,.222),.054-(.006 if i else 0),.012,nickel,'z',turret)
 cylinder('Objective band',(x,y,.208),.007,.0122,brass if i==0 else navy,'z',turret)
 cylinder('Objective tip lens',(x,y,.1935),.006,.0067,glass,'z',turret)
for x in (-.468,-.229):
 cylinder('Focus coarse ring',(x,-.265,.246),.021,.019,deep,'x')
 cylinder('Focus fine ring',(x,.003-.265,.246),.013,.012,navy,'x')
cube('focus_hit',(-.225,-.276,.245),(.028,.021,.023),gray,.004)
# Connections are inferred positions, not prewired instrument controls.
for n,x,z,w in [('power',.432,.166,.048),('controller',.326,.179,.056),('aux',.245,.180,.035),('detector',.119,.195,.044)]:
 cube('Rear '+n+' plate',(x,.392,z),(w,.011,.032),gray,.002)
 cube('Rear '+n+' connector',(x,.400,z),(w*.63,.009,.018),deep,.001)
 node('port_'+n,(x,.405,z))
for x in (.03,.19,.352,.515):
 for i in range(9):cube('Rear ventilation',(x-.04+i*.009,.406,.273),(.004,.002,.048),deep)
for x in (.193,.306,.419):cube('Top access cover seam',(x,-.082,.443),(.002,.171,.002),gray)
cube('standby_switch',(.485,-.355,.178),(.028,.011,.020),gray,.002)
cube('ready_lamp',(.446,-.355,.182),(.011,.012,.008),green,.001)
cube('sample_button',(-.461,-.376,.127),(.041,.017,.015),navy,.002)
cube('measurement_button',(.488,-.356,.243),(.029,.013,.020),navy,.002)
label('Brand','HORIBA',(.425,-.359,.093),.034,navy)
label('Model name','LabRAM HR',(.331,-.359,.294),.028,black)
label('Model generation','EVOLUTION',(.332,-.359,.267),.011,black)
label('Optical button label','MAP',(.488,-.364,.214),.0078,black)
freeze={'instrument_base','door_leaf','door_grip','stage_xy','focus_hit','standby_switch','sample_button','measurement_button','ready_lamp'}
for parent in (None,door,stage,turret,sample):
 for m in list(bpy.data.materials):
  ps=sorted([x for x in s.objects if x.parent==parent and x.type=='MESH' and x.name not in freeze and x.data.materials[:]==[m]],key=lambda x:x.name)
  if len(ps)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for x in ps:x.select_set(True)
  bpy.context.view_layer.objects.active=ps[0];bpy.ops.object.join();ps[0].name=(parent.name if parent else 'base')+' '+m.name
for o in list(s.objects):
 if o!=root and not o.parent:keep(o,root)
bpy.ops.export_scene.gltf(filepath=str(P/'labram-hr-evolution.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'labram-hr-evolution.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=11;s.cycles.use_denoising=False
 s.render.resolution_x=830;s.render.resolution_y=490;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.57,.62,.67,1);bg.inputs['Strength'].default_value=.56
 cube('Studio floor',(0,0,-.008),(30,30,.014),mat('Neutral anti-vibration table',(.22,.27,.29)))
 for pos,pow in [((.35,-1.6,1.3),100),((-.98,-.42,1.05),83),((.33,1.04,.97),102)]:
  bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=pow;l.data.size=.7;l.rotation_euler=(Vector((0,0,.24))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,z,open in [('instrument-view',(.66,-2.03,1.06),(0,0,.24),1.52,True),('sample-view',(-.63,-1.17,.53),(-.35,-.25,.235),.47,True),('rear-view',(.39,1.88,.74),(0,.20,.24),1.39,False)]:
  door.rotation_euler.x=math.radians(-62 if open else 0)
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=z;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
