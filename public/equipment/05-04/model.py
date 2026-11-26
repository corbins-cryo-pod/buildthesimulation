"""Legacy J.A. Woollam alpha-SE, fixed standard 3 mm optics and removable standard vacuum chuck.
Input mm, glTF meters. Anchors: legacy manual Fig. 3-1, Fig. 4-1, brochure front. Other lengths inferred.
No external photo or vendor CAD included. Python + Pillow + NumPy."""
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
matvals={'silver':((.53,.56,.58),.42,.36),'steel':((.65,.66,.66),.62,.34),'edge':((.37,.42,.45),.49,.4),'dark':((.038,.046,.055),.22,.55),'black':((.012,.015,.016),.06,.63),'glass':((.12,.23,.27),.45,.2),'gold':((.69,.44,.19),.58,.34),'green':((.034,.54,.14),.11,.31),'plaque':((1,1,1),.08,.61),'side':((1,1,1),.07,.54),'wafer':((.21,.38,.49),.52,.25)}
B=box;T=tube
def span(k,m,points,y0,y1):
 # Extruded X/Z profile; used for the open carry slots, corners and connecting sections.
 cen=np.mean(points,axis=0);pt=lambda p,y:(p[0],y,p[1])
 for i,p in enumerate(points):
  q=points[(i+1)%len(points)]
  tri(k,m,pt(cen,y1),pt(q,y1),pt(p,y1));tri(k,m,pt(cen,y0),pt(p,y0),pt(q,y0))
  quad(k,m,pt(p,y0),pt(p,y1),pt(q,y1),pt(q,y0))
slot('frame',(0,0,0))
for x in (-215,215):
 for z in (-130,130):
  T('frame','black',(x,0,z),(x,29,z),21,n=28);T('frame','edge',(x,26,z),(x,33,z),19,n=24)
# 480 × 310 mm base with two genuine open handholds.
B('frame','silver',(0,39,0),(354,18,310))
for x in (-209,209):
 for z in (-106,112):B('frame','silver',(x,39,z),(62,18,86))
 B('frame','silver',(x+(23 if x>0 else -23),39,1),(16,18,151))
 B('frame','silver',(x+(-25 if x>0 else 25),39,1),(12,18,151))
B('frame','steel',(0,50,-113),(477,4,38))
# Rounded back plate in X/Y, and rear service cover. Closed envelope H 300 mm.
R=24;c=[(216,272),(-216,272),(-216,73),(216,73)]
pts=[]
for q,(x,y) in enumerate(c):
 for i in range(9):
  a=(q*90+i*90/8)*math.pi/180;pts.append((x+R*math.cos(a),y+R*math.sin(a)))
def panel(k,m,points,z0,z1):
 cp=np.mean(points,axis=0)
 for i,p in enumerate(points):
  q=points[(i+1)%len(points)]
  c=(cp[0],cp[1],z1);tri(k,m,c,(*p,z1),(*q,z1));tri(k,m,(cp[0],cp[1],z0),(*q,z0),(*p,z0));quad(k,m,(*p,z0),(*q,z0),(*q,z1),(*p,z1))
panel('frame','silver',pts,-92,-65)
B('frame','edge',(0,175,-122),(417,226,63));B('frame','silver',(0,178,-152),(424,219,6))
for x in (-222,-171,171,222):
 for y in (70,267):
  T('frame','steel',(x,y,-65),(x,y,-64.3),3.5,n=10)
B('frame','silver',(0,275,-111),(19,18,28));T('frame','steel',(0,281,-111),(0,300,-111),7,n=20)
slot('support_column',(0,0,0));B('support_column','silver',(0,227,-40),(55,137,57))
B('support_column','steel',(0,143,-35),(49,38,44));T('support_column','steel',(0,147,-33),(0,169,-33),21,n=28)
B('support_column','edge',(0,118,-39),(66,52,32))
for x in (-28,28):T('support_column','steel',(x,120,-18),(x,120,-9),6,n=16)
# Standard chuck at the reflected ray intersection (0, 89, 37).
slot('stage',(0,0,37))
B('stage','black',(0,56,9),(100,18,98))
B('stage','silver',(0,66,3),(107,19,132))
T('stage','steel',(0,75,0),(0,89,0),70,49,64);T('stage','dark',(0,76,0),(0,86,0),50,n=48)
for x in (-52,52):
 for z in (-36,36):T('stage','steel',(x,84,z),(x,89,z),3.1,n=10)
