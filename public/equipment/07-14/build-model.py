"""Original sealed TSX60086A cabinet and unrelated drafting plaque, in metric glTF."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Thermo Scientific TSX60086A documentary enclosure'),scene=0,
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
for n,c,r,m in [('sheet',(.48,.52,.51),.52,.15),('fascia',(.55,.57,.55),.47,.18),('rib',(.31,.36,.35),.47,.23),('darkgray',(.045,.055,.059),.57,.05),('bluecase',(.041,.175,.35),.40,.12),('unlit',(.014,.04,.066),.24,.21),('bright',(.51,.54,.56),.34,.58),('red_stroke',(.60,.046,.037),.6,.04),('chart',(.24,.40,.40),.63,.05),('keywarm',(.67,.44,.16),.51,.05),('keylight',(.50,.66,.60),.48,.06)]:
 mat(n,c,r,m)
def b(n,m,t,s,p='Cabinet'):return ref(n,'box',m,t,s,p)
def bv(n,m,t,s,p='Cabinet'):return ref(n,'bevelbox',m,t,s,p)
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
def round_plate(n,m,t,size,r,p='Cabinet'):
 shapes[n]=rr(*size,r);return ref(n,n,m,t,(1,1,1),p)
def cy(n,m,t,d,h,p='Cabinet'):return ref(n,'cyl',m,t,(d,h,d),p,(math.sqrt(.5),0,0,math.sqrt(.5)))
ref('Cabinet')
ref('Nominal_envelope',p='Cabinet')
b('Sealed_casing_box','sheet',(0,1023,-36),(1006,1916,888),'Nominal_envelope')
b('Base_nominal_closed_front','fascia',(0,254,443),(1000,421.6,74),'Nominal_envelope')
b('Closed_insulated_door','fascia',(-3,1216.9,443),(980,1504.2,74),'Nominal_envelope')
ref('Front_seam_datum',t=(0,464.8,480),p='Cabinet')
b('Dark_front_parting_line','darkgray',(0,464.8,480.45),(1004,3.1,1.5))
b('Sealed_rear_sheet','rib',(0,1113,-480.7),(974,1640,2))
b('Rear_lower_blank_panel','fascia',(0,280,-481),(970,414,5))
b('Left_long_side_reveal','rib',(-502.3,1100,398),(1.4,1710,4))
b('Right_long_side_reveal','rib',(502.3,1100,398),(1.4,1710,4))
for x in (-422,422):
 for z in (-350,343):
  ref(f'Grounded_castor_{x}_{z}','cyl','darkgray',(x,23,z),(57,46,57),p='Nominal_envelope')
for i,y in enumerate([579,1175,1899],1):
 b('Hinge_shadow_'+str(i),'darkgray',(486,y,463),(40,140,33))
 bv('Fixed_right_hinge_'+str(i),'bright',(510,y,470),(58,126,44))
 b('Fixed_hinge_flap_'+str(i),'rib',(485,y,492),(58,108,14))
round_plate('Blue_display_bezel','bluecase',(-231,1448,484),(309,214,27),36)
round_plate('Black_inactive_display_recess','darkgray',(-231,1448,498.8),(251,167,8),22)
round_plate('Glass_no_status_or_settings','unlit',(-231,1448,503.7),(212,133,4),12)
round_plate('Static_left_latch_plate','bright',(-503,1370,475),(107,175,52),19)
# Outside handle represented as a fixed U-bar, casing never opens.
for n,a,c in [('Upper',( -552,1455,475),(-554,1455,523)),('Grip',(-554,1455,523),(-554,1256,523)),('Lower',(-554,1256,523),(-550,1256,476))]:
 tube('Fixed_left_handle_'+n,a,c,27,'bright','Cabinet')
b('Subtle_red_top_label','red_stroke',(-54,1910,481),(83,8,1.5))
b('Subtle_dark_top_label','rib',(43,1910,481),(95,6,1.5))
# Perforated sheet as individual bars in a shared mesh (no vents connect to anything).
def grid(name,cx,y,face,w,h,cols,rows):
 p,q=w/cols,h/rows;g=5.
 b(name+'_closed_backplate','darkgray',(cx,y,face-sign(face)*4),(w,h,2))
 vertices=[];inds=[]
 def rect(x,y,a,b):
  i=len(vertices);vertices.extend([(x-a/2,y-b/2,0),(x+a/2,y-b/2,0),(x+a/2,y+b/2,0),(x-a/2,y+b/2,0)])
  p=[i,i+1,i+2,i,i+2,i+3];inds.extend(p if face>0 else reversed(p))
 for i in range(cols+1):rect(-w/2+i*p,0,g,h+g)
 for j in range(rows+1):rect(0,-h/2+j*q,w+g,g)
 shapes[name]=geometry(vertices,inds);return ref(name,name,'rib',(cx,y,face),(1,1,1),p='Cabinet')
def sign(x):return 1 if x>0 else -1
grid('Front_right_cosmetic_grille',244,245,484,403,385,15,15)
grid('Rear_left_cosmetic_grille',237,254,-485,360,353,14,14)
b('Rear_small_blank_service_cover','darkgray',(-389,242,-484),(111,120,5))
b('Rear_blank_identity_plate','fascia',(-312,570,-483),(190,106,1))
# Standalone dimension comparison, not near or connected to any cabinet access.
ref('Detached_comparison',t=(892,0,106))
b('Drawing_stand_base','darkgray',(0,24,0),(405,48,287),'Detached_comparison')
b('Drawing_stand_support','rib',(0,497,0),(112,949,94),'Detached_comparison')
bv('Drawing_stand_frame','chart',(0,1056,42),(526,441,88),'Detached_comparison')
ref('Drawing_plane_datum',t=(0,1056,91),p='Detached_comparison')
b('Choose_fixed_shape','keywarm',(-106,814,102),(117,47,31),'Detached_comparison')
b('Rotate_fixed_drawing','keylight',(106,814,102),(117,47,31),'Detached_comparison')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='07-14',model='Thermo Scientific TSX60086A, fixed documentary cabinet',nominalWDH_mm=[1006,960,1981],frontSeamMm=464.8,allPartsStatic=True,referenceRevision='2018 OEM TDS')
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'tsx60086a-documentary.glb').write_bytes(blob)
hits=[('Choose_fixed_shape','cycle','Cycle the immutable geometry drawing',.786),('Rotate_fixed_drawing','rotate','Rotate the geometry drawing 90 degrees',.998)]
manifest=dict(schema='bts.station.tsx60086a.documentary.v1',equipment='07-14',model='./tsx60086a-documentary.glb',units='m',axes='+Y up +Z front',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.059,.790,.192],max=[x+.059,.838,.224]))for n,a,l,x in hits],adapter=dict(module='./drawing.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Only the independent shape plaque has actions. No headset test.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
