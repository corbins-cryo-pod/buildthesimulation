---
title: "Self-rectifying magnetoelectric metamaterial, 2023"
order: 122
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0075"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Rice-led semiconductor-coated ME laminates for millisecond-timed peripheral stimulation. Schottky and p-Si/ZnO variants, low fabrication yield, short encapsulation life and external trigger hardware remain explicit."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10972531/"
tags: ["MNM", "magnetoelectric", "Rice", "PZT", "ZnO", "peripheral nerve", "stimulation", "preclinical"]
draft: false
---

# Self-rectifying ME metamaterial

The Nature Materials paper published online in October 2023, with a January 2024 issue date, describes magnetoelectric nonlinear metamaterials (MNMs). Semiconductor layers rectify the high-frequency ME response into a bias voltage capable of stimulating nerves. This is a functional material interface, not the ME-BIT ASIC or the DOT microcontroller-based implant.

The primary affiliations include Rice and Baylor. The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) gives institutional context. The [rat application](/applications/123-mnm-rat-reflex-severed-nerve-study/) separates reflex triggering, a severed-nerve bridge and closed-wound stimulation.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Self-rectifying magnetoelectric nonlinear metamaterial (MNM) [1] |
| Manufacturer | Academic research device; Rice and Baylor [1] |
| Interface class | Functional-material wireless nerve stimulator |
| Origin | Nature Materials, online October 2023, issue January 2024 [1, 2] |
| First demonstrated | October 2023 [2] |
| First human implant | None |
| Species studied | Rat (reflex triggering, severed-nerve bridge, closed-wound stimulation) [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation; force sensing, amplification and recording are external [1] |
| Target tissue | Peripheral nerve [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | ME laminate with rectifying (RET) layer; contacts on the same plane, tape insulation; printed nerve clip in the closed-wound variant [1] |
| Array layout | Unreported |
| Electrode count | Two silver-epoxy pads per sample [1] |
| Pitch | Unreported |
| Electrode lengths | Unreported |
| Shank width and thickness | Stimulation samples 10 × 5, 5 × 3 and 3 × 2 mm; laminate 250 µm PZT-5A between two 23 µm Metglas sheets [1] |
| Tip and exposed site geometry | Unreported |
| Contact coating | Silver-epoxy pads on extended bottom Metglas [1] |
| Insulation | Tape insulation; closed-wound variant has about 20 µm Parylene-C [1] |
| Insertion method | Unreported |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Silver epoxy on Metglas; RET layers Pt/HfO2/ZnO (Schottky, 50/40/130 nm) or Al/p-Si/ZnO (p-n, 50/500/100 nm) [1] |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Unreported |
| Sampling rate | Unreported |
| Stimulation capability | Rectified bias voltage; closed-wound p-n variant above 2 V; nerve stimulation at 100-375 kHz depending on size, 375 kHz in Figure 2 [1] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Parylene-C coating (closed-wound variant) [1] |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Unreported |
| Data path | No neural-sensing processor or digital telemetry inside the material [1] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | External magnetic driver, microcontroller and coil with a neodymium DC bias magnet [1] |
| Thermal management | Unreported |
| Packaging and hermeticity | Saline soak at 37 °C retained voltage and bias up to five days before fluid-ingress degradation; lead-containing PZT needs a barrier [1] |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Fabrication yield about 10% (ZnO design) and about 80% (p-Si/n-ZnO); not animal success rates [1] |
| Stability over time | Unreported |
| Longevity | Five-day saline soak; three-week subcutaneous histology is a separate material assay, not stimulation operation [1] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Reflex triggering, severed-nerve bridge and closed-wound stimulation in rat [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Rat; subcutaneous histology 3 weeks; short HEK-cell viability assay [1] |
| Follow-up duration | Three weeks (histology only) [1] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Wireless nerve stimulation from a self-rectifying film [1] |
| Key limitations | Increased vessels and cell infiltration at both MNM and PDMS controls; encapsulation damps ME performance; alternative piezoelectrics proposed [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | No ASIC; rectification in the material [1] |
| Limitations | Sample-specific resonance; ZnO fabrication yield; lead-containing PZT [1] |
| Scaling constraints | Unreported |

## Published variants

| Part | Specification |
| --- | --- |
| ME laminate | 250-µm PZT-5A between two 23-µm Metglas sheets, bonded with epoxy |
| Schottky-type RET layer | 50-nm Pt, 40-nm HfO2 and 130-nm ZnO |
| Alternative p-n RET | 50-nm Al, 500-nm p-Si and 100-nm ZnO |
| Tested stimulation sample footprints | 10 × 5, 5 × 3 and 3 × 2 mm |
| Contact arrangement | Extended bottom Metglas; silver-epoxy pads on the same plane, with tape insulation |
| Closed-wound variant | Two ME laminates in series with the p-n RET layer; approximately 20-µm Parylene-C coating and a printed nerve clip |

These are different configurations, not interchangeable dimensions for one final product. Figure 2 uses a 375-kHz carrier; tested nerve-stimulation films span 100-375 kHz depending on size. A separate coefficient experiment uses 5 × 2-mm films at 345 kHz for ME and 335 kHz for MNM. Resonance is sample-specific.

## Yield and external system

The ZnO-based design had approximately 10% fabrication yield. The p-Si/n-ZnO heterojunction used for the closed-wound work increased reported yield to about 80%, with bias above 2 V. Those fabrication figures are not stimulation success rates in animals.

The paper's nerve experiments use an external magnetic driver, microcontroller and coil, with a DC bias field from a neodymium magnet. Force sensing, amplification, cuffs and wired recording are external parts of the demonstrated neuroprosthetic loop. No neural-sensing processor or independent digital telemetry is specified inside the material.

## Encapsulation and limits

A 37°C saline soak retained voltage and bias up to five days before fluid-ingress degradation. Three-week subcutaneous histology is a separate material-response assay, not three weeks of verified nerve-stimulation operation. Increased vessels and cellular infiltration occurred at both MNM and PDMS control sites.

The lead-containing PZT and encapsulation that can damp ME performance remain chronic-use concerns. The authors call for improved packaging and possible alternative piezoelectric materials. Cell viability in a short HEK-cell assay is not full chronic biocompatibility qualification.

No full model is supplied. Sample footprints and layer thicknesses do not define the complete contact mask, epoxy, doubled closed-wound stack, nerve clip or lead routing. Micro/nanoscale variants and chronic human therapy remain proposals.

## References

1. [Published primary manuscript, Methods and Figures 1-4](https://pmc.ncbi.nlm.nih.gov/articles/PMC10972531/).
2. [Nature Materials version-of-record page](https://www.nature.com/articles/s41563-023-01680-4).
