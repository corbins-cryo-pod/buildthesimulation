"""BTS 13-08: external Leica EM ICE with passive detached teaching exhibits, nominal meters; Blender -b -t 2 -P model.py."""
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


# Nominal body + working station from Leica. No internal systems or operational geometry.
machine=null('instrument_anchor',(0,0,0))
cream=material('white ivory exterior',(.82,.83,.80),.09,.44)
light=material('smooth warm grey shell',(.68,.71,.70),.20,.43)
matte=material('charcoal fittings',(.065,.075,.080),.19,.36)
darkest=material('off screen matte glass',(.035,.058,.060),.18,.43)
signal=material('cosmetic red accent',(.66,.045,.061),.23,.48)
tag=material('neutral brushed exhibit metal',(.40,.54,.55),.36,.35)
def part(name,p,d,m,w=.012):
 return bevel(block(name,p,d,m,machine),w,4)
part('low_body_left_shell',(-.285,.023,.407),(.590,.744,.638),cream,.022)
part('low_body_right_shell',(.297,.023,.407),(.566,.744,.638),light,.025)
part('upper_left_base_trim',(-.285,.023,.804),(.590,.744,.154),light,.010)
part('upper_workstation_rear_shell',(.345,.088,.806),(.470,.550,.160),light,.017)
part('upper_left_tall_shroud',(-.280,.112,1.083),(.600,.566,.404),cream,.025)
part('upper_mid_facade',(-.108,-.171,.789),(.301,.251,.221),light,.020)
part('right_workstation_apron',(.423,-.118,.778),(.314,.245,.223),cream,.021)
part('working_surface_closed',(.163,-.212,.738),(.788,.366,.032),matte,.019)
part('front_lower_shell_panel',(.050,-.351,.375),(.475,.006,.563),cream,.009)
part('black_base_shadow',(.037,-.294,.106),(.904,.106,.066),matte,.014)
# Cosmetic status/display and red cover; solid approximations, no movable assemblies.
block('upper_red_trim',(-.420,-.176,1.188),(.279,.004,.022),signal,machine)
block('upper_brand_plaque_blank',(-.280,-.177,1.155),(.142,.005,.013),light,machine)
a=part('unpowered_panel_cowl',(.405,-.263,.816),(.241,.053,.122),cream,.010);a.rotation_euler.x=math.radians(-18)
a=part('inactive_screen_glass',(.403,-.293,.828),(.188,.011,.082),darkest,.006);a.rotation_euler.x=math.radians(-18)
part('closed_red_exterior_cover',(.152,-.301,.799),(.126,.076,.093),signal,.014)
part('black_cover_support',(.152,-.304,.772),(.153,.105,.034),matte,.008)
part('guard_silhouette',(.158,-.252,.780),(.149,.014,.059),steel,.004)
# Fixed and opaque exterior inclusions; no optical train.
part('m80_external_support',(.286,.144,.975),(.123,.124,.230),cream,.020)
part('m80_external_arm',(.216,.051,1.041),(.226,.141,.095),light,.019)
part('m80_outer_visor',(.141,-.069,1.084),(.216,.197,.139),cream,.025)
part('m80_binocular_cowl',(.142,-.131,1.139),(.178,.099,.101),cream,.018)
rod('m80_lower_opaque_barrel',(.142,-.079,.991),.053,.075,matte,machine,32)
for x in [.105,.180]:
 pipe('fixed_eyepiece',(x,-.154,1.156),(x,-.216,1.199),.022,matte,n=22).parent=machine
 pipe('eyepiece_rim',(x,-.212,1.198),(x,-.227,1.210),.025,matte,n=26).parent=machine
for x in [-.465,.465]:
 for y in [-.289,.293]:
  part('caster_fork',(x,y,.103),(.045,.048,.095),steel,.005)
  w=rod('dark_caster_wheel',(x,y,.044),.044,.034,matte,machine,24);w.rotation_euler.y=math.pi/2
# Independent floor-standing exhibit far from the machine, not a device accessory.
bevel(block('detached_exhibit_stand_top',(.934,-.138,.817),(.480,.356,.043),matte),.013)
for x in [.769,1.099]:
 for y in [-.239,-.039]:block('exhibit_leg',(x,y,.398),(.041,.041,.796),grey)
bevel(block('detached_tile_a',(.826,-.134,.844),(.060,.080,.010),tag),.002)
bevel(block('detached_tile_b',(1.014,-.134,.844),(.120,.050,.010),tag),.002)
bevel(block('detached_display_badge',(.938,-.256,.849),(.100,.053,.025),teal),.006)
bpy.ops.export_scene.gltf(filepath=str(out/'leica-em-ice-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.7,-3.6,2.09),(.30,-.03,.65),2.75),('detail',(1.65,-2.01,1.72),(-.003,-.04,.81),1.59)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
