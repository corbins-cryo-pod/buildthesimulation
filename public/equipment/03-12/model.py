"""BTS 03-12: Harrick PDC-32G-2 documentary exterior, nominal meters; Blender -b -t 2 -P model.py."""
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
shell=material('old ivory powdercoat',(.80,.79,.72),.11,.43)
black=material('charcoal front and rear faces',(.038,.043,.047),.19,.44)
stainless=material('visible inert exterior hardware',(.53,.60,.62),.73,.31)
viewglass=material('dark viewing glass proxy',(.071,.127,.164),.48,.20)
red=material('nonfunctional red rocker cap',(.52,.073,.050),.13)
ochre=material('darkened status lens rings',(.57,.34,.092),.44)
teal=material('non-OEM teaching badges',(.025,.55,.51),.2)
def bevel(o,w=.004,n=3):
 m=o.modifiers.new('Slight exterior corners','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted exterior normals','WEIGHTED_NORMAL');return o
def cylY(name,p,r,depth,mat,n=24):
 o=rod(name,p,r,depth,mat,n=n);o.rotation_euler.x=math.pi/2;return o
bevel(block('nominal_housing',(0,0,.11095),(.254,.2032,.2099),shell),.004)
for x in [-.099,.099]:
 for y in [-.081,.081]:rod('rubber_feet',(x,y,.003),.011,.006,black,n=14)
bevel(block('inset_front_plate',(0,-.102,.1105),(.243,.003,.196),black),.002)
bevel(block('inset_rear_plate',(0,.1013,.1095),(.243,.002,.199),black),.002)
for y in [-.1016,.1024]:
 for x in [-.108,.108]:
  for z in [.028,.191]:cylY('case_fastener',(x,y,z),.004,.002,stainless,n=10)
# Door, window and control silhouettes are not connected to any logic.
block('fixed_door_base',(-.030,-.104,.132),(.117,.006,.126),black)
cylY('fixed_door_face',(-.022,-.1135,.127),.055,.020,black,n=38)
cylY('view_window_recess',(-.021,-.124,.121),.024,.004,dark,n=32)
cylY('fixed_view_window',(-.021,-.127,.121),.020,.004,viewglass,n=32)
for z in [.082,.171]:bevel(block('decorative_door_hinge',(-.080,-.107,z),(.023,.011,.013),stainless),.003)
o=rod('fixed_crosspiece',(-.026,-.130,.144),.0055,.099,stainless,n=24);o.rotation_euler.y=math.pi/2
rod('fixed_upper_form',(-.063,-.134,.166),.0053,.048,stainless,n=16)
bevel(block('fixed_front_handle',(.008,-.133,.152),(.014,.013,.055),black),.003)
bevel(block('decorative_front_rocker',(-.076,-.104,.041),(.020,.008,.023),red),.002)
for x in [-.046,.075]:
 cylY('off_indicator_ring',(x,-.105,.042),.0063,.006,ochre,n=18)
 cylY('off_indicator_glass',(x,-.108,.042),.0035,.003,black,n=16)
cylY('fixed_front_dial',(.080,-.106,.110),.019,.012,black,n=32)
o=bevel(block('fixed_dial_grip',(.080,-.113,.110),(.007,.004,.035),dark),.002);o.rotation_euler.y=.57
# External rear visual blanks only; no pump or hose geometry.
bevel(block('rear_fan_frame',(-.069,.104,.154),(.059,.007,.058),black),.004)
cylY('rear_fan_recess',(-.069,.107,.154),.025,.004,dark,n=26)
for i in range(7):
 x=-.091+i*.0072;block('fan_guard_bar',(x,.110,.154),(.0024,.002,.043),stainless)
for x in [-.094,-.045]:
 for z in [.129,.179]:cylY('fan_guard_fastener',(x,.110,z),.0023,.003,stainless,n=9)
cylY('rear_circle_blank',(.023,.104,.142),.020,.004,black,n=26)
cylY('rear_center_blind',(.023,.107,.142),.007,.005,stainless,n=16)
bevel(block('rear_inlet_blank',(.070,.104,.041),(.045,.007,.035),black),.004)
block('rear_blind_fuse_caps',(.041,.106,.044),(.012,.003,.019),stainless)
block('rear_plain_id_plate',(.071,.103,.093),(.052,.001,.036),base)
# Two detachable teaching overlay markers above the case: not device controls.
bevel(block('grid_overlay_target',(-.057,-.047,.220),(.045,.029,.006),teal),.003)
bevel(block('turn_overlay_target',(.006,-.047,.220),(.045,.029,.006),ochre),.003)
bpy.ops.export_scene.gltf(filepath=str(out/'pdc32g2-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.39,.41,.43)
 scene.render.resolution_x=640;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.34,-.56,.38),(0,0,.109),.475),('rear',(.34,.56,.36),(0,0,.109),.458)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
