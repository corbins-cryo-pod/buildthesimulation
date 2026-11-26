"""Closed documentary second-generation Core and X exterior only, with a detached abstract drawing exhibit."""
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
root=node('bts_bench_anchor',(0,0,0));X=.175
xbody=node('lonza_x_closed_module',(X,0,0));core=node('lonza_core_closed_module',(X,0,.105));stand=node('detached_outline_exhibit',(-.255,0,0));keep(core,root);keep(xbody,root);keep(stand,root)
white=mat('Light molded enclosure',(.75,.77,.82),.17,.42)
trim=mat('Muted cool enclosure side',(.51,.56,.63),.23,.42)
navy=mat('Deep blue fixed front and side trim',(.041,.068,.122),.29,.40)
outline=mat('Blue recessed fixed X plate',(.065,.109,.173),.26,.43)
edge=mat('Fine navy seams',(.012,.023,.035),.28,.46)
screen=mat('Dormant black-blue display',(.013,.025,.040),.29,.35)
ink=mat('Pale documentary labeling',(.68,.72,.77),.14,.45)
silver=mat('Muted exterior trim relief',(.27,.32,.39),.43,.44)
demo=mat('Detached archive face',(.074,.28,.33),.17,.40)
def form(n,x0,x1,yz,m,grp):
 k=len(yz);v=[(x,y,z) for x in (x0,x1) for y,z in yz];f=[tuple(reversed(range(k))),tuple(range(k,k*2))]
 f.extend((i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k))
 return shape(n,v,f,m,grp)
def slope(n,x0,x1,z0,z1,dy,m):
 v=[(x,-.132+(z-.140)*1.12-dy,z) for x,z in [(x0,z0),(x1,z0),(x1,z1),(x0,z1)]]
 return shape(n,v,[(0,1,2,3)],m,core)
# Outer envelopes are product dimensions. Fine feature sizes and connector recess silhouettes are not CAD.
cu('x_case_envelope',(X,.001,.055),(.245,.278,.100),white,xbody,.008)
cu('Fixed X front blue reveal',(X,-.137,.055),(.233,.006,.089),navy,xbody,.006)
cu('Closed outline shadow',(X,-.137,.057),(.192,.003,.066),edge,xbody,.003)
cu('x_sealed_drawer_outline',(X,-.140,.057),(.184,.0005,.060),outline,xbody,.003)
label('Fixed X identification','X UNIT',(X-.059,-.1404,.078),.011,ink,xbody)
for xx in (X-.12262,X+.12262):shape('X lateral navy band',[(xx,-.106,.047),(xx,.132,.047),(xx,.132,.074),(xx,-.106,.074)],[(0,1,2,3)],navy,xbody)
for xx in (X-.094,X+.094):
 for yy in (-.106,.102):cylinder('X static bench foot',(xx,yy,.003),.006,.012,edge,group=xbody)
cu('Plain X rear silhouette',(X,.138,.055),(.224,.004,.081),trim,xbody,.006)
# Core closed outer silhouette with fixed sloping OEM-style screen at the front.
yz=[(-.140,.105),(-.140,.138),(-.132,.140),(-.010,.249),(.009,.252),(.096,.213),(.140,.200),(.140,.109)]
form('core_case_envelope',X-.1225,X+.1225,yz,white,core)
cu('Fixed Core lower front blue strip',(X,-.138,.122),(.233,.004,.030),navy,core,.004)
slope('Core black frame',X-.116,X+.116,.142,.248,.0015,edge)
slope('core_static_blank_display',X-.0865,X+.0865,.159,.231,.0035,screen)
label('Upper fixed identification','Lonza',(X+.060,-.0183,.243),.009,ink,core).rotation_euler.x=math.atan(1/1.12)
label('Core lower model label','CORE UNIT',(X-.072,-.1404,.119),.0095,ink,core)
for n,t in enumerate((X+.056,X+.084)):
 cu('Non-connectable front relief',(t,-.139,.122),(.012,.003,.007),silver,core,.002)
cu('Plain Core rear silhouette',(X,.138,.152),(.230,.004,.075),trim,core,.005)
yzz=[(-.138,.111),(-.138,.125),(-.095,.159),(.008,.221),(.096,.193),(.139,.178),(.139,.149),(.082,.161),(.003,.189),(-.096,.127)]
form('Displayed Core flowing side accent',X-.1225,X-.1217,yzz,navy,core)
form('Displayed Core opposite accent',X+.1217,X+.1225,yzz,navy,core)
keep(node('closed_front_reference',(X,-.14,.065)),xbody)
# A separate display on the bench. It never represents the equipment touchscreen.
cu('Exhibit foot',(-.255,-.032,.010),(.19,.121,.020),edge,stand,.004)
cu('Exhibit stem',(-.255,.001,.076),(.035,.031,.132),navy,stand,.005)
cu('Exhibit frame',(-.255,-.029,.194),(.252,.031,.169),edge,stand,.005)
cu('detached_outline_panel',(-.255,-.046,.191),(.225,.006,.132),demo,stand,.003)
label('Exhibit frame mark','DRAWING ARCHIVE',(-.255,-.045,.264),.009,ink,stand)
freeze={'x_case_envelope','x_sealed_drawer_outline','core_case_envelope','core_static_blank_display','detached_outline_panel'}
for h in (xbody,core,stand):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'lonza-core-x.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'lonza-core-x.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 for item in stand.children:item.hide_render=True
 s.render.engine='CYCLES';s.cycles.samples=15;s.cycles.use_denoising=False
 s.render.resolution_x=780;s.render.resolution_y=530;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.56,.63,.71,1);bg.inputs['Strength'].default_value=.67
 cu('Neutral matte bench',(0,0,-.006),(10,10,.011),mat('Slate bench',(.28,.31,.34)),None)
 for p,w in [((.59,-.89,.79),26),((-.67,-.23,.52),17),((.51,.62,.67),23)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=.58;l.rotation_euler=(Vector((X,0,.12))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-quarter',(.68,-.82,.48),(X,0,.125),.535),('front-elevation',(X,-.86,.203),(X,0,.126),.44)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
