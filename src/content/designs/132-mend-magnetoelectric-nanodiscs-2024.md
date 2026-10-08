---
title: "MEND magnetoelectric nanodiscs, 2024"
order: 132
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0080"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "Injected Fe3O4-CoFe2O4-BaTiO3 nanodiscs mediate magnetic neuromodulation in mice. No ASIC, lead, recording uplink or stimulation transgene; optical verification uses a separate reporter."
modality: "Other"
website: "https://www.nature.com/articles/s41565-024-01798-9"
tags: ["MEND", "nanodiscs", "magnetoelectric", "MIT", "neuromodulation", "preclinical"]
draft: false
---

# MEND magnetoelectric nanodiscs

Kim and colleagues report magnetoelectric nanodiscs (MENDs) in Nature Nanotechnology, published October 11, 2024. This is an injected material interface, not a packaged battery-free microelectronic implant. Primary affiliations include [MIT](/companies/22-mit-neural-engineering-neurotech-ecosystem-lab-brief/) and Friedrich-Alexander University of Erlangen-Nuremberg.

Separate applications cover [VTA reward and longitudinal optical measurements](/applications/133-mend-vta-reward-and-photometry-2024/) and [STN-driven mouse rotations](/applications/134-mend-stn-mouse-rotation-2024/). No human therapeutic result is reported.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | MEND magnetoelectric nanodiscs (injected material interface) [1] |
| Manufacturer | Academic research material; MIT and Friedrich-Alexander University Erlangen-Nuremberg [1] |
| Interface class | Injected nanoparticle magnetoelectric transducer, not a microelectronic implant |
| Origin | Kim and colleagues, Nature Nanotechnology [1] |
| First demonstrated | Published October 11, 2024 [1] |
| First human implant | None; no human therapeutic result [1] |
| Species studied | Mouse (VTA reward, longitudinal photometry, STN rotations) [1] |
| Regulatory status | Research material; no clearance |
| Function | Wireless neuromodulation by external magnetic field [1] |
| Target tissue | Brain (VTA, STN) by injection [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Hexagonal core-double-shell nanodiscs: Fe₃O₄ core, CoFe₂O₄ shell, BaTiO₃ outer shell [1] |
| Array layout | Unreported |
| Electrode count | Not applicable; no electrodes |
| Pitch | Unreported |
| Electrode lengths | Unreported |
| Shank width and thickness | Nominal 250 nm diameter and 50 nm thickness (abstract); measured diameter 250 ± 41 nm ensemble [1] |
| Tip and exposed site geometry | Unreported |
| Contact coating | Unreported |
| Insulation | Unreported |
| Insertion method | Craniotomy and brain injection of particles [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | BaTiO₃ piezoelectric shell over CoFe₂O₄ magnetostrictive shell [1] |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Unreported |
| Sampling rate | Unreported |
| Stimulation capability | Peak ME coefficient 150 mV mT⁻¹ cm⁻¹ at 220 mT offset with 10 mT, 150 Hz alternating field; single-particle potential 37.5 µV calculated (Supplementary Note 1), far below the roughly 15-30 mV threshold, so a summation mechanism is proposed and called qualitative [1, 2] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Immune markers compared with PBS and a microwire; not a blanket biocompatibility certificate [1] |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Culture at 1 µg/mm² with three ten-second 1 kHz epochs reduced viability (possible excitotoxicity); 0.75 µg/mm² avoided a measured difference; frequencies above 150 Hz silenced neurons with rebound [1] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | None; no ASIC, battery, rectifier board, radio or addressed node [1] |
| Data path | Unreported |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | External static offset plus alternating field; 10 mT alternating component alone understates exposure [1] |
| Thermal management | Unreported |
| Packaging and hermeticity | Unreported |
| MRI compatibility | MRI contrast seen in isolated brains; not MRI-use qualification [1] |
| Surgical complexity | Craniotomy and stereotaxic injection at 1 mg/ml (abstract) or 1.5 mg/ml (most assays) plus 0.5 mg/ml for c-Fos, kept distinct [1] |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Optical responses persist to three months but decline; diffusion and uptake suggested with about 500 µm spread [1] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | VTA reward behavior, longitudinal photometry and STN-driven rotations in mice [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mice; photometry used AAV-delivered GCaMP6s and implanted fibres [1] |
| Follow-up duration | Up to three months [1] |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Transgene-free wireless modulation of neural activity and behavior [1] |
| Key limitations | Delivery reversibility, clearance, cell-type selectivity and human safety unestablished; mechanism partly model-based [1, 3] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | No electronics or genetic sensitization needed [1] |
| Limitations | Strong static field required; response declines over months; injection needs craniotomy [1] |
| Scaling constraints | Unreported |

## Material interface

| Layer or property | Published detail |
| --- | --- |
| Core | Magnetite, Fe₃O₄ |
| Magnetostrictive shell | CoFe₂O₄ |
| Piezoelectric outer shell | BaTiO₃ |
| Shape | Hexagonal core-double-shell nanodiscs |
| Nominal size | Abstract: 250-nm diameter, 50-nm thickness |
| Measured final diameter | 250 ± 41 nm, an ensemble statistic rather than identical particles |
| Peak measured ME coefficient | 150 mV mT⁻¹ cm⁻¹ at 220-mT offset and 10-mT, 150-Hz alternating field |
| Single-particle potential | Supplementary Note 1 calculates 37.5 µV for these conditions |
| Circuitry | No ASIC, battery, rectifier board, neural-data radio or individually addressed digital node |

The external magnetic setup supplies both a strong static offset field and an alternating field. Reporting only the 10-mT alternating component would hide most of the exposure. The disc diameter is not an implantation-cannula diameter or the size of the injected bolus.

## Mechanism is partly a model

The measured ME coefficient is about four times that of the isotropic comparator. A greater-than-1,000-fold simulated strain enhancement is a different quantity, not a measured 1,000-fold neural benefit. The calculated single-particle voltage is far below the roughly 15-30-mV excitation threshold discussed in the supplement.

The authors propose spatial and temporal summation of repeated subthreshold depolarization. They explicitly call the model qualitative and note missing current-injection, ion-channel, geometry and surrounding-ion effects. Observed calcium responses and behavior support material-mediated modulation; they do not prove every part of the proposed mechanism or millisecond single-neuron control.

## Operating window and adverse effects

In culture, 1 µg/mm² and three ten-second 1-kHz field epochs reduced viability and diminished responses, attributed to possible excitotoxicity. Reducing density to 0.75 µg/mm² avoided a measured viability difference in that assay. Frequencies above 150 Hz silenced neurons during exposure with rebound responses after the field stopped; subsequent experiments use 100 or 150 Hz. A larger ME coefficient at higher frequency is therefore not automatically a better stimulation condition.

The abstract summarizes in-vivo injections as 1 mg/ml. Surgical methods use 1.5 mg/ml for most assays and an additional 0.5 mg/ml c-Fos condition. These are distinct reported doses, not silently normalized into one. Particle injections still require a craniotomy and brain injection. Transgene-free means no genetic sensitization is required for modulation or behavior; fibre-photometry validation uses AAV-delivered GCaMP6s and implanted optical fibres.

Longitudinal optical responses persist to three months but decline. The paper suggests diffusion and cellular uptake, supported by approximately 500-µm spread and endocytosis images. It does not establish reversibility of material delivery, lifetime clearance, cell-type selectivity or chronic human safety. Immune-marker comparisons with PBS and a microwire are not a blanket biocompatibility certificate. MRI contrast in isolated brains is not full MRI-use qualification.

## Geometry boundary

No 3D model is added. Figure 1 shows the hexagonal core-shell morphology, but ensemble diameter and nominal thickness do not define exact per-layer geometry, the injected distribution, surface coating or neuronal contact. A perfect three-layer hexagonal solid would imply more precision than the primary images and measurements provide.

## References

1. [Published paper](https://www.nature.com/articles/s41565-024-01798-9): Figures 1-5, material characterization, surgical methods and Conclusion.
2. [Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41565-024-01798-9/MediaObjects/41565_2024_1798_MOESM1_ESM.pdf): single-particle potential and material/longitudinal controls.
3. [Reporting Summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41565-024-01798-9/MediaObjects/41565_2024_1798_MOESM2_ESM.pdf): design and exclusions.
