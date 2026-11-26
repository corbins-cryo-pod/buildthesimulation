"""Original editable DDSE arrangement. Python 3 stdlib. JBC DDE-D dimensions anchor control housing, manuals and photos inform estimated accessory shapes. Board and mat are original. glTF units m, +Y up, +Z front."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation 08-12 DDE workbench'),scene=0,
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
for n,c,r,m,a,ds in [('charcoal',(.065,.079,.085),.62,.16,1,False),('edge',(.13,.16,.16),.57,.35,1,False),('gray',(.30,.34,.35),.53,.25,1,False),('mark',(.82,.84,.77),.55,0,1,False),('lcd',(.44,.61,.56),.57,0,1,False),('esd',(.045,.31,.38),.82,.02,1,False),('brd',(.034,.26,.16),.63,.06,1,False),('signal',(.55,.29,.12),.60,.48,1,False),('redled',(.81,.16,.09),.43,.06,1,False),('tip',(.54,.55,.55),.33,.67,1,False),('kleen',(.55,.39,.16),.89,.21,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly',shape='cyl'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,shape,m,(x,y,z),(d,l,d),p,q)
bx('ESD_bench_mat','esd',0,2,0,560,4,390)
for x,z in [(-268,181),(268,181),(268,-181),(-268,-181)]:cy(f'Mat_stud_{x}_{z}','tip',x,4,z,9,2)
# Control unit: width 148, height 120, depth 232.
X=-173;Z=-67
bx('DDE_D_envelope','charcoal',X,64,Z,148,120,232)
bx('Front_fascia','edge',X,64,49,134,108,4)
bx('Screen_recess','base',X,76,52,86,65,7)
bx('Console_LCD','lcd',X,77,56,66,44,2)
for i in range(5):bx('LCD_placeholder_'+str(i),'edge',X-24+i*12,80,57.2,5,10,1)
for i in range(8):bx('DDE_control_key_'+str(i),'rubber',X-41+(i%5)*18,35-(i//5)*12,55,11,8,5)
bx('Console_button','gray',X+1,32,58,13,11,5)
bx('USB_A_front','base',X+56,78,53,14,7,4)
bx('Main_switch_passive','base',X+53,26,54,14,23,5)
for i in range(11):
 bx('Vent_right_'+str(i),'base',X+74.3,104,Z-91+i*14,1,5,6)
 bx('Vent_top_'+str(i),'base',X+56,124.2,Z-91+i*14,10,1,5)
for x,p in [(X-42,'PORT1'),(X+6,'PORT2'),(X+50,'FAC')]:
 cy('Rear_panel_'+p,'tip',x,67,-184,15,7,'z')
 cy('Rear_socket_'+p,'base',x,67,-188,10,2,'z')
bx('Rear_USB_B','base',X+47,103,-185,13,14,4)
bx('Rear_power_passive','base',X-34,27,-187,29,19,4)
# Electric module pictured on the controller. Its dimensions and stacked layout are inferred.
bx('MSE_module','charcoal',X,142,Z-7,143,35,209)
bx('MSE_face','edge',X,142,33,138,30,6)
cy('MSE_vacuum_hose_boss','tip',X+43,142,39,22,10,'z')
cy('MSE_recess','base',X+43,142,45,12,2,'z')
for n,i,x in [('ADS',0,-14),('DRS',1,121)]:
 bx(n+'_base','charcoal',x,12,-73,98,16,142)
 bx(n+'_post','edge',x,51,-110,28,73,29)
 bx(n+'_rest','tip',x,72,-63,64,16,43)
 cy(n+'_cup','tip',x,68,-32,36,15,axis='z',shape='tube')
 bx(n+'_sponge_cavity','base',x,22,-29,70,19,37)
 bx(n+'_dry_cleaner_pad','kleen',x,33,-30,49,9,25)
 wx=x;z0=-101
 tool=('T245' if not i else 'DR560')
 # The tool axes use original approximate lengths, not vendor drawing measurements.
 tube(tool+'_handle',(wx,103,-128),(wx,53,-28),17 if not i else 25,'gray','Assembly')
 bx(tool+'_selector_hit','edge',x+16,71,-69,8,10,12)
 tube(tool+'_insulated_grip',(x,74,-69),(x,59,-41),15 if not i else 22,'rubber','Assembly')
 tube(tool+'_metal_tip',(x,53,-28),(x,31,19),3.5 if not i else 8,'tip','Assembly')
 if i:cy('DR560_filter_bay','gray',x+12,79,-72,17,52,'z')
 pts=[(x,103,-128),(x,114,-141),(x,138,-155),(x-11,156,-163),(x-26,164,-169),(x-44,152,-169),(x-64,110,-174),(X+(14 if i else -42),67,-186)]
 for q,(a,b) in enumerate(zip(pts,pts[1:])):tube(tool+'_cable_'+str(q),a,b,4.3,'rubber','Assembly')
# Narrow PCB stand-off, original inert PCB, net pads, reverse-orientable component.
bx('Board_mount_tab','charcoal',0,6,103,94,5,58)
bx('Inert_PCB_75x48','brd',0,9.3,103,75,1.6,48)
for x,tag,n in [(-7,'P1','VPLUS'),(7,'P2','RETURN')]:
 cy('Pad_'+tag,'gold',x,10.4,103,5.1,.62)
 bx('Trace_'+n,'signal',x*2.6,10.16,103,21,.16,1.9)
 cy('Test_'+n,'gold',x*4.15,10.4,103,5.1,.5)
 bx('Line_mark_'+tag,'mark',x*2.7,10.25,96,13,.1,1.2)
 cy('Joined_'+tag,'tip',x,11.1,103,3.7,1.6)
p=ref('Diode_pose',t=(0,13.7,103),p='Assembly')
cy('Diode_body','charcoal',0,0,0,5.1,11,'x',p)
cy('Cathode_stripe','mark',4.1,0,0,5.2,1.2,'x',p)
for x in (-6.5,6.5):
 cy('Diode_lead_'+str(x),'tip',x,0,0,1.1,5,'x',p)
 cy('Diode_drop_'+str(x),'tip',x,-1.5,0,1.1,3,'y',p)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='JBC DDSE-1QF layout, DDE-D housing',controllerMm=[148,120,232],virtualBoardMm=[75,1.6,48],mode='inactive inert visualization; no powered station or heat')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'dde-bench.glb').write_bytes(blob)
spec=[('T245_handle','selectJoin','Select virtual join tool',-14,78,-78,28,61,118),('DR560_handle','selectRemove','Select virtual removal tool',121,78,-78,31,61,120),('Diode_body','rotate','Rotate pending diode',0,14,103,16,12,12),('Board_mount_tab','inspect','Inspect virtual joint graph',0,8,103,97,12,61),('Console_button','inspect','Inspect virtual net map',X+1,32,58,22,18,13)]
def bounds(x,y,z,a,b,c):return dict(min=[(x-a/2)/1000,(y-b/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+b/2)/1000,(z+c/2)/1000])
vr=dict(schema='bts.station.pcb-rework.v1',equipment='08-12',model='./dde-bench.glb',units='m',axes='+Y up, +Z front',bytes=len(blob),nodes=len(G['nodes']),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),adapter=dict(module='./assembly.mjs',factory='createStation',state='read()',dispatch='dispatch(action)',hit='hit(meshName)',pose='pose(station.read())'),targets=[dict(node=n,action=a,label=l,boundsM=bounds(*b)) for n,a,l,*b in spec],note='Nominal metre-local targets; transform the diode picking volume with its preview rotation. No immersive device validation.')
(OUT/'vr-station.json').write_text(json.dumps(vr,indent=2)+'\n')
print(len(blob),len(G['nodes']),vr['triangles'])
