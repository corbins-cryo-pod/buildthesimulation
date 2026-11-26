"""Original metric IKA C-MAG HS 7 3581201 shell and illustrative inert accessory, not OEM CAD. Rebuild with Blender 4+. """
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
root=node('bts_bench_anchor',(0,0,0))
base=node('device_body',(0,0,0));keep(base,root)
vessel=node('inert_vessel',(0,.027,.105));keep(vessel,root)
rotor=node('stir_bar',(0,.027,.117));keep(rotor,vessel)
probe=node('virtual_probe',(0,.048,.159));keep(probe,vessel)
cream=mat('Off-white ceramic',(.74,.77,.73),.02,.35)
case=mat('Pale blue-gray molded case',(.43,.52,.57),.15,.43)
panel=mat('Light console membrane',(.58,.63,.64),.09,.44)
blue=mat('IKA-like blue detail',(.025,.19,.34),.15,.32)
edge=mat('Dark base and vents',(.031,.042,.05),.24,.45)
steel=mat('Satin metal hardware',(.38,.44,.47),.60,.35)
screen=mat('Front dark red LED window',(.063,.023,.030),.15,.29)
red=mat('Modeled heater indicator',(.46,.035,.028),.18,.32)
orange=mat('Modeled Hot Top flag',(.62,.23,.045),.21,.34)
glass=mat('Virtual vessel wall',(.18,.39,.47),.10,.30,.27)
witness=mat('Blue inert phantom color proxy',(.065,.24,.29),.12,.39,.44)
bar=mat('Cream inert stir bar',(.87,.84,.70),.03,.46)
# Section profile positions are inferred from the IKA front photograph and operating manual.
outline=[(-.1625,.016),(.1645,.016),(.1645,.061),(.150,.073),(-.060,.079),(-.148,.061),(-.158,.041)]
n=len(outline);pts=[(x,y,z) for x in (-.110,.110) for y,z in outline]
f=[tuple(range(n)),tuple(reversed(range(n,n*2)))]+[(i,i+n,(i+1)%n+n,(i+1)%n) for i in range(n)]
o=shape('Outlined molded shell',pts,[tuple(reversed(poly)) for poly in f],case,base)
q=o.modifiers.new('Molded radius','BEVEL');q.width=.005;q.segments=3
cu('Lower chassis',(0,0,.0165),(.207,.315,.020),edge,base,.005)
cu('Rear adapter face',(0,.164,.041),(.198,.007,.051),case,base,.002)
cu('Mounting shoulder',(0,.026,.076),(.186,.187,.013),edge,base,.005)
cu('ceramic_plate',(0,.026,.0935),(.180,.180,.023),cream,base,.003)
for x in (-.082,.082):
 for y in (-.107,.125):cylinder('Elastomer foot',(x,y,.005),.010,.011,edge,group=base)
for x in (-.110,.110):
 for i in range(12):cu('Vented flank recess',(x*.999,.057+i*.0065,.039),(.0014,.0032,.018),edge,base,.0005)
cu('Elevated front controls',(0,-.137,.061),(.195,.018,.040),panel,base,.005)
cu('Blue lower front divider',(0,-.149,.044),(.188,.006,.006),blue,base,.001)
cu('display_window',(0,-.149,.067),(.040,.006,.019),screen,base,.002)
cu('heater_led',(-.028,-.152,.076),(.005,.003,.004),red,base,.0005)
cu('hot_flag',(.030,-.152,.075),(.010,.003,.004),orange,base,.0007)
for n,x,m in [('heat_knob',-.064,blue),('stir_knob',.064,blue)]:
 g=node(n,(x,-.151,.067));keep(g,base)
 cylinder('Trim bezel',(x,-.146,.067),.008,.0176,steel,axis='y',group=g)
 cylinder('33.3 mm operating knob',(x,-.157,.067),.017,.01665,edge,axis='y',group=g)
 cu('Live pointer',(x,-.167,.077),(.002,.001,.010),cream,g,.0005)
