"""Original true-scale GT-K exterior, in mm. Run Blender 4+: blender -b -t 3 -P model.py."""
import bpy, math, json, pathlib, struct
from mathutils import Vector
from collections import defaultdict
D=pathlib.Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
def v(p):return [q*.001 for q in p]
defs={'shell':('#9c9990',.29),'rubber':('#303437',.08),'dark':('#20262b',.08),'face':('#d8d8d2',.1),'chrome':('#91999d',.65),'black':('#080d10',.02),'red':('#bd2236',.08),'green':('#3b986a',.08),'teal':('#117990',.12),'blue':('#204b68',.09),'white':('#eff0e7',.08),'copper':('#b5784e',.55),'gold':('#bda36a',.5),'pcb':('#244944',.1),'screen':('#081919',.02),'ink':('#202b35',.02),'lime':('#65d486',.02),'cyan':('#66c6d3',.02),'senseRed':('#d47d7b',.08),'senseBlack':('#63727d',.1)}
M={}
defs.update({'enamel':('#e8e5db',.16),'powder':('#334b62',.08),'lightPowder':('#45627a',.08),'board':('#b5c3c9',.74),'yellow':('#e3b738',.05),'granite':('#252c33',.18),'cyanGlass':('#86bde5',.3)})
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
def loft(g,m,rings,bev=4):
 verts=[];faces=[]
 for k,(z,w,d,c,xc,yc) in enumerate(rings):
  a=w/2;b=d/2
  verts+=list(map(v,[(xc+x,yc+y,z) for x,y in [(-a+c,-b),(a-c,-b),(a,-b+c),(a,b-c),(a-c,b),(-a+c,b),(-a,b-c),(-a,-b+c)]]))
  if k:
   for j in range(8):faces.append(((k-1)*8+j,(k-1)*8+(j+1)%8,k*8+(j+1)%8,k*8+j))
 faces.append(tuple(range(7,-1,-1)));faces.append(tuple(range(len(verts)-8,len(verts))))
 mesh=bpy.data.meshes.new(g);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(g,mesh);bpy.context.collection.objects.link(o)
 if bev:
  bpy.context.view_layer.objects.active=o;o.select_set(True);md=o.modifiers.new('beveled edges','BEVEL');md.width=bev*.001;md.segments=2;bpy.ops.object.modifier_apply(modifier=md.name)
 return add(o,g,m)
base='stand'
loft(base,'enamel',[(18,430,500,24,0,0),(23,478,534,38,0,0),(85,492,534,45,0,0),(133,448,475,46,0,18),(168,347,406,39,0,42)],5)
for x in [-184,184]:
 for y in [-210,210]:cyl(base,'dark',(x,y,9),18,18,'Z',20)
loft(base,'powder',[(119,357,298,33,0,-27),(149,351,293,29,0,-27),(181,308,250,25,0,-27)],5)
loft(base,'enamel',[(130,374,210,42,0,145),(218,337,208,40,0,139),(488,282,180,34,0,130),(580,257,136,28,0,125)],6)
box(base,'rubber',(0,44,350),(171,42,379),15)
for x in [-52,52]:box(base,'chrome',(x,19,331),(12,10,243),4)
box(base,'lightPowder',(0,-8,431),(196,52,104),10)
head='z_head'
loft(head,'powder',[(394,230,231,37,0,-56),(435,287,280,32,0,-76),(612,296,284,34,0,-76),(715,229,229,29,0,-61),(754,193,195,27,0,-53)],8)
loft(head,'lightPowder',[(514,289,281,33,0,-77),(599,293,283,32,0,-76),(610,294,283,32,0,-76)],2)
box(head,'chrome',(0,-74,390),(176,186,23),11)
box('head_label','enamel',(58,-217,467),(83,1.4,31),3);text('head_label','ink',(58,-218,467),'BRUKER',10);text('head_label','ink',(58,-218,457),'ContourGT-K',6.7)
g='turret';cyl(g,'granite',(0,-86,374),92,28,'Z',32);cyl(g,'rubber',(0,-86,356),82,14,'Z',32)
for x,y,d,he,k in [(0,-141,26,76,'5×'),(0,-31,23,65,'20×')]:
 cyl(g,'chrome',(x,y,346),29,9,'Z',24);cyl(g,'dark',(x,y,341-he/2),d,he,'Z',32);cyl(g,'chrome',(x,y,342-he/3),d+.7,6,'Z',24);cyl(g,'gold' if k=='5×' else 'blue',(x,y,333-he*.70),d+.25,4,'Z',24);cyl(g,'cyanGlass',(x,y,340-he),d*.60,3,'Z',24)
 text(g,'white',(x,y-d-1,318),k,9)
