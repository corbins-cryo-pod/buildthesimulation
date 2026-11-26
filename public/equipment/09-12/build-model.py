"""Generate the original BuildTheSimulation BTS-CELL-3E Mk I fixture.
Python 3 stdlib, authored in millimetres, glTF metre units, +Y up, +Z front.
Produces cell-fixture.glb and vr-station.json. No manufacturer geometry used.
"""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation BTS-CELL-3E Mk I'),scene=0,
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
ref('Assembly')
base=box_at('Bench_base','base',(0,5,0),(140,10,116),'Assembly')
for x in (-54,54):
 for z in (-45,45):ref('Foot_'+str(x)+'_'+str(z),'cyl','rubber',(x,-2,z),(15,4,15),'Assembly')
ref('Vessel_seat','gland','gasket',(0,13,0),(77,6,77),'Assembly')
ref('Glass_vessel_shell','tube','glass',(0,42,0),(72,56,72),'Assembly')
ref('Glass_vessel_floor','cyl','glass',(0,15,0),(71,3,71),'Assembly')
for i,y in enumerate((16,68)):ref('Glass_lip_'+str(i),'lip','glass',(0,y,0),(34.5,21,34.5),'Assembly')
for y in (24,28,32,36,40,44,48,52,56,60):
 box_at('Vessel_graduation_'+str(y),'stainless',(3,y,35.74),(9 if y%8==0 else 4,.35,.25),'Assembly')
for x in (-47,47):
 for z in (-37,37):
  ref('Rail_pillar_'+str(x)+'_'+str(z),'cyl','stainless',(x,47,z),(6.8,74,6.8),'Assembly')
  ref('Pillar_foot_'+str(x)+'_'+str(z),'cyl','stainless',(x,12,z),(15,4,15),'Assembly')
for z,n in ((37,'Front'),(-37,'Rear')):box_at(n+'_slide_rail','stainless',(0,83,z),(103,5,5),'Assembly')
lid=ref('Lift_cartridge',t=(0,0,0),p='Assembly')
ref('Lid_outer_ring','gland','amber',(0,72,0),(77,5,77),lid)
# Outline of the open WE travel slot. The lid is a split, translucent schematic.
for z in (-14,14):box_at('Lid_slat_'+str(z),'amber',(0,72,z),(58,4,8),lid)
for x in (-29,29):box_at('Lid_cross_'+str(x),'amber',(x,72,0),(5,4,22),lid)
for x in (-33,33):box_at('Moveable_bridge_tab_'+str(x),'stainless',(x,76,24),(12,6,28),lid)
box_at('Handle_lift','rubber',(0,91,32),(31,7,9),lid)
for x in (-13,13):box_at('Handle_lug_'+str(x),'stainless',(x,85,32),(4,10,5),lid)
frame=ref('Active_window',t=(2,42,0),p=lid);box_at('Uniform_path','tile',(0,0,0),(10,10,10),frame)
# Fixed +7 mm probe plane and +25 mm counter in the original reference design.
positions={'WE':-3,'RE':7,'CE':25}
for role,x in positions.items():
 p=ref('Probe_'+role,t=(x,0,0),p=lid)
 ref('Feedthrough_'+role,'gland','gasket',(0,74,0),(8,10,8),p)
 ref('Insulator_'+role,'cyl','amber',(0,61,0),(4.8,29,4.8),p)
 ref('Stem_'+role,'cyl','stainless',(0,62,0),(2,57,2),p)
 if role=='RE':
  ref('Reference_tip','cyl','stainless',(0,39,0),(4,8,4),p);ref('Reference_sense_plane','cyl','RE',(0,41,0),(4.8,1.3,4.8),p)
 elif role=='WE':
  q=ref('Working_square',t=(0,42,0),p=p);box_at('WE_contact_square','gold',(0,0,0),(1,10,10),q)
 else:
  box_at('Counter_terminal_plate','stainless',(0,43,0),(1.6,21,21),p)
 ref('Socket_'+role,'gland',role,(0,87,0),(8,6,8),p)
 q=ref('Clip_'+role,t=(0,88,0),p=p)
 box_at('Clip_'+role+'_body',role,(0,6,-5),(7.5,8,19),q)
 for i in (-1,1):box_at('Clip_'+role+'_jaw_'+str(i),'gold',(i*2.2,0,0),(1.15,2.9,9),q)
 # Three original cable arcs, fixed to their probes and color coded. Not Gamry harness.
 pts=[(0,6,-13),(0,7,-21),(0,3,-29),(0,-4,-36),(0,-13,-47),(0,-14,-61)]
 for a,b in zip(pts,pts[1:]):tube('Lead_'+role+'_'+str(a[2]),a,b,3.1,role,q)
temp=ref('Probe_TEMP',t=(15,0,19),p=lid)
ref('Temperature_sensor','cyl','temp',(0,62,0),(4,54,4),temp)
ref('Temperature_tip','cyl','stainless',(0,33,0),(2,8,2),temp)
ref('Temperature_feedthrough','gland','rubber',(0,74,0),(7,5,7),temp)
box_at('Temp_pigtail','temp',(0,92,-4),(5,5,12),temp)
box_at('Port_legend_panel','face',(0,15,53),(88,4,13),'Assembly')
for r,x in positions.items():box_at('Legend_'+r,r,(x,17.2,53),(7,.8,6),'Assembly')
# Manifest hitbox padding accommodates controls without moving their actual geometry.
spec=[(f'Socket_{v}',f'toggle{v}',f'Connect {v} lead',x,87,0,16,14,16) for v,x in positions.items()]+[(f'Clip_{v}',f'toggle{v}',f'Disconnect {v} lead',x,94,-4,15,19,29) for v,x in positions.items()]+[('Handle_lift','toggleLift','Raise/lower the cartridge',0,91,32,42,15,17)]
bounds=lambda x,y,z,a,b,c:dict(min=[(x-a/2)/1000,(y-b/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+b/2)/1000,(z+c/2)/1000])
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(configuration='BTS-CELL-3E Mk I, custom passive display fixture',vesselDiameterM=.072,publishedGeometry='original CAD dimensions, not measured',referencePlaneX=.007,nominalGapM=.010)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
out=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'cell-fixture.glb').write_bytes(out)
manifest=dict(schema='bts.station.3e-cell.v1',id='09-12',glb='./cell-fixture.glb',module='./station.mjs',adapter=dict(factory='createStation',commands='dispatch(action,payload)',state='read()',ray='hit(assetNodeName)',pose='projectPose(station.read())'), units='m',axes='+Y up, +Z front, origin at base plate underside centre', nodes=len(G['nodes']),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),bytes=len(out),motion=dict(Lift_cartridge={'Y':[0,.038]},Probe_WE={'X':[-.023,.005]},Working_square={'widthAndHeight':[.002,.020]}),hitTargets=[dict(node=n,action=a,label=l,boundsM=bounds(x,y,z,w,h,d)) for n,a,l,x,y,z,w,h,d in spec],note='Bounds are controller convenience volumes at nominal pose. Transform moving targets with the node. No immersive headset validation claimed.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(len(out),'bytes;',len(G['nodes']),'nodes;',manifest['triangles'],'triangles.')
