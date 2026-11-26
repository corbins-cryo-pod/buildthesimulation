"""Closed Bruker SkyScan 1276 CMOS ATS edition documentary exterior and independent archived geometric labels."""
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
root=node('bts_bench_anchor',(0,0,0));X=.37
cab=node('skyscan1276_dormant_cabinet',(X,0,0));stand=node('detached_phantom_review_stand',(-.55,0,0));keep(cab,root);keep(stand,root)
white=mat('Neutral molded ivory outer cladding',(.73,.76,.79),.18,.42)
body=mat('Off-white underbody housing',(.59,.63,.67),.25,.39)
blue=mat('Deep navy center panel',(.025,.068,.151),.25,.39)
edge=mat('Closed dark seam',(.025,.035,.047),.29,.45)
silver=mat('Muted aluminum underbody detail',(.30,.35,.39),.58,.39)
glass=mat('Blank inactive monitor',(.019,.040,.059),.20,.42)
ink=mat('Identification ink',(.67,.71,.71),.20,.45)
red=mat('Unlit upper red insert',(.39,.046,.035),.25,.43)
art=mat('Independent archive panel',(.039,.30,.36),.20,.44)
def orient(o):
 b=bmesh.new();b.from_mesh(o.data);bmesh.ops.recalc_face_normals(b,faces=list(b.faces));b.to_mesh(o.data);b.free();return o
def shell(n,xz,y0,y1,m):
 k=len(xz);verts=[(X+x,y,z) for y in (y0,y1) for x,z in xz]
 faces=[tuple(reversed(range(k))),tuple(range(k,2*k))]+[(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
 return orient(shape(n,verts,faces,m,cab))
# Dimension drawing for 1276 CMOS Edition ATS supports the closed axis bounds.
# Contours and subdivision dimensions are otherwise authored estimates, with opaque non-functioning front.
outline=[(-.435,.160),(-.461,.267),(-.477,.409),(-.468,.547),(-.443,.682),(-.404,.823),(-.362,.940),(.362,.940),(.404,.823),(.443,.682),(.468,.547),(.477,.409),(.461,.267),(.435,.160)]
shell('closed_1276_body_envelope',outline,-.113,.595,white)
cu('Stable lower cabinet rail',(X,.241,.091),(.864,.699,.171),body,cab,.012)
cu('Covered perimeter seam',(X,-.114,.171),(.857,.005,.009),edge,cab,.001)
cx=[(-.188,.908),(.188,.908),(.188,.430),(.179,.385),(.157,.349),(.115,.315),(-.115,.315),(-.157,.349),(-.179,.385),(-.188,.430)]
shell('fixed_navy_front_center',cx,-.119,-.114,blue)
cu('Inactive red top relief',(X,-.118,.922),(.201,.019,.012),red,cab,.0025)
label('Fixed white brand label','BRUKER',(X,-.121,.810),.049,ink,cab)
cu('Low-right edition plaque',(X+.348,-.117,.218),(.092,.003,.030),blue,cab,.002)
label('CMOS edition label','CMOS',(X+.348,-.120,.218),.018,ink,cab)
# Rounded nose reconstruction is closed throughout and has no opening or travel.
nose=[(-.158,.043),(-.195,.175),(-.219,.307),(-.217,.436),(-.188,.527),(-.144,.580),(-.086,.603),(.086,.603),(.144,.580),(.188,.527),(.217,.436),(.219,.307),(.195,.175),(.158,.043)]
shell('closed_rounded_front_shell',nose,-.583,-.118,white)
nose_end=[(-.149,.040),(-.184,.174),(-.209,.311),(-.207,.433),(-.177,.519),(-.133,.565),(-.075,.585),(.075,.585),(.133,.565),(.177,.519),(.207,.433),(.209,.311),(.184,.174),(.149,.040)]
shell('closed_opaque_front_face',nose_end,-.595,-.582,white)
cu('Thin static seam across nose',(X,-.594,.286),(.352,.002,.008),edge,cab,.001)
for side in (-1,1):cu('Reference seam on nose side',(X+side*.217,-.35,.289),(.004,.433,.007),edge,cab,.002)
cu('Recessed blank front relief',(X,-.595,.402),(.187,.001,.050),silver,cab,.004)
cu('Opaque front infill',(X,-.594,.401),(.156,.001,.032),body,cab,.003)
cu('Fixed darker side controller surround',(X-.435,.115,.097),(.013,.196,.099),silver,cab,.006)
cu('dark_inactive_side_display',(X-.444,.115,.098),(.007,.149,.072),glass,cab,.004)
for j in range(7):cu('Cosmetic side grille silhouette',(X-.436,.427,.055+j*.013),(.004,.092,.004),edge,cab,.0007)
for rx in (-.36,.36):
 for y in (-.045,.495):cylinder('Cabinet leveler foot',(X+rx,y,.006),.012,.028,edge,group=cab)
cu('Closed generic rear label field',(X,.593,.347),(.33,.003,.160),body,cab,.004)
keep(node('documentary_nose_landmark',(X,-.595,.403)),cab)
# Generic tabletop review display; not a station or scanner accessory.
cu('Review display foot',(-.55,-.18,.014),(.319,.236,.028),edge,stand,.006)
cu('Review display column',(-.55,-.079,.205),(.067,.071,.383),body,stand,.008)
cu('Review display bezel',(-.55,-.119,.455),(.399,.059,.332),edge,stand,.009)
cu('detached_phantom_panel',(-.55,-.154,.451),(.351,.011,.260),art,stand,.007)
label('Detached review title','FIXED GEOMETRY ARCHIVE',(-.55,-.150,.598),.014,ink,stand)
freeze={'closed_1276_body_envelope','fixed_navy_front_center','closed_rounded_front_shell','closed_opaque_front_face','dark_inactive_side_display','detached_phantom_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'skyscan1276.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'skyscan1276.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=560;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.54,.63,.70,1);bg.inputs['Strength'].default_value=.66
 cu('Neutral stage floor',(0,0,-.005),(24,24,.009),mat('Slate gray bench',(.27,.31,.35)),None)
 for p,w in [((1.6,-2.7,2.5),208),((-2.1,-.72,1.53),148),((1.4,1.89,1.89),164)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.5;l.rotation_euler=(Vector((X,0,.46))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(-1.38,-2.67,1.48),(X,0,.453),1.94),('side-profile',(-2.66,.01,.604),(X,0,.463),1.65)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
