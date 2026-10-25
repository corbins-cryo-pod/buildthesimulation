"""Neuropixels 1.0 reference / illustration-study reconstruction.
Units in this builder: millimetres. glTF scene root converts mm to metres.
Published dimensions are separate from visual reconstruction assumptions.
Run: python source/build_model.py (numpy, scipy, Pillow required).
"""
from pathlib import Path
import json, math, struct, base64, io, csv
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'models'; OUT.mkdir(exist_ok=True)
SEED = 1010960
SOURCES = [
 {'id':'IMEC-2020','title':'Neuropixels 1.0 fully-integrated CMOS digital neural probe; imec datasheet, 13 February 2020', 'url':'https://www.bio-signal.com/static/upload/file/20240927/1727441617543747.pdf','pages':'3: shank, sites, SEM; 4: package and flex','origin':'Manufacturer-authored document, distributor-hosted copy'},
 {'id':'NP-SUPPORT','title':'Neuropixels official support and design files','url':'https://www.neuropixels.org/support'},
 {'id':'NP-SEM','title':'Manufacturer SEM of Neuropixels 1.0 tip','url':'https://www.neuropixels.org/probe1-0'}
]
SPEC = {
 'name':'Neuropixels 1.0 reference reconstruction', 'revision':'BTS-NPX1-R1', 'date':'2026-10-25',
 'coordinate_system':'X transverse; Y proximal from distal tip; Z toward recording face. Builder mm; GLB metres.',
 'documented_nominal': {'shank_length_mm':10., 'shank_width_mm':.070, 'shank_thickness_mm':.024,
 'tip_length_mm':.175, 'site_size_mm':.012, 'site_count':960, 'simultaneous_channels':384,
 'row_pitch_mm':.020, 'column_pitch_mm':.016, 'probe_base_width_mm':6.2, 'probe_base_length_mm':10.7,
 'smd_base_width_mm':7.2, 'smd_base_length_mm':12.2, 'silicon_cap_width_mm':3.9, 'silicon_cap_length_mm':8.5,
 'package_thickness_approx_mm':1.2,'flex_width_mm':4.3, 'flex_length_mm':39.5,'flex_thickness_mm':.080,
 'mating_zif_contact_count':45},
 'documented_materials': {'sites':'porous TiN', 'front':'silicon nitride', 'back':'silicon dioxide', 'sidewall':'silicon / silicon dioxide', 'black_epoxy':'EPO-TEK H70E'},
 'reconstruction_assumptions': {
 'first_site_center_from_tip_mm':.200, 'lateral_site_centers_mm':[-.024,-.008,.008,.024],
 'site_numbering':'geometric row order, NOT an electrical channel map',
 'tip_profile':'symmetric straight-sided 175 um taper, 22.62 deg derived included angle; datasheet ~20 deg is approximate',
 'electrode_relief_mm':.00024, 'slot_count_per_site':5, 'slot_width_mm':.00050, 'slot_length_mm':.0086,
 'slot_depth_mm':.00014, 'slot_geometry_status':'SEM-inspired. Slot dimensions are NOT published metrology.',
 'porosity':'Seeded procedural relief and normal texture, NOT measured pore dimensions, porosity, or electrochemistry.',
 'tip_reference_outline':'SEM-inspired, unmeasured outline',
 'assembly':'Published envelope dimensions; local outlines, component placements, layer thicknesses, trace routing and terminal outline reconstructed.',
 'flex_bend_deg':18.0, 'terminal_pitch_mm':.20,'terminal_width_mm':9.4,
 'gold':'Gold-coloured appearance, not a verified metallization stack or conductor netlist.',
 'illustration_head':'Separate drawing-matched concept head. Outline, pad layout and traces are NOT verified Neuropixels hardware.'},
 'limitations':['Reference and visualisation only; not for fabrication or implantation.', 'No proprietary CMOS layout or internal layer stack reconstructed.', 'No electrical or electrochemical simulation.', 'No measurement of manufacturing tolerances.', 'A reconstruction, not a manufacturer CAD model or a photogrammetric scan.'],
 'sources':SOURCES
}
(ROOT/'specification.json').write_text(json.dumps(SPEC,indent=2))

