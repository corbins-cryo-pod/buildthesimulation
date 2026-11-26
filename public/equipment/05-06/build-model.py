"""Editable CDE ResMap 178 reconstruction, built with Python 3, NumPy and Pillow.
Input units millimeters; output meters, +Y up, +Z toward operator. Fixture datum: feet/bench.
Sources: CDE 178 product page and image; Waterloo and SJTU installation photographs;
Jandel brochure pp. 3–4. Vendor files and photographs are not embedded. The unpublished
rear connector arrangement, mechanism dimensions, and motion travel are inferred."""
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
matvals={
 'ivory':((.68,.63,.49),.18,.49),'ivorylight':((.76,.71,.58),.10,.46),'dark':((.028,.032,.037),.20,.49),'black':((.01,.01,.013),.02,.58),
 'steel':((.63,.66,.69),.63,.35),'bronze':((.44,.25,.095),.52,.34),'orange':((.97,.41,.02),.11,.37),'red':((.72,.032,.02),.07,.42),
 'blue':((.036,.19,.49),.14,.45),'plaque':((1,1,1),.05,.65),'side':((1,1,1),.1,.52),'wafer':((.079,.21,.24),.61,.25),
 'screen':((.055,.13,.18),.05,.42),'sense':((.27,.61,.72),.39,.32),'source':((.80,.43,.14),.49,.37)}
slot('cabinet',(0,0,0))
def B(k,m,c,s):box(k,m,c,s)
# Closed cabinet envelope 304.8 x 254 x 482.6 mm. Lid opening extends above envelope.
B('cabinet','ivory',(0,74,0),(296,112,474))
B('cabinet','ivorylight',(0,103,237.3),(304.8,162,8))
B('cabinet','ivorylight',(-137.5,192,0),(29.8,104,468))
B('cabinet','ivorylight',(140.4,184,0),(24,99,467))
B('cabinet','ivorylight',(0,228,-188),(304.8,50,105))
B('cabinet','dark',(0,119,31),(244,24,369))
B('cabinet','dark',(0,184,-119),(238,110,69))
B('cabinet','ivorylight',(0,117,-237.3),(304.8,136,8))
for x in (-128,128):
 for z in (-196,196):tube('cabinet','black',(x,0,z),(x,18,z),13,n=20)
for x in (-135,135):
 for y in (43,153):tube('cabinet','steel',(x,y,241.31),(x,y,241.44),2.3,n=10)
for z in (-206,-78,62,198):
 for y in (55,158):tube('cabinet','steel',(152.4,y,z),(152.6,y,z),2.5,n=10)
# Annotated 18–19 inch ambiguity is not faked as a physical measurement.
slot('shield_hinge',(0,241,-106));slot('shield',(0,0,0),'shield_hinge')
B('shield','dark',(0,6,168),(244,14,332))
B('shield','dark',(0,-17,329),(244,60,18))
for x in (-119,119):B('shield','black',(x,-9,166),(6,22,335))
for x in (-78,78):tube('shield','steel',(x-13,0,0),(x+13,0,0),7,n=18)
slot('stage_xz',(0,-49,29))
for x in (-93,93):
 B('cabinet','black',(x,134,24),(13,13,286))
 tube('cabinet','steel',(x,139,-110),(x,139,150),2.5,n=12)
B('stage_xz','dark',(0,188,0),(138,15,183))
slot('chuck_rotor',(0,0,0),'stage_xz')
tube('chuck_rotor','black',(0,193,0),(0,204,0),107,n=72)
tube('chuck_rotor','bronze',(0,204,0),(0,208,0),107.3,103,72)
tube('chuck_rotor','dark',(0,204,0),(0,207,0),103,n=72)
for r in (22,62,86):tube('chuck_rotor','black',(0,207,0),(0,207.20,0),r+.6,r,48)
for x in (-68,-34,0,34,68):
 for z in (-68,-34,0,34,68):
  if x*x+z*z<88**2:tube('chuck_rotor','steel',(x,207.21,z),(x,207.34,z),.75,n=9)
slot('film',(0,0,0),'chuck_rotor')
tube('film','wafer',(0,207.5,0),(0,208.2,0),50,n=72)
tube('film','steel',(0,207.4,0),(0,207.5,0),49.9,n=72)
B('film','bronze',(0,208.26,-47),(1.1,.15,4))
slot('arm',(0,-49,29));B('arm','dark',(0,276,-86),(43,37,45))
B('arm','dark',(0,272,-44),(35,20,80))
B('arm','steel',(0,262,-45),(18,4,84))
# Plunger/chuck contact and animated pose. Profile height, closed: inspect teaching guard notes.
slot('probe_lift',(0,-49,29));slot('probe_yaw',(0,0,0),'probe_lift')
B('probe_lift','steel',(0,235,0),(25.4,36,24))
tube('probe_lift','steel',(0,214.2,0),(0,232,0),12.7,n=32)
tube('probe_lift','black',(0,209.7,0),(0,217,0),5.6,n=24)
B('probe_lift','blue',(0,253,10),(7,5,5))
for x in (-2,0,2):
 for z in (9,11):B('probe_lift','black',(x,255.6,z),(.9,.25,.8))
for i,x in enumerate((-1.5,-.5,.5,1.5)):
 k='P'+str(i+1);slot(k,(x,208.2,0),'probe_yaw')
 mat='source' if i in (0,3) else 'sense'
 tube(k,mat,(0,.2,0),(0,1.5,0),.2,n=14)
 for j in range(14):
  a,b=[2*math.pi*v/14 for v in (j,j+1)]
  tri(k,mat,(0,0,0),(.2*math.cos(b),.2,.2*math.sin(b)),(.2*math.cos(a),.2,.2*math.sin(a)))
