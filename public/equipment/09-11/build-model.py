"""Original parametric SR860 exterior. Python 3 + Pillow. Run beside this file.
Units mm, Y up, front +Z. Panel coordinates below in normalized reference-view
units, independently drawn, not factory CAD or redistributed photographs."""
from pathlib import Path
import io,json,struct,math
from PIL import Image,ImageDraw,ImageFont
OUT=Path(__file__).resolve().parent
W,H,D=431.8,133.35,431.8
G={"asset":{"version":"2.0","generator":"BuildTheSimulation SR860 original measured-envelope reconstruction"},"scene":0,"scenes":[{"nodes":[]}],"nodes":[],"meshes":[],"materials":[],"buffers":[],"bufferViews":[],"accessors":[],"textures":[],"images":[]}
buf=bytearray()
def store(b,target=None):
 while len(buf)%4:buf.append(0)
 i=len(G['bufferViews']);v={'buffer':0,'byteOffset':len(buf),'byteLength':len(b)}
 if target:v['target']=target
 G['bufferViews'].append(v);buf.extend(b);return i
def acc(vals,typ,n,indices=False):
 if not isinstance(vals[0],(list,tuple)):vals=[(x,) for x in vals]
 v=store(b''.join(struct.pack('<'+('H' if indices else 'f')*n,*x) for x in vals),34963 if indices else 34962)
 a={'bufferView':v,'count':len(vals),'componentType':5123 if indices else 5126,'type':typ}
 if typ=='VEC3':a.update(min=[min(p[j] for p in vals) for j in range(n)],max=[max(p[j] for p in vals) for j in range(n)])
 i=len(G['accessors']);G['accessors'].append(a);return i
def primitive(pos,norm,ind,uv=None):
 at={'POSITION':acc(pos,'VEC3',3),'NORMAL':acc(norm,'VEC3',3)}
 if uv:at['TEXCOORD_0']=acc(uv,'VEC2',2)
 return {'attributes':at,'indices':acc(ind,'SCALAR',1,True)}
# 1×1×1 solid cuboid, z-axis cylinder, front texture plane.
P={};pos=[];nn=[];ii=[]
for ax,ay,n in [((1,0,0),(0,1,0),(0,0,1)),((-1,0,0),(0,1,0),(0,0,-1)),((0,0,-1),(0,1,0),(1,0,0)),((0,0,1),(0,1,0),(-1,0,0)),((1,0,0),(0,0,-1),(0,1,0)),((1,0,0),(0,0,1),(0,-1,0))]:
 b=len(pos)
 for u,v in [(-.5,-.5),(.5,-.5),(.5,.5),(-.5,.5)]:pos.append(tuple(u*ax[j]+v*ay[j]+.5*n[j] for j in range(3)));nn.append(n)
 ii.extend(b+i for i in [0,1,2,0,2,3])
P['box']=primitive(pos,nn,ii)
pos=[];nn=[];ii=[];N=24
for i in range(N):
 a,b=2*math.pi*i/N,2*math.pi*(i+1)/N;o=len(pos)
 for t,z in [(a,-.5),(b,-.5),(b,.5),(a,.5)]:
  x,y=math.cos(t),math.sin(t);pos.append((x*.5,y*.5,z));nn.append((x,y,0))
 ii.extend(o+j for j in [0,1,2,0,2,3])
 for z in [-.5,.5]:
  o=len(pos);pos.extend([(0,0,z),(.5*math.cos(a),.5*math.sin(a),z),(.5*math.cos(b),.5*math.sin(b),z)]);nn.extend([(0,0,z*2)]*3);ii.extend(o+j for j in ([0,1,2] if z>0 else [0,2,1]))
