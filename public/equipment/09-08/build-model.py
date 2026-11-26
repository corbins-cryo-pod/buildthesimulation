"""Editable N5247B Option 201 rack / example passive DUT. Blender 4.x. Source millimetres; glTF metres. See device evidence sheet. Functional IDs remain stable."""
import bpy, math, os, sys
from mathutils import Vector
from math import pi
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,rgb,metal=.0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.35
 return m
def empty(n,xyz=(0,0,0),parent=None):
 o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=[q/1000 for q in xyz];return o
def finish(o,n,xyz,mat,par):
 o.name=n;o.parent=par;o.location=[q/1000 for q in xyz];o.data.materials.append(mat);return o
def box(n,xyz,size,mat,par=None,bev=0):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object
 for v in o.data.vertices:
  for i in range(3):v.co[i]*=size[i]/1000
 if bev:
  mod=o.modifiers.new('Manufacturing edge radius','BEVEL');mod.width=bev/1000;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,n,xyz,mat,par)
def cyl(n,xyz,rad,length,mat,par=None,axis='y',segments=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=segments,radius=rad/1000,depth=length/1000)
 o=finish(bpy.context.object,n,xyz,mat,par);o.rotation_euler=({'x':(0,pi/2,0),'y':(pi/2,0,0),'z':(0,0,0)})[axis];return o
