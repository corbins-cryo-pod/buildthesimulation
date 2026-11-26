"""BTS 01-04: original custom connectomics desk, nominal meters; Blender -b -t 2 -P model.py."""
import math
from pathlib import Path
import bpy
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
out=Path(__file__).resolve().parent
scene=bpy.context.scene
scene.unit_settings.system='METRIC'

def material(name, rgb, metal=0, rough=.43):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    sh=m.node_tree.nodes.get('Principled BSDF');sh.inputs['Base Color'].default_value=(*rgb,1)
    sh.inputs['Metallic'].default_value=metal;sh.inputs['Roughness'].default_value=rough
    return m
base=material('graphite powdercoat',(.12,.18,.2),.25)
silver=material('brushed aluminum',(.49,.54,.57),.65)
dark=material('matte fittings',(.032,.045,.051))
green=material('start and jog target',(.02,.71,.63),.1)
amber=material('encoder collar',(.78,.39,.055),.48)
red=material('continuity terminal positive',(.64,.06,.035))
blue=material('continuity terminal return',(.035,.22,.72))
screen=material('counter display',(.027,.095,.09))
white=material('counter legends',(.7,.83,.79))
def attach(o,name,dims,mat,parent=None):
    o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if parent is not None:
        pos=o.location.copy();o.parent=parent;o.location=pos
    return o
def block(name,p,d,mat,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);return attach(bpy.context.object,name,d,mat,parent)
def rod(name,p,r,depth,mat,parent=None,n=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=n,radius=1,depth=1,location=p)
    return attach(bpy.context.object,name,(2*r,2*r,depth),mat,parent)
def null(name,p):
    o=bpy.data.objects.new(name,None);o.location=p;scene.collection.objects.link(o);return o
def cable(name,points,mat):
    for i,(p,q) in enumerate(zip(points,points[1:])):
        start,end=Vector(p),Vector(q);axis=end-start
        o=rod(name+'_'+str(i),tuple((start+end)*.5),.0014,axis.length,mat,n=10)
        o.rotation_mode='QUATERNION';o.rotation_quaternion=axis.to_track_quat('Z','Y')
oak=material('ivory high pressure laminate',(.73,.70,.61),.05)
alum=material('anodized frame',(.21,.27,.28),.56)
black=material('monitor graphite housing',(.034,.049,.057))
off=material('unpowered panel glass',(.012,.062,.072),.2)
cyan=material('zoom trackball',(.042,.52,.49),.4)
amber=material('annotate button',(.82,.36,.09),.24)
linen=material('key lettering faces',(.52,.58,.52))
def bevel(o,w=.012,n=3):
 m=o.modifiers.new('Small edge radius','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted Normals','WEIGHTED_NORMAL');return o
bevel(block('desk_top',(0,0,.735),(1.55,.74,.04),oak),.017)
for x in [-.65,.65]:
 bevel(block('front_leg',(x,-.25,.356),(.072,.071,.716),alum),.008)
 bevel(block('rear_leg',(x,.252,.356),(.072,.071,.716),alum),.008)
 bevel(block('leg_tie',(x,0,.120),(.060,.527,.052),alum),.005)
block('rear_crossbar',(0,.287,.59),(1.32,.065,.066),alum)
bevel(block('central_cable_tray',(0,.245,.649),(.91,.127,.098),black),.012)
bevel(block('dual_stand_foot',(-.078,.184,.773),(.495,.205,.038),alum),.014)
rod('monitor_support',(-.078,.196,.91),.035,.252,alum,n=24)
block('monitor_shared_arm',(.013,.16,1.02),(.664,.078,.053),alum)
bevel(block('left_display',(-.202,.127,1.104),(.748,.051,.437),black),.016)
block('primary_display_panel',(-.202,.098,1.104),(.720,.006,.407),off)
# Small 3D anchor for applying the live slice texture in the browser.
null('primary_texture_anchor',(-.202,.0938,1.104))
bevel(block('right_display',(.438,.126,1.061),(.474,.049,.306),black),.013)
block('side_display_panel',(.438,.097,1.061),(.445,.006,.279),off)
null('side_texture_anchor',(.438,.0928,1.061))
for i in range(5):rod('bezel_button_'+str(i),(.548+i*.016,.092,.922),.003,.005,silver,n=8).rotation_euler.x=math.pi/2
bevel(block('keyboard_shell',(-.238,-.17,.773),(.453,.151,.029),black),.009)
keys=[]
for j in range(5):
 for i in range(14):
  keys.append(block('key',(-.421+i*.028,-.223+j*.026,.791),(.021,.019,.011),linen if (j==0 or j==4) else silver))
bpy.ops.object.select_all(action='DESELECT')
for key in keys:key.select_set(True)
bpy.context.view_layer.objects.active=keys[0];bpy.ops.object.join()
keys[0].name='keyboard_static_keys'
bevel(block('trackball_mount',(.159,-.196,.783),(.186,.184,.060),black),.024)
rod('trackball_seat',(.163,-.20,.815),.047,.014,alum)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=.042,location=(.163,-.20,.815));o=bpy.context.object;o.name='zoom_trackball';o.data.materials.append(cyan)
for poly in o.data.polygons:poly.use_smooth=True
bevel(block('annotation_pad',(.462,-.178,.789),(.216,.157,.068),black),.014)
for j in range(2):
 for i in range(3):
  name='annotation_key' if (i,j)==(1,0) else 'pad_key'
  block(name,(.405+i*.054,-.218+j*.052,.829),(.045,.043,.017),amber if name=='annotation_key' else silver)
bevel(block('compute_tower',(.536,.065,.281),(.237,.476,.523),black),.020)
block('compute_io_panel',(.536,-.177,.425),(.192,.010,.129),alum)
for i in range(8):block('tower_intake',(.536,-.177,.095+i*.027),(.162,.010,.013),alum)
cable('video_cable',[(-.215,.160,1.02),(-.15,.222,.92),(-.08,.236,.78),(-.06,.263,.653),(.318,.263,.651),(.536,.248,.514)],black)
# Little permanent emblems for operator-facing geometry, independent of canvas data.
rod('power_status',(.593,-.177,.458),.006,.005,cyan,n=12).rotation_euler.x=math.pi/2
bpy.ops.export_scene.gltf(filepath=str(out/'connectomics-console.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.36,.39,.40)
 scene.render.resolution_x=650;scene.render.resolution_y=450;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.15,-3.1,2.05),(0,0,.71),1.95),('controls',(.94,-1.48,1.48),(.26,-.098,.885),.90)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