for a,b in zip([(0,257,39),(0,273,33),(0,283,4),(0,281,-23),(0,254,-89)],[(0,273,33),(0,283,4),(0,281,-23),(0,254,-89)]):tube('arm','black',a,b,2.5,n=9)
# Separate power plate and simplified rear panel connections: positions are not from drawings.
slot('panel_power',(152.65,125,-125));B('panel_power','black',(0,0,0),(.8,62,70))
slot('run_switch',(153.2,132,-107));B('run_switch','orange',(0,0,0),(2,11,17))
slot('rear_ports',(0,0,0));B('rear_ports','black',(38,121,-241.7),(86,50,1.4))
B('rear_ports','steel',(32,122,-243),(26,15,2.5));B('rear_ports','black',(32,122,-244.4),(21,10,1))
for x in (27,32,37):B('rear_ports','bronze',(x,123,-245),(1,4,1.3))
B('rear_ports','steel',(66,122,-242),(12,10,3))
for z in (-245,-252,-265):tube('rear_ports','black',(66,122,z),(66,122,z-6),2.1,n=9)
slot('host',(425,0,-37))
B('host','black',(0,12,0),(233,16,137))
B('host','dark',(0,123,-121),(56,222,28))
B('host','black',(0,279,-97),(345,225,30))
B('host','screen',(0,278,-81.8),(324,204,.7))
B('host','black',(0,16,193),(272,15,82))
for z in (167,177,187,197,207,217):
 for x in range(-120,121,13):B('host','dark',(x,25,z),(11,3,8))
slot('host_cable',(0,0,0),'host')
pts=[(-359,122,-217),(-332,95,-234),(-298,12,-225),(-232,6,-173),(-119,6,-88),(-33,19,-91),(0,200,-115)]
for a,b in zip(pts,pts[1:]):tube('host_cable','black',a,b,2,n=10)
def pic(side=False):
 im=Image.new('RGB',(700,360) if not side else (400,340),(185,174,143) if not side else (25,25,27));d=ImageDraw.Draw(im)
 dirname=Path(os.environ.get('RESMAP_FONT_DIR','/usr/share/fonts/truetype/dejavu'))
 def f(n,b=False):return ImageFont.truetype(str(dirname/('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf')),n)
 if not side:
  d.rounded_rectangle((14,22,685,338),radius=18,outline=(144,135,110),width=4)
  d.text((350,169),'ResMap',fill=(106,101,83),font=f(112),anchor='mm',stroke_width=1,stroke_fill=(219,208,183))
  d.text((350,281),'178   /   FOUR-POINT MAPPER',fill=(83,79,63),font=f(23,True),anchor='mm')
 else:
  d.rectangle((9,9,390,330),outline=(226,192,83),width=5);d.text((23,25),'CDE   178',fill='#edba3e',font=f(34,True))
  d.text((23,104),'MANUAL LOAD',fill='#edba3e',font=f(21));d.text((23,275),'VIRTUAL FIXTURE',fill='#edba3e',font=f(16))
 b=io.BytesIO();im.save(b,format='PNG',optimize=True);return b.getvalue()
plaque('cabinet','plaque',255,122,0,107,241.39)
# Side plate art on operator-right, normal +X.
v=[(152.5,96,-160),(152.5,96,-90),(152.5,155,-90),(152.5,155,-160)]
for i,j,k in [(0,3,2),(0,2,1)]:tri('cabinet','side',v[i],v[j],v[k],tuple([(0,1),(1,1),(1,0),(0,0)][q] for q in [i,j,k]))
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
asset={'asset':{'version':'2.0','generator':'BuildTheSimulation original parametric ResMap 178'},'scene':0,'scenes':[{'nodes':[i for i,k in enumerate(trans) if parents[k] is None]}],'nodes':nodes,'meshes':meshes,'materials':mats,'images':images,'textures':[{'source':0},{'source':1}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':acc}
def chunk(b,t,pad):b+=pad*((-len(b))%4);return struct.pack('<I4s',len(b),t)+b
binary=chunk(json.dumps(asset,separators=(',',':')).encode(),b'JSON',b' ')+chunk(bytes(buf),b'BIN\0',b'\0')
(D/'resmap-178.glb').write_bytes(struct.pack('<4sII',b'glTF',2,12+len(binary))+binary)
hint={'shield':('lid','Load shield'), 'film':('load','Wafer face (inspect loaded fixture)'), 'probe_lift':('head','Retract or seat probe'), 'run_switch':('run','Acquire four-point reading (teaching hotspot)')}
manifest={'device':'05-06','units':'m','up':'+Y','operatorFront':'+Z','datum':'bench','cabinetWHDm':[.3048,.254,.4826],'articulation':{'shield_hinge':{'axis':'X','travelRad':[0,-1.7],'provenance':'estimated'},'probe_lift':{'axis':'Y','travelM':[0,.007],'provenance':'estimated unloaded lift'},'stage_xz':{'axes':'scene Z travel plus chuck/probe rotation maps the selected site to the measuring axis','provenance':'illustrative recipe geometry, not motor particulars'}},'contacts':[{'id':'P'+str(i+1),'xOffsetM':x*.001,'role':t} for i,(x,t) in enumerate(zip([-1.5,-.5,.5,1.5],['force+','sense+','sense−','force−']))],'interactionNodes':{k:{'action':a,'label':b,'localMeshBoundsM':bounds[k]} for k,(a,b) in hint.items()},'geometry':{'nodes':len(nodes),'triangles':tris,'drawPrimitives':draws,'bytes':len(binary)+12},'note':'Not tested on a physical VR headset.'}
(D/'xr-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(manifest['geometry'])
