"""BTS 13-04: external Thermo Scientific VolumeScope 2 SEM, nominal meters; Blender -b -t 2 -P model.py."""
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

# This is a completely sealed documentary silhouette. Dimensions are visual estimates.
cream=material('shell paint',(.84,.83,.79),.10)
graphite=material('graphite base paint',(.105,.129,.135),.20)
iron=material('dark console cap',(.066,.085,.09),.34)
silver=material('sealed chamber silver',(.58,.61,.60),.39)
recess=material('cosmetic black recess',(.051,.057,.055))
bevel(block('closed_column_console_base',(0,0,.425),(.842,.775,.792),graphite),.028,4)
bevel(block('console_cap',(0,0,.843),(.862,.793,.059),iron),.015)
for x in [-.343,.343]:
 for y in [-.316,.316]:rod('console_foot',(x,y,.027),.043,.054,recess,n=24)
block('base_dark_panel_outline',(0,-.389,.412),(.758,.003,.614),iron)
block('base_cosmetic_front_plate',(0,-.392,.753),(.353,.006,.064),silver)
block('factory_status_window_inactive',(0,-.398,.756),(.038,.006,.021),recess)
block('identification_mark_blank',(.315,-.398,.771),(.057,.003,.016),cream)
bevel(block('sealed_chamber_enclosure',(0,-.068,1.105),(.475,.499,.408),silver),.022,4)
bevel(block('sealed_chamber_covered_front',(0,-.322,1.117),(.389,.032,.351),cream),.021,4)
for i in range(12):
 bevel(block('chamber_cosmetic_rib',(0,-.341,1.008+.019*i),(.340,.005,.006),silver),.0015,2)
block('covered_lower_front_inset',(0,-.344,.974),(.129,.004,.036),recess)
for x in [-.258,.258]:
 bevel(block('closed_side_port_cover',(x,-.024,1.119),(.071,.171,.153),silver),.016)
rod('external_left_support',(-.288,.045,.945),.053,.146,silver,n=26)
bevel(block('column_support_neck',(0,.006,1.324),(.237,.229,.122),silver),.017)
bevel(block('upper_column_white_shroud',(0,.054,1.602),(.365,.412,.599),cream),.028,5)
bevel(block('upper_column_back_case',(0,.238,1.616),(.311,.095,.498),graphite),.013)
block('name_badge_blank',(0,-.156,1.806),(.155,.004,.021),iron)
block('model_badge_blank',(.080,-.156,1.564),(.073,.004,.012),grey)
# One desk and one 24-inch display option; active panel is the only documented dimension.
bevel(block('generic_teaching_desk',(-.930,.021,.785),(.845,.672,.055),black),.012)
for x in [-1.266,-.578]:
 for y in [-.255,.278]:block('desk_leg',(x,y,.384),(.058,.058,.768),grey)
block('monitor_foot',(-.930,.141,.823),(.258,.177,.020),grey)
block('monitor_stem',(-.930,.155,.929),(.051,.050,.196),grey)
bevel(block('monitor_display_bezel',(-.930,.136,1.116),(.548,.059,.354),black),.014)
block('documented_active_display',(-.930,.101,1.116),(.5169397661,.006,.3230873538),recess)
null('stack_display_anchor',(-.930,.097,1.116))
bevel(block('plane_next_overlay',(-.982,-.158,.822),(.109,.052,.015),teal),.005)
block('keyboard_silhouette',(-.899,-.066,.819),(.370,.097,.014),grey)
bpy.ops.export_scene.gltf(filepath=str(out/'volumescope2-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.9,-4.1,2.55),(-.45,0,.93),3.27),('detail',(-.27,-3.47,2.02),(-.015,0,1.13),2.45)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
