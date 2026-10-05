# Device model collection

Models: Utah 10 × 10 / 1.5 mm, USEA 10 × 10 / 0.5–1.5 mm,
Neuropixels 1.0, Synchron Stentrode, Paradromics Connexus and Neuralink N1.
Each definition carries its own revision. Catalog and legacy design URLs use
the same viewer. `/devices/models/` indexes the models.

## Source and geometry contracts

`src/lib/devices/catalog.js` holds variant-specific dimensions, evidence links,
approximation notes and deterministic contact coordinates. Do not derive meshes
from free-text Markdown ranges or equate physical sites with simultaneous channels.
`src/lib/devices/geometry.js` builds Three.js groups. Coordinates are millimeters,
right-handed, with insertion along +Z. Utah's origin is the center of the
tissue-facing substrate surface; the substrate occupies negative Z. NP's origin
is the shank base. NP contacts face -Y. Utah sites identify the apex, not the
unknown exposed-contact centroid. No electrical channel assignments are invented.

JSON exports preserve unknown area/channel values as null. GLB exports scale the
millimeter mesh by 0.001 to glTF-standard meters, omit the viewer grid and lights,
and include the complete model even when Contacts only is selected. GLB metadata
includes device ID, revision, site count, fidelity notes and source URLs. Models have
no electrical or tissue-response semantics. Existing cortex and peripheral
simulation behavior is unchanged; future adapters must transform coordinates,
select actual channels and supply validated contact/electrical parameters.

## Evidence reviewed (2026-10-03)

- Blackrock Utah: https://blackrockneurotech.com/products/utah-array/
  400 µm pitch; 4 × 4 × 0.2 mm substrate; choose the 1.5 mm variant.
  Manufacturer photograph https://blackrockneurotech.com/wp-content/uploads/Array-edges-e1691617416409.jpg
  confirms the regular grid and lateral wire exit. Leads are omitted.
- Blackrock Slant: https://blackrockneurotech.com/products/slant-array/
  Feature prose gives 100 electrodes and a linear 0.5–1.5 mm range; table gives
  configurable 0.75–1.5 mm lengths and 16–96 channels. These are not one universal
  specification. Use the explicitly named 0.5–1.5 mm reference configuration,
  leave channel assignment unknown, and label the family substrate assumption.
  Manufacturer side-view rendering https://blackrockneurotech.com/wp-content/uploads/2023/04/1-Slant_Array_Electrode_Longevity_Array.png
  guides slender shafts and pointed tips; it is a rendering, not dimensional metrology.
- Neuropixels https://www.neuropixels.org/probe1-0 gives 960 sites, 384 channels,
  10 mm length, and 70 × 24 µm cross section.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/ compares generations.
  https://allenswdb.github.io/background/neuropixels-description.html describes
  12 µm square sites and four staggered column positions. Its ~3.8 mm span refers
  to a 384-site selection, not all 960 sites (480 rows at 20 µm span 9.58 mm).
  Product photograph at https://www.neuropixelscentral.org/neuropixels1 distinguishes
  the narrow shank from external electronics/flex. Only the shank is modeled.

All reference images were inspected externally, not redistributed. No image-derived
measurement is presented as published. Utah shaft radius/tip exposure and NP tip
outline/first-site offset are illustrative; see per-model notes. NP 1.0 site area
and thickness in the catalog were corrected, and erroneous stimulation tags removed.

## Validation and extension

Run `node tests/device-geometry.mjs` and `npm run build`. Geometry checks verify
physical counts, unique IDs, pitches, NP stagger/site area, mesh extents and JSON.
The viewer loads Three.js only on hydration, renders on interaction (no continuous
animation), provides keyboard-operable view/zoom buttons, observes container resize,
and disposes GPU resources. JSON and source links remain available without WebGL.

For additional devices, add a named variant with cited dimensions and uncertainty,
then implement its geometry family and tests. Keep unknown dimensions explicit.
Prioritize documented ECoG grids and cuffs before flexible threads, endovascular
stents or proprietary packaging with incomplete geometry.


## Stentrode addition (2026-10-04)

Selected configuration: Kacker et al., J Neural Eng 22 (2025) 026036,
section 2.2: 16 platinum contacts, 500 µm diameter, nominal 8 × 40 mm
nitinol scaffold, approximately 3 mm interelectrode spacing.
https://pmc.ncbi.nlm.nih.gov/articles/PMC11956166/
The full author manuscript was read from the University of Melbourne repository:
https://minerva-access.unimelb.edu.au/server/api/core/bitstreams/57a1e343-1a2d-4651-9380-1957524f0a05/content
Figure 1 and Synchron's electrode close-up at https://synchron.com/research
were visually inspected. The latter shows a circular contact at a scaffold junction;
neither supplies a manufacturing drawing or an exact 16-contact coordinate map.

