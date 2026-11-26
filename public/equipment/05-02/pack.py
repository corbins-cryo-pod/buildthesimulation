"""Loss-bounded glTF vertex packing. Run automatically by model.py after Blender export."""
from pathlib import Path
import struct,json
def pack(path):
 b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);blob=b[28+n:];out=bytearray()
 if 'KHR_mesh_quantization' in g.get('extensionsUsed',[]):return
 g['extensionsUsed']=['KHR_mesh_quantization'];g['extensionsRequired']=['KHR_mesh_quantization']
 pos={p['attributes']['POSITION'] for m in g['meshes'] for p in m['primitives']};normal={p['attributes']['NORMAL'] for m in g['meshes'] for p in m['primitives']}
 for i,a in enumerate(g['accessors']):
  v=g['bufferViews'][a['bufferView']];old=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  while len(out)%4:out+=b'\x00'
  v['byteOffset']=len(out)
  if i in pos or i in normal:
   ispos=i in pos;factor=32767 if ispos else 127;fmt='<3hx x' if ispos else '<3bx'
   if ispos:fmt='<3h2x'
   c=bytearray();mn=[10**6]*3;mx=[-10**6]*3
   for vec in struct.iter_unpack('<3f',old):
    assert all(abs(q)<1.00001 for q in vec);vec=[max(-factor,min(factor,round(q*factor))) for q in vec];c+=struct.pack(fmt,*vec);mn=list(map(min,mn,vec));mx=list(map(max,mx,vec))
   a['componentType']=5122 if ispos else 5120;a['normalized']=True
   if ispos:a.update(min=mn,max=mx)
   old=c;v['byteStride']=8 if ispos else 4
  out+=old;v['byteLength']=len(old)
 while len(out)%4:out+=b'\x00'
 g['buffers'][0]['byteLength']=len(out);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);raw=struct.pack('<III',0x46546c67,2,28+len(js)+len(out))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(out),0x004E4942)+out;Path(path).write_bytes(raw)
if __name__=='__main__':pack(Path(__file__).resolve().parent/'contour-gt-k.glb')
