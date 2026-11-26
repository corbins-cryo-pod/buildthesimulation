"""BTS 08-11: LPKF ProtoMat S104 reconstruction; nominal meters; Blender -b -t 2 -P model.py."""
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
cream=material('white polymer case',(.89,.89,.83),0,.4)
trim=material('charcoal hood trim',(.035,.046,.054),.13,.34)
granite=material('dark granite support',(.14,.155,.158),0,.62)
ceramic=material('ivory vacuum table',(.59,.60,.50),.17,.55)
copper=material('inert display copper',(.82,.36,.115),.45,.38)
blue=material('blue handle',(.025,.29,.65),.14)
glazing=material('clear hood visual approximation',(.40,.63,.68),0,.16)
glazing.surface_render_method='BLENDED'
glazing.diffuse_color=(.4,.63,.68,.17)
glazing.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.17
def bevel(o,width=.015,segments=4):
 m=o.modifiers.new(name='Visible radiused enclosure',type='BEVEL');m.width=width;m.segments=segments;o.modifiers.new(name='Weighted corner normals',type='WEIGHTED_NORMAL');return o
bevel(block('case_outer',(0,0,.091),(.680,.800,.172),cream),.042,5)
bevel(block('perimeter_dark_belt',(0,0,.187),(.678,.798,.034),trim),.035,5)
bevel(block('granite_bed',(0,.03,.212),(.580,.655,.041),granite),.014)
for x in [-.255,.255]:
 for y in [-.296,.296]:rod('support_foot',(x,y,.009),.036,.018,dark,n=20)
bevel(block('front_mesh_recess',(0,-.379,.065),(.472,.027,.054),dark),.021)
for i in range(17):block('front_vent_slit_'+str(i),(-.200+.025*i,-.394,.064),(.008,.002,.025),granite)
bevel(block('rear_housing',(0,.314,.309),(.542,.145,.243),cream),.026)
block('rear_port_panel',(0,.388,.26),(.458,.012,.095),trim)
ports=[('power',-.173,.036),('data',-.100,.022),('air',-.029,.018),('extraction',.081,.078),('aux',.174,.028)]
for name,x,w in ports:
 bevel(block('rear_socket_'+name,(x,.397,.26),(w,.005,.026),dark),.004)
for i in range(9):block('rear_vent_'+str(i),(-.201+.05*i,.389,.326),(.021,.004,.007),dark)
for x in [-.231,.231]:
 block('linear_support',(x,.091,.316),(.077,.343,.073),trim)
 o=rod('rear_hinge',(x,.352,.202),.018,.068,silver,n=18);o.rotation_euler.y=math.pi/2
bevel(block('vacuum_platen',(0,-.097,.243),(.340,.250,.025),ceramic),.006)
for x in [-.159,.159]:
 block('platen_edge_rail',(x,-.103,.261),(.009,.232,.007),silver)
for y in [-.212,-.169,-.126,-.083,-.04,.003]:
 for x in [-.13,-.065,0,.065,.13]:
  rod('vacuum_platen_pore',(x,y,.256),.0012,.0015,trim,n=8)
block('gantry_beam',(0,.086,.361),(.507,.078,.076),trim)
for i in range(16):
 x=-.235+i*.031
 block('x_bellows_rib_'+str(i),(x,.04,.354),(.010,.018,.068),granite)
head=null('inspect_head',(0,.011,.353))
bevel(block('spindle_shell',(0,0,.061),(.132,.152,.137),cream,head),.020,4)
block('spindle_face',(0,-.073,.026),(.098,.009,.055),silver,head)
rod('stationary_spindle',(0,-.025,-.026),.018,.086,silver,head,n=22)
rod('collet_no_tool',(0,-.025,-.080),.009,.022,dark,head,n=18)
rod('alignment_camera',(.041,-.045,-.047),.012,.070,trim,head,n=18)
rod('inspect_target',(.052,-.078,.022),.016,.009,green,head,n=18).rotation_euler.x=math.pi/2
block('twenty_slot_rack',(0,.160,.258),(.381,.043,.021),trim)
for i in range(20):rod('rack_slot_%02d'%(i+1),(-.174+.0183*i,.159,.273),.0049,.013,silver,n=9)
board=null('coupon_anchor',(0,-.127,.258))
hood=null('acoustic_hood',(0,.352,.197))
# Rounded crown is inferred from the vendor silhouette, not digitized CAD.
span=[(-.388,.191),(-.382,.241),(-.361,.322),(-.323,.415),(-.259,.498),(-.187,.542),(-.100,.560),(.028,.560),(.184,.553),(.305,.532),(.364,.492),(.389,.442)]
xhalf=.320;hy=.352;hz=.197
verts=[(x,y-hy,z-hz) for y,z in span for x in [-xhalf,xhalf]]
faces=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(span)-1)]
for i in [0,1]:
 side=tuple(range(i,2*len(span),2))
 verts.extend([(verts[side[-1]][0],span[-1][0]-hy,.191-hz)])
 faces.append(side+(len(verts)-1,))
mesh=bpy.data.meshes.new('glazed hood');mesh.from_pydata(verts,[],faces);mesh.update()
hood_mesh=bpy.data.objects.new('hood_glazing',mesh);scene.collection.objects.link(hood_mesh);hood_mesh.parent=hood;mesh.materials.append(glazing)
block('hood_handle',(0,-.383-hy,.185-hz),(.278,.028,.021),blue,hood)
for x in [-.321,.321]:
 block('hood_lower_side_frame',(x,-.005-hy,.192-hz),(.018,.768,.022),trim,hood)
bpy.ops.export_scene.gltf(filepath=str(out/'protomat-s104.glb'),export_format='GLB',export_extras=True,export_yup=True)
if 'render-reference' in __import__('sys').argv:
 scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD'
 scene.world=bpy.data.worlds.new('Evidence background');scene.world.color=(.39,.41,.42)
 scene.render.resolution_x=650;scene.render.resolution_y=450;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 for name,eye,look,width,hidden in [('inside',(.95,-1.1,.82),(0,0,.25),1.12,True),('rear',(.9,1.25,.59),(0,0,.28),1.20,False)]:
  hood_mesh.hide_render=hidden
  if hidden:hood.rotation_euler.x=-.85
  else:hood.rotation_euler.x=0
  bpy.ops.object.camera_add(location=eye);cam=bpy.context.object;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=width;scene.camera=cam
  scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
