"""Original documentary enclosure, dimensions from Gen 3 case extents only. Mm to metre GLB, Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='OEPS-9029 Gen 3 original display reconstruction'),scene=0,
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
 ('casewhite',(.77,.78,.715),.64,.02,1,False),('lidwhite',(.87,.87,.79),.52,.02,.89,True),
 ('pcb',(.026,.048,.049),.48,.22,1,False),('dark',(.045,.063,.067),.52,.18,1,False),
 ('oxide',(.11,.17,.171),.58,.20,1,False),('blue',(.24,.41,.52),.57,0,1,False),
 ('ledpaint',(.79,.16,.11),.55,0,1,False),('label',(.74,.81,.75),.63,.0,1,False)]:mat(*args)
def roundbox():
 # A smooth-in-plan approximation for the documentary shell, independent of OEM polygon geometry.
 v=[];indices=[];n=40
 coords=[]
 for k in range(4):
  angle0=k*math.pi/2
  ox=.454*(1 if k in [0,3] else -1);oz=.454*(1 if k in [0,1] else -1)
  for j in range(10):
   a=angle0+(math.pi/2)*j/9;coords.append((ox+.046*math.cos(a),oz+.046*math.sin(a)))
 for y in (-.5,.5):v.extend((x,y,z)for x,z in coords)
 v.extend([(0,-.5,0),(0,.5,0)])
 for i in range(n):
  j=(i+1)%n;indices.extend([2*n,i,j,2*n+1,j+n,i+n,i,i+n,j,j,i+n,j+n])
 return geometry(v,indices)
shapes['roundbox']=roundbox()
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
def rb(n,m,x,y,z,w,h,d,p='Assembly'):return ref(n,'roundbox',m,(x,y,z),(w,h,d),p)
rb('Bottom_base_165p0531x163p8552','casewhite',0,1.85,0,165.0531,3.7,163.8552)
bx('Left_sidewall','casewhite',-80,13,0,4.6,22,150)
bx('Right_sidewall','casewhite',80,13,0,4.6,22,150)
bx('Front_upper_panel','casewhite',0,19.7,79.95,155,6,3.7)
bx('Rear_upper_panel','casewhite',0,19.7,-79.95,155,6,3.7)
bx('Front_lower_strip','casewhite',0,5.5,79.95,155,3,3.7)
bx('Rear_lower_strip','casewhite',0,5.5,-79.95,155,3,3.7)
for i,(x,d) in enumerate([(-72,11),(-42,12),(-16,12),(12,12),(34,4),(68,10)]):
 bx('Front_port_separator_'+str(i),'casewhite',x,12.5,79.9,d,12,4)
for i,(x,d) in enumerate([(-72,12),(-45,15),(-19,22),(13,13),(56,10),(72,13)]):
 bx('Rear_port_separator_'+str(i),'casewhite',x,12.5,-79.9,d,12,4)
for x in (-76,76):
 for z in (-76,76):cy(f'Corner_support_{x}_{z}','casewhite',x,11,z,10,19)
p=ref('Display_lid',p='Assembly')
rb('Top_shell_overlay','lidwhite',0,25.07,0,165.0531,6.9,163.8552,p)
bx('Soft_blue_identity_strip','blue',-39,28.35,59,45,.23,3.1,p)
bx('Separate_3D_badge','blue',52,28.35,58,15,.23,12,p)
bx('PCB_silhouette','pcb',0,7,0,154,1.65,152)
for i,(x,z,w,d) in enumerate([(-33,-32,21,21),(22,-24,31,25),(24,30,20,18),(-37,24,15,16),(53,-7,6,23),(12,-52,19,11)]):
 bx('Inert_PCB_package_'+str(i),'oxide',x,9,z,w,2.35,d)
for i in range(34):bx('Illustrative_pad_'+str(i),'gold',-61+(i%17)*7.2,8.15,-58+(i//17)*117,1.18,.29,1.7)
for i,x in enumerate([-55,-28,-1,26]):
 n='Aux_'+str(i+1);bx(n+'_rim','stainless',x,11.5,80.0,14.9,5.1,3.2)
 bx(n+'_recess','rubber',x,11.4,81.7,12.8,3.55,.5)
for i in range(4):
 x=41+i*7.9;bx('Small_connector_'+str(i+1),'dark',x,12,81,6.3,5.2,1.35);bx('Small_contact_'+str(i+1),'gold',x,11.4,81.8,4.9,1,.4)
cy('Rear_inactive_power_jack','dark',49,11.5,-82,7.3,2.0,'z')
bx('Rear_USB_shell','stainless',31,12,-82.1,13,9,2.4)
bx('Rear_USB_recess','blue',31,12,-83.3,10.9,5.6,.7)
cy('Rear_clock_port','stainless',3.0,11.7,-82.3,9.4,7.5,'z')
cy('Rear_clock_blank','dark',3,11.7,-86.05,4.6,.5,'z')
cy('Rear_small_round_jack','dark',-33,9.6,-82.4,5.7,3.0,'z')
cy('Run_marker','ledpaint',-35,10,82.4,2.1,.9,'z')
# Optional disconnected OEPS-6501-inspired outline; no pinout.
bx('Accessory_inert_io_pcb','pcb',128,2.5,24,57,2.1,109)
for z in [4,18,32,46]:
 for x in [116,138]:cy(f'Accessory_BNC_appearance_{x}_{z}','stainless',x,9.5,z,10.5,12)
bx('Accessory_edge_recess','stainless',128,6,-20,15,6,10)
bx('Synthetic_demo_tag','blue',127,4,66,43,1.3,9)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='OEPS-9029 / original passive optical reconstruction',caseEnvelopeMm=[165.0531,28.52,163.8552],scope='Visual mesh approximation; no circuit traces/copied CAD or powered operation.')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'open-ephys-gen3-display.glb').write_bytes(blob)
hits=[('Top_shell_overlay','cutaway','Toggle top shell visibility',0,25.07,0,164,7.3,163),
 ('Aux_1_rim','run','Replay synthetic counter blocks',-55,11.5,80,16,8,5),
 ('Synthetic_demo_tag','toggleGap','Toggle demonstration missing-block fault',127,4,66,46,6,12)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.dummy-acq.v1',equipment='10-10',model='./open-ephys-gen3-display.glb',axes='+Y up, +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=b(*bb))for n,a,l,*bb in hits],adapter=dict(module='./replay.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='All actions are local teaching behaviors; not associated with the OEM ports. No headset test.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