# Materials: sRGB swatches converted to linear glTF baseColorFactors.
def linear_hex(h):
    rgb=np.array([int(h[i:i+2],16)/255 for i in (0,2,4)])
    return np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4).tolist()+[1.]
MATDEF=[
 ('silicon', '6F7782', .65,.27),('nitride','899095',.32,.33),('oxide','8F9296',.15,.41),
 ('TiN','ADAD9D',.70,.48),('gold','DDB769',.92,.25),('epoxy','151A20',.05,.49),
 ('circuit_board','243940',.18,.53),('polyimide','9A5628',.08,.46),('solder','B6B8B8',.88,.29),
 ('ceramic','A19478',.14,.47),('silicon_cap','697789',.78,.17),('trace_dark','79552E',.72,.34),
 ('terminal_stiffener','672B35',.12,.43),('markings','D2D3C9',.0,.65),('slot_dark','55594F',.4,.62),('TiN_reference','8A8D80',.60,.42)]
MATERIALS=[{'name':n,'pbrMetallicRoughness':{'baseColorFactor':linear_hex(h),'metallicFactor':m,'roughnessFactor':r},'doubleSided':False} for n,h,m,r in MATDEF]
MI={m[0]:i for i,m in enumerate(MATDEF)}

# Texture relief: synthetic TiN microgranularity, not SEM photogrammetry.
rng=np.random.default_rng(SEED); N=512
noise=gaussian_filter(rng.normal(size=(N,N)),.65)
noise=(noise-noise.min())/(noise.max()-noise.min())
pits=np.zeros((N,N)); xy=rng.integers(0,N,(9000,2)); pits[xy[:,0],xy[:,1]]=rng.uniform(.2,1.,9000)
pits=gaussian_filter(pits,.72); height=.35*noise-2.3*pits
height=gaussian_filter(height,.55)
gy,gx=np.gradient(height); normals=np.stack([-gx*6.,-gy*6.,np.ones_like(gx)],-1)
normals/=np.linalg.norm(normals,axis=2,keepdims=True)
texim=Image.fromarray(np.uint8((normals*.5+.5)*255),'RGB'); bio=io.BytesIO();texim.save(bio,format='PNG'); NORMAL_PNG=bio.getvalue()
texim.save(ROOT/'models'/'tin-procedural-normal.png')
MATERIALS[MI['TiN']]['normalTexture']={'index':0,'scale':.65}
MATERIALS[MI['TiN_reference']]['normalTexture']={'index':0,'scale':.45}
# Ambient-occlusion estimate for the five reconstructed grooves; not a painted material pattern.
u=np.linspace(-.006,.006,N); xx,yy=np.meshgrid(u,u); groove=np.zeros_like(xx)
for cx in np.linspace(-.004,.004,5):
    gx=1/(1+np.exp(np.clip((np.abs(xx-cx)-.00025)/.000045,-60,60)))
    gy=1/(1+np.exp(np.clip((np.abs(yy)-.0043)/.00008,-60,60)))
    groove=np.maximum(groove,gx*gy)
ao=np.uint8(np.clip(1-.78*groove,0,1)*255)
aoim=Image.fromarray(ao,'L').convert('RGB'); bio=io.BytesIO();aoim.save(bio,format='PNG'); AO_PNG=bio.getvalue()
aoim.save(ROOT/'models'/'tin-groove-occlusion.png')
MATERIALS[MI['TiN']]['occlusionTexture']={'index':1,'strength':.78}


class Mesh:
    def __init__(self,name,mat):self.name=name;self.mat=MI.get(mat,mat);self.v=[];self.n=[];self.uv=[];self.f=[]
    def face(self,coords,normal=None,uv=None):
        c=np.asarray(coords,dtype=float); b=len(self.v)
        if normal is None:
            normal=np.cross(c[1]-c[0],c[2]-c[0]);normal=normal/np.linalg.norm(normal)
        self.v.extend(c.tolist());self.n.extend([list(normal)]*len(c));self.uv.extend(uv if uv is not None else [[0,0]]*len(c))
        for i in range(1,len(c)-1): self.f.append([b,b+i,b+i+1])
    def arrays(self):
        return np.asarray(self.v,np.float32),np.asarray(self.n,np.float32),np.asarray(self.uv,np.float32),np.asarray(self.f,np.uint32).reshape(-1)

