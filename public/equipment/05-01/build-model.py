"""Editable metric Bruker DektakXT reconstruction. Blender 4+:
blender -b -t 3 --python build-model.py; set BTS_EQUIPMENT_RENDER=1 for matched source views.
Dimensions: published 594 x 546 x 445 mm outer housing. Internals are inferred."""
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
root=node('bts_bench_anchor',(0,0,0));hood=node('hood_hinge',(0,.161,.425));stage=node('scan_stage',(0,-.057,.160));sample=node('coupon_anchor',(0,-.057,.222));tower=node('stylus_tower',(0,-.047,.302))
ivory=mat('Warm gray cowl',(.64,.69,.71),.13)
gray=mat('Chamber structural arch',(.51,.57,.62),.19)
blue=mat('Navy instrument deck',(.025,.054,.11),.15)
dark=mat('Black stage castings',(.028,.038,.045),.25)
glass=mat('Smoke acrylic hood',(.035,.067,.085),.08,.27,.55)
metal=mat('Machined stainless',(.57,.60,.63),.7,.32)
gold=mat('Sample and fastener brass',(.57,.35,.079),.72,.32)
paper=mat('Inlaid light legends',(.85,.88,.89))
amber=mat('Power indicator',(.15,.61,.29))
cube('base',(0,0,.077),(.594,.546,.132),ivory,.009)
cube('Inner deck',(0,.007,.143),(.548,.4546,.021),blue,.006)
cube('Front shell lip',(0,-.251,.128),(.566,.042,.100),ivory,.009)
cube('Back bulkhead',(0,.244,.199),(.556,.049,.164),ivory,.008)
for x in (-.224,.224):
 for y in (-.197,.184):cube('Damped foot',(x,y,.006),(.061,.062,.012),dark,.004)
for q in (-1,1):
 cube('Outer cowl side',(q*.274,.016,.181),(.038,.48,.111),ivory,.006)
 section('Structural side arch',[(q*x,z) for x,z in [(.236,.146),(.267,.146),(.260,.248),(.229,.320),(.179,.350),(.167,.321),(.195,.282),(.220,.219)]],.033,.133,gray)
 section('Cowl upper ramp',[(q*x,z) for x,z in [(.265,.205),(.290,.205),(.271,.264),(.223,.310),(.212,.299),(.248,.258)]],-.069,.201,ivory)
section('Arch bridge',[(-.218,.315),(-.151,.363),(-.092,.375),(.093,.375),(.153,.359),(.218,.315),(.16,.307),(.098,.333),(-.103,.333),(-.16,.306)],.044,.125,gray)
for x in (-.133,.133):cylinder('Hinge pin',(x,.161,.425),.031,.009,dark,'x')
sections=[(.228,.194,.405),(.120,.212,.445),(-.082,.231,.426),(-.199,.260,.379),(-.267,.280,.243)]
v=[(x,y,z+dz) for y,w,z in sections for x,dz in [(-w,0),(w,0),(-w+.006,-.005),(w-.006,-.005)]]
f=[]
for j in range(4):
 k=j*4;f.extend([(k,k+1,k+5,k+4),(k+2,k+6,k+7,k+3),(k,k+4,k+6,k+2),(k+1,k+3,k+7,k+5)])
shape('hood_shell',v,f,glass,hood)
cube('hood_handle',(0,-.268,.242),(.102,.017,.029),ivory,.004,hood)
cube('Hood reinforcing lip',(0,-.265,.248),(.512,.011,.015),dark,.003,hood)
for n,p,d,m in [('Translation carriage',(0,-.056,.161),(.189,.160,.028),dark),('XY fine stage',(0,-.056,.184),(.138,.119,.023),dark),('Leveled chuck',(0,-.056,.201),(.114,.103,.019),metal),('Glass block',(0,-.056,.213),(.1016,.081,.006),gray)]:
 cube(n,p,d,m,.003,stage)
