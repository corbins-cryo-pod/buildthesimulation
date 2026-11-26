"""Original metric SkyScan 1272 standard enclosure and detached inert slice exhibit; not operating CAD."""
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
root=node('bts_bench_anchor',(0,0,0));X=.32
cab=node('skyscan1272_dormant_enclosure',(X,0,0));stand=node('detached_slice_review_stand',(-.88,0,0));keep(cab,root);keep(stand,root)
white=mat('Neutral molded ivory',(.78,.80,.84),.19,.39)
metal=mat('Cast metallic bench parts',(.29,.32,.34),.57,.36)
charcoal=mat('Dark shield shape',(.037,.049,.058),.18,.38)
dark=mat('Charcoal inactive face',(.017,.023,.032),.18,.43)
gray=mat('Cabinet technical lettering',(.125,.180,.21))
gold=mat('Static identification label',(.69,.48,.07))
teal=mat('Detached archive face',(.038,.29,.32),.12,.40)
def wings(n,side):
 xs=[(.117,.330),(.258,.321),(.467,.293),(.525,.277),(.525,.169),(.125,.169)]
 xz=[(X+side*x,z) for x,z in (xs if side>0 else xs[::-1])]
 v=[(x,y,z) for y in (-.256,.173) for x,z in xz];k=len(xz)
 return shape(n,v,[tuple(reversed(range(k))),tuple(range(k,k*2))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)],white,cab)
# Brochure standard outline (without changer) supplies the exact bounding extents.
# The nameplate, curved wings, central recessed door and corner supports follow the EMBL front photo.
cu('Benchtop support tray',(X,0,.012),(1.16,.52,.024),metal,cab,.004)
cu('Black lower housing',(X,-.010,.065),(1.009,.488,.101),dark,cab,.011)
cu('Lower ivory horizontal crossrail',(X,-.244,.099),(.998,.024,.089),white,cab,.008)
cu('Dormant dark central base',(X,-.005,.161),(1.009,.498,.075),charcoal,cab,.011)
wings('Left white curved wing',-1);wings('Right white curved wing',1)
cu('upper_center_crown',(X,-.015,.316),(.241,.401,.028),white,cab,.009)
cu('closed_shielded_door',(X,-.234,.239),(.228,.030,.160),dark,cab,.009)
cu('Recessed static door grip',(X,-.250,.300),(.131,.008,.014),charcoal,cab,.003)
cu('Neutral rear shell closure',(X,.200,.207),(.955,.108,.207),white,cab,.015)
cu('Generic rear nonfunctional black seam',(X,.257,.183),(.903,.006,.026),dark,cab)
for x in (X-.516,X+.516):
 for y in (-.144,.146):
  cylinder('Rounded upright support',(x,y,.141),.225,.059,charcoal,group=cab)
  cylinder('Support lower inset ring',(x,y,.034),.018,.061,metal,group=cab)
  cylinder('Support dark upper lip',(x,y,.255),.015,.059,dark,group=cab)
label('Face model plate','SKYSCAN 1272',(X-.307,-.257,.190),.023,gray,cab)
# Front plaque only; no corresponding status/control logic.
cu('Fixed non-operating decal field',(X+.311,-.257,.207),(.071,.0025,.039),white,cab,.002)
shape('Static warning triangle',[(X+.311,-.259,.253),(X+.290,-.259,.219),(X+.332,-.259,.219)],[(0,1,2)],gold,cab)
label('Documentary plaque lettering','X-rays',(X+.31,-.259,.207),.016,gray,cab)
keep(node('enclosure_face_landmark',(X,-.25,.239)),cab)
# A separate generic graphical exhibit, not a scanner console or accessory.
cu('Archive pedestal base',(-.88,-.095,.013),(.336,.206,.026),dark,stand,.009)
cu('Archive rear support',(-.88,-.041,.117),(.058,.062,.191),charcoal,stand,.006)
cu('Archive panel bezel',(-.88,-.105,.302),(.354,.045,.362),dark,stand,.012)
cu('archive_slice_panel',(-.88,-.132,.295),(.280,.012,.257),teal,stand,.006)
label('Archive panel name','INERT SLICE ARCHIVE',(-.88,-.129,.455),.019,white,stand)
freeze={'upper_center_crown','closed_shielded_door','archive_slice_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'skyscan1272.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'skyscan1272.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=500;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.60,.66,.72,1);bg.inputs['Strength'].default_value=.63
 cu('Neutral bench exterior',(0,0,-.007),(12,12,.013),mat('Neutral slate-gray base',(.27,.29,.31)),None)
 for p,w in [((1,-1.4,1.4),96),((-1.3,-.46,1.19),74),((.95,1.19,1.25),116)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.14;l.rotation_euler=(Vector((.32,0,.17))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front',(X,-2.4,.41),(X,0,.17),1.42),('quarter',(2.0,-2.2,.89),(X,0,.15),1.50)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
