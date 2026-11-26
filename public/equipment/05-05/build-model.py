"""Filmetrics F40 / Olympus BX51M. Blender -b -t 1 -P build-model.py. Dimensioned host, inferred attachment and external unit. Units millimetres in helpers; actual glTF is metres, +Y up, +Z towards operator."""
import bpy,math,os
from mathutils import Vector
from pathlib import Path
bpy.ops.wm.read_factory_settings(use_empty=True)
out=Path(__file__).resolve().parent
s=bpy.context.scene;s.unit_settings.system='METRIC'
def m(n,rgb,metal=0):
 a=bpy.data.materials.new(n);a.diffuse_color=(*rgb,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=a.diffuse_color;p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.38;return a
def finish(n,mat):
 o=bpy.context.object;o.name=n;o.data.materials.append(mat);return o
def p(x):return tuple(v*.001 for v in x)
def b(n,pos,dim,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p(pos));o=finish(n,mat);o.dimensions=p(dim);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  q=o.modifiers.new('Fillet','BEVEL');q.width=bevel*.001;q.segments=3;q=o.modifiers.new('Normals','WEIGHTED_NORMAL')
 return o
def cyl(n,pos,diam,depth,mat,axis='Y'):
 rot={'X':(0,math.pi/2,0),'Y':(math.pi/2,0,0),'Z':(0,0,0)}[axis]
 bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=diam*.0005,depth=depth*.001,location=p(pos),rotation=rot);return finish(n,mat)
def tube(n,pts,diam,mat):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=8;c.bevel_resolution=2;c.bevel_depth=diam*.0005
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(pts)-1)
 for v,pt in zip(sp.bezier_points,pts):v.co=p(pt);v.handle_left_type=v.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,c);s.collection.objects.link(o);c.materials.append(mat);return o
def text(n,label,x,y,z,size,mat,back=False):
 c=bpy.data.curves.new(n,'FONT');c.body=label;c.size=size*.001;c.align_x='CENTER';c.align_y='CENTER';c.resolution_u=2;o=bpy.data.objects.new(n,c);s.collection.objects.link(o);o.location=p((x,y,z));o.rotation_euler=(math.pi/2,0,math.pi if back else 0);c.materials.append(mat);return o
iv=m('Olympus ivory enamel',(.74,.74,.65));line=m('Ivory edge',(.56,.57,.51));dk=m('Black anodized',(.032,.035,.039),.2);gr=m('Graphite',(.10,.11,.12));metal=m('Satin objective metal',(.53,.55,.55),.78);glass=m('Blue optical glass',(.035,.14,.19),.52);si=m('Silicon film coupon',(.19,.30,.42),.48);gold=m('Objective yellow band',(.94,.68,.032));red=m('Objective red band',(.67,.06,.045));white=m('Silkscreen',(.84,.86,.81));black=m('Cable black',(.021,.021,.022));fiber=m('Silica fiber jacket',(.12,.15,.16));pc=m('Monitor black',(.055,.065,.075));green=m('Signal indicator',(.12,.62,.30))
def prism(n,xy,z0,z1,mat):
 vv=[p((x,y,z)) for z in [z0,z1] for x,y in xy];N=len(xy);ff=[tuple(reversed(range(N))),tuple(range(N,N*2))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)];mesh=bpy.data.meshes.new(n);mesh.from_pydata(vv,[],ff);mesh.materials.append(mat);o=bpy.data.objects.new(n,mesh);s.collection.objects.link(o);return o
def rod(n,a,bp,diam,mat):
 d=Vector(p(bp))-Vector(p(a));mid=(Vector(p(bp))+Vector(p(a)))/2;bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=diam*.0005,depth=d.length,location=mid);o=finish(n,mat);o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return o
# Host base from Olympus dimension plate (BX51M side / front): 318 mm across, 341 mm front-to-rear.
base=[(-46,-70),(46,-70),(50,-59),(54,23),(140,37),(159,55),(159,231),(132,271),(-132,271),(-159,231),(-159,55),(-140,37),(-54,23),(-50,-59)]
prism('Host_base_318x341',base,0,19,iv);prism('Host_front_toe',[(-45,-69),(45,-69),(47,-61),(47,54),(-47,54),(-47,-61)],19,80,iv);b('Host_toe_top',(0,-1,80),(89,124,8),dk,4)
# Rigid bridge and reflected-light illuminator. Front of optical sample station at -Y in Blender.
b('Host_rear_column',(0,210,160),(175,90,297),iv,12);b('Host_column_flare',(0,194,61),(225,117,94),iv,14);b('Host_illuminator_bridge',(0,124,311),(165,271,68),iv,7)
b('Host_illum_side_lip',(0,130,348),(164,250,9),line,2);b('Host_lamp_neck',(0,268,321),(100,110,38),dk,3);b('Host_lamp_housing',(0,346,331),(120,108,88),dk,7)
for k in range(11):b('Lamp_cooling_'+str(k),(0,304+k*8,371),(112,2.7,5),gr)
for sign in [-1,1]:
 for k in range(10):b('Column_louvre_'+str(sign)+'_'+str(k),(sign*87.4,223,92+k*11),(.5,35,3),dk)
 b('Focus_arm_'+str(sign),(sign*66,82,110),(24,115,85),iv,9)
 cyl('Focus_coarse_'+str(sign),(sign*80,85,85),53,22,dk,'X');cyl('Focus_fine_'+str(sign),(sign*93,85,85),32,7,gr,'X')
 for k in range(12):
  ang=2*math.pi*k/12;y=85+25*math.cos(ang);z=85+25*math.sin(ang);b('Focus_rib_'+str(sign)+'_'+str(k),(sign*80,y,z),(17,2,2),gr,.5)
