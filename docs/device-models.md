# Device model collection, revision 1

First pass: Utah 10 × 10 / 1.5 mm, USEA 10 × 10 / 0.5–1.5 mm,
and the Neuropixels 1.0 recording shank. Catalog and legacy design URLs use
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
and include the complete model even when Contacts only is selected. Models have
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
centers, assumed spacing, contact area and complete GLB/JSON export. Browser
visual verification remains unavailable in this environment.
