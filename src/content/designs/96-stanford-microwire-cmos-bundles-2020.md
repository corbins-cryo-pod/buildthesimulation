---
title: "Stanford microwire-CMOS bundles, 2020"
order: 96
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0062"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "A modular wire-to-chip interface with 135-251-wire mouse bundles, a 138-wire retina experiment and separate 8,640-wire connectivity demonstration. Chip pixels, readout capacity and implanted wires stay distinct."
modality: "Intracortical"
website: "https://www.science.org/doi/10.1126/sciadv.aay2789"
tags: ["microwire", "CMOS", "Stanford", "PtIr", "retina", "mouse", "modular", "preclinical"]
draft: false
---

# Microwire bundles integrated with CMOS

Obaid and colleagues' 2020 paper joins three-dimensional microwire bundles to planar CMOS chips through mechanical compression. Its affiliations include Stanford, the Francis Crick Institute, UCL, ETH Zurich and Paradromics. The modular research interface is not the later [Argo custom readout](/devices/94-argo-microwire-cmos-recording-system/) or [Connexus clinical module](/devices/09-paradromics-connexus-acute-first-in-human/).

## Bundle and chip are separate structures

Sacrificial parylene-C sets wire spacing before wires are bundled and embedded in epoxy. The tissue end is released for insertion. Bare metal at the chip end bends and crimps against the CMOS pads, tolerating some surface nonplanarity without individually wiring each electrode.

| Configuration | Published description |
| --- | --- |
| Demonstrated wire materials | Au, W, PtIr and PtW; 5-25 µm metal diameters |
| Mouse recording bundles | 135-251 PtIr wires; 15 µm core, 1 µm glass coating, 1-2 mm free length; about 100 µm spacing |
| Mouse bundle diameter | 1.75-3.5 mm |
| Retina recording bundle | 138 wires |
| Large connectivity demonstration | 8,640 wires, about 7 mm diameter, 40 µm pitch, 18 µm wire diameter |
| Recording CMOS-MEA | 26,400 pixels; 1,024 addressable simultaneously at 20 kHz |

The 8,640-wire example establishes chip connectivity, not an 8,640-channel in vivo recording. The paper reports contact demonstrations with imaging, OLED and MEA chips; their pixel counts are not interchangeable neural readout capacities.

One wire can contact several pixels, producing repeated measurements of the same electrode. Multiple wires contacting one pixel mix signals and should be avoided. Wire count, contacted-pixel count and independent signals are different quantities.

## Connectivity and noise

Measured bundle-to-chip connectivity exceeded 90% in reported examples; a 184-wire example connected 177 wires (96%). Platinum-pad modifications supported greater-than-95% connectivity for the recording bundles. These measured examples are not a guaranteed manufacturing yield for every configuration.

For a 251-wire PtIr bundle in saline, bare-chip RMS noise was 5.0 ± 1.5 µV in the 10 Hz-10 kHz band. The main text reports at most 5.97 ± 2.2 µV after mating; the Figure 4 caption rounds this to 6.0 ± 2.2 µV. Noise includes the electrode-solution interface. A 14-day pressed-interface bench test found no connectivity change and small noise fluctuations, not a 14-day implanted cohort.

## Mechanical and biological limits

Insufficient spacing can make a bundle behave like a solid object during insertion. Free length is limited by wire material and buckling: examples in the paper discuss tungsten lengths above 5 mm versus gold buckling beyond approximately 3 mm. These are not universal insertion-depth guarantees.

The tissue-displacement estimate of about 2% assumes 15 µm wires, 100 µm spacing and ideal packing. It is a geometric estimate, not proof of zero tissue injury. [Retina and acute awake-mouse experiments](/applications/97-microwire-cmos-retina-mouse-recording-2020/) are cataloged separately.

## Model boundary

No full bundle model is supplied. Nominal spacing and diameter do not establish the exact packing defects, wire heights, contact positions, crimp geometry, epoxy boundary or chip assignment. A hexagonal idealization would need to remain explicitly separate from the tested assembly.

## Primary sources

- [2020 primary paper](https://www.science.org/doi/10.1126/sciadv.aay2789).
- [Full primary text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7083623/).
- [Stanford-hosted publisher PDF, Figures 1-4](https://med.stanford.edu/content/dam/sm/chichilnisky/documents/publications/Obaid2020.pdf).
