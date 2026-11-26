"""BTS 06-04: dormant Form 4 exterior and unrelated inert display, nominal meters; Blender -b -t 2 -P model.py."""
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






# Standard Form 4, orange hood held closed. No interior processing or hardware actuation.
machine=null('instrument_anchor',(0,0,0))
orange=material('orange exterior tint represented by opaque shell',(.93,.208,.040),.13,.28)
orangeDark=material('warm orange cover trim',(.48,.056,.014),.27,.31)
neutral=material('brushed grey front wrap',(.50,.52,.48),.56,.36)
rear=material('rear matte graphite',(.064,.072,.066),.25,.43)
dim=material('unpowered black screen',(.028,.042,.045),.22,.27)
rib=material('rear dark metallic grille',(.115,.133,.132),.43,.45)
green=material('teaching wire outline',(.15,.46,.45),.27,.38)
marker=material('inert pale teaching block',(.36,.56,.54),.22,.35)
def part(name,p,d,m,w=.005,n=4):
 return bevel(block(name,p,d,m,machine),w,n)
part('closed_orange_outer_hood',(0,-.004,.365),(.398,.359,.378),orange,.029,6)
part('dark_top_hinge_style_external_cap',(0,.152,.539),(.273,.057,.028),rear,.007)
part('flat_external_lower_hood_rim',(0,-.003,.173),(.396,.352,.018),orangeDark,.005)
part('lower_grey_outer_shell',(0,.003,.089),(.398,.358,.160),neutral,.019,6)
part('dark_external_bottom_plinth',(0,.001,.012),(.348,.320,.020),rear,.006)
for x in [-.130,.130]:
 for y in [-.108,.108]:rod('fixed_base_foot',(x,y,.004),.017,.008,rear,machine,20)
part('front_neutral_fascia',(-.094,-.180,.091),(.184,.007,.136),neutral,.003)
part('blank_front_touchscreen',(.094,-.1818,.091),(.176,.0034,.130),dim,.0013)
part('front_mark_silhouette',(-.126,-.182,.042),(.076,.002,.012),rib,.001)
part('dark_rear_main_shroud',(0,.173,.343),(.282,.016,.366),rear,.006)
part('dark_rear_base_wrap',(0,.181,.090),(.387,.004,.126),rear,.012)
part('rear_grille_cosmetic_frame',(0,.1826,.083),(.240,.0018,.091),rib,.005)
for i in range(9):part('rear_grille_visual_slot',(0,.183,.050+i*.008),(.216,.001,.0025),dim,.0007,2)
for x in [-.150,.150]:
 part('opaque_rear_port_recess',(x,.1826,.070),(.024,.0018,.055),dim,.004)
 for z in [.058,.079]:part('blocked_port_silhouette',(x,.183,z),(.010,.001,.010),rear,.001)
# Separate fixed, fictional educational shelf window and cube; no relation to Form 4 volume.
bevel(block('standalone_demo_base',(.466,-.025,.021),(.303,.277,.041),rear),.011)
center=(.466,-.023,.135)
for xx in [-.064,.064]:
 for yy in [-.048,.048]:
  block('demo_window_z_edge',(center[0]+xx,center[1]+yy,center[2]),(.004,.004,.120),green)
for xx in [-.064,.064]:
 for zz in [-.060,.060]:
  block('demo_window_y_edge',(center[0]+xx,center[1],center[2]+zz),(.004,.096,.004),green)
for yy in [-.048,.048]:
 for zz in [-.060,.060]:
  block('demo_window_x_edge',(center[0],center[1]+yy,center[2]+zz),(.128,.004,.004),green)
bevel(block('detached_demo_block',center,(.106,.072,.088),marker),.002)
bevel(block('detached_position_switch',(.466,-.116,.048),(.079,.039,.016),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'form4-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(1.40,-1.58,1.01),(.21,0,.275),1.35),('detail',(-.51,1.45,.65),(0,.01,.277),1.02)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
