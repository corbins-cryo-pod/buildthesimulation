"""Editable metric reconstruction of the E36313A, no GPIB option. Run blender -b -t 1 -P build-model.py. Geometry helpers take millimetres; glTF exports metres, +Y up, +Z front. Original passive fixture is not factory equipment."""
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
graph=m('Graphite molded front',(.048,.052,.066));body=m('Slate steel cover',(.40,.42,.44),.36);dark=m('Recessed black',(.012,.015,.019));key=m('Graphite keycap',(.060,.066,.077));rub=m('Foot rubber',(.035,.038,.042));light=m('Silk screen',(.84,.86,.86));silver=m('Contact metal',(.57,.57,.55),.72);yellow=m('Channel one saffron',(.90,.61,.056));green=m('Channel two green',(.42,.72,.11));blue=m('Channel three blue',(.23,.39,.73));red=m('Positive terminal',(.67,.022,.029));earth=m('Protective green',(.025,.38,.20));circuit=m('Terminal block green',(.09,.35,.20));gold=m('Load fixture aluminum',(.64,.47,.21),.54)
cols=[yellow,green,blue]
# Manufacturer body envelope excluding feet/strap; foremost post at -182, rear jack at +182.
b('Enclosure',(0,4,78.5),(213,337,133),body,2.2);b('Front_fascia',(0,-163.5,78.5),(213,5,133),graph,2.6)
b('Rear_plate',(0,173.15,78.5),(210,1.0,130),graph,1.3)
for sign in [-1,1]:
 for y in [-128,135]:b('Foot_'+str(sign)+'_'+str(y),(sign*70,y,6),(40,40,12),rub,2)
 for iz in range(6):
  for iy in range(13):
   b('Vent_'+str(sign)+'_'+str(iz)+'_'+str(iy),(sign*106.43,-60+iy*10,44+iz*9),(0.14,7,1.6),dark)
for sign in [-1,1]:b('Foot_rear_bumper_'+str(sign),(sign*71,181,13),(35,8,9),rub,1)
# Restrained carry strap lies against case, not raised.
for y in [-45,90]:b('Strap_anchor_'+str(y),(107.2,y,83),(1.6,11,13),dark,1)
b('Strap_flat',(108.2,22.5,83),(2.6,135,8),rub,1)
# Front coordinates scaled from the model-specific straight-on product image.
def fx(px):return (px-368)*213/482
def fz(py):return 12+(351-py)*133/297
F=-166
b('Display_recess',(fx(282),F-1,fz(150)),(99.5,1.8,59.8),dark,1);b('Display_active',(fx(282),F-2,fz(150)),(95.0,.32,53.5),dark)
text('Model_badge','KEYSIGHT   E36313A   TRIPLE OUTPUT DC SUPPLY',fx(281),F-.4,fz(69),2.8,light)
def pill(n,pos,w,h,d,mat):
 # Extruded capsule in the photographed X/Z face plane, with continuous semicircular ends.
 r=h/2;line=[]
 for center,start in [(w/2-r,-90),(-w/2+r,90)]:
  for i in range(13):
   t=math.radians(start+180*i/12);line.append((center+r*math.cos(t),r*math.sin(t)))
 N=len(line);vv=[p((x,y,z)) for y in [-d/2,d/2] for x,z in line];ff=[tuple(range(N)),tuple(reversed(range(N,N*2)))]+[(i,i+N,(i+1)%N+N,(i+1)%N) for i in range(N)]
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(vv,[],ff);mesh.materials.append(mat);o=bpy.data.objects.new(n,mesh);s.collection.objects.link(o);o.location=p(pos);return o
def kb(n,label,px,py,w,h,mat,ink=light,fs=2.5):
 x=fx(px);z=fz(py);o=pill(n,(x,F-1.4,z),w,h,2.7,mat);
 if label:text(n+'_legend',label,x,F-2.85,z,fs,ink)
 return o
for i,x in enumerate([443,495,546]):kb('Select_'+str(i+1),str(i+1),x,83,13,6,cols[i],dark,3.8)
for nm,px in [('Voltage',448),('Current',545)]:
 x=fx(px);z=fz(133);cyl('Knob_'+nm,(x,F-5,z),17.5,10,rub);b('Knob_'+nm+'_index',(x,F-10.25,z+5),(1.2,.45,4.6),light,.3);text(nm+'_silk',nm,x,F-.4,fz(106),2.6,light)
for i,x in enumerate([192,228,264,300,336,372]):kb('Soft_'+str(i+1),'',x,229,12,5.2,key)
for j,(py,row) in enumerate([(175,['1','2','3']),(199,['4','5','6']),(224,['7','8','9']),(248,['.','0','<'])]):
 for k,(x,lab) in enumerate(zip([499,534,567],row)):kb('Pad_'+str(j)+'_'+str(k),lab,x,py,12,5.3,key,light,3)
