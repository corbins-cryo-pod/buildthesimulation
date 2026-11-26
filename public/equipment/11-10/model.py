"""BTS 11-10: nominal unbuilt fixture shell and detached passive circuit card, nominal meters; Blender -b -t 2 -P model.py."""
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










# All geometry is a proposal, not as built. Inert solids with no functional paths.
machine=null('proposed_fixture_anchor',(0,0,0))
anodized=material('deep graphite anodized plate',(.105,.151,.167),.35,.37)
upper=material('smooth neutral shroud',(.44,.50,.52),.39,.40)
bolts=material('exterior screw marker finish',(.56,.62,.61),.50,.41)
rubber=material('soft low profile feet',(.050,.068,.069),.14,.43)
closed=material('no apertures dark gray cover',(.057,.079,.090),.24,.37)
inactive=material('opaque port caps',(.060,.105,.108),.16,.41)
accent=material('painted static case stripe',(.16,.37,.39),.20,.38)
def part(name,p,d,m,parent=machine,w=.002,n=3):
 return bevel(block(name,p,d,m,parent),w,n)
part('nominal_baseplate',(0,0,.017),(.240,.180,.018),anodized,w=.006,n=4)
for x in [-.095,.095]:
 for y in [-.067,.067]:
  rod('base_stationary_foot',(x,y,.004),.011,.008,rubber,machine,24)
  rod('deck_blank_fastener',(x,y,.026),.004,.002,bolts,machine,16)
# Monument-like external protective crossbar and sealed housings; no pivot or alignment path.
for x in [-.075,.075]:
 part('outer_shroud_support_side',(x,.033,.061),(.030,.062,.075),upper,w=.005)
 part('support_dark_external_cap',(x,.032,.089),(.028,.060,.014),closed,w=.002)
part('fixed_upper_bridge_shroud',(0,.041,.103),(.178,.060,.024),anodized,w=.006,n=4)
part('top_blank_identification_plate',(0,.037,.113),(.114,.027,.002),upper,w=.001)
part('enclosed_upper_module_blank',(0,.023,.079),(.059,.055,.023),closed,w=.003)
part('empty_fixed_base_center_cowl',(0,-.008,.042),(.091,.077,.033),upper,w=.004)
part('sealed_central_cover',(0,-.015,.059),(.064,.052,.009),inactive,w=.002)
for x,z in [(-.045,.053),(.045,.060)]:
 part('stationary_outline_extremity',(x,.001,z),(.017,.041,.018),upper,w=.002)
 a=rod('opaque_external_contact_mark',(x,-.021,z),.004,.003,inactive,machine,18);a.rotation_euler.x=math.pi/2
for x in [-.078,-.064,-.050]:
 part('cosmetic_external_cooling_line',(x,.063,.080),(.006,.005,.027),closed,w=.001)
part('blank_side_parapet',(.081,-.052,.040),(.043,.026,.028),closed,w=.004)
part('case_stripe_no_label',(0,-.089,.018),(.101,.0018,.005),accent,w=.0006)
# Fictional detached circuit-card monitor and unrelated badge, on the same imaginary table.
bevel(block('detached_card_pedestal',(.287,-.009,.009),(.202,.156,.018),closed),.006)
block('detached_display_support',(.287,.033,.065),(.026,.031,.109),upper)
bevel(block('detached_display_case',(.287,.016,.107),(.183,.026,.123),closed),.006)
block('detached_display_glass',(.287,.002,.107),(.168,.002,.111),inactive)
null('circuit_card_display_anchor',(.287,.0005,.107))
bevel(block('detached_card_select_badge',(.287,-.071,.021),(.066,.028,.014),teal),.004)
bpy.ops.export_scene.gltf(filepath=str(out/'fixture-concept-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(.56,-.72,.40),(.133,0,.067),.59),('detail',(-.43,-.60,.37),(.012,0,.061),.36)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
