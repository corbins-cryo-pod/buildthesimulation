"""BTS 04-07: sealed DISCO DAD321 and separate coordinate poster, nominal meters; Blender -b -t 2 -P model.py."""
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




# Passive exterior, including fictional opaque replacements for openings. No internal mechanics.
machine=null('instrument_anchor',(0,0,0))
cream=material('slightly warm original painted side panels',(.82,.81,.74),.12,.41)
panel=material('upper dark faceplate',(.07,.085,.078),.20,.42)
rim=material('brushed outer shroud',(.55,.56,.49),.58,.35)
glass=material('opaque dark viewing blank',(.096,.14,.14),.27,.28)
red=material('cosmetic unpowered red trim',(.65,.073,.043),.15,.44)
gold=material('cosmetic yellow trim',(.75,.49,.028),.15,.45)
amber=material('unpowered amber lens',(.62,.32,.048),.12,.42)
green=material('unpowered green lens',(.12,.38,.19),.12,.42)
def part(name,p,d,m,w=.012):
 return bevel(block(name,p,d,m,machine),w,4)
part('lower_main_shell',(0,0,.401),(.500,1.050,.762),cream,.017)
for x in [-.174,.174]:
 for y in [-.438,.438]:rod('stationary_support_foot',(x,y,.010),.031,.020,panel,machine,24)
part('lower_front_inset',(0,-.517,.373),(.426,.008,.643),cream,.005)
for k in range(12):part('cosmetic_front_fan_rib',(-.171,-.521,.205+.027*k),(.084,.004,.010),grey,.001)
part('continuous_tall_rear_shell',(0,.215,1.082),(.495,.616,.742),cream,.013)
part('upper_spine_top',(0,.215,1.445),(.493,.612,.020),cream,.006)
part('upper_dark_external_face',(0,-.101,1.273),(.475,.025,.305),panel,.009)
part('blank_display_recess',(.052,-.115,1.287),(.172,.006,.143),glass,.006)
part('unlettered_marker',(-.157,-.117,1.382),(.122,.004,.028),grey,.002)
part('detached_cosmetic_indicator_slot',(-.147,-.117,1.260),(.071,.004,.120),grey,.005)
for i in range(3):part('sealed_silver_marker',(-.163+i*.016,-.120,1.261),(.006,.005,.085),rim,.002)
w=rod('decorative_red_emblem',(.195,-.126,1.165),.019,.021,red,machine,28);w.rotation_euler.x=math.pi/2
w=rod('decorative_gold_collar',(.195,-.118,1.165),.027,.010,gold,machine,32);w.rotation_euler.x=math.pi/2
part('fixed_lower_front_ledge',(0,-.314,.781),(.500,.416,.100),rim,.026)
# Opaque, fixed hood silhouette and right-side inert protective cover.
a=part('sealed_left_sloping_hood',(-.100,-.290,.943),(.280,.337,.042),rim,.018);a.rotation_euler.x=math.radians(40)
a=part('opaque_replaced_window',(-.100,-.303,.957),(.223,.245,.009),glass,.008);a.rotation_euler.x=math.radians(40)
part('sealed_right_opaque_cover',(.137,-.246,.928),(.202,.290,.234),cream,.014)
part('flat_blank_key_silhouette',(.097,-.470,.840),(.222,.067,.015),panel,.006)
for j in range(2):
 for i in range(8):part('unmarked_cosmetic_key',(.002+i*.025,-.492+j*.022,.848),(.017,.013,.003),grey,.001)
# Optional photographed external stack beacon, not part of the nominal cabinet test.
tower=null('external_stack_beacon_inferred',(-.145,.136,1.455))
rod('cap_beacon_base',(0,0,.017),.035,.034,panel,tower,26)
rod('opaque_beacon_support',(0,0,.085),.012,.114,rim,tower,22)
for z,m in [(.151,green),(.180,amber),(.209,red)]:rod('inactive_beacon_lens',(0,0,z),.023,.029,m,tower,26)
rod('opaque_beacon_cap',(0,0,.229),.023,.011,panel,tower,26)
# Independent generic coordinate poster and stand: not a device module.
bevel(block('detached_grid_stand',(.760,-.163,.770),(.485,.452,.040),panel),.010)
for x in [.575,.945]:
 for y in [-.321,.003]:block('detached_stand_leg',(x,y,.373),(.044,.044,.746),grey)
block('detached_poster_mount',(.760,-.019,.911),(.066,.065,.263),grey)
bevel(block('separate_poster_bezel',(.760,-.038,1.028),(.366,.063,.253),panel),.014)
block('separate_dark_grid_panel',(.760,-.074,1.028),(.352,.007,.235),glass)
null('poster_display_anchor',(.760,-.079,1.028))
bevel(block('detached_poster_badge',(.760,-.325,.803),(.103,.051,.024),teal),.006)
bpy.ops.export_scene.gltf(filepath=str(out/'dad321-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.65,-3.71,2.31),(.32,.01,.85),2.77),('detail',(1.45,-2.55,1.65),(0,-.22,1.08),1.50)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
