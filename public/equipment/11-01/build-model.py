"""Photoreferenced metric Doric LEDD_1 dormant housing; detached static arithmetic display only."""
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
root=node('bts_bench_anchor',(0,0,0));X=.062
cab=node('doric_ledd1_dormant_housing',(X,0,0));stand=node('detached_count_card_exhibit',(-.154,0,0));keep(cab,root);keep(stand,root)
black=mat('Doric matte graphite',(.012,.015,.018),.18,.49)
case=mat('Brushed charcoal top plate',(.018,.020,.022),.24,.44)
rim=mat('Dark molded edge',(.017,.021,.027),.20,.44)
lcd=mat('Unpowered dark green-gray surface',(.012,.026,.020),.15,.43)
steel=mat('Satin exterior silver trim',(.37,.41,.44),.66,.39)
edge=mat('Dark neutral relief cap',(.12,.14,.15),.44,.43)
ink=mat('Warm pale documentary lettering',(.66,.66,.64),.20,.46)
panel=mat('Detached exhibition panel',(.083,.27,.31),.24,.38)
def toptext(name,word,p,z,m,grp):
 c=bpy.data.curves.new(name,'FONT');c.body=word;c.size=z;c.align_x='CENTER';c.align_y='CENTER';c.materials.append(m)
 o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.location=p
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return keep(o,grp)
# Published nominal LEDD_1 bounds. OEM photo controls establish the top and front geometry only.
cu('driver_closed_body',(X,.000,.021),(.175,.093,.034),black,cab,.004)
cu('documentary_top_plate',(X,-.0008,.037),(.174,.090,.005),case,cab,.002)
cu('Existing lower seam',(X,-.0453,.014),(.164,.002,.003),rim,cab,.0005)
cu('screen_shadow_surround',(X-.033,-.004,.0396),(.074,.044,.0018),rim,cab,.0018)
cu('unpowered_lcd_window',(X-.033,-.004,.04055),(.069,.040,.001),lcd,cab,.0015)
cylinder('Static knob inset rim',(X+.045,-.004,.0405),.004,.013,edge,group=cab)
cylinder('fixed_silver_knob_relief',(X+.045,-.004,.046),.008,.0116,steel,group=cab)
cylinder('Button cap simple recess silhouette',(X+.045,-.004,.0498),.0004,.0023,edge,group=cab)
for x in (X-.069,X+.068):
 for y in (-.032,.031):cylinder('Solid black bench foot',(x,y,.002),.004,.006,rim,group=cab)
# Solid superficial relief, no electrical/optical components, channels, pins or connector behavior.
cylinder('Front solid dark relief',(X+.046,-.0487,.016),.0076,.0059,edge,'y',cab)
cylinder('Front relief neutral cap',(X+.046,-.0520,.016),.001,.0046,rim,'y',cab)
for x in (X+.024,X+.051):
 cylinder('Rear static cover relief',(x,.0504,.022),.0042,.0048,edge,'y',cab)
cu('Left fixed side relief',(X-.085,-.011,.020),(.004,.015,.011),rim,cab,.001)
toptext('OEM word badge','doric',(X-.023,.027,.040),.014,ink,cab)
toptext('Dormant product label','LED Driver',(X-.030,-.033,.040),.0089,ink,cab)
toptext('Passive single-knob badge','LED #1',(X+.045,-.026,.040),.0064,ink,cab)
keep(node('documentary_view_anchor',(X-.033,-.004,.0409)),cab)
# Independent detachable tabletop placard, not a user interface or module of the driver.
cu('Exhibit foot',(-.154,-.020,.0045),(.124,.071,.009),rim,stand,.002)
cu('Exhibit upright',(-.154,.002,.040),(.018,.022,.072),black,stand,.002)
cu('Exhibit face frame',(-.154,-.017,.092),(.151,.020,.101),rim,stand,.003)
cu('detached_count_card_panel',(-.154,-.0285,.090),(.133,.004,.081),panel,stand,.002)
label('Independent frame heading','COUNT CARDS',(-.154,-.028,.136),.0062,ink,stand)
freeze={'driver_closed_body','unpowered_lcd_window','fixed_silver_knob_relief','detached_count_card_panel'}
for h in (cab,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'doric-ledd1.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'doric-ledd1.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=17;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=510;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.58,.65,.73,1);bg.inputs['Strength'].default_value=.72
 cu('Neutral matte bench',(0,0,-.002),(3,3,.003),mat('Light gray studio',(.34,.37,.40)),None)
 for p,w in [((.25,-.38,.46),10),((-.37,-.17,.29),7),((.20,.40,.38),11)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=.245;l.rotation_euler=(Vector((X,0,.02))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(.301,-.443,.393),(X,0,.025),.26),('top-front',(X,-.278,.444),(X,0,.025),.230)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