P['cyl']=primitive(pos,nn,ii)
P['plane']=primitive([(-.5,-.5,0),(.5,-.5,0),(.5,.5,0),(-.5,.5,0)],[(0,0,1)]*4,[0,1,2,0,2,3],[(0,1),(1,1),(1,0),(0,0)])
mats={};cache={}
def material(n,color,metal=0,texture=None):
 i=len(G['materials']);mats[n]=i;p={'baseColorFactor':[*color,1],'metallicFactor':metal,'roughnessFactor':.51}
 if texture is not None:
  j=len(G['images']);G['images'].append({'bufferView':store(texture),'mimeType':'image/png'});G['textures'].append({'source':j});p['baseColorTexture']={'index':len(G['textures'])-1}
 G['materials'].append({'name':n,'pbrMetallicRoughness':p,'doubleSided':True})
for n,c,m in [('enamel',[.57,.60,.60],.19),('rim',[.66,.67,.65],.17),('dark',[.026,.032,.037],.11),('black',[.010,.014,.017],.08),('chrome',[.56,.60,.61],.77),('ivory',[.81,.82,.77],.12),('brass',[.78,.46,.15],.65),('cable',[.09,.17,.23],.05),('glass',[.014,.027,.035],.15)]:material(n,c,m)
def node(n,sh=None,ma=None,loc=(0,0,0),scale=(1,1,1),rot=None,parent=None):
 ob={'name':n,'translation':[v/1000 for v in loc]}
 if sh:
  key=(sh,ma)
  if key not in cache:
   cache[key]=len(G['meshes']);G['meshes'].append({'name':sh+'_'+ma,'primitives':[dict(P[sh],material=mats[ma])]})
  ob['mesh']=cache[key];ob['scale']=[v/1000 for v in scale]
 if rot:ob['rotation']=rot
 i=len(G['nodes']);G['nodes'].append(ob)
 (G['scenes'][0]['nodes'] if parent is None else G['nodes'][parent].setdefault('children',[])).append(i);return i
def bx(n,c,x,y,z,w,h,d,pa=None):return node(n,'box',c,(x,y,z),(w,h,d),parent=pa)
def cyl(n,c,x,y,z,w,d,pa=None):return node(n,'cyl',c,(x,y,z),(w,w,d),parent=pa)
F=D/2; R=-D/2;screen=(355,75,645,316)
try:fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';ImageFont.truetype(fontpath,12)
except:fontpath=None
def font(n):return ImageFont.truetype(fontpath,n) if fontpath else ImageFont.load_default()
def imgbytes(im):
 b=io.BytesIO();im.save(b,'PNG',optimize=True);return b.getvalue()
