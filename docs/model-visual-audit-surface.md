# Surface-contact model visual audit

Reviewed 2026-10-15. This covers all twelve cortical/probe contact-window
models using the `surface-grid` primitive. TIME-4H is covered by the peripheral
audit. Photographs and micrographs were visually inspected, rather than using
their captions alone. Model dimensions were checked against the named source
configuration. No measured dimensions changed in this pass.

The main mismatch was the shared opaque blue body and gold contacts: those
colours obscured real distinctions between clear polymer films, amber PI,
silicon, platinum, TiN, graphene and PEDOT. `appearance` fields select visual
material presets. These are qualitative finishes, not recovered optical
constants, a manufacturing layer stack, or an assertion that microscopy
interference colours are the visible colour of a material.

| Model | Image actually inspected | Source comparison and correction |
| --- | --- | --- |
| Viventi 2011, 360 sites | Local `btsd-acad-0008-array.webp`, array photograph with unit-cell inset | [Primary Fig. 1 and fabrication](https://pmc.ncbi.nlm.nih.gov/articles/PMC3235709/) support 18 × 20, 500 µm pitch, 300 µm square faces, approximately 25 µm assembled film, PI/epoxy and approximately 50 nm final Pt. Use amber PI and silver Pt. Small via structures and transistor wiring are visible but insufficiently dimensioned for this crop. Keep the regular measured faces; do not invent their routing. |
| SIMIT 2025, 256 sites | Local `btsd-acad-0090.webp`, complete array and contact close-up | [Primary fabrication](https://pmc.ncbi.nlm.nih.gov/articles/PMC12677598/) identifies gold embedded between PI layers. Use amber PI and gold contacts; retain 850 µm circles, 1.25 mm pitch and 13 µm recess. The photograph confirms the much larger contact-to-pitch ratio than the other micro-ECoG patches. Perfusion-hole positions are not recovered. Add the inspected photograph to model references. |
| CIBR aGel, underlying 1,024-site patch | Local `10-btsd-acad-0099.jpg`, Fig. 3b and cortical-placement image | [Primary section 2.2 and Fig. 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC12713035/) identify PEDOT:PSS electroplated over Ti/Au, with 6 µm PI; Fig. 3b labels 32 × 32, 20 µm sites and 200 µm pitch. Replace generic metallic gold faces with dark PEDOT. Retain the explicit omission of the 10 µm hydrogel; do not imply the bare patch is the complete coated architecture. |
| UCSD graphene 2024, 256 sites | Local `btsd-acad-0048-graphene-pmc-fig1.jpg`, clear array, contact micrograph and 256-channel panel | [Primary Fig. 1 and methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC11742260/) support a clear parylene carrier and graphene contacts. Use clear-film and subtle dark graphene finishes. Retain 20 µm openings, 350 µm pitch and nominal 14 + 2 µm polymer stack. The golden fan-out lies mostly outside the modeled contact crop and must not be painted across it. |
| CLEAR rat protocol, 16 sites | Local `btsd-acad-0047.webp`, CLEAR family photograph on glass | The photograph confirms the transparent-film architecture, but is a family appearance reference, not metrology of the named 2016 rat variant. [Primary 2016 protocol](https://www.nature.com/articles/nprot.2016.127) remains the authority for 200 µm circles, 750 µm pitch and 25 µm parylene. Use clear parylene and subtle dark graphene. Preserve the distinction from the 150 µm / 500 µm mouse variant. Add the family image with its limited purpose stated. |
| PMT 2021 speech grid, 128 sites | Local `btsd-acad-0042-128-contact-placement.webp`, 2021 placement schematic | The [inventor disclosure, Example 1 / Method S2](https://patents.google.com/patent/US20240366157A1/en) confirms 16 × 8, 4 mm pitch, 2 mm discs and 67 × 35 × 0.51 mm. It does not identify the exact alloy or polymer. Use neutral pale polymer and silver metal appearance presets, explicitly labelled as visual approximations. Do not infer exact materials from other PMT versions. The schematic is not a calibrated colour reference. Exposed area stays unknown. |
| BISC, dense 1,024-site window | Local `btsd-acad-0050-bisc-pmc-fig1.jpg`, panels c–e | [Primary Fig. 1e and fabrication](https://pmc.ncbi.nlm.nih.gov/articles/PMC13327737/) show TiN squares on a polyimide-coated silicon architecture. Use a dark silicon body, amber PI face and matte TiN contacts. Keep 14 µm squares and 26.5 × 29 µm pitch. The 50 µm model thickness remains an upper-bound envelope; the material finish does not create a resolved fabrication stack. |
| Neuropixels Opto, electrical window | Local `btsd-acad-0068.webp`, illuminated shank micrograph | [Primary paper](https://www.nature.com/articles/s41592-026-03076-z) identifies TiN sites on the silicon photonic shank. Use silicon and TiN finishes. Retain 12 µm squares, 20 µm axial / 48 µm lateral pitch, 70 µm width and 33 µm thickness. The red/blue luminous spots belong to omitted optical emitters; they must not be mistaken for electrical contact colours or added to the electrical-only crop. |
| Neuropixels Ultra, dense 384-site window | [Primary Fig. 1A/B SEM and layout](https://cdn.ncbi.nlm.nih.gov/pmc/blobs/25e0/12981004/6f02148b34e4/nihms-2127598-f0001.jpg), downloaded and inspected | [Primary design description](https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/) confirms 5 µm TiN squares and 6 µm center spacing. Use silicon/TiN finishes, retaining the 48 × 8 crop. The SEM shows local relief, but its height is not recovered; do not replace contact faces with invented ridges or slots. Add the actual source figure as a reference. |
| PtNRGrid, 1,024-site patch | [Primary Fig. 1](https://cdn.ncbi.nlm.nih.gov/pmc/blobs/2cf8/9650779/8e2a080ff0ff/nihms-1843201-f0001.jpg), panels B/C; local `btsd-acad-0051.png` | [Primary fabrication and Fig. 1C](https://pmc.ncbi.nlm.nih.gov/articles/PMC9650779/) support 32 × 32 at 1 mm pitch, 30 µm contact diameter and 6.6 µm parylene with approximately 2 µm recess. Use clear parylene and dark matte platinum-nanorod contact finish. Do not confuse the larger dark perfusion holes in panel B with recording sites or transfer that panel's 150 µm pitch to this model. |
| Active micro-ECoG 196 | Local `btsd-acad-0044-array.webp` and `btsd-acad-0044-contact-fabrication.webp`, Pt deposition panel | [Primary Fig. 1 and methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC4137255/) identify 200 µm Pt faces, 250 µm pitch and PI/epoxy encapsulation. Use silver Pt and amber PI rather than gold contacts. Preserve the approximately 25 µm total and 3.5 mm recording crop. The photograph's gold tint contains illumination/interference and buried metal; it is not evidence for a gold tissue-contact material. |
| NeuroGrid, 256-site patch | [Primary Fig. 1a](https://cdn.ncbi.nlm.nih.gov/pmc/blobs/c8a2/4308485/03ccdbc32c21/nihms-645113-f0001.jpg), flower photograph and 256-site micrograph, downloaded and inspected | [Primary design and fabrication](https://pmc.ncbi.nlm.nih.gov/articles/PMC4308485/) identify PEDOT:PSS contact surfaces and a 4 µm parylene structure. Use dark PEDOT on a clear film. Retain 10 µm squares and 30 µm center-pitch interpretation. The buried gold interconnects are not the exposed contact material. The local tetrode-family gallery photograph is not used to validate this 256-site layout. |

## Geometry and presentation decisions

- Keep real thicknesses and pitches even when films or contacts are very small
  at the full-device scale; use a contact-detail view rather than inflating them.
- Keep all crop boundaries and flat poses identified as reconstructions.
  Clear films do not justify adding arbitrary curvature or rounding crop edges.
- Preserve contact-well openings and the existing small rendering separation
  between coplanar faces. Rendering offsets are not exported contact depths.
- Do not add guessed gold traces, perfusion holes, transistors, graphene wire
  routes, channel labels, optical emitters or roughness geometry merely to fill
  visually empty areas. Those details require a recoverable layout and scale.
- CLEAR and PMT image limits are recorded above. They are not promoted to
  photographic evidence of an exact variant or material composition.

The shared renderer consumes the presets; its lighting, framing and actual
rendered output require integration review. This audit does not claim browser
or WebGL interaction testing.
