"""Blender source for a Thermo Nicolet iS50 (no ABX/Raman; built-in diamond ATR).
blender -b -t 2 --python model.py. Millimeter input, output glTF meters.
Legacy guide printed pp. 10–11 and 27 anchor dimensions; sample arm details from GMU Fig.20.
Artwork, undocumented geometry, motion, display and routing are original approximations.
"""
from pathlib import Path
import bpy,math,json,struct
from mathutils import Vector
D=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.preferences.filepaths.save_version=0
# Model uses physical standing height z, Blender y is back (glTF becomes −Z).
def v(a):return tuple(x/1000 for x in a)
def mat(name,rgba,metal=0,rough=.44):
 m=bpy.data.materials.new(name);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgba,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 m.diffuse_color=(*rgba,1);return m
white=mat('Bright gray upper cover',(.76,.78,.79),.10)
mid=mat('Matte gray working platform',(.54,.57,.57),.13)
dark=mat('Graphite base',(.034,.042,.048),.12,.55)
black=mat('Black polymer and deck',(.014,.018,.023),.07,.65)
steel=mat('Brushed fittings',(.60,.65,.69),.65,.33)
silver=mat('Brushed pressure lever',(.44,.48,.51),.49,.28)
blue=mat('Ribbed blue fascia',(.041,.19,.36),.13)
orange=mat('Scientific orange indicator',(.86,.16,.027),.03)
teal=mat('ATR active LED',(.055,.54,.65),.12,.24)
crystal=mat('Diamond approximation',(.55,.73,.76),.34,.20)
wafer=mat('Passive polymer coupon',(.83,.75,.59),.04)
glass=mat('Illustrative display',(.019,.075,.096),.17)
def keep(a,k,m,parent=None):
 a.name=k;a.data.materials.append(m)
 if parent:a.parent=parent
 return a
def empty(k,pos,parent=None):
 a=bpy.data.objects.new(k,None);bpy.context.collection.objects.link(a);a.location=v(pos);a.parent=parent;return a
def cube(k,pos,d,m,parent=None,r=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=v(pos));a=keep(bpy.context.object,k,m,parent);a.scale=v(d)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  mod=a.modifiers.new('Molded bevel','BEVEL');mod.width=r/1000;mod.segments=3;mod.limit_method='ANGLE'
  bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=a.modifiers.new('Weighted smoothing','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return a
def cyl(k,a,b,r,m,parent=None,n=24,r2=None):
 a,b=Vector(v(a)),Vector(v(b));delta=b-a
 bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r/1000,radius2=(r if r2 is None else r2)/1000,depth=delta.length,location=(a+b)/2)
 o=keep(bpy.context.object,k,m,parent);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
def text(k,body,pos,size,m,parent=None,face='front'):
 c=bpy.data.curves.new(k,type='FONT');c.body=body;c.size=size/1000;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=3;c.extrude=.00004
 a=bpy.data.objects.new(k,c);bpy.context.collection.objects.link(a);a.parent=parent;a.location=v(pos)
 if face=='front':a.rotation_euler[0]=math.pi/2
 elif face=='rear':a.rotation_euler=(math.pi/2,0,math.pi)
 a.data.materials.append(m);bpy.context.view_layer.objects.active=a;a.select_set(True);bpy.ops.object.convert(target='MESH');a.select_set(False)
# Width 603.123 mm and depth 736.4984 mm in drawing; select its 296.3862 mm cover datum.
body=empty('chassis',(0,0,0))
cube('molded_base',(0,0,51),(603.123,736.4984,68),dark,body,21)
cube('rear_main_cover',(0,146,187),(602,444.49,218.7724),white,body,24)
cube('left_hood',(-211,-215,178),(179,301,204),white,body,22)
cube('right_hood',(212,-211,165),(177,310,173),white,body,21)
cube('side_atr_riser',(202,-108,249),(153,115,38),white,body,9)
for x in (-246,246):
 for y in (-294,294):
  cyl('rubber_foot',(x,y,0),(x,y,25),29,black,body)
cube('recessed_sample_bay',(0,-155,87),(206.248,252.476,12),black,body,7)
for x in (-108,108):
 cube('inner_bay_side',(x,-154,146),(12,250,109),mid,body,4)
 cyl('bay_optics_port',(x-3,-82,155),(x+3,-82,155),26,dark,body)
cube('inner_bay_back',(0,-39,146),(209,14,109),dark,body,4)
for j in range(5):
 cube('right_ribbed_insert',(277,-359,128+j*21),(41,12,20),blue,body,6)
for y in (-115,9):
 cyl('side_external_beam_port',(-300,y,143),(-303,y,143),40,black,body)
 cyl('port_inner_cap',(-303.1,y,143),(-304,y,143),30,steel,body)
