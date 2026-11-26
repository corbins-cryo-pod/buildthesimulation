"""Editable 3D documentary Helios 5 Hydra CX outer forms, no working assemblies. Mm→metres. Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Helios 5 Hydra CX dormant documentary exhibit'),scene=0,
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
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly',q=None):return ref(n,'box',m,(x,y,z),(w,h,d),p,q)
def bv(n,m,x,y,z,w,h,d,p='Assembly',q=None):return ref(n,'bevelbox',m,(x,y,z),(w,h,d),p,q)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
bv('Estimated_support_cabinet','shell',-321,392,-27,1098,784,850)
bx('Support_deck','frame',-321,795,-26,1190,44,930)
bx('Lower_cabinet_door_L','frame',-534,406,408,507,703,14)
bx('Lower_cabinet_door_R','frame',-38,406,408,446,703,14)
for x in[-387,-202]:bx('Cabinet_recess_pull_'+str(x),'shell',x,461,416,35,140,11)
for x in[-801,122]:
 for z in[-395,347]:bx(f'Base_vibration_foot_{x}_{z}','rubber',x,22,z,94,44,94)
bv('Chamber_outer_shell','ivory',-297,1063,66,545,492,480)
bv('Opaque_chamber_door','ivory',-297,1058,311,493,411,63)
bx('Door_inset_shoulder','silver',-296,1072,346,413,253,5)
bx('Door_lower_grip','frame',-295,917,345,174,40,16)
bx('Door_lower_grip_shadow','shell',-295,917,353,145,22,9)
# Published inner span: datum nodes only; sealed exterior with no interior operations.
ref('Chamber_width_datum_L',t=(-297-379/2,1070,49),p='Assembly')
ref('Chamber_width_datum_R',t=(-297+379/2,1070,49),p='Assembly')
bv('Upper_tower_left','ivory',-402,1608,-62,263,513,324)
bv('Upper_tower_right','ivory',-172,1586,-64,212,459,305)
bv('Upper_tower_cap','shell',-282,1878,-64,440,56,320)
bv('Center_dark_vertical_shield','darkglass',-252,1660,106,166,396,36)
for i in range(7):bx('Upper_rear_shallow_vent_'+str(i),'frame',-367+i*24,1719,-223,8,132,3)
# Stylized external tilted shells. No internally directed path or performance settings.
p=ref('Left_outer_column',t=(-624,1445,32),rot=(0,0,math.sin(.53/2),math.cos(.53/2)),p='Assembly')
bv('Left_slanted_column_cover','shell',0,27,0,240,468,267,p)
bv('Left_column_trim','ivory',-3,28,126,234,451,28,p)
bx('Left_dark_presenter_face','frame',0,32,140,172,348,5,p)
for i in range(9):bx('Left_column_shallow_vent_'+str(i),'silver',-72+i*18,198,144,7,13,2,p)
p=ref('Right_inactive_housing',t=(-9,1393,147),rot=(0,0,-math.sin(.49/2),math.cos(.49/2)),p='Assembly')
bv('Right_angled_cover','ivory',0,6,0,207,277,205,p)
bv('Right_cap','shell',0,124,0,177,37,171,p)
bx('Right_inert_front_plate','frame',0,25,104,129,122,4,p)
for idx,(x,y,z,s,l,ax)in enumerate([(-546,1038,266,124,38,'z'),(-545,1154,177,88,119,'x'),(-596,974,155,140,59,'x'),(-40,1192,233,79,48,'x')]):
 cy(f'Blank_port_outer_{idx}','silver',x,y,z,s,l,ax)
 cy(f'Blank_port_face_{idx}','shell',x if ax=='z' else x+(l/2),y,z+(l/2 if ax=='z' else 0),s*.76,5,ax)
bx('Dormant_status_bar','darkglass',-195,804,447,100,14,7)
# Decorative, isolated workstation. Show reference data only.
bx('Viewer_desk','frame',770,744,137,932,41,745)
for x in[351,1190]:
 for z in[-163,442]:bx(f'Desk_foot_{x}_{z}','frame',x,365,z,43,730,48)
for i,x in enumerate([553,1026]):
 bx('Monitor_foot_'+str(i),'shell',x,772,11,213,14,150)
 bx('Monitor_post_'+str(i),'silver',x,833,4,49,134,60)
 bx('Monitor_shell_'+str(i),'shell',x,1030,0,439,290,36)
 bx('Section_monitor_screen' if i==0 else 'Secondary_monitor','darkglass',x,1030,21,414,266,7)
 if i==0:ref('Section_monitor_datum',t=(x,1030,28),p='Assembly')
bx('Viewer_keyboard','shell',680,780,238,375,17,130)
bx('Section_view_key','teal',1018,781,258,78,18,52)
bx('Volume_measure_key','label',1115,781,258,78,18,52)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='Thermo Scientific Helios 5 Hydra CX DualBeam dormant',publishedChamberInnerMm=379,exteriorEstimates=True,noOperationalGeometry=True)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'hydra-cx-display.glb').write_bytes(blob)
hits=[('Section_monitor_screen','cyclePlane','Switch passive XY/XZ section',553,1030,21,418,270,12),('Section_view_key','center','Center the passive section',1018,781,258,81,23,56),('Volume_measure_key','measure','Count pre-existing void voxels',1115,781,258,81,23,56)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.hydra-static-inspection.v1',equipment='13-03',model='./hydra-cx-display.glb',axes='+Y up +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=b(*bb))for n,a,l,*bb in hits],adapter=dict(module='./sections.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)'),note='Read-only viewer actions on separate desk. No headset testing.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
