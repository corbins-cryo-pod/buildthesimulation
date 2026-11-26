"""Edwards AUTO 306 documentary reconstruction; editable mm source and metric GLB. Python 3 stdlib; no operational internals."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Edwards AUTO 306 documentary display'),scene=0,
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
for n,c,r,m,a,ds in [
 ('ivory',(.76,.76,.69),.55,.14,1,False),('trim',(.26,.29,.27),.53,.26,1,False),
 ('pane',(.48,.72,.78),.22,.03,.20,True),('guard',(.73,.82,.86),.31,.01,.08,True),
 ('screen',(.029,.066,.09),.54,.03,1,False),('bracket',(.23,.38,.40),.52,.18,1,False),
 ('coupon',(.41,.53,.55),.47,.22,1,False)]:mat(n,c,r,m,a,ds)
def dome():
 # Unit radius 0.5 profile: squat rolled glass sidewall with a rounded cap.
 n=48;pf=[(-.5,.50),(.23,.50),(.32,.481),(.39,.435),(.447,.352),(.483,.241),(.5,.112),(.5,.001)]
 v=[];idx=[]
 for y,r in pf:
  for j in range(n):
   a=j*2*math.pi/n;v.append((r*math.cos(a),y,r*math.sin(a)))
 for i in range(len(pf)-1):
  for j in range(n):
   a=i*n+j;b=i*n+(j+1)%n;c=a+n;d=b+n;idx.extend([a,c,b,b,c,d])
 return geometry(v,idx)
shapes['dome']=dome()
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly',q=None):return ref(n,'box',m,(x,y,z),(w,h,d),p,q)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
# Chassis and front off-white gantry preserve the 880 W × 595 D closed envelope.
bx('Deck_880x595','ivory',0,936,0,880,18,595)
bx('Upper_cabinet_880x595','ivory',0,814,0,880,228,595)
bx('Lower_cabinet','ivory',-125,365,0,630,700,595)
bx('Lower_front_seam','trim',-126,360,298,600,664,3)
bx('Lower_door','ivory',-126,360,302,593,656,9)
cy('Lower_door_knob','base',145,383,310,24,12,'z')
bx('Right_support_panel','trim',392,348,-245,43,692,46)
bx('Plinth','trim',-124,26,5,615,34,563)
for x in (-388,128):
 for z in (-226,224):cy(f'Foot_{x}_{z}','rubber',x,8,z,48,16)
for i in range(7):
 for j in range(5):cy(f'Shallow_vent_{i}_{j}','trim',-412+i*11,765+j*10,299,4.5,2.8,'z')
bx('Upper_name_plate','bracket',-371,906,299,99,13,3)
bx('Cabinet_rear_panel','ivory',-126,367,-298,599,648,4)
for j in range(9):bx(f'Cabinet_rear_slot_{j}','trim',-80+j*12,574,-302,6,32,1.6)
# Documented 1075 mm jar shelf; its stand details are photo-derived estimates.
bx('Jar_raised_stand','ivory',-221,996,-74,390,102,411)
cy('Stand_front_blank_L','base',-255,983,139,30,12,'z')
cy('Stand_front_blank_R','base',-183,983,140,41,13,'z')
cy('Bell_jar_base','trim',-220,1061,-75,347,28)
cy('Bell_jar_outer_flange','stainless',-220,1075,-75,367,9)
ref('Inspection_shells',p='Assembly')
ref('Bell_jar','dome','pane',(-220,1250,-75),(329,344,329),'Inspection_shells')
ref('Clear_implosion_guard','tube','guard',(-220,1263,-75),(370,374,370),'Inspection_shells')
ref('Guard_top_edge','tube','stainless',(-220,1449,-75),(371,2,371),'Inspection_shells')
# Only view-only display tray and inert coupons. No source, gas, or electrical hardware.
cy('Dummy_coupon_holder','bracket',-220,1198,-68,224,10)
for i,x in enumerate((-280,-160)):
 n='Coupon_L' if i==0 else 'Coupon_R'
 bx(n,'coupon',x,1205,-68,41,3,31);ref(n+'_plot',t=(x,1206.8,-68),p='Assembly')
for x in [-312,-128]:bx('Dummy_support_'+str(x),'trim',x,1134,-115,12,120,15)
# De-energized photo-inspired sloped exterior console. Buttons are purely decorative.
ang=math.radians(34);a=(math.sin(ang/2),0,0,math.cos(ang/2))
bx('Controller_column','ivory',258,1100,-193,354,310,106)
bx('Sloped_control_fascia','base',262,1092,30,338,19,493,q=a)
p=ref('Panel_display_group',t=(262,1096,36),p='Assembly',rot=a)
bx('Blank_touchscreen_bezel','trim',0,13,86,238,13,144,p)
bx('Blank_touchscreen','screen',0,21,86,208,4,116,p)
bx('Blank_upper_display_bezel','ivory',0,13,-79,215,12,63,p)
bx('Blank_upper_display','screen',-17,20,-78,151,3,39,p)
cy('Inert_control_knob','trim',73,24,-79,25,14,'y',p)
bx('Inactive_control_color','amber',109,18,-162,34,4,34,p)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='Edwards AUTO 306 bell jar/guard documentary exterior',closedBodyMm=[880,595],deckYmm=945,guardYmm=1450,source='Edwards Volume 1 Figures 3/4, Columbia exterior photo',notes='Decorative exterior; cabinet width/depth exclude knobs and trim. Non-operating cutaway; arbitrary inert coupon geometry and no sources.')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'auto-306-display.glb').write_bytes(blob)
hs=[('Bell_jar','cutaway','Toggle glass visibility without moving equipment',-220,1250,-75,337,347,338),('Coupon_L','focus','Inspect coupon left synthetic map',-280,1205,-68,41,6,31),('Coupon_R','focus','Inspect coupon right synthetic map',-160,1205,-68,41,6,31)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.auto306-documentary.v1',equipment='03-02',model='./auto-306-display.glb',units='m',axes='+Y up, +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][p['mesh']]['primitives'][0]['indices']]['count']//3 for p in G['nodes'] if 'mesh' in p),hitTargets=[dict(node=n,action=a,actionPayload=n[-1] if a=='focus' else None,label=l,boundsM=b(*bb)) for n,a,l,*bb in hs],adapter=dict(module='./maps.mjs',factory='createStation',state='read()',dispatch='dispatch(type,payload)',hit='hit(nodeName)'),note='Use glass visibility flag for optional occlusion. No headset session tested.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
