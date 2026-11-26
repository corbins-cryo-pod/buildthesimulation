"""BTS 12-03: documentary side-port ZEISS LSM 980 housing layout, nominal meters; Blender -b -t 2 -P model.py."""
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
ivory=material('warm paint',(.80,.79,.74),.12)
grey=material('ZEISS housings inferred anodized gray',(.36,.42,.44),.24)
black=material('dark shell and table frame',(.031,.05,.058),.21)
blue=material('cosmetic blue caps',(.034,.17,.54),.21)
orange=material('visible opaque colored guard',(.78,.29,.042),.12)
teal=material('virtual viewport inspection control',(.021,.46,.41),.25)
steel=material('optical table',(.55,.59,.57),.50)
def bevel(o,w=.012,n=3):
 m=o.modifiers.new('Inferred rounded exterior','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def pipe(name,A,B,r,mat,n=22):
 a,b=Vector(A),Vector(B);d=b-a
 o=rod(name,tuple((a+b)*.5),r,d.length,mat,n=n);o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return o
bevel(block('large_active_tabletop',(0,0,.822),(1.20,.900,.076),steel),.013)
for x in [-.515,.515]:
 for y in [-.360,.360]:
  bevel(block('table_leg',(x,y,.403),(.088,.091,.806),black),.007)
  rod('table_foot',(x,y,.009),.045,.018,grey,n=16)
for y in [-.360,.360]:block('table_rail',(0,y,.235),(1.080,.065,.067),black)
# Passive external placeholders only; no optical beam, settings or wiring.
bevel(block('lsm_scan_head_external',(-.336,.016,1.010),(.449,.540,.291),ivory),.041,5)
bevel(block('scan_head_grey_inset',(-.336,-.246,1.009),(.407,.016,.190),grey),.014)
block('scan_label_blank',(-.395,-.256,.968),(.116,.002,.025),black)
bevel(block('airyscan_2_external',(-.281,.288,1.171),(.320,.217,.186),grey),.022,4)
bevel(block('airyscan_face',(-.281,.175,1.176),(.281,.011,.135),ivory),.013)
for i in range(5):block('case_vent',(-.393+i*.056,.400,1.165),(.025,.006,.071),black)
bevel(block('nominal_side_port_cover',(-.043,.022,1.019),(.111,.152,.108),steel),.015)
bevel(block('observer_inverted_lower',(.184,-.149,.984),(.276,.442,.236),ivory),.041,5)
bevel(block('observer_nose_cowl',(.184,-.295,1.087),(.214,.159,.134),ivory),.022)
bevel(block('observer_support_column',(.183,.102,1.195),(.176,.132,.359),ivory),.017)
bevel(block('observer_external_head',(.183,.036,1.381),(.159,.196,.087),ivory),.017)
block('stage_plate',(.183,-.068,1.170),(.287,.221,.027),black)
block('inert_stage_insert',(.183,-.073,1.185),(.102,.083,.005),steel)
block('stage_guard_colored',(.184,-.145,1.236),(.116,.009,.079),orange)
rod('nonfunctional_knob',(.309,-.189,1.029),.024,.029,black,n=24).rotation_euler.y=math.pi/2
for x in [.139,.228]:
 pipe('angled_eyepiece', (x,-.292,1.118),(x,-.363,1.177),.029,black,n=26)
 pipe('eyepiece_rim',(x,-.362,1.177),(x,-.375,1.188),.030,black,n=26)
 pipe('glass_proxy',(x,-.375,1.188),(x,-.377,1.190),.020,grey,n=22)
# Separate inactive unconnected rack, shape inferred. No settings or sources exposed.
bevel(block('external_inactive_module',(-.814,.166,.525),(.343,.572,.981),ivory),.026)
block('module_plain_front',(-.813,-.121,.533),(.312,.013,.875),grey)
for i in range(8):block('module_blank_vent',(-.814,-.130,.195+i*.037),(.222,.005,.014),black)
# Generic workshop side table and viewer display; not ZEISS accessory dimensions.
bevel(block('generic_monitor_desk',(.972,.055,.794),(.654,.610,.052),black),.014)
for x in [.714,1.223]:
 for y in [-.181,.269]:block('desk_leg',(x,y,.389),(.049,.049,.778),grey)
block('generic_display_foot',(.969,.146,.835),(.209,.149,.020),grey)
block('generic_display_stem',(.968,.150,.928),(.045,.043,.173),grey)
bevel(block('generic_display',(.969,.132,1.105),(.442,.059,.287),black),.015)
block('display_glass',(.969,.099,1.105),(.413,.005,.257),screen)
null('section_display_anchor',(.969,.094,1.105))
bevel(block('plane_select_overlay',(.934,-.104,.828),(.104,.045,.013),teal),.005)
block('keyboard_silhouette',(1.030,-.043,.825),(.328,.094,.014),grey)
bpy.ops.export_scene.gltf(filepath=str(out/'lsm980-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(3.05,-4.15,2.60),(.125,.020,.77),3.25),('detail',(1.00,-2.01,1.72),(-.13,.003,1.10),1.42)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