MESHES=[]; NODES=[]
def reg(mesh):
    MESHES.append(mesh);return len(MESHES)-1

def node(name,mesh,group='common',confidence='reconstructed',translation=None,extras=None):
    d={'name':name,'mesh':mesh,'extras':{'group':group,'confidence':confidence,**(extras or {})}}
    if translation is not None:d['translation']=list(map(float,translation))
    NODES.append(d);return len(NODES)-1

def prism_mesh(name,points,z0,z1,mat):
    # Points must form a convex CCW polygon, except the outline study uses triangulation below.
    from shapely.geometry import Polygon
    from shapely.ops import triangulate
    pts=np.array(points,float); poly=Polygon(pts)
    if not poly.is_valid:raise ValueError(name+' invalid polygon')
    if not poly.exterior.is_ccw:pts=pts[::-1];poly=Polygon(pts)
    m=Mesh(name,mat)
    for t in triangulate(poly):
        if poly.covers(t):
            q=list(t.exterior.coords)[:3]
            # Shapely returns CCW triangles.
            m.face([[x,y,z1] for x,y in q],normal=[0,0,1],uv=[[x/.012,y/.012] if mat in ['TiN','TiN_reference'] else [x,y] for x,y in q])
            m.face([[x,y,z0] for x,y in q[::-1]],normal=[0,0,-1])
    for i,p in enumerate(pts):
        q=pts[(i+1)%len(pts)];m.face([[*p,z0],[*q,z0],[*q,z1],[*p,z1]])
    return m

def poly(name,p,z0,z1,mat,group='common',conf='reconstructed'):
    return node(name,reg(prism_mesh(name,p,z0,z1,mat)),group,conf)

def box(name,x,y,z,w,l,h,mat,group='common',conf='reconstructed'):
    return poly(name,[(x-w/2,y-l/2),(x+w/2,y-l/2),(x+w/2,y+l/2),(x-w/2,y+l/2)],z-h/2,z+h/2,mat,group,conf)

def roundedrect(x,y,w,l,r,n=5):
    p=[]
    for cx,cy,a in [(x+w/2-r,y+l/2-r,0),(x-w/2+r,y+l/2-r,90),(x-w/2+r,y-l/2+r,180),(x+w/2-r,y-l/2+r,270)]:
        for ang in np.linspace(a,a+90,n):p.append((cx+r*math.cos(math.radians(ang)),cy+r*math.sin(math.radians(ang))))
    return p

def rounded(name,x,y,z,w,l,h,r,mat,g='common',conf='reconstructed'):
    return poly(name,roundedrect(x,y,w,l,r),z-h/2,z+h/2,mat,g,conf)

def strip(name,points,width,z,h,mat,g='common',conf='reconstructed'):
    from shapely.geometry import LineString
    p=LineString(points).buffer(width/2,cap_style=2,join_style=2)
    return poly(name,list(p.exterior.coords)[:-1],z,z+h,mat,g,conf)

# Exactly dimensioned shank, split exterior face materials, no invented layer thicknesses.
outline=[(-.035,.175),(0,0),(.035,.175),(.035,10),(-.035,10)]
sm=prism_mesh('Silicon shank — 10000 × 70 × 24 µm',outline,-.012,.012,'silicon')
# Separate material groups without layering the actual total thickness.
v,n,uv,f=sm.arrays();f=f.reshape(-1,3)
for label,normaltest,mat in [('front',lambda n:n[:,2]>.9,'nitride'),('back',lambda n:n[:,2]<-.9,'oxide'),('sidewalls',lambda n:np.abs(n[:,2])<.1,'silicon')]:
    mm=Mesh('Shank '+label,mat)
    for face in f:
        if normaltest(n[face]).all():mm.face(v[face],n[face[0]],uv[face].tolist())
    node(mm.name,reg(mm),'common','documented',extras={'envelope_mm':[.070,10.,.024]})

