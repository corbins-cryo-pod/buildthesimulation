"""BTS 07-06: closed Eppendorf 5810 R and unrelated static moment diagram, nominal meters; Blender -b -t 2 -P model.py."""
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







# Closed 5810 R body only; no implement, chamber, motor, movement or real control.
machine=null('instrument_anchor',(0,0,0))
cream=material('warm offwhite textured lower body',(.81,.82,.77),.11,.46)
pale=material('soft cool lid and right bay',(.87,.87,.82),.18,.45)
muted=material('grey translucent-looking opaque fascia',(.62,.68,.69),.19,.43)
dark=material('black seals feet and recesses',(.044,.060,.063),.24,.44)
blue=material('dormant blue bezel marks',(.038,.181,.395),.16,.44)
def part(name,p,d,m,w=.004,n=4):
 return bevel(block(name,p,d,m,machine),w,n)
part('main_left_housing',(-.081,0,.140),(.534,.604,.238),cream,.012)
part('right_lower_refrigerated_variant_shell',(.267,0,.157),(.166,.608,.260),pale,.011)
part('fixed_closed_lid_gasket',(-.082,0,.269),(.531,.599,.024),dark,.007)
part('closed_left_lid_opaque',(-.082,0,.310),(.536,.601,.067),pale,.016,6)
rod('closed_opaque_lid_insert',(-.082,.028,.344),.009,.002,dark,machine,28)
# Broad asymmetrical molded front sweep with no readable button data.
profile=[]
for i in range(31):
 t=i/30
 x=-.347+.530*t;bottom=.235-.071*math.exp(-((t-.77)/.32)**2)-.010*t
 profile.extend([(x,-.3036,bottom),(x,-.3036,.253+.004*math.sin(math.pi*t))])
mesh=bpy.data.meshes.new('Facade surface only');mesh.from_pydata(profile,[],[(2*i,2*i+2,2*i+3,2*i+1) for i in range(30)]);mesh.update()
o=bpy.data.objects.new('closed_cosmetic_wavelike_front',mesh);scene.collection.objects.link(o);o.parent=machine;o.data.materials.append(muted)
for poly in o.data.polygons:poly.use_smooth=True
part('fixed_inactive_console_bezel',(.066,-.3014,.214),(.192,.0039,.083),pale,.0013)
part('console_display_blank',(.062,-.30355,.229),(.094,.00055,.024),dark,.0005,2)
for x,z in [(-.004,.228),(-.004,.207),(.019,.195),(.042,.195),(.065,.195),(.088,.195),(.116,.224),(.116,.208),(.139,.194)]:
 c=rod('inert_blue_button_mark',(x,-.30357,z),.006,.00060,blue,machine,16);c.rotation_euler.x=math.pi/2
part('front_blue_small_badge',(-.282,-.3019,.049),(.076,.002,.010),blue,.001)
part('front_blue_model_badge',(.107,-.3019,.049),(.121,.002,.010),blue,.001)
part('sealed_small_lower_right_panel',(.222,-.295,.031),(.114,.010,.025),muted,.003)
part('left_sealed_grille_mark',(-.3491,-.131,.146),(.0013,.158,.177),muted,.0007)
for z in [.076+i*.012 for i in range(12)]:part('external_cosmetic_left_slot',(-.34965,-.131,z),(.00045,.139,.0024),dark,.0002)
for x in [-.305,.300]:
 for y in [-.246,.246]:rod('stationary_foot',(x,y,.012),.022,.024,dark,machine,24)
# Unrelated monitor and badge. They're not accessories and have no machine state.
bevel(block('detached_statics_monitor_base',(.614,-.033,.021),(.324,.300,.042),dark),.009)
block('detached_monitor_support',(.614,.027,.117),(.047,.039,.176),muted)
bevel(block('detached_monitor_body',(.614,-.008,.220),(.289,.043,.207),dark),.007)
block('detached_monitor_glass',(.614,-.0311,.220),(.275,.003,.188),muted)
null('detached_statics_screen_anchor',(.614,-.0335,.220))
bevel(block('detached_statics_badge',(.614,-.126,.047),(.078,.038,.015),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'eppendorf-5810r-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(1.15,-2.12,1.16),(.17,-.01,.169),1.55),('detail',(-.63,-1.83,.87),(-.021,-.019,.174),1.14)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
