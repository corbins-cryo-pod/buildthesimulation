"""BTS 12-09: documentary ZEISS Elyra 7 housing layout, nominal meters; Blender -b -t 2 -P model.py."""
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
bevel(block('large_active_tabletop',(0,0,.822),(1.20,.900,.076),steel),.013)
for x in [-.515,.515]:
 for y in [-.360,.360]:
  bevel(block('table_leg',(x,y,.403),(.088,.091,.806),black),.007)
  rod('table_foot',(x,y,.009),.045,.018,grey,n=16)
for y in [-.360,.360]:block('table_rail',(0,y,.235),(1.080,.065,.067),black)

# Disconnected inactive exterior; only the equipment positions are documented.
bevel(block('axio_observer_7_sr_lower',(-.257,-.114,.998),(.330,.479,.222),ivory),.028,4)
bevel(block('observer_angled_eyepiece_cowl',(-.258,-.270,1.134),(.247,.196,.178),ivory),.027)
bevel(block('observer_rear_column',(-.258,.136,1.190),(.199,.156,.408),ivory),.034,4)
bevel(block('observer_upper_shroud',(-.257,.058,1.416),(.189,.182,.132),ivory),.024)
bevel(block('upper_rear_dark_cap',(-.257,.162,1.435),(.166,.063,.116),black),.006)
rod('dormant_upper_collar',(-.257,.057,1.320),.042,.043,grey,n=24)
bevel(block('nominal_stage_exterior',(-.257,-.054,1.244),(.393,.326,.035),black),.016,4)
block('stage_recess_static',(-.257,-.057,1.265),(.139,.104,.008),steel)
rod('opaque_objective_silhouette',(-.257,-.060,1.201),.039,.046,grey,n=28)
rod('nonfunctional_side_knob',(-.082,-.165,1.006),.025,.033,black,n=22).rotation_euler.y=math.pi/2
block('blue_marking',(-.295,-.354,.991),(.027,.004,.012),blue)
for x in [-.303,-.217]:
 pipe('eyepiece', (x,-.295,1.129),(x,-.371,1.224),.023,black,n=24)
 pipe('eyepiece_rim',(x,-.368,1.222),(x,-.379,1.236),.025,black,n=24)
 pipe('dark_lens_marker',(x,-.379,1.236),(x,-.380,1.238),.018,grey,n=20)
bevel(block('fixed_exterior_module_support',(.163,.150,.930),(.355,.358,.141),grey),.009,3)
bevel(block('elyra_pattern_module_dormant',( .162,.150,1.123),(.430,.426,.247),ivory),.041,5)
bevel(block('pattern_module_dark_front',(.165,-.067,1.105),(.369,.016,.171),black),.012)
block('pattern_module_side_plaque',(.383,.161,1.122),(.006,.126,.141),grey)
for i in range(7):block('module_blank_vent',(.388,.151,1.072+i*.016),(.003,.054,.006),black)
bevel(block('fixed_detector_support',(.155,-.267,.901),(.290,.198,.082),black),.009,3)
bevel(block('duolink_outer_block',(.074,-.204,.996),(.224,.160,.111),grey),.013)
for x in [.138,.274]:
 bevel(block('orca_fusion_bt_outer', (x,-.327,.989),(.102,.124,.103),black),.011)
 pipe('camera_blank_housing',(x,-.393,.989),(x,-.408,.989),.032,steel,n=26)
 pipe('camera_face_blank',(x,-.408,.989),(x,-.410,.989),.023,grey,n=24)
# Separate generic teaching workstation, passive screen only.
bevel(block('generic_monitor_desk',(.961,.058,.795),(.662,.609,.052),black),.014)
for x in [.714,1.216]:
 for y in [-.181,.270]:block('desk_leg',(x,y,.389),(.049,.049,.778),grey)
block('generic_display_foot',(.961,.146,.835),(.210,.150,.02),grey)
block('generic_display_stem',(.961,.150,.928),(.045,.043,.173),grey)
bevel(block('generic_display',(.961,.132,1.105),(.449,.059,.287),black),.015)
block('display_glass',(.961,.099,1.105),(.419,.005,.257),black)
null('comparison_display_anchor',(.961,.094,1.105))
bevel(block('image_select_overlay',(.923,-.110,.828),(.110,.046,.014),teal),.005)
block('keyboard_silhouette',(1.006,-.042,.825),(.335,.096,.014),grey)
bpy.ops.export_scene.gltf(filepath=str(out/'elyra7-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(3.05,-4.15,2.60),(.125,.020,.77),3.25),('detail',(1.14,-2.02,1.70),(-.02,-.02,1.13),1.31)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
