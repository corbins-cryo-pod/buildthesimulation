"""Original Gamry Reference 600+ procedural model, authored in mm. Run Blender 4+: blender -b -t 3 -P model.py."""
import bpy, math, json, pathlib, struct
from mathutils import Vector
from collections import defaultdict
D=pathlib.Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
def v(p):return [q*.001 for q in p]
defs={'shell':('#9c9990',.29),'rubber':('#303437',.08),'dark':('#20262b',.08),'face':('#d8d8d2',.1),'chrome':('#91999d',.65),'black':('#080d10',.02),'red':('#bd2236',.08),'green':('#3b986a',.08),'teal':('#117990',.12),'blue':('#204b68',.09),'white':('#eff0e7',.08),'copper':('#b5784e',.55),'gold':('#bda36a',.5),'pcb':('#244944',.1),'screen':('#081919',.02),'ink':('#202b35',.02),'lime':('#65d486',.02),'cyan':('#66c6d3',.02),'senseRed':('#d47d7b',.08),'senseBlack':('#63727d',.1)}
M={}
defs.update({'brass':('#bf9850',.47),'cream':('#e8d8ac',.18),'navy':('#244366',.12),'orange':('#b75e32',.15),'mask':('#294b55',.15),'vent':('#161b22',.15),'aluminium':('#aeb5ba',.55)})
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
B='housing'
# Frame in upright bench orientation, same as manual cover and pp. 52/55.
box(B,'aluminium',(0,0,96),(84,251,170),2.5)
for y in [-122,122]:box(B,'rubber',(0,y,96),(90,22,188),3.5)
for x in [-29,29]:
 for y in [-119,119]:box(B,'dark',(x,y,3),(16,18,6),2)
for x in [-42.4,42.4]:
 for z in [22,87,171]:box(B,'ash' if 'ash' in M else 'shell',(x,0,z),(1,229,1.5),.35)
for y in [-132.7,132.7]:box(B,'brass',(0,y,96),(77,2.2,169),1.0)
# Custom color blocks are geometry, not a copy of the manufacturer photograph.
F='front_inscriptions'
box(F,'cream',(0,-134,150),(75,.4,56),.5)
text(F,'navy',(0,-134.28,165),'GAMRY',13)
text(F,'navy',(0,-134.29,158),'I N S T R U M E N T S',3.4)
text(F,'ink',(-8,-134.29,149),'Reference',6.6)
text(F,'red',(23,-134.29,149),'600+',6.3)
text(F,'ink',(0,-134.29,142),'Potentiostat / Galvanostat / ZRA',3.0)
for g,x,z,col,lab in [('led_cell',26,113,'lime','Cell On'),('led_overload',26,103,'orange','Overload'),('led_power',-23,31,'blue','Power'),('led_usb',-23,22,'teal','USB')]:
 cyl(g,'chrome',(x,-134, z),2.7,1.3,n=12);cyl(g,col,(x,-135.05,z),1.5,1.4,n=12)
 text(F,'ink',(x-11 if x>0 else x+9,-134.13,z-1),lab,3.1)
P='front_db25'
def db(g,x,y,z,vertical=True,large=True):
 wd,ht=(11,48) if large else (10,29)
 box(g,'chrome',(x,y,z),(wd,2.3,ht),2)
 box(g,'black',(x,y+(.9 if y>0 else -.9),z),(wd-2.4,.8,ht-8),1.5)
 front=y<0
 for row in [0,1]:
  for k in range((13 if large else 8)-row):
   cyl(g,'gold',(x+(row-.5)*2.4,y+(1.4 if not front else -1.4),z-13.8+k*2.25+row*1.12 if large else z-7+k*2.1+row),.47,1,n=8)
 for q in [-1,1]:cyl(g,'chrome',(x,y+(1.2 if y>0 else -1.2),z+q*(ht/2-2.2)),1.4,1.1,n=10)
db(P,26,-134,70)
text(F,'ink',(5,-134.2,71),'Cell Cable',3.4)
action(P,'cable','Unplug or reconnect the cell cable',(26,-134,70),(14,12,50))
# Rear panel as seen from behind. Opposite handedness compared to front.
R='rear_io'
for x0 in [-18,18]:
 cyl(R,'rubber',(x0,134.3,137),17.9,1.4,n=24)
 for a in range(6):
  th=(a+.5)*math.tau/6
  line(R,'dark',[(x0,135.2,137),(x0+6*math.cos(th),135.2,137+6*math.sin(th)),(x0+14*math.cos(th+.52),135.2,137+14*math.sin(th+.52))],2.1)
 for r in [8,13.5,16.4]:
  pts=[(x0+r*math.cos(i*math.tau/24),135.7,137+r*math.sin(i*math.tau/24)) for i in range(25)];line(R,'chrome',pts,.42,2)
 for q in [-1,1]:line(R,'chrome',[(x0-12,136,137-12*q),(x0,136,137),(x0+12,136,137+12*q)],.48)
