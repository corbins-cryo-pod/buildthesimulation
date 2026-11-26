"""Photoreferenced metric closed OF-12G solid-door enclosure and independent optical exhibit."""
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
root=node('bts_bench_anchor',(0,0,0));X=.33
cab=node('of12g_dormant_enclosure',(X,0,0));stand=node('detached_projection_exhibit',(-.64,0,0));keep(cab,root);keep(stand,root)
white=mat('Ivory coated cabinet',(.74,.77,.76),.17,.38)
side=mat('Ivory top mottled metal',(.58,.62,.61),.28,.40)
teal=mat('Deep teal fascia',(.025,.31,.34),.22,.38)
rim=mat('Teal outer pull rim',(.055,.38,.39),.26,.36)
dark=mat('Cabinet closed seam',(.019,.030,.038),.29,.42)
gloss=mat('Blank inactive display',(.012,.052,.046),.26,.46)
nickel=mat('Small fixed metallic trim',(.32,.38,.38),.53,.41)
pale=mat('Small control neutral marks',(.50,.61,.58),.17,.43)
red=mat('Dormant muted red detail',(.44,.10,.058),.20,.42)
ink=mat('Equipment badge graphite',(.24,.30,.33))
gold=mat('Static decorative warning field',(.55,.39,.07),.21,.43)
demo=mat('Detached projection display panel',(.095,.25,.33),.17,.39)
# OF-12G AAH12166U envelope from Jeio Tech; front relief follows the NIST actual solid-door photo.
cu('exterior_dimension_reference',(X,.028,.430),(.657,.636,.844),white,cab,.012)
cu('Top stamped neutral cover',(X,.020,.850),(.650,.650,.014),side,cab,.004)
cu('Passive top teal silhouette',(X-.267,-.248,.861),(.072,.052,.018),teal,cab,.005)
for x in (X-.192,X+.172):cu('Neutral top low-profile cover', (x,.103,.862),(.050,.050,.010),nickel,cab,.004)
cu('Closed door dark seam',(X,-.290,.497),(.649,.018,.696),dark,cab,.012)
cu('closed_solid_door',(X,-.309,.497),(.648,.032,.687),white,cab,.011)
cu('Fixed front handle border',(X+.250,-.328,.567),(.079,.023,.164),rim,cab,.008)
cu('Closed recess shadow',(X+.250,-.340,.567),(.060,.009,.141),dark,cab,.011)
cu('teal_pull_static_silhouette',(X+.250,-.342,.550),(.051,.008,.108),teal,cab,.011)
cu('Lower front deck',(X,-.293,.087),(.647,.051,.138),white,cab,.009)
cu('Lower horizontal dark gap',(X,-.315,.152),(.645,.003,.005),dark,cab)
cu('Teal lower front band',(X-.002,-.322,.079),(.257,.012,.136),teal,cab,.004)
cu('Dormant controller blank base',(X-.007,-.329,.092),(.159,.004,.077),rim,cab,.002)
cu('blank_inactive_controller',(X-.032,-.332,.104),(.093,.003,.025),gloss,cab,.001)
for i in range(6):cylinder('Fixed small control relief',(X-.068+i*.019,-.333,.082),.003,.0057,pale,'y',cab)
cylinder('Fixed right accent border',(X+.097,-.33,.092),.004,.0108,nickel,'y',cab)
cylinder('Dormant muted right dot',(X+.097,-.333,.092),.004,.0066,red,'y',cab)
cu('Thin generic sign on closed face',(X+.221,-.326,.791),(.087,.002,.024),pale,cab)
shape('Static warning silhouette',[(X+.224,-.328,.803),(X+.216,-.328,.785),(X+.232,-.328,.785)],[(0,1,2)],gold,cab)
label('Faint OF-12G identification','OF-12G',(X-.121,-.326,.742),.029,ink,cab)
label('Inactive insert identification','LAB COMPANION',(X-.01,-.330,.043),.015,pale,cab)
cu('Unverified lower flank relief',(X+.326,.214,.073),(.003,.175,.066),side,cab,.002)
cu('Plain rear closure seam',(X,.344,.413),(.639,.004,.792),side,cab,.005)
for x in (X-.258,X+.258):
 for y in (-.241,.255):cylinder('Fixed foot pad',(x,y,.007),.014,.026,dark,group=cab)
keep(node('cabinet_documentary_mark',(X+.250,-.346,.55)),cab)
# Detached exhibit is not a console or hardware accessory.
cu('Exhibit plate',(-.64,-.133,.016),(.364,.234,.032),dark,stand,.006)
cu('Exhibit pedestal',(-.64,-.065,.214),(.062,.069,.391),side,stand,.008)
cu('Exhibit bezel',(-.64,-.121,.533),(.387,.054,.305),dark,stand,.009)
cu('detached_projection_panel',(-.64,-.151,.529),(.347,.010,.218),demo,stand,.008)
label('Exhibit header','PROJECTION STUDY',(-.64,-.150,.660),.020,pale,stand)
freeze={'exterior_dimension_reference','closed_solid_door','teal_pull_static_silhouette','blank_inactive_controller','detached_projection_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'of-12g.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'of-12g.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=14;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=580;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.60,.65,.73,1);bg.inputs['Strength'].default_value=.6
 cu('Neutral matte bench',(0,0,-.006),(24,24,.011),mat('Neutral bench',(.28,.31,.34)),None)
 for p,w in [((1.4,-2.3,2.24),195),((-1.9,-.62,1.59),126),((1.28,1.6,1.78),170)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.38;l.rotation_euler=(Vector((X,0,.42))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(1.55,-2.25,1.19),(X,0,.414),1.63),('front-elevation',(X,-2.6,.505),(X,0,.424),1.36)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
