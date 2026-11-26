"""BTS 04-11: closed Minitech GX enclosure and unrelated circle diagram, nominal meters; Blender -b -t 2 -P model.py."""
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





# The free-standing Minitech shell only. The actual panels are clear; ours are opaque by design.
machine=null('instrument_anchor',(0,0,0))
w,d,h=1.143,.8128,1.8034
casing=material('extruded brushed aluminum',(.58,.63,.65),.61,.40)
edge=material('rubber seals and dark cap',(.062,.083,.088),.24,.40)
floor=material('dark solid floor insert',(.065,.105,.112),.20,.41)
opaque=material('intentionally opaque shadow glazing',(.20,.33,.37),.23,.29)
soft=material('trim reflectance',(.37,.46,.48),.54,.42)
def part(name,p,d,m,w=.004):
 return bevel(block(name,p,d,m,machine),w,3)
for x in [-w/2+.034,w/2-.034]:
 for y in [-d/2+.034,d/2-.034]:
  part('fixed_full_height_upright',(x,y,.931),(.068,.068,1.743),casing)
  part('opaque_caster_mount',(x,y,.089),(.062,.063,.044),soft)
  a=rod('inactive_display_caster',(x,y-math.copysign(.010,y),.043),.043,.049,edge,machine,26);a.rotation_euler.y=math.pi/2
for z in [.23,.858,h-.031]:
 for yy in [-d/2+.031,d/2-.031]:
  part('outer_x_extrusion',(0,yy,z),(w,.062,.062),casing)
  part('subtle_x_trim',(0,yy-.025,z-.008),(w-.061,.004,.008),soft,.001)
 for xx in [-w/2+.031,w/2-.031]:part('outer_y_extrusion',(xx,0,z),(.062,d,.062),casing)
part('dark_base_shelf',(0,0,.271),(w-.066,d-.064,.042),floor)
part('corian_solid_side_lip',(0,0,.909),(w-.070,d-.065,.045),soft)
part('closed_top_panel',(0,0,h-.034),(w-.090,d-.090,.018),opaque)
for xx in [-w/2+.023,w/2-.023]:
 part('closed_opaque_side_panel',(xx,0,1.334),(.026,d-.098,.835),opaque)
part('closed_opaque_rear_panel',(0,d/2-.023,1.334),(w-.101,.026,.835),opaque)
for i in range(4):
 cx=(i-1.5)*.256
 part('fixed_opaque_front_leaf',(cx,-.374,1.346),(.234,.024,.802),opaque)
 for dx in [-.117,.117]:
  part('outer_leaf_vertical_trim',(cx+dx,-.379,1.346),(.022,.027,.813),casing)
  part('dark_vertical_gasket',(cx+dx-.006,-.383,1.346),(.006,.010,.770),edge,.001)
 for z in [.956,1.736]:
  part('outer_leaf_horizontal_trim',(cx,-.379,z),(.240,.027,.030),casing)
 for z in [1.071,1.670]:
  part('fixed_black_hinge_face',(cx-.117,-.393,z),(.043,.022,.050),edge)
 if i in [1,2]:
  part('closed_static_handle',(cx,-.394,.961),(.066,.021,.036),edge,.006)
# Unrelated exhibition display and plinth, no machine controls.
bevel(block('detached_circle_display_stand',(1.022,-.140,.771),(.501,.441,.041),edge),.012)
for x in [.830,1.214]:
 for y in [-.300,.019]:block('detached_stand_leg',(x,y,.374),(.050,.050,.748),grey)
block('generic_teaching_mount',(1.022,-.027,.918),(.074,.074,.253),grey)
bevel(block('generic_teaching_screen',(1.022,-.056,1.062),(.386,.058,.277),edge),.012)
block('generic_screen_glass',(1.022,-.089,1.062),(.366,.006,.244),opaque)
null('circle_display_anchor',(1.022,-.094,1.062))
bevel(block('detached_diagram_switch',(1.022,-.302,.804),(.106,.053,.024),teal),.006)
bpy.ops.export_scene.gltf(filepath=str(out/'minimill-gx-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.45,-3.90,2.54),(.39,0,.92),3.55),('detail',(.012,-3.48,1.88),(0,-.11,1.13),2.25)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
