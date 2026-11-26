"""BTS 15-09: classic IVIS Spectrum stationary case and independent pattern display, nominal meters; Blender -b -t 2 -P model.py."""
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












# The dark solid original-spectrum exterior deliberately omits every interior and operative element.
machine=null('instrument_anchor',(0,0,0))
dark=material('graphite-gray body paint',(.099,.113,.118),.29,.42)
panel=material('slightly darker fixed door front',(.076,.097,.105),.27,.38)
gloss=material('coal upper external dome',(.088,.118,.126),.31,.29)
bright=material('silver handle and fascia strip',(.54,.59,.58),.52,.36)
rubber=material('matte unpowered foot',(.042,.056,.055),.18,.43)
marker=material('unlettered warm badge color',(.68,.28,.044),.23,.45)
teaching=material('generic separate monitor housing',(.034,.060,.066),.17,.42)
def part(name,p,d,m,w=.006,n=4):
 return bevel(block(name,p,d,m,machine),w,n)
part('main_dark_central_column',(0,.008,1.298),(.650,.712,1.031),dark,w=.020)
part('rear_inferred_outer_shell',(0,.353,1.027),(.610,.064,1.568),dark,w=.011)
part('lower_dark_pedestal',(0,.000,.353),(.632,.741,.533),dark,w=.023)
part('lower_front_seam_strip',(0,-.373,.636),(.601,.017,.035),bright,w=.004)
part('fixed_lower_mid_face',(0,-.367,.743),(.626,.025,.180),panel,w=.008)
part('closed_nonopening_front_door',(-.040,-.359,1.279),(.548,.022,.858),panel,w=.009)
part('fixed_vertical_flank',(.278,-.358,1.282),(.078,.020,.864),dark,w=.005)
part('dome_square_support_band',(0,0,1.777),(.650,.769,.139),dark,w=.014)
o=rod('opaque_upper_dome_transition',(0,.014,1.846),.258,.035,gloss,machine,64)
bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=28,radius=1,location=(0,.017,1.748))
s=attach(bpy.context.object,'sealed_external_camera_profile_dome',(.500,.479,.724),gloss,machine)
for p in s.data.polygons:p.use_smooth=True
for x in [-.255,.255]:
 for y in [-.314,.314]:
  part('static_wheel_bracket',(x,y,.091),(.054,.054,.038),bright,w=.004)
  w=rod('fixed_base_caster',(x,y,.044),.044,.033,rubber,machine,24);w.rotation_euler.y=math.pi/2
  w=rod('decorative_caster_hub',(x,y,.044),.018,.036,bright,machine,20);w.rotation_euler.y=math.pi/2
# External features only; no handle release, working opening or control.
for z in [1.196,1.528]:
 part('fixed_handle_mount',(.191,-.369,z),(.042,.017,.036),dark,w=.004)
 part('opaque_handle_leg',(.192,-.375,z),(.026,.018,.022),bright,w=.003)
part('fixed_front_silver_handle',(.193,-.382,1.362),(.023,.006,.364),bright,w=.002)
part('blank_ivis_badge',(-.221,-.379,.779),(.095,.004,.031),rubber,w=.002)
part('blank_badge_top_stripe',(-.222,-.381,.790),(.091,.002,.007),marker,w=.001)
part('unlettered_base_circle',(.173,-.382,.737),(.047,.004,.047),bright,w=.009)
part('blank_maker_identity_emboss',(.244,-.378,1.782),(.071,.007,.026),bright,w=.004)
# Stand-alone fictional display, not a workstation control for the surrounding hardware.
bevel(block('detached_pattern_table',(.762,-.091,.777),(.467,.461,.047),teaching),.012)
for x in [.591,.932]:
 for y in [-.243,.070]:block('detached_support_leg',(x,y,.382),(.049,.049,.764),bright)
block('detached_display_riser',(.762,.001,.897),(.063,.053,.216),dark)
bevel(block('detached_pattern_monitor',(.762,-.011,1.053),(.394,.055,.265),teaching),.011)
block('generic_pattern_screen',(.762,-.042,1.053),(.375,.003,.242),panel)
null('intensity_view_anchor',(.762,-.045,1.053))
bevel(block('standalone_pattern_switch',(.762,-.247,.809),(.094,.043,.017),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'ivis-spectrum-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.76,-4.20,2.68),(.33,0,1.05),3.69),('detail',(-1.03,-2.75,2.44),(.022,-.16,1.398),2.23)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
