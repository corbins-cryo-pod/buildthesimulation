"""Editable outside-only Diener Nano tabletop model and original layout chart. Metric GLB, Python stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Diener Nano tabletop documentary exhibit'),scene=0,
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
for n,c,r,m in [('white',(.79,.80,.78),.53,.05),('faceplate',(.53,.55,.56),.46,.28),('edge',(.089,.10,.105),.63,.13),('satin',(.57,.59,.57),.40,.52),('deadglass',(.018,.037,.05),.17,.25),('darkred',(.39,.063,.065),.52,.05),('darkgreen',(.052,.17,.11),.6,.01),('chart',(.24,.38,.38),.7,.01),('key',(.78,.47,.16),.52,.02)]:
 mat(n,c,r,m)
def b(n,m,t,s,p='Cabinet'):return ref(n,'box',m,t,s,p)
def bv(n,m,t,s,p='Cabinet'):return ref(n,'bevelbox',m,t,s,p)
def disk(n,mesh,m,x,y,z,diam,depth,p='Cabinet'):
 r=math.sqrt(.5);return ref(n,mesh,m,(x,y,z),(diam,depth,diam),p,(r,0,0,r))
ref('Cabinet')
b('Nominal_tabletop_shell','white',(0,388,-16),(540,774,768))
b('Lower_black_floor_trim','edge',(0,4,-11),(518,8,775))
b('Main_upper_inset','faceplate',(0,575,372),(490,342,10))
b('Main_lower_inset','satin',(0,206,370),(490,389,10))
for i,y in enumerate([43,132,230,330,435,545,658,727]):
 for x in (-235,235):disk(f'Case_fastener_{i}_{x}','cyl','edge',x,y,378,11,5)
b('Dark_display_surround','satin',(6,581,376),(216,151,12))
b('Dark_display','deadglass',(6,581,385),(169,97,9))
b('Inactive_stylus_silhouette','edge',(177,576,384),(11,117,9))
b('Inactive_rectangle_switch','darkred',(-188,598,384),(20,29,9))
for y,m in [(620,'darkgreen'),(575,'darkred')]:disk('Inactive_indicator_'+str(y),'cyl',m,-139,y,385,22,8)
b('Closed_front_door','satin',(-6,210,380),(349,309,20))
disk('Viewport_ring','tube','faceplate',-22,218,393,207,12)
disk('Opaque_closed_viewport','cyl','deadglass',-22,218,393,160,8)
for i in range(7):
 a=2*math.pi*i/7;disk('Ring_fastener_'+str(i),'cyl','edge',-22+92*math.cos(a),218+92*math.sin(a),398,8,3)
for y in (122,294):b('Hinge_silhouette_'+str(y),'edge',(-173,y,394),(26,13,7))
b('Door_handle','satin',(156,211,395),(18,247,10))
b('Photo_reference_nameplate','darkred',(-184,750,374),(89,8,5))
# Different object, no interaction on cabinet. Geometry chart displays a 1:3 footprint tile.
ref('Detached_chart',t=(578,0,44))
bv('Chart_pedestal','edge',(0,91,0),(392,182,365),'Detached_chart')
b('Chart_frame','satin',(0,184,0),(395,8,365),'Detached_chart')
b('Chart_paper','chart',(0,190,0),(378,4,349),'Detached_chart')
ref('Chart_texture_datum',t=(0,193,0),p='Detached_chart')
ref('Documentary_footprint_pivot',t=(0,197,-13),p='Detached_chart')
tile=b('Paper_cabinet_silhouette','darkgreen',(0,0,0),(180,3,800/3),'Documentary_footprint_pivot')
b('Orientation_arrow','white',(0,2,91),(9,2,53),'Documentary_footprint_pivot')
b('Chart_rotate_key','key',(87,198,153),(88,13,32),'Detached_chart')
b('Chart_frame_key','ivory',(-87,198,153),(88,13,32),'Detached_chart')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='04-05',model='Diener Nano tabletop, inactive exterior',nominalHousingWdhMm=[540,800,775],exteriorOnly=True,noInternalParts=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'diener-nano.glb').write_bytes(blob)
hits=[('Chart_rotate_key','rotate','Rotate the paper footprint by 90°',.665),('Chart_frame_key','cycle','Switch the example chart frame',.491)]
manifest=dict(schema='bts.station.diener-nano-documentary.v1',equipment='04-05',model='./diener-nano.glb',axis='+Y up, +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.045,.191,.180],max=[x+.045,.205,.214]))for n,a,l,x in hits],adapter=dict(module='./footprint.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Chart keys only. No headset test.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
