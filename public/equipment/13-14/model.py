"""BTS 13-14: stationary Thermo HM 325A housing and separately authored diagram, nominal meters; Blender -b -t 2 -P model.py."""
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



# The housing represents historic 902100A size only; working implements are not modeled.
machine=null('instrument_anchor',(0,0,0))
pur=material('neutral blue console',(.39,.56,.68),.19,.37)
white=material('aged textured white enclosure',(.83,.84,.80),.15,.47)
mid=material('internal-looking facades are solid grey covers',(.42,.46,.46),.37,.38)
black=material('dark chart bezel',(.045,.065,.070),.22,.41)
def part(name,p,d,m,w=.012):
 return bevel(block(name,p,d,m,machine),w,4)
part('rounded_full_outer_base',(0,0,.029),(.420,.490,.048),white,.023)
for x in [-.145,.145]:
 for y in [-.188,.188]:rod('fixed_rubber_foot',(x,y,.007),.019,.014,black,machine,16)
part('upright_outer_casing',(0,.106,.152),(.327,.271,.241),white,.034)
part('brushed_flat_top',(0,.135,.276),(.205,.155,.008),steel,.006)
part('smooth_lower_front_facade',(0,-.044,.127),(.285,.046,.172),white,.015)
part('recessed_dark_backplate',(0,-.070,.148),(.082,.009,.103),black,.011)
x=part('sloped_static_left_control_face',(-.113,-.066,.166),(.058,.022,.160),pur,.007)
x.rotation_euler.x=math.radians(-14)
x=part('blank_counter_window',(-.114,-.080,.184),(.033,.005,.018),black,.005)
x.rotation_euler.x=math.radians(-14)
part('left_exterior_red_mark_blank',(-.072,-.070,.223),(.041,.004,.007),grey,.002)
part('right_exterior_mark_blank',(.072,-.070,.223),(.047,.004,.007),pur,.002)
# Fixed silhouette in the visible front recess. No edge, specimen, clamp slot or movement.
part('dormant_front_block',(0,-.081,.111),(.084,.043,.071),mid,.006)
part('solid_oversized_protective_shroud',(0,-.131,.083),(.180,.103,.081),steel,.010)
part('fixed_lower_shroud',(0,-.167,.061),(.182,.042,.030),mid,.007)
for x in [-.123,.123]:
 part('front_tray_inner_rail',(x,-.147,.048),(.052,.156,.032),white,.010)
part('front_outer_tray_rounded_lip',(0,-.199,.041),(.312,.065,.036),white,.017)
for x in [-.149,.149]:
 part('tray_side_block',(x,-.139,.061),(.054,.162,.046),white,.016)
# Knobs and right wheel are outer silhouettes permanently fixed to the housing.
for x,r in [(.174,.073),(-.174,.052)]:
 w=rod('static_main_wheel' if x>0 else 'static_secondary_wheel',(x,.098,.132),r,.026,white,machine,48)
 w.rotation_euler.y=math.pi/2
 w=rod('static_outer_wheel_handle',(x+.015*math.copysign(1,x),.072,.151),.014,.038,black,machine,24)
 w.rotation_euler.y=math.pi/2
# Dry unrelated plaque set on a detached pedestal, never a machine part.
bevel(block('unrelated_diagram_plinth',(.414,-.010,.022),(.279,.318,.044),black),.015)
bevel(block('unrelated_upright_bezel',(.426,.048,.165),(.226,.038,.164),black),.012)
block('opaque_display_glass',(.426,.026,.165),(.212,.006,.150),grey)
null('detached_diagram_screen_anchor',(.426,.022,.165))
bevel(block('detached_diagram_badge',(.426,-.123,.056),(.081,.045,.027),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'hm325a-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(1.28,-1.43,.85),(.145,0,.134),1.05),('detail',(-.65,-1.16,.68),(-.05,-.02,.15),.665)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
