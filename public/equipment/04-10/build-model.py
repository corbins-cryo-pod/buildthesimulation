"""Original metric closed LPKF ProtoLaser R4 candidate cabinet and detached chart exhibit; non-operational."""
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
def cu(n,p,d,m,g,b=0):return cube(n,p,d,m,b,g)
root=node('bts_floor_anchor',(0,0,0));X=.42
cab=node('protolaser_r4_dormant_enclosure',(X,0,0));stand=node('detached_printed_chart_stand',(-.85,0,0));keep(cab,root);keep(stand,root)
ivory=mat('Warm pearl white shell',(.76,.78,.795),.19,.39)
trim=mat('Side trim white cast',(.60,.65,.68),.21,.42)
slate=mat('Dark closed hood frame',(.043,.054,.064),.22,.37)
blue=mat('Deep cobalt front band',(.025,.177,.41),.32,.36)
green=mat('Opaque documentary olive glazing',(.25,.38,.073),.27,.29)
gold=mat('Dormant yellow surround',(.53,.38,.031),.24,.46)
red=mat('Dormant red relief',(.65,.043,.023),.20,.40)
steel=mat('Passive exterior trim',(.30,.34,.37),.48,.43)
dark=mat('Back and plinth charcoal',(.022,.029,.036),.20,.45)
teal=mat('Detached chart surface',(.07,.33,.35),.15,.46)
ink=mat('Equipment graphite badge',(.13,.22,.27))
def sideform(n,x0,x1,yz,material):
 k=len(yz);verts=[(x,y,z) for x in (x0,x1) for y,z in yz]
 faces=[tuple(reversed(range(k))),tuple(range(k,k*2))]
 faces +=[(j,(j+1)%k,(j+1)%k+k,j+k) for j in range(k)]
 return shape(n,verts,faces,material,cab)
def face(n,x0,x1,z0,z1,extra,m):
 verts=[(x,-.390+(z-1.065)*.669-extra,z) for x,z in [(x0,z0),(x1,z0),(x1,z1),(x0,z1)]]
 return shape(n,verts,[(0,1,2,3)],m,cab)
# Product flyer provides closed cabinet envelope. Exact splits, pulls, and rear seams are inferred from exterior.
cu('cabinet_base_envelope',(X,.00725,.540),(.91,.7805,1.06),ivory,cab,.014)
cu('Floor-level cabinet skid',(X,0,.012),(.904,.795,.015),ivory,cab,.004)
cu('Low dark plinth recess',(X,-.391,.044),(.595,.011,.074),dark,cab,.006)
for x in (X-.352,X+.352):
 for y in (-.303,.303):cylinder('Low foot',(x,y,.018),.036,.066,dark,group=cab)
cu('Cabinet left front molding',(X-.418,-.387,.559),(.054,.013,.964),ivory,cab,.008)
cu('Cabinet right front molding',(X+.418,-.387,.559),(.054,.013,.964),ivory,cab,.008)
cu('front_blue_fascia',(X,-.392,.981),(.773,.010,.161),blue,cab,.006)
cu('Closed lower door seam',(X,-.392,.893),(.770,.008,.007),slate,cab,.001)
cu('Small dark front handle seam',(X+.336,-.392,.853),(.045,.008,.015),slate,cab,.004)
label('R4 candidate model marking','R4',(X+.321,-.394,.854),.029,ink,cab)
label('Fixed lower front badge','LPKF',(X,-.393,.425),.103,blue,cab)
cylinder('Static red surround',(X-.418,-.392,.991),.009,.025,gold,'y',cab)
cylinder('Fixed dark red button relief',(X-.418,-.396,.991),.002,.015,red,'y',cab)
cu('Unpowered small control panel',(X-.418,-.391,.921),(.038,.009,.060),blue,cab,.005)
yz=[(-.396,1.047),(-.105,1.482),(.373,1.482),(.395,1.408),(.395,1.049)]
sideform('closed_hood_enclosure',X-.455,X+.455,yz,trim)
face('Sloped dark window frame',X-.375,X+.375,1.067,1.460,.004,slate)
face('closed_opaque_olive_window',X-.319,X+.319,1.151,1.408,.010,green)
cu('Static cobalt hood pull',(X,-.360,1.127),(.642,.038,.040),blue,cab,.013)
for x in (X-.451,X+.451):
 cu('Unverified flank inset',(x,.162,.795),(.008,.279,.054),dark,cab,.004)
cu('Generic closed back panel',(X,.392,.695),(.792,.010,1.128),trim,cab,.008)
cylinder('Dormant beacon support',(X+.321,.222,1.494),.024,.042,steel,group=cab)
cylinder('Dormant beacon column',(X+.321,.222,1.569),.130,.023,dark,group=cab)
cylinder('Unlit beacon visual insert',(X+.321,.222,1.575),.060,.024,green,group=cab)
cylinder('Dark beacon cap',(X+.321,.222,1.643),.014,.023,steel,group=cab)
keep(node('documentary_hood_landmark',(X,-.276,1.306)),cab)
# This separate pedestal illustrates source charts. Nothing connects it to the cabinet.
cu('Detached archive base',(-.85,-.095,.021),(.47,.31,.042),dark,stand,.012)
cu('Detached exhibit column',(-.85,-.026,.505),(.075,.073,.935),slate,stand,.007)
cu('Detached chart monitor housing',(-.85,-.105,1.056),(.434,.060,.352),slate,stand,.011)
cu('detached_chart_panel',(-.85,-.139,1.049),(.366,.012,.244),teal,stand,.005)
label('Exhibit label','PRINTED CHARTS',(-.85,-.135,1.206),.018,ivory,stand)
freeze={'cabinet_base_envelope','front_blue_fascia','closed_hood_enclosure','closed_opaque_olive_window','detached_chart_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'protolaser-r4.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'protolaser-r4.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=14;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=580;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=86
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.58,.65,.72,1);bg.inputs['Strength'].default_value=.65
 cu('Neutral matte floor',(0,0,-.006),(65,65,.011),mat('Neutral ash floor',(.26,.30,.34)),None)
 for p,w in [((1.7,-3.2,3.5),271),((-2.7,-1.6,2.45),147),((1.6,2.36,2.84),240)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=2.1;l.rotation_euler=(Vector((X,0,.83))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(2.28,-4.10,1.79),(X,0,.82),2.78),('front-elevation',(X,-4.2,.99),(X,0,.82),2.65)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
