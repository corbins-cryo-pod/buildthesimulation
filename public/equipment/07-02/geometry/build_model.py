"""Build the 51030285 VIOS 160i from original parametric geometry.
Blender 4.3+: blender -b -P build_model.py [-- --plates]
Outputs appear next to this file. The source uses millimetres, +x right, +y up,
+z toward the operator. glTF exports metres. See model-notes.md for sources.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent
PI = math.pi
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def pos(x, y, z):
    return Vector((x / 1000, -z / 1000, y / 1000))


def mat(name, rgb, metal=0, roughness=.38, alpha=1):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, alpha)
    m.use_nodes = True
    shader = m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        m.surface_render_method = 'BLENDED'
    return m


paint = mat("Warm white powder coating", (.81, .82, .79), .14, .34)
edge = mat("Off-white door returns", (.66, .69, .68), .18, .34)
liner = mat("Brushed chamber steel", (.49, .54, .55), .56, .34)
rack = mat("Shelf stainless steel", (.63, .69, .70), .58, .29)
back = mat("Galvanized back panel", (.44, .48, .48), .48, .43)
black = mat("Charcoal elastomer", (.029, .036, .037), 0, .51)
graphite = mat("Control panel charcoal", (.040, .053, .056), .13, .31)
inset = mat("Recess", (.014, .020, .022), .03, .54)
glass = mat("Inner clear glass", (.55, .87, .90), .05, .15, .18)
blue = mat("LCD background", (.096, .33, .40), .09, .33)
ink = mat("Lettering", (.067, .13, .16), .05, .48)
red = mat("Badge ink", (.37, .030, .024), .04, .48)
brass = mat("Gas fitting", (.64, .48, .23), .57, .31)


def group(name, xyz=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    o.location = pos(*xyz)
    return o


def mesh(name, verts, faces, material, center=(0, 0, 0), parent=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata([pos(*v) for v in verts], [], faces)
    data.materials.append(material)
    data.update()
    o = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(o)
    o.location = pos(*center)
    if parent is not None:
        o.parent = parent
        o.location -= parent.location
    return o


def finish_edges(o, radius):
    if not radius:
        return o
    mod = o.modifiers.new("Formed edges", 'BEVEL')
    mod.width = radius / 1000
    mod.segments = 3
    mod = o.modifiers.new("Area-weighted normals", 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    return o


def box(name, xyz, dims, material, bevel=0, parent=None):
    w, h, d = [val / 2 for val in dims]
    verts = [(-w,-h,-d), (w,-h,-d), (w,h,-d), (-w,h,-d),
             (-w,-h,d), (w,-h,d), (w,h,d), (-w,h,d)]
    faces = [(3,2,1,0), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    return finish_edges(mesh(name, verts, faces, material, xyz, parent), bevel)


def cyl(name, xyz, r, height, axis, material, parent=None, segments=24):
    verts = []
    for z in [-height / 2, height / 2]:
        for i in range(segments):
            a = 2 * PI * i / segments
            xx, yy = r * math.cos(a), r * math.sin(a)
            verts.append({"z":(xx, yy, z), "x":(z, xx, yy), "y":(yy, z, xx)}[axis])
    faces = [tuple(reversed(range(segments))), tuple(range(segments, 2*segments))]
    for i in range(segments):
        j = (i+1) % segments
        faces.append((i, j, j+segments, i+segments))
    o = mesh(name, verts, faces, material, xyz, parent)
    for face in o.data.polygons[2:]:
        face.use_smooth = True
    return o


def loop(w, h, r, cy=0):
    points = []
    for sx, sy, angle in [(1,1,0),(-1,1,90),(-1,-1,180),(1,-1,270)]:
        cx, yy = sx*(w/2-r), cy+sy*(h/2-r)
        for i in range(6):
            a = math.radians(angle + 90*i/5)
            points.append((cx+r*math.cos(a), yy+r*math.sin(a)))
    return points


def ring(name, outer, inner, z1, z2, material, parent=None):
    """Front-parallel ring with rounded exterior and aperture."""
    outside = loop(*outer)
    inside = loop(*inner)
    n = len(inside)
    verts = [(x,y,z) for z, points in [(z2,outside),(z2,inside),(z1,outside),(z1,inside)] for x,y in points]
    faces = []
    for i in range(n):
        j = (i+1) % n
        faces.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),
                      (j,i,2*n+i,2*n+j),(n+i,n+j,3*n+j,3*n+i)])
    return mesh(name, verts, faces, material, parent=parent)


def word(name, label, xyz, size, material, parent=None, align='LEFT'):
    data = bpy.data.curves.new(name, 'FONT')
    data.body = label
    data.align_x = align
    data.size = size/1000
    data.resolution_u = 2
    o = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(o)
    o.location = pos(*xyz)
    o.rotation_euler.x = PI/2
    if parent:
        o.parent = parent
        o.location -= parent.location
    data.materials.append(material)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    return o


def strip_array(name, centers, dimensions, material):
    """Combine repeated marks in one draw call."""
    w,h,d = [v/2 for v in dimensions]
    verts, faces = [], []
    for x,y,z in centers:
        i = len(verts)
        verts.extend([(x-w,y-h,z-d),(x+w,y-h,z-d),(x+w,y+h,z-d),(x-w,y+h,z-d),
                      (x-w,y-h,z+d),(x+w,y-h,z+d),(x+w,y+h,z+d),(x-w,y+h,z+d)])
        faces.extend(tuple(i+j for j in face) for face in [(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    return mesh(name, verts, faces, material)


# Fixed shell. The jacket and face surround leave the chamber open.
# Inside wall faces are 470 mm apart, 607 mm high and 576 mm deep.
for side in [-1,1]:
    box(f"JacketSide{side:+d}", (side*315,468,-4), (7,874,610), paint, 2)
    box(f"ChamberSide{side:+d}", (side*238,454.5,2), (6,607,576), liner, 2)
box("ChamberCeiling", (0,761,2), (478,6,576), liner, 2)
box("ReservoirFloor", (0,148,2), (478,6,576), liner, 2)
box("ChamberRearWall", (0,454.5,-289), (478,611,6), liner, 2)
box("TopPanel",(0,901,0),(637,8,614),paint,3.5)
box("RearJacket",(0,467,-305),(630,864,6),back,3)
box("BasePan",(0,37,-3),(629,12,605),edge,4)
for x in [-278,278]:
    for z in [-250,260]:
        cyl("AdjustableFoot", (x,8,z), 19,16,"y",black)
        cyl("FootThread", (x,25,z), 8,19,"y",back)
ring("FrontEnclosure", (633,866,7,467), (470,607,22,454.5), 277,290,paint)
ring("ChamberLip", (490,627,27,454.5), (470,607,22,454.5), 289,294,liner)
ring("GlassSeal", (515,651,29,454.5), (482,620,25,454.5), 294,300,black)
ring("OuterSealSeat", (625,853,6,468), (602,830,5,468), 290,292,edge)

# Rear air duct, TCD and temperature assemblies are schematic in local detail.
box("RearAirDuct", (0,464,-266),(196,546,40),liner,11)
cyl("PressurePortFlange",(-142,669,-279),32,14,"z",rack)
cyl("PressurePortPlug",(-142,669,-267),22,14,"z",black)
cyl("TemperatureProbeMount",(0,708,-240),17,12,"z",rack)
cyl("TemperatureProbe",(0,708,-222),5,24,"z",back)
cyl("TCDSensorBase",(0,461,-238),40,14,"z",back)
cyl("TCDSensorFace",(0,461,-225),27,16,"z",rack)
cyl("TCDSensorCenter",(0,461,-215),12,5,"z",black)
box("HEPAHousing",(0,181,-78),(260,51,291),liner,12)
box("ReservoirCover",(0,155,13),(449,7,529),rack,3)
box("PrefilterFrame",(0,162,190),(264,8,76),black,3)
strip_array("PrefilterMesh",[(x,167,190) for x in range(-124,125,5)],(1.5,1.5,64),liner)
cyl("FrontDrainFitting",(0,79,297),14,18,"z",black)
cyl("FrontDrainCap",(0,79,308),8,8,"z",rack)
box("GlassDoorSwitch",(0,788,295),(35,12,8),edge,2)

for x in [-222,222]:
    for z in [-177,253]:
        box("RackUpright",(x,456,z),(13,563,14),rack,2)
        strip_array("RackAdjustmentSlots",[(x,204+i*48,z+7.1) for i in range(11)],(5,12,1),inset)
    for y in [225,414,603]:
        box("ShelfSupport",(x,y-7,45),(20,8,468),rack,2)


def perforated_insert(name, height, fill_cutout=False):
    # An octagonal through-opening in each cell. The bottom insert has a
    # continuous refilling opening at the front, bounded by the rolled edge.
    cols, rows = 24, 25
    width, depth = 423, 465
    active_w, active_d = width-14, depth-18
    dx, dz = active_w/cols, active_d/rows
    verts, faces = [], []
    def quad(points):
        k = len(verts)
        verts.extend(points)
        faces.append((k,k+1,k+2,k+3))
    # The mesh lies at local y=0. The underside is rendered double-sided.
    for j in range(rows):
        for i in range(cols):
            if fill_cutout and 3 <= i < cols-3 and rows-3 <= j < rows-1:
                continue
            x = -active_w/2 + dx*(i+.5)
            z = -active_d/2 + dz*(j+.5)
            k = len(verts)
            for radial in [False,True]:
                for n in range(8):
                    a = n*PI/4
                    cs,sn = math.cos(a),-math.sin(a)
                    if radial:
                        xx,zz = 4.2*cs,4.2*sn
                    else:
                        t = max(abs(cs),abs(sn))
                        xx,zz = dx/2*cs/t,dz/2*sn/t
                    verts.append((x+xx,0,z+zz))
            for n in range(8):
                nxt = (n+1)%8
                faces.append((k+n,k+nxt,k+8+nxt,k+8+n))
    # Borders and folded rim; the contact surface is the y datum.
    for sign in [-1,1]:
        xa,xb = sorted([sign*width/2, sign*active_w/2])
        za,zb = sorted([sign*depth/2,sign*active_d/2])
        quad([(xa,0,depth/2),(xb,0,depth/2),(xb,0,-depth/2),(xa,0,-depth/2)])
        quad([(-active_w/2,0,zb),(active_w/2,0,zb),(active_w/2,0,za),(-active_w/2,0,za)])
        z=sign*depth/2
        quad([(-width/2,-4,z),(width/2,-4,z),(width/2,0,z),(-width/2,0,z)])
        x=sign*width/2
        quad([(x,-4,-depth/2),(x,-4,depth/2),(x,0,depth/2),(x,0,-depth/2)])
    return mesh(name, verts, faces, rack, (0,height,45))


perforated_insert("Shelf1",225,True)
shelf = perforated_insert("Shelf2",414)
third = bpy.data.objects.new("Shelf3",shelf.data)
bpy.context.collection.objects.link(third)
third.location = pos(0,603,45)

# Moving groups. With Blender's Z-up/exported glTF Y-up, positive rotations
# open toward the operator. All parts follow a hinge-centered local origin.
outer = group("OuterDoorPivot",(309,465,329))
inner = group("GlassDoorPivot",(253,454.5,304))
for y in [177,731]:
    box("OuterHingeBracket",(303,y,307),(27,28,42),back,2)
    cyl("OuterHingePin",(309,y,329),5,43,"y",rack)
for y in [188,727]:
    box("GlassHingeBracket",(252,y,297),(24,27,17),rack,2)
    cyl("GlassHingePin",(253,y,304),4,33,"y",rack)
    box("GlassHingeLeaf",(242,y,306),(32,20,6),rack,2,inner)
box("SingleGlassPanel",(0,454.5,304),(505,643,6),glass,2.8,inner)
box("GlassLatchPlate",(-243,456,309),(21,42,7),back,2,inner)
cyl("GlassLatchPivot",(-245,456,315),8,11,"z",rack,inner)
box("GlassLatchHandle",(-263,456,322),(47,10,9),black,3,inner)
box("OuterDoorPanel",(0,465,340),(629,870,66),paint,12,outer)
box("InnerDoorLiner",(0,465,306),(600,836,3),liner,1.4,outer)
ring("OuterDoorGasket",(618,848,12,465),(597,827,10,465),300,306,black,outer)
box("FasciaHousing",(15,724,381),(475,124,24),graphite,7,outer)
box("InstrumentBadge",(-62,724,393.15),(252,60,1.0),liner,.45,outer)
word("BadgeBrand","Thermo",(-169,724,393.75),28,red,outer)
word("BadgeMaker","S C I E N T I F I C",(-167,710,393.75),8,ink,outer)
# Quad facing +z; simple 0..1 UV mapping for a viewer-generated live panel.
display = mesh("DisplayFace",[(-72,-45,0),(72,-45,0),(72,45,0),(-72,45,0)],[(0,1,2,3)],blue,(130,724,395),outer)
uv=display.data.uv_layers.new(name="UVMap")
for i,xy in enumerate([(0,0),(1,0),(1,1),(0,1)]):
    uv.data[i].uv=xy
box("OuterDoorGrip",(-287,724,360),(59,126,57),graphite,10,outer)
word("FrontModelBadge","HERAcell VIOS 160i",(100,113,373.2),13,ink,outer)
word("FrontModelSubline","CO2 INCUBATOR",(159,104,373.2),6,ink,outer)
cyl("PowerRocker",(-318,65,238),8,1,"x",black)

# Rear electronics module protrudes behind the jacket. Selected configuration
# has a single gas inlet; optional O2/manifold cartridges are omitted.
box("RearServiceBox",(-88,485,-350),(301,748,90),back,5)
for i in [-1,1]:
    for y in [140,827]:
        cyl("CoverFastener",(-88+i*138,y,-395),2.4,.4,"z",rack)
strip_array("RearVentSlots",[(-220+i*16,y,-395.10) for i in range(17) for y in (145,180,785,820)],(5,26,.15),inset)
box("RearIDPlate",(-88,624,-395.11),(200,104,.10),edge)
for title,text,y,size in [('Name','HERAcell VIOS 160i',634,10),('Type','CO2 INCUBATOR   /   120 V',611,6)]:
    label = word("RearPlate"+title,text,(-4,y,-395.18),size,ink)
    label.rotation_euler.z = PI
# Looking at the back, the standard connectors are on the module's right edge.
for name,xyz,r,length,m in [
    ("GasBulkhead",(65,585,-349),12,10,brass),
    ("GasFilter",(83,585,-349),12,27,edge),
    ("CO2Inlet",(103,585,-349),5,17,brass)]:
    cyl(name,xyz,r,length,"x",m)
for name,y,w,h in [("USB",442,14,12),("Alarm",365,20,36),("Mains",186,32,24)]:
    box(name+"Flange",(63,y,-351),(4,h+6,w+6),black,1)
    box(name+"Socket",(65.5,y,-351),(1,h,w),inset)
for y in [365,186]:
    for dy in [-5,5]:
        box("ContactPin",(67,y+dy,-353),(2,2,5),rack,.5)

# Embed provenance and frame information with the standalone asset.
bpy.context.scene.name = "Thermo Scientific HERAcell VIOS 160i"
bpy.context.scene['catalog_number'] = "51030285"
bpy.context.scene['equipment_id'] = "07-02"
bpy.context.scene['geometry_source'] = "Original reconstruction; Thermo Scientific manual 50162755, March 2020, pp. 3-2, 3-4, 3-11, 3-13, 4-10 and 11-2"
bpy.context.scene['coordinate_frame'] = "metres; +X operator right, +Y up, +Z front"
for hinge in (outer, inner):
    hinge['motion'] = "Positive glTF Y rotation opens the door; hinge placement estimated"
for name in ('Shelf1','Shelf2','Shelf3'):
    bpy.data.objects[name]['nominal_footprint_mm'] = [423, 465]
# Closed state is the exported neutral pose. No offline texture dependency.
bpy.context.scene.render.engine = 'CYCLES'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'heracell-vios-160i.glb'),export_format='GLB',
                          export_yup=True,export_apply=True,export_extras=True,export_cameras=False,
                          export_lights=False,export_animations=False)


def make_plates():
    """Optional raster plates, sampled directly from this scene and labeled."""
    import tempfile
    from bpy_extras.object_utils import world_to_camera_view
    from PIL import Image, ImageDraw, ImageFont, ImageFilter

    scene = bpy.context.scene
    scene.cycles.samples = 28
    scene.cycles.use_denoising = False
    scene.render.resolution_x = 870
    scene.render.resolution_y = 660
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.81,.84,.85,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .64
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'

    def area(name, coords, aim, power, size):
        data = bpy.data.lights.new(name, type='AREA')
        data.energy = power
        data.shape = 'DISK'
        data.size = size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = pos(*coords)
        obj.rotation_euler = (pos(*aim)-obj.location).to_track_quat('-Z','Y').to_euler()

    area("Key", (-1100,1800,1500), (0,450,20), 95,1.3)
    area("Rim", (1000,1650,-800), (0,450,0), 75,1.0)
    area("Fill", (800,750,1500), (0,450,-150), 30,.75)
    data = bpy.data.cameras.new("PlateCamera")
    data.type = 'ORTHO'
    data.clip_start = .005
    camera = bpy.data.objects.new("PlateCamera", data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera

    def font(size):
        try:
            return ImageFont.truetype("DejaVuSans.ttf",size)
        except OSError:
            return ImageFont.load_default(size=size)

    configs = [
        ('front', 'Closed instrument', (-970,975,2150),(0,450,20),1.28,0,0,
         [('iCan touchscreen',(132,725,395),'LCD at the right of the fascia.'),
          ('Outer grip',(-286,724,387),'Separate grip at the left edge.'),
          ('Painted outer door',(120,350,373),'Single full-height front panel.')]),
        ('chamber','Sample loading area',(-170,1080,2400),(160,448,105),1.56,137,113,
         [('Shelf stack',(0,414,225),'Three perforated steel inserts.'),
          ('Glass latch',None,'Single pane pivots on the right.'),
          ('Reservoir cover',(-95,161,225),'Prefilter at the front edge.')]),
        ('rear','Rear service interface',(1300,970,-2000),(-12,453,-30),1.36,0,0,
         [('Control box',(-113,670,-395),'Vented rear electronics cover.'),
          ('CO₂ connection',(103,585,-349),'Single inlet and filter.'),
          ('Mains inlet',(66,186,-349),'Below USB and alarm contacts.')]),
    ]
    with tempfile.TemporaryDirectory() as temp:
        for slug,title,eye,aim,scale,oa,ia,labels in configs:
            requested = [arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--plate=')]
            if requested and slug not in requested:
                continue
            scene.cycles.samples = 56 if slug == 'chamber' else 28
            outer.rotation_euler.z = math.radians(oa)
            inner.rotation_euler.z = math.radians(ia)
            # Nominal illustrative values for the reference plate only.
            plate_text = []
            if slug=='front':
                plate_text.extend([word("PlateTemperature","37.0  °C",(78,731,395.15),23,paint,outer),
                                   word("PlateGas","5.0   %",(78,702,395.15),23,paint,outer)])
            camera.location = pos(*eye)
            camera.rotation_euler = (pos(*aim)-camera.location).to_track_quat('-Z','Y').to_euler()
            data.ortho_scale = scale
            bpy.context.view_layer.update()
            corners = [obj.matrix_world @ Vector(v) for obj in scene.objects
                       if obj.type == 'MESH' for v in obj.bound_box]
            projected = [world_to_camera_view(scene,camera,v) for v in corners]
            x0,x1 = min(p.x for p in projected),max(p.x for p in projected)
            y0,y1 = min(p.y for p in projected),max(p.y for p in projected)
            aspect = scene.render.resolution_x / scene.render.resolution_y
            delta = Vector((((x0+x1)/2-.5)*scale, ((y0+y1)/2-.5)*scale/aspect, 0))
            camera.location += camera.rotation_euler.to_matrix() @ delta
            data.ortho_scale = scale * max((x1-x0)/.88, (y1-y0)/.80)
            bpy.context.view_layer.update()
            scene.render.filepath = str(Path(temp)/(slug+'.png'))
            bpy.ops.render.render(write_still=True)
            src = Image.open(scene.render.filepath).convert("RGBA")
            if slug == 'chamber':
                src = src.filter(ImageFilter.MedianFilter(3))
            paper = (241,239,231)
            pic = Image.new("RGB",(1210,710),paper)
            pic.paste(src,(5,42),src)
            draw = ImageDraw.Draw(pic)
            dark = (31,49,52)
            teal = (39,94,99)
            draw.line((31,58,1177,58),fill=(168,177,169),width=1)
            draw.text((31,18),'HERAcell VIOS 160i     /     '+title,font=font(23),fill=dark)
            draw.text((1177,21),'07-02',font=font(18),fill=teal,anchor='ra')
            for i,(label,xyz,desc) in enumerate(labels,1):
                point = pos(*xyz) if xyz is not None else bpy.data.objects["GlassLatchHandle"].matrix_world.translation
                q = world_to_camera_view(scene,camera,point)
                ax,ay=round(5+870*q.x),round(42+660*(1-q.y))
                # Offset adjacent to the target to keep the feature visible.
                offset = [(19,-17),(-17,-20),(20,17)][i-1]
                cx,cy=ax+offset[0], ay+offset[1]
                draw.line((ax,ay,cx,cy),fill=teal,width=2)
                draw.ellipse((cx-15,cy-15,cx+15,cy+15),fill=teal,outline=paper,width=2)
                draw.text((cx,cy),str(i),font=font(15),fill="white",anchor='mm')
                y=225+(i-1)*96
                draw.text((850,y),str(i).zfill(2),font=font(16),fill=teal)
                draw.text((890,y-4),label,font=font(20),fill=dark)
                draw.text((890,y+26),desc,font=font(14),fill=dark)
            draw.text((31,674),"Original rendering  /  51030285  /  dimensions in model notes",font=font(14),fill=teal)
            pic.save(OUT/(slug+'.webp'),quality=90,method=6)
            for obj in plate_text:
                bpy.data.objects.remove(obj,do_unlink=True)


if '--plates' in sys.argv:
    make_plates()
