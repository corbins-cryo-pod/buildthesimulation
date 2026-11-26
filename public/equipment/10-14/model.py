"""BTS 10-14: original sealed dry equipment display and detached label props, meters; Blender -b -t 2 -P model.py."""
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
alum=material('brushed dark aluminum base',(.18,.24,.27),.42)
smoke=material('matte dark mount',(.035,.065,.07),.14)
white=material('embossed rail',(.63,.66,.62),.13)
gold=material('inert solid display block',(.65,.38,.12),.44)
teal=material('static teaching control',(.032,.52,.47),.25)
blue=material('disconnected tag A paint',(.045,.28,.58),.23)
orange=material('disconnected tag B paint',(.70,.30,.08),.19)
clear=material('dry enclosure clear unsupported material proxy',(.58,.78,.82),0,.17)
clear.surface_render_method='BLENDED';clear.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.20;clear.diffuse_color=(.58,.78,.82,.20)
def bevel(o,w=.005,n=3):
 m=o.modifiers.new('Original cosmetic edge radius','BEVEL');m.width=w;m.segments=n
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
bevel(block('baseplate',(0,0,.018),(.410,.220,.023),alum),.008,4)
for x in [-.176,.176]:
 for y in [-.082,.082]:rod('support_feet',(x,y,.004),.014,.008,smoke,n=14)
# Dry display compartment: original geometry; no valves, walls for flow, holders for tissue, or sensing hardware.
bevel(block('dry_floor',(-.075,.009,.035),(.225,.171,.012),white),.005)
for x in [-.187,.037]:
 bevel(block('fixed_clear_dry_walls',(x,.009,.070),(.004,.171,.057),clear),.002)
for y in [-.078,.095]:
 bevel(block('fixed_clear_dry_endcaps',(-.075,y,.070),(.227,.004,.057),clear),.002)
for x in [-.187,.037]:
 for y in [-.078,.095]:
  bevel(block('dry_guard_corner', (x,y,.071),(.012,.012,.067),alum),.003)
# The recess uses a fixed rectangular mount and a detached, non-anatomical solid block prop.
seat_x=-.075
for sign in [-1,1]:
 x=seat_x+sign*.0485;block('fixed_mount_side',(x,.009,.0505),(.012,.132,.019),smoke)
for y in [-.057,.075]:block('fixed_mount_end',(seat_x,y,.0505),(.085,.012,.019),smoke)
insert=null('inert_block',(-.075,.009,.041))
bevel(block('solid_mock_block',(0,0,.0075),(.065,.080,.015),gold,insert),.004)
for i in range(3):block('cosmetic_block_hash',(-.016+i*.016,-.005,.0155),(.008,.026,.001),white,insert)
# Remote, disconnected labels on a separate support. Housing visual props intentionally have no metal contacts.
bevel(block('separate_label_rack',(.117,.032,.060),(.124,.115,.062),smoke),.007)
for side,x,mat in [('left',.085,blue),('right',.146,orange)]:
 bevel(block('blank_'+side+'_label_plate',(x,-.025,.080),(.042,.006,.022),mat),.004)
 rod('capped_dummy_'+side+'_plug',(x,.023,.085),.013,.043,mat,n=18)
 cable('detached_'+side+'_cord_shaped_prop',[(x,.023,.105),(x,.031,.116),(x,.066,.117),(x,.095,.084)],mat)
 # Surface for a small readable text texture; part has no electrical or mechanical operation.
 null('tag_'+side+'_anchor',(x,-.030,.080))
bevel(block('block_display_toggle',(-.112,-.095,.034),(.046,.013,.006),teal),.003)
bevel(block('tag_display_toggle',(.121,-.095,.034),(.046,.013,.006),teal),.003)
block('contrast_marker',(0,-.105,.031),(.055,.006,.003),white)
bpy.ops.export_scene.gltf(filepath=str(out/'dry-fixture.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.41,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.46,-.61,.41),(0,0,.049),.545),('plan',(0,0,.67),(0,.001,.038),.47)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
