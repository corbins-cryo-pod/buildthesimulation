"""Original metric visualization of a Newport M-RS2000-46-8 top on four S-2000A-428 isolators. Rebuild with Blender 4+. """
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
assembly=node('table_translation',(0,0,0))
anchor=node('bts_bench_anchor',(0,0,0));keep(anchor,assembly)
rigid=node('floating_platform',(0,0,.9142));keep(rigid,assembly)
fixture=node('two_hole_witness',(-.0625,-.2875,.9142));keep(fixture,rigid)
payload=node('centered_dummy_mass',(0,0,.9142));keep(payload,rigid)
base=mat('Coated isolator graphite',(.044,.057,.073),.29,.39)
steel=mat('Satin 430 steel tabletop',(.54,.58,.61),.54,.30)
core=mat('Damped composite sides',(.105,.123,.136),.13,.50)
black=mat('Deep grid hole underlayer',(.023,.033,.047),.10,.48)
gold=mat('Inert brass witness pins',(.68,.46,.140),.66,.28)
cyan=mat('Witness anodized teal',(.043,.29,.34),.43,.36)
light=mat('Alignment reference paint',(.53,.65,.69),.21,.37)
green=mat('Virtual float flag',(.14,.53,.35),.22)
cu('Table underside plate',(0,0,.714), (1.8,1.2,.0056),steel,rigid,.001)
cu('Honeycomb enclosure',(0,0,.812),(1.796,1.196,.191),core,rigid,.003)
cu('Skin and dark recessed hole floor',(0,0,.9115),(1.800,1.200,.0032),black,rigid)
# Single sparse stitched surface with real openings on the 25 mm lattice. M6 thread relief is not modeled.
verts=[];faces=[];d=.0125
outer=[(d,-d),(d,0),(d,d),(-d,d),(-d,0),(-d,-d)]
ring=[(.00305*math.cos(math.radians(t)),.00305*math.sin(math.radians(t))) for t in (-60,0,60,120,180,240)]
for ix in range(72):
 for iz in range(48):
  x=-.8875+ix*.025;y=-.5875+iz*.025
  z=len(verts);verts.extend([(x+u,y+v,.9142) for u,v in outer+ring])
  faces.extend([(z+i,z+(i+1)%6,z+6+(i+1)%6,z+6+i) for i in range(6)])
shape('metric_25mm_hole_grid',verts,faces,steel,rigid)
for x in (-.7476,.7476):
 for y in (-.4699,.4699):
  g=node('isolator_'+('left' if x<0 else 'right')+'_'+('front' if y<0 else 'rear'),(x,y,0));keep(g,assembly)
  cylinder('Base footprint Ø254',(x,y,.009),.018,.127,base,group=g)
  cylinder('Graphite cylinder',(x,y,.320),.622,.103,base,group=g)
  cylinder('Upper support collar',(x,y,.621),.071,.106,base,group=g)
  cylinder('Piston shell',(x,y,.659),.089,.077,core,group=g)
  cylinder('Ø171 cap',(x,y,.7042),.014,.0855,steel,group=rigid)
  cu('Float height indicator',(x,y-.100,.573),(.044,.015,.057),base,g,.002)
  cu('Float indicator stripe',(x,y-.108,.581),(.022,.003,.012),green,g,.001)
  for leg in (-1,1):cu('Recess marker',(x+.062*leg,y-.082,.301),(.014,.010,.527),black,g,.002)
  cylinder('Passive air port',(x+.103,y,.565),.022,.010,gold,axis='x',group=g)
keep(node('port_air',( .863, -.4699,.565)),assembly)
cu('Centered model ballast',(0,0,.950),(.249,.192,.071),base,payload,.005)
cu('Ballast upper cap',(0,0,.987),(.195,.149,.008),core,payload,.002)
for x in (-.077,.077):cu('Ballast fastening tag',(x,0,.992),(.011,.093,.003),steel,payload)
cu('mount_bridge',(-.0625,-.2875,.923),(.069,.043,.017),cyan,fixture,.002)
for n,x in [('mount_first_pin',-.0875),('mount_second_pin',-.0375)]:
 o=node(n,(x,-.2875,.9142));keep(o,fixture)
 cylinder('M6 witness screw head',(x,-.2875,.941),.010,.007,gold,group=o)
 cylinder('Fixture shaft',(x,-.2875,.926),.018,.003,steel,group=o)
for n,x,m in [('snap_target',-.15,cyan),('load_target',0,green),('shift_target',.15,light)]:
 cu(n,(x,-.6004,.848),(.061,.011,.035),m,rigid,.003)
# Consolidate static materials per movable group, leaving semantic targets untouched.
freeze={'metric_25mm_hole_grid','mount_bridge','snap_target','load_target','shift_target'}
for g in [rigid,fixture,payload]+[o for o in assembly.children if o.name.startswith('isolator_')]:
 for m in list(bpy.data.materials):
  a=[o for o in g.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=g.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'optical-table.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'optical-table.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for o in payload.children:o.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=10;s.cycles.use_denoising=False
 s.render.resolution_x=800;s.render.resolution_y=540;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=85
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.62,.68,.72,1);bg.inputs['Strength'].default_value=.68
 cu('Floor',(0,0,-.014),(25,25,.023),mat('Workshop floor',(.28,.32,.34)),None)
 for p,w in [((.43,-2.4,2.7),230),((-1.7,-.89,1.4),165),((.75,1.8,2.5),230)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=1.55;l.rotation_euler=(Vector((0,0,.6))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('table-view',(2.1,-2.68,1.84),(0,0,.44),2.62),('grid-view',(.175,-.65,1.30),(-.0625,-.28,.918),.34)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
