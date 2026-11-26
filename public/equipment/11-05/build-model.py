"""Original metric PM100D console, physically disconnected, with a separate numerical readout card."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Thorlabs PM100D dormant console'),scene=0,
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
for n,c,r,m in [('boot red',(.67,.018,.026),.49,.04),('boot shadow',(.23,.026,.025),.64,.07),('case silver',(.57,.60,.56),.50,.20),('case dark',(.029,.041,.046),.59,.08),('lcd off',(.12,.19,.16),.38,.17),('key soft',(.56,.59,.53),.54,.12),('gray metal',(.32,.36,.35),.37,.43),('draw teal',(.20,.33,.35),.59,.08),('draw gold',(.74,.48,.16),.5,.1),('draw pale',(.54,.66,.60),.58,.08)]:mat(n,c,r,m)
def extrude(name,poly,d):
 n=len(poly);v=[(x,y,z) for z in [-d/2,d/2] for x,y in poly];f=[]
 for i in range(1,n-1):f += [0,i+1,i,n,n+i,n+i+1]
 for i in range(n):
  j=(i+1)%n;f += [i,j,i+n,j,j+n,i+n]
 shapes[name]=geometry(v,f)
def rounded(w,h,r):
 out=[]
 for (x,y),a in zip([(w/2-r,h/2-r),(-w/2+r,h/2-r),(-w/2+r,-h/2+r),(w/2-r,-h/2+r)],[0,90,180,270]):
  for i in range(9):
   t=math.radians(a+i*90/8);out.append((x+r*math.cos(t),y+r*math.sin(t)))
 return out
def face(n,m,t,p,d,parent='Console',q=None):
 extrude(n,p,d);return ref(n,n,m,t,(1,1,1),parent,q)
def plate(n,m,t,w,h,r,d,parent='Console',q=None):return face(n,m,t,rounded(w,h,r),d,parent,q)
def b(n,m,t,s,p='Console',q=None):return ref(n,'box',m,t,s,p,q)
def diskZ(n,m,x,y,z,d,h,p='Console'):
 q=math.sqrt(.5);return ref(n,'cyl',m,(x,y,z),(d,h,d),p,(q,0,0,q))
def annular_segment(n,m,cx,y,theta,parent='Console'):
 # Scalloped directional cap around the neutral center button.
 pts=[]
 for r,ts in [(16.15,range(-33,34,6)),(9.30,range(33,-34,-6))]:
  for t in ts:
   a=math.radians(theta+t);pts.append((r*math.cos(a),r*math.sin(a)))
 k=len(pts)//2
 v=[(x,y,z) for z in (-.7,.7) for x,y in pts];j=[]
 for i in range(k-1):
  d=k*2-1-i; j += [i+2*k,i+1+2*k,d+2*k,i+1+2*k,d-1+2*k,d+2*k,i,d,i+1,i+1,d,d-1]
 for i in range(2*k):
  ni=(i+1)%(2*k);j += [i,ni,i+2*k,ni,ni+2*k,i+2*k]
 shapes[n]=geometry(v,j);return ref(n,n,m,(cx,y,19.08),(1,1,1),parent)
ref('Console')
outline=[(89,46),(82,51),(43,53.9),(0,54.5),(-43,53.9),(-86,51),(-90,48),(-91.5,40),(-91.5,-43),(-88,-50),(-82,-53),(-40,-54.5),(43,-54.5),(83,-52),(89,-47),(91.5,-37),(91.5,30)]
# Through-ring boot: the two recessed colored faces and display are exposed in the cavity.
k=len(outline)
v=[(x*facX,y*facY,z) for z,facX,facY in [(-20,1,1),(20,1,1),(-20,.919,.863),(20,.919,.863)] for x,y in outline]
j=[]
for i in range(k):
 a=i; bb=(i+1)%k; c=a+k; d=bb+k; e=c+k; f=d+k; g=e+k; h=f+k
 j += [a,bb,c,bb,d,c,e,g,f,f,g,h,c,d,g,d,h,g,a,e,bb,bb,e,f]
shapes['boot_ring']=geometry(v,j)
ref('Boot_outer_authoritative','boot_ring','boot red',(0,54.5,0),(1,1,1),'Console')
face('Recessed_inner_console_body','boot shadow',(0,54.5,0),[(x*.925,y*.893)for x,y in outline],35)

face('Silver_front_fascia','case silver',(0,54.5,17.9),[(x*.942,y*.918)for x,y in outline],1.4)
face('Dark_front_key_inset','case dark',(-1,54.7,18.72),[(69,32),(63,39),(-64,39),(-73,34),(-73,-31),(-68,-38),(43,-38),(66,-25),(69,-21)],.75)
plate('LCD_minor_black_keyline','case dark',(-20,54,19.12),85.9,65.5,1.7,.20)
b('LCD_81_4_by_61_0_exact','lcd off',(-20,54,19.38),(81.4,61,.7))
diskZ('Navigation_blank_center','key soft',47,66.1,19.21,13.5,1.2)
diskZ('Center_round_raised_mark','gray metal',47,66.1,19.87,3.4,.25)
for n,a in [('Right',0),('Up',90),('Left',180),('Down',270)]:
 annular_segment('Static_direction_'+n,'key soft',47,66.1,a)
for n,x,y in [('Lower_left',37,40),('Lower_right',57,40),('Lower_aux',37,26)]:
 plate('Unpowered_fixed_key_'+n,'key soft',(x,y,19.16),15,8,2,1.1)
b('Brand_badge_blank','gray metal',(54,16,18.90),(31,6.9,1.05),q=(0,0,math.sin(.57/2),math.cos(.57/2)))
# Closed rear with stowed outline relief. No hinge operation.
plate('Rear_silver_closed_skin','case silver',(0,54.5,-18.52),170.2,98,9,1.8)
plate('Rear_recessed_stand_pad','case dark',(-7,54,-19.47),84,78,6,.32)
face('Kickstand_stowed_left_arm','gray metal',(-7,54,-19.73),[(-24,34),(-36,34),(-36,-9),(-12,-9),(-14,8)],.51)
face('Kickstand_stowed_right_arm','gray metal',(-7,54,-19.73),[(36,34),(23,34),(14,8),(12,-9),(36,-9)],.51)
b('Kickstand_stowed_lower_bridge','gray metal',(-7,33,-19.73),(72,26,.51))
b('Kickstand_stowed_grip_recess','case dark',(-7,27,-19.992),(24,5,.01))
for x in [-69,68]:
 for y in [20,88]:b(f'Rear_foot_relief_{x}_{y}','boot shadow',(x,y,-19.64),(8.5,8.5,.65))
# Side and bottom features are engraved silhouettes on the blank outside, not actual sockets.
q=(0,-math.sqrt(.5),0,math.sqrt(.5))
plate('Left_side_closed_connector_strip','case silver',(-91.18,53,0),34,95,4,.49,q=q)
plate('Left_side_sealed_Dsub_outline','gray metal',(-91.45,80,0),14,32,3,.06,q=q)
b('Left_side_dark_static_silhouette','case dark',(-91.53,80,0),(.06,21,8))
for n,y,z,w,h in [('power',25,8,6,6),('digital',40,8,8,6),('aux',51,-5,7,7),('dc',34,-8,6,6)]:
 plate('Blind_side_'+n,'case dark',(-91.5,y,z),w,h,1.4,.06,q=q)
b('Bottom_shadow_slot','boot shadow',(49,.26,-1),(24,.53,5.7))
b('Bottom_record_mount_mark','boot shadow',(8,.26,-1),(7,.53,9))
# Detached readout card has the only meaningful hit targets.
ref('Detached_arithmetic',t=(217,0,17))
b('Readout_card_base','case dark',(0,5,0),(184,10,100),'Detached_arithmetic')
b('Readout_card_post','gray metal',(0,48,-22),(26,88,20),'Detached_arithmetic')
plate('Readout_card_frame','draw teal',(0,105,8),173,102,7,24,'Detached_arithmetic')
ref('Arithmetic_display_datum',t=(0,109,22),p='Detached_arithmetic')
b('Cycle_fixed_value','draw gold',(-42,48,24),(62,13,14),'Detached_arithmetic')
b('Cycle_display_units','draw pale',(42,48,24),(62,13,14),'Detached_arithmetic')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='11-05',model='Thorlabs PM100D console only',bootLongShortDepthMm=[183,109,40],activeLcdMm=[81.4,61],includesDetector=False,allPartsStatic=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'pm100d-console.glb').write_bytes(blob)
hits=[('Cycle_fixed_value','cycleValue','Cycle the fixed arithmetic value',.175),('Cycle_display_units','cycleUnit','Cycle the displayed numerical unit',.259)]
manifest=dict(schema='bts.station.pm100d-passive-scale.v1',equipment='11-05',model='./pm100d-console.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.031,.0415,.034],max=[x+.031,.0545,.048]))for n,a,l,x in hits],adapter=dict(module='./units.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only the separate numerical card has actions, no physical headset check.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
