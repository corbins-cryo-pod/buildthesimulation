"""Original non-operational metric cabinet reconstruction with an illustrative inert dry-tray. Not for physical setup or manufacture."""
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
root=node('bts_bench_anchor',(0,0,0))
cab=node('equipment_enclosure',(0,0,0));keep(cab,root)
hood=node('documentary_cabinet_panel',(-.468,-.361,1.188));keep(hood,cab)
hinge=node('practice_cover_hinge',(-.755,-.416,.829));keep(hinge,cab)
tray=node('inert_tray_slide',(-.487,-.317,.816));keep(tray,cab)
white=mat('Clinic-gray powder-coated enclosure',(.63,.66,.64),.12,.48)
cream=mat('Warm gray front cladding',(.72,.73,.67),.12,.43)
edge=mat('Anthracite cabinet frame',(.042,.057,.068),.18,.38)
steel=mat('Satin visible metal',(.44,.49,.53),.67,.33)
black=mat('Dark gasket and control face',(.025,.034,.041),.15,.37)
glass=mat('Blue viewport glass',(.041,.126,.155),.28,.26)
teal=mat('Practice tray safety blue',(.055,.31,.39),.26,.39)
witnessmat=mat('Synthetic inert coating witness',(.12,.61,.60),.39,.24)
gold=mat('Muted bronze documentary accent',(.47,.34,.13),.55,.38)
olive=mat('Passive console accent',(.20,.34,.25))
# Dimensions are photo-scaled original estimates, not fit limits or surveyed machine measurements.
cu('Chamber lower cabinet',(-.448,.005,.455),(.938,.817,.783),white,cab,.013)
cu('Base sill',(-.447,0,.095),(.963,.825,.052),edge,cab,.006)
cu('Chamber upper housing',(-.452,.083,1.113),(.907,.650,.481),white,cab,.012)
cu('Chamber backdrop for documentary view',(-.477,-.260,1.211),(.78,.073,.380),black,cab,.007)
for x in (-.762,-.125):
 cu('Cabinet front panel',(x,-.412,.464),(.271,.014,.576),cream,cab,.005)
 cu('Service handle',(x+.107,-.425,.49),(.019,.018,.092),edge,cab,.004)
for x in (-.807,-.097):
 for y in (-.296,.294):cylinder('Instrument foot',(x,y,.037),.072,.037,edge,group=cab)
for iz,y in enumerate((-.198,.184)):
 for ix,x in enumerate((-.694,-.222)):
  n='document_target_'+str(1+ix+2*iz)
  g=node(n,(x,y,1.355));keep(g,cab)
  cylinder('Static mount skirt',(x,y,1.354),.055,.063,steel,group=g)
  o=cylinder('Static source casing',(x,y,1.494),.204,.047,steel,group=g);o.rotation_euler.y=math.radians(25*(1 if ix else -1))
  o=cylinder('Dark static cap',(x+(1 if ix else -1)*.045,y,1.587),.038,.047,edge,group=g);o.rotation_euler.y=math.radians(25*(1 if ix else -1))
cu('Documentary front panel',(-.480,-.363,1.167),(.874,.022,.298),cream,hood,.008)
cylinder('Round viewing flange',(-.497,-.396,1.170),.039,.126,steel,axis='y',group=hood)
cylinder('Round viewport gasket',(-.497,-.420,1.170),.013,.092,black,axis='y',group=hood)
cylinder('Documentary viewport',(-.497,-.427,1.170),.011,.075,glass,axis='y',group=hood)
for i in range(10):
 a=math.tau*i/10
 cylinder('Viewport bolt silhouette',(-.497+.110*math.cos(a),-.419,1.170+.110*math.sin(a)),.010,.0054,steel,'y',hood)
