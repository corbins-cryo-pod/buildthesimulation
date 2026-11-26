"""Summit 11000B-AP original surrogate, scaled in mm then converted to glTF meters. NumPy/Pillow.
Source: FormFactor Facility Planning Guide 792-00069-1 p.3, Summit SS pp.2–4,15.
Envelope/platen/motion hardware anchors only; rear ports, optics and fixtures are inferred."""
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

matvals={'black':((.016,.02,.03),.18,.57),'navy':((.018,.043,.10),.17,.42),'iron':((.095,.102,.111),.47,.44),'steel':((.55,.61,.64),.63,.31),'brass':((.53,.31,.085),.63,.38),'dark':((.031,.036,.039),.08,.42),'gray':((.32,.36,.39),.45,.38),'plaque':((1,1,1),.04,.57),'side':((1,1,1),.04,.57),'red':((.59,.014,.027),.1,.31),'screen':((.018,.055,.073),.07,.31),'orange':((.85,.23,.025),.03,.38),'ivory':((.61,.68,.66),.3,.44),'silicon':((.18,.22,.31),.38,.25),'gold':((.8,.46,.11),.43,.27),'aqua':((.12,.40,.52),.38,.25)}
B=box;T=tube;cx=54;cz=21.5
slot('platform',(0,0,0));B('platform','navy',(54,53,14),(754,90,795));B('platform','iron',(54,105,-58),(746,34,638));B('platform','black',(54,86,390),(744,80,51))
B('platform','navy',(-369,57,267),(124,85,110));B('platform','navy',(323,158,-365),(188,205,101));B('platform','navy',(-236,156,-366),(233,200,99))
for x in (-290,380):
 for z in (-360,365):
  T('platform','black',(x,0,z),(x,19,z),23,n=20);T('platform','steel',(x,18,z),(x,35,z),14,n=12)
for x in (-290,398):
 B('platform','navy',(x,192,-230),(45,212,236));B('platform','navy',(x,194,266),(34,193,164))
 for z in (-264,217):
  T('platform','steel',(x,99,z),(x,281,z),11,n=16);T('platform','black',(x,258,z),(x,293,z),19,n=16)
# Platen proper: rectangular 745 × 595 ×20 with a through-hole approximated by a 20-segment ring and plate strips.
slot('platen',(54,0,21.5))
B('platen','steel',(0,310,-260),(745,20,75))
B('platen','steel',(0,310,260),(745,20,75))
B('platen','steel',(-260,310,0),(225,20,445))
B('platen','steel',(260,310,0),(225,20,445))
for j in range(32):
 a,b=(j*math.pi/16,(j+1)*math.pi/16);u=np.array((math.cos(a),math.sin(a)));v=np.array((math.cos(b),math.sin(b)))
 edge=lambda q:min(148/abs(q[0]) if abs(q[0])>1e-8 else 9999,224/abs(q[1]) if abs(q[1])>1e-8 else 9999)
 xy=[u*126,v*126,v*edge(v),u*edge(u)]
 # The plate top is +Y. Bottom and hole are independent.
 P=lambda q,y:(float(q[0]),y,float(q[1]))
 for y,order in [(320,[0,1,2,3]),(300,[3,2,1,0])]:quad('platen','gray',*[P(xy[i],y) for i in order])
 quad('platen','steel',P(xy[0],300),P(xy[1],300),P(xy[1],320),P(xy[0],320))
for x in (-343,-310,-264,264,310,343):
 for z in (-194,-144,-88,-30,30,88,144,194):T('platen','dark',(x,320.1,z),(x,320.4,z),2.2,n=8)
slot('bridge',(0,0,0))
for x in (-265,375):
 B('bridge','iron',(x,403,-192),(48,200,55))
 B('bridge','dark',(x,333,-192),(83,23,79))
