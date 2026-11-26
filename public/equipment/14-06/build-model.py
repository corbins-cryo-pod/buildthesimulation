"""Edit and regenerate original TA Q800 geometry with Python 3. Documented envelope in TA 925722K, p. 17; individual shapes are estimates. glTF metres, +Y up and +Z front."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation Q800 independent enclosure and tension clamp'),scene=0,
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
for n,c,r,m,a,ds in [('navy',(.038,.118,.21),.57,.23,1,False),('casting',(.10,.22,.36),.51,.24,1,False),('grayhead',(.35,.42,.43),.60,.25,1,False),('darksteel',(.15,.19,.23),.38,.55,1,False),('coupon',(.64,.45,.16),.49,.08,1,False),('screen',(.08,.22,.29),.35,.10,1,False),('lime',(.29,.53,.29),.53,0,1,False),('ceramic',(.79,.75,.62),.75,.04,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly',shape='cyl'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,shape,m,(x,y,z),(d,l,d),p,q)
bx('Base_460x560','navy',0,41,0,460,61,560)
bx('Plinth_shadow','base',0,13,0,444,15,542)
bx('Deck_trim','casting',0,77,0,450,17,550)
bx('Front_nameplate','stainless',-32,50,279,196,16,3)
bx('Nameplate_inset','base',-32,50,281,181,8,2)
for x in (-170,170):
 for z in (-219,219):cy(f'Foot_{x}_{z}','rubber',x,5,z,34,10)
bx('Back_casting','casting',27,264,-162,386,378,177)
bx('Driving_column','darksteel',-41,291,-103,174,420,96)
bx('Tower_left_trim','casting',-162,288,-111,57,420,103)
bx('Right_controller_stand','grayhead',140,290,-51,139,396,117)
bx('Controller_shell','casting',140,472,13,147,97,79)
bx('Controller_dark_screen','rubber',140,477,52,113,59,8)
bx('Controller_display','screen',140,478,57,93,46,2.5)
bx('Panel_measure_button','lime',113,440,54.2,24,12,6)
for i in range(3):bx('Panel_key_'+str(i),'stainless',i*25+142,440,53.2,13,9,4)
bx('Sample_deck','darksteel',102,115,134,222,48,257)
for y in (180,192,204,216,228,240,252):
 for x in (-141,-107,-73,-39):bx(f'Rear_cooling_slot_{x}_{y}','base',x,y,-251,20,4,3)
bx('Rear_access','grayhead',129,196,-248,144,154,8)
for x,y,n in [(96,207,'air'),(154,207,'cooling'),(96,180,'comms'),(154,180,'power')]:
 bx('Rear_'+n,'base',x,y,-254,25,15,6)
# Film tension clamp: fixed upper crosspiece and lower axial carriage.
cx=-91;cz=110
cy('Drive_cover','casting',cx,127,cz,145,85)
cy('Ceramic_platen','ceramic',cx,178,cz,139,16)
cy('Axial_drive_shaft','stainless',cx,213,cz,18,64)
for x in (cx-31,cx+31):
 cy('Tension_frame_guide_'+str(x),'stainless',x,242,cz,9,112)
 cy('Fixed_guide_fastener_'+str(x),'darksteel',x,299,cz,14,10)
bx('Fixed_tension_yoke','darksteel',cx,300,cz,77,13,34)
bx('Film_fixed_grip','stainless',cx,289,cz,34,6,22)
for x in (cx-12,cx+12):cy('Fixed_grip_clamp_'+str(x),'darksteel',x,291,122,6,9,'z')
ref('Moving_yoke',t=(0,268,0),p='Assembly')
bx('Film_moving_grip','stainless',cx,-3,cz,31,6,21,'Moving_yoke')
bx('Moving_grip_drive_link','darksteel',cx,-19,cz,17,25,17,'Moving_yoke')
for x in (cx-9,cx+9):cy('Moving_grip_clamp_'+str(x),'darksteel',x,-3,122,6,9,'z','Moving_yoke')
bx('Coupon','coupon',cx,277,cz+4,4,18,.5)
# A representative translating furnace cover. Internal liner stubs are illustrative.
p=ref('Furnace_lift',p='Assembly')
bx('Furnace_cap','grayhead',cx,515,58,166,90,156,p)
bx('Furnace_colored_belt','casting',cx,466,69,193,19,194,p)
bx('Furnace_shroud','navy',cx,340,86,171,235,163,p)
cy('Furnace_liner','ceramic',cx,223,cz,158,39,p=p,shape='tube')
cy('Furnace_rim','grayhead',cx,207,cz,179,12,p=p,shape='tube')
pts=[(-176,459,67),(-206,450,43),(-213,415,24),(-206,364,22),(-191,326,16),(-173,322,-3)]
for i,(a,b) in enumerate(zip(pts,pts[1:])):tube('Furnace_tether_'+str(i),a,b,8,'rubber',p)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='TA Instruments Q800, film tension',envelopeMm=[460,560,560],furnaceOpenHeightMm=710,geometry='Documented exterior envelope and photo-proportional reconstruction; not factory CAD.')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'q800.glb').write_bytes(blob)
boxes=[('Furnace_cap','toggleFurnace','Raise/lower furnace',cx,515,58,176,100,166),('Film_fixed_grip','toggleCoupon','Load/unload coupon',cx,289,cz,45,22,35),('Film_moving_grip','toggleCoupon','Load/unload coupon',cx,265,cz,43,22,35),('Panel_measure_button','acquire','Measure virtual oscillation',113,440,54.2,33,25,22)]
def bounds(x,y,z,a,b,c):return dict(min=[(x-a/2)/1000,(y-b/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+b/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.axial-dma.v1',equipment='14-06',model='./q800.glb',units='m',axes='+Y up, +Z front',nodes=len(G['nodes']),triangles=sum(G['accessors'][G['meshes'][x['mesh']]['primitives'][0]['indices']]['count']//3 for x in G['nodes'] if 'mesh' in x),bytes=len(blob),motion={'Furnace_lift':{'axis':'Y','limitsM':[0,.15]},'Moving_yoke':{'axis':'Y','gaugeM':[.005,.025]}},hitTargets=[dict(node=n,action=a,label=l,boundsM=bounds(*box)) for n,a,l,*box in boxes],adapter=dict(module='./station.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',ray='hit(meshName)',pose='pose(station.read())'),note='Transform moving targets with the nominal meter-local bounds and state pose. No headset verification yet.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(len(blob),len(G['nodes']),m['triangles'])