b('Stage_support',(0,92,143),(104,129,38),dk,5);b('Stage_Z_bracket',(0,106,180),(157,76,62),gr,5)
b('Stage_lower',(0,15,196),(243,172,16),dk,3);b('Stage_X_slide',(0,2,205),(258,172,6),gr,2);b('Stage_carrier',(0,0,208.5),(251,164,1),dk)
for x in [-80,80]:b('Stage_clamp_'+str(x),(x,0,210),(3,115,2),metal,1)
cyl('Stage_X_wheel',(-115,-22,174),22,37,dk,'Z');cyl('Stage_Y_wheel',(-115,-22,153),16,12,gr,'Z')
b('Specimen_slide',(0,0,209.4),(45,32,.8),glass,.2);b('Specimen_chip',(0,0,210.1),(10,10,.6),si,.05)
b('Microscope_head',(0,11,370),(151,131,64),iv,6);b('Head_rear_deck',(0,58,397),(147,62,23),line,4)
# Objective stand used by Caltech: 5X active under optical axis + 10X, 50X, 100X positions. 
cyl('Nosepiece_turret',(0,23,266),91,20,dk,'Z')
for nm,(x,y),length,r,col in [('5X',(0,0),37,15,red),('10X',(23,23),39,15,gold),('50X',(0,46),40,17,metal),('100X',(-23,23),41,16,metal)]:
 cyl('Objective_'+nm+'_shell',(x,y,256-length/2),r,length,metal,'Z');cyl('Objective_'+nm+'_band',(x,y,256-length*.62),r+1.3,3,col,'Z');cyl('Objective_'+nm+'_lens',(x,y,256-length),r*.48,1.2,glass,'Z')
b('Binocular_head',(0,-16,410),(134,86,43),iv,7)
for sign in [-1,1]:
 x=sign*33;rod('Ocular_tube_'+str(sign),(x,-28,411),(x,-115,465),31,dk);rod('Ocular_rim_'+str(sign),(x,-99,455),(x,-119,469),38,dk);rod('Ocular_glass_'+str(sign),(x,-116,467),(x,-120,470),26,glass)
# Model-specific F40 photoport on BX51M: long vertical black barrel with side camera and fiber at top.
cyl('Adapter_Cmount',(0,48,427),49,74,dk,'Z');cyl('Adapter_vertical_barrel',(0,48,505),37,130,dk,'Z');cyl('Adapter_ring',(0,48,566),34,10,gr,'Z');cyl('Fibre_plug_photoport',(0,48,579),12,18,metal,'Z')
rod('Side_camera_tube',(16,48,527),(76,48,527),24,dk);cyl('Side_camera_body',(92,48,527),44,30,gr,'X');text('Camera_label','F40',0,29,520,10,white)
# External spectrometer enclosure: size and connector locations inferred from KNI station photograph.
b('Receiver_enclosure',(-276,35,51),(187,194,98),iv,5);b('Receiver_front',(-276,-63,52),(177,3,80),dk,2);text('Receiver_id','FILMETRICS',-300,-65,76,10,white);text('Receiver_model','F40',-222,-65,34,6,white)
cyl('Receiver_status',(-229,-66,25),4,2,green)
for k in range(12):
 for x in [-336,-215]:b('Receiver_vent_'+str(x)+'_'+str(k),(x,8+k*4,100),(18,2,1),gr)
for x in [-343,-210]:
 for y in [-37,110]:b('Receiver_foot_'+str(x)+'_'+str(y),(x,y,3),(18,20,6),dk,1)
b('Rear_USB_B_schematic',(-245,134,47),(11,4,10),metal,1);b('Rear_USB_cavity',(-245,136.2,47),(8,1,6),dk);b('Rear_AC_schematic',(-303,134,49),(31,4,20),dk,1);cyl('Fibre_plug_receiver',(-215,134,72),12,9,metal)
tube('Fibre_lead',[(0,48,587),(0,49,614),(-94,188,601),(-202,250,419),(-249,220,145),(-215,138,72)],4.5,fiber)
tube('Side_camera_lead',[(107,48,530),(135,48,510),(145,94,414),(133,254,292)],3,black)
text('Head_mark','OLYMPUS',0,-56,370,9,dk)
for o in list(s.objects):
 if o.type in ('FONT','CURVE'):
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.export_scene.gltf(filepath=str(out/'f40.glb'),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
