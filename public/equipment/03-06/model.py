"""BTS 03-06: Veeco Fiji G2 static cabinet and detached teaching gauge, nominal meters; Blender -b -t 2 -P model.py."""
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
coat=material('ivory powdercoat',(.76,.77,.74),.23,.48)
darkcoat=material('cabinet black inserts',(.033,.045,.055),.16)
steel=material('brushed stainless enclosure proxies',(.57,.65,.67),.71,.34)
teal=material('non-operational inspection action',(.028,.50,.46),.25)
orange=material('mock geometry warning plate',(.74,.28,.06),.36)
copper=material('inert disk preview',(.72,.48,.26),.4,.37)
light=material('pale display tint',(.14,.34,.37))
def bevel(o,w=.010,n=3):
 m=o.modifiers.new('Inferred exterior radius','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
bevel(block('nominal_footprint',(0,0,.102),(1.845,.715,.105),coat),.016)
for x in [-.835,.835]:
 for y in [-.280,.280]:
  rod('adjustable_mount',(x,y,.040),.042,.048,steel,n=20)
  wheel=rod('caster_wheel',(x,y,.036),.036,.031,darkcoat,n=20);wheel.rotation_euler.y=math.pi/2
bevel(block('base_service_cabinet',(0,0,.605),(1.835,.69,1.000),coat),.019)
for x,width in [(-.585,.655),(.241,.970),(.790,.119)]:
 bevel(block('front_service_panel',(x,-.347,.592),(width,.013,.914),coat),.008)
 for z in [.205,.968]:
  for dx in [-.024,.024]:rod('panel_fastener',(x+dx,-.354,z),.006,.004,steel,n=10).rotation_euler.x=math.pi/2
bevel(block('electronics_tower',(-.589,0,1.451),(.654,.678,.938),coat),.025)
bevel(block('tower_front_door',(-.596,-.345,1.555),(.58,.014,.686),coat),.012)
for z in [1.284,1.815]:
 block('tower_door_hinge',(-.860,-.345,z),(.028,.020,.050),steel)
block('tower_door_pull',(-.350,-.352,1.543),(.036,.013,.103),steel)
bevel(block('upper_blank_display_bezel',(-.597,-.353,1.551),(.301,.009,.216),darkcoat),.008)
block('upper_blank_display',(-.597,-.357,1.551),(.275,.001,.190),light)
bevel(block('console_rack',(-.593,-.343,.873),(.535,.024,.317),darkcoat),.010)
for z in [.769,.821,.873,.925,.977]:
 block('blank_console_panel',(-.593,-.356,z),(.475,.003,.026),base)
 for x in [-.796,-.390]:
  o=rod('rack_screw',(x,-.358,z),.005,.003,steel,n=8);o.rotation_euler.x=math.pi/2
block('static_display_placard',(.394,-.355,1.018),(.263,.005,.060),light)
block('cabinet_inspection_toggle',(.712,-.356,1.025),(.074,.005,.048),teal)
block('static_fit_button',(.793,-.356,1.025),(.049,.005,.048),orange)
# Stainless assembly shells only. No functional inner reactor, facility connections or fluid routing are modeled.
bevel(block('deck',(.276,.023,1.106),(1.22,.594,.042),steel),.014)
rod('reactor_external_shell',(-.059,.055,1.286),.192,.303,steel,n=42)
rod('reactor_flange',(-.059,.055,1.148),.211,.028,steel,n=42)
rod('reactor_top_flange',(-.059,.055,1.455),.167,.035,steel,n=42)
rod('remote_source_exterior_cover',(-.059,.061,1.612),.076,.278,coat,n=28)
rod('remote_source_lower_flange',(-.059,.061,1.485),.098,.027,steel,n=28)
for j in range(10):
 a=2*math.pi*j/10;rod('external_flange_head',(-.059+.181*math.cos(a),.055+.181*math.sin(a),1.466),.007,.010,darkcoat,n=10)
o=rod('load_lock_link_exterior',(.227,.052,1.209),.064,.302,steel,n=28);o.rotation_euler.y=math.pi/2
bevel(block('load_lock_exterior',(.551,.052,1.204),(.397,.305,.137),steel),.016,5)
bevel(block('load_lock_flange_side',(.786,.057,1.207),(.069,.320,.170),steel),.011)
bevel(block('inspection_shroud',(.554,.052,1.292),(.355,.284,.040),coat),.014)
block('static_shroud_grip',(.558,.049,1.316),(.148,.026,.013),darkcoat)
# Detached synthetic gauge is shown in the cutaway and not treated as internal OEM hardware.
gauge=null('teaching_gauge',(.555,.052,1.283))
rod('guide_bed',(0,0,-.010),.112,.011,darkcoat,gauge,n=42)
bpy.ops.mesh.primitive_torus_add(major_radius=.103,minor_radius=.002,major_segments=48,minor_segments=8,location=(0,0,.001));o=bpy.context.object;o.name='guide_rim';o.parent=gauge;o.data.materials.append(teal)
carrier=null('dry_carrier',(.555,.052,1.285))
rod('carrier_disk',(0,0,.002),.100,.004,copper,carrier,n=48)
for x in [-.716,-.681,-.646,-.611,-.576,-.541,-.506,-.471]:
 for z in [.555,.579]:block('generic_rear_vent',(x,.346,z),(.020,.005,.008),darkcoat)
bevel(block('inferred_rear_cover',(.272,.347,.696),(1.162,.006,.475),coat),.009)
block('rear_blank_plate',(.582,.354,.263),(.245,.006,.148),darkcoat)
bpy.ops.export_scene.gltf(filepath=str(out/'fiji-g2-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.38,.40,.41)
 scene.render.resolution_x=650;scene.render.resolution_y=450;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width,detail in [('front',(2.5,-3.5,2.45),(0,0,.99),3.04,False),('fit',(1.64,-1.42,2.0),(.445,.039,1.267),1.45,True)]:
  bpy.data.objects['inspection_shroud'].hide_render=detail
  bpy.data.objects['static_shroud_grip'].hide_render=detail
  bpy.data.objects['carrier_disk'].hide_render=not detail
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