B('bridge','navy',(54,485,-191),(700,57,83))
B('bridge','steel',(54,513,-188),(674,6,63))
slot('optics',(cx,0,cz))
B('optics','navy',(0,581,-107),(93,256,147))
B('optics','iron',(0,727,-70),(73,44,62))
B('optics','dark',(0,773,-70),(94,76,86))
B('optics','steel',(0,793,-29),(97,35,45))
B('optics','iron',(0,604,-24),(72,209,71))
T('optics','iron',(0,423,0),(0,575,0),41,n=32)
T('optics','steel',(0,382,0),(0,470,0),34,n=28)
T('optics','black',(0,370,0),(0,408,0),31,n=28)
T('optics','aqua',(0,369.9,0),(0,370,0),27,n=24)
for x in (-1,1):
 T('optics','black',(x*42,616,-36),(x*69,616,-36),25,n=24);T('optics','steel',(x*67,616,-36),(x*70,616,-36),16,n=16)
# Fixed room-temperature chuck is on the roll-out tray, not a motorized z stage.
slot('drawer',(cx,0,cz))
B('drawer','black',(0,67,185),(562,27,396))
for x in (-214,214):
 B('drawer','steel',(x,91,113),(20,20,459));B('drawer','dark',(x,126,48),(75,69,341))
B('drawer','navy',(0,89,357),(536,52,37))
for x in (-88,88):B('drawer','steel',(x,112,381),(19,18,18))
T('drawer','iron',(-88,112,392),(88,112,392),10,n=22)
slot('stage_xy',(0,0,0),'drawer')
B('stage_xy','iron',(0,171,0),(238,28,267))
B('stage_xy','gray',(0,204,0),(227,42,223))
T('stage_xy','dark',(0,221,0),(0,285,0),74,n=48)
slot('rotor',(0,0,0),'stage_xy')
T('rotor','metal' if 'metal' in matvals else 'steel',(0,271,0),(0,300,0),100,n=72)
T('rotor','brass',(0,299.9,0),(0,304.5,0),99.6,n=72)
for r in (22,50,74,90):
 T('rotor','dark',(0,304.5,0),(0,304.8,0),r+.50,r,56)
slot('coupon',(0,0,0),'rotor') # runtime procedural pad/coupon geometry based on input contract
# MicroChamber access door rotates out; geometry reflects generic visual location and avoids hidden spec claims.
slot('door_pivot',(-205,212,222));slot('door',(0,0,0),'door_pivot')
B('door','black',(258,-24,0),(516,148,14))
B('door','gray',(226,-22,8),(422,99,4))
B('door','dark',(348,3,12),(116,12,18))
plaque('door','plaque',118,23,102,20,10.1)
# Two DC arms with XYZ screws, independent tool-tip anchors plus inferred line routing.
for i,k in enumerate(('HI','LO')):
 side=-1 if i==0 else 1
 slot('positioner_'+k,(cx+side*172,0,cz+52))
 K='positioner_'+k
 B(K,'steel',(0,326,0),(103,13,114))
 B(K,'iron',(0,354,6),(83,47,90));B(K,'gray',(0,380,0),(63,15,58))
 B(K,'brass',(side*7,396,0),(51,24,29))
 for loc,E in [((side*29,357,5),(side*72,357,5)),((0,356,41),(0,356,80)),((0,394,0),(0,427,0))]:
  T(K,'steel',loc,E,7,n=14);T(K,'dark',E,tuple(a+.17*(a-b) for a,b in zip(E,loc)),12,n=16)
 slot('tip_'+k,(cx+side*.5,305.4,cz))
 node='tip_'+k
 T(node,'brass',(side*109,78,51),(side*37,35,15),3.4,n=16)
 T(node,'steel',(side*38,36,16),(side*2,4,.6),.36,n=12)
 T(node,'gold' if i==0 else 'aqua',(side*2,4,.6),(0,0,0),.13,n=10)
 pts=[(cx+side*182,400,cz+48),(cx+side*200,440,cz+30),(cx+side*234,450,-152),(cx+side*197,375,-290)]
 for a,b in zip(pts,pts[1:]):T('platform','black',a,b,4,n=12)
