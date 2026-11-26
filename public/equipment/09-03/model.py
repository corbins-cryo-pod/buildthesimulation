"""Editable, original Keithley 2450 model, mm; Blender 4+, run: blender -b -P model.py
Approximate small features; exterior datums from Keithley 2450-901-01D figures 32/33.
X right, Y toward rear, Z up in Blender. glTF transforms to metres, Y up, +Z front.
"""
import bpy, math, json, pathlib, struct
from mathutils import Vector
from collections import defaultdict
D=pathlib.Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
def v(p):return [q*.001 for q in p]
defs={'shell':('#9c9990',.29),'rubber':('#303437',.08),'dark':('#20262b',.08),'face':('#d8d8d2',.1),'chrome':('#91999d',.65),'black':('#080d10',.02),'red':('#bd2236',.08),'green':('#3b986a',.08),'teal':('#117990',.12),'blue':('#204b68',.09),'white':('#eff0e7',.08),'copper':('#b5784e',.55),'gold':('#bda36a',.5),'pcb':('#244944',.1),'screen':('#081919',.02),'ink':('#202b35',.02),'lime':('#65d486',.02),'cyan':('#66c6d3',.02),'senseRed':('#d47d7b',.08),'senseBlack':('#63727d',.1)}
M={}
for n,(h,m) in defs.items():
 h=h[1:];c=[((int(h[i:i+2],16)/255+.055)/1.055)**2.4 for i in (0,2,4)]
 k=bpy.data.materials.new(n); k.diffuse_color=(*c,1);k.use_nodes=True; bs=k.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=.42;bs.inputs['Metallic'].default_value=m;M[n]=k
G=defaultdict(list);meta={}
def add(o,g,m):
 o.name=g+'-element';o.data.materials.append(M[m]);G[g].append(o);return o
def box(g,m,p,d,b=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=v(p));o=bpy.context.object;o.dimensions=v(d);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if b:
  mod=o.modifiers.new('rounded','BEVEL');mod.width=.001*b;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 return add(o,g,m)
def cyl(g,m,p,r,h,axis='Y',n=24):
 bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=r*.001,depth=h*.001,location=v(p));o=bpy.context.object
 o.rotation_euler={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis];return add(o,g,m)
def line(g,m,points,r,n=6):
 cu=bpy.data.curves.new('path','CURVE');cu.dimensions='3D';cu.resolution_u=n;cu.bevel_depth=r*.001;cu.bevel_resolution=1;cu.resolution_u=n;cu.use_fill_caps=True
 s=cu.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=v(p);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new('path',cu);bpy.context.collection.objects.link(o);return add(o,g,m)
def text(g,m,p,body,size,side='front',align='CENTER'):
 cu=bpy.data.curves.new('type','FONT');cu.body=body;cu.align_x=align;cu.size=size*.001;cu.resolution_u=2
 o=bpy.data.objects.new('text',cu);bpy.context.collection.objects.link(o);o.location=v(p);o.rotation_euler=(math.pi/2,0,0) if side=='front' else ((math.pi/2,0,math.pi) if side=='rear' else (0,0,0));return add(o,g,m)
def action(g,aid,label,p,bb):
 meta[g]=dict(action=aid,label=label,anchorM=[p[0]/1000,p[2]/1000,-p[1]/1000],boundsM=[q/1000 for q in bb],coordinateFrame='glTF metre; center plus full XYZ extents')
B='chassis';F='front_legend';R='rear_panel'
# Shell and elastomer guard rails: Fig 33 side and top show front and rear sleeves, short pivoting U stand.
box(B,'shell',(0,1,55),(213,383,88),2.5)
for yy in [-179,175]:
 box(B,'rubber',(0,yy,56),(228,39,100.1),3)
for x in [-76,76]:
 for y in [-181,176]:box(B,'rubber',(x,y,3),(27,29,6),2.5)
for x in [-91,91]:box(B,'shell',(x,0,99),(4,311,1),.4)
for x in [-94,94]:box(B,'rubber',(x,203,32),(17,19.4,47),3)
# Handle shown at -15° toward the back in dimension sheet. Its underside remains above floor in this pose.
for sign in [-1,1]:
 x=sign*121.5;cyl(B,'dark',(sign*117,-168,34),18,12,'X')
 cyl(B,'rubber',(sign*123.65,-168,34),14.5,8,'X')
 line(B,'rubber',[(x,-168,34),(x,-150,30),(x,-48,7.5)],4.6)
