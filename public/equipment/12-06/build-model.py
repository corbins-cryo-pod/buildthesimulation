"""Dormant LSM 980 NLO / Axio Examiner Z.1 original exhibit. Millimetres in source; metre GLB. Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='ZEISS LSM 980 NLO dormant optical exhibit'),scene=0,
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
 ('ivory',(.72,.74,.699),.54,.14,1,False),('shell',(.08,.105,.122),.56,.25,1,False),
 ('silver',(.40,.43,.42),.58,.52,1,False),('blue',(.13,.27,.55),.52,.08,1,False),
 ('glassOptic',(.28,.59,.61),.39,.13,1,False),('blank',(.04,.109,.126),.53,0,1,False),
 ('frame',(.12,.19,.20),.56,.15,1,False),('inert',(.45,.67,.60),.58,.10,1,False)]:mat(*args)
def tapered():
 v=[(fx*w,y,z) for(y,w)in[(-.5,.5),(.5,.39)]for z in(-.5,.5)for fx in(-1,1)]
 return geometry(v,[0,1,2,1,3,2,4,6,5,5,6,7,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7])
shapes['tapered']=tapered()
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
# Table, exact nominal outer dimensions and decorative registration dots.
bx('NLO_table_1800x1500', 'silver',-240,855,0,1800,110,1500)
for x in (-973,493):
 for z in(-568,568):
  cy(f'Isolator_column_{x}_{z}','frame',x,385,z,179,770)
  cy(f'Isolator_shoe_{x}_{z}','shell',x,22,z,207,44)
  cy(f'Isolator_top_flange_{x}_{z}','shell',x,790,z,205,45)
for i in range(77):
 x=-1040+(i%11)*152;z=-575+(i//11)*187
 cy(f'Table_registration_dot_{i}','shell',x,910.3,z,6,0.6)
# Upright Examiner proportions are photo estimates; inert scope and instrument exterior.
x=-583;z=51;y=910
def mb(n,m,a,c,d,w,h,k):return bx(n,m,x+a,y+c,z+d,w,h,k)
def mc(n,m,a,c,d,w,h,axis='y'):return cy(n,m,x+a,y+c,z+d,w,h,axis)
mb('Examiner_base','ivory',0,44,-13,333,88,443)
mb('Examiner_rear_tower','ivory',0,265,-170,257,443,138)
mb('Examiner_rear_inset','silver',0,263,-239,168,326,4)
ref('Examiner_upper_housing','tapered','ivory',(x,y+520,z-24),(267,119,323),'Assembly')
mb('Examiner_head_box','ivory',0,612,17,211,70,238)
mb('Examiner_slide_face','shell',0,520,141,137,17,11)
for k in [-1,1]:
 q=k*43
 tube(f'Eyepiece_main_{k}',(x+q,y+602,z+100),(x+q,y+661,z+176),60,'shell','Assembly')
 tube(f'Eyepiece_rim_{k}',(x+q,y+650,z+165),(x+q,y+671,z+188),62,'dark' if 'dark'in M else 'frame','Assembly')
 tube(f'Eyepiece_face_{k}',(x+q,y+670,z+187),(x+q,y+673,z+191),44,'glassOptic','Assembly')
 mc('Focus_knob_'+str(k),'shell',k*170,53,118,82,24,'x')
 mc('Focus_inner_'+str(k),'silver',k*183,53,118,57,8,'x')
for dz in [-76,49]:
 for dx in[-105,105]:mc(f'Fixed_stage_post_{dx}_{dz}','stainless',dx,143,dz,23,182)
mb('Fixed_stage','shell',0,243,23,308,24,229)
mb('Stage_center_plate','silver',0,257,49,166,4,129)
mb('Inert_stack_carrier','frame',0,262,55,102,9,87)
mb('Inert_stack_window','inert',0,269,61,66,7,55)
for a,c,d,q in [(0,104,52,92),(0,143,52,79),(0,182,52,59)]:mc(f'Condenser_{c}','shell',a,c,d,q,27)
mc('Condenser_blank','glassOptic',0,198,52,38,6)
mc('Objective_rotor','shell',0,425,70,132,30)
for dx,dz,h in[(0,54,73),(50,14,51),(-50,14,59)]:
 mc('Objective_outer_'+str(dx),'stainless',dx,409-h/2,dz,41,h)
 mc('Objective_blank_'+str(dx),'glassOptic',dx,409-h,dz,26,5)
mb('Inactive_detector_housing','shell',153,404,-64,105,123,166)
for i in range(6):mb('Detector_shallow_vent_'+str(i),'silver',206.2,370+i*12,-70,1.1,3.0,95)
# ZEISS scan head envelope; rounded-shoulder appearance approximated by a taper.
bx('LSM_980_scan_base','shell',-118,956,-256,450,92,550)
ref('LSM_980_scan_cover','tapered','ivory',(-118,1066,-256),(450,128,550),'Assembly')
bx('Scanner_badge','blue',-186,1059,20,53,14,4)
bx('Scan_front_step','shell',-113,962,24,200,52,13)
bx('Scan_closure_blank','silver',-108,950,26,58,16,5)
# Dormant auxiliary display prop; no wiring, internal components or operating controls.
bx('NLO_closed_auxiliary_housing','shell',315,582,-353,460,438,496)
bx('Auxiliary_dormant_front','ivory',315,585,-102,451,386,9)
for i in range(12):bx('Aux_front_grille_'+str(i),'shell',196+i*22,562,-96,8,106,2)
# Separate original workstation; display shows the passive chart only.
bx('Workstation_top','frame',1008,729,150,792,45,762)
for xx in(665,1351):
 for zz in(-148,452):bx(f'Workstation_leg_{xx}_{zz}','frame',xx,348,zz,44,696,50)
bx('Workstation_monitor_foot','shell',1026,759,-60,238,12,173)
bx('Workstation_monitor_post','silver',1026,826,-63,53,139,46)
bx('Workstation_monitor_body','shell',1026,1000,-55,498,303,31)
bx('Workstation_monitor_screen','blank',1026,1000,-37,467,271,4)
ref('Monitor_raster_datum',t=(1026,1000,-33),p='Assembly')
bx('Workstation_keyboard','shell',991,760,114,382,16,133)
bx('Workstation_stack_button','blue',1237,762,138,57,18,36)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='ZEISS LSM 980 NLO on Axio Examiner.Z1 dormant',tableMm=[1800,910,1500],scannerMm=[450,220,550],limits='Metric visual exhibit, no powered/operating components or installed optical paths.')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'lsm980-nlo-display.glb').write_bytes(blob)
hits=[('Workstation_monitor_screen','cyclePlane','Switch between XY and XZ stack sections',1026,1000,-36,471,276,9),('Workstation_stack_button','measure','Measure bright inset in selected slice',1237,762,138,65,24,42),('Inert_stack_window','center','Restore central reference slice',-583,1179,112,68,12,59)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.inert-reslice.v1',equipment='12-06',model='./lsm980-nlo-display.glb',axes='+Y up +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=b(*bb))for n,a,l,*bb in hits],adapter=dict(module='./stack.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Read-only inert stack and passive equipment display; no headset test.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
