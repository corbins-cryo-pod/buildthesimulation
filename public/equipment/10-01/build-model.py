"""Editable procedural reconstruction; Blender 4.x -b -P build-model.py.
Metric case and CV-7B envelopes from manual p.141; other features are inferred.
Z up in source, Y up in exported glTF. Does not redistribute source photos."""
import bpy, math, os, sys
from mathutils import Vector
from math import pi
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,rgb,metal=.0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=.35
 return m
case=material('Champagne powder coat',(.52,.55,.55),.36); plate=material('Pale etched front',(.76,.77,.72),.32); grip=material('Molded slate trim',(.085,.115,.15)); black=material('Instrument black',(.02,.026,.037)); blue=material('Channel one navy',(.02,.065,.19)); teal=material('Channel two green',(.015,.19,.14)); steel=material('Connector nickel',(.66,.68,.71),.85); gold=material('Test pins · copper alloy',(.70,.44,.10),.72); green=material('Active light',(.04,.87,.24)); amber=material('Overrange lens',(.65,.30,.038)); ivory=material('PTFE collet',(.92,.9,.83)); red=material('Test enclosure',(.43,.45,.47),.75)
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
main=empty('MCC700B_main_unit');box('case_body_2U',(0,.75,54.45),(434,303.3,88.9),case,main,1.5);box('operator_front_plate',(0,-151.4,54.45),(433,2,86.5),plate,main,1)
for sg in [-1,1]:
 x=sg*229.1;box('Rack_ear_'+str(sg),(x,-150.5,54.45),(24.4,3.7,88.9),grip,main,1)
 for z in [17,92]:box('Rack_slot_'+str((sg,z)),(x,-152.45,z),(9,1,4),black,main,1)
 cyl('Handle_bar_'+str(sg),(sg*226,-174,54),4.2,64,grip,main,'z')
 for z in [22,86]:rod('Handle_return_'+str((sg,z)),(sg*226,-174,z),(sg*220,-151,z+(-4 if z<50 else 4)),4.2,grip,main)
 for y in (-112,110):box('Foot_'+str((sg,y)),(sg*176,y,5),(31,32,10),black,main,2)
def bnc(prefix,x,y,z,sg):
 cyl(prefix+'_nut',(x,y+sg*.9,z),7,2,steel,main,'y',6)
 cyl(prefix+'_barrel',(x,y+sg*6,z),5.5,10,steel,main);cyl(prefix+'_insulator',(x,y+sg*11.02,z),4.05,.4,ivory,main);cyl(prefix+'_contact',(x,y+sg*11.42,z),1.7,.55,black,main)
 for sign in [-1,1]:cyl(prefix+'_bayonet_'+str(sign),(x+sign*5.55,y+sg*7,z),1.2,2,steel,main,'x')
for ch,(offset,color) in enumerate([(-89,blue),(80,teal)],1):
 for title,x0 in [('COMMAND',0),('MODE',30),('PRIMARY',70),('SECONDARY',96),('SCOPE',122)]:
  x=offset+x0;bnc('CH%d_%s_BNC'%(ch,title),x,-153,45,-1);label('Legend_'+str(ch)+title,title,x,-152.52,58,3.2,color)
 label('Channel_'+str(ch),'CHANNEL  '+str(ch),offset+48,-152.5,83,5.4,color)
 for key,xx in [('VC',0),('IC',16),('OL',71)]:
  x=offset+xx;cyl('CH%d_%s_LED'%(ch,key),(x,-153.4,68),2.35,1.8,(green if ch==1 and key=='IC' else amber if key=='OL' else black),main)
  label('Indicator_'+str(ch)+key,key,x,-152.52,75,3,color)
label('Brand','AXON  CNS',-174,-152.52,83,8,blue);label('Device_model','MultiClamp 700B',-172,-152.52,20,6,blue)
box('POWER_switch',(-193,-154,36),(10,6,5),black,main,1)
for txt,z in [('POWER',41),('STATUS',30)]:
 cyl(txt+'_lamp',(-163,-153.4,z),1.8,1.8,green if txt=='POWER' else amber,main);label(txt+'_legend',txt,-150,-152.52,z,3,black)
