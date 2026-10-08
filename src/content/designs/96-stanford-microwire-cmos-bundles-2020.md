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

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Stanford microwire-CMOS bundles, 2020 [1] |
| Manufacturer | Academic research device; Stanford, Francis Crick Institute, UCL, ETH Zurich and Paradromics affiliations [1] |
| Interface class | Three-dimensional microwire bundles mated to planar CMOS chips by mechanical compression [1] |
| Origin | Obaid and colleagues, Science Advances, 2020 [1] |
| First demonstrated | 2020 paper [1] |
| First human implant | None |
| Species studied | Mouse (acute awake) and retina [1] |
| Regulatory status | Research interface; not the later Argo or Connexus devices [1] |
| Function | Recording through a modular wire-to-chip interface [1] |
| Target tissue | Mouse brain and retina [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Wire bundles embedded in epoxy with sacrificial parylene-C spacing; bare metal ends crimp against CMOS pads [1] |
| Array layout | Mouse bundles of 135-251 wires; retina bundle of 138 wires; separate 8,640-wire connectivity demonstration [1] |
| Electrode count | 135-251 PtIr wires (mouse); 138 wires (retina); 8,640 wires in the connectivity demonstration, which is not an in vivo recording; CMOS-MEA 26,400 pixels with 1,024 addressable simultaneously [1] |
| Pitch | About 100 µm spacing (mouse bundles); 40 µm pitch (8,640-wire demonstration) [1] |
| Electrode lengths | 1-2 mm free length (mouse bundles); wire-material buckling limits discussed, e.g. tungsten lengths above 5 mm versus gold buckling beyond approximately 3 mm [1] |
| Shank width and thickness | Mouse bundle diameter 1.75-3.5 mm; 8,640-wire bundle about 7 mm diameter with 18 µm wires; mouse wires 15 µm core [1] |
| Tip and exposed site geometry | Metal diameters of 5-25 µm demonstrated; tissue end released for insertion [1] |
| Contact coating | Platinum-pad modifications on the chip supported over 95% connectivity for recording bundles [1] |
| Insulation | 1 µm glass coating on mouse PtIr wires; parylene-C spacing before embedding in epoxy [1] |
| Insertion method | Bundle with released tissue end inserted; insufficient spacing can make a bundle behave like a solid object [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported || Electrode material | Demonstrated Au, W, PtIr and PtW; mouse bundles PtIr [1] |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | 251-wire PtIr bundle in saline: bare-chip 5.0 ± 1.5 µV RMS (10 Hz-10 kHz); at most 5.97 ± 2.2 µV after mating in text, 6.0 ± 2.2 µV in the Figure 4 caption. Includes electrode-solution interface [1] |
| Recording modality | CMOS-MEA readout of extracellular activity [1] |
| Sampling rate | 20 kHz, 1,024 channels addressable simultaneously [1] |
| Stimulation capability | Unreported |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Mouse brain and retina [1] |
| Insertion trauma and BBB disruption | Tissue-displacement estimate of about 2% assumes 15 µm wires, 100 µm spacing and ideal packing; geometric estimate, not proof of zero injury [1] |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Planar CMOS chip (26,400-pixel recording CMOS-MEA); contact also shown with imaging, OLED and MEA chips [1] |
| Data path | Wired CMOS readout [1] |
| Telemetry bandwidth | Unreported |
| Sampling rate | 20 kHz [1] |
| Power | Unreported |
| Thermal management | Unreported |
| Packaging and hermeticity | Compression mating of wires to pads; 14-day pressed-interface bench test showed no connectivity change [1] |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Bundle-to-chip connectivity over 90% in reported examples; 184-wire example connected 177 (96%); not a guaranteed manufacturing yield [1] |
| Chronic yield | Unreported |
| Stability over time | 14-day pressed-interface bench test: no connectivity change, small noise fluctuations; not an implanted cohort [1] |
| Longevity | Unreported |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Retina and acute awake-mouse recordings; 8,640-wire connectivity demonstration [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mouse and retina experiments; counts not extracted here [1] |
| Follow-up duration | Acute in vivo; 14-day bench test [1] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Retina and awake-mouse recording through the wire-to-chip interface [1] |
| Key limitations | Wire count, contacted pixels and independent signals differ; multiple wires per pixel mix signals; no full bundle model [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Modular interface with no per-electrode wiring and tolerance to surface nonplanarity [1] |
| Limitations | Spacing and free-length limits, acute use, repeated measurements when one wire contacts several pixels [1] |
| Scaling constraints | Readout limited to 1,024 simultaneous channels versus 26,400 pixels and 8,640-wire demonstrated bundles [1] |

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

## References

1. [2020 primary paper](https://www.science.org/doi/10.1126/sciadv.aay2789).
2. [Full primary text](https://pmc.ncbi.nlm.nih.gov/articles/PMC7083623/).
3. [Stanford-hosted publisher PDF, Figures 1-4](https://med.stanford.edu/content/dam/sm/chichilnisky/documents/publications/Obaid2020.pdf).
