"""BTS 02-12: Nikon ECLIPSE LV100ND LED upright reconstruction, nominal meters; Blender -b -t 2 -P model.py."""
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
ivory=material('warm pale gray body',(.75,.75,.71),.14,.42)
grey=material('medium gray inserts',(.29,.34,.35),.18)
graphite=material('dark optical barrels',(.04,.05,.055),.12)
blue=material('focus knob accents',(.055,.36,.42),.22)
yellow=material('10x and 20x option indicator',(.84,.56,.075),.34)
green=material('20x selection ring',(.06,.51,.37),.27)
steel=material('steel stage and guides',(.63,.69,.69),.66)
purple=material('front glass',(.13,.18,.26),.37)
brass=material('inert trace coupon',(.49,.34,.213),.62)
def bevel(o,w=.009,n=3):
 m=o.modifiers.new('Inferred curved corner','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Smooth weighted normals','WEIGHTED_NORMAL');return o
def pipe(name,A,B,r,m,n=28):
 a,b=Vector(A),Vector(B);d=b-a
 o=rod(name,tuple((a+b)*.5),r,d.length,m,n=n);o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return o
bevel(block('base_footprint',(0,0,.034),(.251,.386,.058),ivory),.026,6)
for x in [-.099,.099]:
 for y in [-.130,.138]:rod('foot',(x,y,.0035),.014,.007,graphite,n=12)
bevel(block('c_stand_rear',(0,.137,.219),(.131,.107,.334),ivory),.022,5)
bevel(block('stand_neck_dovetail',(0,.050,.353),(.130,.226,.081),ivory),.022,5)
bevel(block('focus_mechanism',(0,.021,.127),(.147,.131,.136),grey),.014,3)
for sign in [-1,1]:
 o=rod('focus_knob' if sign==1 else 'left_focus_knob',(sign*.109,.035,.121),.031,.038,graphite,n=36);o.rotation_euler.y=math.pi/2
 o=rod('fine_focus_cap',(sign*.132,.035,.121),.022,.013,blue,n=28);o.rotation_euler.y=math.pi/2
for y in [-.039,.086]:block('stage_z_guide',(0,y,.168),(.108,.019,.104),steel)
stage=null('stage_translation',(0,-.078,.189))
bevel(block('stage_sled',(0,0,0),(.204,.162,.017),graphite,stage),.008)
bevel(block('metal_stage',(0,-.005,.013),(.186,.145,.012),steel,stage),.006)
block('stage_insert',(0,0,.020),(.114,.096,.003),graphite,stage)
block('inert_micrometer_coupon',(0,0,.022),(.026,.019,.001),brass,stage)
for i in range(11):block('engraving_display',(-.009+i*.0017,-.001,.0226),(.00055,.012,.00020),ivory,stage)
for x in [-.071,.071]:block('stage_clamp',(x,.029,.020),(.037,.040,.007),grey,stage)
rod('condenser_body',(0,-.067,.152),.038,.034,graphite,n=30)
for x in [-.121,.121]:
 rod('stage_position_handle',(x,-.065,.158),.010,.049,grey,n=16)
 rod('stage_bearing',(x,-.065,.123),.012,.029,graphite,n=18)
bevel(block('epi_light_beam_housing',(0,.088,.356),(.152,.404,.073),graphite),.009)
for x in [-.080,.080]:pipe('illumination_adjust', (x,.090,.361),(x*1.28,.090,.361),.010,grey)
bevel(block('front_cube_housing',(0,-.110,.358),(.155,.130,.085),ivory),.011)
bevel(block('top_binocular_tube',(0,-.069,.458),(.153,.162,.096),ivory),.021,5)
bevel(block('upper_dark_cover',(0,-.073,.495),(.139,.127,.022),graphite),.007)
rod('trinocular_port_cap',(0,-.027,.504),.023,.004,graphite,n=28)
for x in [-.046,.046]:
 pipe('eyetube', (x*.70,-.128,.431),(x,-.243,.465),.027,grey)
 pipe('eyepiece_sleeve',(x,-.205,.457),(x,-.277,.481),.027,graphite)
 pipe('rubber_eye_cup',(x,-.264,.477),(x,-.293,.487),.031,graphite)
 pipe('eyepiece_glass',(x,-.292,.486),(x,-.294,.487),.017,purple,n=24)
pipe('rear_led_lamphouse',(0,.268,.354),(0,.325,.354),.037,graphite)
for z in [.032,.046,.059]:block('rear_vent',(0,.189,z),(.079,.004,.005),graphite)
block('back_connector',(0,.193,.029),(.029,.007,.015),graphite)
rod('base_light_switch',(.067,-.149,.063),.010,.006,blue,n=20)
turret=null('objective_turret',(0,-.031,.306))
rod('turret_index_plate',(0,0,-.006),.063,.015,graphite,turret,n=44)
for j in range(5):
 a=j*2*math.pi/5;x=.047*math.sin(a);y=-.047*math.cos(a)
 if j in (0,1):
  length=.066 if j==0 else .079; stem=.010;ring=yellow if j==0 else green
  rod('objective_10x' if j==0 else 'objective_20x',(x,y,-stem-length/2),.0145,length,steel,turret,n=30)
  rod('objective_color_ring',(x,y,-stem-length*.76),.0155,.005,ring,turret,n=30)
  rod('objective_front',(x,y,-stem-length+.002),.009,.005,purple,turret,n=24)
 else:
  rod('unused_mount_cap',(x,y,-.018),.013,.011,grey,turret,n=24)
rod('objective_action',(0,-.058,.004),.011,.006,blue,turret,n=20)
bpy.ops.export_scene.gltf(filepath=str(out/'lv100nd.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.38,.41,.42)
 scene.render.resolution_x=640;scene.render.resolution_y=438;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.71,-.87,.68),(0,.010,.263),.87),('side',(.96,-.087,.59),(0,-.018,.273),.87)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