cyl('Phones_socket',(-131,-154,46),4,4,steel,main);cyl('Phones_bore',(-131,-156.1,46),2.7,.6,black,main)
# Rear as seen from the back: x reverses. Port placements estimated from 700B serial label photos.
for tag,u,n in [('HEADSTAGE 2',-166,25),('AUX 2',-111,15),('HEADSTAGE 1',-34,25),('AUX 1',22,15)]:
 x=-u;w=39 if n==25 else 28;box(tag+'_shell',(x,153,36),(w,4,11),steel,main,2);box(tag+'_insert',(x,155.2,36),(w-5,1.2,7),black,main,1)
 for k in range(n):
  row=k>=(n+1)//2;idx=k-((n+1)//2 if row else 0);xp=x+(idx-(n//2)/2+(0.5 if row else 0))*2
  cyl(tag+'_socket_'+str(k),(xp,155.9,36+(1.5 if row else -1.5)),.4,1,steel,main,'y',8)
 label(tag+'_label',tag,x,153,47,3.4,black,'back')
for tag,u in [('10 AUX 2',-77),('10 AUX 1',58),('SYNC',86)]:
 bnc(tag,-u,152.5,36,1);label(tag+'_print',tag,-u,152.82,47,3,black,'back')
for title,u in [('AUDIO IN',-4),('AUDIO OUT',19),('GROUND',54)]:
 x=-u;cyl(title+'_socket',(x,154,65),4.5,3,gold if title=='GROUND' else black,main);label(title+'_text',title,x,152.72,74,3.3,black,'back')
for tag,x,w,h in [('USB-B',-108,10,9),('FUSE',-138,9,9),('MAINS',-178,27,17)]:
 box(tag,(x,153.8,37),(w,4,h),black,main,1);label(tag+'_text',tag,x,152.8,55,3.4,black,'back')
for x in (-61,0,61):box('Top_panel_seam_'+str(x),(x,142,98.9),(1,14,.5),black,main)
for x in (-204,0,204):
 for z in (15,94):
  for y in (-153,153):cyl('Face_fastener',(x,y,z),1.8,1.2,steel,main)
head=empty('CV7B_headstage_CH1',(98,-220,2));box('CV7B_dovetail',(0,0,1),(40,68,2),steel,head,1)
box('CV7B_case',(0,0,12.15),(40.6,83.8,20.3),black,head,1.5);box('CV7B_label',(0,0,22.5),(34,69,.4),ivory,head,1)
label('CV7B_id','CV-7B',0,-5,22.85,7.8,blue,'top',head);cyl('CV7B_PTFE_collet',(0,-45,12),5.2,7,ivory,head)
for x in (-17,17):
 for y in (-38,38):cyl('CV7B_fastener',(x,y,22.6),1.4,.9,steel,head,'z')
patch=empty('PATCH1U_load',(98,-290,0));box('PATCH1U_module',(0,0,13),(38,41,25),red,patch,1.3);label('PATCH1U_name','PATCH-1U',0,0,25.7,5,black,'top',patch)
for title,x,y in [('CELL',0,21),('BATH',-13,-21),('PATCH',13,-21)]:
 cyl('PATCH1U_'+title,(x,y+(4 if y>0 else -4),14),1.25,9,gold,patch);label('PATCH1U_leg_'+title,title,x,y*.67,25.7,3,black,'top',patch)
cable('Ground_lead_PATCH1U_CV7B',[(83,-286,22),(66,-281,21),(62,-211,14),(81,-178,14)],1.3,black)
cable('Headstage_lead_CH1',[(98,-178,13),(244,-172,8),(258,-73,7),(244,105,6),(176,179,12),(34,175,35),(34,153,36)],2.2,black)
# Keep original editable scene; the generator is the canonical edit source.
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=OUT+'/multiclamp.glb',export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
if '--renders' in sys.argv:
 from mathutils import Vector
 scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Studio sky');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.7,.74,.77,1)
 scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False;scene.render.resolution_x=720;scene.render.resolution_y=390;scene.render.resolution_percentage=100
 for loc,p in [((-.36,-.43,.65),11),((.4,.4,.55),8)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=p;o.data.shape='DISK';o.data.size=.45;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 for n,pos,target,w in [('front',(.12,-.93,.31),(0,-.05,.045),.59),('rear',(-.1,.74,.20),(0,.04,.044),.54),('headstage',(.19,-.38,.22),(.096,-.25,.012),.18)]:
  bpy.ops.object.camera_add(location=pos);o=bpy.context.object;o.data.type='ORTHO';o.data.ortho_scale=w;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();scene.camera=o;scene.render.filepath=OUT+'/'+n+'.png';bpy.ops.render.render(write_still=True)
