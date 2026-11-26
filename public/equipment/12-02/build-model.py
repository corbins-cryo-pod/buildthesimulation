"""Editable Ti2-E exterior and sealed inert reticle. Millimetre input, +Y up metre GLB. Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='Nikon Ti2-E documentary optical exhibit'),scene=0,
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
 ('ivory',(.77,.78,.71),.55,.10,1,False),('dark',(.034,.043,.047),.51,.21,1,False),('grey',(.15,.17,.156),.59,.18,1,False),
 ('optic',(.33,.58,.60),.27,.13,1,False),('teal',(.21,.55,.49),.49,.08,1,False),('blue',(.18,.36,.54),.49,.05,1,False),('label',(.66,.71,.68),.64,0,1,False)]:mat(*args)
def tapered():
 v=[(fx*w,y,z) for (y,w) in [(-.5,.5),(.5,.36)] for z in (-.5,.5) for fx in (-1,1)]
 return geometry(v,[0,1,2,1,3,2,4,6,5,5,6,7,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7])
shapes['tapered']=tapered()
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly',q=None):return ref(n,'box',m,(x,y,z),(w,h,d),p,q)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
bx('Base_240x495p3','dark',0,16,-40,240,19,495.3)
for x in (-93,93):
 for z in (-253,179):cy(f'Foot_{x}_{z}','rubber',x,4,z,31,8)
bx('Dark_lower_casting','dark',0,67,-49,215,95,455)
ref('Ivory_tapered_front','tapered','ivory',(0,95,127),(238,132,148),'Assembly')
bx('Front_lower_bezel','ivory',0,54,202,222,73,11)
bx('Front_upper_bezel','ivory',0,139,202,173.5,46,11)
bx('Inactive_camera_readout','dark',0,123,209,35,13,3)
for i,(x,y)in enumerate([(-55,66),(52,66),(-55,109),(52,109),(-17,97),(17,97),(0,104),(0,93),(0,82)]):
 cy(f'Front_cosmetic_control_{i}','grey',x,y,209,14 if i<2 else 6.4,4,'z')
cy('Documentary_focus_knob','dark',120,96,73,83,21,'x')
cy('Focus_knob_inner','stainless',132,96,73,54,8,'x')
bx('Rear_rising_column','dark',0,334,-208,158,515,98)
bx('Rear_inner_cover','grey',0,350,-151,117,460,22)
bx('Lamp_arm','dark',0,629,-88,104,78,316)
bx('Lamp_hood','grey',0,645,-32,103,46,208)
for i in range(19):bx('Upper_lamp_fin_'+str(i),'dark',0,620,-234+i*6.1,112,67,1.9)
bx('Under_lamp_cover','dark',0,581,38,86,29,115)
cy('Condenser_rack','dark',0,507,38,72,117)
cy('Condenser_front_optic','optic',0,445,38,34,6)
for x in (-66,66):cy('Condenser_knob_'+str(x),'dark',x,515,30,41,30,'x')
bx('Stage_457p6','dark',0,328,32,457.6,25,233)
bx('Stage_front_rail','grey',0,329,146,447,11,8)
bx('Stage_right_motor','dark',183,309,-28,76,45,141)
bx('Stage_left_motor','dark',-186,307,-31,76,43,139)
bx('Stage_etched_insert','teal',0,342,41,138,3,102)
bx('Sealed_reticle','optic',0,344.3,41,66,2.1,46)
for x in [-27,-18,-9,0,9,18,27]:
 bx('Reticle_model_groove_'+str(x),'stainless',x,345.4,41,.36,.25,40)
p=ref('Nosepiece_switch',t=(0,252,30),p='Assembly')
cy('Nosepiece_selector','dark',0,0,0,129,24,p=p)
for i,(x,z,h,col)in enumerate([(0,11,54,'teal'),(49,-21,47,'blue'),(-48,-19,37,'grey')]):
 cy(f'Objective_{i}_tube','stainless',x,18+h/2,z,31,h,p=p)
 cy(f'Objective_{i}_band',col,x,25,z,32,3,p=p)
 cy(f'Objective_{i}_window','optic',x,18+h,z,20,3,p=p)
# Angled solid eyetubes and nonworking camera enclosure.
bx('Binocular_support','dark',0,252,163,120,115,91)
for x in [-37,37]:
 tube('Eyepiece_arm_'+str(x),(x,276,170),(x,402,246),39,'dark','Assembly')
 tube('Eyepiece_rim_'+str(x),(x,396,242),(x,417,258),42,'grey','Assembly')
 tube('Eyepiece_glass_'+str(x),(x,417,258),(x,418,259),22,'optic','Assembly')
cy('Camera_side_port','dark',-104,184,12,64,37,'x')
bx('Inactive_camera_shell','ivory',-177,181,12,91,105,96)
for i in range(9):bx(f'Camera_indented_fin_{i}','grey',-177,142+i*8.8,61,83,2,.8)
cy('Rear_capped_side_jack','dark',100,172,-153,14,12,'x')
bx('Separate_virtual_controller','grey',296,29,127,111,40,144)
cy('Controller_magnification_dial','teal',296,54,110,33,15)
bx('Controller_capture_key','label',322,52,149,23,7,20)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='Nikon Eclipse Ti2-E single-layer exterior',baseWidthMm=240,baseDepthMm=495.3,stageSpanMm=457.6,stageTopMm=340.5,lampTopMm=668)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'nikon-ti2-optical.glb').write_bytes(blob)
hits=[('Controller_magnification_dial','toggle','Change virtual objective',296,54,110,39,25,39),('Sealed_reticle','measure','Measure synthetic reticle',0,344.3,41,67,8,47),('Controller_capture_key','measure','Measure synthetic reticle',322,52,149,26,12,24)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.inverted-reticle.v1',equipment='12-02',model='./nikon-ti2-optical.glb',axes='+Y up +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,label=l,boundsM=b(*bb))for n,a,l,*bb in hits],adapter=dict(module='./reticle.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)',pose='pose(state)'),note='No actual hardware action or headset test.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
