"""Original metre-scale dormant Miltenyi Octo legacy enclosure and separate comparison plaque."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Miltenyi legacy Octo documentary exterior'),scene=0,
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
 ('ivory',(.73,.74,.70),.55,.12,1,False),('shell',(.054,.066,.071),.53,.25,1,False),
 ('frame',(.16,.20,.20),.60,.14,1,False),('silver',(.43,.46,.46),.52,.47,1,False),
 ('teal',(.17,.49,.48),.50,.07,1,False),('darkglass',(.086,.118,.133),.47,.03,1,False),
 ('label',(.53,.65,.63),.58,.08,1,False)]:mat(*args)
def bevelbox():
 def ring(y,w,d):
  k=.075
  return [(-w+k,y,-d),(w-k,y,-d),(w,y,-d+k),(w,y,d-k),(w-k,y,d),(-w+k,y,d),(-w,y,d-k),(-w,y,-d+k)]
 a=ring(-.50,.5,.5)+ring(.37,.5,.5)+ring(.5,.42,.42)+[(0,-.5,0),(0,.5,0)]
 i=[]
 for j in range(8):
  k=(j+1)%8;i.extend([24,j,k,25,k+16,j+16])
  for h in (0,8):i.extend([j+h,j+h+8,k+h,k+h,j+h+8,k+h+8])
 return geometry(a,i)
shapes['bevelbox']=bevelbox()
for n,c,r,m in [('amber shell',(.92,.50,.009),.43,.06),('orange shell',(.83,.17,.026),.46,.04),('plinth',(.86,.44,.012),.53,.06),('edge',(.10,.055,.025),.54,.05),('glass dark',(.024,.045,.052),.24,.19),('display trim',(.74,.41,.015),.55,.06),('cap orange',(.53,.12,.023),.53,.09),('cap yellow',(.88,.47,.034),.5,.08),('paper',(.19,.32,.33),.64,.05),('key amber',(.69,.49,.21),.52,.07),('key pale',(.56,.69,.64),.56,.08)]:mat(n,c,r,m)
def b(n,m,t,s,p='Outer_house',q=None):return ref(n,'box',m,t,s,p,q)
def bv(n,m,t,s,p='Outer_house'):return ref(n,'bevelbox',m,t,s,p)
def cy(n,m,t,d,h,p='Outer_house'):return ref(n,'cyl',m,t,(d,h,d),p)
def profile(name,points,width,m):
 n=len(points);v=[(x,y,z) for x in (-width/2,width/2) for z,y in points];f=[]
 for i in range(1,n-1):f += [0,i+1,i,n,n+i,n+i+1]
 for i in range(n):
  j=(i+1)%n;f += [i,j,i+n,j,j+n,i+n]
 shapes[name]=geometry(v,list(reversed(f)))
 return ref(name,name,m,s=(1,1,1),p='Outer_house')
ref('Outer_house')
profile('Dark_floor_underside',[(-227,5),(228,5),(228,16),(-227,16)],268,'edge')
profile('Rear_yellow_shell',[(-232.5,9),(-158,9),(-158,133),(-220,133),(-232.5,117)],284,'amber shell')
bv('Orange_main_shell','orange shell',(0,88,-37),(285,162,274))
b('Orange_top_perimeter','cap orange',(0,167,-42),(273,8,234))
profile('Yellow_sloping_operator_fascia',[(59,8),(232.5,8),(232.5,24),(123,139),(66,139),(59,128)],283,'amber shell')
fangle=math.atan2(115,109.5); q=(math.sin(fangle/2),0,0,math.cos(fangle/2))
b('Door_shoulder_trim','display trim',(0,91,174),(187,5,120),q=q)
b('Inactive_screen_bezel','edge',(0,91.5,175),(149,5.4,85),q=q)
b('Inactive_dark_touchscreen','glass dark',(0,92.7,176.1),(138,3.5,78),q=q)
b('Subtle_blank_nameplate_mark','plinth',(73,37,220),(69,2.4,5),q=q)
for x in (-107,107):
 for z in (-177,178):cy(f'Dark_foot_{x}_{z}','rubber',(x,5,z),33,10)
b('Raised_closed_lid_top','cap orange',(0,175,-40),(268,8,203))
for row,z in enumerate((-92,13),1):
 for col,x in enumerate((-93,-31,31,93),1):
  cy(f'Fixed_dry_external_cover_{row}_{col}','cap yellow',(x,181.5,z),40,7)
for x in (-137,137):b('Fixed_side_guard_lip_'+str(x),'orange shell',(x,166,-35),(7,12,225))
b('Rear_blank_outer_plate','plinth',(0,57,-232),(187,74,1))
for i in range(8):b(f'Rear_closed_shadow_rib_{i+1}','edge',(-74+i*21,53,-232.16),(11,37,.16))
# Independent passive geometry plaque.
ref('Detached_geometry',t=(347,0,16))
b('Plaque_dark_base','edge',(0,10,0),(184,20,145),'Detached_geometry')
b('Plaque_foot','edge',(0,80,-32),(27,130,24),'Detached_geometry')
bv('Plaque_paper_frame','paper',(0,156,15),(207,152,27),'Detached_geometry')
ref('Shape_texture_datum',t=(0,156,30),p='Detached_geometry')
b('Plaque_Change_Shape','key amber',(-45,76,31),(58,16,15),'Detached_geometry')
b('Plaque_Overlay_Disk','key pale',(45,76,31),(58,16,15),'Detached_geometry')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='07-08',model='Miltenyi legacy gentleMACS Octo inert shell',nominalWDH_mm=[285,465,185],noOpenComponents=True,caseOnly=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'octo-documentary.glb').write_bytes(blob)
hits=[('Plaque_Change_Shape','cycle','Switch the inert drawn shape',.302),('Plaque_Overlay_Disk','overlay','Toggle reference circle comparison',.392)]
manifest=dict(schema='bts.station.octo-static-shape.v1',equipment='07-08',model='./octo-documentary.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.029,.068,.0395],max=[x+.029,.084,.0545]))for n,a,l,x in hits],adapter=dict(module='./shapes.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only static shape comparison separate from the closed shell. No headset testing.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