box(B,'rubber',(0,-48,7),(251,13,11),4.2)
# Vent slots visually batched. Shell, side and instrument envelope checks exclude accessory.
for x in range(-74,-33,4):
 for y in range(-138,-87,4):box(B,'dark',(x,y,99.25),(1.6,2,.6))
for sign in [-1,1]:
 for y in range(-141,-95,4):
  for z in range(49,80,4):box(B,'dark',(sign*106.6,y,z),(.65,1.8,2))
# Gray fascia and touchscreen with raised operator controls.
box(B,'dark',(0,-201,57),(221,7,92),2);box(B,'face',(0,-205,56),(208,2.8,82),1.2)
box(F,'red',(-69,-206.6,92),(29,.4,6));text(F,'white',(-69,-206.9,90),'KEITHLEY',4.6)
box(F,'teal',(15,-206.6,92),(38,.4,6));text(F,'white',(15,-206.9,90),'2450 SourceMeter',3.8)
box(B,'black',(-27,-206.8,54),(111,1.4,66),1)
box('lcd','screen',(-27,-207.6,54),(109,.2,63),.2)
# Separate screen surface is replaced with a live CanvasTexture in the web viewer (GLB retains offline label).
for z,m,body in [(77,'white','DC MEASUREMENT'),(65,'lime','0.00000 mA'),(47,'white','SOURCE VOLTAGE'),(34,'cyan','0.00000 V')]:
 text('lcd_art',m,(-75,-207.85,z),body,6 if m in ['lime','cyan'] else 3.3,align='LEFT')
for i,label in enumerate(['HOME','MENU','QUICKSET','HELP']):
 z=85-i*9.4;box(B,'rubber',(-95,-207,z),(12,2.3,6),1.4);text(F,'white',(-95,-208.25,z-.8),label,2.3)
box(B,'chrome',(-95,-207,40),(5.7,1.8,12),.7);box(B,'black',(-95,-208,40),(3.7,1,9))
cyl(B,'face',(-95,-207.9,22),4.1,2);text(F,'ink',(-95,-206.85,15.6),'POWER',2.7)
for j,label in enumerate(['ENTER','EXIT','FUNCTION','TRIGGER']):
 z=51-j*9;box(B,'rubber',(44,-207.65,z),(12,2.4,6),1.3);text(F,'white',(44,-209,z-.7),label,2.1)
cyl('rotary_encoder','dark',(44,-207,78),10.8,5);cyl('rotary_encoder','rubber',(44,-210.2,78),9.9,5);cyl('rotary_encoder','face',(44,-212.4,78),8.8,.6)
line('rotary_encoder','ink',[(44,-212.73,86.1),(44,-212.73,83.6)],.55)
action('rotary_encoder','adjustLimit','Cycle the active compliance limit',(44,-211,78),(22,22,8))
box('output_key','blue',(76,-207.5,85),(14,3,7),1.3);text('output_key','white',(76,-209.2,84),'ON/OFF',2.4);text(F,'ink',(76,-206.85,91),'OUTPUT',2.8)
action('output_key','output','Enable output / run sweep; press again to disable',(76,-207.5,85),(17,11,5))
for j,name in enumerate(['LAN','TSP','LOCK']):text(F,'ink',(96,-206.85,91-j*4),name,2)
for xx,zz,id,col,lab in [(67,61,'sense_hi','red','SENSE HI'),(88,61,'force_hi','red','FORCE HI'),(67,42,'sense_lo','black','SENSE LO'),(88,42,'force_lo','black','FORCE LO'),(88,22,'earth','green','CHASSIS')]:
 g='jack_'+id;cyl(g,'dark',(xx,-206.9,zz),7,1.6);cyl(g,col,(xx,-208.3,zz),6.2,2);cyl(g,'chrome',(xx,-209.5,zz),4.1,.6);cyl(g,'black',(xx,-210,zz),2.7,.8);text(F,'ink',(xx,-206.85,zz+7.5),lab,2.45)
 if id!='earth':action(g,'senseLeads' if 'sense' in id else 'load',lab+' lead pair',(xx,-208,zz),(14,14,7))
