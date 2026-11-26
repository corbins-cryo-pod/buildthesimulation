"""Bruker Dimension Icon, Rev E • AVH-1000 • NanoScope V • RTESP-300. Editable Blender 4.3 source. Source coordinates mm, origin at floor under hood. glTF Y up, +Z toward operator. Blender -b -P build-model.py [-- --renders]."""
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
iv=material('Enamel / warm instrument silver',(.64,.65,.64),.24);gray=material('Dove / upper housing',(.46,.5,.51),.32);metal=material('Turned aluminium',(.52,.55,.56),.74);blk=material('Anthracite / textured polymer',(.026,.032,.041));iron=material('AVH graphite powder-coat',(.085,.105,.123),.32);dark=material('Graphite recess',(.009,.014,.017));red=material('Original-generation trim',(.58,.027,.041));gold=material('Gold plated',(.59,.37,.11),.66);green=material('Vacuum status',(.1,.46,.22));blue=material('Display glass',(.019,.056,.09));silicon=material('Silicon substrate',(.21,.26,.31),.68);pale=material('Screen lettering',(.69,.79,.83))
D=733.298
avh=empty('AVH1000');deck=box('ISOLATION_DECK',(0,0,D-25),(914.4,812.8,50),iron,avh,4)
for x in (-340,340):
 for y in (-310,310):
  box('column',(x,y,367),(61,65.8,637),iron,avh,4);cyl('levelling_foot',(x,y,26),39,52,blk,avh,'z',24);cyl('air_spring',(x,y,678),44,42,gray,avh,'z',24)
 rod('side_stay',(x,-310,110),(x,310,612),12,iron,avh);box('lower_rail',(x,0,115),(38,652,34),iron,avh)
rod('back_stay',(-340,310,110),(340,310,612),12,iron,avh)
# AVH-1000 sloped front canopy. Main enclosure omitted by cutaway, not scaled or lifted to imply a real calibrated stroke.
shell=empty('AVH_SHELL',parent=avh)
def prism(n,x,w,profile,m,par):
 pts=[(a/1000,y/1000,z/1000) for a in (x-w/2,x+w/2) for y,z in profile];N=len(profile);faces=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 mesh=bpy.data.meshes.new(n);mesh.from_pydata(pts,[],faces);mesh.update();o=bpy.data.objects.new(n,mesh);bpy.context.collection.objects.link(o);o.parent=par;o.data.materials.append(m);return o
outline=[(-406.4,D),(-406.4,1315),(-177,1652.778),(406.4,1652.778),(406.4,D)]
for x in [-448.2,448.2]:prism('acoustic_sidewall',x,18,outline,iron,shell)
box('upper_back',(0,396.4,1193.038),(900,20,919.48),iron,shell,2)
box('canopy_roof',(0,114.7,1643.778),(914.4,583.4,18),iron,shell,2)
prism('sloped_front_cap',0,912,[(-406.4,1315),(-177,1652.778),(-165,1644),(-390,1310)],iron,shell)
for x in (-305,305):box('front_wall_cheek',(x,-393,1031),(304,26,595),iron,shell,3)
box('front_wall_header',(0,-393,1272),(365,26,104),iron,shell,3);box('front_wall_sill',(0,-393,815),(365,26,160),iron,shell,3)
hatch=empty('ACCESS_HATCH',(-166,-407,1055),avh)
for x in (2,330):box('hatch_side',(x,0,0),(14,15,322),gray,hatch,2)
for z in (-154,154):box('hatch_rail',(166,0,z),(342,15,14),gray,hatch,2)
glass=material('Smoked laminated window',(.09,.16,.18));glass.surface_render_method='DITHERED';glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.35;glass.diffuse_color=(.09,.16,.18,.35)
box('hatch_window',(166,1,0),(323.85,4,298.45),glass,hatch);rod('hatch_latch',(308,-22,-46),(308,-22,46),7,metal,hatch)
for z in [-46,46]:rod('handle_standoff',(308,-4,z),(308,-22,z),5,metal,hatch)
# Standard Dimension Icon microscope on 1-inch isolating pad. True envelope attached to designated observable members.
pad=box('silicone_pad',(0,0,D+12.7),(589,627,25.4),blk,avh,6);Z=D+25.4;spm=empty('ICON_SPM',(0,0,Z))
box('icon_lower_plinth',(0,0,11),(594.36,637.54,22),blk,spm,4);box('icon_red_belt',(0,0,26),(592,634,11),red,spm,5)
box('cast_base',(0,0,64),(591,633,68),iv,spm,9);box('right_fascia',(218,42,116),(147,525,62),iv,spm,12);box('left_fascia',(-229,42,113),(120,525,56),iv,spm,12)
label('spm_id','Dimension  Icon',219,-223,125,13,blk,'front',spm)
for x in (-204,163):
 box('upright_rounded',(x,94,239),(60,151,294),iv,spm,14);box('upright_inset',(x,15,247),(40,6,174),iron,spm,4)
box('bridge_top',(-20,96,379.2),(425,154,54.4),iv,spm,14);box('bridge_top_trim',(-20,16,383),(393,3,5),red,spm,2)
box('optics_status_LCD',(-135,15,361),(82,8,27),blue,spm,4);label('status_mark','ICON   SPM',-135,9,361,7,pale,'front',spm)
for x in (-113,84):
 box('stage_linear_way',(x,-31,106),(24,252,13),metal,spm,2)
box('XY_carriage',(-21,-49,119),(246,217,19),iron,spm,4)
cyl('CHUCK_200',(-22,-64,136),100,16,metal,spm,'z',96)
for R in (36,65,87):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=6,major_radius=R/1000,minor_radius=.0007)
 finish(bpy.context.object,'vacuum_channel',(-22,-64,144),blk,spm)