def rod(n,a,b,r,m,par=None):
 a,b=Vector(a),Vector(b);v=b-a;mid=(a+b)/2
 o=cyl(n,mid,r,v.length,m,par,'z',12);o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def cable(n,coords,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_depth=r/1000;c.bevel_resolution=2;s=c.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for pt,xyz in zip(s.bezier_points,coords):
  pt.co=[v/1000 for v in xyz];pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def label(n,txt,x,y,z,size,mat,side='front',par=None):
 c=bpy.data.curves.new(n,'FONT');c.body=txt;c.align_x='CENTER';c.align_y='CENTER';c.size=size/1000;c.resolution_u=1
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.parent=par;o.location=(x/1000,y/1000,z/1000);o.rotation_euler=(pi/2,0,0) if side=='front' else ((pi/2,0,pi) if side=='back' else (0,0,0))
 o.data.materials.append(mat);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
shell=material('Cool silver case',(.44,.47,.48),.6);face=material('Graphite console',(.055,.061,.067),.18);keymat=material('Soft instrument keys',(.14,.15,.153));black=material('Black rubber',(.029,.032,.035));white=material('Silkscreen',(.88,.87,.81));dark=material('Panel recess',(.012,.018,.019));gold=material('Plated jumper',(.63,.43,.15),.8);steel=material('Nickel coupler',(.63,.66,.68),.82);green=material('Active lamp',(.25,.82,.36));red=material('ID marker',(.68,.075,.09));screen=material('Display idle',(.026,.076,.082));yellow=material('Analytical trace',(.82,.75,.2));blue=material('Port 2 jacket',(.05,.13,.22))
base=empty('PNA_N5247B_201')
box('chassis_nominal',(0,0,146.95),(425.6,582.3,266.1),shell,base,2)
box('operator_face',(0,-290.7,147),(423,1,264),face,base,1)
for sign in (-1,1):
 x=sign*220.5;box('handle_'+('L' if sign<0 else 'R'),(x,-307.4,147),(17.7,29.2,264),black,base,7)
 for y in [-206,211]:box('base_foot',(sign*169,y,6.95),(42,48,13.9),black,base,2)
 for j in range(18):
  box('side_vent_'+str(sign)+'_'+str(j),(sign*212.96,15+j*10,177),(.45,4.7,117),dark,base,1)
for x in (-192,192):
 for z in (29,264):box('rear_guard',(x,309.375,z),(23,36.45,22),black,base,3)
for ix in range(4):
 for j in range(8):box('top_vent',(110+ix*11,81+j*10,280.12),(5,6,.3),dark,base,.6)
box('LCD_bezel',(-57,-293,177),(273,3.0,176),black,base,1.5)
box('LCD_surface',(-57,-295.3,177),(257,1.2,159),screen,base,.8)
# Unpowered reference graticule; live data overlay replaces this rectangular region in the viewer.
for i in range(11):box('graticule_x',(-184+i*25.4,-296.05,177),(.37,.18,157),keymat,base)
for i in range(7):box('graticule_y',(-57,-296.05,100+i*25.4),(255,.18,.38),keymat,base)
label('model_legend','KEYSIGHT   PNA-X   N5247B',-120,-291.65,272.3,4.4,white,'front',base)
label('freq_legend','10 MHz – 67 GHz',143,-291.65,272.3,3.7,white,'front',base)
def button(n,title,x,z,w=18,h=8,m=keymat):
 box(n,(x,-293.7,z),(w,4.4,h),m,base,1.5);label(n+'_silk',title,x,-296,z,2.3,white,'front',base)
for r,t in enumerate(['Channel','Trace','Measure','Format','Scale','Marker','Search','BW','Sweep','Trigger','Average','System']):button('panel_'+t,t,91+(r%2)*18.8,258-(r//2)*10,16.5,8)
cyl('entry_knob',(148,-297.5,240),14.5,11.2,black,base);cyl('knob_cap',(148,-303.3,240),9,.6,keymat,base)
for n,x,z in [('Up',182,253),('Down',182,226),('Left',170,239),('Right',194,239)]:button('navigation_'+n,n,x,z,8,7)
for i,t in enumerate(['7','8','9','G','4','5','6','M','1','2','3','k','0','.','−','x1']):button('num_'+str(i),t,136+(i%4)*17,212-(i//4)*12,14,9)
for i,t in enumerate(['Start','Stop','Center','Span','Cal','Preset','Single','Enter']):button({'Cal':'CAL_key','Preset':'PRESET_key','Single':'SWEEP_key'}.get(t,'soft_'+t),t,92+(i%4)*26,157-(i//4)*13,22,9,green if t=='Single' else keymat)
for i in range(4):box('front_USB_'+str(i+1),(92+i*30,-294,101),(15,4,6.2),black,base,1)
box('POWER_key',(-197,-294,101),(11,4,13),white,base,1.7);cyl('POWER_indicator',(-197,-296.5,101),3,.6,green,base)
# Two physical ports: 1 on the left / 2 on the right. Centre blank omits the 4-port pair.
for idx,x,d in [(1,-142,-1),(2,142,1)]:
 cyl('port_'+str(idx)+'_mount',(x,-295,55),16,7,steel,base);cyl('port_'+str(idx)+'_hex',(x,-301,55),10,8,gold,base,segments=6);cyl('port_'+str(idx)+'_nose',(x,-309.5,55),6.8,11,steel,base);cyl('port_'+str(idx)+'_bore',(x,-315.2,55),3.6,.6,black,base)
 label('port_number_'+str(idx),str(idx),x+19*(-d),-291.8,61.3,12,white,'front',base)
 cyl('port_'+str(idx)+'_source_LED',(x-18*d,-293,50),1.8,1.3,green,base)
 xx=x+d*40
 for k,(z,tt) in enumerate([(72,'CPLR  /  RCVR'),(52,'SRC  /  THRU'),(32,'REF  /  RCVR')]):
  for dx in [-12,12]:
   cyl('p'+str(idx)+'_loop'+str(k)+'_nut',(xx+dx,-293,z),4.1,4.7,gold,base,segments=6);cyl('jumper_lug',(xx+dx,-299,z),3.1,9,steel,base)
  cable('P'+str(idx)+'_access_loop_'+str(k+1),[(xx-12,-302,z),(xx-10,-306,z),(xx+10,-306,z),(xx+12,-302,z)],1.8,gold)
  label('access_id',tt,xx,-291.7,z+6,2.25,white,'front',base)
# Back side mapped to manufacturer's rear tour and CPU 9 insert: placements inferred.
for x in (-150,-70,12,90,167):
 for j in range(9):box('rear_air_slot',(x,291.5,231+j*3.5),(53,.55,1.9),dark,base)
box('CPU9_IO_plate',(0,292,166),(349,2.4,33),steel,base,1)
for n,x,z,w,h in [('GPIB',133,166,36,13),('DisplayPort',66,166,14,6),('USB3-B',45,166,8,7),('USB-C',27,166,8,4),('LAN_1G',3,166,15,11),('LAN_10G',-20,166,15,11),('NVMe_SSD',-107,166,114,18),('IEC_mains',-160,251,26,18)]:
 box(n,(x,294,z),(w,4,h),black,base,1);label(n+'_legend',n.replace('_',' '),x,293.6,z+h/2+4,2.6,dark,'back',base)
for j in range(4):box('USB3_A',(102+(j%2)*12,294,163+(j//2)*8),(9,4,4),dark,base)
for i,(n,x,z) in enumerate([('REF_10MHz_IN',172,244),('REF_10MHz_OUT',172,228),('TRIG_IN',-158,50),('TRIG_OUT',-136,50),('AUX1',-110,50),('AUX2',-89,50),('HANDLER1',-24,50),('HANDLER2',1,50),('BIAS1',96,50),('BIAS2',119,50),('LO_OUT',35,101),('RF_OUT',59,101)]):
 cyl(n+'_nut',(x,294,z),5.7,4,gold if i>=10 else steel,base,segments=6);cyl(n+'_barrel',(x,300,z),4.1,10,steel,base);cyl(n+'_socket',(x,305.2,z),2.3,.6,dark,base);label(n+'_legend',n,x,292,z+8,2.4,dark,'back',base)
for x in [-195,-102,0,102,195]:
 for z in [22,273]:
  for y in [-292,292]:cyl('case_fastener',(x,y,z),1.8,1.1,steel,base)
dut=empty('DUT_module',(0,-469,0));box('DUT_housing',(0,0,22),(66,34,34),shell,dut,2)
label('DUT_name','PASSIVE  2-PORT',0,0,39.25,5,black,'top',dut)
for sg in [-1,1]:
 for j,(x,r,l,m) in enumerate([(37,7,9,gold),(44,4,9,steel)]):cyl('dut_adapter_'+str(sg)+'_'+str(j),(sg*x,0,22),r,l,m,dut,'x',6 if j==0 else 18)
 cable('test_lead_'+str(sg),[(sg*142,-316,55),(sg*150,-380,23),(sg*131,-455,19),(sg*81,-469,22),(sg*48,-469,22)],3.3,black if sg<0 else blue)
 cyl('lead_coupler_'+str(sg),(sg*51,-469,22),6.3,10,steel,None,'x',6)
# Generator is the canonical editable model. Physical origin is bench base.
bpy.ops.export_scene.gltf(filepath=OUT+'/n5247b.glb',export_format='GLB',export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
if '--renders' in sys.argv:
 scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.53,.58,.63,1)
 scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False;scene.render.resolution_x=720;scene.render.resolution_y=420;scene.render.resolution_percentage=100
 for loc,p in [((-.71,-.85,.86),24),((.7,.6,.81),22)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=p;o.data.shape='DISK';o.data.size=.72;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 for n,pos,t,w in [('front',(.25,-1.3,.44),(0,-.02,.12),.93),('rear',(-.18,1.2,.36),(0,.035,.14),.77),('ports',(.20,-.70,.19),(.065,-.375,.052),.40)]:
  bpy.ops.object.camera_add(location=pos);o=bpy.context.object;o.data.type='ORTHO';o.data.ortho_scale=w;o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler();scene.camera=o;scene.render.filepath=OUT+'/'+n+'.png';bpy.ops.render.render(write_still=True)