The mesh uses a cylindrical diamond lattice with 20 axial intervals and six
nodes per circumference, alternating by 30 degrees. The illustrative 16-site
strip follows successive nodes from Z=4 to Z=34 mm, alternating azimuths 0/30
degrees. Its face centers are approximately 2.91 mm apart; this is an
illustration of the reported spacing, not reverse-engineered contact placement.
80 µm round struts and 50 µm contact thickness are explicitly assumed. Real
strut cross sections, junctions, wiring, insulation, lead and chest telemetry
are not reproduced. The nominal scaffold is not a patient-specific deployed shape.
Coordinates use proximal-end center origin and longitudinal +Z, with outward
radial normals. JSON contact area is a derived circular face area, not measured
electrochemical area; electrical channel maps remain null.

Do not merge inconsistent reports: SWITCH (2023) gives 0.3 mm² surface area;
a 500 µm disk gives ~0.196 mm². Schone et al.'s 2025 medRxiv preprint reports
300 µm diameter instead. Each is linked in the viewer; this model specifically
uses the Kacker configuration and is not asserted to represent current production.

The viewer fits the 40 mm structure, expands its zoom range and adds an end-on
view. Checks cover 16 contacts, cylindrical extent, radial normals, disk face
centers, assumed spacing, contact area and complete GLB/JSON export.

## Connexus, N1 and Stentrode revision 2 (2026-10-05)

Primary references and image URLs are stored with each model and shown in the
viewer. Catalog briefs document the selected revisions and preserve existing URLs.

### Paradromics Connexus

The product page gives 421 wires at 1.5 mm insertion depth; the January 2026 SfN
blog gives 300 µm spacing. The 2024 durability article describes a roughly 1 cm
circular package, corroborated by its photograph. The 2023 company presentation
in the BIS slide deck (slide 71, visually inspected) describes <40 µm PtIr wires
but shows a DIFFERENT square package labeled 9 mm. Do not treat that old package
dimension as the diameter of the later circular module.

The reconstructed square lattice includes integer points x²+y² <= 130 (421
points), scaled by 0.3 mm. This gives a deterministic, centered circular boundary;
it is not a released manufacturer contact map. All apices are at Z=1.5 mm.
Nominal package diameter 10 mm, illustrative thickness 1.5 mm, ceramic-face
diameter 8 mm, 40 µm shaft visualization bound and 80 µm tip highlights are
explicitly separated from the reported count/pitch/depth. Exposed areas stay null.
The brief also replaces obsolete acute-only language with the June 2026
Connect-One implantation announcement and retains investigational status.

### Neuralink N1, 2024 64 × 16 reference

The April 2024 PRIME update and its exploded illustration establish the selected
revision. DJ Seo's first-person engineering interview in Lex Fridman #438 provides
200 µm site pitch (02:03:33), quarter-sized / approximately 9 mm enclosure
(02:07:03), 16–84 µm thread widths (02:08:58) and a 2 + 0.4 + 2 µm stack
(02:12:48). The modeled thickness is the derived 4.4 µm sum. UCLH's July 2025
description instead gives 128 × 8; the model never presents 64 × 16 as universal.

The fan is a display pose. Each thread follows a smooth curve from the housing
to a straight distal section, with 16 sites at 0.2 mm pitch (3 mm center span).
Fan spacing, length, bends and taper progression are illustrative. Housing
diameter is a nominal 24 mm interpretation of the coin comparison. The 12 × 20 µm
gold rectangles are visualization markers, not measured electrode dimensions;
contactAreaMm2 remains null. JSON supplies thread/contact indices and normals,
and explicitly says these are not implanted coordinates. No internal traces,
microfabricated insertion loops or package internals are fabricated as fact.
Visual pad meshes have a 10 nm normal offset to avoid coplanar surface artifacts
in the software renderer; JSON coordinates remain on the nominal thread surface.
The mesh records this display offset in its metadata.

### Synchron revision 2

Revisited Kacker section 2.2 and Figure 1, plus Synchron's full-resolution
contact close-up. Flat, curved struts and annular contact mounts replace the
round-wire scaffold. The 80 × 40 µm strut section, 680 µm mount diameter,
50 µm contact thickness and short 12 × 0.5 mm proximal lead remain illustrative.
The nominal scaffold remains 8 × 40 mm. The lead extends beyond that scaffold;
its length is not a claim about the clinical cable. The original reconstructed
staggered map remains explicit; outward disk centers now account for half the
flat strut thickness. Kacker's 16 physical sites include one common reference,
leaving 15 referenced signals; the exact assignment is unknown.

### Viewer and validation

All six models use the same lazy-loaded viewer and complete JSON/GLB exports.
Camera fitting derives from mesh bounds, including lead stubs and enclosures.
New face, microwire, thread and contact views are camera crops only. Shared mesh
resources keep dense arrays small; all materials and geometries are disposed.
If WebGL initialization fails, the viewer dynamically loads Three.js SVGRenderer
and projects the same mesh with software shading. Rotation, view buttons, site
visibility and full GLB export remain available. SVG overdraw is disabled to
avoid enlarging thin structures in screen space. The status identifies this mode.
Checks cover exact counts, pitch, centered Connexus footprint, N1 thread grouping,
null unknown areas, finite mesh attributes, scaffold versus lead extents, JSON
round trips and complete meter-scaled GLB export while bodies are hidden.
