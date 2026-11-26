"""Editable Nikon ECLIPSE Ts2-FL reconstruction. Blender 4.3.
Run: blender -b -P model-source.py
Add -- --plates to render four illustrations, or -- --blend for a native scene.
Blender mm coordinates here use +X operator right, +Y rear, +Z up. The glTF
exports metres, +Y up, +Z towards operator. The specimen axis is X=Z=0.
Reference: Nikon 2CE-MPJH-9 (2407), pp. 2–3 & 6–8. Stand shell profiles,
arm sections, fasteners, nosepiece tilt and accessory offsets are reconstructed
from drawings and photos. The amber operator plate is based on M700 E p. 2. These features have no manufacturer CAD or survey provenance.
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
mm = .001
rad = math.radians
def xyz(v): return Vector(tuple(mm*q for q in v))

def material(name,color,metal=0,rough=.38,alpha=1,emit=0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,alpha);m.use_nodes=True
    b=m.node_tree.nodes.get("Principled BSDF")
    for field,value in [("Base Color",(*color,1)),("Metallic",metal),("Roughness",rough),("Alpha",alpha)]:
        b.inputs[field].default_value=value
    if emit:
        b.inputs["Emission Color"].default_value=(*color,1)
        b.inputs["Emission Strength"].default_value=emit
    if alpha<1:m.surface_render_method="BLENDED"
    return m

ivory=material("Porcelain white enamel",(.76,.77,.75),.12,.30)
silver=material("Side casting · light silver",(.64,.68,.70),.20,.38)
dark=material("Optical housing · graphite",(.034,.039,.05),.18,.34)
black=material("Black anodized stage",(.024,.028,.032),.42,.39)
knurled=material("Molded wheel grips",(.022,.025,.028),.05,.46)
seam=material("Deep recess",(.006,.009,.012),.05,.4)
steel=material("Satin stainless",(.52,.54,.56),.72,.29)
bright=material("Polished barrel",(.75,.76,.74),.71,.23)
glass=material("Objective multicoating",(.096,.169,.225),.43,.15)
ocular=material("Eyepiece multicoating",(.24,.125,.28),.47,.13)
slidemat=material("Microscope slide glass",(.61,.80,.85),.05,.16,.34)
clear=material("Glass edge",(.22,.45,.44),.15,.32)
white=material("White ink",(.83,.85,.82))
yellow=material("10x magnification band",(.98,.68,.04),.16)
green=material("20x magnification band",(.14,.58,.18),.17)
cyan=material("DIASCOPIC control light",(.08,.72,.64),.05,.24,1,.4)
blue=material("Episcopic mode LED",(.12,.23,.37),.07)
paper=material("Slide label",(.89,.88,.78))
amber=material("Engraving highlight",(.91,.64,.18))
purple=material("Synthetic fixture sample",(.43,.22,.50),.15,.33)

def mesh(name,verts,faces,m):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.data.materials.append(m);return obj

def rounded(obj,r,steps=3):
    if r>0:
        mod=obj.modifiers.new("Casting radius","BEVEL");mod.width=r*mm;mod.segments=steps
        mod=obj.modifiers.new("Planar and rolled normals","WEIGHTED_NORMAL");mod.keep_sharp=True
    return obj

def block(name,pos,dims,m,r=0,rot=(0,0,0)):
    a,b,c=[v*mm/2 for v in dims]
    verts=[(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),
           (-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]
    o=mesh(name,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],m)
    o.location=xyz(pos);o.rotation_euler=tuple(map(rad,rot));return rounded(o,r)

def turned(name,base,axis,sections,m,n=48,ribs=0):
    # (axial station, radius), measured along a local optical/mechanical axis.
    verts=[];faces=[]
    for z,r in sections:
        for i in range(n):
            a=2*math.pi*i/n
            radius=r-(ribs if i%2 else 0)
            verts.append(tuple(xyz((radius*math.cos(a),radius*math.sin(a),z))))
    faces.append(tuple(reversed(range(n))))
    for k in range(len(sections)-1):
        for j in range(n):
            a=k*n+j;b=k*n+(j+1)%n;faces.append((a,b,b+n,a+n))
    faces.append(tuple(range((len(sections)-1)*n,len(sections)*n)))
    obj=mesh(name,verts,faces,m);obj.location=xyz(base)
    obj.rotation_euler=Vector(axis).to_track_quat("Z","Y").to_euler()
    for p in obj.data.polygons:
        if len(p.vertices)==4:p.use_smooth=not ribs
    return obj

def tube(name,pos,axis,r,l,m,segments=48):
    return turned(name,pos,axis,[(0,r),(l,r)],m,segments)

def casting(name,profile,m,bevel):
    # (rearward coordinate, height, half-width) side profile, tapered across X.
    n=len(profile)
    verts=[tuple(xyz((sign*half,y,z))) for sign in (-1,1) for y,z,half in profile]
    fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    fs+= [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    return rounded(mesh(name,verts,fs,m),bevel)

def face(name,s,pos,em,m,normal=(0,-1,0),up=(0,0,1)):
    from mathutils import Matrix
    curve=bpy.data.curves.new(name,"FONT");curve.body=s;curve.size=em*mm
    curve.align_x="CENTER";curve.align_y="CENTER";curve.resolution_u=2
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj)
    normal=Vector(normal).normalized();up=Vector(up).normalized();x=up.cross(normal).normalized()
    obj.location=xyz(pos);obj.rotation_euler=Matrix((x,normal.cross(x),normal)).transposed().to_euler()
    obj.data.materials.append(m)
    bpy.ops.object.select_all(action="DESELECT");obj.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target="MESH")
    return obj

def group(name,pos=(0,0,0),parent=None):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj)
    obj.location=xyz(pos)
    if parent:obj.parent=parent
    return obj

def beneath(obj,parent):
    obj.parent=parent;return obj

def ring_plate(name,cx,cy,z,outer,inner,h,m,circular=False):
    # Rectangular plate with a real through-bore; no hidden optical obstruction.
    n=80;verts=[];faces=[]
    for zz in [-h/2,h/2]:
        for is_inner,(w,d) in enumerate([outer,inner]):
            for i in range(n):
                a=2*math.pi*i/n;co,si=math.cos(a),math.sin(a)
                t=min(w/(2*max(abs(co),1e-9)),d/(2*max(abs(si),1e-9)))
                if circular and is_inner:t=w/2
                verts.append(tuple(xyz((cx+t*co,cy+t*si,z+zz))))
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,j+2*n,i+2*n),(i+n,i+3*n,j+3*n,j+n),
                    (i,i+n,j+n,j),(i+2*n,j+2*n,j+3*n,i+3*n)])
    return mesh(name,verts,faces,m)

def torus(name,center,r,minor,mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=72,minor_segments=8,
        location=xyz(center),major_radius=r*mm,minor_radius=minor*mm)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o

up=(0,0,1)
# The primary body is traced against the lateral outline. The front face leans
# back toward the operator; the open U-shaped window must stay unobstructed.
stand=group("StandCore")
def standpart(obj): return beneath(obj,stand)
standpart(casting("White main casting",[
    (-205,3,54),(-211,8,56),(-266,203,49),(-149,207,59),(-86,143,69),
    (-42,100,76),(-24,94,84),(111,94,101),(124,105,104),(129,133,104),
    (132,226,87),(157,233,85),(169,211,91),(163,8,114),(153,3,113)],ivory,5))
standpart(casting("Graphite optical spine",[
    (-266,201,49),(-294,270,44),(-294,281,43),(-249,318,39),
    (-234,315,44),(-110,192,55),(-66,145,65),(-46,126,72),(-30,121,77),
    (109,121,98),(118,127,98),(121,152,96),(126,239,84),(148,240,86),
    (146,137,99),(142,104,102),(130,91,102),(111,85,99),(-36,85,77),
    (-59,93,70),(-76,105,66),(-152,192,55),(-166,201,53)],dark,4))
# Upper cantilever, built as two parallel skins with smooth polygonal radii.
standpart(casting("Rear support silver cap",[
    (128,110,96),(141,112,100),(155,128,102),(160,152,99),(166,228,83),
    (163,253,78),(158,274,75),(86,453,41),(79,464,40),(68,469,40),
    (47,471,40),(-43,471,41),(-49,467,41),(-50,461,41),(54,458,40),
    (66,454,41),(72,446,43),(143,266,77),(146,239,80)],silver,4))
standpart(casting("Condenser bridge",[
    (112,119,94),(120,130,94),(121,232,81),(119,249,76),(113,264,70),
    (44,437,41),(39,442,40),(33,444,41),(-49,444,41),(-51,448,41),
    (-51,460,42),(-47,463,42),(44,463,41),(57,460,41),(69,450,43),
    (77,434,47),(142,270,73),(148,248,79),(149,225,80),(145,140,95),
    (140,127,98),(131,116,96)],dark,3))
standpart(block("Rear fluorescence lamp enclosure",(0,180,92),(174,44,180),silver,6))
# M700 E p. 2: removable light-colored rear enclosure and bottom-center AC inlet.
standpart(block("Rear service panel",(0,202.6,88),(146,4,161),ivory,7))
standpart(face("Rear housing identification","Nikon",(0,205.0,92),7,dark,(0,1,0)))
for x in [-61,61]:
    for z in [17,155]:
        standpart(tube(f"Rear panel fastener {x} {z}",(x,204.8,z),(0,1,0),1.8,.8,steel,14))
standpart(block("AC inlet bezel",(0,204.7,22),(26,4,20),black,2))
standpart(block("AC inlet cavity",(0,207,22),(20,1,14),seam,2))
for x,z in [(-5,21),(5,21),(0,25)]:
    standpart(block(f"AC inlet contact {x}",(x,207.9,z),(1.4,1,3.2),steel,.3))
for x in [-1,1]:
    for y,w in [(-183,44),(135,93)]:
        standpart(tube(f"Foot {x} {y}",(x*w,y,0),up,7,4,knurled,24))
# Binocular head, two split-prism blocks and 45° eyepiece tubes.
eye_axis=(0,-math.sqrt(.5),math.sqrt(.5))
for side in [-1,1]:
    x=side*32
    standpart(turned(f"Prism bridge {side}",(x,-262,285),eye_axis,
        [(0,22),(5,25),(38,25),(42,22)],dark))
    standpart(turned(f"Eyepiece barrel {side}",(x,-273,296),eye_axis,
        [(0,19),(47,19),(49,16),(88,16),(89,15)],black))
    standpart(turned(f"Adjustable diopter ring {side}",(x,-313,336),eye_axis,
        [(0,17),(19,17),(20,15)],knurled,96,.4))
    standpart(turned(f"Eye guard {side}",(x,-328,351),eye_axis,
        [(0,16),(6,18),(24,19),(29,18)],knurled))
    standpart(tube(f"Ocular inset {side}",(x,-348,371),eye_axis,14.1,1.3,seam))
    standpart(tube(f"Ocular front lens {side}",(x,-348.7,371.7),eye_axis,11,1.1,ocular))
# Locate the eyeguard top at the 406 mm drawing ordinate for 64 mm PD.
for ocular_part in list(stand.children):
    if ocular_part.name.startswith(("Prism bridge","Eyepiece barrel","Adjustable diopter","Eye guard","Ocular inset","Ocular front lens")):
        ocular_part.location += xyz((0,5.5,21.7))
shield=material("Operator shielding plate amber",(.87,.23,.028),.05,.28,.65)
standpart(block("Upright operator shielding plate",(0,-144,256),(125,3,104),shield,3))
for x in [-47,47]:
    standpart(block(f"Shield mount {x}",(x,-144,208),(7,8,10),dark,1))
standpart(tube("Diascopic intensity dial",(-66,-177,54),(-1,0,0),10,8,knurled,60))
standpart(block("Episcopic intensity adjuster",(82,-109,24),(3,27,10),knurled,2))
standpart(block("Main power rocker",(-98,126,20),(6,19,15),black,2))
standpart(block("Transmitted shutter tab",(-36,0,412),(34,24,3),black,1.2))
# Position of the ocular ends is checked against the drawing at PD 64 mm.
# Controls on the sloped operator face; the printed label and switches sit
# flush with that face. The switch function is represented by the state LEDs.
front_normal=(0,-.962,-.272)
def panel_y(z): return -209-(z-7)*.281
for x,z,m,name in [(-15,94,cyan,"DiaIndicator"),(15,94,blue,"EpiIndicator")]:
    standpart(tube(name,(x,panel_y(z)-1,z),front_normal,2.4,1.0,m,24))
    standpart(tube(name+" switch",(x,panel_y(z-11)-2,z-11),front_normal,5.1,2,black,32))
standpart(tube("Illumination on-off key",(0,panel_y(52)-1.3,52),front_normal,8,2,steel,40))
standpart(tube("Front identification medallion",(0,panel_y(146)-1,146),front_normal,19,1.8,steel,48))
standpart(tube("Front badge face",(0,panel_y(146)-3,146),front_normal,17.9,1,ivory,48))
for title,z,size in [("Nikon",151,7),("ECLIPSE",143,4),("Ts2-FL",137,4)]:
    standpart(face("Identification "+title,title,(0,panel_y(z)-4.5,z),size,dark,front_normal))
for side in [-1,1]:
    standpart(face(f"Side optical head imprint {side}","Nikon",(side*44.3,-253,283),7,white,(side,0,0)))
# Knob origins are on the focus shaft axis. Fine and coarse are coaxial.
for sign,name in [(-1,"FocusKnobL"),(1,"FocusKnobR")]:
    g=group(name,(sign*66,-105,64),stand)
    beneath(turned(name+" drum",(0,0,0),(sign,0,0),
        [(0,29),(5,31),(23,31),(26,28),(30,28)],knurled,160,.75),g)
    fine=group("FineFocusL" if sign<0 else "FineFocusR",(0,0,0),g)
    beneath(turned(name+" fine",(0,0,0),(sign,0,0),
        [(29,22),(31,23),(47,23),(49,20),(52,19)],knurled,144,.53),fine)
    beneath(tube(name+" cap",(sign*50,0,0),(sign,0,0),13,2,black,40),fine)
    beneath(block(name+" fine index",(sign*52,0,12),(1,1.25,5),ivory,.25),fine)
# Fixed 170 X ×247 Y plain stage; the mechanical stage is an accessory.
under=standpart(ring_plate("PlainStage",0,2,194.5,(170,247),(106,106),11,black,True))
standpart(torus("Stage ring well",(0,2,200),53.8,.85,steel))
# The ELWD condenser clearance is 75 mm. End face at z=275 mm.
standpart(turned("ELWD condenser barrel",(0,0,275),up,
    [(0,26),(2,27.5),(72,28),(76,31),(92,31),(95,35),(111,35),
     (114,29),(151,29),(153,28),(165,28),(167,32),(175,32)],dark,80))
standpart(tube("Condenser front element",(0,0,275),(0,0,-1),21.2,1,glass,64))
standpart(turned("Condenser retaining ring",(0,0,274.7),up,[(0,27.6),(4,27.6)],black,80))
standpart(block("Annulus carrier housing",(0,0,363),(79,61,14),black,3))
phase=group("PhaseSlider",(0,0,363),stand)
beneath(block("Ph1 precentered slider tab",(-49,0,0),(34,29,4),dark,2),phase)
beneath(face("Phase annulus index","Ph1",(-49,0,2.2),5,white,(0,0,1),(0,1,0)),phase)
for s in [-1,1]:
    standpart(tube("Condenser centering screw "+str(s),(s*32,-5,369),(s,0,0),3.5,8,knurled,28))
standpart(block("Condenser yellow caution label",(0,-29.7,397),(24,1.5,16),yellow,1))
standpart(face("Lamp identification","LED",(0,-30.7,398),5,black))
# Mechanical stage / holder and slide. The movable group origin is the
# specimen centre on the optical axis. One slide or the other is drawn.
stage=group("MechanicalStage")
beneath(block("Fixed XY stage rack",(0,112,209),(234,19,13),black,1.6),stage)
for xx in [-76,76]:
    beneath(block(f"Stage attachment {xx}",(xx,82,201),(15,67,8),black,1.5),stage)
beneath(block("Drive block",(107,85,192),(34,45,25),dark,2.5),stage)
beneath(tube("Stage drive pinion shaft",(109,87,80),up,5.5,112,steel),stage)
beneath(turned("Stage translation controls",(109,87,69),up,
    [(0,9),(3,11),(17,11),(19,6),(23,6),(25,12),(41,12),(42,9)],knurled,112,.4),stage)
carrier=group("SpecimenCarrier",(0,0,0),stage)
beneath(ring_plate("C-S-HS slide holder",0,0,202,(118,77),(64,24),2.6,black),carrier)
beneath(block("Slider carriage link",(0,69,204),(17,67,4),black,1.4),carrier)
for i,x in enumerate([-40,40]):
    beneath(block(f"Glass slide retainer {i}",(x,0,204.3),(4.5,27,3),bright,.6),carrier)
for alt,name in [(False,"StageMicrometer"),(True,"SpecimenSlide")]:
    fixture=group(name,(0,0,203.4),carrier)
    beneath(block("Prepared substrate" if alt else "Micrometer substrate",(0,0,.6),(75,25,1.2),slidemat,.15),fixture)
    beneath(block(name+" ground end",(-28,0,1.24),(17,23,.08),paper,.05),fixture)
    beneath(face(name+" identifier","SPECIMEN" if alt else "1 mm / 100",(-28,0,1.30),2.15,dark,(0,0,1),(0,1,0)),fixture)
    if alt:
        beneath(tube("Prepared slide well",(0,0,1.21),up,3.5,.02,purple),fixture)
        fixture.scale=(0,0,0)
    else:
        # True 10 µm (0.01 mm) physical pitch. Single mesh avoids 101 draws.
        pts=[];faces=[]
        for i in range(101):
            x=-.5+i*.01;half_height=.022 if i%5==0 else .013
            j=len(pts);pts.extend(tuple(xyz(v)) for v in [(x-.00075,-half_height,1.24),(x+.00075,-half_height,1.24),(x+.00075,half_height,1.24),(x-.00075,half_height,1.24)])
            faces.append((j,j+1,j+2,j+3))
        beneath(mesh("Micrometer graduation 100 x 10 micrometres",pts,faces,dark),fixture)
        beneath(torus("Engraved finder circle",(0,0,1.23),2.0,.022,black),fixture)
# Inverted objective unit. The selected lens axis is vertical even though
# the turret shaft tilts 15°. Rotating the rotor 72° indexes the next socket.
focus=group("FocusCarriage",(0,0,0),stand)
beneath(block("Focusing slide and rack",(0,44,113),(61,57,22),dark,4),focus)
axle=group("NosepieceTurret",(0,29.9437,129.00),focus);axle.rotation_euler.x=rad(-15)
rotor=group("NosepieceIndex",parent=axle)
beneath(turned("Five position indexing disc",(0,0,0),up,[(-9,40),(-5,44),(1,45),(5,43),(7,38)],dark,80),rotor)
beneath(turned("Turret grip band",(0,0,0),up,[(-4,44.5),(2.5,44.5)],knurled,150,.45),rotor)
for i in range(5):
    holder=group("TurretStation"+str(i+1),parent=rotor)
    holder.rotation_euler.z=2*math.pi*i/5
    unit=group(("Objective10x","Objective20x","BlindPlug3","BlindPlug4","BlindPlug5")[i],(0,-31,0),holder)
    unit.rotation_euler.x=rad(15)
    if i<2:
        # Tip-to-slide clearances 6.2 and 3.1 mm respectively. Mount lengths
        # include the inferred turret seating depth in this reconstruction.
        tip=203.4-6.2-129-31*math.sin(rad(15)) if i==0 else 203.4-3.1-129-31*math.sin(rad(15))
        # Nikon objective outline: M25 mount, 27 mm collar, 25 mm barrel.
        shoulder=tip-(53.0 if i==0 else 56.1)
        nose_radius=6.75 if i==0 else 4.1
        neck_radius=8 if i==0 else 8.5
        profile=[(shoulder-4.5,11.9),(shoulder-.4,12.5),(shoulder,13.5),
                 (shoulder+9.7,13.5),(shoulder+10,12.5),(shoulder+42,12.5),
                 (shoulder+46.5,neck_radius),(tip-3.7,neck_radius),(tip,nose_radius)]
        beneath(turned("CFI ADL barrel "+str(i),(0,0,0),up,profile,bright,64),unit)
        beneath(turned("Objective knurl "+str(i),(0,0,0),up,
                [(shoulder+.6,13.36),(shoulder+9.4,13.36)],steel,100,.14),unit)
        beneath(tube("Objective power band "+str(i),(0,0,shoulder+12),up,12.55,1.8,(yellow,green)[i],64),unit)
        beneath(tube("Objective front glass "+str(i),(0,0,tip-.15),up,nose_radius*.72,.15,glass,64),unit)
        beneath(face("Objective inscription "+str(i),("10x / 0.25","20x / 0.40")[i],(0,-12.6,shoulder+31),2.9,dark),unit)
        beneath(face("Objective ring marking "+str(i),"Ph1 ADL",(0,-12.6,shoulder+26),2.5,dark),unit)
    else:
        beneath(turned("Unused objective socket cap "+str(i),(0,0,2),up,
                       [(0,12),(3,13),(5,13),(6,10)],knurled,44),unit)
# Selectable filter turret inset below objectives (view from the side).
epi=group("EpiSelector",(0,13,118),stand)
beneath(turned("Epi filter wheel",(0,0,0),up,[(-4,50),(0,51),(2,50)],black,72),epi)
beneath(block("Filter turret index tab",(40,0,0),(29,8,6),dark,1.8),epi)
beneath(block("Filter index yellow",(47,0,3),(4,5,.8),yellow),epi)
# Side camera port and head, aligned along the optical pickoff facing left.
# Camera head external 100 W x 66 D x 65 H. 66 mm lies along the mount axis.
camera=group("CameraSystem")
for name,base,end,r in [("TS2-P-CF flange",-36,-61,26),("Side camera port",-58,-86,23),
                        ("C-0.63X-TS2 relay",-84,-116,16),("C mount lock ring",-111,-121,20)]:
    beneath(tube(name,(base,-233,259),(-1,0,0),r,abs(end-base),black),camera)
beneath(block("DS-Fi3 camera body",(-154,-233,259),(66,100,65),dark,5),camera)
for j in range(10):
    beneath(block("Head cooling groove "+str(j),(-155,-275+j*8.8,291.15),(57,2.1,.75),seam,.5),camera)
beneath(block("Head rear label",(-187.3,-233,258),(1,60,28),black,1.8),camera)
beneath(face("Head identification","Nikon  DS-Fi3",(-188,-233,261),6,white,(-1,0,0)),camera)
beneath(block("USB 3 socket",(-186.8,-259,244),(2.2,12,5),steel,1),camera)
beneath(block("USB 3 insert",(-188.1,-259,244),(1.1,9,3),blue,.6),camera)
# Native editable bodies remain separate while the web asset is prebuilt.
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(filepath=str(OUT/"microscope.glb"),export_format="GLB",
    export_extras=True,export_cameras=False,export_lights=False,export_apply=True,export_yup=True)
if "--blend" in sys.argv:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"microscope.blend"))
if "--plates" in sys.argv:
    scene.render.engine="CYCLES";scene.cycles.samples=26;scene.cycles.use_denoising=False
    w=scene.world or bpy.data.worlds.new("Plate studio");scene.world=w;w.use_nodes=True
    w.node_tree.nodes["Background"].inputs["Color"].default_value=(.72,.75,.79,1)
    w.node_tree.nodes["Background"].inputs["Strength"].default_value=.55
    def area(name,pos,target,watts,size,color):
        l=bpy.data.lights.new(name,type="AREA");l.energy=watts;l.shape="DISK";l.size=size;l.color=color
        o=bpy.data.objects.new(name,l);scene.collection.objects.link(o);o.location=pos
        o.rotation_euler=(Vector(target)-o.location).to_track_quat("-Z","Y").to_euler()
    area("Softbox",(-.74,-.87,1.07),(0,0,.21),30,.58,(1,.95,.87))
    area("Fill",(.70,-.39,.61),(0,0,.21),18,.53,(.86,.92,1))
    area("Rim",(.2,.75,.85),(0,0,.21),23,.44,(1,.98,.93))
    c=bpy.data.cameras.new("Plate camera");cam=bpy.data.objects.new("Plate camera",c)
    scene.collection.objects.link(cam);scene.camera=cam;c.type="ORTHO";c.clip_start=.002
    scene.render.resolution_x=1040;scene.render.resolution_y=760;scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="WEBP";scene.render.image_settings.quality=93
    for name,pos,target,scale in [
        ("front",(-.88,-1.12,.79),(-.022,-.063,.224),.85),
        ("side",(.99,-.075,.263),(0,-.075,.235),.74),
        ("stage",(.45,-.33,.343),(0,.004,.192),.35),
        ("rear",(-.75,1.07,.70),(-.025,-.057,.224),.84)]:
        cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
        c.ortho_scale=scale
        scene.render.filepath=str(OUT/("model-"+name+".webp"))
        bpy.ops.render.render(write_still=True)
