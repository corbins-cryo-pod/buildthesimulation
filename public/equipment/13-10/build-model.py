"""Editable Leica EM ACE600 closed exterior and detached geology demo. Dimensions mm input, metres GLB. Python stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Leica EM ACE600 closed exhibit'),scene=0,
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
for args in [
 ('warmwhite',(.81,.815,.775),.54,.03,1,False),('iv-shadow',(.59,.61,.58),.54,.07,1,False),
 ('black',(.025,.032,.035),.66,.09,1,False),('portglass',(.09,.18,.195),.16,.31,1,False),
 ('dead-screen',(.025,.070,.092),.33,.02,1,False),('red',(.66,.022,.048),.52,.04,1,False),
 ('bench-dark',(.09,.117,.123),.68,.1,1,False),('bench-light',(.44,.59,.56),.58,.1,1,False),
 ('marker',(.78,.51,.19),.45,.02,1,False),('blueglass',(.022,.07,.11),.58,.03,1,False)]:mat(*args)
def profile(n, coords, width, material, part):
 # Metric polygon viewed from +X. An x-facing triangulated fan at each end and exterior quads.
 m=len(coords);w=width/2
 v=[(x,y,z) for x in (-w,w) for z,y in coords]
 a=[]
 for i in range(1,m-1):a.extend((0,i+1,i,m,m+i,m+i+1))
 for i in range(m):
  j=(i+1)%m;a.extend((i,j,i+m,j,j+m,i+m))
 # Input side order is positive in Z/Y; reverse for outward surfaces in X/Y/Z.
 shapes[n]=geometry(v,list(reversed(a)))
 return ref(n,n,material,s=(1000,1000,1000),p=part)
def b(n,m,xyz,s,p='Cabinet',q=None):return ref(n,'box',m,xyz,s,p,q)
def v(n,m,xyz,s,p='Cabinet',q=None):return ref(n,'bevelbox',m,xyz,s,p,q)
def rx(a):
 a=math.radians(a)/2; return math.sin(a),0,0,math.cos(a)
ref('Cabinet')
profile('Back_and_side_enclosure',[(-270,15),(72,15),(104,78),(111,155),(111,547),(40,640),(-270,640)],300,'warmwhite','Cabinet')
profile('Dormant_upper_hood',[(-235,507),(115,493),(150,568),(123,640),(-235,640)],289,'warmwhite','Cabinet')
profile('Sloping_control_plinth',[(-18,4),(270,4),(249,69),(101,167),(-18,167)],296,'warmwhite','Cabinet')
for x in (-119,119):
 b(('L' if x<0 else 'R')+'_rear_foot','black',(x,7.5,-225),(39,15,55))
 b(('L' if x<0 else 'R')+'_front_foot','black',(x,4,192),(43,8,32))
b('Glazing_frame_outer','black',(0,350,132),(282,273,36))
v('Opaque_glazing_rounded','portglass',(1,352,152),(218,222,12),q=rx(90))
b('Glazing_specular_edge','iv-shadow',(-92,351,157),(5,185,1))
for y in (255,437):b('Documentary_hinge_'+str(y),'rubber',(140,y,134),(15,60,21))
b('Fixed_glazing_pull','black',(-145,348,141),(10,36,21))
b('Dark_touchscreen_bezel','black',(0,113,187),(174,6,111),q=rx(32))
b('Dark_touchscreen_inactive','dead-screen',(0,116,189),(156,8,92),q=rx(32))
b('Model_color_reference','red',(-148,577,-150),(3,11,175),q=rx(-8))
for i in range(6):b(f'Estimated_rear_vent_{i+1}','iv-shadow',(92,17+14*i,-269),(52,5,2))
# Detached design. Exaggerated step on an enlarged display map, not a working specimen or fixture.
ref('Detached_viewer',t=(390,0,35))
v('Viewer_stand','bench-dark',(0,28,0),(256,56,233),'Detached_viewer')
b('Viewer_display_frame','bench-dark',(0,106,32),(242,126,25),'Detached_viewer',rx(-18))
b('Viewer_coupon_map','blueglass',(0,110,48),(220,111,5),'Detached_viewer',rx(-18))
ref('Viewer_image_datum',t=(0,110,53),p='Detached_viewer',rot=rx(-18))
for x,name,m in [(-67,'Pick_Raised_Point','bench-light'),(0,'Pick_Surround_Point','bench-light'),(67,'Read_Passive_Step','marker')]:
 v(name,m,(x,46,119),(51,13,43),'Detached_viewer')
 b(name+'_stripe','iv-shadow',(x,53,127),(26,1,3),'Detached_viewer')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='13-10',model='Leica EM ACE600 basic bench shell',cad=False,nominalCabinetWdhMm=[300,540,640],dormant=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'ace600-closed.glb').write_bytes(blob)
targets=[
 ('Pick_Raised_Point','raised','Select a point on the pre-existing step',323),
 ('Pick_Surround_Point','surround','Select an uncoated comparison point',390),
 ('Read_Passive_Step','read','Read the height difference at both points',457)]
def bounds(x):return dict(min=[(x-26)/1000,.0395,.1325],max=[(x+26)/1000,.054,.177])
manifest=dict(schema='bts.station.ace600-static-inspection.v1',equipment='13-10',model='./ace600-closed.glb',axes='+Y up; +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=bounds(x))for n,a,l,x in targets],adapter=dict(module='./coupon.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only the detached display desk is interactive. No headset testing.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