for x,z,l in [(27,101,'I Monitor'),(27,80,'E Monitor'),(1,109,'Aux In'),(1,89,'Sig Gen Out'),(1,67,'Ext Sig In'),(-24,100,'Chassis Ground')]:
 cyl(R,'chrome',(x,134.9,z),4.3,3.2,n=16);cyl(R,'black',(x,137,z),2.2,1,n=16);text(R,'ink',(x,134.05,z-8),l,2.6,'rear')
box(R,'blue',(20,134.05,171),(27,.4,11),.5);text(R,'white',(20,134.27,169),'CAUTION  •  SERVICE',2.15,'rear')
for x,z,w,h,l in [(1,172,7,9,'T/C'),(-24,172,11,9,'USB'),(-24,64,13,9,'24 V DC')]:
 box(R,'chrome',(x,134.4,z),(w+1.3,1.4,h+1.2),.4);box(R,'black',(x,135.3,z),(w,.7,h),.45);text(R,'ink',(x,134.06,z-8),l,2.45,'rear')
db(R,0,134,39,large=False)
text(R,'ink',(8,134.12,27),'Misc. I/O',2.2,'rear')
box('rear_power','black',(-24,134.8,34),(12,2,17),1);box('rear_rocker','rubber',(-24,136,34),(9,2,14),.65)
text(R,'ink',(-24,134.05,22),'Power',2.5,'rear')
action('rear_power','power','Switch DC power at the rear rocker',(-24,136,34),(14,8,20))
action('rear_rocker','power','Pivoting rear DC rocker',(-24,136,34),(10,5,15))
# Standard cable family geometry; its exact overmold and routing are inferred. Internal conductors are not depicted.
box('plug','dark',(26,-144,69),(16,18,52),3)
for z in [47,90]:cyl('plug','chrome',(26,-154,z),2.1,6,n=10)
action('plug','cable','DB25 plug',(26,-145,69),(20,21,56))
line('trunk','dark',[(26,-155,69),(26,-181,61),(6,-201,21),(40,-264,11),(160,-325,10),(226,-248,10),(177,-189,15),(121,-221,19),(134,-262,17)],3.4,5)
box('splitter','rubber',(134,-263,17),(12,23,8),2)
# Original independent all-electronic board; shape/lead travel not calibrated against a commercial accessory.
box('dummy_cell','mask',(158,-308,7),(103,52,12),3)
box('dummy_cell','aluminium',(158,-309,13.1),(96,43,1.4),1)
text('dummy_cell','ink',(158,-324,14),'PASSIVE  /  RC CALIBRATION',4,'top')
for i,(x,k,color) in enumerate([(120,'WE','green'),(143,'WS','blue'),(169,'RE','white'),(194,'CE','red')]):
 z=15;y=-295
 g='port_'+k;cyl(g,color,(x,y,z),5.8,2.4,'Z',16);cyl(g,'black',(x,y,z+1.7),2.2,1,'Z',14)
 text('dummy_cell','ink',(x,-310,14),k,4.1,'top')
 action(g,'lead:'+k,k+' dummy-cell terminal',(x,y,z),(13,13,9))
 p='lead_'+k;cyl(p,color,(x,y,z+4),3.3,6,'Z',14)
 line(p,color,[(134,-267,17),(137+5*i,-278,20+i*.8),(x,-286,25),(x,y,z+6)],1.6,4)
 action(p,'lead:'+k,k+' removable lead',(x,y,z+4),(11,12,16))
 # CE and RE land on RC-LO; WE and WS on RC-HI.
# Parked intentionally open: Counter Sense (orange) and floating ground (black).
for i,col in enumerate(['orange','black']):
 line('parked',col,[(135,-266,17),(182+9*i,-274,7),(201+11*i,-280,3)],1.38,4)
 cyl('parked',col,(201+11*i,-285,3),2.4,10,n=12)
box('splitter','black',(134,-267,17),(11,19,7),2)
# Join by function while preserving identity, pivots and hit geometry. 
for g,parts in G.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.view_layer.objects.active;o.name=g
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if g in meta:
  anchor=meta[g]['anchorM'];center=Vector((anchor[0],-anchor[2],anchor[1]))
  for vert in o.data.vertices:vert.co-=center
  o.location=center
  for k,value in meta[g].items():o[k]=value
bpy.ops.export_scene.gltf(filepath=str(D/'reference-600-plus.glb'),export_format='GLB',export_extras=True,export_yup=True,export_texcoords=False,export_tangents=False,export_normals=True)
import sys
sys.path.insert(0,str(D));from pack import pack
pack(D/'reference-600-plus.glb')
raw=(D/'reference-600-plus.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);pr=[p for m in g['meshes'] for p in m['primitives']]
data={'deviceId':'09-01','uri':'reference-600-plus.glb','scale':'m','axes':'+X operator right, +Y up, +Z front','envelopeNominalMm':[90,190,270],'desktopCompatibility':'WebGL with pointer, touch, keyboard equivalent controls','xr':'WebXR immersive-vr controller selection when runtime supports it; not HMD-verified','actions':meta,'nodes':len(g['nodes']),'drawCalls':len(pr),'triangles':sum(g['accessors'][p['indices']]['count']//3 for p in pr),'bytes':len(raw)}
(D/'interactions.json').write_text(json.dumps(data,indent=2)+'\n')
