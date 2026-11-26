"""Generate original matching-angle exhibit views from the public model (Blender background mode)."""
import bpy
from mathutils import Vector
from pathlib import Path
p=Path.cwd()/'public/equipment/15-07'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(p/'vevo3100-console.glb'))
def descendants(o): return [o,*[a for x in o.children for a in descendants(x)]]
for o in descendants(bpy.data.objects['Detached_ruler']):o.hide_render=True
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=False
s.view_settings.exposure=-.70;s.render.resolution_x=640;s.render.resolution_y=400;s.render.resolution_percentage=100
s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=88
s.world=bpy.data.worlds.new('Documentary studio');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.13,.17,.18,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.46
bpy.ops.mesh.primitive_plane_add(size=22,location=(0,0,-.0006))
floor=bpy.context.object;floor.name='Backdrop';mat=bpy.data.materials.new('Warm drafting paper');mat.diffuse_color=(.30,.35,.37,1);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.30,.35,.37,1);floor.data.materials.append(mat)
def aim(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
def light(n,xyz,energy,size,color):
 d=bpy.data.lights.new(n,'AREA');o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.location=xyz;d.energy=energy;d.shape='DISK';d.size=size;d.color=color;aim(o,(0,0,.025))
light('Large strip',(-1.5,-3.4,4.9),830,3.1,(1,.93,.83));light('Fill',(-2.3,3.7,3.5),630,2.8,(.82,.93,1));light('White bounce',(2.8,-1.1,2.0),245,1.8,(1,1,1))
cam=bpy.data.cameras.new('Exterior comparison camera');cam.type='ORTHO';cam.ortho_scale=3.9
o=bpy.data.objects.new(cam.name,cam);s.collection.objects.link(o);s.camera=o
for name,xyz,target,scale in [
 ('front',(-1.42,-3.7,2.02),(0,0,.79),3.05),
 ('rear',(1.96,3.5,1.88),(0,0,.78),3.04)
]:
 o.location=xyz;aim(o,target);cam.ortho_scale=scale;s.render.filepath=str(p/('reference-'+name+'.webp'));bpy.ops.render.render(write_still=True)
