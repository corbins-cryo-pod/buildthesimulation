# HERAcell VIOS 160i • geometry notes

Record 07-02 uses Thermo Scientific catalog 51030285, a single 120 V chamber with a TC180 thermal-conductivity CO₂ sensor, stainless interior, standard unsegmented glass door and three inserts. The illustrated white cabinet has a separate insulated outer door. Thermo’s brochure identifies this catalog configuration on printed page 16. The stock number selects the sensor, chamber and electrical configuration. The photo and manual supply the external form.

## Scale and kinematics

The GLB uses metres. Viewed from the front, +X points right, +Y points up from the foot plane and +Z points out toward the operator. The model origin lies on the floor beneath the cabinet centre in plan. All pivots start closed. A positive right-handed Y rotation opens each door toward the operator.

| GLB node | Closed global position in m | Function |
|---|---|---|
| OuterDoorPivot | (0.309, 0.465, 0.329) | Moves insulated door, fascia, grip, LCD and inner liner together |
| GlassDoorPivot | (0.253, 0.4545, 0.304) | Moves glass pane, hinge leaves, handle and latch |
| Shelf1 | (0, 0.225, 0.045) | Lowest insert, with front filling cutout |
| Shelf2 | (0, 0.414, 0.045) | Middle insert |
| Shelf3 | (0, 0.603, 0.045) | Upper insert |
| DisplayFace | (0.130, 0.724, 0.395) | 0.144 × 0.090 m screen, 0–1 UV coordinates, part of the outer door |

Each shelf origin is the centre of its top surface. Right-side hinges match Fig. 3-1. The rendered chamber illustration uses outer and inner angles of 137° and 113° to expose the shelves. These are illustration settings. Pivot coordinates, available mechanical travel, rack elevations, enclosure thickness, individual hole pitch, screen and service connector dimensions are estimates from photographs and drawings. Actual mechanical travel and small-feature dimensions need measurements. Sample vessels are separate viewer objects.

## Dimension checks

`verify_geometry.py` reads vertex positions and hierarchical transforms from the exported GLB. The nominal values in the manual's specification table (printed p. 11-2, PDF p. 168) are the reference. The clearance cartoon (printed p. 2-2) separately depicts 900 mm height and 792 mm depth; the GLB follows the specification table. The ±0.5 mm envelope check allows submillimetre hardware projections. The ±0.1 mm interior and shelf checks allow for floating-point export of specified spans. These tolerances test the digital asset against nominal dimensions.

| Geometry check | Expected (mm) | GLB (mm) | Tolerance (mm) | Result |
|---|---:|---:|---:|---|
| Closed overall width × height × depth | 637 × 905 × 790 | 637.0 × 905.0 × 790.2 | ±0.5 each | Pass |
| Clear chamber width × height × depth | 470 × 607 × 576 | 470.0 × 607.0 × 576.0 | ±0.1 each | Pass |
| Footprint of each of three inserts | 423 × 465 | 423.0 × 465.0 | ±0.1 each | Pass |
| Door linkage | Outer liner and screen on outer pivot; pane on inner pivot | GLB ancestry verified | Exact | Pass |

Depth inside is from the chamber rear liner to the front face of the enclosure surround. Service assemblies, air duct, shelves and filter occupy some of that envelope. The plate perforations are modeled as openings. The mesh simplifies the detailed forming of the steel and uses one representative hole pitch. No measured scan or manufacturer CAD was available for the geometry used here.

## Illustrated comparison

All three WEBP plates are original renders from the same editable model. Numbers identify model features. The linked photographs and line drawings remain with Thermo Fisher.

| Plate | Reference viewed | Features checked by eye |
|---|---|---|
| [Front and left side](front.webp) | [Manufacturer brochure, p. 16, left unit](https://documents.thermofisher.com/TFS-Assets/LED/brochures/Heracell-VIOS-CO2-Incubator-BRCO2VIOSNA-EN.pdf#page=16) and [manual, Fig. 3-1, p. 3-2](https://www.thermofisher.com/TFS-Assets/LED/manuals/Heracell-VIOS-CO2-Incubator-User-Manual-50144132-A-EN.pdf#page=38) | Horizontal upper fascia, left-edge dark grip, LCD at the right, small lower-right nameplate and low adjustable feet. Brochure p. 3 also shows the 160i alongside the wider 250i. LCD numerals in the plate illustrate a nominal idle display. |
| [Open chamber](chamber.webp) | [Manual, Fig. 3-1, p. 3-2](https://www.thermofisher.com/TFS-Assets/LED/manuals/Heracell-VIOS-CO2-Incubator-User-Manual-50144132-A-EN.pdf#page=38), [brochure, p. 9, stainless chamber detail](https://documents.thermofisher.com/TFS-Assets/LED/brochures/Heracell-VIOS-CO2-Incubator-BRCO2VIOSNA-EN.pdf#page=9) and [manual, Fig. 4-9, p. 4-10](https://www.thermofisher.com/TFS-Assets/LED/manuals/Heracell-VIOS-CO2-Incubator-User-Manual-50144132-A-EN.pdf#page=70) | Right-hand hinges, continuous clear pane, perforated shelf surfaces, upright rails and recessed floor assembly. The manual includes optional sensor variants; the model represents the TC configuration and one CO₂ inlet. |
| [Rear and service side](rear.webp) | [Manual, Fig. 3-2, p. 3-4](https://www.thermofisher.com/TFS-Assets/LED/manuals/Heracell-VIOS-CO2-Incubator-User-Manual-50144132-A-EN.pdf#page=40) and [Fig. 3-9, p. 3-13](https://www.thermofisher.com/TFS-Assets/LED/manuals/Heracell-VIOS-CO2-Incubator-User-Manual-50144132-A-EN.pdf#page=49) | Vertical projecting service box, top and bottom rows of vent slots, side-mounted gas fitting above USB, alarm and mains interfaces. These family illustrations include options. Single-gas connector placement is approximate, and the loop-through manifold, O₂ supply and gas cylinders are omitted. |

The user manual identifies its edition as 50162755, March 2020. The brochure is BRCO2VIOSNA-EN, December 2017. Colors and markings are visual approximations. The geometry checks support placement and inspection of the specimen holders, and the door articulation used by the environmental model.

## Rebuild

Download [build_model.py](build_model.py) and run `blender -b -P build_model.py` with Blender 4.3. The GLB is generated in the same directory. Run `blender -b -P build_model.py -- --plates` to rebuild the illustrated plates (Blender with Pillow). Running `python verify_geometry.py` with NumPy checks the binary asset.