# Semiconductor top texture with five SEM-inspired slots; realistic micro-relief is procedural.
def contact_mesh(res=28,detail=False):
    m=Mesh('TiN recording site '+('microdetail' if detail else 'shared'),'TiN')
    xs=np.linspace(-.006,.006,res+1);ys=np.linspace(-.006,.006,res+1);xx,yy=np.meshgrid(xs,ys)
    xr=(xx+.006)/.012;yr=(yy+.006)/.012
    # Five slots visible in the manufacturer SEM. Their local dimensions are assumptions.
    groove=np.zeros_like(xx)
    for cx in np.linspace(-.004,.004,5):
        ax=np.abs(xx-cx);ay=np.abs(yy)
        inside_x=1/(1+np.exp(np.clip((ax-.00025)/.000045,-60,60)))
        inside_y=1/(1+np.exp(np.clip((ay-.0043)/.00008,-60,60)))
        groove=np.maximum(groove,inside_x*inside_y)
    grain=.000018*np.sin(xx*2.2e6+np.cos(yy*1.3e6))*np.cos(yy*1.7e6+xx*4.1e5)
    if detail:
        rr=np.random.default_rng(SEED+1); yy0,xx0=np.indices(xx.shape)
        impulses=np.zeros_like(xx); idx=rr.integers(0,res+1,(1900,2));impulses[idx[:,0],idx[:,1]]=rr.uniform(.3,1.,1900)
        grain-=gaussian_filter(impulses,.65)*.0001
    zz=.00024-.00014*groove+grain*(1-.75*groove)
    dzy,dzx=np.gradient(zz,ys,xs);nn=np.stack([-dzx,-dzy,np.ones_like(zz)],-1);nn/=np.linalg.norm(nn,axis=2,keepdims=True)
    m.v=np.stack([xx,yy,zz],-1).reshape(-1,3).tolist();m.n=nn.reshape(-1,3).tolist();m.uv=np.stack([xr,yr],-1).reshape(-1,2).tolist()
    for j in range(res):
        for i in range(res):
            a=j*(res+1)+i;b=a+1;c=a+res+1;d=c+1;m.f.extend([[a,b,d],[a,d,c]])
    # Closed walls and base; nominal square contact footprint remains exactly 12 um.
    for side in [list(zip(xx[0],yy[0],zz[0])),list(zip(xx[:,-1],yy[:,-1],zz[:,-1])),list(zip(xx[-1,::-1],yy[-1,::-1],zz[-1,::-1])),list(zip(xx[::-1,0],yy[::-1,0],zz[::-1,0]))]:
        for p,q in zip(side[:-1],side[1:]):m.face([[p[0],p[1],0],[q[0],q[1],0],q,p])
    m.face([[-.006,.006,0],[.006,.006,0],[.006,-.006,0],[-.006,-.006,0]],[0,0,-1])
    return m

site_mesh=reg(contact_mesh())
SITE_ROWS=[]
for row in range(480):
    columns=(-.024,.008) if row%2==0 else (-.008,.024)
    for col,x in enumerate(columns):
        sid=len(SITE_ROWS);y=.200+row*.020
        node(f'Site {sid:03d}',site_mesh,'common','documented_pattern_assumed_origin',(x,y,.012),{'site_id':sid,'row':row,'footprint_um':[12,12]})
        SITE_ROWS.append({'site_id':sid,'row':row,'x_um':x*1000,'y_um':y*1000,'z_um':12.0,'size_um':12.0})
with (ROOT/'electrode-coordinates.csv').open('w',newline='') as ff:
    writer=csv.DictWriter(ff,fieldnames=SITE_ROWS[0].keys());writer.writeheader();writer.writerows(SITE_ROWS)
# Large reference face at distal tip, absent from the generated illustration.
poly('Tip reference electrode — SEM-inspired outline',[(-.027,.169),(0,.027),(.027,.169)],.01202,.01218,'TiN_reference','common','SEM_reconstruction')
# Edge rails are thin visible front-side lines, decorative interpretation not exposed metal routing.
for s in [-1,1]:
    strip('Passivation border',[(s*.032,.180),(s*.032,9.92)],.0006,.012005,.000025,'oxide','common','visual_surface')

