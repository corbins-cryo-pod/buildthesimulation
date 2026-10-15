# Peripheral contact models, 2026-10-15

These four configurations reconstruct implanted electrode-bearing structures. They
are deliberately scoped where a whole-device outline or contact map is missing.
All dimensions are millimeters in code; none is a fabrication drawing. Source
measurements and display assumptions are separated in every model's viewer notes.

| Device and modeled scope | Primary evidence | Assumptions or omitted geometry |
| --- | --- | --- |
| FINE, eight-contact 2013 lumen | [Schiefer et al., section 2.2](https://pmc.ncbi.nlm.nih.gov/articles/PMC3809099/): selected 10 × 1.5 × 7 mm lumen; 0.5 mm apertures; approximately 2 mm center spacing; opposing rows offset half a pitch | Axial midpoint and centered row origins reconstructed; 0.3 mm silicone wall and squared outer corners are display assumptions. Snap closure, contact recess, lead exits and strain relief omitted. This is not the 2016 PEEK-frame layout. |
| LIFE, single 2015 DIME wire contact crop | [Thota et al., section 2.1.3](https://pmc.ncbi.nlm.nih.gov/articles/PMC4312748/): 25 µm Pt/Ir; 6 µm radial PTFE, giving 37 µm insulated diameter; approximately 1 mm stripping about 2 cm from distal wire end | 2 mm straight crop retains insulated continuation on both sides. No six-wire pitch, deployment path, stripped perimeter or exact exposed area is invented. Coils, sheaths and needle omitted. |
| TIME-4H, one-side seven-aperture window | [Guiho et al., section 2.2.2](https://pmc.ncbi.nlm.nih.gov/articles/PMC8587292/): seven 80 µm apertures per side, 750 µm pitch. [Krähenbühl et al., section 2.2](https://pmc.ncbi.nlm.nih.gov/articles/PMC5521907/): approximately 11 µm film | 160 µm width is a crop, not strip width. 5.25 mm crop uses half-pitch margins. Actual opposite folded side, grounds, loop, routing and cable omitted. Seven exported sites do not mean the device has only seven sites. |
| ITIS 2018 cuff, one longitudinal triplet | [Rozman et al., Materials and Methods](https://www.nature.com/articles/s41598-018-19318-w): 2.5 mm nominal lumen; 17 mm length; 2.5 × 0.7 mm contacts; 2.5 mm longitudinal separation; approximately 0.15 mm bonded composite | Full source conflicts between 33 sites and thirteen triplets. Export only three representative contacts. Interpret separation as edge gap, center triplet axially and assign arbitrary azimuth. A single cylindrical shell omits the 1.5-turn overlap; extra contact-carrier thickness is unknown. |

## Deferred after source review

- CWRU/Ardiem spiral and ActiGait: available evidence establishes important
  architecture/count/diameter facts but does not sufficiently fix contact outline,
  axial extent and current-variant cuff thickness. No generic cuff is presented as
  one of these systems.
- Altius: [manufacturer implant IFU, page 9](https://www.neurosmedical.com/wp-content/uploads/2024/08/Prescriber-IFUs-Combined.pdf)
  gives nominal 4/6/9 mm minimum diameters, 15/20/28 mm cuff lengths, two contact
  bands and 5/7/11 mm inner-edge gaps. It does not establish band width, complete
  angular coverage or silicone thickness. Those dimensions are needed before
  reliable contact-bearing geometry is exported. Do not equate an edge gap to
  band center pitch.
- Regenerative sieve and microchannel devices: pores/assembly dimensions exist,
  but complete mask/contact coordinates or total rolled scaffold form remain
  unresolved. A solid disk or arbitrary pore lattice would hide the architecture
  the user wants to preserve.

## Verification expectations

FINE: eight contacts; 0.5 mm circular apertures; four on each opposing inner wall;
2 mm within-row pitch and 1 mm opposing offset. LIFE: one cylindrical exposure,
with 37 µm insulated OD, 25 µm core and 1 mm exposed axial extent. TIME: seven
80 µm circles, 0.75 mm center pitch, 0.011 mm film. ITIS: three inward arc faces
at radius 1.25 mm, 2.5 mm axial length and 0.7 mm arc width. Exports must retain
model-specific notes and partial scope, and must not infer electrical channels.
