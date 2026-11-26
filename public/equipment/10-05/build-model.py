"""Editable passive upright microscope and inert coupon. Mm source, +Y up metre GLB, Python 3 stdlib."""
import json, struct, math
from pathlib import Path
OUT=Path(__file__).resolve().parent
G=dict(asset=dict(version='2.0',generator='SliceScope Pro 1000 optical reference exhibit'),scene=0,
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
 ('dark',(.028,.043,.053),.56,.16,1,False),('gunmetal',(.105,.136,.146),.5,.31,1,False),
 ('violet',(.25,.16,.47),.45,.26,1,False),('etch',(.17,.57,.60),.47,.07,1,False),
 ('glassOptic',(.30,.52,.56),.30,.1,1,False),('label',(.74,.81,.76),.64,0,1,False)]:mat(*args)
ref('Assembly')
def bx(n,m,x,y,z,w,h,d,p='Assembly'):return box_at(n,m,(x,y,z),(w,h,d),p)
def cy(n,m,x,y,z,d,l,axis='y',p='Assembly'):
 r=math.sqrt(.5);q=(0,0,-r,r) if axis=='x' else (r,0,0,r) if axis=='z' else None
 return ref(n,'cyl',m,(x,y,z),(d,l,d),p,q)
bx('Motorized_XY_base_157p2x300','dark',0,34,-37,157.2,68,300)
bx('XY_stage_front_inset','stainless',0,66,114,116,46,7)
cy('Inactive_stage_knob','gunmetal',42,69,119,17,7,'z')
bx('Nosepiece_control_cover','dark',0,199,-114,99,307,79)
cy('Main_steel_column','stainless',0,250,-127,54,366)
bx('Top_head_plate_100','dark',0,426,-36,100,16,238)
for j in range(8):
 cy('Head_screw_'+str(j),'stainless',(-1)**j*33,435,-132+38*(j//2),5,1.5)
cy('Camera_mount','dark',0,448,61,54,44)
cy('Camera_adapter','gunmetal',0,474,61,49,43)
cy('Camera_barrel','dark',0,515,61,53,49)
bx('SciCam_exterior','violet',0,570,61,64,64,63)
for i in range(16):bx('Camera_shallow_fin_'+str(i),'violet',-31+i*4.12,570,94,1.7,62,4)
for y in [87,104,129,149]:cy('Condenser_stage_'+str(y),'gunmetal' if y%2==0 else 'dark',0,y,61,{87:86,104:68,129:52,149:37}[y],19)
cy('Condenser_front_window','glassOptic',0,159,61,25,3)
p=ref('Objective_focus_group',t=(0,285,61),p='Assembly')
bx('Nose_block','dark',0,26,0,83,34,70,p)
cy('Objective_outer','stainless',0,-2,0,36,28,'y',p)
cy('Objective_black_band','dark',0,-14,0,34,16,'y',p)
cy('Objective_lower','stainless',0,-29,0,28,16,'y',p)
cy('Objective_front_window','glassOptic',0,-38,0,18,4,'y',p)
p=ref('Chart_stage_xy',t=(0,174,61),p='Assembly')
ref('Sample_stage_ring','tube','gunmetal',(0,0,0),(125,10,125),p)
bx('Inert_coupon_mount','dark',0,7,0,83,6,77,p)
bx('Etched_reference_coupon','etch',0,11,0,61,2,45,p)
for x in (-23,23):bx('Coupon_bracket_'+str(x),'stainless',x,13,0,5,3,51,p)
for x,z,n,H in [(-153,-75,'Left',360),(153,-75,'Right',360),(0,233,'Front',244)]:
 cy(n+'_post_foot_100','dark',x,7,z,100,14)
 cy(n+'_post','stainless',x,16+H/2,z,32,H)
 cy(n+'_post_collar','dark',x,177,z,61,47);cy(n+'_collar_band','stainless',x,158,z,61,5)
 if n=='Front':
  bx('Front_stage_arm','dark',0,177,153,47,15,154)
  continue
 bx(n+'_platform','dark',x,196,z,113,13,117)
 bx(n+'_mount_lower','gunmetal',x,221,z,92,38,88)
 bx(n+'_mount_mid','dark',x,257,z,89,36,89)
 bx(n+'_mount_upper','gunmetal',x,298,z,77,45,75)
 bx(n+'_blank_cover','dark',x,331,z+2,64,30,74)
 inner=x/2;tube(n+'_blunt_clearance_marker',(x,292,z+44),(inner,218,61),12,'gunmetal','Assembly')
 cy(n+'_collar_decorative_knob','amber',x+(-1 if x<0 else 1)*35,179,z,14,6,'x')
bx('Remote_focus_console','dark',246,32,165,97,64,123)
cy('Focus_dial','gunmetal',247,72,169,39,17)
cy('Focus_dial_token','etch',247,81,169,20,3)
bx('Stage_home_key','label',215,66,204,15,5,19)
while len(data)%4:data.append(0)
G['buffers']=[dict(byteLength=len(data))]
G['extras']=dict(model='Scientifica SliceScope Pro 1000; inert optical reference configuration',mountWidthMm=157.2,mountDepthMm=300,headPlateWidthMm=100,postFootMm=100)
raw=json.dumps(G,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
blob=struct.pack('<4sIII4s',b'glTF',2,28+len(raw)+len(data),len(raw),b'JSON')+raw+struct.pack('<I4s',len(data),b'BIN\0')+data
(OUT/'slicescope-optical.glb').write_bytes(blob)
h=[('Focus_dial','cycle',None,'Switch teaching focus plane',247,72,169,50,29,50),('Etched_reference_coupon','pick',None,'Capture in-focus inert target',0,185,61,63,6,47),('Stage_home_key','home',None,'Reset teaching lateral offset',215,66,204,18,9,23)]
def b(x,y,z,a,d,c):return dict(min=[(x-a/2)/1000,(y-d/2)/1000,(z-c/2)/1000],max=[(x+a/2)/1000,(y+d/2)/1000,(z+c/2)/1000])
m=dict(schema='bts.station.optical-reference.v1',equipment='10-05',model='./slicescope-optical.glb',axes='+Y up, +Z front',units='m',nodes=len(G['nodes']),bytes=len(blob),triangles=sum(G['accessors'][G['meshes'][n['mesh']]['primitives'][0]['indices']]['count']//3 for n in G['nodes'] if 'mesh' in n),hitTargets=[dict(node=n,action=a,actionPayload=p,label=l,boundsM=b(*bb))for n,a,p,l,*bb in h],adapter=dict(module='./optics.mjs',factory='createStation',state='read()',dispatch='dispatch(action,payload)',hit='hit(nodeName)',pose='pose(state)'),note='Move coupon hit bounds with semantic stage translation. No headset test.')
(OUT/'vr-station.json').write_text(json.dumps(m,indent=2)+'\n')
print(m['nodes'],m['triangles'],m['bytes'])
