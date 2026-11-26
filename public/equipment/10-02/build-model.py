"""Rebuild original Digidata 1550B model and illustrated panel studies. Python 3, Pillow, NumPy.
Units below are millimeters in a right handed frame: +X operator right, +Y up, +Z toward operator.
Source: Molecular Devices 5040237 C, cover and pp. 15, 19, 33. Enclosure envelope from p.33.
All connector spacing, material hues, recesses, chamfers and accessory dimensions inferred from images.
No vendor artwork or photographs are embedded. Set DD_FONT_DIR to select a DejaVu font installation."""
from pathlib import Path
import json, struct, math, io, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
D=Path(__file__).resolve().parent
def font(size):return ImageFont.truetype(str(Path(os.environ.get('DD_FONT_DIR','/usr/share/fonts/truetype/dejavu'))/'DejaVuSansCondensed.ttf'),size)
S=4
def panel(back=False):
 W,H=(422,86) if not back else (420,84)
 im=Image.new('RGB',(W*S,H*S),(206,206,201));d=ImageDraw.Draw(im)
 def xy(x,y):return ((x+W/2)*S,(106-y)*S)
 def lab(x,y,st,fs=3.3,fill='#13273c',align='mm'):
  d.text(xy(x,y),st,font=font(round(fs*S)),fill=fill,anchor=align)
 def rect(x,y,x2,y2,fill,outline=None,w=.5,r=1):
  d.rounded_rectangle((*xy(x,y2),*xy(x2,y)),radius=r*S,fill=fill,outline=outline,width=max(1,round(w*S)))
 if not back:
  lab(-188,98,'AXON INSTRUMENTS',4,align='lm');lab(-188,91,'MOLECULAR DEVICES',2.7,align='lm')
  lab(-191,28,'Digidata 1550B',5,align='lm');lab(-105,27,'LOW-NOISE DATA ACQUISITION SYSTEM',3.2,align='lm')
  for x,y,t in [(-155,85,'POWER'),(-155,69,'READY'),(-155,51,'SCOPE'),(-128,82,'TAG'),(-128,51,'START'),(-191,61,'I / O')]:lab(x,y,t,3.3)
  for g,(c,t) in enumerate([(-59,'DIGITAL OUTPUTS'),(44,'ANALOG OUTPUTS'),(147,'ANALOG INPUTS')]):
   rect(c-43,36,c+43,96,'#183868',r=4);rect(c-40,38,c+40,88,'#d2d1cb',r=3)
   lab(c,92,t,3.8,'#ffffff')
   for i in range(8):lab(c-31+20.7*(i%4),83 if i<4 else 56,str(i),3.2)
 else:
  lab(-194,101,'AXON  /  MOLECULAR DEVICES',4,align='lm');lab(-185,30,'Digidata 1550B  ·  LOW-NOISE DATA ACQUISITION SYSTEM',3.7,align='lm')
  lab(-120,77,'TELEGRAPH INPUTS',3.7);lab(-51,63,'USB 2',3);lab(11,63,'DIGITAL OUTPUTS',3.7)
  for i in range(4):lab(-157+i*23,67,str(i),3)
  lab(152,87,'100–240 VAC',3.7);lab(152,82,'50/60 Hz, max 50 W',3.2)
  rect(56,60,107,91,'#cacbc7','#273747',.3);lab(81.5,84,'MODEL: DD1550B',3.7);lab(81.5,75,'BASE CONFIGURATION',3.1);lab(81.5,67,'0 ANC CHANNELS',2.8)
 buf=io.BytesIO();im.save(buf,format='PNG',optimize=True);return buf.getvalue()
front,rear=panel(),panel(True)
matvals={'blue':((.025,.048,.16),.38,.32),'lightmetal':((.63,.65,.65),.65,.36),'steel':((.65,.69,.7),.8,.29),'dark':((.028,.032,.038),.14,.54),'black':((.011,.012,.014),.02,.59),'cream':((.79,.77,.68),.24,.55),'gold':((.71,.48,.19),.7,.28),'green':((.09,.65,.15),.12,.25),'amber':((.99,.65,.055),.11,.25),'cyan':((.08,.18,.20),.04,.33),'front':((1,1,1),.18,.59),'rear':((1,1,1),.18,.59)}
groups={}; labels={}; interact={}; bounds={}
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
def tag(k,label,action=None,index=None):
 labels[k]=label
 if action:interact[k]={'action':action,**({'index':index} if index is not None else {})}
def port(k,x,y,z,d,label,a=None,i=None):
 tag(k,label,a,i)
 tube(k,'steel',(x,y,z),(x,y,z+d*2),7,n=6);tube(k,'steel',(x,y,z+2*d),(x,y,z+10*d),4.9,3.8,12)
 tube(k,'cream',(x,y,z+3*d),(x,y,z+8*d),3.7,1.3,12);tube(k,'gold',(x,y,z+3*d),(x,y,z+7*d),1.3,.7,8)
 tube(k,'steel',(x-5.8,y,z+7*d),(x-4.2,y,z+7*d),.85,n=8);tube(k,'steel',(x+4.2,y,z+7*d),(x+5.8,y,z+7*d),.85,n=8)
