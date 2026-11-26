"""BTS 10-08: dormant Sutter BV-10-D documentary geometry, nominal meters; Blender -b -t 2 -P model.py."""
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
ivory=material('cream coated panel',(.77,.77,.68),.13)
black=material('anodized trim and optical housings',(.035,.045,.051),.23)
silver=material('fixed visible hardware',(.57,.62,.64),.65)
red=material('unlit face indicator',(.65,.28,.04),.38)
neutral=material('inactive display disk',(.39,.29,.28),.11)
teal=material('virtual overlay action not present on hardware',(.036,.51,.48),.25)
def bevel(o,w=.005,n=3):
 m=o.modifiers.new('Inferred housing radius','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def pipe(name,A,B,r,mat,n=18):
 a,b=Vector(A),Vector(B);d=b-a
 o=rod(name,tuple((a+b)*.5),r,d.length,mat,n=n);o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return o
bevel(block('base_footprint',(0,0,.018),(.4826,.2286,.026),ivory),.007,4)
for x in [-.202,.202]:
 for y in [-.082,.082]:rod('support_foot',(x,y,.003),.011,.006,black,n=14)
bevel(block('left_desktop_enclosure',(-.131,0,.068),(.217,.218,.082),ivory),.006)
bevel(block('left_black_side',(-.241,0,.069),(.003,.216,.077),black),.002)
block('front_label_placeholder',(-.135,-.110,.057),(.072,.003,.011),base)
pipe('unlit_indicator',(-.190,-.109,.055),(-.190,-.115,.055),.009,red,n=24)
for x in [-.190,-.147]:rod('case_top_fastener',(x,-.035,.110),.004,.002,silver,n=12)
block('rear_blank_plate',(-.158,.111,.059),(.084,.005,.031),black)
for i in range(5):block('rear_vent_silhouette',(-.217+i*.020,.112,.087),(.011,.003,.004),black)
# Dormant silhouettes: no abrasive grade, tool, electrode, or working state.
rod('fixed_pedestal',(.015,-.026,.051),.045,.042,black,n=42)
rod('unpowered_disk',(.015,-.026,.075),.049,.009,neutral,n=48)
bevel(block('manipulator_mount',(.057,.059,.085),(.096,.077,.064),black),.009)
bevel(block('fixed_holder_silhouette',(.069,.036,.120),(.060,.062,.068),silver),.004)
for i,(x,z) in enumerate([(.031,.1962),(.076,.174)]):
 rod('fixed_vertical_column',(x,.066,.132),.007,.098,silver,n=23)
 rod('upper_fixed_knob' if i==0 else 'second_fixed_knob',(x,.066,z),.020,.014,silver,n=28)
o=bevel(block('tilt_joint_silhouette',(.060,.016,.115),(.049,.059,.031),black),.005);o.rotation_euler.y=.4
bevel(block('stereo_scope_base',(.176,.065,.048),(.099,.088,.039),ivory),.009)
rod('stereo_scope_post',(.204,.049,.094),.015,.096,silver,n=27)
head=bevel(block('stereo_scope_shell',(.166,-.030,.121),(.101,.094,.065),ivory),.012,4);head.rotation_euler.x=.18
pipe('fixed_scope_nose',(.163,-.064,.123),(.162,-.083,.096),.025,black,n=28)
for x in [.147,.188]:
 pipe('stereo_outer_tube',(x,-.031,.137),(x,-.064,.169),.016,black,n=25)
 pipe('stereo_rubber_eyecup',(x,-.064,.169),(x,-.084,.189),.019,black,n=25)
 pipe('stereo_glass_proxy',(x,-.084,.189),(x,-.086,.191),.012,screen,n=25)
pipe('fixed_scope_knob',(.208,-.029,.122),(.228,-.029,.122),.017,black,n=27)
path=[(-.206,.085,.102),(-.204,.069,.147),(-.181,.040,.171),(-.147,.018,.181),(-.110,-.003,.181),(-.079,-.020,.164),(-.047,-.033,.137)]
cable('gooseneck_silhouette',path,black)
pipe('unlit_lamp_head',path[-1],(-.034,-.041,.124),.011,black,n=22)
# Teaching badge is separate from its front control silhouettes; it changes only the 2D sample.
bevel(block('facet_selector_overlay',(-.139,-.068,.114),(.066,.026,.007),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'bv10d-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.41,.42)
 scene.render.resolution_x=650;scene.render.resolution_y=420;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.45,-.65,.50),(0,0,.085),.63),('detail',(.32,-.23,.45),(.108,-.016,.103),.34)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