# Operator control box; no external measurement electronics manufactured as part of this station.
slot('console',(-366,131,295));B('console','dark',(0,0,0),(129,51,191))
B('console','gray',(0,27,0),(119,3,180))
for x,y,z,clr in [(-25,28,42,'red'),(22,28,43,'orange'),(-24,28,0,'black'),(22,28,0,'black'),(-24,28,-42,'black'),(22,28,-42,'black')]:
 T('console',clr,(x,y,z),(x,y+15,z),12,n=20)
slot('rear',(0,0,0));B('rear','dark',(206,189,-406),(284,107,13))
for j in range(9):
 T('rear','steel',(90+j*29,198,-412),(90+j*29,198,-415.5),6,2,12)
for z in (-327,-306,-290):
 B('rear','black',(274,180,z),(185,.8,4))
slot('smu',(685,0,-33))
B('smu','dark',(0,114,0),(238,128,293));B('smu','gray',(0,112,145),(229,116,10));B('smu','screen',(-38,113,151),(125,77,1))
for x in (62,94):
 T('smu','red' if x==62 else 'black',(x,133,150),(x,133,155),8,2.3,12)
plaque('smu','side',166,19,-6,163,151)
slot('smu_lead',(0,0,0))
for sign in (1,-1):
 pts=[(740+sign*14,132,123),(742+sign*15,110,160),(686+sign*19,37,212),(512+sign*16,28,194),(422+sign*9,135,93),(270+sign*13,179,-400)]
 for a,b in zip(pts,pts[1:]):T('smu_lead','red' if sign==1 else 'black',a,b,2.5,n=10)
def pic(side):
 im=Image.new('RGB',(700,100),'#172a40' if not side else '#323b42');d=ImageDraw.Draw(im)
 font=ImageFont.truetype(str(Path(os.environ.get('PROBE_FONT_DIR','/usr/share/fonts/truetype/dejavu'))/'DejaVuSans-Bold.ttf'),44)
 d.text((350,54),'SUMMIT   11000B-AP' if not side else 'EXTERNAL DC SOURCE',font=font,fill='#e9e8d7',anchor='mm')
 b=io.BytesIO();im.save(b,format='PNG',optimize=True);return b.getvalue()
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
asset={'asset':{'version':'2.0','generator':'BuildTheSimulation original Summit 11000B-AP'},'scene':0,'scenes':[{'nodes':[i for i,k in enumerate(trans) if parents[k] is None]}],'nodes':nodes,'meshes':meshes,'materials':mats,'images':images,'textures':[{'source':0},{'source':1}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':acc}
def chunk(b,t,pad):b+=pad*((-len(b))%4);return struct.pack('<I4s',len(b),t)+b
binary=chunk(json.dumps(asset,separators=(',',':')).encode(),b'JSON',b' ')+chunk(bytes(buf),b'BIN\0',b'\0')
(D/'summit-11000b.glb').write_bytes(struct.pack('<4sII',b'glTF',2,12+len(binary))+binary)
query={'door':('shield','MicroChamber access shield'),'drawer':('drawer','Rollout chuck handle'),'tip_HI':('tip0','DC probe HI tip'),'tip_LO':('tip1','DC probe LO tip'),'smu':('connect','External source terminal'),'console':('run','Teaching acquisition hotspot')}
m={'device':'05-07','units':'m','up':'+Y','operatorFront':'+Z','benchDatum':0,'chuckOriginM':[.054,.3054,.0215],'moves':{'drawer':{'axis':'Z','travelM':.235,'illustrativeClearanceDropM':.018,'estimated':True},'stage_xy':{'axes':'X/Z','travelM':[.203,.203]},'rotor':{'axis':'Y','thetaDeg':[-5.7,5.7]},'door_pivot':{'axis':'Y','radians':[0,-1.55],'estimated':True}},'nodes':{k:{'action':act,'label':label,'localBoundsMinM':bounds[k]['min'],'localBoundsMaxM':bounds[k]['max']} for k,(act,label) in query.items()},'budget':{'triangles':tris,'drawPrimitives':draws,'nodes':len(nodes),'bytes':len(binary)+12},'physicalHeadsetTested':False}
(D/'xr-manifest.json').write_text(json.dumps(m,indent=2)+'\n');print(m['budget'])
