"""Original reference-informed Rigaku D/Max-B reconstruction. Python 3 stdlib.
The UNL goniometer radius (185 mm) is the sole documented geometry scale. Cabinet envelope, brackets, controls and I/O
are original photo-proportional estimates. This mesh is for educational simulation, not engineering or safety design.
Units: mm for edit, m for glTF; +Y up, +Z front, X right."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation original Rigaku D/Max-B variant'),scene=0,
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
for n,c,r,m,a,ds in [('sage',(.24,.29,.13),.72,.08,1,False),('vintage',(.61,.58,.47),.67,.22,1,False),('grayblue',(.17,.23,.27),.54,.38,1,False),('caseglass',(.26,.38,.43),.25,.04,.22,True),('detector',(.22,.25,.25),.60,.55,1,False),('glow',(.69,.31,.034),.50,.02,1,False),('red',(.61,.04,.017),.48,.1,1,False),('powder',(.73,.74,.67),.77,0,1,False),('goldpanel',(.40,.34,.19),.70,.17,1,False),('green',(.13,.55,.19),.53,.07,1,False),('xray-sim-label',(.71,.61,.14),.65,.02,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly',shape='cyl'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,shape,m,(x,y,z),(d,l,d),p,q)
bx('Cabinet_lower_body','vintage',0,476,-4,1260,912,758)
bx('Cabinet_plinth','base',0,40,-3,1247,76,746)
bx('Goniometer_table_deck','vintage',0,971,0,1248,38,758)
bx('Goniometer_table_inset','grayblue',0,993,-4,1180,12,700)
bx('Base_kick_plate','graphite' if 'graphite' in M else 'base',0,61,370,1230,57,13)
for x,n in ((-412,'A'),(0,'B'),(412,'C')):
 bx('Sage_access_panel_'+n,'sage',x,410,378,401,646,19)
 bx('Panel_pull_'+n,'base',x+118,694,390,56,17,12)
 for y in (120,699):bx('Panel_hinge_'+n+str(y),'bearing' if 'bearing' in M else 'stainless',x-188,y,391,23,45,14)
bx('Built_in_console','base',0,823,377,1216,156,18)
bx('Console_inset','grayblue',377,829,390,385,139,10)
bx('Console_display','rubber',359,846,396,115,59,6)
for i in range(4):
 bx('Console_LCD_cell_'+str(i),'glow',317+i*27,849,400,17,23,3)
for i in range(6):
 bx('Console_key_'+str(i),'stainless',451+(i%3)*26,867-(i//3)*24,400,17,14,5)
bx('Console_scan_key','green',434,793,401,37,19,9)
cy('Console_angle_knob','rubber',524,792,403,34,14,'z')
cy('Scan_indicator','red',552,871,398,11,5,'z')
for i in range(8):
 bx('Cabinet_console_vent_'+str(i),'rubber',-523+i*28,824,388,14,3,5)
# Transparent teaching enclosure; back planes and hardware simplified.
for x in (-608,608):
 for z in (-360,360):
  bx('Cabinet_post_'+str(x)+'_'+str(z),'vintage',x,1434,z,42,894,42)
 bx('Side_frame_top_'+str(x),'vintage',x,1874,0,42,47,761)
 bx('Side_pane_'+str(x),'caseglass',x,1428,0,8,842,719)
bx('Front_top_rail','vintage',0,1876,359,1258,47,42)
bx('Front_bottom_rail','vintage',0,1016,360,1258,39,42)
bx('Rear_top_rail','vintage',0,1876,-360,1258,47,45)
bx('Rear_pane','grayblue',0,1427,-363,1192,844,15)
bx('Enclosure_roof','vintage',0,1889,0,1258,20,755)
for x,side,sign in [(-286,'left',1),(286,'right',-1)]:
 p=ref('Door_'+side,t=(x,0,0),p='Assembly')
 bx('Door_glass_'+side,'caseglass',0,1448,369 if side=='left' else 374,565,832,10,p)
 for s in (-1,1):bx('Door_edge_'+side+'_'+str(s),'stainless',s*280,1448,376 if side=='left' else 382,11,851,11,p)
 bx('Door_handle_'+side,'stainless',sign*224,1450,392,22,121,10,p)
 bx('Door_grip_'+side,'rubber',sign*224,1450,404,16,94,14,p)
 if side=='right':bx('Virtual_reference_placard','xray-sim-label',70,1772,380,125,49,3,p)
# Horizontal goniometer around +Y; the flat specimen face is vertical. The kinematic origin is fixed.
ref('Bragg_axis',t=(0,1162,-38),p='Assembly')
cy('Motor_housing','grayblue',0,1072,-38,316,102)
cy('Ring_bearing','bearing' if 'bearing' in M else 'stainless',0,-32,0,395,13,p='Bragg_axis',shape='tube')
cy('Calibration_radius_185mm','glow',0,-24,0,370,1.1,p='Bragg_axis',shape='tube')
for i in range(30):
 a=i*math.pi/15;bx('Ring_tick_'+str(i),'rubber',190*math.cos(a),-23,190*math.sin(a),4,2,4,'Bragg_axis')
p=ref('Fixed_incident_axis',t=(-185,0,0),p='Bragg_axis')
bx('Xray_tube_cover_passive','detector',-46,3,0,81,58,81,p)
cy('Incident_aperture','stainless',-4,0,0,40,12,'x',p)
cy('Source_reference_point','rubber',.3,0,0,15,1,'x',p)
p=ref('Sample_theta',p='Bragg_axis')
cy('Theta_stage_hub','stainless',0,-19,0,58,31,p=p)
bx('Specimen_holder','grayblue',0,0,0,51,46,9,p)
bx('Silicon_reference_insert','powder',0,0,4.9,37,33,2,p)
cy('Sample_fastener_A','rubber',-21,0,6,3.9,3,'z',p)
cy('Sample_fastener_B','rubber',21,0,6,3.9,3,'z',p)
p=ref('Goniometer_2theta',p='Bragg_axis')
bx('Sweep_arm','grayblue',94,-28,0,183,12,28,p)
q=ref('Detector_radius_185mm',t=(185,0,0),p=p)
cy('Receiver_reference_point','rubber',0,0,0,13,1,'x',q)
cy('Receiving_slit_shell','stainless',7.5,0,0,33,13,'x',q)
bx('Graphite_monochromator_cover','grayblue',37,1,0,47,51,52,q)
bx('Scintillation_counter_body','detector',81,5,0,50,55,57,q)
cy('Detector_service_cap','rubber',108,5,0,32,6,'x',q)
for x in (-306,306):
 bx('Drive_mount_'+str(x),'base',x,1053,-136,120,105,126)
 cy('Cable_coupling_'+str(x),'grayblue',x,1060,-211,35,19,'z')
for y in (270,325,380):
 for i in range(7):bx('Rear_vent_'+str(y)+'_'+str(i),'rubber',345+i*26,y,-385,17,4,3)
bx('Rear_connector_panel','base',-416,448,-385,202,86,9)
for n,x,w in [('Console_link',-476,27),('Service_connector',-407,39),('Legacy_power_receptacle',-351,37)]:
 bx('Rear_'+n,'stainless',x,453,-391,w,24,5)
 bx('Rear_'+n+'_recess','base',x,453,-393,w-6,18,3)
G['extras']=dict(configuration='Rigaku D/Max-B UNL Co Kα Bragg–Brentano',documentedRadiusMm=185,estimatedCabinetMm=[1260,1900,770],noHardwareControl=True)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'dmax-b.glb').write_bytes(blob)
hits=[('Door_handle_left','toggleDoor','Open/close virtual cabinet',-62,1450,392,55,140,36),('Door_handle_right','toggleDoor','Open/close virtual cabinet',62,1450,392,55,140,36),('Specimen_holder','toggleSample','Change virtual reference insert',0,1162,-38,68,62,40),('Console_scan_key','scan','Run virtual synthetic sweep',434,793,401,49,35,29),('Console_angle_knob','stepAngle','Step the 2θ inspection cursor',524,792,403,53,53,35)]
def bounds(x,y,z,dx,dy,dz):return dict(min=[(x-dx/2)/1000,(y-dy/2)/1000,(z-dz/2)/1000],max=[(x+dx/2)/1000,(y+dy/2)/1000,(z+dz/2)/1000])
m=dict(schema='bts.station.xrd.v1',equipmentId='05-12',glb='./dmax-b.glb',units='m',axes='+Y up, +Z front, +X right',nodes=len(G['nodes']),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),bytes=len(blob),motions={'Goniometer_2theta':{'axis':'-Y','rangeDeg':[10,150],'source':'virtual angular range, not hardware travel'},'Sample_theta':{'axis':'-Y','rangeDeg':[5,75]},'Door_left/Right':{'axis':'X','strokeM':.289,'inferred':True}},hitTargets=[dict(node=n,action=a,label=l,boundsM=bounds(*q)) for n,a,l,*q in hits],adapter=dict(module='./station.mjs',factory='createStation',dispatch='dispatch(action,payload)',state='read()',ray='hit(meshName)',pose='pose(station.read())'),note='Nominal meter-local bounds; transform each moving door or sample target. No headset or hardware session claimed.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(len(blob),len(G['nodes']),m['triangles'])
