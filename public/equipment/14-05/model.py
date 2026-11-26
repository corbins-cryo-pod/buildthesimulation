"""Piuma nominal-size editable geometry, mm input, metric glTF. BRPIU202401v1 pp.1, 4, 12.
Enclosure proportions estimated; 120 × 150 × 280 mm manufacturer nominal. Python + Pillow + NumPy."""
from pathlib import Path
import json,struct,math,io,os
import numpy as np
from PIL import Image,ImageDraw,ImageFont
D=Path(__file__).resolve().parent
groups={};trans={};parents={}; bounds={}
def slot(k,xyz,parent=None):trans[k]=xyz;parents[k]=parent
def nrm(v):
 l=np.linalg.norm(v);return np.array(v)/l if l else np.array([0.,1,0])
def tri(key,mat,A,B,C,uvs=None):
 ar=groups.setdefault(key,{}).setdefault(mat,[[],[],[]]);A,B,C=map(np.asarray,(A,B,C));N=nrm(np.cross(B-A,C-A));ar[0].extend([A/1000,B/1000,C/1000]);ar[1].extend([N]*3)
 if uvs:ar[2].extend(uvs)
def quad(k,m,A,B,C,D):
 tri(k,m,A,B,C);tri(k,m,A,C,D)
def box(k,m,center,size):
 a=np.asarray(center)-np.asarray(size)/2;b=np.asarray(center)+np.asarray(size)/2
 v=[(a[0],a[1],a[2]),(b[0],a[1],a[2]),(b[0],b[1],a[2]),(a[0],b[1],a[2]),(a[0],a[1],b[2]),(b[0],a[1],b[2]),(b[0],b[1],b[2]),(a[0],b[1],b[2])]
 for inds in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)]:quad(k,m,*[v[i] for i in inds])
def tube(k,m,a,b,r,ri=0,n=16):
 a,b=np.array(a,float),np.array(b,float);w=nrm(b-a);u=nrm(np.cross(w,[1,0,0] if abs(w[0])<.8 else [0,1,0]));v=np.cross(w,u)
 for i in range(n):
  d1=u*math.cos(2*math.pi*i/n)+v*math.sin(2*math.pi*i/n);d2=u*math.cos(2*math.pi*(i+1)/n)+v*math.sin(2*math.pi*(i+1)/n)
  quad(k,m,a+r*d1,a+r*d2,b+r*d2,b+r*d1)
  if ri:
   quad(k,m,a+ri*d1,b+ri*d1,b+ri*d2,a+ri*d2);quad(k,m,b+r*d1,b+r*d2,b+ri*d2,b+ri*d1);quad(k,m,a+r*d2,a+r*d1,a+ri*d1,a+ri*d2)
  else:tri(k,m,b,b+r*d1,b+r*d2);tri(k,m,a,a+r*d2,a+r*d1)
def plaque(k,mat,W,H,cx,cy,z,flip=False):
 sx=-1 if flip else 1
 pts=[(cx+sx*x,cy+y,z) for x,y in [(-W/2,-H/2),(W/2,-H/2),(W/2,H/2),(-W/2,H/2)]]
 uv=[(0,1),(1,1),(1,0),(0,0)]
 for inds in [(0,1,2),(0,2,3)]:tri(k,mat,*[pts[i] for i in inds],tuple(uv[i] for i in inds))
matvals={'white':((.78,.79,.79),.10,.5),'pale':((.64,.67,.66),.19,.44),'gray':((.30,.34,.36),.43,.39),'black':((.029,.036,.046),.14,.45),'dark':((.013,.018,.023),.17,.53),'steel':((.64,.69,.70),.58,.33),'amber':((.77,.46,.14),.29,.50),'cyan':((.11,.48,.52),.26,.48),'glass':((.46,.66,.73),.47,.25),'plaque':((1,1,1),.08,.58),'side':((1,1,1),.08,.52)}
def profile(k,m,w,shape):
 x=w/2;c=np.mean(shape,axis=0)
 for i,(a,b) in enumerate(zip(shape,shape[1:]+shape[:1])):
  for q in (-x,x):
   z=lambda p:(q,*p)
   tri(k,m,z(c),z(a if q>0 else b),z(b if q>0 else a))
  quad(k,m,(-x,*a),(x,*a),(x,*b),(-x,*b))
