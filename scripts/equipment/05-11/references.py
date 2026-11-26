"""Original matched-angle .blend renders: blender -b model.blend -t 2 --python references.py."""
from pathlib import Path
import bpy,math,os
from mathutils import Vector
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=False
s.render.resolution_x=720;s.render.resolution_y=510;s.render.resolution_percentage=100
s.render.image_settings.file_format='WEBP';s.render.image_settings.quality=89
D=Path(__file__).resolve().parents[3]/'public'/'equipment'/'05-11'
def area(name,xyz,power,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
 l=bpy.data.objects.new(name,d);s.collection.objects.link(l);l.location=xyz;l.rotation_euler=(-l.location).to_track_quat('-Z','Y').to_euler()
for cfg in [('Key',(1.2,-1.1,1.5),130,.8),('Fill',(-1,-.8,1.3),85,1.1),('Rim',(.3,1,1.35),100,1)]:area(*cfg)
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.4,.47,.47,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.52
c=bpy.data.cameras.new('Evidence');o=bpy.data.objects.new('Evidence',c);s.collection.objects.link(o);s.camera=o;c.type='ORTHO'
bpy.data.objects['host_display'].hide_render=True
for x in bpy.data.objects['host_display'].children:x.hide_render=True
for id,xyz,foc,scale in [('front',(.79,-1.3,.76),(0,-.02,.17),1.15),('atr',(.50,-.61,.54),(.187,-.22,.285),.46),('bay',(.45,-.98,.60),(0,-.18,.26),.92),('rear',(.83,1.24,.65),(0,.065,.15),1.1)]:
 if os.environ.get('REFERENCE_ONLY') not in (None,id):continue
 bpy.data.objects['sample_lid_hinge'].rotation_euler.x=-1.32 if id=='bay' else 0
 o.location=xyz;o.rotation_euler=(Vector(foc)-o.location).to_track_quat('-Z','Y').to_euler();c.ortho_scale=scale
 s.render.filepath=str(D/(id+'.webp'));bpy.ops.render.render(write_still=True)
