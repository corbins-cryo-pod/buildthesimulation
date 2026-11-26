"""BTS-BLIND Mk I original unplumbed icon fixture, mm source and metre GLB, Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BTS-BLIND Mk I original design'),scene=0,
 scenes=[dict(nodes=[])],nodes=[],materials=[],meshes=[],accessors=[],bufferViews=[])
data=bytearray()
def write(vals,fmt,typ,comp,code=None):
 while len(data)%4:data.append(0)
 i=len(G['bufferViews']);offset=len(data);n=0
 for v in vals:
  row=v if isinstance(v,(list,tuple)) else [v];data.extend(struct.pack('<'+fmt*len(row),*row));n+=1
 G['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=len(data)-offset))
 a=dict(bufferView=i,componentType=comp,count=n,type=typ)
 if code:a.update(min=[min(v[j] for v in vals) for j in range(3)],max=[max(v[j] for v in vals) for j in range(3)])
 j=len(G['accessors']);G['accessors'].append(a);return j
M={}
def mat(n,c,r=.5,m=.0,alpha=1,ds=False):
 M[n]=len(G['materials']);q=dict(name=n,pbrMetallicRoughness=dict(baseColorFactor=[*c,alpha],roughnessFactor=r,metallicFactor=m))
 if alpha<1:q['alphaMode']='BLEND'
 if ds:q['doubleSided']=True
 G['materials'].append(q)
for n,c,r,m,a,ds in [('base',(.025,.039,.044),.66,.3,1,False),('stainless',(.42,.47,.48),.32,.72,1,False),('glass',(.26,.64,.72),.21,.02,.20,True),('amber',(.62,.40,.15),.55,.01,1,False),('gasket',(.035,.041,.039),.72,0,1,False),('tile',(.38,.71,.74),.55,0,.39,True),('gold',(.81,.54,.13),.3,.63,1,False),('WE',(.065,.49,.25),.57,.07,1,False),('RE',(.91,.93,.88),.59,0,1,False),('CE',(.68,.074,.045),.57,.07,1,False),('temp',(.31,.28,.60),.48,0,1,False),('face',(.062,.085,.095),.55,.05,1,False),('rubber',(.013,.021,.021),.78,0,1,False),('copper',(.62,.29,.13),.4,.52,1,False)]:mat(n,c,r,m,a,ds)
def geometry(verts,idx):
 return dict(attributes=dict(POSITION=write(verts,'f','VEC3',5126,True)),indices=write(idx,'H','SCALAR',5123))
def box():
 vs=[(a,b,c) for c in (-.5,.5) for b in (-.5,.5) for a in (-.5,.5)]
 return geometry(vs,[0,2,1,1,2,3,4,5,6,5,7,6,0,4,2,4,6,2,1,3,5,3,7,5,0,1,4,1,5,4,2,6,3,3,6,7])
def annulus(r=.5,rr=.45,count=64):
 if rr<.001:rr=.0001
 v=[(rad*math.cos(2*math.pi*i/count),y,rad*math.sin(2*math.pi*i/count)) for y,rad in [(-.5,r),(.5,r),(-.5,rr),(.5,rr)] for i in range(count)];j=[]
 for i in range(count):
  a=i;b=(i+1)%count;c=count+a;d=count+b;e=c+count;f=d+count;g=e+count;h=f+count
  j+= [a,c,b,b,c,d,e,f,g,f,h,g,c,g,d,d,g,h,a,b,e,b,f,e]
 return geometry(v,j)
def arc(rad=1,count=50):
 # Physically modeled lip / fastening segments. A small round tube follows a circle.
 vs=[];idx=[]
 for i in range(count):
  t=i*2*math.pi/count
  for k in range(8):
   q=k*2*math.pi/8;s=rad+.06*math.cos(q);vs.append((s*math.cos(t),.06*math.sin(q),s*math.sin(t)))
 for i in range(count):
  for j in range(8):
   a=i*8+j;b=i*8+(j+1)%8;c=((i+1)%count)*8+j;d=((i+1)%count)*8+(j+1)%8;idx += [a,b,c,b,d,c]
 return geometry(vs,idx)
shapes={'box':box(),'tube':annulus(),'cyl':annulus(rr=0,count=40),'lip':arc(),'gland':annulus(rr=.34,count=28)}
cache={}; lookup={}
def ref(n,shape=None,material=None,t=(0,0,0),s=(1,1,1),p=None,rot=None):
 i=len(G['nodes']);q=dict(name=n,translation=[a/1000 for a in t])
 if shape:
  key=(shape,material)
  if key not in cache:cache[key]=len(G['meshes']);G['meshes'].append(dict(name=shape+'_'+material,primitives=[dict(**shapes[shape],material=M[material])]))
  q.update(mesh=cache[key],scale=[a/1000 for a in s])
 if rot:q['rotation']=rot
 G['nodes'].append(q);lookup[n]=i
 (G['scenes'][0]['nodes'] if p is None else G['nodes'][lookup[p]].setdefault('children',[])).append(i)
 return n
def tube(n,a,b,d,m,parent):
 vec=[(b[i]-a[i]) for i in range(3)]; mag=math.sqrt(sum(x*x for x in vec));u=[x/mag for x in vec]
 # unit +Y to vector quaternion
 if u[1]<-.99999:q=(1,0,0,0)
 else:
  l=math.sqrt(2+2*u[1]);q=(u[2]/l,0,-u[0]/l,l/2)
 ref(n,'cyl',m,[(x+y)/2 for x,y in zip(a,b)],(d,mag,d),parent,q)
def box_at(n,m,t,s,p=None):return ref(n,'box',m,t,s,p)
for n,c,r,m,a,ds in [
 ('panel',(.47,.51,.49),.62,.15,1,False),('cover',(.62,.64,.56),.58,.17,1,False),
 ('jade',(.08,.57,.47),.5,0,1,False),('brass',(.92,.52,.18),.48,.11,1,False),
 ('shade',(.07,.12,.13),.53,0,1,False),('ink',(.76,.79,.73),.53,0,1,False)]:mat(n,c,r,m,a,ds)
def triangle():
 points=[(-.5,-.5),(.5,-.5),(0,.5)]
 v=[(x,y,z)for z in(-.5,.5)for x,y in points]
 return geometry(v,[0,2,1,3,4,5,0,1,3,1,4,3,1,2,4,2,5,4,2,0,5,0,3,5])
shapes['triangle']=triangle()
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
bx('Plinth','shade',0,-13,33,910,26,465)
bx('WallPanel_860','panel',0,301,-126,860,410,28)
bx('Panel_insert','cover',0,306,-110,824,368,5)
for x in (-400,400):
 for y in (116,495):
  bx(f'Mount_tab_{x}_{y}','stainless',x,y,-129,31,43,8)
  cy(f'Mount_button_{x}_{y}','shade',x,y,-108,7,5,'z')
bx('Blind_cabinet_305','shade',0,100,18,305,175,240)
bx('Cabinet_front','panel',0,104,141,277,153,7)
bx('Cabinet_grip','stainless',0,142,149,126,13,14)
for i in range(10):bx('Cabinet_shallow_vent_'+str(i),'shade',-78+i*16,67,146,6.2,39,2)
for x in (-117,117):
 for z in (-61,103):bx(f'Cabinet_foot_{x}_{z}','rubber',x,8,z,43,16,36)
bx('Mock_label_block','shade',0,423,-94,292,105,29)
for i,x in enumerate((-67,67)):
 cy(f'Inert_indicator_{i}_rim','stainless',x,428,-74,71,20,'z')
 cy(f'Inert_indicator_{i}_face','shade',x,428,-61,56,7,'z')
 bx(f'Inert_indicator_{i}_dash','ink',x,428,-56,22,1.8,1)
# Decorative solid brackets and flat graphics only, no ports or conduits.
for side,x,mid,key,shape in [('A',-243,-136,'jade','triangle'),('B',243,136,'brass','box')]:
 bx(f'Branch_{side}_color_line1',key,mid,328,-105,7,90,3)
 bx(f'Branch_{side}_color_line2',key,(mid+x)/2,283,-105,abs(x-mid)+7,7,3)
 bx(f'Branch_{side}_color_line3',key,x,246,-105,7,74,3)
 bx(f'Blind_socket_{side}','shade',x,283,-94,90,64,20)
 bx(f'Blind_base_{side}','panel',x,283,-82,64,55,6)
 ref(f'Token_{side}_mount',t=(x,283,-74),p='Assembly')
 for i,dx in enumerate((-29,29)):
  bx(f'Blind_socket_{side}_side_{i}','stainless',x+dx,283,-76,5,54,8)
 p=f'Token_{side}_slide'
 ref(p,t=(x,283,-74+22),p='Assembly')
 bx(f'Key_{side}_body','shade',0,0,0,53,43,14,p)
 ref(f'Key_{side}_face',shape,key,(0,0,9),(27,27,4),p)
 bx(f'Station_{side}_shell','cover',x,54,147,180,85,110)
 bx(f'Station_{side}_facade','shade',x,53,203,164,67,7)
 bx(f'Station_{side}_button','panel',x+48,54,209,32,24,6)
 bx(f'Station_{side}_status','base',x-24,54,210,38,8,7)
 ref(f'Station_{side}_mark',shape,key,(x,81,209),(16,16,4),'Assembly')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='BTS-BLIND Mk I original',panelMm=[860,410,28],lowerCabinetMm=[305,175,240],tokenTravelMm=22,layout='Solid display props; no internal routing or manufacturer compatibility')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'blind-fixture.glb').write_bytes(blob)
h=[]
for branch,x in [('A',-243),('B',243)]:
 h += [(f'Key_{branch}_face','toggle',f'Seat / remove virtual token {branch}',x,283,-43,36,36,10),
       (f'Blind_socket_{branch}','inspect',f'Inspect blind recess {branch}',x,283,-94,96,72,28),
       (f'Station_{branch}_facade','inspect',f'Inspect label continuity at station {branch}',x,53,203,164,67,12)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.blind-fixture.v1',equipment='16-14',model='./blind-fixture.glb',units='m',axes='+Y up, +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),hitTargets=[dict(node=n,action=a,actionPayload=next(x for x in n.split('_') if x in ('A','B')),label=l,boundsM=b(*bb))for n,a,l,*bb in h],motion={'Token_A_slide':{'axis':'+Z','travelM':.022},'Token_B_slide':{'axis':'+Z','travelM':.022}},adapter=dict(module='./continuity.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)',pose='pose(state)'),note='Translate key hit bounds by current token displacement from default; static markers do not move. No immersive test.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
