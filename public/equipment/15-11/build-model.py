"""Original metric exterior of disconnected Diagnosys E3 and ColorDome shells, with separate static drawing exhibit."""
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
import bmesh
root=node('bts_bench_anchor',(0,0,0))
D=.315;C=-.22
console=keep(node('espion_e3_disconnected_console',(C,0,0)),root)
dome=keep(node('colordome_d125_closed_head',(D,0,.284)),root)
stand=keep(node('inferred_fixed_dome_stand',(D,0,0)),root)
pc=keep(node('closed_generic_portable_computer',(C,0,.086)),root)
amp=keep(node('disconnected_amplifier_shell',(C,-.28,0)),root)
ex=keep(node('detached_pattern_archive',(-.72,0,0)),root)
shell=mat('Molded near-black blue-gray',(.017,.023,.031),.08,.49)
charcoal=mat('Dark molded graphite',(.010,.013,.018),.05,.48)
trim=mat('Orange trim in ambient light',(.71,.185,.031),.12,.38)
recess=mat('Opaque inactive aperture placeholder',(.039,.045,.043),0,.80)
rib=mat('Matte stand and trim',(.029,.034,.039),.25,.48)
rubber=mat('Dark molded feet',(.024,.026,.027),0,.67)
gray=mat('Inactive aluminum support',(.32,.365,.40),.64,.42)
silver=mat('Muted identification ink',(.69,.74,.74),.09,.42)
blue=mat('Amplifier opaque blue cover',(.045,.21,.34),.16,.44)
art=mat('Detached archive plane',(.04,.24,.29),.10,.40)
def orient(o):
 b=bmesh.new();b.from_mesh(o.data);bmesh.ops.recalc_face_normals(b,faces=list(b.faces));b.to_mesh(o.data);b.free();return o
