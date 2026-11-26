"""Editable four-position MFCS-EZ enclosure and a separate inert drafting plaque. Python stdlib, metre GLB."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Fluigent MFCS-EZ passive exterior'),scene=0,
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
for n,c,r,m in [('mfcs_white',(.81,.825,.81),.38,.13),('blueband',(.013,.225,.367),.43,.10),('white_inset',(.75,.779,.742),.52,.12),('brushed',(.51,.54,.53),.40,.61),('blacktrim',(.022,.032,.034),.61,.13),('inertglass',(.038,.067,.071),.28,.12),('switch',(.14,.18,.18),.63,.04),('orange_static',(.61,.23,.061),.49,.13),('gold_static',(.58,.44,.10),.46,.12),('paper',(.18,.36,.36),.69,.02),('keygold',(.67,.46,.19),.45,.05),('keylight',(.49,.65,.59),.54,.03)]:
 mat(n,c,r,m)
def rounded(w,h,length,r):
 # CCW contour in X/Y, extruded on Z. Input millimetres (converted by node scale).
 pts=[]
 for (x,y),a0 in zip([(w/2-r,h-r),(-w/2+r,h-r),(-w/2+r,r),(w/2-r,r)],[0,90,180,270]):
  for j in range(9):
   a=math.radians(a0+j*90/8)
   pts.append((x+r*math.cos(a),y+r*math.sin(a)))
 n=len(pts);v=[(x,y,z) for z in (-length/2,length/2) for x,y in pts];f=[]
 for i in range(1,n-1):f += [0,i+1,i,n,n+i,n+i+1]
 for i in range(n):
  k=(i+1)%n;f += [i,k,i+n,k,k+n,i+n]
 return geometry(v,f)
def rr(n,m,t,w,h,length,r,p):
 shapes[n]=rounded(w,h,length,r)
 return ref(n,n,m,t,(1,1,1),p)
def b(n,m,t,s,p='Cabinet'):return ref(n,'box',m,t,s,p)
def disk(n,mesh,m,x,y,z,d,h,p='Cabinet'):
 q=math.sqrt(.5);return ref(n,mesh,m,(x,y,z),(d,h,d),p,(q,0,0,q))
ref('Cabinet')
ref('Nominal_shell',p='Cabinet')
rr('White_rounded_casing','mfcs_white',(0,0,0),230,63,160,12,'Nominal_shell')
rr('Perimeter_front_dark_trim','blacktrim',(0,1,79.8),228,61,.4,11,'Cabinet')
rr('Perimeter_front_pale_inset','white_inset',(0,3,80.55),222,56,1.1,9,'Cabinet')
rr('Top_band_front','blueband',(0,33,81.38),217,24,1.6,2,'Cabinet')
b('Pale_panel_lower_flat','white_inset',(0,18,81.48),(213,26,1.2))
b('Display_recess','blacktrim',(-72.8,41,82.5),(48,22,3))
b('Unpowered_digital_display','inertglass',(-72.8,40.8,84.12),(38,15,1.3))
for x in (-89,-62):
 disk(f'Fixed_front_button_back_{x}','cyl','brushed',x,16.7,82.3,14.8,2.8)
 disk(f'Fixed_front_button_top_{x}','cyl','switch',x,16.7,84.2,10.1,1.8)
 for j in range(2):b(f'Fixed_front_button_mark_{x}_{j}','keylight',(x-1.25+2.5*j,16.6,85.13),(1.1,3.7,.19))
for i,(x,m) in enumerate(zip([-22.7,11.73,45.08,78.66],['orange_static','orange_static','gold_static','gold_static']),1):
 disk(f'Front_blind_face_{i}','cyl','brushed',x,26.2,83.17,21.1,3)
 disk(f'Front_color_rim_{i}','gland',m,x,26.2,86.02,17.35,3.2)
 disk(f'Front_sealed_center_{i}','cyl','blacktrim',x,26.2,86.8,10.2,1.6)
b('Blue_band_neutral_title_bar','keylight',(51,46,82.3),(81,5,.4))
b('Lower_neutral_title_bar','blueband',(72,13,82.3),(42,3.1,.4))
for x in (-107,107):
 for y in (9,53):disk(f'Facade_fastener_{x}_{y}','cyl','brushed',x,y,82,3.8,.8)
rr('Rear_perimeter_dormant','blacktrim',(0,1,-79.9),227,61,.4,10,'Cabinet')
rr('Rear_pale_inset','white_inset',(0,3,-80.5),221,56,1.3,9,'Cabinet')
disk('Rear_blind_round_silhouette','cyl','brushed',98,32,-83.4,19,4.9)
disk('Rear_blind_round_cap','cyl','blacktrim',98,32,-86.3,9.2,1.2)
b('Rear_static_dark_rectangle','blacktrim',(-79,39,-81.6),(44,15,2.1))
b('Rear_stateless_center_shape','switch',(-79,39,-83),(27,9,1.9))
disk('Rear_closed_small_button','cyl','blacktrim',-78,24,-82.35,8.9,2.3)
b('Rear_capped_square','blacktrim',(-32,12,-81.8),(14.3,11.2,2.9))
b('Simplified_nameplate','mfcs_white',(31,27,-81.6),(79,28,1.5))
for j in range(5): b(f'Rear_nameplate_mark_{j}','switch',(34,24+j*3.1,-82.43),(52-3*j,1,.15))
# Independent illustration on a separate stand. The geometry does not describe this machine’s connector layout.
ref('Detached_chart',t=(282,0,13))
b('Plot_stand_base','blacktrim',(0,7,0),(208,14,117),'Detached_chart')
b('Plot_stand_spine','brushed',(0,66,-33),(21,116,21),'Detached_chart')
rr('Plate_frame','blacktrim',(0,53,5),203,119,17,10,'Detached_chart')
b('Plaque_face','paper',(0,117,14.5),(188,95,3),'Detached_chart')
ref('Plot_texture_datum',t=(0,117,17),p='Detached_chart')
b('Panel_pair_key','keygold',(-51,54,18),(55,15,11),'Detached_chart')
b('Panel_mirror_key','keylight',(51,54,18),(55,15,11),'Detached_chart')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='06-07',model='Fluigent MFCS-EZ four-position closed exhibit',housingWDH_mm=[230,160,63],fixture='separate four-dot geometry only',noOperationalComponents=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'mfcs-ez-dormant.glb').write_bytes(blob)
hits=[('Panel_pair_key','cycle','Cycle original drawing dot pairs',.231),('Panel_mirror_key','mirror','Mirror the drawing horizontal coordinates',.333)]
manifest=dict(schema='bts.station.mfcs-ez-inert-panel.v1',equipment='06-07',model='./mfcs-ez-dormant.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.028,.046,.025],max=[x+.028,.062,.037]))for n,a,l,x in hits],adapter=dict(module='./panel.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='No moving parts. Only the independent diagram is interactive. No headset verification.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
