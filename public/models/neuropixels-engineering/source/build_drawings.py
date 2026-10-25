"""Assemble engineering plates from deterministic mesh renders and the CAD cross-section.
All dimensions are in real model units; only independent view magnification changes.
"""
from pathlib import Path
import json,base64,html,math
import cairosvg,fitz
from PIL import Image
R=Path(__file__).resolve().parents[1];D=R/'drawings';V=D/'renders'
meta=json.loads((V/'projection-metadata.json').read_text())
W,H=2800,1980
PAPER='#f5f1e6';INK='#242722';MUTED='#777264';RULE='#b9b19f';ACCENT='#a08b60'
class Sheet:
 def __init__(self,page,title,subtitle):
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',f'<rect width="{W}" height="{H}" fill="{PAPER}"/>', '<defs><pattern id="hatch" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M0,15 L15,0" stroke="#93958e" stroke-width=".7"/></pattern></defs>']
  self.rect(35,35,2730,1910,fill='none',stroke=INK,sw=1.2);self.rect(53,53,2694,1874,fill='none',stroke=RULE,sw=.8)
  for i in range(7):
   x=53+i*2694/6
   self.line(x,35,x,53,INK);self.line(x,1927,x,1945,INK)
   if i<6:self.text(x+2694/12,48,chr(65+i),15,anchor='middle',font='sans')
  for i in range(5):
   y=53+i*1874/4;self.line(35,y,53,y,INK);self.line(2747,y,2765,y,INK)
   if i<4:self.text(44,y+1874/8,str(i+1),14,anchor='middle',font='sans')
  self.text(86,104,'BUILDTHESIMULATION / NEURAL INTERFACE DRAWING SERIES',16,font='sans',tracking=3.2,color=MUTED)
  self.text(84,169,title,57,font='serif')
  self.text(88,207,subtitle,22,font='sans',color=MUTED,tracking=1.0)
  self.text(2706,108,'NPX–001',28,anchor='end',font='sans',tracking=2)
  self.text(2706,149,f'REV 01   /   SHEET {page:02d} OF 02',18,anchor='end',font='sans')
  self.text(2706,185,'26 OCTOBER' if False else '25 OCTOBER 2026',17,anchor='end',font='sans',color=MUTED)
  self.line(53,235,2747,235,INK,1.2)
 def line(self,x1,y1,x2,y2,color=RULE,sw=1):self.s.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{sw}"/>')
 def rect(self,x,y,w,h,fill='none',stroke=RULE,sw=1):self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
 def text(self,x,y,txt,size=20,color=INK,font='serif',anchor='start',tracking=None,weight='normal'):
  family='Georgia, Times New Roman, serif' if font=='serif' else 'Arial, Helvetica, sans-serif'
  self.s.append(f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}"'+(f' letter-spacing="{tracking}"' if tracking is not None else '')+'>'+html.escape(str(txt))+'</text>')
 def image(self,name,x,y,w,h):
  data=base64.b64encode((V/f'{name}.png').read_bytes()).decode()
  self.s.append(f'<image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="data:image/png;base64,{data}"/>')
  def point(key):
   xx,yy=meta[name]['projected'][key];ow,oh=meta[name]['size'];return(x+xx/ow*w,y+yy/oh*h)
  return point
 def label(self,x,y,letter,title,sub=None):
  self.text(x,y,letter,24,font='sans');self.text(x+46,y,title,23,font='serif')
  if sub:self.text(x+46,y+31,sub,16,font='sans',color=MUTED)
 def dim(self,a,b,label,offset=30,size=18):
  dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
  if length<1:return
  u=(dx/length,dy/length);n=(-u[1],u[0]);aa=(a[0]+n[0]*offset,a[1]+n[1]*offset);bb=(b[0]+n[0]*offset,b[1]+n[1]*offset)
  self.line(*a,aa[0]+n[0]*7,aa[1]+n[1]*7,MUTED,.8);self.line(*b,bb[0]+n[0]*7,bb[1]+n[1]*7,MUTED,.8);self.line(*aa,*bb,MUTED,1.)
  for p,sgn in [(aa,1),(bb,-1)]:
   q=(p[0]+u[0]*sgn*8+n[0]*3,p[1]+u[1]*sgn*8+n[1]*3);r=(p[0]+u[0]*sgn*8-n[0]*3,p[1]+u[1]*sgn*8-n[1]*3)
   self.s.append(f'<path d="M{p[0]},{p[1]} L{q[0]},{q[1]} L{r[0]},{r[1]} Z" fill="{MUTED}"/>')
  x=(aa[0]+bb[0])/2+n[0]*14;y=(aa[1]+bb[1])/2+n[1]*14
  # Paper underlay keeps dimension numerals legible.
  self.rect(x-len(label)*size*.29,y-size*.80,len(label)*size*.58,size*1.12,fill=PAPER,stroke='none')
  self.text(x,y,label,size,font='sans',anchor='middle')
 def leader(self,p,elbow,end,lines,size=19):
  self.line(*p,*elbow,MUTED,.8);self.line(*elbow,*end,MUTED,.8)
  self.s.append(f'<circle cx="{p[0]}" cy="{p[1]}" r="2.5" fill="{MUTED}"/>')
  for i,line in enumerate(lines):self.text(end[0]+8,end[1]+i*(size+6)-4,line,size)
 def scalebar(self,x,y,length,label):
  self.line(x,y,x+length,y,INK,1.6);self.line(x,y-6,x,y+2,INK,1.4);self.line(x+length,y-6,x+length,y+2,INK,1.4);self.text(x+length/2,y-13,label,15,font='sans',anchor='middle')
 def finish(self,name):
  self.s.append('</svg>');txt=''.join(self.s);(D/f'{name}.svg').write_text(txt)
  cairosvg.svg2png(bytestring=txt.encode(),write_to=str(D/f'{name}.png'))
  cairosvg.svg2pdf(bytestring=txt.encode(),write_to=str(D/f'{name}.pdf'),output_width=420*96/25.4,output_height=297*96/25.4)