def tex(draw,tx,ty,t,s=18,fill='#273035',align='mm'):draw.text((tx*2,ty*2),t,font=font(s),fill=fill,anchor=align)
def fx(px):return (px-540)/1028*W
def fy(py):return (355-py)/310*H
def rx(px):return -(px-535)/980*W
def ry(py):return (345-py)/298*H
# Independent silk legend textures: grouped function labels rather than vendor artwork.
f=Image.new('RGB',(2056,620),'#d9d9d3');df=ImageDraw.Draw(f)
def fronttext(x,y,t,size=16):tex(df,x-26,y-45,t,size)
for x in [172,233,326,675,763,859,936,995]: df.line(((x-26)*2,40,(x-26)*2,580),fill='#919795',width=2)
for x,y,t in [(99,70,'SIGNAL'),(200,70,'FILTER'),(277,70,'DISPLAY'),(716,70,'CURSOR'),(809,70,'FUNCTION'),(931,70,'REFERENCE'),(96,132,'TIME CONSTANT'),(91,184,'INPUT RANGE'),(76,237,'VOLTAGE'),(200,237,'CURRENT'),(277,172,'CH 1 OUT'),(717,172,'CH 2 OUT'),(804,147,'DATA'),(808,197,'SETUP'),(886,79,'PHASE'),(949,79,'FREQ'),(1010,79,'LEVEL'),(999,149,'DC OFFSET'),(79,292,'A'),(139,292,'B'),(200,292,'I'),(900,288,'REF IN'),(1010,246,'SINE OUT'),(1010,337,'–'),(281,335,'CH 1'),(721,335,'CH 2'),(500,335,'SR860  /  500 kHz DSP LOCK-IN')]:fronttext(x,y,t,19 if t.startswith('SR860') else 14)
for x,y,t in [(65,91,'SENS.'),(65,104,'RMS'),(64,151,'1 / 3 / 10'),(65,199,'10 mV'),(64,215,'1 V'),(196,90,'RC'),(196,106,'6 · 12'),(196,120,'18 · 24'),(718,144,'REMOTE'),(905,210,'TIMEBASE'),(948,215,'SOURCE')]:fronttext(x,y,t,13)
material('front_print',[1,1,1],.04,imgbytes(f));b=Image.new('RGB',(1960,596),'#282b2e');dr=ImageDraw.Draw(b)
def reartext(x,y,t,n=18):tex(dr,x-45,y-47,t,n,'#e9ece5')
banks=[(430,88,'BLAZE X'),(487,88,'X'),(546,88,'Y'),(604,88,'MONITOR'),(513,148,'AUX OUT  1–4'),(774,148,'AUX IN  1–4'),(949,147,'TRIG IN'),(262,100,'PREAMP POWER'),(342,192,'CHASSIS'),(160,238,'AC INPUT  ·  FUSE'),(396,265,'RS-232'),(516,265,'IEEE-488'),(684,265,'USB'),(756,265,'ETHERNET'),(861,265,'TIMEBASE IN / OUT'),(956,265,'HDMI'),(890,87,'SR860   /   REAR PANEL')]
for x,y,t in banks:reartext(x,y,t)
material('rear_print',[1,1,1],.03,imgbytes(b))
bx('Enclosure_17in','enamel',0,H/2,0,W,H,D)
bx('Front_edge','rim',0,H/2,F-.9,W,H,2)
node('Front_original_legends','plane','front_print',(0,H/2,F+.19),(W-4,H-3,1))
node('Rear_original_legends','plane','rear_print',(0,H/2,R-.19),(W-4,H-3,1),(0,1,0,0))
for x in [-W*.4,W*.4]:
 for z in [-D*.36,D*.36]:bx(f'Foot_{x:.0f}_{z:.0f}','black',x,-5,z,26,10,32)
for si in [-1,1]:
 for j in range(24):bx(f'Side_vent_{si}_{j}','dark',si*(W/2+.1),59,-140+j*12,1,19,3)
 for j in [-140,145]:bx(f'Cover_screw_{si}_{j}','dark',si*(W/2+.3),96,j,1,5,5)
sx=(fx(screen[0])+fx(screen[2]))/2;sy=(fy(screen[1])+fy(screen[3]))/2
sw=fx(screen[2])-fx(screen[0]);sh=fy(screen[1])-fy(screen[3])
bx('Screen_bezel','black',sx,sy,F+1,sw+8,sh+5,2)
node('Screen_active','plane','glass',(sx,sy,F+2.2),(sw,sh,1))
def bnc(n,x,y,z,sign=1):
 for label,c,dia,dep,of in [('nut','chrome',11.4,2,1.3),('barrel','chrome',8.6,9,6.6),('socket','black',6.9,.6,11.25),('dielectric','ivory',4.8,.6,11.58),('contact','brass',1.7,.7,11.93)]:cyl(n+'_'+label,c,x,y,z+sign*of,dia,dep)
 bx(n+'_bayonet_lugs','chrome',x,y,z+sign*8,10.7,2.2,2.2)
for n,x,y in [('A',79,311),('B',139,311),('I',200,311),('CH1',277,311),('CH2',720,311),('REF_IN',900,311),('SINE_P',1010,267),('SINE_N',1010,311)]:bnc('Front_'+n,fx(x),fy(y),F)
def knob(n,x,y):
 pa=node('Knob_'+n,loc=(fx(x),fy(y),F+.3));cyl(n+'_body','dark',0,0,4,10,8,pa);cyl(n+'_cap','enamel',0,0,8.5,8,.8,pa);bx(n+'_index','ivory',0,2.5,9,1,2.4,.6,pa)