for x in (-.075,.074):cylinder('Micrometer screw',(x,-.151,.172),.031,.009,dark,'y',stage)
cube('Fine release lever',(.101,.007,.177),(.014,.042,.009),metal,.001,stage)
cylinder('Adjustment nut',(.095,-.039,.170),.020,.007,gold,'x',stage)
cube('coupon_body',(0,-.056,.219),(.023,.025,.004),metal,.001,sample)
cube('coupon_face',(0,-.056,.2215),(.022,.024,.0008),gold,.0002,sample);keep(sample,stage)
cube('Drive and sensor head',(0,-.031,.304),(.145,.101,.083),blue,.011,tower)
label('Head legend','BRUKER',(0,-.083,.306),.017,paper,tower)
cube('LVDT mount',(-.014,-.054,.255),(.060,.042,.016),dark,.002,tower)
cube('Stylus arm',(-.015,-.057,.241),(.037,.027,.009),gold,.002,tower)
cylinder('stylus_needle',(0,-.057,.228),.012,.001,metal,'z',tower)
keep(node('stylus_tip',(0,-.057,.222)),tower)
cylinder('Internal video camera',(.031,-.074,.253),.020,.012,dark,'z',tower)
cube('front_power_button',(-.242,-.252,.191),(.022,.026,.015),dark,.003)
cube('status_lamp',(-.242,-.264,.199),(.008,.006,.004),amber,.001)
cube('sample_action',(.215,-.207,.153),(.030,.023,.018),metal,.002)
label('Front legend','DektakXT',(-.164,-.274,.086),.022,blue)
label('Brand legend','BRUKER',(.176,-.274,.088),.016,blue)
for name,x in [('power',.185),('host',.151),('service',.116)]:
 cube('Rear passive port '+name,(x,.271,.116),(.021,.009,.016),dark,.001)
 node('port_'+name,(x,.277,.116))
for i in range(12):cube('Rear vent',(-.207+i*.015,.272,.114),(.006,.003,.021),dark)
# Generic monitor, because the archived photo does not document a specific option.
cube('Monitor base',(-.537,.100,.013),(.243,.158,.026),dark,.005)
cube('Monitor stand',(-.537,.110,.129),(.065,.051,.229),dark,.004)
cube('Monitor bezel',(-.537,.078,.306),(.386,.038,.238),dark,.007)
cube('monitor_glass',(-.537,.056,.307),(.358,.002,.207),blue)
node('display_anchor',(-.537,.054,.307))
cube('station_start',(-.434,.057,.197),(.015,.013,.007),amber,.002)
# Batch static geometry by material for portable viewer draw budgets.
hold={'base','hood_shell','hood_handle','front_power_button','status_lamp','sample_action','station_start','monitor_glass'}
for parent in (None,hood,tower,stage,sample):
 for m in list(bpy.data.materials):
  parts=sorted([o for o in s.objects if o.type=='MESH' and o.parent==parent and o.name not in hold and o.data.materials[:]==[m]],key=lambda o:o.name)
  if len(parts)>1:
   bpy.ops.object.select_all(action='DESELECT')
   for o in parts:o.select_set(True)
   bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=(parent.name if parent else 'fixed')+' '+m.name
for o in list(s.objects):
 if o!=root and not o.parent:keep(o,root)
bpy.ops.export_scene.gltf(filepath=str(P/'dektakxt.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'dektakxt.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=False
 s.render.resolution_x=770;s.render.resolution_y=510;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Matte studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.62,.68,.74,1);bg.inputs['Strength'].default_value=.50
 cube('Studio table',(0,0,-.007),(30,30,.011),mat('Concrete stage',(.26,.30,.32)))
 for pos,watts in [((.40,-.80,1.26),58),((-.73,-.53,.72),35),((.43,.53,.77),40)]:
  bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=watts;l.data.size=.64;l.rotation_euler=(Vector((0,0,.21))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,c,z,a in [('whole-view',(.36,-1.52,.73),(-.201,0,.335),1.23,-64),('side-view',(1.19,-.025,.53),(0,0,.225),.72,0),('stage-view',(.34,-.75,.37),(0,-.05,.225),.34,-64)]:
  hood.rotation_euler.x=math.radians(a)
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(c)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=z;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
