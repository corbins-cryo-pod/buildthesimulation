# OX-16 | Stent-electrode foundry companion

**Website artifact:** `index.html`. It is self-contained and opens offline with no external requests. Hyperlinks to the Build The Simulation hub and the primary publications are optional navigation, not runtime dependencies. No clinical, surgical, patient-facing, manufacturing-control, or vendor-interface software is included.

## What this represents

Oxley et al., [Nature Biotechnology, 2016](https://doi.org/10.1038/nbt.3428), Figure 2c and “Stentrode fabrication,” specify a pictured eight-disc research implementation, a nominal bought 3 mm diameter/31.1 mm long self-expanding scaffold, 750 µm diameter/50 µm thick Pt discs and insulated Pt/W wires with 25 µm conductor cores. The authors describe a resistance weld, attachment near crosslinks, route along the scaffold and upstream acquisition hardware. This is one research example. Individual strut dimensions, detailed CAD, angular site positions, fixture pin numbers, alloy properties, joining qualifications and as-built process calibration have not been recovered.

The lab preserves the source dimensions and procedure sequence at operation-class level. The electronics fixture is a deliberately transparent substitute, not reverse-engineered circuitry. The comparison drawer distinguishes [SWITCH 2023](https://doi.org/10.1001/jamaneurol.2022.4847), [Kacker et al. 2025](https://pubmed.ncbi.nlm.nih.gov/40048825/), and the [independent Nankai program](https://en.nankai.edu.cn/2025/0911/c22796a577326/page.htm). No later human system can be accidentally “manufactured” by selecting a 16-site preset. No part of the site uses a patient waveform or implies fabrication of working medical hardware.

## Run the reference

1. Open the HTML, step through the eight specimen states, or choose **Jump to finished fixture**.
2. Capture the nominal baseline. Select a physical disc and try an open joint, frame short, adjacent wire bridge or proximal swap.
3. A short to the scaffold can preserve the intended diagonal while failing the frame column. Adjacent bridge and swap both reduce the count of correctly connected pins from eight to six; inspect off-diagonals and extra paths to tell them apart. D8's next neighbor wraps to D1.
4. Set an electrical fault to none and mask half of one face by moving the obstruction to 50% of the diameter. Dry continuity remains 8/8 and exposed area becomes 0.2209 mm². The 95%-visible aperture criterion is an illustrative design gate, not a measured or clinical specification.
5. Inspect a different disc. This changes neither where the fault is nor which disc is occluded. Change the virtual diameter to see a geometry-only result; there is no constitutive law, radial force, fatigue or deployment prediction.
6. Compare with baseline and export a complete JSON traveler, pin × (8 discs + frame) CSV, or true-scale OBJ. JSON includes inputs, graph, area by physical disc, assumed site centers, data provenance and baseline difference. For stages before audit the pass count is null, not zero. The OBJ only becomes available when the assembly enters the mandrel fixture. The OBJ uses millimetres, not presentation-view exaggeration.

### Geometry model

Choose `K=12` axial intervals and `M=8` azimuth phase divisions. Vertices exist when row and phase parity match; the finite cylinder has **52 vertices and 96 edges in one connected scaffold**. The eight physical disc illustrations occupy one assumed crossing per selected row. Unit elevation/azimuth are not recovered manufacturer coordinates.

With nominal `L0=31.1 mm` and `D0=3 mm`, let `x0=L0/K`, `b(D)=πD/M`, and `s=√(x0²+b(D0)²)`. For an illustrative constrained diameter D from 1–3 mm use `L(D)=K√(s²−b(D)²)`. The preserved quantity is the diagonal in the **unwrapped** cylindrical metric, not a volumetric strut, beam or force calibration. The actual research stent is not a frictionless diamond linkage. The 12-interval choice is not a claim that every source crosslink repeats exactly at `31.1/12 mm`: the paper separately reports approximately 2.5 mm crosslink spacing.

For disc radius `r=0.375 mm` and straight-edge obstruction depth `h∈[0,2r]`, covered face area is
`r² acos((r−h)/r) − (r−h)√(2rh−h²)`. Only the outer planar exposed face is considered, not lateral or roughness-increased electrochemical area. Aperture and electrical integrity are deliberately independent.

The 3D export uses one group of centerlines rather than asserting an unknown strut width. Each of eight discs has 36 rim segments and a tangential placement with its nominal thickness. The optional obstruction is an explicitly labeled witness surface with a numerical plotting offset, not an inferred material thickness. The exports contain no fabricated “true” wire path.

### Circuit model

The undirected graph contains eight test pins, eight wire bodies, eight discs and one frame. Numbering and baseline topology are teaching assumptions. Breadth-first traversal yields reachable pins, discs and frame. A pass requires the nominally assigned disc and no other disc, no other connector pin and no frame. Positions and camera rotation cannot change connectivity. The graph expresses reachability, not a resistance value, leakage current, EIS spectrum, electrical stimulation or neural response.

### Register handoffs

- Register 12-01, 08-10 and 16-13 illustrate inspection, dispensing and connector families. A registered dispenser does not imply a qualified UV cure unit.
- The specified resistance micro-welder is **external**. 08-08 is a package seam-welding reference, not its replacement. A candidate laser entry (04-10) is not automatically qualified for the source discs.
- The actual nitinol scaffold is a supplied component, not a wafer-fabrication step in this lab.
- 14-01 and 09-03 are schematic bench classes for inert fixture/metrology; equivalence to the original instrumentation is not claimed.

## Rebuild and verification

```sh
python build.py
node tests/engine.cjs
CHROME_BIN=/path/to/chrome python tests/browser.py
blender -b -noaudio --python tests/obj_blender.py
```

The model/browser implementation uses no CDN, framework or external package. Tests require Node; browser tests require Python Playwright and local Chromium; Blender checks are optional. Test evidence and two OBJ witnesses are in `validation/`.

- 57 numerical/control/topology assertions passed: 41 mandrel samples; 101 aperture complements; all eight target sites for four electrical defects; stage gating; geometry export; and graph connectedness.
- 22 end-to-end browser assertions per viewport passed in desktop Chromium and touch-emulated iPhone 13 Chromium, including all stations, real download contents, preserved baseline, target vs selection, no root overflow and no external request. Mobile emulation is not physical Safari verification.
- Blender 4.3.2 imported both OBJ exports using its stock OBJ importer at millimetre scale, checked each true 0.75 mm disc diameter, 52 frame vertices and 96 centerline edges; then saved and reopened the native nine-object reference. `validation/OX-16-editable-reference.blend` uses metres with millimetre display and notes the assumptions inside the file.
- All SVG and meshes were generated for this lab. Published figures and proprietary assets are not redistributed.
