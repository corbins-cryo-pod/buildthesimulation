"""Original metric BTS-ANALYSIS workstation; authoring dimensions in mm, export in metres. Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BTS-ANALYSIS Mk I original design'),scene=0,
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
 ('brushed',(.37,.40,.40),.43,.52,1,False),('key',(.18,.21,.22),.62,0,1,False),
 ('monitor',(.028,.080,.094),.61,0,1,False),('teal',(.16,.83,.69),.48,0,1,False),
 ('goldbright',(.91,.62,.24),.47,0,1,False),('frame',(.13,.20,.21),.61,.12,1,False)
]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
for x in (-487,487):
 for z in (-244,231):
  bx(f'Foot_{x}_{z}','rubber',x,12,z,62,24,71)
  bx(f'Upright_{x}_{z}','frame',x,452,z,43,858,47)
 bx(f'Lower_side_brace_{x}','brushed',x,230,-7,44,32,472)
 bx(f'Table_side_rail_{x}','frame',x,865,-12,47,56,541)
bx('Rear_crossbrace','frame',0,551,-246,978,57,39)
bx('ConsoleTop_1100x620','brushed',0,902.5,0,1100,31,620)
bx('Operator_apron','frame',0,860,279,1060,59,35)
bx('Workstation_CPU','frame',342,234,-125,245,384,290)
bx('CPU_face','base',342,234,25,226,370,12)
for k in range(11):bx('CPU_vent_'+str(k),'brushed',342,111+9*k,32,171,1.9,2)
cy('CPU_LED','teal',275,383,34,7,3,'z')
for i,cx in enumerate((-224,224)):
 n=('Raster','Waveform')[i]
 bx(n+'_foot','frame',cx,926,-189,166,16,135)
 bx(n+'_stand','brushed',cx,1017,-220,48,170,29)
 bx(n+'_shell','frame',cx,1211,-225,415,267,34)
 bx(n+'_bezel','base',cx,1211,-206,403,257,7)
 bx(n+'_screen','monitor',cx,1217,-200,377,215,3)
 bx(n+'_status','teal' if i==0 else 'goldbright',cx+177,1094,-199,12,3,2)
 ref(n+'_screen_origin',t=(cx,1217,-197),p='Assembly')
bx('Keyboard_frame','frame',-75,930,136,424,21,132)
for col in range(14):
 for row in range(4):
  bx(f'Key_{row}_{col}','key',-263+29*col,943,86+29*row,22,6,20)
bx('Spacebar','key',-74,943,194,147,6,18)
bx('Controller_housing','frame',337,938,131,226,38,157)
bx('Controller_bezel','brushed',337,959,131,210,5,142)
bx('Run_analysis_button','teal',277,969,155,61,16,44)
cy('Trigger_wheel','goldbright',365,974,122,57,26)
bx('Trigger_mark','frame',364,988,106,3,2,19)
bx('Reset_button','base',406,969,169,25,11,24)
for i,x in enumerate((-417,422)):cy('Rear_feedthrough_'+str(i),'rubber',x,919,-260,32,4)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='BTS-ANALYSIS Mk I original console',consoleTopMm=[1100,620,31],consoleTopHeightMm=918,screenMm=[415,267,34],measurement='Original design; no real marketed instrument or measured physical unit')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'analysis-console.glb').write_bytes(blob)
hit=[('Raster_screen','raster','Inspect raster and trigger alignment',-224,1217,-200,377,215,15),('Waveform_screen','waveform','Inspect mean waveforms',224,1217,-200,377,215,15),('Run_analysis_button','run','Run analysis',277,969,155,61,21,44),('Trigger_wheel','trigger','Toggle clock reference',365,974,122,58,29,58),('Reset_button','reset','Load default toy recording',406,969,169,32,21,31)]
def bounds(x,y,z,a,b,c): return dict(min=[(x-a/2)/1000,(y-b/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+b/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.neural-data-analysis.v1',equipment='01-05',model='./analysis-console.glb',units='m',axes='+Y up, +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),hitTargets=[dict(node=n,action=a,label=l,boundsM=bounds(*bb)) for n,a,l,*bb in hit],adapter=dict(module='./analysis.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Original console; use static hit bounds in the console assembly frame. No headset session run.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
