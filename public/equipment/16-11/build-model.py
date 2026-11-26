"""Original BTS-HANDLING inert sample props; dimensions in mm, GLB +Y up in metres. Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BTS-HANDLING Mk I original design'),scene=0,
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
for args in [
 ('bronze',(.85,.53,.24),.48,.03,1,False),('mint',(.10,.54,.48),.5,.09,1,False),('slate',(.091,.20,.30),.54,.08,1,False),
 ('silicon',(.49,.59,.72),.24,.47,1,True),('silicon2',(.42,.58,.60),.28,.55,1,True),('pad',(.30,.37,.38),.82,0,1,False),
 ('white',(.82,.86,.83),.6,.02,1,False),('shell',(.17,.24,.26),.57,.15,1,False)
]:mat(*args)
def wafer():
 # Diameter and thickness enter via instance scales. A reduced radius at +Z
 # makes an illustrative, exaggerated datum notch; no real notch standard modeled.
 n=96
 pts=[(math.sin(2*math.pi*i/n)*(.42 if i==0 else .5),math.cos(2*math.pi*i/n)*(.42 if i==0 else .5)) for i in range(n)]
 v=[(x,y,z)for y in(-.5,.5) for x,z in pts]+[(0,-.5,0),(0,.5,0)];j=[]
 for i in range(n):
  p=(i+1)%n;j.extend([2*n,p,i,2*n+1,i+n,p+n,i,p,i+n,p,p+n,i+n])
 return geometry(v,j)
shapes['wafer']=wafer()
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
bx('Bench_680x450','brushed' if 'brushed' in M else 'stainless',0,-6,0,680,12,450)
for x in [-291,291]:
 for z in [-177,177]: bx(f'Rubber_foot_{x}_{z}','rubber',x,-16,z,58,8,46)
def cassette(n,x,z,dd,col,prefix):
 bx('Cassette_'+n+'_base',col,x,5,z,dd+26,10,dd+26)
 for s in (-1,1):
  xm=x+s*(dd/2+5)
  for j,Z in enumerate([z-dd/2+11,z+dd/2-16]): bx(f'Cassette_{n}_upright_{s}_{j}',col,xm,30,Z,10,52,16)
  bx(f'Cassette_{n}_upper_rail_{s}',col,xm,55,z,12,9,dd+16)
  for i,y in enumerate([16,28,40]):
   bx(f'Slot_{prefix}{i+1:02}_rail_{"left" if s<0 else "right"}','pad',x+s*(dd/2-3.5),y-.65,z,11,1.3,dd+12)
 for i,y in enumerate([16,28,40]):
  bx(f'Slot_{prefix}{i+1:02}_handle','white',x-dd/2-8,y,z+dd/2+13,15,6,10)
  ref(f'Slot_{prefix}{i+1:02}_datum',t=(x,y+.4,z),p='Assembly')
 bx(f'Cassette_{n}_backstop',col,x,25,z-dd/2-5,dd+6,27,8)
cassette('100',-177,-89,100,'mint','A')
cassette('150',132,-94,150,'slate','B')
def tray(n,x,z,d,m):
 cy(n+'_base',m,x,3.8,z,d+13,7.6)
 ref(n+'_ring','tube','pad',(x,8,z),(d+8,1.5,d+8),'Assembly')
 ref(n+'_datum',t=(x,8.4,z),p='Assembly')
tray('Staging_100',-177,125,100,'mint')
tray('Carrier_75',140,141,75,'bronze')
bx('Carrier_75_tab','bronze',191,5,141,25,10,23)
bx('Cassette_tweezers_tail','brushed' if 'brushed' in M else 'stainless',274,5,-90,17,8,55)
for j,x in enumerate((267,281)):
 tube('Tweezers_jaw_'+str(j),(x,5,-77),(272+j*8,5,38),6,'stainless','Assembly')
p=ref('Vacuum_wand',t=(-2,14,118),p='Assembly')
bx('Wand_grip','rubber',0,10,30,23,23,73,p)
tube('Wand_tube',(0,10,0),(0,4,-54),8,'stainless',p)
cy('Wand_pad','gasket',0,1,-54,18,5,'y',p)
cy('Wand_click','gold',0,22,29,13,5,'y',p)
for n,d,h,x,y,z,angle,m in [('W100_01',100,.525,-177,8.4,125,30,'silicon'),('W150_01',150,.675,132,16.4,-94,0,'silicon2')]:
 a=math.radians(angle/2);p=ref('Pose_'+n,t=(x,y,z),p='Assembly',rot=(0,math.sin(a),0,math.cos(a)))
 ref(n,'wafer',m,(0,0,0),(d,h,d),p)
 tube(n+'_datum_mark',(0,h/2+.25,d*.36),(0,h/2+.25,d*.415),1.05,'bronze',p)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='BTS-HANDLING Mk I original',benchMm=[680,450,12],waferDiametersMm=[100,150],waferThicknessMm=[.525,.675],cassettes='Original three-slot educational geometry; not measured or interchangeable with OEM.')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'handling-station.glb').write_bytes(blob)
hs=[('W100_01','select','Select wafer W100-01',-177,8.4,125,100,8,100),('W150_01','select','Select wafer W150-01',132,16.4,-94,150,8,150),('Staging_100_base','transfer','Transfer selected wafer onto 100 mm staging',-177,4,125,113,12,113),('Carrier_75_base','transfer','Test fit in undersized carrier',140,4,141,88,12,88),('Carrier_75_tab','transfer','Test fit in undersized carrier',191,5,141,25,13,27),('Wand_click','transfer','Put selected wafer under virtual wand',-2,36,147,15,12,15)]
for p,x,z,d in [('A',-177,-89,100),('B',132,-94,150)]:
 for i,y in enumerate([16,28,40]):hs.append((f'Slot_{p}{i+1:02}_handle','transfer',f'Transfer to cassette slot {p}{i+1:02}',x-d/2-8,y,z+d/2+13,17,7,13))
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.wafer-custody.v1',equipment='16-11',model='./handling-station.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),hitTargets=[dict(node=n,action=a,label=l,boundsM=b(*bb)) for n,a,l,*bb in hs],adapter=dict(module='./handling.mjs',factory='createStation',state='read()',dispatch='dispatch(type,payload)',hit='hit(nodeName)',waferPose='poses(state)'),note='Transform wafer hit bounds from current world poses; static fixture hit bounds do not move. No immersive session tested.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
