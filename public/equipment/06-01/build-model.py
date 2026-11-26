"""Original metric proxy of a dormant Nanoscribe GT2 exterior and detached illustration stand."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Nanoscribe GT2 documentary exterior'),scene=0,
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
for n,c,r,m in [('white',(.82,.83,.79),.57,.04),('satin',(.49,.51,.51),.42,.36),('shadow',(.09,.096,.10),.53,.12),('black',(.019,.025,.026),.59,.14),('blue',(.034,.32,.58),.54,.04),('cool',(.26,.48,.50),.73,.03),('golden',(.63,.43,.23),.53,.05),('hazardvisual',(.43,.03,.028),.50,.01)]:
 mat(n,c,r,m)
def b(n,m,t,s,p='Cabinet'):return ref(n,'box',m,t,s,p)
def bv(n,m,t,s,p='Cabinet'):return ref(n,'bevelbox',m,t,s,p)
def cy(n,m,t,d,h,p='Cabinet'):return ref(n,'cyl',m,t,(d,h,d),p)
ref('Cabinet')
for x in (-387,387):
 for z in (-356,356):
  n=f'{x}_{z}';b('Floor_support_'+n,'satin',(x,408,z),(108,748,108))
  cy('Stationary_floor_foot_'+n,'rubber',(x,13,z),77,26)
  cy('Foot_column_'+n,'stainless',(x,32,z),46,18)
for x in (-387,387):
 for y in (157,653):b(f'Side_frame_brace_{x}_{y}','satin',(x,y,0),(72,59,718))
b('Rear_cross_rail','satin',(0,465,-358),(780,63,70))
b('Optical_deck_closed','satin',(0,806,0),(900,48,900))
b('Front_deck_lip','shadow',(0,802,446),(870,23,8))
b('Lower_central_cabinet','ivory',(36,367,145),(568,655,428))
b('Lower_white_brand_panel','white',(36,370,364),(551,642,12))
b('Passive_case_groove','shadow',(-235,364,369),(8,600,4))
for i in range(5):b('Unlit_marker_'+str(i),'cool',(-208,611-i*20,371),(17,5,2))
for name,a,c in [
 ('Front_panel_angled_blue_a',(229,57,372),(136,226,372)),
 ('Front_panel_angled_blue_b',(136,226,372),(69,83,372)),
 ('Front_panel_dark_a',(79,57,374),(41,167,374)),
 ('Front_panel_dark_b',(41,167,374),(170,457,374)),
 ('Front_panel_dark_c',(170,457,374),(281,457,374))]:
 tube(name,a,c,6,'blue' if 'blue' in name else 'shadow','Cabinet')
bv('Left_outer_module','ivory',(-264,900,-11),(331,143,625))
b('Left_module_front_mask','shadow',(-264,901,304),(331,144,31))
cy('Unpowered_stop_marker','hazardvisual',(-239,992,166),37,23)
b('Neutral_middle_pedestal','white',(219,943,19),(356,249,570))
b('Recess_behind_front_handle','black',(-5,958,129),(135,263,412))
bv('Closed_right_upper_hood','black',(107,1285,88),(617,270,657))
b('Upper_left_pale_side_cover','ivory',(-235,1282,82),(103,260,632))
b('Upper_hood_front_stripe','satin',(103,1171,416),(531,15,13))
for x in (-145,356):b('Closed_lid_handle_post_'+str(x),'black',(x,1156,426),(35,38,27))
b('Closed_lid_horizontal_handle','black',(105,1146,437),(530,29,24))
b('Upper_closed_white_panel','white',(209,1050,348),(284,169,35))
b('Upper_blue_reference_mark','blue',(165,1054,368),(73,11,3))
for y in (881,917,952):b('Rear_photo_inferred_panel_line_'+str(y),'shadow',(-245,y,-320),(213,5,4))
# Separate plaque: an illustration only, not the GT2 user interface.
ref('Detached_illustration',t=(932,0,170))
b('Plaque_support','shadow',(0,325,0),(79,636,80),'Detached_illustration')
b('Plaque_base','satin',(0,7,29),(437,14,255),'Detached_illustration')
bv('Plaque_frame','shadow',(0,707,45),(465,348,72),'Detached_illustration')
b('Plaque_backing','black',(0,719,87),(425,287,11),'Detached_illustration')
ref('Illustration_screen_datum',t=(0,719,94),p='Detached_illustration')
b('Ruler_pair_button','golden',(-99,566,106),(112,34,26),'Detached_illustration')
b('Ruler_reverse_button','cool',(99,566,106),(112,34,26),'Detached_illustration')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='06-01',model='Nanoscribe Photonic Professional GT2 from OEM photos',authoredProxyWdhMm=[900,900,1420],dimensionsUnverifiedForGt2=True,noOperationalGeometry=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'gt2-documentary.glb').write_bytes(blob)
hits=[('Ruler_pair_button','cycle','Cycle synthetic mark pairs',.833),('Ruler_reverse_button','reverse','Reverse the mark order',1.031)]
manifest=dict(schema='bts.station.gt2-static-ruler.v1',equipment='06-01',model='./gt2-documentary.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.056,.549,.263],max=[x+.056,.583,.289]))for n,a,l,x in hits],adapter=dict(module='./ruler.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only the detached illustration has ray targets. No headset testing.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