# The colored practice module represents inert geometry only. It is deliberately not a replica of the machine loader.
for x in (-.750,-.213):cu('Practice doorway flank',(x,-.391,.838),(.039,.147,.222),edge,cab,.005)
for h in (.730,.941):cu('Practice doorway rail',(-.481,-.391,h),(.546,.147,.028),edge,cab,.003)
cu('Practice front cover',(-.481,-.470,.838),(.533,.021,.186),teal,hinge,.007)
cu('dry_cover_handle',(-.267,-.493,.848),(.062,.018,.026),steel,hinge,.003)
cu('Dry support deck',(-.489,-.337,.811),(.240,.260,.015),steel,tray,.003)
cu('dry_tray_handle',(-.488,-.443,.820),(.090,.031,.018),edge,tray,.002)
def annulus(n,p,outer,inner,h,m,parent):
 N=48;x,y,z=p;v=[];f=[]
 for H,r in [(0,outer),(0,inner),(h,outer),(h,inner)]:
  v.extend([(x+r*math.cos(math.tau*i/N),y+r*math.sin(math.tau*i/N),z+H) for i in range(N)])
 for i in range(N):
  j=(i+1)%N
  f.extend([(i,j,j+2*N,i+2*N),(i+N,i+3*N,j+3*N,j+N),(i+2*N,j+2*N,j+3*N,i+3*N),(i,i+N,j+N,j)])
 return shape(n,v,f,m,parent)
annulus('inert_seat_ring',(-.486,-.355,.819),.087,.077,.008,teal,tray)
coupon=cylinder('witness_disc',(-.486,-.355,.824),.003,.050,witnessmat,group=tray)
keep(node('dry_place_target',(-.486,-.355,.840)),tray)
# Separate visible cabinet and noninteractive connector placeholders.
cu('Control tower frame',(.456,.019,.810),(.755,.804,1.552),edge,cab,.016)
cu('Control tower front',(.456,-.387,.815),(.660,.025,1.470),cream,cab,.010)
cu('Lower operator panel',(.458,-.406,.469),(.606,.017,.640),white,cab,.006)
cu('Control monitor bezel',(.454,-.402,1.290),(.460,.060,.299),edge,cab,.009)
cu('Documentation-only screen',(.454,-.437,1.294),(.386,.012,.228),glass,cab,.005)
for i in range(5):cu('Static diagram line',(.454,-.445,1.225+i*.025),(.234,.003,.007),steel,cab)
cu('Keyboard shelf',(.457,-.438,.972),(.508,.188,.022),edge,cab,.004)
cu('Noninteractive keyboard',(.457,-.466,.987),(.364,.107,.014),black,cab,.003)
cylinder('Console passive face marker',(.235,-.429,1.079),.014,.017,olive,'y',cab)
cylinder('Console passive collar',(.680,-.429,1.083),.013,.022,gold,'y',cab)
label('Documentary machine badge','DISCOVERY 635',(.453,-.409,1.500),.030,edge,cab)
for x in (.155,.756):
 for y in (-.263,.298):cylinder('Tower foot',(x,y,.025),.050,.027,edge,group=cab)
for x in (-.616,-.248,.606):
 cu('Rear passive service plate',(x,.418,.593),(.142,.011,.113),edge,cab,.004)
 for i in range(7):cu('Rear blank grille',(x,.424,.552+i*.012),(.110,.002,.004),steel,cab)
for n,x,z in [('service',.606,.592),('chassis',-.616,.592)]:
 keep(node('rear_reference_'+n,(x,.428,z)),cab)
cu('inspect_view_target',(.455,-.445,1.294),(.315,.002,.142),glass,cab)
freeze={'dry_cover_handle','dry_tray_handle','witness_disc','inert_seat_ring','inspect_view_target'}
for h in (cab,hood,hinge,tray)+tuple(o for o in cab.children if o.name.startswith('document_target_')):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'discovery635.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'discovery635.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=790;s.render.resolution_y=530;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.56,.62,.67,1);bg.inputs['Strength'].default_value=.65
 cu('Floor',(0,0,-.007),(22,22,.013),mat('Cleanroom-neutral floor',(.31,.34,.36)),None)
 for p,w in [((.65,-2.15,2.9),155),((-1.4,-.9,2.1),132),((.72,1.5,2.8),190)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.6;l.rotation_euler=(Vector((0,0,.8))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent,opening in [('cabinet-view',(2.0,-3.3,2.15),(-.10,0,.81),2.92,0),('carrier-view',(-.04,-1.45,1.42),(-.49,-.398,.86),.94,-86)]:
  hinge.rotation_euler.z=math.radians(opening);tray.location.y=-.317-(.155 if opening else 0);coupon.hide_render=not bool(opening)
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
