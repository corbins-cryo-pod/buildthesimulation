"""BTS 16-07: Fisher Scientific Isotemp GPD 05 reconstruction, nominal meters; Blender -b -t 2 -P model.py."""
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
ivory=material('cream enamel',(.79,.785,.716),.14,.47)
grey=material('cool gray front control pod',(.36,.42,.44),.12)
steel=material('brushed reservoir stainless',(.62,.67,.69),.72,.31)
blue=material('panel keypad blue',(.029,.16,.55),.08)
amber=material('virtual probe accent',(.83,.50,.11),.32)
glass=material('clear lid polycarbonate',(.67,.86,.88),0,.13)
glass.surface_render_method='BLENDED';glass.diffuse_color=(.67,.86,.88,.20);glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.20
water=material('synthetic bath preview',(.074,.35,.47),.06,.24)
water.surface_render_method='BLENDED';water.diffuse_color=(.074,.35,.47,.38);water.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.38
def bevel(o,w=.006,n=3):
 m=o.modifiers.new('Radiused inferred shell edge','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Smooth weighted normals','WEIGHTED_NORMAL');return o
bevel(block('enamel_lower_shell',(0,.0125,.043),(.355,.221,.072),ivory),.008)
for x in [-.153,.153]:
 for y in [-.076,.098]:rod('rubber_foot',(x,y,.0045),.013,.009,dark,n=14)
for x in [-.164,.164]:bevel(block('outer_side_wall',(x,.0125,.149),(.027,.221,.152),ivory),.007)
for y in [-.089,.109]:bevel(block('outer_end_wall',(0,y,.149),(.317,.027,.152),ivory),.005)
bevel(block('upper_rim_side_l',(-.164,.0125,.226),(.027,.221,.012),ivory),.005)
bevel(block('upper_rim_side_r',(.164,.0125,.226),(.027,.221,.012),ivory),.005)
for y in [-.092,.116]:bevel(block('enamel_upper_rim_end',(0,y,.226),(.301,.014,.012),ivory),.005)
# The reservoir aperture provides 300 mm across X, 154 mm front to rear, and 150 mm nominal depth.
bevel(block('tank_bottom',(0,.013,.075),(.300,.154,.006),steel),.005)
for x in [-.152,.152]:bevel(block('tank_side',(x,.013,.153),(.004,.162,.150),steel),.002)
for y in [-.066,.092]:bevel(block('tank_end',(0,y,.153),(.300,.004,.150),steel),.002)
for x in [-.153,.153]:bevel(block('stainless_lip_lateral',(x,.013,.230),(.007,.168,.004),steel),.002)
for y in [-.068,.094]:bevel(block('stainless_lip_fore_aft',(0,y,.230),(.308,.008,.004),steel),.002)
for i in range(13):block('diffuser_tray_slats',(-.129+i*.0215,.013,.095),(.016,.137,.005),steel)
for y in [-.051,.077]:block('diffuser_tray_crossbar',(0,y,.095),(.278,.008,.006),steel)
block('water_surface',(0,.013,.170),(.299,.153,.001),water)
sample=null('inert_dummy',(-.038,-.007,.149))
bevel(block('dummy_mass',(0,0,.008),(.043,.037,.035),amber,sample),.004)
rod('dummy_sensor_mark',(0,0,.029),.005,.010,dark,sample,n=14)
rod('thermometer_sensor',(.125,.071,.167),.0028,.102,steel,n=14)
o=rod('thermometer_mount',(.127,.073,.219),.005,.016,dark,n=14);o.rotation_euler.x=math.pi/2
bevel(block('control_pod',(.070,-.102,.096),(.172,.039,.125),grey),.010)
block('lcd_white_bezel',(.039,-.122,.118),(.090,.002,.052),ivory)
block('front_lcd',(.033,-.123,.122),(.067,.002,.034),screen)
null('display_texture_anchor',(.033,-.125,.122))
for i in range(3):bevel(block('preset_key',(.011+i*.021,-.123,.093),(.014,.003,.012),blue),.002)
for i in range(3):bevel(block('side_key',(.075,-.123,.136-i*.018),(.012,.003,.012),blue),.002)
block('rear_connector_plate',(0,.124,.055),(.067,.002,.032),dark)
block('rear_iec_inlet',(.020,.125,.055),(.028,.003,.022),dark)
block('rear_switch',(-.053,.124,.055),(.022,.004,.018),dark)
for x in [-.128,-.089,.065,.102,.139]:
 for z in [.039,.049,.059]:block('rear_vent_slit',(x,.124,z),(.027,.002,.004),dark)
bevel(block('rear_hinge_plate',(0,.118,.220),(.107,.010,.041),steel),.004)
o=rod('hinge_axle',(0,.104,.235),.006,.110,dark,n=16);o.rotation_euler.y=math.pi/2
lid=null('gable_lid',(0,.104,.235))
# Transparent gable wall and four roof planes; shape shown in Fisher photo, dimensions inferred.
verts=[(-.154,-.177,0),(.154,-.177,0),(-.154,-.177,.040),(.154,-.177,.040),(-.147,-.095,.082),(.147,-.095,.082),(-.152,0,.037),(.152,0,.037),(-.154,0,0),(.154,0,0)]
faces=[(0,1,3,2),(2,3,5,4),(4,5,7,6),(6,7,9,8),(0,2,4,6,8),(1,9,7,5,3)]
me=bpy.data.meshes.new('Gable surfaces');me.from_pydata(verts,[],faces);me.update()
lidGlass=bpy.data.objects.new('clear_gable',me);scene.collection.objects.link(lidGlass);lidGlass.parent=lid;me.materials.append(glass)
for x in [-.047,.047]:bevel(block('handle_standoff',(x,-.096,.099),(.013,.011,.033),dark,lid),.004)
bevel(block('lid_handle',(0,-.096,.114),(.110,.015,.015),dark,lid),.005)
for x in [-.152,.152]:block('gable_side_rim',(x,-.088,.002),(.008,.181,.005),steel,lid)
bpy.ops.export_scene.gltf(filepath=str(out/'isotemp-gpd05.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.41)
 scene.render.resolution_x=640;scene.render.resolution_y=435;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width,ang in [('open',(.46,-.68,.58),(0,0,.211),.57,-1.57),('rear',(.44,.64,.47),(0,0,.173),.48,0)]:
  lid.rotation_euler.x=ang
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