cyl('sense_mode','rubber',(67,-207.6,22),3.7,2);text(F,'ink',(67,-206.85,16),'TERMINALS',2.2)
# Selector on physical instrument chooses front/rear, not local vs remote. Front bank fixed in this reconstruction.
# Rear looking along -Y; positive X appears left in the rear elevation.
box(R,'face',(0,195,55),(211,4,83),1.5)
for j,(x,lab) in enumerate([(84,'SENSE HI'),(62,'FORCE HI'),(40,'SENSE LO'),(18,'FORCE LO')]):
 cyl(R,'chrome',(x,200,60),7.5,7);cyl(R,'dark',(x,204.1,60),5.2,1);cyl(R,'chrome',(x,204.8,60),2.4,.8);text(R,'ink',(x,197.15,48),lab,2.4,'rear')
for x in range(-61,35,5):
 for z in [76,81,86]:cyl(R,'black',(x,197.3,z),1.55,.5,n=8)
for x in range(-52,16,5):cyl(R,'black',(x,197.4,48),1.5,.6,n=8)
box(R,'rubber',(-83,200,55),(31,6,36),1.6);box(R,'black',(-83,204,49),(22,2,15),2)
for dx,dz in [(-6,0),(6,0),(0,4)]:box(R,'chrome',(-83+dx,205.5,48+dz),(1.2,2.8,3))
box(R,'black',(-82,204,66),(17,1.5,7),1);box(R,'black',(-52,199,62),(11,4,6),.6);text(R,'ink',(-52,197.2,69),'INTERLOCK',2.3,'rear')
for x,lab,w in [(88,'LAN',13),(68,'USB B',10),(44,'DIGITAL I/O',18),(18,'TSP-LINK',14),(2,'TSP-LINK',14),(-70,'IEEE-488',41)]:
 box(R,'chrome',(x,198.4,28),(w+2,3,10),.7);box(R,'black',(x,200.2,28),(w,1.3,7),.7);text(R,'ink',(x,197.2,19),lab,2.2,'rear')
 if 'IEEE' in lab or 'DIGITAL' in lab:
  for i in range(int(w//3)):cyl(R,'gold',(x-w/2+2+i*2.9,201,28),.45,1,n=6)
# Original generic two-contact DUT carrier, not a Keithley accessory. Measured contact IDs preserved in output.
box('coupon','pcb',(148,-237,2.5),(54,37,5),2)
for x,lab in [(132,'HI'),(164,'LO')]:
 cyl('coupon','copper',(x,-238,5.4),5,.8,'Z');text('coupon','white',(x,-249,5.2),lab,3.4,'top')
box('coupon','face',(148,-238,6.6),(16,4,3),1)
for x in [144,147,151,154]:box('coupon','dark',(x,-238,8.2),(1,4,.2))
for i,(x,z,g,m,tx,spread) in enumerate([(88,61,'force_hi_lead','red',132,-8),(88,42,'force_lo_lead','black',164,6),(67,61,'sense_hi_lead','senseRed',132,-3),(67,42,'sense_lo_lead','senseBlack',164,1)]):
 cyl(g,m,(x,-215,z),3.2,10)
 line(g,m,[(x,-218,z),(x,-229-i*3,z-5),(x+14,-247-i*5,13),(tx-8,-249-i*4,9),(tx+spread*.22,-238+spread*.45,6.6)],1.05 if 'sense' in g else 1.6,5)
# Consolidate non-moving subcomponents by group; preserve stable control names, actions and anchor locations.
for g,parts in G.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.view_layer.objects.active;o.name=g
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if g in meta:
  anchor=meta[g]['anchorM'];c=Vector((anchor[0],-anchor[2],anchor[1]))
  for vert in o.data.vertices:vert.co-=c
  o.location=c
  for k,value in meta[g].items():o[k]=value
bpy.ops.export_scene.gltf(filepath=str(D/'keithley-2450.glb'),export_format='GLB',export_extras=True,export_yup=True,export_texcoords=False,export_tangents=False,export_normals=True)
import sys
sys.path.insert(0,str(D));from pack import pack
pack(D/'keithley-2450.glb')
raw=(D/'keithley-2450.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);pr=[p for m in g['meshes'] for p in m['primitives']]
data={'deviceId':'09-03','uri':'keithley-2450.glb','scale':'m','axes':'+X operator right, +Y up, +Z front','envelopeReferenceMm':[255.3,106.1,425.4],'actions':meta,'nodes':len(g['nodes']),'drawCalls':len(pr),'triangles':sum(g['accessors'][p['indices']]['count']//3 for p in pr),'bytes':len(raw),'headsetTested':False}
(D/'interactions.json').write_text(json.dumps(data,indent=2)+'\n')