label('Badge','C-MAG HS 7',(0,-.154,.052),.0069,blue,base)
cu('power_switch',(-.075,.1635,.040),(.021,.008,.015),blue,base,.001)
# Physical rear connection layout is schematic and only the passive anchors exist in the GLB.
for n,x,z,w,h in [('mains',-.031,.040,.027,.018),('contact_probe',.052,.043,.019,.016),('rod_mount',.084,.057,.014,.014)]:
 cu('Rear connector '+n,(x,.164,z),(w,.007,h),edge,base,.001)
 keep(node('port_'+n,(x,.1675,z)),base)
def ring(n,r1,r2,z0,z1,material,holder):
 N=36;v=[];f=[]
 for z,r in ((z0,r1),(z0,r2),(z1,r1),(z1,r2)):
  v.extend([(r*math.cos(2*math.pi*i/N),.027+r*math.sin(2*math.pi*i/N),z) for i in range(N)])
 for i in range(N):
  j=(i+1)%N
  f.extend([(i,j,j+N,i+N),(i+2*N,i+3*N,j+3*N,j+2*N),(i,i+2*N,j+2*N,j),(i+N,j+N,j+3*N,i+3*N)])
 return shape(n,v,f,material,holder)
ring('Open top glass witness vessel',.042,.044,.108,.190,glass,vessel)
ring('Vessel lip',.0417,.045,.188,.192,glass,vessel)
cylinder('Clear vessel base',(0,.027,.107),.004,.044,glass,group=vessel)
cylinder('Inert synthetic phantom visual charge',(0,.027,.128),.033,.040,witness,group=vessel)
cu('Visible ceramic stir rotor',(0,.027,.114),(.030,.006,.006),bar,rotor,.002)
cylinder('Generic inert probe shaft',(0,.048,.164),.094,.0015,steel,group=probe)
cylinder('Generic inert probe handle',(0,.048,.215),.017,.0045,blue,group=probe)
keep(node('vessel_target',(.041,.017,.167)),vessel)
keep(node('probe_target',(0,.048,.213)),probe)
for n,x,z in [('blue_mark',-.047,.090),('blue_mark2',.047,.090)]:
 cu(n,(x,-.102,z),(.029,.021,.002),blue,base)
freeze={'ceramic_plate','heater_led','hot_flag','display_window','power_switch'}
for h in (base,vessel,probe):
 for m in list(bpy.data.materials):
  a=[o for o in h.children if o.type=='MESH' and o.name not in freeze and o.data.materials[:]==[m]]
  if len(a)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in a:o.select_set(True)
  bpy.context.view_layer.objects.active=a[0];bpy.ops.object.join();a[0].name=h.name+' '+m.name
bpy.ops.export_scene.gltf(filepath=str(P/'ika-hs7.glb'),export_format='GLB',export_yup=True)
if os.getenv('BTS_EQUIPMENT_BLEND'):bpy.ops.wm.save_as_mainfile(filepath=str(P/'ika-hs7.blend'))
if os.getenv('BTS_EQUIPMENT_RENDER'):
 s.render.engine='CYCLES';s.cycles.samples=11;s.cycles.use_denoising=False
 s.render.resolution_x=750;s.render.resolution_y=500;s.render.resolution_percentage=100
 s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=87
 s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True
 bg=s.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.58,.65,.69,1);bg.inputs['Strength'].default_value=.74
 cu('Floor',(0,0,-.006),(6,6,.011),mat('Neutral bench',(.29,.31,.32)),None)
 for p,w in [((.41,-.42,.55),38),((-.47,-.15,.4),25),((.24,.38,.46),30)]:
  bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=w;l.data.size=.51;l.rotation_euler=(Vector((0,0,.07))-l.location).to_track_quat('-Z','Y').to_euler()
 for n,p,t,extent in [('front-view',(.35,-.53,.36),(0,-.013,.088),.46),('rear-view',(-.36,.55,.29),(0,.018,.092),.45)]:
  bpy.ops.object.camera_add(location=p);cam=bpy.context.object;cam.rotation_euler=(Vector(t)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=extent;s.camera=cam
  s.render.filepath=str(P/(n+'.webp'));bpy.ops.render.render(write_still=True)
