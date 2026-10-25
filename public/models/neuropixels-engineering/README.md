# Neuropixels 1.0 — 3D reconstruction package

Revision BTS-NPX1-R1 · 25 October 2026 · BuildTheSimulation

## Start here

Open **neuropixels-3d-viewer.html** in a desktop browser with WebGL 2 enabled. The viewer is self-contained: geometry, materials, textures and the first drawing sheet are embedded. No server, installation or internet connection is needed. An attachment preview that blocks JavaScript is not the viewer; save the HTML and open it in the browser itself.

Drag to orbit; scroll to zoom; Shift-drag or right-drag to pan; double-click to reset. The inspection presets jump directly to the connector, complete shank, tip, electrode array and high-resolution pore study. On a narrow screen, use Controls to reveal the panel. The Reference assembly variant has a Full flex + terminal toggle. Export GLB exports the currently selected model; Pores exports the isolated high-resolution contact. Save view exports the canvas, without surrounding UI or dimension overlay.

## Two deliberately different full-device models

**Drawing-matched study** reproduces the head silhouette, gold-coloured contact fingers, lateral pads and fanout from the supplied generated illustration. Its shank uses documented nominal Neuropixels 1.0 dimensions. The head is an illustration-derived concept, not a verified Neuropixels connector. The earlier generated drawing is not a calibrated photograph or a manufacturer drawing.

**Reference assembly** uses manufacturer-published probe-base, SMD-base, silicon-cap and flex-envelope dimensions. Small components, epoxy outlines, conductor routes, relative placements and the terminal outline are reconstructed, not reverse-engineered manufacturer CAD. The 45-contact terminal is inferred from the documented mating interface; terminal pitch and pad dimensions are assumptions. Gold colour does not certify a metallization stack.

Both full-device variants share exactly the same shank geometry, 960 contact instances, four-column staggered lattice and reconstructed distal reference electrode. The assembly's flex has a 39.5 mm circular-arc centreline; it is not arbitrarily stretched to fill the view. The terminal flare is reconstructed and should not be treated as a manufacturer specification.

## Included files

| File | Purpose |
|---|---|
| `neuropixels-3d-viewer.html` | Self-contained interactive viewer; light/dark palettes, orbit/pan/zoom, wireframe, evidence display, GLB export and embedded drawing sheet. |
| `models/neuropixels-blueprint-study.glb` | Drawing-matched head with the documented nominal shank and 960 sites. |
| `models/neuropixels-reference-assembly.glb` | Package-envelope reconstruction, populated electronics region, flexible interconnect and terminal contacts. |
| `models/neuropixels-shank.glb` | Shared shank and all contacts, without either proximal package. |
| `models/neuropixels-electrode-detail.glb` | Isolated 12 × 12 µm contact with 52,482 triangles and procedural microrelief. |
| `models/neuropixels-shank-envelope.step` | Nominal silicon shank as a valid CAD solid. |
| `models/neuropixels-shank-with-sites.step` | Same CAD solid plus 960 square pad solids; groove and pore detail deliberately omitted. |
| `models/neuropixels-shank-envelope.stl` | Nominal shank surface; STL coordinates are in mm. |
| `drawings/neuropixels-technical-drawings.pdf` | Two landscape A3 engineering-reference plates. |
| `drawings/*.svg` and `drawings/*.png` | Editable vector annotation plates with embedded actual-model renders, plus raster counterparts. |
| `electrode-coordinates.csv` | All 960 geometric site identifiers and centre coordinates in µm. Not an electrical channel map. |
| `specification.json` | Documented dimensions, explicit reconstruction assumptions and source URLs. |
| `source/` | Reproducible builders, standalone viewer source, renderer and validation scripts. |
| `validation/` | Model checks, CAD round-trip checks, browser interaction checks and screenshots. |

## Scale and coordinate conventions

The builder uses **millimetres**. Each GLB includes a root scale of 0.001 to produce physical **metres** in the exported scene. The viewer converts the scene back to millimetres for numeric camera control. STEP coordinates and STL coordinates are millimetres. STL does not carry a reliable intrinsic units declaration: select mm when importing it.

The distal tip is at (0, 0, 0). X is transverse, Y runs proximally from the tip toward the package, and positive Z points toward the recording surface. The nominal shank extends from Y = 0 to 10 mm, has X bounds ±0.035 mm, and Z bounds ±0.012 mm. Recording sites are on the positive-Z face.

The first contact centre is at Y = 0.200 mm **by assumption**. Two sites occur in each of 480 rows, with 0.020 mm row pitch. The alternating pairs of X coordinates are (-0.024, 0.008) and (-0.008, 0.024) mm. This preserves a 0.016 mm four-column lattice, a staggered pattern and 0.012 mm square footprints. Absolute lateral centring and channel identity are not authenticated against a manufacturer mask layout.

## Fidelity boundaries

Documented nominal values include the 10 mm shank length, 70 × 24 µm cross-section, 175 µm tip length, 960 selectable recording sites, 384 parallel channels, 12 × 12 µm sites, 16 µm column pitch and 20 µm row pitch. The manufacturer also documents porous TiN contacts, silicon-nitride frontside material and silicon-dioxide backside material.