def plaque(k,mat,W,H,cx,cy,z,flip=False):
 sx=-1 if flip else 1
 pts=[(cx+sx*x,cy+y,z) for x,y in [(-W/2,-H/2),(W/2,-H/2),(W/2,H/2),(-W/2,H/2)]]
 uv=[(0,1),(1,1),(1,0),(0,0)]
 for inds in [(0,1,2),(0,2,3)]:tri(k,mat,*[pts[i] for i in inds],tuple(uv[i] for i in inds))
K='rack_shell';tag(K,'Cabinet, lid and rack ears');box(K,'blue',(0,62,-8),(420,94,325));box(K,'lightmetal',(0,63,153.5),(424,86,4))
for x in [-216,216]:
 box(K,'blue',(x,64,153.7),(51,88,3))
 for y in [26,100]:box(K,'black',(x*1.053,y,155.23),(9,4,.14))
 # U handle as separate stable named element
 k='handle_left' if x<0 else 'handle_right';xx=x*.984
 for yy in [29,98]:tube(k,'steel',(xx,yy,154),(xx,yy,177),(3.9),n=16)
 tube(k,'steel',(xx,29,177),(xx,98,177),4.5,n=16)
for x in [-179,179]:
 for z in [-139,126]:box(K,'black',(x,7.5,z),(32,15,33))
plaque('front_legends','front',422,86,0,63,155.7);box(K,'lightmetal',(0,63,-170.5),(420,84,2));plaque('rear_legends','rear',420,84,0,64,-171.55,True)
for x in [-201,0,201]:
 for y in [25,100]:
  tube(K,'steel',(x,y,155.8),(x,y,156.6),2.2,n=12);tube(K,'steel',(x,y,-172),(x,y,-173),2.2,n=12)
for c,pref,lab in [(-59,'DO','Digital output'),(44,'AO','Analog output'),(147,'AI','Analog input')]:
 for i in range(8):port(f'{pref}{i}',c-31+20.7*(i%4),72 if i<4 else 45,156,1,f'{lab} {i}','map' if pref=='AI' else None,i)
for x,y,k in [(-128,71,'TAG'),(-128,44,'START'),(-155,44,'SCOPE')]:port(k,x,y,156,1,k+' TTL')
for i in range(4):port('telegraph_'+str(i),157-i*23,52,-171.5,-1,'Telegraph input '+str(i))
tag('power_switch','Power rocker','power');box('power_switch','black',(-190,43,157),(15,22,5));box('power_switch','dark',(-190,45,161),(11,13,4))
for k,y,m in [('POWER_LED',77,'green'),('READY_LED',61,'amber')]:tube(k,'dark',(-155,y,156),(-155,y,158),2.6);tube(k,m,(-155,y,158),(-155,y,159.5),1.6)
box('USB_B','steel',(51,51,-173),(12,11,4));box('USB_B','black',(51,51,-175.2),(9,8,.6));tag('USB_B','USB 2 type B host link','usb')
box('rear_DB25','steel',(-11,51,-173),(46,12,3));box('rear_DB25','dark',(-11,51,-174.8),(40,8,1))
for row,n in [(0,13),(1,12)]:
 for i in range(n):tube('rear_DB25','gold',(-28+i*2.8+row*1.4,49.8+row*2.5,-175.3),(-28+i*2.8+row*1.4,49.8+row*2.5,-176.3),.4,n=6)
box('rear_IEC','black',(-152,61,-173),(36,29,4))
for x,y in [(-160,61),(-144,61),(-152,67)]:box('rear_IEC','steel',(x,y,-176),(2.5,6,2.5))
# Real depth anchored to envelope including rear screw posts. Rear peripherals are isolated visual affordances.
for x in [-33,11]:tube('rear_DB25','steel',(x,51,-174),(x,51,-181.5),2.6,n=6)
# Optional removable cable plug at AI0; state maps move this node to the selected jack.
tag('signal_patch','Analyzer input patch lead','connected');tube('signal_patch','steel',(116,72,164),(116,72,179),5.4,n=16)
path=[(116,72,179),(116,72,190),(120,66,208),(134,50,222),(152,36,230),(171,30,239),(191,28,249)]
for a,b in zip(path,path[1:]):tube('signal_patch','black',a,b,2.2,n=12)
# Companion host deliberately generic, not part of the cabinet envelope. Toggled as a context view.
H='generic_host';tag(H,'Generic USB acquisition workstation (illustrative accessory)')
box(H,'dark',(395,5,-22),(215,10,142));box(H,'dark',(395,78,-87),(213,138,8));box(H,'cyan',(395,78,-82),(198,119,2))
for i in range(6):box(H,'black',(395,11,-52+11*i),(174,1,7))
for a,b in zip([(51,51,-175),(51,40,-215),(110,8,-236),(255,6,-235),(303,6,-75)],[(51,40,-215),(110,8,-236),(255,6,-235),(303,6,-75),(303,6,-50)]):tube('usb_lead','black',a,b,2,n=10)
tag('usb_lead','Illustrative USB cable');labels.setdefault('front_legends','Front operator labeling');labels.setdefault('rear_legends','Rear connector labeling')
buf=bytearray();views=[];acc=[];meshes=[];nodes=[];mats=[];imgs=[]
def blob(b,t=None):
 while len(buf)%4:buf.append(0)
 i=len(views);views.append({'buffer':0,'byteOffset':len(buf),'byteLength':len(b),**({'target':t} if t else {})});buf.extend(b);return i
