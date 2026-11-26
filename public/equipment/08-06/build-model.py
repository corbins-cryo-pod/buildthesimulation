"""Editable original DAGE 4000 benchtop mesh, Python stdlib. Legacy brochure physical envelope, photo-informed (estimated) internals and section shapes. Model units mm in this source, m in GLB; +Y up +Z front."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation legacy DAGE 4000 independent reconstruction'),scene=0,
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
for n,c,r,m,a,ds in [('ivorycase',(.66,.68,.65),.59,.16,1,False),('grayout',(.23,.30,.35),.54,.34,1,False),('silver',(.49,.54,.53),.39,.55,1,False),('darkblue',(.026,.078,.14),.50,.15,1,False),('joint',(.72,.48,.10),.46,.56,1,False),('pcb',(.052,.23,.16),.62,.04,1,False),('optic',(.04,.097,.13),.18,.17,1,False),('green',(.17,.48,.25),.60,0,1,False),('guide',(.65,.21,.09),.48,.05,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly',shape='cyl'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,shape,m,(x,y,z),(d,l,d),p,q)
bx('Base_425w_730d','grayout',0,6,0,425,12,730)
bx('Frame_lower_base','ivorycase',0,43,-110,328,61,497)
bx('Front_armrest_frame','silver',0,21,307,425,22,116)
for x in [-129,129]:
 bx('Padded_armrest_'+str(x),'grayout',x,37,307,130,21,105)
for x in [-174,174]:
 bx('Joystick_console_'+str(x),'ivorycase',x,61,119,77,60,115)
 cy('Joystick_boot_'+str(x),'rubber',x,96,112,43,14)
 cy('Joystick_stem_'+str(x),'base',x,108,113,12,14)
 cy('Joystick_knob_'+str(x),'rubber',x,120,113,27,16)
bx('Joystick_run','green',184,95,145,21,8,17)
bx('Main_spine','ivorycase',-6,295,-242,285,462,166)
bx('Upper_case_main','ivorycase',0,555,-180,303,222,283)
bx('Top_cover_670','ivorycase',0,668,-180,300,4,277)
bx('Tower_seam','grayout',0,456,-37,277,5,4)
bx('Logo_panel_blank','darkblue',77,603,-35,85,14,3)
for x in [-106,104]:
 for y in [483,622]:cy('Housing_screw_'+str(x)+'_'+str(y),'silver',x,y,-34,8,3,'z')
for i in range(11):
 bx('Back_vent_'+str(i),'base',58,522+i*8,-323,85,3,2)
for y,n in [(382,'power'),(351,'data'),(324,'vac')]:
 bx('Rear_panel_'+n,'base',-80,y,-327,56,18,7)
# Original simplified stereo microscope attached to frame; eyepiece tilt is pose, not ray trace.
bx('Microscope_mount','silver',71,494,51,80,80,109)
bx('Microscope_stereo_body','ivorycase',80,474,116,119,81,104)
cy('Objective_barrel','grayout',70,409,123,63,58)
cy('Objective_glass','optic',70,379,123,44,2)
for z in [97,143]:cy('Focus_knob_'+str(z),'base',-16,497,z,28,22,'x')
for x in [52,111]:
 tube('Eyepiece_body_'+str(x),(x,498,151),(x,550,217),26,'grayout','Assembly')
 tube('Eyepiece_rubber_'+str(x),(x,549,217),(x,562,233),33,'rubber','Assembly')
 tube('Eye_lens_'+str(x),(x,561,232),(x,563,235),23,'optic','Assembly')
# Physical stage and a detachable virtual shell / hook assembly.
bx('XY_stage_carriage','silver',0,99,29,227,52,212)
cy('Round_stage_disc','silver',0,136,24,208,23)
cy('Stage_groove','grayout',0,147,24,188,3,shape='tube')
for x in [-59,59]:bx('Clamp_foot_'+str(x),'grayout',x,154,66,34,17,82)
p=ref('Stage_X',p='Assembly')
bx('Seat_coupon','grayout',0,158,51,75,14,48,p)
ref('Specimen',p=p)
bx('Inert_three_bond_board','pcb',0,167,53,55,4,35,'Specimen')
for i,x in enumerate([-15,0,15],1):
 bx(f'Bond_B{i}','joint',x,169.3,53,8,.6,18,'Specimen')
 for z in [46,60]:cy(f'Pad_B{i}_'+str(z),'joint',x,170,z,5,1.3,p='Specimen')
 p=ref('Wire_intact_B'+str(i),p='Specimen')
 pts=[(x,171,46),(x,174,47),(x,176,50),(x,176,56),(x,174,59),(x,171,60)]
 for t,(a,b) in enumerate(zip(pts,pts[1:])):tube(f'Wire_B{i}_'+str(t),a,b,.9,'joint',p)
 for z,q in [(46,49),(60,57)]:tube(f'Wire_end_B{i}_'+str(z),(x,171,z),(x,174,q),.9,'joint','Specimen')
bx('Cartridge_mount','ivorycase',-61,365,3,93,66,126)
p=ref('Hook_pose',p='Assembly')
bx('Pull_WP100g_cartridge','ivt' if 'ivt' in M else 'ivorycase',-12,304,51,138,62,96,p)
bx('Cartridge_face_insert','grayout',-12,306,101,129,47,7,p)
cy('Hook_shaft','silver',0,238,53,11,69,p=p)
tube('Hook_tip_vertical',(0,209,53),(0,197,53),2.1,'silver',p)
tube('Hook_tip_curve',(0,197,53),(0,199,56),2.1,'silver',p)
tube('Hook_tip_return',(0,199,56),(0,202,57),2.0,'silver',p)
lines=[(-125,305,21),(-169,289,65),(-168,251,85),(-141,232,89),(-108,244,54),(-99,282,-32)]
for i,(a,b) in enumerate(zip(lines,lines[1:])):tube(f'Cartridge_cable_{i}',a,b,8,'rubber','Assembly')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(instrument='Nordson DAGE legacy 4000 / WP100g demo',envelopeWHDMm=[425,670,730],wireNote='Illustrative enlarged demonstration arcs, not measured wire geometry')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'dage-4000.glb').write_bytes(blob)
target=[('Seat_coupon','toggleSample','Seat/unseat inert coupon',0,158,51,80,23,55),('Hook_shaft','engage','Engage/disengage virtual hook',0,238,53,24,84,24),('Joystick_run','run','Replay selected pull',184,95,145,27,16,23)]
target += [(f'Bond_B{i}',f'selectB{i}',f'Select B{i}',x,170,53,9,5,21) for i,x in enumerate([-15,0,15],1)]
def bounds(x,y,z,a,b,c):return dict(min=[(x-a/2)/1000,(y-b/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+b/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.wire-pull.v1',equipment='08-06',model='./dage-4000.glb',units='m',axis='+Y up, +Z front',nodes=len(G['nodes']),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),bytes=len(blob),motion={'Stage_X':[-.015,.015],'Hook_pose':[-.024,0]},targets=[dict(node=n,action=a,label=l,boundsM=bounds(*bb)) for n,a,l,*bb in target],adapter=dict(module='./pull.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)',pose='pose(station.read())'),note='Selected fixture offsets are virtual. Transform moving local ray regions with the node. No headset test claimed.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n');print(len(blob),len(G['nodes']))