s=Sheet(1,'NEUROPIXELS 1.0','MULTIVIEW 3D ENGINEERING STUDY / DOCUMENTED SHANK + ILLUSTRATION-DERIVED HEAD')
# Main isometric, then annotations so they remain vector-sharp.
p=s.image('isometric',170,280,930,1317.5)
s.label(88,286,'A','Isometric reconstruction','True aspect ratio; no shank thickening')
# Restrained compact specification table.
s.text(88,380,'DOCUMENTED NOMINALS',18,font='sans',tracking=1.3)
rows=[('Shank length','10.000 mm'),('Shank width','70 µm'),('Shank thickness','24 µm'),('Tip length','175 µm'),('Recording sites','960'),('Recording channels','384'),('Site footprint','12 × 12 µm'),('Row / column pitch','20 / 16 µm'),('Contact material','Porous TiN')]
for i,(a,b) in enumerate(rows):
 y=423+i*41;s.line(88,y+12,388,y+12,RULE,.7);s.text(88,y,a,17);s.text(388,y,b,17,anchor='end')
s.text(88,860,'MODEL STATUS',16,font='sans',tracking=1.3)
for i,t in enumerate(['Head outline, pad layout and gold', 'routing reproduce the supplied', 'illustration. They are not a verified', 'Neuropixels production connector.']):s.text(88,895+28*i,t,18,color=MUTED)
s.dim(p('tip'),p('shank_proximal'),'10.000 mm',-62,20)
s.leader(p('gold_fingers'),(1028,374),(1038,374),['Concept','gold contacts'],18)
s.leader(p('mid_shank'),(877,1070),(1015,1070),['960 site','instances'],18)
s.scalebar(105,1540,1317.5/14.9*2,'2 mm')
# Right-hand panel rules and views.
s.line(1200,235,1200,1660);s.line(1680,235,1680,965);s.line(1995,235,1995,965);s.line(1200,965,2747,965);s.line(1995,965,1995,1660)
pf=s.image('front',1300,330,229.4,590)
s.label(1230,286,'B','Front elevation','Orthographic; concept head')
s.dim(pf('tip'),pf('shank_proximal'),'10 mm',-66,17)
s.scalebar(1240,932,590/14.6*2,'2 mm')
ps=s.image('side',1725,330,170.4,590)
s.label(1707,286,'C','Side elevation','Orthographic')
s.scalebar(1730,932,590/14.6*2,'2 mm')
pt=s.image('tip',2048,325,620,589) # intentional independent viewport fit uses actual projection scaling below
# Preserve image proportions: use 465x589 rather than nonuniform distortion.
s.s.pop();pt=s.image('tip',2118,325,465,589)
s.label(2024,286,'D','Distal tip','Chisel + reference electrode')
s.dim(pt('tip_base_left'),pt('tip_base_right'),'70 µm',-29,17)
s.dim(pt('tip'),(pt('tip')[0]+pt('tip_base_right')[0]-pt('tip_base_left')[0],pt('tip')[1]),'',0,1) if False else None
# Tip length uses base midpoint to tip, independent of the reference face outline.
bmid=((pt('tip_base_left')[0]+pt('tip_base_right')[0])/2,(pt('tip_base_left')[1]+pt('tip_base_right')[1])/2)
s.dim(pt('tip'),bmid,'175 µm',-85,18)
s.scalebar(2620,923,589/.36*.05,'50 µm')
pa=s.image('array',1295,1090,600,520)
s.label(1230,1014,'E','Electrode-array detail','Four staggered column positions / two sites per row')
s.dim(pa('array_left'),pa('array_right'),'70 µm',-24,18)
s.dim(pa('first_site_left'),pa('first_site_right'),'12 µm',22,17)
s.scalebar(1250,1625,520/.135*.020,'20 µm')
# F: CAD section. 5 pixels per um keeps 70:24 exact; no fabricated layer stack.
s.label(2024,1014,'F','Transverse section','Outer envelope from the exported CAD solid')
for i,t in enumerate(['The cut is through a populated row.', 'No unverified internal stack is drawn.', 'Surface coatings are labeled, not thickened.']):s.text(2070,1110+31*i,t,19,color=MUTED)
cad=json.loads((R/'validation/cad-checks.json').read_text());x,y=2180,1290;w=cad['bbox_mm'][0]*5000;h=cad['bbox_mm'][2]*5000
s.rect(x,y,w,h,fill='#d9d8cf',stroke=INK,sw=1.5);s.rect(x,y,w,h,fill='url(#hatch)',stroke='none')
# Measured 12 um contact footprints at this assumed origin; thickness not dimensioned.
for cx in [-24,8]:s.rect(x+(cx+35-6)*5,y-1.2,60,1.2,fill='#807f70',stroke='none')
s.line(x,y,x+w,y,'#777d82',2.2);s.line(x,y+h,x+w,y+h,'#999fa2',1.3)
s.dim((x,y+h),(x+w,y+h),'70 µm',35,20);s.dim((x+w,y),(x+w,y+h),'24 µm',-53,20)
s.leader((x+100,y),(2100,1220),(2110,1220),['Si₃N₄ front surface; TiN contacts'],17)
s.text(2070,1530,'Silicon / silicon-oxide sidewall; SiO₂ back surface.',18)
s.text(2070,1570,'Contact and coating thicknesses are not verified.',17,color=MUTED)
s.scalebar(2080,1625,100,'20 µm')
# Notes and title block.
s.line(53,1660,2747,1660,INK,1.2);s.line(1200,1660,1200,1927);s.line(1900,1660,1900,1927)
s.text(87,1704,'MODEL NOTES',18,font='sans',tracking=1.4)
notes=['01  First site centre = 200 µm from tip: assumed absolute origin; not a hardware channel map.',
'02  Straight 175 µm taper gives 22.62° included angle. The datasheet angle is approximate.',
'03  Slot dimensions, relief and pore morphology are illustrative; no measured porosity is claimed.',
'04  All shaded views use the delivered meshes. Each detail has its own scale bar.',
'05  No internal CMOS routing, tolerances, electrical function or fabrication readiness is implied.']
for i,t in enumerate(notes):s.text(87,1743+i*32,t,18)
s.text(1230,1704,'EVIDENCE',18,font='sans',tracking=1.4)
for i,t in enumerate(['IMEC / Neuropixels 1.0 manufacturer datasheet', '13 February 2020, pp. 3–4: dimensions, materials, SEM.', 'Official Neuropixels support and product imagery.', 'Full source URLs and assumptions: specification.json.', 'An independent reconstruction; not manufacturer CAD.']):s.text(1230,1743+i*32,t,17,color=MUTED)
s.text(1930,1704,'NEUROPIXELS 1.0 / ENGINEERING REFERENCE',21)
for yy in [1730,1790,1850]:s.line(1900,yy,2747,yy)
s.text(1930,1766,'CATEGORY  /  MEMS • NEURAL INTERFACE',17,font='sans');s.text(1930,1826,'UNITS  /  mm & µm       PROJECTION  /  ORTHOGRAPHIC',17,font='sans')
s.text(1930,1887,'REFERENCE — NOT FOR FABRICATION',20,font='sans',tracking=.8)
s.finish('neuropixels-engineering-sheet')
# Companion plate shows the full reference assembly and actual high-resolution texture model.
s=Sheet(2,'SURFACE & PACKAGE STUDY','NEUROPIXELS 1.0 / REFERENCE ASSEMBLY AND PROCEDURAL CONTACT DETAIL')
s.line(875,235,875,1660);s.line(1760,235,1760,1660)
s.label(88,286,'G','Reference assembly','Published envelopes; reconstructed local geometry')
p=s.image('reference',86,350,750,1250)
s.scalebar(106,1606,1250/84*10,'10 mm')
s.text(106,341,'Flex shown at its 39.5 mm developed length.',18,color=MUTED)
s.label(907,286,'H','Proximal package','Silicon cap, epoxy and populated flex base')
p=s.image('reference-head',967,350,696,1146)
s.scalebar(1545,1620,1146/27*2,'2 mm')
for i,t in enumerate(['6.2 mm probe-base width / 7.2 mm SMD-base width.', '3.9 × 8.5 mm silicon cap envelope.', 'Component and conductor layout is illustrative.']):s.text(910,1524+i*29,t,18,color=MUTED)
s.label(1793,286,'I','Porous TiN surface','High-resolution standalone contact model')
p=s.image('electrode',1830,350,840,770.82)
s.dim(p('contact_ll'),p('contact_lr'),'12 µm',35,20);s.dim(p('contact_lr'),p('contact_ur'),'12 µm',-38,20)
s.scalebar(1822,1146,770.82/.018*.002,'2 µm')
s.text(1805,1235,'WHAT THE MODEL RESOLVES',18,font='sans',tracking=1.5)
for i,t in enumerate(['Five SEM-inspired grooves are explicitly modeled.', 'Fine surface relief is procedural, with a fixed seed.', 'The detail contact contains 52,482 triangles.', 'An embedded normal map adds finer granularity.', '', 'Pore size, density, shape and layer thickness are', 'not measured. This is not an electrochemical', 'surface-area or impedance model.']):s.text(1805,1280+i*34,t,22,color=MUTED)
s.line(53,1660,2747,1660,INK,1.2);s.line(1760,1660,1760,1927)
s.text(87,1704,'MODEL VARIANTS',18,font='sans',tracking=1.4)
for i,t in enumerate(['Drawing-matched study: reproduces the supplied illustration’s head outline and gold fanout.',
'Reference assembly: uses published package, flex and silicon-cap envelope dimensions.',
'Both share the same 10 mm shank, 960-site lattice and reconstructed tip reference electrode.',
'Gold-coloured conductors represent appearance, not a verified metallurgy stack or netlist.',
'The 45-contact flex terminal is inferred from the documented mating interface; pitch is assumed.']):s.text(87,1743+i*32,t,21)
s.text(1795,1708,'DELIVERABLES',18,font='sans',tracking=1.5)
for i,t in enumerate(['GLB models in metres / editable builder in millimetres', 'STEP nominal shank and square contact footprints', 'Offline viewer / coordinates CSV / validation results', 'NOT FOR FABRICATION OR IMPLANTATION']):s.text(1795,1755+i*40,t,21)
s.finish('neuropixels-surface-package-sheet')
# Combine two landscape plates. Cairo uses 72/96 conversion; page aspect is A3-like.
combined=fitz.open()
for name in ['neuropixels-engineering-sheet','neuropixels-surface-package-sheet']:
 doc=fitz.open(D/f'{name}.pdf');combined.insert_pdf(doc);doc.close()