B=box;T=tube
slot('stand',(0,0,0))
profile('stand','pale',111,[(0,-75),(0,67),(22,75),(28,61),(28,-75)])
profile('stand','white',111,[(22,-75),(22,-31),(235,-21),(253,-60)])
B('stand','black',(0,115,-41),(88,191,25))
B('stand','gray',(0,9,0),(106,16,134))
for x in (-43,43):
 for z in (-59,55):T('stand','dark',(x,0,z),(x,6,z),8,n=14)
slot('optical_head',(0,0,0))
profile('optical_head','white',105,[(197,-52),(197,45),(280,62),(280,-59)])
profile('optical_head','black',91,[(164,-24),(166,22),(201,45),(203,-51)])
T('optical_head','gray',(0,157,23),(0,172,23),15,n=32)
T('optical_head','glass',(0,155,23),(0,158,23),10,n=30)
slot('focus_left',(-52,185,-32))
T('focus_left','gray',(-8,0,0),(4,0,0),21,n=32)
T('focus_left','steel',(-8.1,0,0),(-7.8,0,0),18,n=32)
slot('focus_right',(52,185,-32))
T('focus_right','gray',(-4,0,0),(8,0,0),19,n=32)
slot('xy_stage',(0,0,23))
B('xy_stage','dark',(0,31,0),(98,14,86))
B('xy_stage','gray',(0,37,0),(89,5,74))
for x in (-41,41):B('xy_stage','black',(x,42,0),(7,10,70))
B('xy_stage','dark',(0,41,35),(95,10,8))
slot('coupon_pair',(0,0,0),'xy_stage')
for x,m in [(-2,'amber'),(2,'cyan')]:B('coupon_pair',m,(x,42.3,(-.7 if x<0 else .7)),(3.5,3.5,6))
slot('probe_carriage',(0,0,23))
B('probe_carriage','glass',(0,145,0),(20,14,20))
B('probe_carriage','gray',(0,134.3,0),(9,14,10))
B('probe_carriage','black',(0,119,0),(3.7,20,4))
# Inferred cartridge/support length. Spherical radius is accurately 25 microns, far below cabinet-scale resolution.
T('probe_carriage','steel',(0,49.1,0),(0,109,0),.55,n=12)
T('probe_carriage','glass',(0,49.025,0),(0,49.075,0),.025,n=12)
slot('approach_input',(0,0,0),'optical_head')
T('approach_input','cyan',(31,203,46),(31,203,49),5,n=24)
slot('cable',(0,0,0))
p=[(0,146,33),(-12,172,42),(-33,164,45),(-43,140,35),(-49,105,18),(-45,71,-50),(-38,40,-72)]
for a,b in zip(p,p[1:]):T('cable','gray',a,b,.95,n=10)
slot('rear_io',(0,0,0))
B('rear_io','black',(0,93,-73),(65,60,5))
B('rear_io','steel',(-14,95,-75),(14,9,2));B('rear_io','black',(-14,95,-75.8),(9,6,.8))
T('rear_io','gray',(10,87,-74),(10,87,-76),4,n=20)
def pic(side):
 im=Image.new('RGB',(480,76),'#9da2a4');d=ImageDraw.Draw(im);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',35)
 d.text((240,38),'PIUMA  /  NANOINDENTER' if not side else 'INTERFEROMETER',font=font,fill='#504e49',anchor='mm')
 b=io.BytesIO();im.save(b,format='PNG',optimize=True);return b.getvalue()
