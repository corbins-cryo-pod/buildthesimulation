"""BTS 08-04: Finetech FINEPLACER lambda A7 reconstruction; Blender meters; Blender -b -t 2 -P model.py."""
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
beige=material('bronze facing of positioning table',(.57,.48,.30),.52)
rubber=material('rubber mat and black housing',(.045,.047,.046),.05,.7)
glass=material('beam splitter prism',(.23,.54,.58),.3)
blue=material('optical position switch proxy',(.03,.62,.63))
gold=material('inert surrogate carrier and pads',(.87,.55,.153),.47)
# Four known dimensions of the base module and controller are from Finetech rev 1.1 p.44.
block('baseplate',(0,0,.044),(.620,.420,.061),rubber)
for x in [-.252,.252]:
 for y in [-.159,.159]:
  rod('leveling_foot',(x,y,.008),.026,.016,dark,n=16)
  rod('base_level_fastener',(x,y,.071),.011,.008,silver,n=16)
block('rear_frame',(0,.129,.223),(.406,.136,.300),base)
block('support_bridge',(.005,.066,.371),(.431,.213,.116),rubber)
block('bridge_front_bezel',(.005,-.042,.375),(.426,.008,.065),dark)
for x in [-.18,-.155,-.13,.14,.165,.19]:
 block('bridge_vent',(x,.172,.378),(.012,.006,.049),dark)
block('bearing_mount',(0,.096,.183),(.148,.148,.068),silver)
for x in [-.070,.070]:
 o=rod('pivot_pin',(x,.096,.175),.029,.065,amber);o.rotation_euler.y=math.pi/2
# Coordinate origin of this group is the real type of transverse swing pivot.
arm=null('placer_arm',(0,.096,.175))
block('arm_beam',(0,0,.087),(.075,.047,.160),dark,arm)
block('arm_end_boss',(0,.009,.159),(.068,.058,.036),silver,arm)
o=rod('vacuum_tool_holder',(0,-.023,.171),.016,.038,silver,arm);o.rotation_euler.x=math.pi/2
o=rod('vacuum_tool_tip',(0,-.046,.171),.006,.010,dark,arm,n=14);o.rotation_euler.x=math.pi/2
block('virtual_die',(0,-.0515,.171),(.00155,.001,.0015),gold,arm)
rod('arm_toggle',(.041,-.013,.114),.013,.008,amber,arm,n=16)
# Granite-like table on air bearing, with inset carrier support and fine micrometers.
table=null('carrier_stage',(0,-.080,.091))
block('air_bearing_table',(0,0,-.003),(.360,.237,.019),silver,table)
block('carrier_platen',(0,.012,.013),(.269,.155,.022),beige,table)
for x in [-.128,.128]:
 block('side_rail',(x,-.005,.027),(.023,.204,.024),silver,table)
 block('carrier_edge_block',(x*.74,-.052,.033),(.044,.055,.018),dark,table)
block('central_insert',(0,.004,.030),(.111,.070,.008),dark,table)
block('carrier_teaching_coupon',(0,.005,.0318),(.009,.007,.001),gold,table)
for x,y,k in [(.184,.015,'right'),(-.127,-.127,'front'),(.123,-.127,'z')]:
 o=rod('micrometer_'+k,(x,y,.031),.009,.036,silver,table,n=20)
 if k=='right':o.rotation_euler.y=math.pi/2
 else:o.rotation_euler.x=math.pi/2
# Optical barrel slides laterally; only its functional positions are modeled.
opt=null('optical_carriage',(0,-.079,.321))
block('coax_alignment_box',(0,0,-.015),(.102,.083,.063),dark,opt)
block('prism_window',(0,-.043,-.016),(.052,.010,.035),glass,opt)
rod('lens_lower_concentric',(0,0,.076),.042,.120,dark,opt)
rod('lens_upper_barrel',(0,0,.189),.026,.143,dark,opt)
rod('focus_collar',(0,0,.140),.034,.022,silver,opt,n=24)
block('camera_head',(0,0,.313),(.067,.064,.115),silver,opt)
block('camera_front_mount',(0,-.033,.314),(.047,.018,.058),dark,opt)
rod('camera_top_cable_gland',(0,0,.369),.008,.020,dark,opt,n=16)
rod('optics_toggle',(.065,-.046,.068),.017,.011,blue,opt,n=20)
for x in [-.15,.15]:
 block('carriage_linear_rail_'+str(x),(x,-.019,.310),(.081,.033,.029),silver)
# External documented controller nominal frame 290 W × 310 D × 143 H; port locations inferred.
block('controller_case',(.50,-.016,.0715),(.290,.310,.143),base)
block('controller_front',(.50,-.174,.073),(.276,.007,.112),dark)
block('controller_display',(.459,-.179,.084),(.117,.003,.027),screen)
for x in [.521,.551,.581]:
 block('controller_button',(x,-.180,.061),(.017,.007,.018),silver)
for i,(name,w) in enumerate([('mains',.039),('aux',.038),('fmi',.019),('rs232',.026),('footswitch',.019),('pivot',.024),('support',.039)]):
 block('rear_port_'+name,(.390+.035*i,.142,.083),(w,.006,.019),dark)
 for c in [-.005,.005]:
  o=rod('rear_port_pin',(.390+.035*i+c,.146,.084),.0015,.002,amber,n=8);o.rotation_euler.x=math.pi/2
for x in [.37,.63]:
 for i in range(7):block('controller_vent',(x,.079+.008*i,.144),(.016,.003,.002),dark)
cable('side_camera_cable',[(-.211,-.014,.140),(-.226,-.012,.092),(-.194,.073,.069),(-.145,.116,.104),(-.129,.118,.201)],dark)
block('side_light_stand',(-.222,-.016,.119),(.059,.063,.073),base)
o=rod('side_illumination_tube',(-.155,-.016,.165),.018,.114,dark);o.rotation_euler.y=math.pi/2
o=rod('side_illumination_bezel',(-.095,-.016,.165),.019,.013,silver);o.rotation_euler.y=math.pi/2
bpy.ops.export_scene.gltf(filepath=str(out/'fineplacer-lambda.glb'),export_format='GLB',export_extras=True,export_yup=True)
# Optional small evidence views. Assets are original workbench renders, not hardware photographs.
if 'render-reference' in __import__('sys').argv:
    scene.render.engine='BLENDER_WORKBENCH'
    scene.display.shading.light='STUDIO'
    scene.display.shading.studiolight_rotate_z=.38
    scene.display.shading.color_type='MATERIAL'
    scene.display.shading.show_shadows=True
    scene.display.shading.show_cavity=True
    scene.display.shading.background_type='WORLD'
    scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.34,.37,.38)
    scene.render.resolution_x=600;scene.render.resolution_y=400;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    for name,eye,look,width in [('front',(.26,-1.2,.58),(.15,0,.32),1.20),('side',(.93,-.10,.41),(0,-.015,.24),.85)]:
        bpy.ops.object.camera_add(location=eye)
        camera=bpy.context.object; camera.rotation_euler=(Vector(look)-camera.location).to_track_quat('-Z','Y').to_euler()
        camera.data.type='ORTHO';camera.data.ortho_scale=width;scene.camera=camera
        scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