# No ABX; recessed flat beamsplitter service hatch is shown stationary.
cube('top_service_hatch',(0,145,293),(260,106,6),mid,body,3)
cube('desiccant_access',(-198,215,296),(44,35,5),dark,body,5)
text('left_badge','THERMO  /  SCIENTIFIC',(-214,-365.9,179),10,orange,body)
text('right_badge','Nicolet iS50 FT-IR',(222,-367.9,160),8.7,blue,body)
lid=empty('sample_lid_hinge',(0,-43,252))
cube('lid_shell',(0,-151,-63),(217,325,126),white,lid,20)
cube('lid_handle',(0,-318,-69),(95,24,15),mid,lid,6)
cube('lid_blue_accent',(0,-314,-77),(122,6,5),blue,lid,1)
key=empty('power_switch',(-250,240,284));cyl('power_rocker',(0,0,0),(0,0,7),15,black,key)
for x in (-33,-57):cyl('system_status_led',(x,242,294),(x,242,296),4,teal,body)
deck=empty('atr_deck',(196,-216,255))
cube('atr_plate',(0,0,0),(141,132,10),black,deck,6)
cyl('diamond_plate',(-19,-9,5),(-19,-9,9),28,steel,deck,48)
cyl('diamond_crystal',(-19,-9,8.9),(-19,-9,9.5),4.4,crystal,deck,32)
text('atr_engraving','iS50 ATR',(-15,44,5.05),11,white,deck,'up')
touch=empty('atr_touch',(208,-299,253));cyl('touchpoint_ring',(0,0,0),(0,0,5),13,steel,touch,32);cyl('touchpoint_lamp',(0,0,5),(0,0,5.6),10,teal,touch,32)
# Once engaged, the normal tip location is centered over the plate. Raise shell assembly by +8 mm.
ram=empty('atr_pressure_arm',(196,-216,0))
cyl('pressure_base',(38,39,259),(38,39,292),15,steel,ram,36)
cube('pressure_cross_link',(10,14,307),(76,19,21),silver,ram,5)
cube('pressure_link_nose',(-16,-7,307),(19,38,18),silver,ram,5)
cyl('main_pressure_stem',(38,39,283),(38,39,337),10,silver,ram,32)
cyl('ribbed_thumbhead',(38,39,336),(38,39,355.855),23.5,steel,ram,48)
cyl('thumbhead_end',(38,39,354),(38,39,355.855),23.5,black,ram,48)
for i in range(24):
 a=i*math.pi/12;x=38+22.6*math.cos(a);y=39+22.6*math.sin(a)
 cyl('knob_scoring',(x,y,337),(x,y,354),.8,dark,ram,6)
cyl('foot_thread',(-19,-9,275),(-19,-9,303),5,steel,ram,24)
cyl('contact_foot',(-19,-9,265.4),(-19,-9,278),2.8,silver,ram,20,4)
sample=empty('polymer_coupon',(177,-225,0));cube('film_coupon',(0,0,265),(24,15,1.8),wafer,sample,1.2)
# Ports ordered left to right per rear figure. Part types/spacing approximated.
rear=empty('rear_io',(0,0,0))
cube('electronics_module',(17,365.5,154),(372,4,91),black,rear,3)
for x,w,k in [(-133,65,'AUX'),(-48,37,'LEFT'),(10,37,'RIGHT'),(67,17,'USB')]:
 cube('connector_'+k,(x,368.8,165),(w,2,15),steel,rear,2)
 cube('recess_'+k,(x,370,165),(w-7,2.5,10),dark,rear,1)
 text('label_'+k,k,(x,371.3,147),6.1,white,rear,'rear')
cyl('dc_power',(112,368,166),(112,372,166),9,steel,rear)
text('label_DC','DC POWER',(112,373,147),5.7,white,rear,'rear')
for x in range(-153,157,14):
 for z in (119,129,137):cyl('vent',(x,368.1,z),(x,368.8,z),2.3,mid,rear,8)
host=empty('host_display',(-550,-78,0))
cube('stand_base',(0,41,13),(228,135,21),dark,host,5)
cube('stand_mast',(0,77,158),(42,38,287),dark,host,4)
cube('display_frame',(0,35,316),(347,34,219),dark,host,6)
cube('display_screen',(0,16,317),(328,3,198),glass,host,1)
# Collapse repeated pieces with common material within each assembly into single mesh per material.
for root in (body,lid,key,deck,touch,ram,sample,rear,host):
 pool={}
 for o in list(root.children):
  if o.type=='MESH' and o.name!='molded_base':pool.setdefault(o.data.materials[0].name,[]).append(o)
 for m,objects in pool.items():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=root.name+'_'+m
# Store moving parts in documented reference poses: lid closed, ATR screw raised; runtime uses identical local axes.
ram.location.z=.008
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(D/'nicolet-is50.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(D/'nicolet-is50.glb'),export_format='GLB',export_yup=True,export_apply=True,export_cameras=False,export_lights=False)
g=(D/'nicolet-is50.glb').read_bytes();size=struct.unpack_from('<I',g,12)[0];j=json.loads(g[20:20+size]);tri=0;draw=0
for m in j['meshes']:
 for p in m['primitives']:
  count=j['accessors'][p.get('indices',p['attributes']['POSITION'])]['count'];tri+=count//3;draw+=1
manifest={'device':'05-11','units':'m','up':'+Y','operatorFront':'+Z','baseEnvelopeWHDm':[.603123,.2963862,.7364984],
 'dimensionSource':'Legacy iS50 user guide pp.10–11; distributor-facing datasheet dimensions differ.',
 'articulation':{'sample_lid_hinge':{'axis':'X','travelRad':[0,-1.32],'inferred':True},'atr_pressure_arm':{'axis':'Y','travelM':[0,.008],'inferred':True}},
 'interactions':{'sample_lid_hinge':{'action':'lid','label':'Open sample compartment'},'power_switch':{'action':'power','label':'Instrument power'},'atr_pressure_arm':{'action':'clamp','label':'Seat or lift the pressure foot'},'atr_deck':{'action':'load','label':'ATR sampling plate'},'atr_touch':{'action':'acquire','label':'ATR Touch Point: acquire'}},
 'geometry':{'nodes':len(j['nodes']),'triangles':tri,'drawPrimitives':draw,'bytes':len(g)},'physicalHeadsetTested':False}
(D/'xr-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(manifest['geometry'])
