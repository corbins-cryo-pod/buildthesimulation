"""Original documentary RZ6/RA4PA cases, plus separate offline file reader. Metric GLB."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='TDT RZ6-A-P1 and RA4PA disconnected cases'),scene=0,
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
for n,c,r,m in [('head',(.026,.037,.040),.57,.14),('edge',(.011,.019,.020),.61,.16),('lid',(.45,.48,.47),.52,.37),('gunmetal',(.115,.151,.15),.54,.20),('glass off',(.018,.043,.044),.20,.15),('dormant blue',(.035,.12,.26),.38,.11),('dormant red',(.25,.031,.038),.48,.05),('bright',(.48,.51,.47),.35,.53),('accent',(.25,.30,.26),.56,.06),('contrast',(.52,.58,.51),.51,.07),('paper',(.22,.38,.39),.6,.06),('keywarm',(.66,.44,.15),.54,.03),('keylight',(.51,.66,.58),.53,.08)]:mat(n,c,r,m)
def b(n,m,t,s,p='Rack'):return ref(n,'box',m,t,s,p)
def bv(n,m,t,s,p='Rack'):return ref(n,'bevelbox',m,t,s,p)
def d(n,m,t,diam,len,p='Rack',axis='z',mesh='cyl'):
 r=math.sqrt(.5);q=(r,0,0,r) if axis=='z' else (0,0,r,r) if axis=='x' else None
 return ref(n,mesh,m,t,(diam,len,diam),p,q)
def rr(w,h,dep,r):
 pts=[]
 for (x,y),a0 in zip([(w/2-r,h/2-r),(-w/2+r,h/2-r),(-w/2+r,-h/2+r),(w/2-r,-h/2+r)],[0,90,180,270]):
  for j in range(9):
   a=math.radians(a0+11.25*j);pts.append((x+r*math.cos(a),y+r*math.sin(a)))
 n=len(pts);v=[(x,y,z)for z in [-dep/2,dep/2] for x,y in pts];f=[]
 for i in range(1,n-1):f += [0,i+1,i,n,n+i,n+i+1]
 for i in range(n):
  j=(i+1)%n;f += [i,j,i+n,j,j+n,i+n]
 return geometry(v,f)
def face(n,m,t,w,h,r,dep,p='Rack'):
 shapes[n]=rr(w,h,dep,r);return ref(n,n,m,t,(1,1,1),p)
ref('Rack')
b('RZ6_unpowered_chassis_closed','head',(0,65,-6),(428,128,305))
b('RZ6_sheet_top','lid',(0,128,-8),(425,2.8,303))
face('Nominal_RZ6_rack_face_19in_3U','edge',(0,66.675,147),482.6,133.35,14,9)
face('Face_plate_partition_left','head',(-82,66.8,151.66),254,107,16,1.6)
face('Face_plate_partition_right','head',(111,66.8,151.70),188,107,15,1.5)
for x in (-231,231):
 for y in (26,104):face(f'Rack_ear_slot_silhouette_{x}_{y}','bright',(x,y,152.03),11,5.5,2.5,.75)
d('Unlit_power_trim','bright',(-198,106,152.2),23,2.1,mesh='gland')
d('Unlit_blue_power_face','dormant blue',(-198,106,153.2),15,1.2)
face('Unlit_RZ6_status_window','glass off',(-101,94,153),109,29,6,2)
for i in range(6):b('Left_neutral_status_mark_'+str(i),'accent',(-142+13*i,68,153.9),(2.2,4.8,.52))
for row in range(3):
 for col in range(6):
  x=-140+col*8;y=21+row*7
  b(f'Left_unlit_dot_{row}_{col}','dormant red' if col>2 else 'accent',(x,y,153.58),(2.9,3.8,.37))
b('RZ6_mark_without_instructions','contrast',(-186,63,153.1),(28,5.0,.45))
b('Central_mark_1','contrast',(19,99,153.1),(24,4.4,.40))
b('Central_mark_2','accent',(19,91,153.1),(21,3.0,.40))
face('Upper_round_blind_mount','bright',(63,104,152.7),29,39,4,2.5)
d('Upper_round_blind_shadow','edge',(63,104,154.2),21,2)
for y,xs in [(101,[103,126,147,177]),(59,[85,103,126,147,175,194])]:
 for x in xs:
  d(f'Capped_port_ring_{x}_{y}','bright',(x,y,153.1),12.0,1.8,mesh='gland')
  d(f'Capped_port_solid_{x}_{y}','edge',(x,y,154.3),7.0,1.0)
for i in range(13):
 b('Right_inactive_indicator_'+str(i),'dormant red',(197-3*(i%2),105-(i//2)*3.8,153.5),(1.8,2.8,.35))
face('Right_bottom_dark_recess','gunmetal',(114,26,152.6),103,15,5,1.4)
for j in range(13): b('Small_decorative_vent_'+str(j),'edge',(167+j*2.95,29,153.2),(1.1,13,.8))
b('Closed_rear_back','gunmetal',(0,64,-159.0),(422,116,2.2))
for j in range(23):b('Rear_fixed_vent_relief_'+str(j),'edge',(-150+j*8,70,-160.35),(3.4,29,.6))
# Separate legacy four-channel Medusa metal sleeve. Exact dimensions unavailable.
ref('RA4PA_Separate_Closed_Enclosure',t=(365,0,34))
bv('Medusa_case_estimate','head',(0,15,0),(120,30,65),'RA4PA_Separate_Closed_Enclosure')
b('Medusa_top_plate','gunmetal',(0,29.7,0),(110,1.9,57),'RA4PA_Separate_Closed_Enclosure')
b('Medusa_blank_sidecap','edge',(58,16,0),(5,27,55),'RA4PA_Separate_Closed_Enclosure')
b('RA4PA_tag_line_a','contrast',(-23,30.8,-15),(63,.28,4),'RA4PA_Separate_Closed_Enclosure')
b('RA4PA_tag_line_b','accent',(-36,30.7,-8),(35,.3,2.7),'RA4PA_Separate_Closed_Enclosure')
d('RA4PA_inactive_left_dot','dormant blue',(-49,31,-4),3.3,.48,'RA4PA_Separate_Closed_Enclosure',axis='y')
for i in range(4):
 d('Medusa_inactive_indicator_'+str(i+1),'dormant red',(22,31,-16+i*9),3.5,.54,'RA4PA_Separate_Closed_Enclosure',axis='y')
# Only this fictional offline reader has actions, and the file is not linked to the cases.
ref('Detached_offline_reader',t=(13,0,-352))
b('Offline_reader_base','edge',(0,7,1),(332,14,157),'Detached_offline_reader')
b('Offline_reader_post','gunmetal',(0,142,-24),(65,270,62),'Detached_offline_reader')
bv('Offline_reader_screen_case','paper',(0,292,20),(398,256,58),'Detached_offline_reader')
ref('Offline_graph_datum',t=(0,292,52),p='Detached_offline_reader')
b('Recompute_from_fixed_file','keywarm',(-86,157,57),(112,24,23),'Detached_offline_reader')
b('Cycle_offline_threshold','keylight',(86,157,57),(112,24,23),'Detached_offline_reader')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='15-12',model='RZ6-A-P1 and RA4PA both disconnected',nominalRackFaceMm=[482.6,133.35],otherDimensionsEstimated=True,allPartsStatic=True,noAudioOrControl=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'rz6-ra4pa-exteriors.glb').write_bytes(blob)
hits=[('Recompute_from_fixed_file','analyze','Read the immutable offline file at the selected analysis threshold',-.073),('Cycle_offline_threshold','cycleThreshold','Cycle offline software threshold',.099)]
manifest=dict(schema='bts.station.tdt-offline-file.v1',equipment='15-12',model='./rz6-ra4pa-exteriors.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.056,.145,-.307],max=[x+.056,.169,-.283]))for n,a,l,x in hits],adapter=dict(module='./offline.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only detached offline figure actions. No headset session tested.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