plaque('stand','plaque',82,13,0,11,71.6)
# Single buffer, 16-bit indices and material batches.
buf=bytearray();views=[];acc=[];mats=[];meshes=[];nodes=[]
def blob(b,t=None):
 while len(buf)%4:buf.append(0)
 i=len(views);views.append({'buffer':0,'byteOffset':len(buf),'byteLength':len(b),**({'target':t} if t else {})});buf.extend(b);return i
def accessor(arr,dim,position=False):
 arr=np.array(arr,dtype='<f4');v={'bufferView':blob(arr.tobytes(),34962),'componentType':5126,'count':len(arr),'type':'VEC'+str(dim)}
 if position:v.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
 acc.append(v);return len(acc)-1
images=[{'bufferView':blob(pic(back)),'mimeType':'image/png'} for back in (False,True)]
for n,(clr,metal,rough) in matvals.items():
 p={'baseColorFactor':[*clr,1],'metallicFactor':metal,'roughnessFactor':rough}
 if n in ('plaque','side'):p['baseColorTexture']={'index':0 if n=='plaque' else 1}
 mats.append({'name':n,'pbrMetallicRoughness':p})
tris=draws=0
for name,offset in trans.items():
 v={'name':name,'translation':(np.array(offset)/1000).tolist()}
 if name in groups:
  ps=[];geo=[]
  for m,(V,N,U) in groups[name].items():
   geo.extend(V);verts,idx=np.unique(np.hstack([V,N]+([U] if U else [])).round(7),axis=0,return_inverse=True);attrs={'POSITION':accessor(verts[:,:3],3,True),'NORMAL':accessor(verts[:,3:6],3)}
   if U:attrs['TEXCOORD_0']=accessor(verts[:,6:8],2)
   idx=idx.ravel().astype('<u2');acc.append({'bufferView':blob(idx.tobytes(),34963),'componentType':5123,'count':len(idx),'type':'SCALAR'});ps.append({'attributes':attrs,'indices':len(acc)-1,'material':list(matvals).index(m)});tris+=len(V)//3;draws+=1
  bounds[name]={'min':np.min(geo,axis=0).round(7).tolist(),'max':np.max(geo,axis=0).round(7).tolist()}
  v['mesh']=len(meshes);meshes.append({'name':name,'primitives':ps})
 child=[i for i,q in enumerate(trans) if parents[q]==name]
 if child:v['children']=child
 nodes.append(v)
asset={'asset':{'version':'2.0','generator':'BuildTheSimulation original Optics11 Piuma'},'scene':0,'scenes':[{'nodes':[i for i,k in enumerate(trans) if parents[k] is None]}],'nodes':nodes,'meshes':meshes,'materials':mats,'images':images,'textures':[{'source':0},{'source':1}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':acc}
def chunk(b,t,pad):b+=pad*((-len(b))%4);return struct.pack('<I4s',len(b),t)+b
binary=chunk(json.dumps(asset,separators=(',',':')).encode(),b'JSON',b' ')+chunk(bytes(buf),b'BIN\0',b'\0')
(D/'piuma.glb').write_bytes(struct.pack('<4sII',b'glTF',2,12+len(binary))+binary)
x={'device':'14-05','units':'m','up':'+Y','front':'+Z','nominalWHdMm':[120,280,150],
 'namedControls':{'approach_input':{'label':'Teaching approach/retract hotspot','action':'approach','localBoundsM':bounds['approach_input']},'probe_carriage':{'label':'Head and stage travel preview','action':'approach','localBoundsM':bounds['probe_carriage']}},
 'anchor':{'stage':'xy_stage','probe':'probe_carriage','note':'Animation exaggerates millimeter appearance; solver travels are independent SI values.'},'geometry':{'bytes':12+len(binary),'triangles':tris,'draws':draws,'nodes':len(nodes)}}
(D/'xr-manifest.json').write_text(json.dumps(x,indent=2)+'\n');print(x['geometry'])
