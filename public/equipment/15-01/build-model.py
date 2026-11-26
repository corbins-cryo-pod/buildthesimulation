"""Original documentary solid sculpture, not instrument CAD. Only the exterior plate has a reference scale."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Kopf 940 nonfunctional documentary outline'),scene=0,
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
for n,c,r,m in [('cast',(.51,.53,.50),.43,.49),('pale',(.68,.66,.59),.49,.14),('sand',(.48,.47,.43),.56,.19),('darkreadout',(.048,.031,.037),.39,.08),('charcoal',(.041,.063,.063),.57,.12),('plaque',(.23,.39,.40),.55,.09),('goldenkey',(.62,.44,.17),.53,.08),('lightkey',(.52,.67,.61),.57,.1)]:
 mat(n,c,r,m)
def b(n,m,t,s,p='Display',q=None):return ref(n,'box',m,t,s,p,q)
def bv(n,m,t,s,p='Display',q=None):return ref(n,'bevelbox',m,t,s,p,q)
def cy(n,m,t,d,h,p='Display'):return ref(n,'cyl',m,t,(d,h,d),p)
ref('Display')
b('Documentary_scale_plate','cast',(0,14,0),(254,14,353.06))
for x in [-106,106]:
 for z in [-151,151]:cy('Quiet_display_foot_'+str((x,z)),'charcoal',(x,3.5,z),24,7)
# Geometric placeholders reproduce only the family silhouette. Nothing fits or mounts to these fused solids.
bv('Sealed_solid_low_photo_outline','sand',(0,34,35),(181,29,171))
bv('Fused_front_projection','cast',(-9,45,94),(129,36,99))
bv('Fused_rear_shoulder','cast',(72,68,-58),(75,104,85))
bv('Fused_upright_outline','cast',(75,164,-60),(58,201,63))
bv('Fused_upper_cross_silhouette','cast',(42,208,-51),(132,45,68))
b('Opaque_insert_side','sand',(75,211,-14),(47,36,8))
bv('Solid_top_round_silhouette','sand',(76,267,-61),(52,18,52))
# Console is visually separate, blank, unlinked and unpositionable.
q=(math.sin(-.13/2),0,0,math.cos(-.13/2))
ref('Blank_console',t=(-184,88,10),p='Display',rot=q)
bv('Cream_console_shell','pale',(0,0,0),(102,171,42),'Blank_console')
b('Cream_front_face','pale',(0,0,22),(95,153,5),'Blank_console')
for i,y in enumerate([47,1,-44],1):
 bv('Dark_label_free_window_'+str(i),'darkreadout',(0,y,27),(72,30,7),'Blank_console')
b('Rear_blank_console_brace','sand',(0,-68,-18),(72,18,18),'Blank_console')
# Original freestanding inert mathematics illustration, not connected to the equipment exhibit.
ref('Detached_card',t=(384,0,40))
b('Card_base','charcoal',(0,11,0),(219,22,157),'Detached_card')
b('Card_spine','sand',(0,109,-31),(36,191,27),'Detached_card')
bv('Card_frame','plaque',(0,184,15),(243,164,30),'Detached_card')
ref('Triangle_card_plane',t=(0,184,31),p='Detached_card')
b('Cycle_triangle_artwork','goldenkey',(-55,99,36),(63,16,16),'Detached_card')
b('Toggle_triangle_side_labels','lightkey',(55,99,36),(63,16,16),'Detached_card')
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(equipment='15-01',model='Model 940 nonfunctional documentary sculpture',referencePlateMm=[254,353.06],noPositioningFeatures=True,noTracking=True,allPartsStatic=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'kopf940-outline.glb').write_bytes(blob)
hits=[('Cycle_triangle_artwork','cycle','Cycle the separate triangle illustration',.329),('Toggle_triangle_side_labels','labels','Show or hide side labels in the illustration',.439)]
manifest=dict(schema='bts.station.kopf940-static-outline.v1',equipment='15-01',model='./kopf940-outline.glb',units='m',axes='+Y up +Z front (display orientation only)',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=dict(min=[x-.0315,.091,.068],max=[x+.0315,.107,.084]))for n,a,l,x in hits],adapter=dict(module='./triangles.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Detached illustration only. No headset session tested.')
(OUT/'vr-station.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(manifest['nodes'],manifest['triangles'],manifest['bytes'])
