"""Editable disconnected Vevo 3100 visual cart and unrelated static demo ruler stand."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='VisualSonics Vevo 3100 console exterior'),scene=0,
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
for n,c,r,m in [('body',(.038,.051,.056),.55,.13),('silver',(.48,.53,.55),.35,.40),('bezel',(.026,.034,.040),.56,.11),('glass off',(.024,.039,.048),.24,.16),('shadow',(.017,.026,.031),.64,.04),('side',(.24,.28,.30),.50,.22),('neutral',(.59,.65,.66),.55,.12),('chart',(.27,.43,.43),.58,.09),('golden',(.65,.45,.19),.49,.08),('pale',(.50,.65,.59),.51,.06)]:mat(n,c,r,m)
def b(n,m,t,s,p='Cart',q=None):return ref(n,'box',m,t,s,p,q)
def bv(n,m,t,s,p='Cart',q=None):return ref(n,'bevelbox',m,t,s,p,q)
def rr(w,h,d,r):
 points=[]
 for (x,y),a0 in zip([(w/2-r,h/2-r),(-w/2+r,h/2-r),(-w/2+r,-h/2+r),(w/2-r,-h/2+r)],[0,90,180,270]):
  for j in range(9):
   a=math.radians(a0+j*90/8); points.append((x+r*math.cos(a),y+r*math.sin(a)))
 n=len(points);vs=[(x,y,z) for z in [-d/2,d/2] for x,y in points];f=[]
 for i in range(1,n-1):f += [0,i+1,i,n,n+i,n+i+1]
 for i in range(n):
  j=(i+1)%n;f += [i,j,i+n,j,j+n,i+n]
 return geometry(vs,f)
def plate(n,m,t,w,h,d,r,p='Cart',q=None):
 shapes[n]=rr(w,h,d,r);return ref(n,n,m,t,(1,1,1),p,q)
def diskX(n,m,t,d,length,p='Cart',mesh='cyl'):
 r=math.sqrt(.5);return ref(n,mesh,m,t,(d,length,d),p,(0,0,r,r))
def rx(a):return (math.sin(a/2),0,0,math.cos(a/2))
ref('Cart')
ref('Documented_footprint',p='Cart')
# These physically visible castor yokes and curved rail mark the OEM plan bounds.
b('Planar_center_bed','body',(0,155,-2),(293,127,415),'Documented_footprint')
for dir1 in (-1,1):
 for dir2 in (-1,1):
  x,z=dir1*207,dir2*276
  b('Fixed_caster_outreach_'+str((dir1,dir2)),'body',(x,139,z),(122,51,128),'Documented_footprint')
  bv('Fixed_caster_fork_'+str((dir1,dir2)),'bezel',(x,76,z),(69,61,65),'Documented_footprint')
  diskX('Fixed_rubber_wheel_'+str((dir1,dir2)),'shadow',(x,45,z),90,44,'Documented_footprint')
  diskX('Wheel_hub_'+str((dir1,dir2)),'side',(x+dir1*23,45,z),46,5,'Documented_footprint')
b('Nominal_plan_width_crosspiece','body',(0,129,220),(540,46,178),'Documented_footprint')
bv('Lower_console_dark_round_mass','body',(0,510,-37),(467,631,439))
plate('Lower_front_closed_rectangular_panel','bezel',(0,503,184),397,560,43,27)
plate('Muted_lower_front_tag','neutral',(41,246,208),89,11,2,4)
b('Left_dormant_body_side','side',(-225,506,-33),(11,488,328))
b('Right_dormant_body_side','side',(225,506,-33),(11,488,328))
plate('Opaque_rear_cover','side',(0,469,-257),397,478,17,12)
for i in range(11):b(f'Rear_relief_only_{i+1}','shadow',(85-i*17,388,-267),(7,123,2))
b('Primary_silver_riser','silver',(0,854,-50),(216,142,238))
bv('Console_black_tray','body',(0,948,13),(498,100,447))
# Swept front and side handrail as decorative static pieces, not a device control.
path=[(-248,952,-137),(-250,952,133),(-232,952,192),(-186,952,228),(185,952,228),(231,952,192),(249,952,133),(249,952,-135)]
for i in range(len(path)-1):tube('Static_edge_rail_'+str(i),path[i],path[i+1],30,'silver','Cart')
# Angled lower display, upper monitor fixed upright (cannot hinge or operate).
lower=ref('Blank_lower_screen_parent',t=(0,1042,110),p='Cart',rot=rx(-.72))
plate('Lower_screen_black_border','bezel',(0,0,0),378,226,49,18,lower)
plate('Lower_screen_neutral_unlit_glass','glass off',(0,2,10.5),310,164,3,12,lower)
b('Upper_display_riser','side',(0,1160,-62),(96,271,96))
plate('Upper_display_silver_halo','silver',(0,1424,-25),481,312,51,24)
plate('Upper_display_black_border','bezel',(0,1424,-7),468,303,19,19)
plate('Upper_display_unlit_glass','glass off',(0,1440,4),394,234,7,9)
for r in range(3):
 for i in range(3):b(f'Neutral_monitor_badge_mark_{r}{i}','neutral',((i-1)*7,1298-r*7,4),(3,3,1.3))
# Detached static illustration, not connected to the cart or any accessories.
ref('Detached_ruler',t=(760,0,88))
b('Ruler_stand_base','body',(0,21,0),(411,42,292),'Detached_ruler')
b('Ruler_stand_pillar','silver',(0,437,-29),(90,821,108),'Detached_ruler')
bv('Ruler_display_body','chart',(0,1019,55),(502,497,76),'Detached_ruler')
ref('Invariant_graphic_datum',t=(0,1019,98),p='Detached_ruler')
b('Cycle_marker_pair','golden',(-96,752,102),(120,38,29),'Detached_ruler')
b('Reverse_ruler_endpoints','pale',(96,752,102),(120,38,29),'Detached_ruler')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='15-07',model='FUJIFILM VisualSonics legacy Vevo 3100 console-only silhouette',referenceWidthDepthMm=[540,680],documentedFoldedHeightNotModeledMm=1220,estimatedUprightHeightMm=1580,includesAccessoryCart=False,allPartsStatic=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'vevo3100-console.glb').write_bytes(blob)
hits=[('Cycle_marker_pair','cycle','Cycle the detached illustration row pair',.664),('Reverse_ruler_endpoints','reverse','Reverse the order of the markers on the illustration',.856)]
manifest=dict(schema='bts.station.vevo3100.static-ruler.v1',equipment='15-07',model='./vevo3100-console.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.061,.732,.175],max=[x+.061,.772,.205]))for n,a,l,x in hits],adapter=dict(module='./ruler.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only the detached drawn ruler is interactive. No headset test.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