combined.set_metadata({'title':'Neuropixels 1.0 — model-derived engineering plates','author':'BuildTheSimulation','subject':'Reference reconstruction, not for fabrication','keywords':'Neuropixels 1.0, GLB, CAD, reconstruction'})
combined.save(D/'neuropixels-technical-drawings.pdf');combined.close()
# A compact image montage is useful when reviewing the actual model in chat.
from PIL import ImageDraw,ImageFont
im=Image.new('RGB',(1800,1200),PAPER);dr=ImageDraw.Draw(im)
font='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf';sans='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
f=ImageFont.truetype(font,41);sm=ImageFont.truetype(sans,16);lab=ImageFont.truetype(sans,21)
dr.text((55,35),'NEUROPIXELS 1.0',fill=INK,font=f);dr.text((55,99),'ACTUAL 3D MODEL  /  DRAWING-MATCHED STUDY + DOCUMENTED SHANK',fill=MUTED,font=sm)
def paste(name,box):
 img=Image.open(V/f'{name}.png').convert('RGB');img.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);im.paste(img,(box[0]+(box[2]-img.width)//2,box[1]+(box[3]-img.height)//2))
paste('isometric',(45,150,810,975));paste('study-head',(900,175,420,470));paste('tip',(1340,175,400,470));paste('electrode',(970,710,680,390))
dr.line((870,160,870,1135),fill=RULE,width=1);dr.line((920,668,1745,668),fill=RULE,width=1)
dr.text((70,1128),'01 / TRUE PHYSICAL PROPORTIONS',fill=INK,font=lab);dr.text((920,153),'02 / CONCEPT CONNECTOR',fill=INK,font=sm);dr.text((1360,153),'03 / TIP + SITES',fill=INK,font=sm);dr.text((920,692),'04 / PROCEDURAL PORE MICRODETAIL',fill=INK,font=sm)
dr.text((920,1128),'Illustrative head and pores; not manufacturer CAD.',fill=MUTED,font=sm)
im.save(D/'neuropixels-model-preview.png')
print('Wrote two SVG / PNG plates, two-page PDF, and model preview.')
