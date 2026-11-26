"""BTS 07-13: sealed LS6000 silhouette and detached abstract packing diagram, nominal meters; Blender -b -t 2 -P model.py."""
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








# Sealed, single solid external profile. No cavity, contents, accessory fit, or controls.
machine=null('instrument_anchor',(0,0,0))
alloy=material('warm brushed external aluminum finish',(.55,.60,.57),.57,.34)
rim=material('reflective external rim',(.66,.71,.69),.64,.37)
blue=material('deep cap blue',(.023,.137,.57),.19,.36)
lightBlue=material('outer blue badge trim',(.064,.26,.64),.14,.36)
shadow=material('nonmoving seam shadow',(.034,.064,.08),.24,.45)
teaching=material('generic detached grey shell',(.028,.063,.069),.19,.44)
def revolve(name,profile,pal,regions,parent=machine,n=64):
 verts=[(r*math.cos(2*math.pi*j/n),r*math.sin(2*math.pi*j/n),z) for z,r in profile for j in range(n)]
 quads=[(i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j) for i in range(len(profile)-1) for j in range(n)]
 mesh=bpy.data.meshes.new(name+'_mesh');mesh.from_pydata(verts,[],quads+[tuple(range(n-1,-1,-1)),tuple((len(profile)-1)*n+j for j in range(n))]);mesh.update()
 o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.parent=parent
 for m in pal:mesh.materials.append(m)
 for p in mesh.polygons:
  if p.index<len(quads):p.material_index=regions(p.index//n);p.use_smooth=True
 return o
profile=[(0,.300),(.007,.315),(.022,.328),(.045,.335),(.115,.335)]
for z in [0.174,.195,.216,.237,.258,.279,.394,.415,.436,.457,.478,.499]:
 profile.extend([(z-.006,.336),(z-.003,.340),(z,.3415),(z+.004,.340),(z+.007,.336)])
profile.extend([(.630,.337),(.700,.339),(.719,.336),(.742,.325),(.792,.293),(.850,.247),(.910,.200),(.928,.194)])
revolve('closed_external_barrel_shoulders',profile,[alloy],lambda _:0)
revolve('upper_external_neck_trim',[(.917,.192),(.921,.199),(.944,.199),(.948,.196)],[rim],lambda _:0,n=64)
revolve('fixed_blue_external_cap',[(.948,.197),(.955,.202),(.974,.202),(.982,.197),(.988,.187),(.991,.174)],[blue],lambda _:0,n=64)
for sign in [-1,1]:
 c=bpy.data.curves.new('cast cosmetic handle outline','CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=.010;c.bevel_resolution=2
 sp=c.splines.new('POLY');sp.points.add(39)
 for i,p in enumerate(sp.points):
  t=2*math.pi*i/40;p.co=(sign*(.275+.049*math.cos(t)),.050*math.sin(t),.845+.032*math.cos(t),1)
 sp.use_cyclic_u=True;o=bpy.data.objects.new('stationary_side_carry_handle',c);scene.collection.objects.link(o);o.parent=machine;o.data.materials.append(rim)
bevel(block('external_badge_dark_base',(0,-.335,.592),(.170,.005,.032),lightBlue,machine),.002)
block('external_badge_bright_strip',(0,-.338,.600),(.130,.001,.009),rim,machine)
# Independent educational poster on separate stand. No components are compatible with the instrument.
bevel(block('detached_packing_stand',(.915,-.126,.742),(.415,.381,.042),teaching),.012)
for x in [.754,1.076]:
 for y in [-.261,.009]:block('detached_stand_leg',(x,y,.362),(.046,.046,.724),grey)
block('detached_poster_mount',(.915,.005,.882),(.068,.069,.245),grey)
bevel(block('detached_poster_screen',(.915,-.025,1.007),(.346,.043,.244),teaching),.011)
block('detached_screen_glass',(.915,-.048,1.007),(.328,.004,.222),shadow)
null('packing_display_anchor',(.915,-.051,1.007))
bevel(block('detached_packing_switch',(.915,-.272,.770),(.098,.043,.019),teal),.005)
bpy.ops.export_scene.gltf(filepath=str(out/'worthington-ls6000-static.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.37,.40,.42)
 scene.render.resolution_x=660;scene.render.resolution_y=440;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width in [('front',(2.41,-3.38,1.98),(.38,0,.55),2.38),('detail',(-.78,-2.63,1.71),(0,0,.66),1.57)]:
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