def accessor(arr,dim,isPos):
 arr=np.array(arr,dtype='<f4');a={'bufferView':blob(arr.tobytes(),34962),'componentType':5126,'count':len(arr),'type':'VEC'+str(dim)}
 if isPos:a.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
 acc.append(a);return len(acc)-1
for label,data in [('front',front),('rear',rear)]:imgs.append({'name':label+' original face legend','bufferView':blob(data),'mimeType':'image/png'})
for nm,(clr,metal,rough) in matvals.items():
 p={'baseColorFactor':[*clr,1],'metallicFactor':metal,'roughnessFactor':rough}
 if nm in ('front','rear'):p['baseColorTexture']={'index':0 if nm=='front' else 1}
 mats.append({'name':nm,'pbrMetallicRoughness':p})
# Batch fixed components by material for few draw calls; retain individual semantic nodes
# with original millimeter-derived AABBs for inspection, ray input and VR interactions.
sourcegroups=groups; static={};dynamic={}; moving={'signal_patch','usb_lead','generic_host','POWER_LED','READY_LED','power_switch'}
for k,grp in sourcegroups.items():
 vv=np.vstack([ar[0] for ar in grp.values()]);bounds[k]={'min':vv.min(0).round(6).tolist(),'max':vv.max(0).round(6).tolist()}
 if k in moving:dynamic[k]=grp
 else:
  for m,ars in grp.items():
   rs=static.setdefault(m,[[],[],[]])
   for i in range(3):rs[i].extend(ars[i])
  nodes.append({'name':k,'extras':{'label':labels.get(k,k),'boundsM':bounds[k],**interact.get(k,{})}})
tris=0;draws=0
for k,grp in {'fixed_hardware':static,**dynamic}.items():
 ps=[]
 for m,(V,N,U) in grp.items():
  merged=np.hstack([V,N]+([U] if U else [])).round(7)
  verts,idx=np.unique(merged,axis=0,return_inverse=True);idx=idx.ravel().astype('<u2')
  at={'POSITION':accessor(verts[:,:3],3,True),'NORMAL':accessor(verts[:,3:6],3,False)}
  if U:at['TEXCOORD_0']=accessor(verts[:,6:8],2,False)
  acc.append({'bufferView':blob(idx.tobytes(),34963),'componentType':5123,'count':len(idx),'type':'SCALAR'})
  ps.append({'attributes':at,'indices':len(acc)-1,'material':list(matvals).index(m)});tris+=len(V)//3;draws+=1
 meshes.append({'name':k,'primitives':ps});nodes.append({'name':k,'mesh':len(meshes)-1,'extras':{'label':labels.get(k,k),**interact.get(k,{})}})
g={'asset':{'version':'2.0','generator':'BuildTheSimulation · parametric 10-02 reconstruction'},'scene':0,'scenes':[{'nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':mats,'images':imgs,'textures':[{'source':0},{'source':1}],'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':acc}
def chunk(a,b,fill):a+=fill*((-len(a))%4);return struct.pack('<I4s',len(a),b)+a
glb=chunk(json.dumps(g,separators=(',',':')).encode(),b'JSON',b' ')+chunk(bytes(buf),b'BIN\0',b'\0')
(D/'digidata-1550b.glb').write_bytes(struct.pack('<4sII',b'glTF',2,12+len(glb))+glb)
manifest={'device':'10-02','units':'m','up':'+Y','operatorFront':'+Z','physicalCabinetWHD':[.483,.109,.363],'accessories':['generic_host','signal_patch','usb_lead'],'interactionNodes':{k:{'label':labels[k],**it,'boundsM':bounds[k]} for k,it in interact.items()},'geometry':{'nodes':len(nodes),'triangles':tris,'primitives':draws,'bytes':12+len(glb)},'verification':'Metric glTF and action adapter tested on desktop/mobile browser. No physical headset or WebXR session validation.'}
(D/'xr-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(manifest['geometry'])
