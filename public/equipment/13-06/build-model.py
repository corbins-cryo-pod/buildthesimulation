"""Original metric Glacios 2 enclosure and detached read-only exhibit; not operation or installation CAD."""
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
root=node('bts_floor_anchor',(0,0,0));cab=node('dormant_glacios2_cabinet',(.45,0,0));desk=node('detached_archive_stand',(-.96,-.17,0))
keep(cab,root);keep(desk,root)
white=mat('Neutral white shell',(.77,.80,.84),.10,.36)
light=mat('Ivory side service panels',(.68,.72,.76),.14,.40)
dark=mat('Soft graphite fascia',(.076,.082,.086),.10,.43)
seam=mat('Closed molding and chassis',(.022,.031,.044),.24,.45)
blue=mat('Cobalt accent stripe',(.023,.145,.49),.17,.43)
steel=mat('Feet and inset grip',(.23,.25,.28),.48,.43)
ink=mat('Documentary polished slate',(.32,.41,.49))
red=mat('Dormant red relief',(.44,.06,.026))
gold=mat('Static control surround',(.56,.43,.072))
teal=mat('Separate archive square',(.052,.30,.32),.10,.44)
screen=mat('Unpowered screen',(.019,.031,.038),.12,.40)
# Brochure BR0158 cover and DS0491 p2 establish elevation proportions; envelope values are authored estimates.
X=.45
cu('cabinet_scale_reference',(X,0,1.13),(1.25,.93,2.14),white,cab,.013)
cu('Low toe frame',(X,0,.049),(1.23,.914,.083),seam,cab,.008)
for x in (X-.56,X+.56):
 for y in (-.399,.399):cylinder('Cabinet foot',(x,y,.020),.040,.035,seam,group=cab)
cu('Powder-coated left control fascia',(X-.408,-.466,.905),(.419,.027,1.68),dark,cab,.004)
cu('White upper face',(X,-.466,2.040),(1.244,.016,.315),white,cab,.008)
cu('dark_left_display',(X-.432,-.489,1.422),(.231,.041,.158),seam,cab,.006)
cu('Blank inactive touchscreen',(X-.432,-.511,1.425),(.185,.005,.107),screen,cab,.005)
cylinder('Static control surround',(X-.473,-.489,1.035),.015,.040,gold,'y',cab)
cylinder('Fixed dormant control relief',(X-.473,-.501,1.035),.021,.023,red,'y',cab)
cu('Large fixed front upper access relief',(X+.035,-.475,1.242),(.442,.013,.675),light,cab,.004)
cu('Large fixed front upper door inner',(X+.037,-.483,1.245),(.430,.009,.659),white,cab,.003)
cu('Dark horizontal door division',(X,-.476,.924),(1.244,.011,.010),seam,cab)
cu('Door grip recess',(X-.12,-.486,.902),(.080,.013,.034),steel,cab,.004)
cu('Front white enamel lower',(X+.211,-.470,.503),(.816,.012,.823),white,cab,.005)
cu('cabinet_blue_fascia',(X,-.475,1.872),(1.246,.011,.013),blue,cab,.001)
label('Fixed model identification','Glacios 2',(X+.466,-.482,.960),.027,ink,cab)
for x in (X-.623,X+.623):
 cu('Side panel plane',(x,.009,1.114),(.017,.918,2.10),light,cab,.008)
 cu('Side blue stripe',(x+(.01 if x>X else -.01),.001,1.872),(.004,.926,.013),blue,cab,.001)
 cu('Side horizontal break',(x+(.01 if x>X else -.01),.001,.924),(.004,.924,.010),seam,cab)
 for z in (.51,1.36):
  cu('Small static flank pull',(x+(.011 if x>X else -.011),.19,z),(.009,.036,.098),steel,cab,.005)
# The rear closure is deliberately generic. No physical ports, racks, internals or movable hardware.
cu('Rear smooth documentary closure',(X,.470,1.12),(1.21,.015,2.08),light,cab,.004)
keep(node('documentary_fascia_landmark',(X-.433,-.514,1.427)),cab)
# The specimen is a byte array, not a physical object in the microscope. Only this detached exhibit surface is actionable.
cu('Archive base plate',(-1.06,-.17,.027),(.60,.36,.054),seam,desk,.013)
cu('Detached pedestal',(-1.06,-.109,.544),(.090,.091,1.018),dark,desk,.012)
cu('Exhibit bezel',(-1.06,-.179,1.19),(.575,.074,.530),seam,desk,.016)
cu('archive_image_panel',(-1.06,-.221,1.183),(.438,.014,.438),teal,desk,.009)
label('Separate display identification','ARCHIVE EXHIBIT',(-1.06,-.218,1.427),.024,white,desk)
freeze={'cabinet_scale_reference','archive_image_panel','cabinet_blue_fascia','dark_left_display'}
for h in (cab,desk):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'glacios2.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'glacios2.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in desk.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=590;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.66,.72,.80,1);bg.inputs['Strength'].default_value=.68
 cu('Neutral matte floor',(0,0,-.007),(80,80,.013),mat('Matte slate floor',(.24,.29,.33)),None)
 for p,w in [((2.1,-3.8,4.3),358),((-3,-1.9,3.0),202),((1.9,2.9,3.8),326)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=2.52;l.rotation_euler=(Vector((.2,0,.96))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(2.92,-5.02,2.64),(.45,0,1.08),3.57),('front-elevation',(.45,-6.0,1.12),(.45,0,1.12),3.29)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