# Drawing-matched head: explicitly a concept, not the real manufacturer's packaging.
study=[(-.035,10),(-.14,10.22),(-.16,10.62),(-.95,11.32),(-.95,12.28),(-.62,12.28),(-.62,13.10),(.62,13.10),(.62,12.28),(.95,12.28),(.95,11.32),(.16,10.62),(.14,10.22),(.035,10)]
poly('Drawing-derived head outline',study,-.06,.06,'silicon','study','illustration_concept')
inner=[(x*.95,10+(y-10)*.975) for x,y in study]
poly('Drawing-derived head front dielectric',inner,.06001,.062,'nitride','study','illustration_concept')
for i in range(18):
    x=(i-8.5)*.063
    rounded(f'Concept gold finger {i+1}',x,12.78,.068,.038,.48,.012,.005,'gold','study','illustration_concept')
    xx=(i-8.5)*.0047
    strip(f'Concept fanout trace {i+1}',[(x,12.53),(x,12.16),(x*.69,11.86),(xx,11.13),(xx,10.68),(xx*.40,10.25)],.008,.064,.003,'gold','study','illustration_concept')
for s in [-1,1]:
    for i in range(4):
        x=s*(.39+i*.13)
        rounded(f'Concept lateral pad {s} {i}',x,11.97,.069,.09,.38,.014,.008,'gold','study','illustration_concept')
        strip(f'Concept lateral interconnect {s} {i}',[(x,11.78),(x,11.55),(s*(.025+i*.015),10.96),(s*(.015+i*.006),10.55)],.009,.064,.003,'gold','study','illustration_concept')

# Production-style package reconstruction. Published envelopes; local packaging is inferred.
g='reference'
rounded('Probe base — 6.2 × 10.7 mm',0,15.35,-.30,6.2,10.7,.08,.16,'polyimide',g,'documented_envelope')
rounded('Base backing epoxy',0,15.35,.19,6.05,10.55,.90,.18,'epoxy',g)
rounded('Silicon spacer/cap envelope — 3.9 × 8.5 mm',0,15.32,.69,3.9,8.5,.34,.08,'silicon_cap',g,'documented_envelope')
# A bevelled polished upper face and its edge highlights.
rounded('Cap top polished face',0,15.32,.862,3.75,8.35,.006,.06,'silicon_cap',g)
for s in [-1,1]:
    rounded('Epoxy cap edge',s*2.14,15.3,.36,.43,9.1,.44,.11,'epoxy',g)
    for k in range(3):
        box('Base gold pad',s*2.65,11.2+k*3.4,.263,.38,.57,.025,'gold',g)
# Short reconstructed socket between shank and the wider base.
poly('Shank-to-package shoulder',[(-.035,9.99),(.035,9.99),(.48,10.20),(.48,10.72),(-.48,10.72),(-.48,10.20)],-.012,.015,'silicon',g)
rounded('SMD base — 7.2 × 12.2 mm',0,26.8,-.18,7.2,12.2,.08,.22,'polyimide',g,'documented_envelope')
rounded('SMD dark conformal surface',0,26.65,-.105,7.05,11.90,.06,.20,'circuit_board',g)
for k,x in enumerate(np.linspace(-2.7,2.7,13)):
    strip(f'PCB gold route {k}',[(x,32.65),(x,30.6-abs(x)*.3),(x*.80,29.8),(x*.80,24.4),(x*.55,21.25)],.055,-.071,.012,'gold',g)
# Representative integrated packages with soldered leads.
def ic(name,x,y,w,l,pins):
    rounded(name,x,y,.19,w,l,.50,.09,'epoxy',g)
    for s in [-1,1]:
        for i in range(pins):
            py=y+(i-(pins-1)/2)*(l*.85/max(pins-1,1))
            box(name+' lead',x+s*(w/2+.15),py,.06,.33,.16,.14,'solder',g)
    box(name+' orientation stripe',x-w*.25,y+l*.31,.444,.22,.06,.010,'markings',g)
ic('Reconstructed central integrated circuit',-.25,27.35,2.2,3.1,7)
ic('Reconstructed EEPROM package',1.75,23.9,1.1,1.9,4)
ic('Reconstructed reference supply package',-1.65,23.5,1.2,1.6,3)
for i,(x,y,w,l) in enumerate([(-2.7,29.9,.6,1.0),(-2.7,28.4,.6,.9),(-2.7,26.5,.55,.85),(-2.7,25.1,.6,.95),(-.2,22.0,.6,.95),(.8,22.0,.5,.8),(2.7,26.0,.55,.8),(2.7,27.2,.55,.85),(2.7,28.7,.55,.85),(1.2,30.1,.6,.9),(0,30.3,.6,.9),(-1.25,30.4,.6,.9),(2.6,22,.6,.9)]):
    rounded(f'Passive component {i}',x,y,.095,w,l,.28,.05,'ceramic' if i%3 else 'epoxy',g)
    for s in [-1,1]:box('Passive end termination',x,y+s*l*.40,.11,w+.025,l*.21,.32,'solder',g)
