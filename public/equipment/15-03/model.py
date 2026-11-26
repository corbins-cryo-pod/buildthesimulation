"""BTS 15-03: stationary CatWalk XT 10.7 exterior and disconnected shape card, nominal meters; Blender -b -t 2 -P model.py."""
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











# Static exterior only. Panels are opaque, empty and fixed, without routing or acquisition equipment.
machine=null('instrument_anchor',(0,0,0))
blackMat=material('black texture powdercoat',(.065,.082,.089),.28,.44)
edge=material('bright base edge rails',(.55,.60,.61),.59,.34)
trim=material('capped structural insert',(.22,.26,.29),.49,.37)
front=material('opaque fixed dark panel',(.100,.135,.146),.24,.35)
pale=material('fixed light grey top cover surface',(.68,.72,.70),.30,.41)
rubber=material('dark inactive caster tires',(.033,.046,.046),.16,.45)
def part(name,p,d,m,parent=machine,w=.004,n=3):
 return bevel(block(name,p,d,m,parent),w,n)
part('lower_platform_outer_plate',(0,0,.113),(1.300,.674,.045),blackMat,w=.008)
for y in [-.333,.333]:
 part('lower_platform_bright_rail',(0,y,.105),(1.280,.014,.043),edge,w=.002)
for x in [-.605,.605]:
 for y in [-.290,.290]:
  part('fixed_caster_fork',(x,y,.071),(.052,.051,.034),trim,w=.003)
  a=rod('stationary_caster',(x,y,.041),.041,.024,rubber,machine,28);a.rotation_euler.y=math.pi/2
  a=rod('caster_exterior_hub',(x,y,.041),.018,.026,edge,machine,22);a.rotation_euler.y=math.pi/2
for x in [-.565,0,.565]:
 part('main_extrusion_upright',(x,-.152,.613),(.052,.055,1.001),blackMat,w=.005)
 part('subtle_upright_edge',(x-.010,-.181,.613),(.008,.003,.981),trim,w=.001)
part('lower_cross_member',(0,-.147,.528),(1.159,.048,.055),blackMat,w=.004)
part('upper_cross_member',(0,-.143,1.075),(1.171,.052,.064),blackMat,w=.005)
for x in [-.538,.538]:
 a=pipe('fixed_diagonal_brace',(x,.271,.146),(x,-.103,1.123),.014,blackMat,n=18);a.parent=machine
 for z in [.489,.999]:
  part('static_outer_bracket',(x,-.185,z),(.064,.012,.112),trim,w=.003)
# Upper black shroud and raised pale cover are only visual outer planes, with permanently closed ends.
part('upper_opaque_walkway_cowl',(0,-.112,1.142),(1.300,.213,.092),blackMat,w=.008)
part('stationary_upper_dark_shroud',(0,-.132,1.252),(1.251,.130,.118),front,w=.007)
part('solid_upper_panel_center',(0,-.155,1.429),(1.154,.037,.164),pale,w=.006)
for x in [-.582,.582]:
 part('upper_panel_vertical_trim',(x,-.156,1.428),(.020,.044,.180),blackMat,w=.003)
for z in [1.341,1.510]:
 part('upper_panel_horizontal_trim',(0,-.156,z),(1.186,.045,.020),blackMat,w=.003)
part('opaque_fixed_edge_inside',(0,-.162,1.189),(1.220,.084,.022),pale,w=.004)
part('nonfunctional_underframe_box',(0,-.107,.692),(.093,.114,.143),trim,w=.006)
part('nonfunctional_box_cap',(0,-.171,.692),(.071,.018,.109),front,w=.003)
block('blank_wordmark_plate',(0,-.200,1.257),(.306,.003,.035),blackMat,machine)
# Detached teaching display and stand, neither a CatWalk accessory nor otherwise connected.
bevel(block('separate_art_card_stand',(.971,.007,.745),(.410,.402,.042),blackMat),.012)
for x in [.821,1.121]:
 for y in [-.140,.154]:block('separate_art_stand_leg',(x,y,.363),(.047,.047,.726),trim)
block('detached_display_mount',(.971,.112,.873),(.055,.050,.217),trim)
bevel(block('standalone_art_display',(.971,.098,1.018),(.356,.054,.263),blackMat),.013)
block('art_display_glass',(.971,.068,1.018),(.341,.004,.233),front)
null('ink_card_display_anchor',(.971,.065,1.018))
bevel(block('separate_stamp_cycle_badge',(.971,-.146,.771),(.101,.046,.017),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'catwalk-xt-107-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.92,-4.03,2.25),(.255,.01,.76),2.95),('detail',(-.76,-2.49,1.92),(0,-.12,1.145),1.78)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