for n,x,y in [('phase',887,104),('frequency',950,104),('amplitude',1010,104),('offset',1010,168),('cursor',719,98),('CH1',276,265),('CH2',719,265)]:knob(n,x,y)
buttons=[(149,86,'sens_up'),(149,107,'sens_down'),(149,140,'tau_up'),(149,159,'tau_down'),(149,194,'range_up'),(149,216,'range_down'),(202,135,'slope'),(202,160,'sync'),(254,97,'config'),(302,97,'blank'),(254,129,'layout'),(302,129,'screen_save'),(74,265,'A_diff'),(112,265,'DC'),(151,265,'ground'),(200,265,'current_range'),(254,219,'CH1_sel'),(303,219,'CH1_expand'),(740,148,'local'),(789,96,'auto_phase'),(835,96,'auto_range'),(789,129,'recall'),(835,129,'scale'),(789,174,'save'),(788,217,'calc'),(833,217,'aux'),(789,265,'scan'),(834,265,'start'),(886,153,'phase_up'),(886,172,'phase_down'),(949,150,'harm_up'),(949,170,'harm_down'),(880,264,'trigger'),(914,264,'input'),(950,264,'chop'),(1010,219,'mode'),(697,219,'CH2_sel'),(742,219,'CH2_expand')]
for x,y,n in buttons:bx('Key_'+n,'ivory',fx(x),fy(y),F+1.8,10,6,3)
bx('Front_USB','black',fx(833),fy(173),F+1.1,13,5,2)
for n,x,y in [('BlazeX',430,112),('X',487,112),('Y',546,112),('MON',604,112),('trigger',949,174),('time_in',831,298),('time_out',891,298)]+[(f'auxout{i+1}',x,175) for i,x in enumerate([430,487,546,604])]+[(f'auxin{i+1}',x,175) for i,x in enumerate([688,746,804,862])]:bnc('Back_'+n,rx(x),ry(y),R,-1)
for n,x,y,w,h in [('IEC',168,276,32,19),('fuse',258,273,45,16),('RS232',398,297,23,10),('GPIB',516,295,38,12),('LAN',757,297,15,13),('USB_B',683,298,11,10),('HDMI',956,306,16,7),('preamp',270,127,25,10)]:
 bx('Rear_'+n+'_rim','chrome',rx(x),ry(y),R-1,w+2,h+2,2);bx('Rear_'+n,'black',rx(x),ry(y),R-2,w,h,2)
for i in range(9):bx('Rear_fan_slot_'+str(i),'black',rx(133+i*8),ry(98),R-.5,2.0,30,.7)
pa=node('Input_A_plug',loc=(fx(79),fy(311),F+10))
cyl('BNC_plug','chrome',0,0,5,12,10,pa);cyl('Strain_relief','cable',0,0,15,9,12,pa);cyl('Coax_to_source','cable',0,0,32,3.6,24,pa)
G['extras']={'device':'SR860','configuration':'benchtop, voltage A, internal fundamental, classic RC, no rack ears','units':'metres','cabinet_m':[W/1000,H/1000,D/1000],'source':'Operation Manual rev 2.11 p. ix; front and rear SRS photographs','caveat':'Functional reconstruction, panel layout estimated from planar photographs; no factory internals.'}
while len(buf)%4:buf.append(0)
G['buffers']=[{'byteLength':len(buf)}];js=json.dumps(G,separators=(',',':')).encode()
while len(js)%4:js+=b' '
(OUT/'sr860.glb').write_bytes(struct.pack('<4sII',b'glTF',2,28+len(buf)+len(js))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(buf),b'BIN\0')+buf)
print('GLB',len(G['nodes']),'nodes;',len(buf)+len(js)+28,'bytes')
