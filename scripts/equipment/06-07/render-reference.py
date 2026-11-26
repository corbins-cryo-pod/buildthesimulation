"""Generate original matching-angle exhibit views from the public model (Blender background mode)."""
import bpy
from mathutils import Vector
from pathlib import Path
p=Path.cwd()/'public/equipment/06-07'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(p/'mfcs-ez-dormant.glb'))
def descendants(o): return [o,*[a for x in o.children for a in descendants(x)]]
for o in descendants(bpy.data.objects['Detached_chart']):o.hide_render=True
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=False
s.view_settings.exposure=-1.25;s.render.resolution_x=560;s.render.resolution_y=330;s.render.resolution_percentage=100
s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
s.world=bpy.data.worlds.new('Documentary studio');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.13,.17,.18,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.46
bpy.ops.mesh.primitive_plane_add(size=5,location=(0,0,-.0006))
floor=bpy.context.object;floor.name='Backdrop';mat=bpy.data.materials.new('Warm drafting paper');mat.diffuse_color=(.30,.35,.37,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.30,.35,.37,1);floor.data.materials.append(mat)
def aim(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
def light(n,xyz,energy,size,color):
 d=bpy.data.lights.new(n,'AREA');o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.location=xyz;d.energy=energy;d.shape='DISK';d.size=size;d.color=color;aim(o,(0,0,.025))
light('Large strip',(0,-.3,.44),24,.38,(1,.90,.77));light('Fill',(-.23,.3,.33),20,.32,(.8,.93,1));light('White bounce',(.24,.16,.06),7,.2,(1,1,1))
cam=bpy.data.cameras.new('Comparison camera');cam.type='ORTHO';cam.ortho_scale=.328
o=bpy.data.objects.new(cam.name,cam);s.collection.objects.link(o);s.camera=o
for name,xyz in [('front',(.012,-.48,.223)),('rear',(-.010,.48,.205))]:
 o.location=xyz;aim(o,(0,0,.030));s.render.filepath=str(p/('reference-'+name+'.webp'));bpy.ops.render.render(write_still=True)
