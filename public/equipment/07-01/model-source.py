"""Thermo Scientific 1305, legacy 1300 Series A2 • cabinet-only reconstruction.

Rebuild with Blender 4.3: blender -b -P model-source.py
Add -- --plates to render the five original illustrations, or -- --blend to
save a native editable Blender scene alongside the GLB. No external textures.
Dimensions below are mm. In Blender: X right, Y rear, Z up from cabinet base.
glTF: X right, Y up, Z toward operator. Geometry in the GLB is in metres.

7021355 Rev 20 pp. 1-1, 1-5–1-10, 3-4, 7-1. Brochure EXT3202 0722 pp. 1–5.
Manufacturer specifies the envelope, chamber dimensions, sash positions,
10° rake, and access-port sizes. Unpublished shapes, perforation pattern, tray
datum, sash thickness, handle, edge radii and connector details are inferred.
Synthetic sealed specimen is an original illustration.
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
MM = 0.001
radians = math.radians
SLOPE = math.tan(radians(10))
DECK, NOMINAL = 105, 203
# Sash/rail plane through Y=-380 at deck, moving toward rear as height rises.
def front(z):
    return -380 + SLOPE * (z - DECK)

def material(name, rgb, metal=0, rough=.43, alpha=1, emit=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, alpha)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    b.inputs["Alpha"].default_value = alpha
    if emit:
        b.inputs["Emission Color"].default_value = (*rgb, 1)
        b.inputs["Emission Strength"].default_value = emit
    if alpha < 1:
        m.surface_render_method = "BLENDED"
    return m

enamel = material("Silver mist • enamel", (.65,.69,.72), .18, .36)
fascia = material("Shell • satin ivory", (.85,.87,.88), .13, .34)
blue = material("Sash guides • cornflower", (.117,.226,.462), .2, .34)
membrane = material("Keypad • membrane blue", (.034,.16,.33), .12)
steel = material("Chamber • satin stainless", (.53,.56,.57), .58, .38)
bright = material("Tray • brushed stainless", (.62,.65,.65), .62, .32)
edge = material("Trim • rolled stainless", (.66,.71,.74), .72, .30)
gasket = material("Window channel • graphite", (.028,.038,.045), .15, .51)
hole = material("Recess • shadow", (.012,.019,.028), .0, .7)
ivory = material("Switch caps • porcelain", (.87,.86,.78), .0)
black = material("LCD • dark", (.009,.022,.019), .02, .25)
lime = material("LCD inactive segment", (.13,.21,.10), .0)
green = material("Sash position LED", (.27,.74,.18), .0,.27,1,.3)
glass = material("Tempered sash • clear", (.61,.83,.88), .03,.14,.10)
glassedge = material("Laminated edge", (.13,.30,.31), .18,.3)
lamp = material("Task lamp • warm white", (1,.85,.62), 0,.3,1,1.2)
passage = material("Port • off-white elastomer", (.65,.66,.61), .08,.53)
red = material("Typeplate red", (.55,.053,.034))
samplemat = material("Sealed witness • ochre", (.79,.38,.08), .15,.37)
samplelid = material("Witness cap • amber", (.92,.58,.19), .05,.29)
label = material("Specimen label", (.94,.89,.77))
deg0 = (0,0,0)
def metre(v): return [i*MM for i in v]
def matobj(o, name, mat):
    o.name=name
    o.data.name=name
    o.data.materials.append(mat)
    return o

def box(name, xyz, size, mat, radius=0, angles=deg0):
    x,y,z=metre(xyz)
    a,b,c=[v*MM/2 for v in size]
    verts=[(-a,-b,-c),(a,-b,-c),(a,b,-c),(-a,b,-c),
           (-a,-b,c),(a,-b,c),(a,b,c),(-a,b,c)]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    o=mesh(name, verts,faces,mat)
    o.location=(x,y,z)
    o.rotation_euler=tuple(map(radians,angles))
    roundover(o,radius)
    return o

def mesh(name,verts,faces,mat):
    m=bpy.data.meshes.new(name); m.from_pydata(verts,[],faces); m.update()
    o=bpy.data.objects.new(name,m); bpy.context.collection.objects.link(o)
    return matobj(o,name,mat)

def roundover(o,radius):
    if radius<=0: return
    b=o.modifiers.new("Pressed radii","BEVEL")
    b.width=radius*MM; b.segments=2
    n=o.modifiers.new("Panel normals","WEIGHTED_NORMAL"); n.keep_sharp=True

def side_profile(name, x0,x1, yz, mat, radius=0):
    verts=[metre((x,y,z)) for x in (x0,x1) for y,z in yz]
    n=len(yz)
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n))
    o=mesh(name,verts,faces,mat); roundover(o,radius); return o

def cylinder(name,xyz,diam,length,axis,mat,count=36):
    bpy.ops.mesh.primitive_cylinder_add(vertices=count,radius=diam*MM/2,
            depth=length*MM,location=metre(xyz))
    o=matobj(bpy.context.object,name,mat);o.rotation_euler=tuple(map(radians,axis))
    for p in o.data.polygons: p.use_smooth=len(p.vertices)==4
    return o

def textface(name, text, xyz, h, mat, deg=80, align="CENTER"):
    curve=bpy.data.curves.new(name,"FONT");curve.body=text;curve.size=h*MM
    curve.align_x=align;curve.align_y="CENTER";curve.resolution_u=2
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o)
    o.location=metre(xyz);o.rotation_euler[0]=radians(deg)
    o.data.materials.append(mat)
    bpy.context.view_layer.objects.active=o
    o.select_set(True);bpy.ops.object.convert(target="MESH");o.select_set(False)
    return o

def grouping(name,xyz,objects):
    group=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(group)
    group.location=metre(xyz)
    for o in objects:
        o.parent=group;o.location-=group.location
    return group

def frontplate(name,x,z,w,h,d,offset,mat,r=0):
    return box(name,(x,front(z)+offset,z),(w,d,h),mat,r,(-10,0,0))
def lettering(name,txt,x,z,h,offset,mat,align="CENTER"):
    return textface(name,txt,(x,front(z)+offset,z),h,mat,80,align)

# Cabinet envelope. Side trapezoid and the recessed roof follow manual
# drawings 1-1 and 2-3. The chamber has a stainless liner to distinguish 1305.
yz=[(-400,0),(400,0),(400,1568),(front(1568)-9,1568),(front(0)-1,10)]
for side, x0,x1 in [("Left",-648.5,-600),("Right",600,648.5)]:
    side_profile(side+" enclosure",x0,x1,yz,enamel,2)
    sgn=-1 if side=="Left" else 1
    frontplate(side+" blue sash guide",sgn*625,437,50,840,8,-1.3,blue,2)
    profile=[(front(0)-.5,6),(front(0)+5,6),(front(870)+5,870),(front(870)-1,870)]
    side_profile(side+" blue pillar",x0+1,x1-1,profile,blue,1)
    sign=-1 if x0<0 else 1
    x=sign*609
    frontplate(side+" window guide",x,493,7,900,3,-1,gasket)
    for n,z in enumerate([DECK,DECK+NOMINAL]):
        frontplate(side+" sash dimple "+str(n+1),sign*631,z,19,4,2,-3,blue,1)
    # Thin interior wall over exterior body; starts 630 mm in front of back liner.
    side_profile(side+" stainless liner",sign*599.8-.25,sign*599.8+.25,
                 [(-352,103),(282,103),(282,885),(front(885)+6,885)],steel,.3)
    for i,(y,z,d) in enumerate([(400-182.9,365.8,76),(400-259,226.1,23),
                                (400-309.9,226.1,23),(400-360.7,353.1,23)]):
        for face,x,thickness in [("external",sign*648,3),("internal",sign*597.4,4.4)]:
            # Caps stay inside the specified width. External faces are let into the panel.
            x=sign*649.1 if face=="external" else x
            cylinder(f"{side} {face} port {i+1} bezel",(x,y,z),d,thickness/2,(0,90,0),edge)
            cylinder(f"{side} {face} port {i+1} cap",(x-sign*.1 if face=="external" else x-sign*1.6,y,z),d-5,2.1,(0,90,0),passage)
            if face=="external":
                # Flush paint/plug boundaries, just at the shell surface.
                o=bpy.context.object
                o.location.x=sign*.649
            if face=="internal" and i==0:
                for ang in [0,60,-60]:
                    box(side+" SmartPort slit "+str(ang),(x-sign*2.8,y,z),(1,34,1.2),gasket,0,(ang,0,0))
box("Base pan",(0,0,43),(1296,799,85),enamel,3)
box("Rear skin",(0,379,782),(1296,22,1563),enamel,4)
# Manual fig. 3-2 shows a broad sheet counterweight captured by two rails.
for x in (-628,628):
    box(f"Counterweight track {x}",(x,393,781),(32,12,1551),enamel,2)
weight=box("Counterweight plate",(0,393,1010),(1218,12,311),enamel,2)
counter=grouping("Counterweight",(0,393,1010),[weight])
counter["travelAssumption"]="Opposite sash at 1:1 vertical travel; ratio inferred."

box("Rear liner",(0,279,495),(1200,4,780),steel,3)
box("Upper chamber ceiling",(0,9,895),(1200,544,20),steel,2)
# The front fascia is a folded cover; separate front and back keep the pane in its pocket.
side_profile("Upper plenum housing",-647,647,
             [(front(841)+32,841),(397,841),(397,1557),(front(1557)+21,1557)],fascia,4)
frontplate("Upper access cover",0,1207,1294,721,14,-1,fascia,4)
frontplate("Blue fascia seam",0,859,1286,13,16,-2,blue,2)
frontplate("Control canopy",0,746,1260,212,47,-10,enamel,6)
frontplate("Canopy lower return",0,642,1248,7,39,-4,edge,2)
# Cabinet has a rectangular top exhaust/grating without a thimble.
box("Roof surface",(0,126,1559),(1289,528,8),enamel,3)
box("Exhaust top recess",(0,128,1564),(766,275,3),gasket,1)
for i in range(22):
    box(f"Exhaust louvre {i+1:02d}",(-363+i*34.6,128,1565),(12,269,5),edge,1)
for y in (32,132,232):
    box(f"Exhaust cross member {y}",(0,y,1565),(764,7,4),edge,1)
# Electrical interfaces are on top, per Fig. 1-9. Plug placement schematic.
box("Interface strip",(-517,205,1564),(137,241,4),steel,2)
for i in range(2):
    cylinder(f"Accessory fuse cap {i+1}",(-546+31*i,263,1566),16,4,deg0,gasket)
box("RS232 serial receptacle",(-520,153,1566),(33,13,3),gasket,2)
box("RS232 metal surround",(-520,153,1567),(26,9,1.4),edge,1)
for row,count in [(0,5),(1,4)]:
    for i in range(count):
        cylinder(f"Serial pin {row}-{i}",(-530+i*4.6+row*2.2,151.5+row*3.5,1568-0.4),1.4,.8,deg0,hole,10)
# The visible cord strain relief terminates at the upper connector.
box("Line cord termination",(547,292,1563),(36,40,7),gasket,3)
# Light and thin rolled lip of the work deck.
box("ChamberLamp",(0,-207,866),(1050,29,15),lamp,5)
box("Light canopy reflector",(0,-207,877),(1134,69,13),edge,3)
box("Removable one-piece tray",(0,-38,99.5),(1200,630,11),bright,3)
box("Perimeter lower window sill",(0,-386,85),(1199,23,26),edge,3)
box("Front face under tray",(0,-395,49),(1199,9,62),gasket,2)
# Actual openings in stamped grille strips. Each cell shares the surrounding
# perforated top sheet with a recessed dark backing; dimensions photograph-fit.
def grille(name,nx,ny,cx,cy,z,width,depth,mat):
    box(name+" backing",(cx,cy,z-1.1),(width,depth,1.4),hole,.4)
    dx,dy=width/nx,depth/ny
    verts=[];faces=[]
    corners=[(1,0),(1,1),(0,1),(-1,1),(-1,0),(-1,-1),(0,-1),(1,-1)]
    for iy in range(ny):
        for ix in range(nx):
            base=len(verts)
            x=cx+(ix-(nx-1)/2)*dx; y=cy+(iy-(ny-1)/2)*dy
            for u,v in corners: verts.append(metre((x+.5*dx*u,y+.5*dy*v,z)))
            for j in range(8):
                angle=j*math.pi/4
                verts.append(metre((x+dx*.25*math.cos(angle),y+dy*.375*math.sin(angle),z)))
            for j in range(8):
                k=(j+1)%8
                faces.append((base+j,base+k,base+8+k,base+8+j))
    return mesh(name,verts,faces,mat)
grille("Front intake perforations",94,5,0,-314,106,1188,72,bright)
# Rear return slots run along the bottom fold of the rear wall.
box("Rear return channel",(0,270,126),(1187,9,41),gasket,1)
for i in range(105):
    box(f"Rear return web {i+1:03}",(-589+i*11.32,264,126),(4,3,38),bright,.6)
box("Rear return hem",(0,264,147),(1192,6,5),edge,1)

# Horizontal US duplex outlet faces, rear left and right.
for side,x in [("L",-420),("R",420)]:
    box("Accessory duplex "+side,(x,272,251),(110,9,73),edge,3)
    for dx in [-25,25]:
        box(f"{side} receptacle {dx}",(x+dx,266,251),(39,5,42),ivory,7)
        for sx in [-6,6]:
            box(f"{side} blade {dx} {sx}",(x+dx+sx,263,254),(2.6,1.3,10),hole,.6)
        cylinder(f"{side} ground {dx}",(x+dx,263,243),4.9,1.2,(90,0,0),hole,16)
    for dx in (-48,48):
        cylinder(f"{side} retaining screw {dx}",(x+dx,266.5,251),4.5,2,(90,0,0),steel,10)

# The sash has one rigid DOF, with the lower edge at the selected opening.
z0=DECK+NOMINAL
members=[]
height=623
members += [frontplate("Laminated transparent pane",0,z0+height/2,1201,height/math.cos(radians(10)),5,0,glass,1)]
members += [frontplate("Sash lower edge",0,z0+2.5,1200,5,6,0,glassedge,1)]
for x in [-284,284]:
    members.append(frontplate(f"Sash grip flange {x}",x,z0+22,100,38,3,-5,edge,2))
    members.append(frontplate(f"Sash pull {x}",x,z0+32,102,7,20,-14,edge,2))
members.append(frontplate("Sash label",485,z0+22,85,29,1,-3.6,label,.5))
members.append(lettering("Sash mark","WINDOW",485,z0+23,8,-4.3,gasket))
sash=grouping("SashAssembly",(0,front(z0),z0),members)
sash["nominalOpeningMm"]=203
sash["maximumOpeningMm"]=535
sash["verticalTravelDatum"]="lower edge to work tray"
sash["frontRakeDeg"]=10

# Distinct inset control pad, LCD field, six membrane switches and lower
# status strip. Minus signs are placeholders; no airflow sensor is simulated.
cz=745
frontplate("Membrane control panel",386,cz,250,51,2.4,-35,membrane,2)
frontplate("Dark LCD bezel",319,cz+1,104,35,2.0,-37,gasket,1.8)
frontplate("LCD window",319,cz+1,95,27,1,-38.1,black,1)
lettering("LCD placeholder","–   –   –",318,cz+2,17,-39,lime)
keys=["ON","h","*","I","UV","×"]
for i,key in enumerate(keys):
    x=384+i*21.9
    frontplate(f"Key {i+1}",x,cz+11,16.2,14.4,1.2,-37,ivory,2)
    lettering(f"Membrane ink {i+1}",key,x,cz+11,7.1,-38,membrane)
for i in range(9):
    x=378+i*14.2
    lightmat=green if i==6 else (material("Reduced mode LED",(.04,.13,.27)) if i==8 else ivory)
    name={6:"WindowStatusIndicator",8:"ReducedModeIndicator"}.get(i,f"Passive indicator {i}")
    cylinder(name,(x,front(cz-11)-37,cz-11),4.7,1,(80,0,0),lightmat,16)
frontplate("Manufacturer badge",-568,1494,108,47,3,-10,label,1)
lettering("Brand","Thermo",-568,1501,17,-12.2,red)
lettering("Brand secondary","SCIENTIFIC",-568,1488,6.8,-12.2,gasket)
lettering("Model designation","1300 SERIES A2",548,916,15,-9,membrane)
# Sealed non-biological example; no geometry is added to the tray when absent.
spec=[]
spec.append(cylinder("Sealed witness pot",(100,-81,124),78,38,deg0,samplemat))
spec.append(cylinder("Sealed witness lid",(100,-81,148),84,11,deg0,samplelid))
spec.append(cylinder("Witness lid label",(100,-81,154),52,1,deg0,label))
spec.append(textface("Witness ID","01",(100,-82,154.6),20,gasket,deg=0))
sample=grouping("SealedSample",(100,-81,105),spec)

# Combine static repeated parts by material to keep runtime draw calls small.
# Keep functional components named. The source above retains individual parts.
def join_static(prefix,title):
    items=[o for o in scene.objects if o.name.startswith(prefix)]
    if not items: return
    bpy.ops.object.select_all(action="DESELECT")
    for o in items: o.select_set(True)
    bpy.context.view_layer.objects.active=items[0]
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join();bpy.context.object.name=title

for a,b in [("Rear return web","Rear return perforations"),("Exhaust louvre","Exhaust grille blades"),
            ("Exhaust cross member","Exhaust grille cross members"),("Serial pin","DB9 contacts"),
            ("Passive indicator","Membrane indicator array"),("Key ","Membrane keys"),("Membrane ink","Key legends")]:
    join_static(a,b)

# Native scene has the individual parts editable; a GLB can be loaded directly.
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.export_scene.gltf(filepath=str(OUT/"cabinet.glb"),export_format="GLB",export_extras=True,
                          export_cameras=False,export_lights=False,export_apply=True,export_yup=True)
if "--blend" in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"cabinet.blend"))

if "--plates" in sys.argv or "--workspace" in sys.argv:
    def area(name,xyz,target,power,size,color):
        lampdata=bpy.data.lights.new(name,type="AREA")
        lampdata.energy=power;lampdata.shape="DISK";lampdata.size=size
        lampdata.color=color
        light=bpy.data.objects.new(name,lampdata); scene.collection.objects.link(light)
        light.location=xyz
        light.rotation_euler=(Vector(target)-light.location).to_track_quat("-Z","Y").to_euler()
    area("Key",(-1.8,-2.5,3.5),(0,0,.72),230,2.2,(1,.94,.84))
    area("Fill",(2.4,-1.3,2.1),(0,0,.65),180,1.7,(.79,.87,1))
    area("Rear edge",(.4,1.9,2.6),(0,0,.8),145,1.2,(1,.91,.77))
    area("Work light",(0,-.12,.84),(0,.16,.14),4,.72,(1,.84,.61))
    scene.render.engine="CYCLES";scene.cycles.samples=56;scene.cycles.use_denoising=False
    world=scene.world or bpy.data.worlds.new("Paper")
    scene.world=world;world.use_nodes=True
    bg=world.node_tree.nodes["Background"];bg.inputs["Color"].default_value=(.78,.77,.72,1)
    bg.inputs["Strength"].default_value=.65
    scene.render.film_transparent=True
    camdata=bpy.data.cameras.new("Plate"); cam=bpy.data.objects.new("Plate",camdata)
    scene.collection.objects.link(cam);scene.camera=cam;camdata.type="ORTHO";camdata.clip_start=.01
    scene.render.resolution_x=920;scene.render.resolution_y=700;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="WEBP";scene.render.image_settings.quality=89
    for filename,pos,target,view_scale in [
        ("model-front",(-1.42,-3.85,1.88),(0,0,.78),2.72),
        ("model-panel",(.22,-1.40,.92),(.386,-.30,.745),.38),
        ("model-interface",(2.22,-2.1,2.95),(0,0,.83),2.94),
        ("model-rear",(2.45,3.50,2.85),(0,0,.78),2.98),
        ("model-workspace",(.30,-1.8,.55),(0,0,.20),1.31)]:
        if "--workspace" in sys.argv and filename != "model-workspace":
            continue
        if filename=="model-workspace":
            travel=(535-NOMINAL)*MM
            sash.location.z+=travel
            sash.location.y+=SLOPE*travel
            counter.location.z-=travel
        cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat("-Z","Y").to_euler()
        camdata.ortho_scale=view_scale
        scene.render.filepath=str(OUT/(filename+".webp"))
        bpy.ops.render.render(write_still=True)
