"""BTS 14-10. Original design, nominal meters; Blender -b -t 2 -P model.py."""
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
block('baseplate',(0,0,.015),(.32,.22,.018),silver)
for x in [-.132,.132]:
 for y in [-.082,.082]:
  block('rubber_foot',(x,y,.003),(.032,.032,.006),dark)
block('motor_enclosure',(-.026,-.017,.048),(.109,.112,.048),base)
block('gearhead',(-.025,-.018,.071),(.065,.063,.022),dark)
for x in [-.071,.021]:
 for y in [-.061,.025]:
  rod('motor_mount_fastener',(x,y,.073),.0025,.004,silver,n=12)
for i in range(6):
 block('drive_cooling_slot_'+str(i),(-.050+i*.009,-.0735,.052),(.004,.002,.017),dark)
rod('encoder_collar',(-.025,-.018,.084),.018,.012,amber)
rod('replaceable_mandrel',(-.025,-.018,.094),.00495,.014,silver)
rod('mandrel_retainer',(-.025,-.018,.103),.003,.004,dark,n=16)
block('grip_support',(-.083,-.023,.054),(.034,.042,.060),silver)
block('fixed_grip',(-.048,-.02295,.093),(.028,.016,.014),dark)
for i in range(3):
 rod('fixed_grip_screw',(-.055+i*.006,-.023,.101),.0017,.003,silver,n=12)
arm=null('bend_arm',(-.025,-.018,.084))
block('swing_arm',(.021,0,0),(.043,.013,.006),base,arm)
rod('swing_arm_coupler',(0,0,.002),.011,.006,silver,arm)
block('load_sensor_proxy',(.035,0,.003),(.017,.016,.009),amber,arm)
block('mover_guide_rail',(.029,-.009,.002),(.033,.004,.005),dark,arm)
jaw=null('moving_grip',(-.005,-.02295,.094))
block('moving_grip_bottom',(.003,0,-.0038),(.016,.015,.006),dark,jaw)
block('moving_grip_top',(.004,0,.0047),(.015,.015,.006),silver,jaw)
for y in [-.005,.005]:
 rod('moving_grip_screw',(.009,y,.009),.0017,.003,dark,jaw,n=12)
block('continuity_controller',(.097,-.051,.048),(.096,.083,.048),base)
block('controller_face',(.097,-.093,.051),(.094,.002,.040),dark)
block('cycle_counter',(.097,-.0945,.055),(.049,.002,.017),screen)
for i in range(4):
 block('counter_digit_backplane',(.080+i*.011,-.0958,.055),(.007,.001,.011),white)
rod('jog_input',(.071,-.048,.076),.011,.010,green)
rod('stop_visual',(.107,-.05,.076),.009,.010,red)
for i, (x,mat) in enumerate([(.126,red),(.141,blue)]):
 rod('continuity_port_'+str(i),(x,-.05,.075),.004,.007,mat)
cable('fixed_lead',[(.126,-.05,.079),(.111,-.043,.091),(.022,-.080,.040),(-.084,-.073,.038),(-.096,-.024,.089),(-.062,-.021,.100)],red)
cable('return_lead_to_strain_relief',[(.141,-.05,.079),(.142,-.021,.040),(.091,.016,.037),(.032,.013,.074)],blue)
block('lead_strain_relief',(.031,.014,.073),(.018,.012,.010),dark)
# A fixed low-profile open cover rail is intentionally not an enclosure.
for x in [-.152,.152]:
 block('side_mount_rail',(x,.008,.026),(.012,.18,.006),silver)
bpy.ops.export_scene.gltf(filepath=str(out/'cyclic-bend.glb'),export_format='GLB',export_extras=True,export_yup=True)
