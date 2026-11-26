# YES 310TA / 02-09

Selected EPFL CMi YES 310TA, recipe 01 HMDS only, white touchscreen-style enclosure. Stanford S09 identifies a family, not the exact model. Manufacturer 2022 brochure pp.1–2 anchors nominal 631.95 × 501.7 × 772.9 mm enclosure and 304.8 × 336.6 × 304.8 mm clear chamber. Exact tower inclusion is unspecified; modeled protrusions, chamber offsets, rack, door travel and utilities are inferred. The rear is schematic. The external comparison tray is not manufacturer equipment.

## References
- https://yieldengineering.com/wp-content/uploads/2022/12/YES-TA-Series-Brochure_112822-WEB.pdf — 2022 pp. 1–2, front oblique, dimensions and material.
- https://www.epfl.ch/research/facilities/cmi/equipment/photolithography/yes-iii-hmds-primer-oven/ — installed 310TA, 150 °C, 300 s exposure, about 15 min total, metal cassette, front photo and controller gallery.
- https://www.colorado.edu/facility/cosinc/facilities — 310TA front oblique photo; side pressure gauge and tower.
- https://nanofab.ece.cmu.edu/facilities-equipment/yes.html — older YES oven open chamber; not matching revision; generic loading context only.
- https://snfguide.stanford.edu/guide/equipment/hmds-vapor-prime-oven-yes-yes — family-level register evidence.
- https://www.nist.gov/system/files/documents/2017/05/09/NanoFabNews_v1_i4_Nov09.pdf — Nov 2009 p.2, water contact angles 10° untreated Si, 69° liquid HMDS, 81° YES vapor prime; model unspecified, comparison only.
- https://www.epfl.ch/research/facilities/cmi/process/hmds-application/ — wettability mechanism.

Photographs linked rather than republished. Reference sheet is an original schematic. No rear/orthogonal side and matching open-chamber survey found. Dimensions checked against nominal data, not physical metrology. The 152 named geometry primitives are editable, with separate door, carrier and coupon groups.

## Scientific model and limits
Abstract event model consistent with register acceptance. HMDS reduces water affinity on suitable hydroxylated surfaces. No actual adsorption, adhesion force, chemistry kinetics, gas transport, pressure, temperature field or process safety prediction. Adhesion is unknown absent a user-supplied matching material/resist/recipe peel-force calibration. Delta = after − before (N/mm); both supplied, not generated. Dehydration-only duration unknown. Contact angle is not adhesion strength. No empirical validation of this model. This is not a recipe or real hazardous-chemical equipment controller.

## Handoff
Output bts.surface-preparation.v1 includes both coupon IDs, parent and child revision, event provenance, exposure time, temperature, history, and unknown/calibrated-input adhesion state. Units s, C, N/mm, mm. No verified downstream adapter; example-output.json and output-schema.json document the contract.

## Verification
Original revision verification.json recorded 21 executed checks: six nominal geometry dimensions from model primitives and fifteen hand-defined state/acceptance, calibration, and rejection cases. Synthetic 0.25/0.75 N/mm pair tests arithmetic only, not a calibration datum. Browser and production verification are separate.

## Revision 1.1 review
The manufacturer brochure pp. 1–2 was directly inspected and confirms nominal values. EPFL confirms 25-slot 100/150 mm carriers and Si, SiO₂, Si₃N₄ as the selected surface scope, with yellow completion and explicit reset before unloading. NIST YES 310TA manual v1.0 pp.1–3 confirms front controls and side gauge at another installation: https://www.nist.gov/system/files/documents/2017/05/09/YES_310TA_AdhesionPromoterOven_USERMANUAL_v1.pdf . The different ~25-minute NIST cycle is not substituted for EPFL's ~15-minute cycle. Model 1.1 rejects unsupported glass, unconfirmed clean/dry or temperature-incompatible specimens; requires controller acknowledgment; cancellation does not commit an event. Calibration keys are entered independently and preserved in the output. Nominal timing allocates equal pre/post abstract phases only for visualization, not a measured pressure or thermal history. 38 reference checks passed in revision preparation; final CI/browser results are separate.