for x in [-2.5,-.9,.9,2.5]:box('Flex-transition gold land',x,32.28,-.02,.48,.62,.05,'gold',g)
# Curved flex uses an exactly 39.5 mm centreline arc. Width flares only in its reconstructed terminal zone.
L=39.5;angle=math.radians(18);R=L/angle

def flex_coords(s,x,zoff=0):
    a=s/R
    return [x,32.9+R*math.sin(a)-zoff*math.sin(a),-.18+R*(1-math.cos(a))+zoff*math.cos(a)]

def flex_strip(name,x0,x1,s0,s1,z0,z1,mat,conf='reconstructed',flare=False,segments=90):
    m=Mesh(name,mat); ss=np.linspace(s0,s1,segments+1)
    def xx(x,s):return x*(1+(min(max(s-(L-5),0)/3,1))*(9.4/4.3-1)) if flare else x
    for a,b in zip(ss[:-1],ss[1:]):
        # Surface quads correctly oriented.
        m.face([flex_coords(a,xx(x0,a),z1),flex_coords(a,xx(x1,a),z1),flex_coords(b,xx(x1,b),z1),flex_coords(b,xx(x0,b),z1)])
        m.face([flex_coords(a,xx(x0,a),z0),flex_coords(b,xx(x0,b),z0),flex_coords(b,xx(x1,b),z0),flex_coords(a,xx(x1,a),z0)])
        m.face([flex_coords(a,xx(x0,a),z0),flex_coords(a,xx(x0,a),z1),flex_coords(b,xx(x0,b),z1),flex_coords(b,xx(x0,b),z0)])
        m.face([flex_coords(a,xx(x1,a),z0),flex_coords(b,xx(x1,b),z0),flex_coords(b,xx(x1,b),z1),flex_coords(a,xx(x1,a),z1)])
    m.face([flex_coords(s0,xx(x0,s0),z0),flex_coords(s0,xx(x1,s0),z0),flex_coords(s0,xx(x1,s0),z1),flex_coords(s0,xx(x0,s0),z1)])
    m.face([flex_coords(s1,xx(x0,s1),z0),flex_coords(s1,xx(x0,s1),z1),flex_coords(s1,xx(x1,s1),z1),flex_coords(s1,xx(x1,s1),z0)])
    return node(name,reg(m),'flex',conf)
flex_strip('Polyimide flex — 39.5 mm developed length',-2.15,2.15,0,L,-.04,.04,'polyimide','documented_envelope',True)
for i,x in enumerate(np.linspace(-1.85,1.85,9)):
    w=.12 if i in [0,8] else .065
    flex_strip(f'Flex gold-coloured conductor {i}',x-w/2,x+w/2,0,L-3.3,.041,.048,'gold',flare=False)
for i in range(45):
    x=(i-22)*.2
    flex_strip(f'Terminal contact {i+1:02d}',x-.065,x+.065,L-1.5,L-.12,.043,.055,'gold',segments=4)
flex_strip('Terminal stiffener (reconstructed)',-4.7,4.7,L-1.7,L,-.19,-.042,'terminal_stiffener',segments=5)
# External reference/ground pad pairs on flex. Count/position representative, not circuit documentation.
for s in [9,20,30]:
    for x in [-1.78,1.78]:flex_strip('REF / GND appearance pad',x-.17,x+.17,s,s+.8,.041,.057,'gold',segments=3)

# Single high-resolution electrode and a local substrate, useful for close-up re-use.
detailmesh=reg(contact_mesh(160,True))
detail_node={'name':'Porous TiN contact — illustrative microrelief','mesh':detailmesh,'extras':{'group':'detail','confidence':'procedural_morphology'}}