for n,label,x,y in [('Meter','METER',423,174),('Track','TRACK',456,174),('Store','STORE',424,248),('Enter','ENTER',458,248),('Up','^',441,193),('Down','v',441,226),('Left','<',417,210),('Right','>',463,210)]:kb(n,label,x,y,10,5,key)
for i,x in enumerate([297,427,514]):kb('Output_'+str(i+1),'ON',x,282,12,6,cols[i],dark,3.6)
kb('All_key','ALL',247,282,13,6,key)
cyl('Standby',(fx(173),F-1.6,fz(319)),9,3,key);text('Standby_legend','I',fx(173),F-3.4,fz(319),4,light);b('Front_USB',(fx(154),F-.5,fz(165)),(5,1.4,12),silver,.4);b('USB_cutout',(fx(154),F-1.4,fz(165)),(3.8,.6,10),dark)
# Six 4 mm front jacks. No mechanical adjustment or plug travel is asserted by schematic toggles.
pairs=[(297,340),(429,469),(517,557)];z=fz(321)
for i,(pos,neg) in enumerate(pairs):
 mid=(fx(pos)+fx(neg))/2;pill('Channel_'+str(i+1)+'_color',(mid,F-1.1,z),36,16,2.2,cols[i])
 for code,px,mat in [('+',pos,red),('-',neg,dark)]:
  n='Post_CH'+str(i+1)+('_hi' if code=='+' else '_lo');x=fx(px);cyl(n+'_collar',(x,-170,z),12.5,6,dark);cyl(n,(x,-175.5,z),10.6,11,mat);cyl(n+'_rim',(x,-181.4,z),5.5,1.2,silver);cyl(n+'_hole',(x,-182.0+.03,z),4,.05,dark)
 text('Terminal_CH'+str(i+1)+'_silk','+     '+str(i+1)+'     -',mid,F-2.5,z-6.8,2.5,dark)
cyl('Protective_earth',(fx(384),-174,z),8,10,earth);cyl('Earth_socket',(fx(384),-179.4,z),3.8,.7,silver)
# Rear in viewer coordinates: flipped horizontal relative to front.
def rear(n,x,z,w,h,mat,depth=2):return b(n,(-x,174+depth/2,z),(w,depth,h),mat,.5)
for n,x0,z0,num in [('Out23',-66,128,8),('Out1',-75,30,4),('DigitalIO',16,128,4)]:
 rear(n+'_housing',x0,z0,5*num+3,8,circuit,6)
 for k in range(num):cyl(n+'_port_'+str(k),(-x0+(k-(num-1)/2)*5,180.2,z0),2.5,.6,dark)
rear('LAN_body',52,127,12,10,silver,4);rear('LAN_insert',52,127,10,7,dark,4.6);rear('Rear_USB_B',79,126,10,9,silver,4);rear('Rear_USB_recess',79,126,6.5,6,dark,4.6)
rear('GPIB_unfitted_blank',64,88,42,11,body,2);rear('IEC_inlet_housing',68,53,34,27,dark,7.7)
for x,z0 in [(61,54),(74,54),(68,60)]:rear('IEC_pin_'+str(x),x,z0,2,4,silver,8)
rear('Fuse_selector',70,27,17,6,key,3);cyl('Rear_earth', (85,176,70),6.5,4,silver)
cyl('Fan_grille_back',(14,174.5,67),77,2,dark)
for radius in [15,25,35]:
 bpy.ops.mesh.primitive_torus_add(major_segments=36,minor_segments=6,major_radius=radius*.001,minor_radius=.0013,location=p((14,176,67)),rotation=(math.pi/2,0,0));finish('Fan_guard_'+str(radius),body)
for k in range(6):
 ang=k*math.pi/3;xx=14+30*math.cos(ang);zz=67+30*math.sin(ang);tube('Fan_spoke_'+str(k),[(14,176,67),(xx,176,zz)],1.8,body)
# Original virtual resistive-load bank, not supplied by Keysight. Electrical values come from virtual station state.
b('Fixture_load_bank',(0,-278,5),(185,42,10),body,2)
for i,(pos,neg) in enumerate(pairs):
 x0=-62+i*62
 b('Fixture_resistor_'+str(i+1),(x0,-279,13),(32,16,7),gold,1);text('Fixture_CH'+str(i+1),'LOAD '+str(i+1),x0,-299,6,3.8,light)
 for code,px,mat,sg in [('hi',pos,red,-1),('lo',neg,dark,1)]:
  n='Cable_CH'+str(i+1)+'_'+code;x=fx(px);cyl(n+'_banana',(x,-187,z),6,13,mat)
  tube(n+'_lead',[(x,-192,z),(x,-213,z*.75),(x0+sg*20,-246,7),(x0+sg*20,-269,11)],2.5,mat);cyl('Load_CH'+str(i+1)+'_'+code,(x0+sg*20,-269,12),5.5,4,mat,'Z')
for o in list(s.objects):
 if o.type in ('FONT','CURVE'):
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
# Join the decorative side perforations into one draw per side instead of 156 tiny mesh draws.
for sign in [-1,1]:
 parts=[o for o in s.objects if o.name.startswith('Vent_'+str(sign)+'_')]
 bpy.ops.object.select_all(action='DESELECT')
 for obj in parts:obj.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();bpy.context.object.name='Side_vents_'+str(sign)
bpy.ops.export_scene.gltf(filepath=str(out/'e36313a.glb'),export_format='GLB',export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