The straight symmetric taper implemented here follows the nominal 70 µm width and 175 µm length. These imply a 22.62° included angle; the datasheet's approximately 20° value was not imposed as a contradictory exact constraint. Actual tip rounding and detailed etch profile are not measured.

Five grooves on each contact are inspired by the manufacturer SEM. Their widths, lengths and depths are assumptions. Every contact has explicit shallow relief, modeled grooves and an embedded normal texture. The isolated microdetail contact uses a higher-resolution mesh. Groove occlusion is a visual shading estimate. Pore size, pore density, porosity and surface area are **not measured**. There is no subsurface pore-network model, no electrochemistry, and no claim that normal-map detail is physically resolved mesh geometry at every scale. The detail view is a reusable illustrative contact, not a unique scan of one of the 960 actual sites.

Internal CMOS geometry, buried interconnects, dielectric-layer thicknesses, package netlists, coating thicknesses and manufacturing tolerances are not reconstructed. The transverse drawing section uses the CAD outer envelope and labels surface materials without inventing a layered stack.

**These are reference and visualization models. They are not manufacturer CAD, fabrication-ready parts, implant specifications, medical-device design approval, or validation of biological/electrical function.**

## Drawing sheets

Sheet 1 rebuilds the six-view composition: isometric, front, side, tip, electrode array and transverse section. The head is explicitly labeled as the drawing-matched concept. Sheet 2 shows the reference assembly, proximal package and high-resolution contact surface.

All shaded views are raster renders of the delivered meshes, with vector text, leaders, dimensions and rules. They are not independent generative illustrations. Cross-section dimensions are read from the round-tripped CAD bounds. Separate scale bars distinguish view magnifications; do not infer fabrication dimensions by measuring a resized screenshot.

## Verification performed

`validation/model-validation.json` records 45 summary checks, including contact count and uniqueness, row count and pitch, alternating columns, site containment, finite geometry, unit normals, index bounds, binary-buffer bounds, physical scene scale, independent GLB import, watertight assembled shank, nominal mesh volume and CAD agreement. Its 1,024 individual assertions include repeated per-buffer range checks and are not 1,024 independent scientific validations.

`validation/cad-checks.json` records valid STEP solids before and after export/import. The round-trip dimensions are 0.070 × 10.000 × 0.024 mm; volume is 0.016653 mm³ within numerical precision.

`validation/browser-validation.json` records 24 offline interaction checks: initialization, eight inspection views, assembly/flex switching, 960 site nodes, orbit/zoom/pan, wireframe, evidence overlay, theme switching, binary GLB download, embedded drawing display, source panel, narrow-screen layout and no JavaScript errors or external asset requests. Tests used Chromium with software OpenGL. The generated HTML was loaded into a browser DOM with networking disabled. Direct file:// navigation is disallowed by the test environment's policy and was not tested there.

These are software and geometric-consistency checks, not manufacturer metrology or scientific validation of tissue interaction, impedance, insertion mechanics or fabrication.

## Rebuilding

The browser viewer has no third-party runtime dependencies. The offline builders use Python with NumPy, SciPy, Pillow, Shapely, CadQuery, trimesh, CairoSVG, PyMuPDF and Playwright. See `source/requirements.txt` for versions used. Fonts are system fallbacks; no font files are included.

Typical sequence, from this directory:

```sh
python source/build_model.py
python source/build_cad.py
python source/build_viewer.py
# A Chromium installation with WebGL 2 is required for the next command.
python source/render_views.py
python source/build_drawings.py
python source/build_viewer.py
python source/validate_models.py
python source/test_final_viewer.py
```

The browser test scripts use `/usr/bin/chromium` and headed rendering. On a headless Linux machine, provide an X server such as Xvfb and an appropriate DISPLAY. Adapt the executable path to the locally installed browser. `build_model.py` is the editable geometric source; generated `specification.json` is its provenance manifest, not a separately consumed model configuration.

## Website integration

The HTML can be served as a static page as-is. GLB models are independent assets for an existing 3D viewer. Preserve the root transform on import so scale is not lost. Use the shared contact mesh with instancing when integrating into a larger simulation. The included viewer groups repeated geometry into instanced GPU draws. Avoid making 960 independent copies of the contact vertex buffer.

Keep the documented/assumed distinction visible. Do not rename the drawing-matched concept as verified production hardware. No website files, GitHub repository or deployment were changed by this package.

## Sources

1. imec, *Neuropixels 1.0 — Fully-integrated CMOS digital neural probe*, 13 February 2020, especially pp. 3–4. Manufacturer-authored document, distributor-hosted copy: https://www.bio-signal.com/static/upload/file/20240927/1727441617543747.pdf
2. Neuropixels official support and design files: https://www.neuropixels.org/support
3. Neuropixels 1.0 manufacturer product imagery and SEM: https://www.neuropixels.org/probe1-0

Neuropixels and manufacturer names are used descriptively. This is an independent reconstruction with no claim of manufacturer endorsement. Manufacturer photographs are not embedded in the model textures.