def rings(n,sections,make,m,p,N=48):
 verts=[make(q,2*math.pi*i/N) for q in sections for i in range(N)];K=len(sections)
 faces=[tuple(reversed(range(N))),tuple(range(N*(K-1),N*K))]
 faces += [(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(K-1) for i in range(N)]
 o=orient(shape(n,verts,faces,m,p))
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 return o
def sx(t,n):return math.copysign(abs(t)**n,t)
def slab(n,x,y,sections,mat,grp,exp):
 return rings(n,sections,lambda a,t:(x+a[1]*sx(math.cos(t),exp),y+a[2]*sx(math.sin(t),exp),a[0]),mat,grp)
# E3 p5: published full console envelope 432 x 330 x 86 mm; silhouette from p1/3.
slab('e3_console_dimensioned_shell',C,0,[(0,.154,.117),(.008,.187,.141),(.024,.207,.160),(.044,.216,.165),(.063,.207,.156),(.079,.191,.143),(.086,.160,.123)],charcoal,console,.58)
slab('Fixed perimeter accent',C,0,[(.031,.211,.161),(.038,.215,.164),(.041,.215,.164)],shell,console,.58)
cu('Blank inset identification badge',(C,-.162,.047),(.059,.002,.014),rib,console,.002)
# Generic representative portable computer, shown shut/unpowered; no cable or OEM-computer dimensions asserted.
cu('Unpowered portable body',(C,.015,.095),(.327,.231,.018),gray,pc,.007)
cu('Closed portable lid',(C,.017,.109),(.327,.233,.011),charcoal,pc,.006)
cu('Hingeline silhouette',(C,.132,.101),(.224,.006,.009),rib,pc,.002)
# Supplemental approximation from E3 brochure p5; solid sealed top deliberately lacks interfaces.
slab('amplifier_sealed_oval_housing',C,-.285,[(0,.047,.066),(.009,.061,.081),(.028,.072,.091),(.046,.066,.084),(.054,.054,.071)],charcoal,amp,.87)
slab('Amplifier inactive blue cap',C,-.286,[(.044,.062,.081),(.054,.056,.075),(.058,.045,.063)],blue,amp,.87)
# ColorDome doc 11879 Rev H p2: nominal 360 mm W x 310 mm D x 260 mm H, excluding support.
# Lobes, face rim, inactive replaceable museum closure and stand contours are inferred from brochure photos.
mid=.394
def drum(n,parts,m,grp=dome):
 return rings(n,parts,lambda a,t:(D+a[1]*sx(math.cos(t),a[4]),a[0],mid+a[3]+a[2]*sx(math.sin(t),a[4])),m,grp)
drum('d125_nominal_outer_shell',[(-.148,.124,.078,0,.72),(-.12,.155,.091,0,.73),(-.070,.172,.108,0,.75),(0,.180,.110,0,.76),(.061,.159,.105,.003,.78),(.113,.128,.089,.005,.82),(.149,.095,.067,.007,.88),(.155,.072,.050,.007,.94)],shell)
# Distinct orange line around the volume and raised wordmark step seen from the front quarter.
drum('d125_ambient_orange_seam',[(-.037,.177,.109,.002,.74),(-.029,.180,.110,.002,.74),(-.023,.179,.110,.002,.74)],trim)
cu('D125 raised fixed ID brow',(D,.002,.504),(.162,.096,.080),shell,dome,.014)
cu('High brow orange edge',(D,-.046,.506),(.163,.006,.076),trim,dome,.002)
cu('Opaque raised name fascia',(D,-.051,.505),(.151,.008,.071),charcoal,dome,.008)
label('D125 exterior text','ColorDome',(D,-.057,.509),.023,silver,dome)
drum('d125_closed_opaque_face',[(-.155,.101,.071,0,.81),(-.151,.111,.075,0,.79),(-.147,.111,.076,0,.79)],recess)
# Black outer cheek contours are documentary, around a deliberately blank opaque fill.
for j in (-1,1):
 sections=[(-.077,.108,.004,-.145,.003),(-.065,.121,.013,-.136,.013),(-.041,.132,.021,-.131,.024),(.000,.135,.023,-.128,.027),(.045,.126,.020,-.127,.023),(.067,.111,.012,-.137,.013),(.075,.104,.004,-.142,.004)]
 rings('Fixed outer cheek relief '+('left' if j<0 else 'right'),sections,
  lambda a,t:(D+j*(a[1]+a[2]*sx(math.cos(t),.68)),a[3]+a[4]*sx(math.sin(t),.71),mid+a[0]),charcoal,dome,32)
cu('Generic opaque rear relief',(D,.153,.401),(.103,.004,.043),charcoal,dome,.004)
# Estimating a fixed documentary tabletop support, not a hardware-accessory specification.
cu('Low tabletop base plate',(D,-.012,.020),(.240,.353,.026),rib,stand,.009)
for j in (-1,1):
 for y in (-.144,.125):cylinder('Stand foot',(D+j*.084,y,.005),.010,.016,rubber,group=stand)
cylinder('Fixed central stand support',(D,.045,.151),.205,.022,gray,group=stand)
cylinder('Static lower sleeve',(D,.045,.099),.130,.032,rib,group=stand)
cu('Fixed opaque underside saddle',(D,.041,.270),(.132,.103,.027),charcoal,stand,.006)
for j in (-1,1):
 cylinder('Generic lower support pin',(D+j*.072,-.096,.091),.101,.008,gray,group=stand)
 cu('Static forward support profile',(D+j*.068,-.132,.148),(.041,.115,.020),charcoal,stand,.008)
# Unrelated stand and printed archive UI; no connections or shared state with either dormant device.
cu('Detached archive plate foot',(-.72,-.065,.012),(.245,.193,.024),rubber,ex,.007)
cu('Detached plate support',(-.72,-.015,.142),(.047,.059,.242),gray,ex,.006)
cu('Detached fixed plate surround',(-.72,-.042,.299),(.296,.041,.230),charcoal,ex,.007)
cu('detached_pattern_selection_panel',(-.72,-.066,.293),(.264,.011,.180),art,ex,.005)
label('Detached physical label','FIXED DRAWINGS',(-.72,-.065,.396),.015,silver,ex)
freeze={'e3_console_dimensioned_shell','d125_nominal_outer_shell','d125_ambient_orange_seam','d125_closed_opaque_face','amplifier_sealed_oval_housing','detached_pattern_selection_panel'}
for h in (console,dome,stand,pc,amp,ex):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'e3-colordome.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'e3-colordome.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in ex.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=False
 s.render.resolution_x=840;s.render.resolution_y=590;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.60,.71,.81,1);bg.inputs['Strength'].default_value=.62
 cu('Neutral stage floor',(0,0,-.006),(20,20,.009),mat('Neutral light gray bench',(.29,.34,.39)),None)
 for p,w in [((.25,-1.64,1.62),122),((-1.3,-.58,1.32),108),((1,1.04,1.14),114)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.0;l.rotation_euler=(Vector((.1,0,.25))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('paired-front-quarter',(1.06,-2.20,1.28),(.050,-.027,.250),1.32),('dome-side-detail',(-.58,-1.55,.68),(D,.001,.342),.74)]:
  if n=='dome-side-detail':
   for h in (console,pc,amp):
    for item in h.children:item.hide_render=True
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