# Binary glTF serializer: shared meshes keep 960 detailed contacts compact.
def export_glb(path,selected,extra_mesh_nodes=None):
    nodes=[dict(n) for n in selected]+list(extra_mesh_nodes or [])
    use=sorted(set(n['mesh'] for n in nodes));remap={m:i for i,m in enumerate(use)}
    for n in nodes:n['mesh']=remap[n['mesh']]
    buf=bytearray();views=[];access=[];gmeshes=[]
    def append(data,target=None):
        while len(buf)%4:buf.append(0)
        offset=len(buf);buf.extend(data);d={'buffer':0,'byteOffset':offset,'byteLength':len(data)}
        if target:d['target']=target
        views.append(d);return len(views)-1
    def accessor(a,typ,component,target):
        a=np.ascontiguousarray(a); vi=append(a.tobytes(),target)
        d={'bufferView':vi,'byteOffset':0,'componentType':component,'count':len(a),'type':typ}
        if typ=='VEC3':d.update(min=a.min(axis=0).tolist(),max=a.max(axis=0).tolist())
        access.append(d);return len(access)-1
    for mi in use:
        m=MESHES[mi];v,n,uv,f=m.arrays()
        attrs={'POSITION':accessor(v,'VEC3',5126,34962),'NORMAL':accessor(n,'VEC3',5126,34962),'TEXCOORD_0':accessor(uv,'VEC2',5126,34962)}
        ii=accessor(f,'SCALAR',5125,34963)
        gmeshes.append({'name':m.name,'primitives':[{'attributes':attrs,'indices':ii,'material':m.mat}]})
    imageview=append(NORMAL_PNG);aoview=append(AO_PNG)
    root={'name':'Neuropixels reconstruction — millimetres to metres','scale':[.001,.001,.001],'children':list(range(1,len(nodes)+1)),'extras':{'units':'metres','source_units':'millimetres','status':'REFERENCE ONLY — NOT FOR FABRICATION','specification':SPEC}}
    scene={'asset':{'version':'2.0','generator':'BuildTheSimulation deterministic parametric reconstruction R1'},'scene':0,'scenes':[{'nodes':[0]}],
    'nodes':[root]+nodes,'meshes':gmeshes,'materials':MATERIALS,'buffers':[{'byteLength':len(buf)}],'bufferViews':views,'accessors':access,
    'images':[{'bufferView':imageview,'mimeType':'image/png'},{'bufferView':aoview,'mimeType':'image/png'}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'textures':[{'sampler':0,'source':0},{'sampler':0,'source':1}]}
    jb=json.dumps(scene,separators=(',',':'),ensure_ascii=False).encode();jb+=b' '*((-len(jb))%4);buf+=b'\x00'*((-len(buf))%4)
    total=12+8+len(jb)+8+len(buf)
    path.write_bytes(struct.pack('<III',0x46546C67,2,total)+struct.pack('<II',len(jb),0x4E4F534A)+jb+struct.pack('<II',len(buf),0x004E4942)+buf)
    return {'file':str(path.relative_to(ROOT)),'nodes':len(nodes),'meshes':len(gmeshes),'unique_triangles':int(sum(len(MESHES[m].f) for m in use)),'bytes':total}

common=[n for n in NODES if n['extras']['group']=='common']
study_nodes=common+[n for n in NODES if n['extras']['group']=='study']
ref_nodes=common+[n for n in NODES if n['extras']['group'] in ['reference','flex']]
reports=[]
reports.append(export_glb(OUT/'neuropixels-blueprint-study.glb',study_nodes))
reports.append(export_glb(OUT/'neuropixels-reference-assembly.glb',ref_nodes))
reports.append(export_glb(OUT/'neuropixels-shank.glb',common))
reports.append(export_glb(OUT/'neuropixels-electrode-detail.glb',[],[detail_node]))
(ROOT/'validation'/'mesh-build.json').write_text(json.dumps(reports,indent=2))
# Mesh arrays for the deterministic renderer and CAD exports, without duplicated electrode geometry.
np.savez_compressed(ROOT/'source'/'geometry.npz',**{f'{i}_{k}':a for i,m in enumerate(MESHES) for k,a in zip(['v','n','uv','f'],m.arrays())})
(ROOT/'source'/'scene.json').write_text(json.dumps({'nodes':NODES,'meshes':[{'name':m.name,'material':m.mat} for m in MESHES],'materials':MATERIALS},ensure_ascii=False))
print(json.dumps(reports,indent=2))
