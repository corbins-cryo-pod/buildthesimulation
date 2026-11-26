"""BTS 16-06: Mettler Toledo AE100 reconstruction, nominal meters; Blender -b -t 2 -P model.py."""
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
ivory=material('ivory polymer',(.78,.768,.71),.05)
graphite=material('charcoal controls',(.033,.047,.053),.08)
blue=material('control and simulated action accent',(.03,.44,.47),.23)
steel=material('brushed stainless pan',(.61,.68,.69),.73,.33)
glass=material('draft shield glazing',(.61,.80,.81),0,.12)
glass.surface_render_method='BLENDED';glass.diffuse_color=(.61,.8,.81,.15);glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.15
gold=material('virtual reference weight',(.56,.40,.13),.61)
def bevel(o,w=.006,n=3):
 m=o.modifiers.new('Edge radius inferred from photos','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
bevel(block('housing_envelope_base',(0,0,.034),(.205,.410,.060),ivory),.008)
bevel(block('rear_column',(0,.102,.169),(.190,.203,.222),ivory),.008)
for x in [-.078,.078]:
 for y in [-.160,.164]:
  rod('leveling_foot',(x,y,.006),.012,.012,graphite,n=20)
  rod('foot_seat',(x,y,.014),.008,.007,steel,n=16)
block('chamber_floor',(0,-.083,.065),(.174,.158,.006),steel)
for x in [-.094,.094]:
 for y in [-.161,-.009]:
  block('chamber_post',(x,y,.171),(.011,.012,.220),ivory)
for x in [-.092,.092]:
 block('door_lower_rail',(x,-.087,.066),(.014,.160,.007),graphite)
 block('door_upper_rail',(x,-.089,.281),(.014,.160,.009),ivory)
for y in [-.162,-.008]:
 block('front_rear_top_rail',(0,y,.285),(.205,.012,.010),ivory)
block('draft_glazing_front',(0,-.161,.172),(.173,.004,.211),glass)
block('fixed_left_door',(-.093,-.073,.173),(.003,.156,.211),glass)
block('fixed_left_door_grip',(-.097,-.146,.096),(.007,.012,.038),graphite)
block('top_draft_glazing',(0,-.087,.281),(.174,.155,.004),glass)
block('top_handle',(.058,-.119,.285),(.012,.030,.006),graphite)
door=null('right_draft_door',(.094,-.083,.172))
block('right_draft_glazing',(0,0,0),(.003,.153,.211),glass,door)
block('right_door_end_rail',(0,-.075,0),(.007,.008,.213),graphite,door)
block('door_handle',(.006,-.069,-.074),(.010,.014,.036),blue,door)
rod('pan_stem',(0,-.092,.076),.008,.019,steel,n=20)
rod('weighing_pan',(0,-.092,.087),.040,.005,steel,n=48)
# Vessel and weight are nominal display props, not sources of geometry-derived mass.
vessel=null('vessel_2g',(0,-.092,.091))
rod('vessel_plate',(0,0,.002),.024,.004,ivory,vessel)
bpy.ops.mesh.primitive_torus_add(major_radius=.022,minor_radius=.0025,major_segments=30,minor_segments=9,location=(0,0,.010));o=bpy.context.object;attach(o,'vessel_rim',(.049,.049,.007),ivory,vessel)
weight=null('weight_reference',(0,-.092,.096))
rod('weight_body',(0,0,.011),.009,.017,gold,weight,n=32)
rod('weight_cap',(0,0,.024),.005,.010,gold,weight,n=22)
o=bevel(block('display_bezel',(0,-.175,.065),(.170,.048,.013),graphite),.004);o.rotation_euler.x=.48
o=block('display_glass',(0,-.174,.069),(.150,.030,.009),screen);o.rotation_euler.x=.48
null('display_texture_anchor',(0,-.174,.074))
o=bevel(block('tare_bar',(0,-.193,.058),(.153,.014,.008),graphite),.005);o.rotation_euler.x=.45
block('tare_bar_tint',(0,-.197,.061),(.045,.005,.005),blue)
rod('bubble_level',(-.066,-.146,.063),.008,.003,green,n=24)
block('bubble_mark',(-.066,-.146,.065),(.004,.004,.001),ivory)
block('calibrate_handle',(.101,.017,.036),(.017,.036,.006),graphite)
block('instruction_card_slot',(0,-.203,.027),(.095,.003,.005),graphite)
block('rear_connection_plate',(0,.203,.196),(.165,.003,.082),graphite)
for x,y,z,w,h,k in [(-.034,.204,.221,.032,.024,'mains'),(.019,.205,.205,.037,.011,'data'),(.054,.205,.221,.011,.011,'foot_switch'),(-.034,.205,.188,.013,.011,'fuse')]:
 block('rear_'+k,(x,y,z),(w,.006,h),dark)
for i in range(5):block('rear_air_slot_'+str(i),(-.064+.032*i,.204,.089),(.020,.004,.004),graphite)
bpy.ops.export_scene.gltf(filepath=str(out/'ae100.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.38,.40,.41)
 scene.render.resolution_x=620;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.52,-.72,.45),(0,-.006,.15),.510),('rear',(.45,.71,.397),(0,.038,.14),.520)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
