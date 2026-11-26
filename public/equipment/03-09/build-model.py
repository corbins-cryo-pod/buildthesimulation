"""Editable Mini-Mite display and non-OEM blind gauge (mm source, +Y up metre GLB). Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Mini-Mite TF55035A-1 documentary design'),scene=0,
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
shapes['drygauge']=annulus(rr=11/32,count=56)
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
 ('ivory',(.76,.762,.688),.59,.13,1,False),('ink',(.10,.16,.17),.57,.09,1,False),
 ('turq',(.035,.30,.39),.51,.17,1,False),('paint',(.34,.39,.35),.60,.11,1,False),
 ('cream',(.78,.77,.66),.62,.03,1,False),('gauge',(.24,.42,.42),.58,.10,1,False),
 ('fit',(.24,.65,.47),.57,.05,1,False),('reject',(.77,.36,.14),.54,.09,1,False),
 ('touch',(.64,.52,.18),.57,.10,1,False),('paper',(.85,.86,.79),.56,.06,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
def ring(n,m,x,y,z,d,l,shape='tube',axis='x',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,shape,m,(x,y,z),(d,l,d),p,q)
# Common outer cabinet planes correspond to manufacturer's nominal envelope.
bx('Exterior_base_406x279','ivory',0,108,-0.8,406.4,192,277.8)
bx('Bottom_trim','ink',0,12,0,401,14,270)
for x in(-166,166):
 for z in(-106,104):cy(f'Foot_{x}_{z}','rubber',x,2.8,z,35,5.6)
bx('Lower_pale_front','ivory',0,131,138,386,129,3.4)
bx('Blue_controller_facade','turq',0,70,138.3,255,103,2.8)
bx('Inactive_controller_bezel','ink',9,78,139.1,64,46,1.2)
bx('Inactive_upper_screen','base',9,87,139.4,40,13,.6)
bx('Inactive_lower_screen','base',9,71,139.4,40,9,.6)
bx('Decorative_blank_switch','paper',96,76,139.3,17,28,.7)
bx('Lower_brand_plate','paper',-126,169,139,75,13,1)
bx('Casing_mid_seam','ink',0,204,0,406.1,5,278.4)
# The real exterior is a split lid; inspection mode only toggles opacity/visibility, not a mechanism.
p=ref('Documentary_upper_shell',p='Assembly')
bx('Cover_406x279','ivory',0,293,0,406.4,176,279.4,p)
bx('Cover_front_plate','ivory',0,273,137.5,387,130,3.5,p)
bx('Cover_front_latch_back','paint',0,245,139.0,31,48,1.2,p)
bx('Cover_front_latch','stainless',0,245,139.2,19,37,.7,p)
bx('Cover_top_grip','ink',0,374,-51,94,12,20,p)
for x in (-134,134):
 bx(f'Decorative_hinge_{x}','paint',x,221,-138.4,49,21,2.5,p)
for x in (-1,1):
 cy(f'Closed_side_edge_{x}','ink',x*200,204,13,56,5,'x')
for x in(-145,145):
 for j in range(8):bx(f'Rear_shallow_vent_{x}_{j}','ink',x+(j-3.5)*6,106,-139.3,3.0,28,.8)
# Closed symbolic tube exterior exposed only when the label-cutaway is selected. It is not a functional passage.
cy('Inert_side_silhouette','cream',0,218,13,20,400,'x')
bx('Dummy_upper_ledge','cream',0,206,13,380,10,113)
# Separate cold-fit exhibit; circle is an original mock end-datum, with a sealed back.
bx('Inspection_display_base','gauge',302,10,73,181,20,150)
bx('Gauge_upright','gauge',285,38,74,47,45,42)
ring('Blind_gauge_rim','stainless',285,72,81,32,38,'drygauge','z')
cy('Blind_gauge_back','ink',285,72,61,32,4,'z')
bx('Gauge_facing_plate','paper',286,35,147,114,16,2)
# Positive Z is withdrawal; each carrier is a standalone solid with unchanged ID.
for i,(n,a,b,c) in enumerate([('small',16,10,'fit'),('touch',17.6,13.2,'touch'),('large',20,12,'reject')]):
 x=246+i*43;p=ref('Carrier_'+n+'_pose',t=(x,27,127),p='Assembly')
 bx('Carrier_'+n,c,0,0,0,a,b,22,p)
 bx('Carrier_'+n+'_cap','paper',0,.15,11.3,a*.53,b*.53,1.2,p)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='Thermo Scientific Lindberg/Blue M Mini-Mite TF55035A-1 documentary',furnaceEnvelopeMm=[406.4,381,279.4],inspectionGaugeIDmm=22,notes='Unpowered exterior. Added blind gauge is an original exhibit, not an OEM hardware accessory.')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'mini-mite-display.glb').write_bytes(blob)
h=[('Cover_front_plate','cutaway',None,'Show/hide documentary lid',0,273,138,389,133,7),
 ('Blind_gauge_rim','check',None,'Check selected inert carrier at blind gauge',285,72,81,36,36,43)]
for i,(n,w,H)in enumerate([('small',16,10),('touch',17.6,13.2),('large',20,12)]):h.append(('Carrier_'+n,'select',n,'Select '+n+' carrier',246+i*43,27,127,w+3,H+4,30))
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.blind-circular-fit.v1',equipment='03-09',model='./mini-mite-display.glb',axes='+Y up, +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,actionPayload=p,label=l,boundsM=b(*bb)) for n,a,p,l,*bb in h],adapter=dict(module='./fit.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)',pose='poses(state)'),note='Transform carrier picking bounds with displayed pose. Lid toggles visibility only. No headset test.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
