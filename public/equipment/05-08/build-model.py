"""Original parametric KRÜSS DSA100B chassis reconstruction. Python 3 stdlib.
Source dimensions from KRÜSS DSA100–20251125 p. 4, proportions inferred from brochure p. 2.
X right / Y up / Z front; metres in output. No manufacturer CAD."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='BuildTheSimulation DSA100B independent parametric reconstruction'),scene=0,
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
for n,c,r,m,a,ds in [('sheet',(.58,.64,.66),.55,.30,1,False),('graphite',(.065,.080,.092),.56,.42,1,False),('optic',(.023,.050,.080),.2,.04,1,False),('led',(.24,.57,1),.41,.05,1,False),('blue',(.028,.15,.29),.55,.08,1,False),('coupon',(.30,.45,.43),.58,.04,1,False),('white',(.81,.85,.84),.65,0,1,False),('bearing',(.22,.24,.26),.30,.68,1,False)]:mat(n,c,r,m,a,ds)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);rot=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,rot)
bx('Base_pan_555x375','graphite',0,35,0,555,48,375)
bx('Bench_deck','base',0,62,0,552,6,372)
for x in (-233,233):
 for z in (-144,144):
  cy('Machine_foot_'+str(x)+'_'+str(z),'rubber',x,6,z,34,12)
  cy('Foot_ring_'+str(x)+'_'+str(z),'bearing',x,13,z,27,4)
for x,name in [(-245,'Left'),(245,'Right')]:
 bx(name+'_extruded_upright','graphite',x,246,-55,51,374,87)
 bx(name+'_sheet_cladding','sheet',x+(5 if x>0 else -5),270,-99,23,369,14)
 bx(name+'_optical_head','sheet',x+(8 if x<0 else -8),407,35,81,146,178)
 bx(name+'_head_seam','graphite',x+(8 if x<0 else -8),427,123.3,80,2,1)
 bx(name+'_optical_rail','base',x+(42 if x<0 else -42),343,24,26,78,144)
 bx(name+'_structural_gusset','bearing',x+(23 if x<0 else -23),308,-7,28,73,71)
 for k in range(5):
  bx(f'{name}_back_vent_{k}','dark' if 'dark' in M else 'base',x,443+k*5,-55.4,56,2,.9)
 for k in (-1,1):
  cy(f'{name}_upper_cap_screw_{k}','bearing',x,482,42+k*35,5.5,2)
bx('Upper_dosing_bridge','bearing',0,408,-31,386,39,70)
bx('Bridge_face','sheet',0,409,4,357,29,7)
bx('Bridge_wiring_cap','graphite',0,421,-68,399,36,13)
# Left lens system, aligned with the right illumination head along +X.
bx('CF04_camera_body','graphite',-181,327,36,65,60,64)
for i,(x,d,l) in enumerate([(-145,64,23),(-126,52,17),(-111,45,13),(-102,42,8)]):
 cy('Lens_assembly_'+str(i),'bearing' if i%2==1 else 'base',x,327,36,d,l,'x')
cy('Lens_front_glass','optic',-97,327,36,28,2,'x')
cy('Camera_focus_knob','graphite',-175,364,81,23,15,'z')
cy('Zoom_ring_set','base',-210,482,41,26,16)
for k in range(17):
 a=k*math.pi*2/17
 bx('Zoom_knurl_'+str(k),'graphite',-210+13*math.cos(a),482,41+13*math.sin(a),2.3,12,2.3)
bx('LED_source_cover','graphite',171,327,36,58,74,66)
cy('LED_optical_barrel','bearing',139,327,36,61,16,'x')
cy('LED_field','led',129,327,36,46,4,'x')
bx('Light_switch','base',235,61,183.5,21,12,7)
bx('Power_indicator','led',205,63,184,9,4,2)
for i in range(3):
 bx('Base_air_slot_'+str(i),'base',-211+i*18,35,187,11,2.5,1)
# Manual drop dispenser and transparent needle shield. External shape inferred.
bx('Dosing_carriage','graphite',0,402,12,44,119,54)
bx('Dosing_slide_spine','stainless',0,419,-4,27,111,13)
cy('Manual_syringe_knob','bearing',0,472,42,24,31)
cy('Syringe_plunger','stainless',0,447,42,5,32)
ref('Syringe_body','gland','glass',(0,411,42),(18,46,18),'Assembly')
cy('Syringe_coupon_water','led',0,399,42,9,21)
cy('Syringe_ferrule','stainless',0,382,42,10,13)
cy('Dosing_needle','stainless',0,355,42,1.8,43)
bx('Needle_shield','glass',20,379,58,5,67,32)
for y in (398,404,410,416,422):
 bx(f'Graduation_{y}','base',4,y,50,4,.6,1)
# 45 mm total manual Z travel; displayed offset spans −20…+25 mm.
bx('Stage_foundation','sheet',0,104,36,102,79,103)
bx('Stage_guide_front','bearing',0,167,66,68,114,24)
bx('Stage_guide_inner','stainless',0,186,30,31,142,31)
for x in (-27,27):cy('Z_guide_rod_'+str(x),'bearing',x,179,36,8.5,116)
cy('Stage_knob','base',33,167,88,28,20,'z')
for i in range(12):
 a=i*math.pi*2/12
 bx('Stage_knurl_'+str(i),'graphite',33+13*math.cos(a),167+13*math.sin(a),96,2.4,2.4,12)
ref('Lift_stage',p='Assembly')
bx('Lift_carriage','sheet',0,242,36,58,86,66,'Lift_stage')
bx('Stage_platen','graphite',0,296,36,105,15,100,'Lift_stage')
bx('Sample_plate','stainless',0,309,36,128,11,117,'Lift_stage')
bx('Coupon','coupon',0,317,36,60,5,32,'Lift_stage')
ref('Droplet_origin',t=(0,319.5,36),p='Lift_stage')
# Rear external connectors are technology class only: current panel placements unmeasured.
bx('Rear_io_plate','graphite',214,41,-186,107,34,4)
bx('Rear_power_shell','bearing',235,41,-188,28,18,3)
bx('Rear_power_recess','base',235,41,-189,24,15,2)
for x in (232,238):bx(f'Rear_prong_{x}','stainless',x,41,-189.5,1.6,6,1.4)
bx('Rear_USB_recess','base',196,43,-189,13,9,2.5)
bx('Rear_USB_tongue','blue',196,42,-190,10,2,.7)
for n in range(10):bx('Rear_frame_vent_'+str(n),'base',142-n*8,34,-187.5,2.6,15,.7)
G['extras']=dict(device='KRÜSS DSA100B Basic / CF04 / manual 500 µL glass syringe',cabinetWidthM=.555,cabinetDepthM=.375,overallHeightM=.490,scope='Reference-informed reconstruction. Envelope is specified; optical subassembly and I/O placement estimated.')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'dsa100b.glb').write_bytes(blob)
def bounds(x,y,z,dx,dy,dz):
 return dict(min=[(x-dx/2)/1000,(y-dy/2)/1000,(z-dz/2)/1000],max=[(x+dx/2)/1000,(y+dy/2)/1000,(z+dz/2)/1000])
hits=[('Stage_knob','focusStep','Step focus stage',33,167,88,40,40,30),('Coupon','toggleCoupon','Load or unload coupon',0,317,36,68,12,42),('Manual_syringe_knob','deposit','Deposit virtual droplet',0,472,42,36,38,36),('Light_switch','toggleLight','Toggle LED backlight',235,61,183.5,28,22,20),('Camera_focus_knob','capture','Capture silhouette',-175,364,81,33,33,22)]
manifest=dict(schema='bts.station.contact-angle.v1',equipment='05-08',model='./dsa100b.glb',units='m',axes='+Y up, +Z front, X right; origin at underside centre',nodeCount=len(G['nodes']),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),bytes=len(blob),motion={'Lift_stage':{'axis':'Y','limitsM':[-.020,.025]}},interactionTargets=[dict(node=n,action=a,label=l,boundsM=bounds(*t)) for n,a,l,*t in hits],adapter=dict(module='./station.mjs',factory='createStation',state='read()',commands='dispatch(action,payload)',ray='hit(nodeName)',pose='pose(station.read())'),note='Interaction bounds are local to station nominal pose; translate the coupon with Lift_stage. Headset compatibility not field verified.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodeCount'],manifest['triangles'],manifest['bytes'])
