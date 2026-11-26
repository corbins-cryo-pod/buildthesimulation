"""Original metric MicroTester G2 exterior with detachable simulated spring stand-in. Python stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='CellScale MicroTester G2 exterior and dry synthetic spring'),scene=0,
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
for n,c,r,m,a in [('body',(.037,.046,.049),.49,.15,1),('cap',(.069,.078,.082),.41,.20,1),('paneldark',(.015,.021,.022),.62,.09,1),('silver',(.54,.58,.57),.31,.59,1),('pale',(.75,.77,.71),.61,.04,1),('tint',(.36,.61,.67),.22,.03,.30),('lensblack',(.032,.053,.062),.23,.49,1),('green_case',(.17,.34,.15),.61,.09,1),('spring_body',(.59,.38,.13),.58,.20,1),('support_steel',(.48,.56,.57),.52,.28,1)]:
 mat(n,c,r,m,a,a<1)
def b(n,m,t,s,p='Device'):return ref(n,'box',m,t,s,p)
def bv(n,m,t,s,p='Device'):return ref(n,'bevelbox',m,t,s,p)
def cy(n,m,t,d,h,p='Device',axis='y',mesh='cyl'):
 r=math.sqrt(.5);q=(0,0,r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,mesh,m,t,(d,h,d),p,q)
def shell(n):
 # Taper subtle black protective tower toward the top. World-space construction inputs in mm.
 v=[(202,118,-57),(276,118,-57),(276,118,12),(202,118,12),(210,240,-56),(272,240,-56),(272,240,0),(210,240,0)]
 return geometry(v,[0,1,2,2,3,0,4,7,6,6,5,4,0,4,5,5,1,0,1,5,6,6,2,1,2,6,7,7,3,2,3,7,4,4,0,3])
ref('Device')
b('Long_nominal_black_bed','body',(0,27,0),(560,50,140))
for x in (-241,241):
 for z in (-54,54):cy(f'Foot_{x}_{z}','rubber',(x,1,z),24,2)
b('Bed_top_parting_strip','cap',(0,52,0),(556,2,138))
for i,x in enumerate([-248,-98,50,185,255]):cy('Exterior_bed_fastener_'+str(i),'paneldark',(x,26,69),5.2,2,axis='z')
bv('Optics_left_housing','body',(-176,94,0),(203,84,132))
b('Optics_top_panel','cap',(-176,135,-2),(192,1.6,120))
b('Optics_front_visible_panel','paneldark',(-175,93,66.4),(190,70,1.6))
b('Original_pale_exterior_label','pale',(-173,92,67.5),(76,37,1.0))
for i,s in enumerate([35,29,44]):b('Label_green_bar_'+str(i),'green_case',(-177+i*3,95-i*4,68),(s,1.7,.25))
cy('Camera_dormant_nose','body',(-53,97,-4),52,46,axis='x')
cy('Camera_extending_optic_shell','cap',(-14,97,-4),43,38,axis='x')
cy('Camera_focus_collar_silhouette','lensblack',(17,97,-4),76,29,axis='x',mesh='tube')
cy('Camera_focus_collar_outer_rim','silver',(33,97,-4),78,4,axis='x',mesh='tube')
cy('No_live_optics_face','blacktrim' if 'blacktrim' in M else 'paneldark',(31,97,-4),57,2.8,axis='x')
for i in range(10):
 a=i*math.tau/10
 cy('Collar_grip_'+str(i),'cap',(13,97+39*math.cos(a),-4+39*math.sin(a)),5,18,axis='x')
b('Fixture_right_island','body',(186,66,-2),(177,32,130))
b('Fixture_right_base_silver','silver',(192,82,-4),(162,12,125))
b('Dry_guard_floor','tint',(155,93,5),(89,3,83))
for x in (111,199):b('Dry_empty_guard_side_'+str(x),'tint',(x,107,5),(2.5,25,83))
for z in (-36,46):b('Dry_empty_guard_edge_'+str(z),'tint',(155,107,z),(89,25,2.4))
shapes['tower']=shell('tower');ref('Raised_right_protective_column','tower','body',s=(1,1,1),p='Device')
b('Upper_tower_soft_front_edge','cap',(247,178,7),(49,111,4))
b('Tower_lower_closure','paneldark',(235,118,16),(53,22,12))
b('Upper_sensor_exterior_skirt','silver',(214,110,17),(11,25,17))
# Original marked dry demonstrator. All positions are illustration geometry only.
ref('Virtual_motor_datum',t=(183,108,16),p='Device')
b('Virtual_sensor_position','support_steel',(0,0,0),(21,18,23),'Virtual_motor_datum')
ref('Virtual_follower',t=(162,108,16),p='Device')
b('Fictional_probe_tip_block','silver',(0,0,0),(7,12,20),'Virtual_follower')
b('Fixed_spring_support','pale',(132,102,16),(16,18,24))
b('Original_dry_spring_base','spring_body',(146,96,16),(34,4,22))
ref('Virtual_spring_strip',t=(153,106,16),p='Device')
b('Synthetic_spring_strip','spring_body',(0,0,0),(15,6,10),'Virtual_spring_strip')
# Clearly separate plaque-style virtual-only action, outside the tester control envelope.
ref('Detached_virtual_key_pad',t=(71,0,127))
b('Virtual_key_pad','cap',(0,8,0),(139,16,55),'Detached_virtual_key_pad')
b('Preview_toggle_key','spring_body',(-32,19,0),(50,9,29),'Detached_virtual_key_pad')
b('Run_virtual_trace_key','green_case',(31,19,0),(50,9,29),'Detached_virtual_key_pad')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='06-12',model='CellScale MicroTester G2 single-camera visual reference',nominalWDH_mm=[560,140,240],virtualFixture='dry authored spring; not OEM hardware',exclusiveVirtual=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'microtester-g2.glb').write_bytes(blob)
hits=[('Preview_toggle_key','togglePreview','Switch the synthetic state between home and requested travel',.039),('Run_virtual_trace_key','run','Calculate the virtual dry spring trace',.102)]
manifest=dict(schema='bts.station.microtester-g2-spring.v1',equipment='06-12',model='./microtester-g2.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.025,.0143,.1125],max=[x+.025,.0237,.1415]))for n,a,l,x in hits],adapter=dict(module='./spring.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),namedMotion=dict(actuator='Virtual_motor_datum',probe='Virtual_follower',fixture='Virtual_spring_strip',direction='-X',travelUm=[0,160]),note='Only virtual spring exercise. No headset session tested.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