for j in range(6):
 t=j*pi/3;cyl('vacuum_orifice',(-22+48*math.cos(t),-64+48*math.sin(t),144.2),1.45,.6,dark,spm,'z',12)
coupon=empty('SPECIMEN_COUPON',(-22,-64,144),spm);box('silicon_coupon',(0,0,.25),(18,12,.5),silicon,coupon,.1)
head=empty('ENGAGE_HEAD',(-22,-64,144.5),spm);box('optical_stage',(0,154,150),(100,126,111),iv,head,12);box('scanner_housing',(0,29,95),(69,61,103),iv,head,9)
cyl('vertical_optics',(0,58,153),21,105,iron,head,'z',24);cyl('objective_barrel',(0,31,58),17,30,metal,head,'z',24)
for x in (-14,14):cyl('laser_xy_adjust',(x,13,150),6.3,14,blk,head,'z',20)
for z in (92,113):cyl('detector_trim',(36,30,z),7,11,blk,head,'x',18)
cyl('scanner_tube',(0,9,39),12,58,gray,head,'z',24)
# Undocumented coarse body sizes inferred; true probe relative geometry anchored at coupon top. Electrical contact tip itself is not artificially inflated.
box('standard_air_holder',(0,9.15,6),(13,18,9),iron,head,1)
box('probe_retaining_clip',(0,4.6,1.02),(4,8,1.7),gold,head,.2)
box('probe_die',(0,2.0,.185),(1.6,3.75,.34),silicon,head)
beam=box('RTESP300_BEAM',(0,.0625,.0167),(.04,.125,.0034),silicon,head)
bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=0,radius2=.0000055,depth=.000015);finish(bpy.context.object,'RTESP300_TIP',(0,.008,.0075),silicon,head)
cable('head_48pin_umbilical',[(-.0,-22,Z+355),(45,-35,Z+340),(94,-25,Z+236),(141,-5,Z+226),(155,9,Z+249)],3,blk)
box('head_socket',(156,3,250),(16,15,22),dark,spm,2)
# Companion station: placement and cabinet dimensions inferred; rear ports grouped from Figure 4.4d and front instrument from 4.4c.
rack=empty('NSV_RACK',(710,76,0))
box('cabinet',(0,0,343),(420,445,686),iron,rack,7)
for z,tag in [(465,'STAGE_CONTROLLER'),(595,'NANOSCOPE_V')]:
 box(tag,(0,-9,z),(394,450,111),iv,rack,3);box(tag+'_front',(0,-235,z),(389,6,107),gray,rack,2);label(tag+'_legend',tag.replace('_',' '),-47,-239,z+25,10,blk,'front',rack)
 for i in range(8):
  x=-166+(i%4)*38;zz=z-28+(i//4)*20;cyl(tag+'_BNC',(x,-240,zz),5.8,12,metal,rack,'y',18);cyl('socket_hole',(x,-247,zz),3,1,dark,rack)
 for zz in [-15,8]:box('multipin',(117,-239,z+zz),(49,6,12),dark,rack,2)
 for x in (-105,110):
  cyl('rear_fan',(x,220,z),37,8,blk,rack,'y',32)
  for j in range(-3,4):box('fan_grille',(x,225,z+j*8),(2*math.sqrt(35**2-(j*8)**2),2,1.6),metal,rack)
 for x,w in [(0,25),(161,24)]:box('rear_connector',(x,223,z),(w,8,32),dark,rack,2)
box('display_foot',(0,0,700),(300,165,15),iron,rack,4);box('display_post',(0,35,809),(45,34,215),iron,rack,4);box('MONITOR',(0,28,975),(455,37,280),blk,rack,9);box('SCREEN',(0,7.8,975),(424,3,245),blue,rack,2)
label('display_heading','NANOSCOPE   /   HEIGHT',0,5.9,1080,9,pale,'front',rack)
box('input_tray',(0,-103,712),(358,124,9),gray,rack,3)
for i in range(12):
 for j in range(4):box('keycap',(-142+i*21,-136+j*20,719),(17,15,4),blk,rack,1)
cable('control_harness',[(170,274,Z+110),(300,382,720),(502,300,480),(710,300,595)],5,blk)
bpy.ops.export_scene.gltf(filepath=OUT+'/dimension-icon.glb',export_format='GLB',export_yup=True,export_animations=False,export_lights=False,export_cameras=False)
if '--renders' in sys.argv:
 scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.50,.55,.59,1);scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=False;scene.render.resolution_x=640;scene.render.resolution_y=425;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=87
 for pos,energy in [((-.8,-1.7,2.8),75),((1.3,.5,2.5),55)]:
  bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=energy;o.data.size=1.2;o.rotation_euler=(Vector((0,0,.85))-o.location).to_track_quat('-Z','Y').to_euler()
 for name,pos,target,w,cut in [('hood',(1.5,-3,1.75),(.15,0,.85),3.12,False),('spm',(.70,-1.65,1.47),(0,0,Z/1000+.19),1.05,True),('scanner',(.27,-.53,1.11),(-.015,-.061,Z/1000+.216),.285,True),('rear',(.88,1.7,.80),(.71,.1,.54),.63,False)]:
  for grp in (shell,hatch):
   for child in grp.children_recursive:child.hide_render=cut
  bpy.ops.object.camera_add(location=pos);o=bpy.context.object;o.data.type='ORTHO';o.data.ortho_scale=w;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();scene.camera=o;scene.render.filepath=OUT+'/'+name+'.jpg';bpy.ops.render.render(write_still=True)
