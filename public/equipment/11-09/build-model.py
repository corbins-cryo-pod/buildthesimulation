"""Coherent Monaco 1035-80-60 closed documentary metric housing, with independent geometry cards only."""
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
root=node('bts_bench_anchor',(0,0,0));X=.24
cab=node('monaco_dormant_head_enclosure',(X,0,0));stand=node('detached_geometry_card_stand',(-.34,.025,0));keep(cab,root);keep(stand,root)
black=mat('Dark sealed top cover',(.011,.013,.015),.0,.65)
black.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.12
wall=mat('Anodized dark long side',(.030,.034,.038),.33,.44)
edge=mat('Dark enclosure seam',(.015,.020,.025),.20,.45)
silver=mat('Brushed light exterior end plate',(.50,.53,.54),.46,.37)
pale=mat('Bright peripheral rail',(.59,.61,.62),.44,.38)
steel=mat('Solid documentary screw head',(.32,.37,.40),.53,.41)
ink=mat('Pale identification lettering',(.72,.73,.71),.19,.45)
panel=mat('Independent geometry placard',(.10,.29,.31),.19,.44)
# Shared 1035-40-40/1035-80-60 mechanical drawing p.4 gives outer envelope, excluding loose leads.
# The safety-sensitive central feature is fully blanked; no ports, internals, or projection paths are represented.
cu('monaco_outer_case_reference',(X,0,.0911),(.3593,.658,.171),wall,cab,.003)
cu('Flat black sealed top',(X,-.003,.178),(.3603,.655,.005),black,cab,.002)
cu('Neutral rear side closed plate',(X,.3298,.0918),(.359,.0091,.1698),silver,cab,.0018)
cu('closed_blank_front_end',(X,-.3298,.0918),(.3603,.0091,.1698),silver,cab,.0018)
cu('Silver long underside framing',(X,0,.008),(.3603,.6687,.0095),pale,cab,.0012)
cu('Fine dark dividing witness line',(X,0,.015),(.3603,.664,.0018),edge,cab,.0003)
cu('Fixed external front blank fascia seam',(X,-.3337,.054),(.127,.0011,.075),steel,cab,.002)
cu('Nonfunctional solid face within seam',(X,-.3340,.054),(.121,.0007,.069),silver,cab,.001)
for xx in (X-.151,X+.151):
 for yy in (-.289,.290):cylinder('Nominal low feet sculptural pad',(xx,yy,.004),.008,.013,edge,group=cab)
# Only perimeter fastener relief and cosmetic labeling are taken from the visible product photograph.
for x in (-.151,-.107,-.061,.063,.109,.150):
 for z in (.026,.159):
  cylinder('Front solid fastener',(X+x,-.3341,z),.0005,.0025,steel,'y',cab)
for yy in (-.299,-.214,-.104,.030,.160,.282):
 for xx in (X-.168,X+.168):cylinder('Roof peripheral fastener',(xx,yy,.1800),.001,.0026,steel,group=cab)
for side in (-1,1):
 for yy in (-.198,-.045,.107,.259):
  cylinder('Side neutral detail',(X+.1799*side,yy,.091),.00045,.0026,edge,'x',cab)
 for name,word,yy,ss in [('Maker','COHERENT',.208,.032),('Product','Monaco',-.213,.034)]:
  o=label('Long side '+name+' identification',word,(X+.1801*side,yy,.148),ss,ink,cab);o.rotation_euler.z=math.copysign(math.pi/2,side)
keep(node('documentary_face_reference',(X,-.334,.092)),cab)
cu('Detached geometry pedestal foot',(-.34,-.10,.012),(.267,.208,.024),edge,stand,.006)
cu('Detached geometry column',(-.34,-.022,.118),(.052,.056,.209),wall,stand,.007)
cu('Detached geometry bezel',(-.34,-.077,.287),(.317,.038,.232),edge,stand,.011)
cu('detached_geometry_panel',(-.34,-.099,.282),(.274,.008,.173),panel,stand,.004)
label('Exhibit top heading','GEOMETRY CARDS',(-.34,-.098,.382),.014,ink,stand)
freeze={'monaco_outer_case_reference','closed_blank_front_end','detached_geometry_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'monaco-1035.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'monaco-1035.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=510;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.62,.66,.73,1);bg.inputs['Strength'].default_value=.62
 cu('Neutral studio floor',(0,0,-.004),(10,10,.007),mat('Neutral light slate studio',(.32,.35,.37)),None)
 for p,w in [((.83,-1.6,1.37),83),((-1.1,-.44,.82),52),((.87,1.59,1.53),76)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.03;l.rotation_euler=(Vector((X,0,.08))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(-.72,-1.38,.57),(X,0,.077),.99),('side-elevation',(-1.45,.00,.210),(X,0,.096),.87)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
