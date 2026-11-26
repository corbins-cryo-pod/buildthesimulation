"""Original BTS-DRAFT Mk I design dimensions (mm); metre units in GLB, +Y up. Python 3 stdlib. This is not measured manufactured equipment."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation BTS-DRAFT design prototype'),scene=0,
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
for n,c,r,m,a,ds in [('oak',(.45,.29,.16),.72,.02,1,False),('oaklight',(.60,.43,.26),.65,.02,1,False),('iron',(.09,.15,.15),.58,.48,1,False),('paper',(.88,.86,.76),.79,0,1,False),('outline',(.18,.39,.35),.67,0,1,False),('monitor',(.033,.091,.12),.49,.05,1,False),('light',(.83,.70,.38),.64,.04,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
for x in (-472,472):
 for z in (-275,207):
  bx(f'Foot_plinth_{x}_{z}','rubber',x,18,z,68,30,100)
  bx(f'Leg_{x}_{z}','iron',x,443,z,46,833,50)
 bx(f'Side_stringer_{x}','iron',x,741,-36,46,58,520)
 bx(f'Side_heel_{x}','iron',x,210,-34,38,45,492)
bx('Rear_knee_stretcher','iron',0,322,-283,966,40,28)
bx('Forward_support','iron',0,844,220,961,40,46)
bx('Tilt_front_hinge','stainless',0,907,250,988,18,18)
cy('Tilt_lock_knob','rubber',535,899,250,53,34,'x')
bx('Drawer_housing','oak',365,726,-24,318,246,412)
for i,y in enumerate([796,721,645]):
 p=ref('Drawer_slide',p='Assembly') if i==0 else 'Assembly'
 bx('Drawer_front_'+str(i),'oaklight',365,y,188,296,66,17,p)
 bx('Drawer_recess_'+str(i),'iron',365,y+9,197,95,18,12,p)
 bx('Drawer_pull' if i==0 else 'Drawer_pull_'+str(i),'stainless',365,y+10,209,104,12,8,p)
 if i==0:
  bx('Drawer_bottom','oaklight',365,768,19,276,6,335,p)
  for x in [230,500]:bx('Drawer_wall_'+str(x),'oak',x,783,19,9,29,336,p)
# Worktop rotates upward from the front hinge at x-axis.
p=ref('Tilt_worktop',t=(0,930,250),p='Assembly')
bx('Worktop_1100x650','oaklight',0,-14,-313,1100,28,650,p)
for x in (-536,536):bx(f'Worktop_rail_{x}','oak',x,-14,-313,19,28,650,p)
bx('Paper_stop','stainless',0,9,-48,1008,16,19,p)
bx('Paper_grid','paper',-42,1.1,-318,420,1,297,p)
ref('Sheet_datum',t=(-42,2,-318),p=p)
bx('Straightedge','iron',0,5,-508,947,8,22,p)
for i in range(41):bx('Ruler_mark_'+str(i),'stainless',-400+i*20,9.3,-501,1.1,.4,7 if i%5==0 else 3.0,p)
bx('Straightedge_handle','stainless',452,12,-508,48,14,27,p)
# Original monitor and task lamp mounts; clear the worktop throughout its declared tilt.
bx('Inspection_mount','iron',526,1156,-324,42,469,52)
bx('Inspection_short_arm','iron',645,1380,-329,258,25,29)
bx('Monitor_shell','iron',686,1373,-329,424,251,39)
bx('Monitor_active','monitor',686,1374,-307,390,218,3)
cy('Monitor_button','stainless',854,1258,-304,6,2,'z')
bx('Lamp_mount','iron',-530,1098,-328,31,342,45)
tube('Lamp_lower_arm',(-530,1255,-328),(-607,1438,-225),16,'stainless','Assembly')
tube('Lamp_upper_arm',(-607,1438,-225),(-452,1537,-62),16,'iron','Assembly')
bx('Task_lamp_diffuser','light',-452,1535,-26,167,14,58)
bx('Task_lamp_shell','iron',-452,1548,-26,180,19,68)
bx('Task_lamp_switch','rubber',-522,1548,10,24,11,5)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='BTS-DRAFT Mk I original desk',worktopMm=[1100,28,650],paperMm=[420,297],tiltDeg=[0,45],measurement='Nominal design dimensions; no physical article measured')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'drafting-table.glb').write_bytes(blob)
hits=[('Tilt_lock_knob','tilt','Set 15° desk tilt step',535,899,250,47,70,70),('Paper_grid','overlay','Toggle 1:1 specimen overlay',-42,932,-68,420,13,297),('Straightedge_handle','rotateView','Rotate drawing preview',452,942,-258,62,24,40),('Drawer_pull','drawer','Open/close top drawer',365,806,209,126,24,22),('Task_lamp_switch','lamp','Toggle task lamp',-522,1548,10,34,18,22)]
def bounds(x,y,z,a,b,c):return dict(min=[(x-a/2)/1000,(y-b/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+b/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.drafting-bench.v1',equipment='01-07',model='./drafting-table.glb',units='m',axes='+Y up, +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),motion={'Tilt_worktop':{'axis':'X','rangeDeg':[0,45]},'Drawer_slide':{'axis':'Z','rangeM':[0,.16]}},hitTargets=[dict(node=n,action=a,label=l,boundsM=bounds(*bb)) for n,a,l,*bb in hits],adapter=dict(module='./draft.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)',pose='pose(station.read())'),note='Transform paper and ruler picking bounds with hinge; no headset session tested.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
