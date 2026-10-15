# Implanted lead contact-window evidence

Reviewed 2026-10-15. Definitions: `src/lib/devices/models-leads.js`.

These eight records model the neural-contact-bearing portions of named implanted leads. No pulse-generator housing is substituted for the neural interface. All coordinates and dimensions are millimeters. A contact's `z` is its axial **center**, relative to the distal contact-window boundary. `length` is a cropped window, not the complete implanted cable or insertion depth.

| Catalog record | Selected architecture | Diameter | Axial contact length | Edge gap | Contact count | Modeled span |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| BTSD-FDA-0001 | NeuroPace DL-330-10 depth lead | 1.27 | 2, family transfer | 8, from 10 mm center pitch | 4 rings | 32 |
| BTSD-FDA-0002 | Medtronic SenSight B33005 | 1.36 | 1.5 | 0.5 | 1-3-3-1, eight sites | 7.5 |
| BTSD-FDA-0003 | Abbott 6172 directional lead | 1.295 | 1.5 | 0.5 | 1-3-3-1, eight sites | 7.5 |
| BTSD-FDA-0004 | Boston Cartesia DB-2202 | 1.3 | 1.5 | 0.5 | 1-3-3-1, eight sites | 7.5 |
| BTSD-FDA-0005 | Medtronic Vectris 977A2 compact | 1.3 | 3 | 4 | 8 rings | 52 |
| BTSD-FDA-0006 | Nevro LEAD1058 | 1.4, legacy family label | 3, derived | 5 | 8 rings | 59 |
| BTSD-FDA-0007 | Original Evoke percutaneous lead | 1.32 | 3, derived | 4 | 12 rings | 80 |
| BTSD-FDA-0022 | Boston Avista MRI SC-2408 | 1.6 | 3 | 1 | 8 rings | 31 |

## Evidence and inference boundaries

- **SenSight:** [manufacturer implant manual, academic mirror](https://trajectoryguide.greydongilmore.com/static/medtronic_sensight_B33005_B33015_manual_2021.pdf), Figures 1–3 and Table 1. This primary manual resolves a conflicting row in Medtronic's 2024 performance report that prints 0.5 mm as B33005 electrode length. The implant manual explicitly labels 1.5 mm length and 0.5 mm gap.
- **Abbott:** [FDA P140009/S039](https://www.accessdata.fda.gov/cdrh_docs/pdf14/P140009S039B.pdf), Tables 2/10 and Figure 1. Table 10 supplies 1.5 mm band length and 1.295 mm diameter; Table 2 rounds diameter to 1.30 mm. [Abbott's full-system table](https://www.neuromodulation.abbott/us/en/healthcare-professionals/mri-support.html) establishes Liberta RC/6172 compatibility.
- **Cartesia:** [FDA P150031/S028](https://www.accessdata.fda.gov/cdrh_docs/pdf15/P150031S028B.pdf), device description and Table 2. The description explicitly specifies 90° directional contact arcs. DB-2202 is an eight-contact directional lead; it is not Cartesia X/HX.
- **Vectris:** [Medtronic 2024 report](https://www.medtronic.com/content/dam/medtronic-wide/public/united-states/products/neurological/2024-product-performance-report-neuromodulation.pdf), printed p. 185; [US product list](https://www.medtronic.com/content/dam/medtronic-wide/public/united-states/products/neurological/scs-us-product-list.pdf), p. 8, explicitly associates the **compact** lead with Inceptiv closed-loop technology. Do not substitute subcompact dimensions.
- **Nevro:** [original FDA Senza SSED](https://www.accessdata.fda.gov/cdrh_docs/pdf13/P130022B.pdf), Table 2. Both published span limits imply 3 mm bands: `(31 − 7 × 1) / 8 = (87 − 7 × 9) / 8 = 3`. [HFX iQ prescriber manual](https://www.nevro.com/app/uploads/2025/02/10001223_Information_For_Prescribers_Rev_D_Clean.pdf) supplies the compatible LEAD1058 family and selected 5 mm gaps. Reuse of legacy family diameter and band length is flagged; current manufacturing revision remains unverified.
- **Evoke:** [FDA P190002](https://www.accessdata.fda.gov/cdrh_docs/pdf19/P190002B.pdf), Table 2. Band length is `(80 − 11 × 4) / 12 = 3`. This models one original cylindrical lead, not a later paddle.
- **Avista:** [manufacturer lead manual](https://www.bostonscientific.com/content/dam/elabeling/nm/91063583-01_RevC_Avista_MRI_Lead_DFU_en-USA_S.pdf), pp. 1 and 12; [WaveWriter IPG manual](https://www.bostonscientific.com/content/dam/elabeling/nm/92469342-02_WaveWriter_Alpha_and_WaveWriter_Alpha_Prime_Implantable_Pulse_Generator_multi-OUS_s.pdf) supplies system compatibility. Window length is `8 × 3 + 7 × 1`.
- **NeuroPace:** [manufacturer manual](https://www.neuropace.com/wp-content/uploads/2021/02/rns-system-manual-300m.pdf) supplies variant/diameter. [Henin et al.](https://www.nature.com/articles/s41598-018-37561-z) explicitly define the 10 mm spacing as center to center. [Original electrode study, Table 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC11801193/) reports 2 mm height for the DL-330-3.5 member. Transfer to DL-330-10 is disclosed and still needs a variant-specific dimensioned drawing.

## Geometry integration contract

The directional models have sourced axial dimensions/topology. **SenSight and Abbott circumferential boundaries are schematic**: 90° contact arcs with 30° gaps. `areaUnknown: true` prevents exporting fabricated areas for those two leads. **Cartesia's 90° arcs are documented**; equal spacing is reconstructed. Segments are equally spaced around an arbitrary angular origin. Do not interpret their order as manufacturer terminal IDs or a patient's implanted orientation.

For complete rings, the export may use analytic lateral area `π × diameter × band length`, with axis-center position and `normal: null`. This is an ideal geometric area, not measured electrochemical area. Ring manufacturer labels can differ slightly through rounding or geometry outside this simplified surface.

The cylinder's terminal faces are crop planes. Physical tips, internal conductors, electrode metal thickness, marker shapes, and patient curvature are absent. Dimensions are nominal references, without manufacturing tolerances. No current field, recording sensitivity, tissue properties, or simulation integration is asserted.

## Checks performed

Imported all eight definitions with Node. Confirmed all physical-site counts equal summed segment counts and all band extents lie exactly within their declared crop. Renderer/export validation is owned by the shared cylindrical-lead integration.
