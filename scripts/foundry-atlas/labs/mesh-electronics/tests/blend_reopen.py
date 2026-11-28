"""Blender background-only audit of the saved file."""
import bpy
from pathlib import Path
scenes={s.name:s for s in bpy.data.scenes}
expected={
 '01 PHYSICAL 32 / assembled':32,
 '02 DIAGRAM 32 / exploded Z':32,
 '03 PHYSICAL 16 / centered fixture':16
}
assert set(scenes)==set(expected)
for name,count in expected.items():
 s=scenes[name]
 sites=[o for o in s.objects if o.get('layer')=='platinum']
 assert len(sites)==count
 assert s.unit_settings.system=='METRIC' and s.unit_settings.scale_length==1
 assert len({o['teaching_net_id']for o in sites})==count
 for category in ('carrier','nickel','fixture'):
  obs=[o for o in s.objects if o.get('layer')==category]
  assert obs and all(o.users_collection[0].hide_viewport==(name[:2]!='02') for o in obs)
 print(name,len(s.objects),'objects',len(sites),'sites')
assert bpy.data.texts.get('README · provenance, scopes, and scene organization')