action(g,'objective','Rotate the turret between 5× and 20×',(0,-86,357),(192,112,188))
s='stage'
box(base,'rubber',(0,-101,189),(258,230,18),7)
for x in [-77,77]:box(base,'chrome',(x,-108,201),(13,237,11),4)
box(s,'dark',(0,-130,223),(241,197,36),8);box(s,'powder',(0,-144,246),(228,185,13),4)
for x in [-90,90]:
 for y in [-202,-76]:cyl(s,'chrome',(x,y,254),9,3,'Z',12)
for i in range(5):box(s,'rubber',(0,-202+i*15,253),(177,1.6,2.4),.4)
box(s,'rubber',(0,-235,228),(106,27,17),5)
action(s,'stage','Translate sample stage between load and metrology',(0,-145,235),(249,56,225))
cube='coupon';box(cube,'board',(0,-144,256.5),(75,61,7),2);box(cube,'chrome',(18,-144,260.2),(35,58,.7),.4);text(cube,'ink',(0,-174,260.1),'STEP  /  S05',4.3,'top')
action(cube,'load','Place or remove inert calibration coupon',(0,-144,257),(80,20,65))
box(base,'blue',(-133,-263.5,52),(91,2,24),3);text(base,'white',(-133,-265,49),'ContourGT-K',9)
for z in [170,184,198,212,226,240]:
 for x in range(-104,111,14):box(base,'dark',(x,245,z),(9,1.5,3))
box(base,'powder',(0,247,156),(194,3,39),5)
for x,z,w,lab in [(-52,152,23,'I/O'),(0,152,21,'USB'),(47,152,30,'POWER')]:
 box(base,'dark',(x,249.5,z),(w,4,13),2);text(base,'white',(x,250,162),lab,6,'rear')
ctl='stage_controller';box(ctl,'rubber',(314,-148,19),(139,120,36),9);box(ctl,'powder',(314,-152,37),(129,106,7),4)
cyl(ctl,'dark',(286,-170,57),12,33,'Z',20);cyl(ctl,'dark',(286,-170,75),20,12,'Z',20)
cyl(ctl,'yellow',(343,-105,43),15,8,'Z',24);cyl(ctl,'red',(343,-105,52),13,10,'Z',24)
text(ctl,'white',(317,-190,41),'XY  CONTROL',7,'top')
host='monitor';box(host,'rubber',(-574,-33,229),(122,110,17),6);box(host,'rubber',(-574,-8,306),(39,30,149),7)
box(host,'dark',(-574,-25,459),(473,43,292),10);box(host,'black',(-574,-47,459),(458,4,275),3)
box('monitor_lcd','screen',(-574,-50,461),(447,2,264),2)
text('monitor_art','cyan',(-574,-51.3,477),'SURFACE  /  METROLOGY',21);text('monitor_art','white',(-574,-51.3,435),'V S I  ·  V I R T U A L   B E N C H',10)
box(host,'rubber',(-569,-165,219),(349,133,17),5)
for j in range(5):
 for x in range(-715,-416,23):box(host,'dark',(x,-205+j*17,230),(16,14,5),.7)
for g,parts in G.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.view_layer.objects.active;o.name=g
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if g in meta:
  a=meta[g]['anchorM'];ctr=Vector((a[0],-a[2],a[1]))
  for vert in o.data.vertices:vert.co-=ctr
  o.location=ctr
  for k,value in meta[g].items():o[k]=value
bpy.ops.export_scene.gltf(filepath=str(D/'contour-gt-k.glb'),export_format='GLB',export_extras=True,export_yup=True,export_texcoords=False,export_tangents=False,export_normals=True)
import sys
sys.path.insert(0,str(D));from pack import pack
pack(D/'contour-gt-k.glb')
raw=(D/'contour-gt-k.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);pr=[p for m in g['meshes'] for p in m['primitives']]
(D/'interactions.json').write_text(json.dumps({'deviceId':'05-02','uri':'contour-gt-k.glb','scale':'m','axes':'+X operator right, +Y up, +Z front','envelopeMm':[492,754,534],'actions':meta,'motion':{'stageTravelZMeter':.08,'turretTravelDeg':180,'testCouponScale':'true-scale carrier; mesoscopic step face is schematic'},'headsetTested':False,'nodes':len(g['nodes']),'drawCalls':len(pr),'triangles':sum(g['accessors'][p['indices']]['count']//3 for p in pr),'bytes':len(raw)},indent=2)+'\n')
