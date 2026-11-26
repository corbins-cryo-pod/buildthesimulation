"""Original metric Elmarco NS LAB exterior exhibit; no functional parts or operating interfaces."""
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
root=node('bts_floor_anchor',(0,0,0));X=.49
cab=node('nslab_dormant_cabinet',(X,0,0));stand=node('detached_abstract_drawing_stand',(-1.02,-.07,0));keep(cab,root);keep(stand,root)
ivory=mat('Off-white sheet shell',(.77,.80,.82),.17,.39)
silver=mat('Satin extrusion profiles',(.39,.43,.46),.63,.40)
smoke=mat('Opaque blue inspection inset',(.076,.163,.232),.30,.36)
tint=mat('Pale blue passive inner bezel',(.30,.43,.52),.41,.35)
black=mat('Closed black blend',(.026,.037,.045),.25,.43)
bronze=mat('Burnt-orange identification',(.51,.19,.027),.25,.43)
ink=mat('Laboratory graphite lettering',(.11,.17,.20))
red=mat('Dormant red detail',(.53,.055,.031),.15,.41)
gold=mat('Dormant amber surround',(.64,.41,.064),.24,.43)
teal=mat('Separate drawing exhibit',(.06,.31,.36),.18,.45)
# Only the closed scale envelope is vendor-dimensional; trim, stand depths and roof fit are visual inferences.
# The glass is intentionally opaque and the side access silhouette is a blanked enclosure, not operable.
cu('closed_cabinet_reference',(X+.014,.013,1.252),(1.127,.942,1.488),ivory,cab,.012)
cu('Passive roof top panel',(X+.020,.019,2.017),(1.067,.917,.042),ivory,cab,.006)
cu('Generic low roof cover',(X-.143,.072,2.040),(.451,.364,.026),ivory,cab,.005)
cu('Base cabinet perimeter',(X,0,.499),(1.295,1.004,.044),silver,cab,.003)
for xx in (X-.537,X+.552):
 for yy in (-.455,.455):
  cu('Stand square extrusion',(xx,yy,.269),(.078,.078,.448),silver,cab,.003)
  for dy in (-.014,.014):cu('Extrusion track line',(xx+.02,yy+dy,.260),(.004,.005,.401),black,cab)
  cylinder('Passive leveler pad',(xx,yy,.016),.032,.037,silver,group=cab)
for yy in (-.480,.480):
 cu('Lower front or rear aluminium rail',(X-.007,yy,.108),(1.188,.056,.068),silver,cab,.003)
 cu('Dark track edge',(X-.007,yy-.026,.106),(1.095,.003,.006),black,cab)
for xx in (X-.539,X+.554):cu('Lower lateral aluminium rail',(xx,0,.104),(.059,.960,.067),silver,cab,.004)
cu('Rear closed framing extent',(X+.022,.505,1.224),(1.068,.035,1.355),ivory,cab,.005)
cu('Fixed front depth lip',(X+.056,-.456,1.434),(.901,.030,.690),ivory,cab,.008)
cu('Closed outside door recess',(X+.055,-.478,1.468),(.904,.034,.801),tint,cab,.011)
# Opaque silhouette, no visible internal chamber or hardware.
cu('Closed window graphite gasket',(X+.053,-.498,1.481),(.821,.012,.714),black,cab,.038)
cu('closed_opaque_front_window',(X+.053,-.507,1.481),(.772,.011,.661),smoke,cab,.037)
cu('Offset non-moving door pull silhouette',(X+.491,-.514,1.51),(.032,.017,.167),black,cab,.006)
for z in (1.224,1.711):cu('Fixed hinge silhouette',(X-.386,-.503,z),(.069,.018,.090),black,cab,.005)
cu('Recessed documentary control face',(X+.075,-.466,.914),(.737,.018,.153),silver,cab,.004)
cu('blank_front_display',(X+.303,-.478,.915),(.168,.009,.108),black,cab,.005)
for j in range(4):cylinder('Fixed neutral control relief',(X-.127+j*.081,-.485,.917),.017,.018,bronze if j==0 else tint,'y',cab)
cylinder('Fixed amber control base',(X-.25,-.480,.917),.029,.037,gold,'y',cab)
cylinder('Dormant red control relief',(X-.25,-.502,.917),.027,.021,red,'y',cab)
cu('Blank lower inset trim',(X+.071,-.468,.662),(.704,.020,.061),silver,cab,.004)
cu('Blank lower dark face',(X+.031,-.480,.664),(.504,.008,.026),black,cab,.003)
label('Upper enclosure label','elmarco',(X+.054,-.463,1.891),.090,bronze,cab)
label('Lower NS LAB marking','NS LAB',(X+.053,-.460,.581),.029,ink,cab)
cu('Opaque static left side cover',(X-.582,.016,1.238),(.044,.850,1.263),tint,cab,.005)
for yy in (-.428,.460):cu('Left side corner edge',(X-.619,yy,1.238),(.057,.040,1.286),silver,cab,.003)
for z in (.603,1.857):cu('Left upper or lower frame edge',(X-.619,.016,z),(.057,.914,.041),silver,cab,.003)
cu('Closed left dark frosted insert',(X-.611,-.013,1.252),(.011,.710,1.055),smoke,cab,.004)
keep(node('documentary_display_landmark',(X+.303,-.484,.915)),cab)
cu('Detached drawing pedestal plate',(-1.02,-.16,.022),(.487,.337,.044),black,stand,.009)
cu('Detached drawing pedestal',(-1.02,-.068,.525),(.083,.083,.967),black,stand,.010)
cu('Detached drawing case',(-1.02,-.147,1.083),(.462,.064,.485),black,stand,.011)
cu('detached_drawing_panel',(-1.02,-.182,1.070),(.390,.013,.390),teal,stand,.006)
label('Independent display plaque','ABSTRACT DRAWING',(-1.02,-.180,1.302),.021,ivory,stand)
freeze={'closed_cabinet_reference','closed_opaque_front_window','blank_front_display','detached_drawing_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'ns-lab.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'ns-lab.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=14;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=590;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.58,.65,.72,1);bg.inputs['Strength'].default_value=.65
 cu('Neutral matte floor',(0,0,-.006),(70,70,.011),mat('Slate-gray base',(.27,.30,.34)),None)
 for p,w in [((1.7,-3.2,3.5),339),((-2.7,-1.6,2.45),220),((1.6,2.36,2.84),270)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=2.2;l.rotation_euler=(Vector((X,0,1.04))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(-2.06,-4.40,2.09),(X,0,1.04),3.31),('front-elevation',(X,-4.85,1.29),(X,0,1.024),3.16)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
