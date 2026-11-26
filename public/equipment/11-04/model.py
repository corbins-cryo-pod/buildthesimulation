"""BTS 11-04: capped inactive Doric console and integrated mini cube exterior, nominal meters; Blender -b -t 2 -P model.py."""
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









# No cable, optics, electricity, working connector, switch, or instrument action.
console=null('console_documentary_root',(0,0,0))
cube=null('mini_cube_documentary_root',(.297,0,0))
dark=material('soft graphite printed casing',(.044,.056,.060),.26,.36)
cap=material('authored dark nonmating cover',(.107,.131,.139),.22,.39)
bright=material('brushed external rim',(.60,.66,.69),.56,.34)
smoke=material('second graphite tone',(.156,.179,.192),.32,.37)
sea=material('neutral closed-body accent',(.26,.32,.34),.21,.40)
sea2=material('concept display inactive surface',(.051,.103,.109),.16,.38)
def part(name,p,d,m,group,w=.0015,n=3):
 return bevel(block(name,p,d,m,group),w,n)
def capped(name,xyz,r,depth,group,axis='Y'):
 top=rod(name,xyz,r,depth,cap,group,18)
 if axis=='Y':top.rotation_euler.x=math.pi/2
 if axis=='X':top.rotation_euler.y=math.pi/2
 return top
part('nc500_primary_case',(0,.005,.0275),(.400,.103,.045),dark,console,.006,5)
part('nc500_front_face',(0,-.0477,.0265),(.394,.004,.040),dark,console,.0018)
for x in [-.176,.176]:
 for y in [-.029,.039]:rod('external_rubber_foot',(x,y,.003),.006,.006,cap,console,18)
for g in [0,1,2]:
 start=[-.149,-.028,.094][g]
 part('cosmetic_group_bracket_blank',(start+.039,-.035,.0495),(.099,.0018,.001),bright,console,.00035,2)
 for i in range(4):
  for z in [.017,.035]:
   x=start+i*.026
   o=rod('nc500_blind_connector_outer_ring',(x,-.0503,z),.0061,.0085,bright,console,20);o.rotation_euler.x=math.pi/2
   capped('nc500_permanent_blind_cap',(x,-.0548,z),.0048,.0054,console)
for x in [.065,.077]:
 part('unmarked_vertical_face_blank',(x,-.0498,.027),(.0058,.0012,.0144),smoke,console,.0009)
part('switch_shape_fixed_unlabelled',(-.182,-.0506,.023),(.009,.004,.016),smoke,console,.0014)
for x in [-.17,-.126,-.080,.159]:
 part('closed_rear_placeholder_blank',(x,.056,.023),(.024,.003,.015),cap,console,.0008)
# Gen. 3 visible housing and inferred permanently attached outer blank covers.
part('ilfmc4_lower_mount_base',(0,0,.003),(.110,.070,.006),bright,cube,.001)
for sg in [-1,1]:
 for yy in [-.030,0,.030]:part('solid_outer_mount_tab',(sg*.0636,yy,.003),(.0198,.010,.006),bright,cube,.001)
part('ilfmc4_case_body',(0,0,.032),(.107,.068,.052),smoke,cube,.004,4)
part('ilfmc4_inactive_face_mark',(.035,-.0342,.029),(.021,.0015,.033),dark,cube,.0007)
part('ilfmc4_top_case_trim',(0,0,.057),(.104,.065,.002),dark,cube,.0006)
for x in [-.045,.045]:
 for y in [-.026,.026]:rod('plain_top_fastener_mark',(x,y,.0577),.0023,.00055,bright,cube,16)
for group in [-1,1]:
 for i in range(6):
  x=group*.026+(i-2.5)*.007
  part('ilfmc4_stationary_rear_fin',(x,.0432,.035),(.003,.0226,.035),cap,cube,.0005)
for x in [-.031,-.010,.010]:
 o=rod('ilfmc4_blind_collar_blank',(x,-.037,.047),.0058,.008,bright,cube,20);o.rotation_euler.x=math.pi/2
 capped('ilfmc4_permanent_front_cap',(x,-.0466,.047),.0049,.0158,cube)
capped('ilfmc4_side_opaque_cap',(.056,.004,.034),.0047,.008,cube,'X')
# Unrelated compact drawing pedestal on the same imaginary counter, with a visible gap.
bevel(block('detached_drawing_display_base',(.513,-.020,.010),(.178,.157,.020),sea2),.006)
block('generic_display_support',(.513,.023,.077),(.026,.032,.123),sea)
bevel(block('generic_display_case',(.513,.008,.130),(.164,.027,.121),dark),.006)
block('noninstrument_display_glass',(.513,-.0065,.130),(.151,.002,.103),sea2)
null('coordinate_display_anchor',(.513,-.008,.130))
bevel(block('detached_card_switch',(.513,-.077,.023),(.055,.026,.014),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'doric-nc500-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.65,-1.35,.59),(.190,-.002,.063),1.01),('detail',(-.47,-.81,.48),(.106,-.003,.025),.71)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