for r in (12,26,41):T('stage','black',(0,86,0),(0,86.5,0),r+.6,r,40)
slot('sample',(0,0,37));T('sample','wafer',(0,86.7,0),(0,89,0),41,n=64)
for side,arm in [(-1,'source_arm'),(1,'detector_arm')]:
 slot(arm,(0,89,37))
 # Mirrored optics; the path is local ±X. Optical face is x=±56 mm.
 B(arm,'edge',(side*139,0,-32),(133,83,93))
 B(arm,'silver',(side*153,0,13),(122,76,79))
 B(arm,'silver',(side*135,16,-25),(111,47,87))
 T(arm,'black',(side*54,0,0),(side*97,0,0),16,10,32)
 T(arm,'steel',(side*55,0,0),(side*66,0,0),11,8,28)
 T(arm,'glass',(side*56,0,0),(side*58,0,0),8,n=22)
 stem='source_indexer' if side<0 else 'detector_indexer'
 slot(stem,(side*169,213,-55))
 T(stem,'steel',(0,0,-12),(0,0,16),8,n=18);T(stem,'black',(0,0,12),(0,0,29),12,n=24)
 for a in range(65,91,5):
  aa=(90-a)*math.pi/180;x=side*188*math.cos(aa);y=89+188*math.sin(aa)
  T('frame','dark',(x,y,-65),(x,y,-63.9),2.2,n=10)
slot('power',(-130,252,-64));B('power','black',(0,0,0),(23,22,10));B('power','green',(0,0,7),(17,17,6))
slot('vacuum',(164,25,123));B('vacuum','steel',(0,0,5),(37,43,20))
T('vacuum','black',(0,0,12),(0,0,19),8,n=24);T('vacuum','steel',(0,0,17),(4,8,28),4.1,n=16)
slot('fittings',(0,0,0));T('fittings','gold',(98,50,48),(98,61,48),6,n=26)
T('fittings','gold',(95,53,48),(88,53,48),6,n=18)
pts=[(88,53,48),(73,46,60),(53,44,59),(42,48,48),(39,65,43),(34,69,40)]
for a,b in zip(pts,pts[1:]):T('fittings','black',a,b,2.7,n=11)
B('fittings','dark',(62,101,-155.17),(121,74,.30))
B('fittings','black',(39,108,-155.39),(34,24,.10))
B('fittings','steel',(96,109,-155.38),(14,11,.10))
B('fittings','black',(96,109,-155.47),(9,8,.04))
for x in range(-105,-45,9):B('fittings','dark',(x,115,-155.15),(4,52,.08))
def pic(side):
 im=Image.new('RGB',(640,86),'#7c8488');d=ImageDraw.Draw(im);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',42)
 d.text((320,43),'alpha-SE  /  SPECTROSCOPIC ELLIPSOMETER' if not side else 'DATA  •  POWER',font=font,fill='#f3f2e8',anchor='mm')
 b=io.BytesIO();im.save(b,format='PNG',optimize=True);return b.getvalue()
# A front-facing original nameplate, no vendor graphic marks copied.
plaque('frame','plaque',284,12,0,39,155.02)
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
asset={'asset':{'version':'2.0','generator':'BuildTheSimulation original legacy alpha-SE'},'scene':0,'scenes':[{'nodes':[i for i,k in enumerate(trans) if parents[k] is None]}],'nodes':nodes,'meshes':meshes,'materials':mats,'images':images,'textures':[{'source':0},{'source':1}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':acc}
def chunk(b,t,pad):b+=pad*((-len(b))%4);return struct.pack('<I4s',len(b),t)+b
binary=chunk(json.dumps(asset,separators=(',',':')).encode(),b'JSON',b' ')+chunk(bytes(buf),b'BIN\0',b'\0')
(D/'alpha-se.glb').write_bytes(struct.pack('<4sII',b'glTF',2,12+len(binary))+binary)
xr={'device':'05-04','origin':'bench','units':'m','up':'+Y','operator':'+Z','nominalEnvelopeWHDmm':[480,300,310],
 'axisAnchorM':[0,.089,.037],'angleDetents':[65,70,75,90], 'motions':{'source_arm':{'axis':'Z','direction':-1},'detector_arm':{'axis':'Z','direction':1}},
 'interactions':{k:{'label':l,'action':a,'localBoundsM':bounds[k]} for k,l,a in [('source_indexer','Source angle indexer','source'),('detector_indexer','Detector angle indexer','detector'),('power','Power','power'),('vacuum','Chuck vacuum','vacuum'),('sample','Sample loading surface','load')]},
 'geometry':{'nodes':len(nodes),'triangles':tris,'drawPrimitives':draws,'bytes':len(binary)+12},'headsetTested':False}
(D/'xr-manifest.json').write_text(json.dumps(xr,indent=2)+'\n');print(xr['geometry'])
