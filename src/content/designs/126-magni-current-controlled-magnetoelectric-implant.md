---
title: "MagNI current-controlled ME implant, 2020"
order: 126
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0077"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Published 8.2-mm³, 28-mg MagNI research stimulator: 250-kHz ME power, 1.5-mm² ASIC and programmable biphasic current. Hydra activation and a seven-day saline test are not spinal pain treatment."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8712272/"
tags: ["MagNI", "magnetoelectric", "Rice", "CMOS", "current stimulation", "Hydra", "preclinical"]
draft: false
---

# MagNI research stimulator

The 2020 IEEE Transactions on Biomedical Circuits and Systems paper reports MagNI, a magnetoelectrically powered and controlled stimulation implant. Primary affiliations include Rice and Baylor. Its [Hydra application](/applications/127-magni-hydra-muscle-stimulation-2020/) is excitable-tissue evidence, not a spinal-cord pain-treatment result.

This is a current-controlled design with a 1.5-mm² die. It is distinct from the later [0.8-mm² PUF-addressed voltage stimulator](/devices/124-puf-addressed-magnetoelectric-multisite-stimulator/) and endovascular ME-BIT configuration. The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links the laboratories.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | MagNI magnetoelectrically powered and controlled stimulation implant [1] |
| Manufacturer | Academic research device; Rice and Baylor [1] |
| Interface class | Wireless battery-free current-controlled stimulator |
| Origin | IEEE Transactions on Biomedical Circuits and Systems, 2020 [1] |
| First demonstrated | 2020 [1] |
| First human implant | None |
| Species studied | Hydra muscle stimulation; saline bench tests [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation [1] |
| Target tissue | Excitable tissue (Hydra muscle); proposed spinal pain therapy is not demonstrated [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Flexible polyimide substrate with 1 mm² on-board contacts [1] |
| Array layout | Unreported in reviewed sources |
| Electrode count | Unreported in reviewed sources |
| Pitch | Unreported in reviewed sources |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Implant 8.2 mm³, 28 mg; SoC 1.5 mm²; ME transducer 4 × 2 × 0.12 mm [1] |
| Tip and exposed site geometry | 1 mm² contacts [1] |
| Contact coating | Porous platinum compared with bare gold [1] |
| Insulation | Printed enclosure 0.4 mm thick, then nonconductive epoxy encapsulation (saline test) [1] |
| Insertion method | Unreported in reviewed sources |
| Anchoring and fixation | Unreported in reviewed sources |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 1 mm² [1] |
| Electrode material | Gold with porous platinum coating [1] |
| Impedance (with measurement frequency) | Fell from 2,100 to 170 Ω at 2 kHz with porous platinum (saline) [1] |
| Noise floor or SNR | Unreported in reviewed sources |
| Recording modality | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | Biphasic current 0.05-1.5 mA in 50 µA steps; 64-512 µs; 0-200 Hz; fixed 32 µs interphase pause; contacts shorted after stimulation [1] |
| Charge injection limit | Worst-case 6.5 nC charge imbalance at 1.5 mA and 512 µs measured; contact shorting described as removing residual charge (both kept) [1] |
| Reference and ground | Unreported in reviewed sources |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported in reviewed sources |
| Insertion trauma and BBB disruption | Unreported in reviewed sources |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Unreported in reviewed sources |
| Gliosis and encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Unreported in reviewed sources |
| Typical failure modes | Unreported in reviewed sources |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | 180 nm CMOS SoC 1.5 mm², one off-chip 4.7 µF capacitor [1] |
| Data path | ME wireless command; no recording uplink [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Battery-free; ME transducer about 250 kHz; chip 23.7 µW, about 90% chip efficiency; end to end 0.435% at coil center and 0.064% at 30 mm; saline peak 2.22 mW center and 1.35 mW at 30 mm [1] |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | Seven-day PBS soak retained operation at 2.16-2.25 mW, a bench test; lead-containing PZT needs a barrier [1] |
| MRI compatibility | Artifacts anticipated; MRI qualification not reported [1] |
| Surgical complexity | Unreported in reviewed sources |
| Output connectors | Unreported in reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Unreported in reviewed sources |
| Stability over time | Unreported in reviewed sources |
| Longevity | Seven days in PBS at the coil center; not chronic animal stimulation [1] |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Unreported in reviewed sources |
| Notable demonstrations | Hydra muscle stimulation; 1.35 mW harvested at 30 mm in saline is not an in-vivo implant [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Hydra and saline bench tests [1] |
| Follow-up duration | Unreported in reviewed sources |
| Indications | Unreported in reviewed sources |
| Trials and registries | Unreported in reviewed sources |
| Primary outcomes | Current-controlled wireless stimulation of Hydra muscle [1] |
| Key limitations | Multi-year packaging, tissue response and clinical safety unestablished; exposure modeled against IEEE limits [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Programmable current-controlled output in 8.2 mm³ [1] |
| Limitations | Low end-to-end efficiency; charge imbalance at high current [1] |
| Scaling constraints | Unreported in reviewed sources |

## Published configuration

| Part | Specification |
| --- | --- |
| Implant | 8.2 mm³; 28 mg |
| SoC | 1.5 mm²; 180-nm CMOS |
| ME transducer | 4 × 2 × 0.12 mm; approximately 250 kHz; Metglas and nickel-coated PZT |
| Substrate and contacts | Flexible polyimide; 1-mm² on-board contacts |
| Storage | One off-chip 4.7-µF capacitor |
| Output | Biphasic current; 0.05-1.5 mA in 50-µA steps; 64-512 µs; 0-200 Hz |
| Timing | Fixed 32-µs interphase pause; contacts shorted after stimulation |
| Saline-test packaging | ME film in a printed enclosure with 0.4-mm thickness, then nonconductive epoxy encapsulation |

The contact test compares bare gold with porous platinum coating: impedance at 2 kHz fell from 2,100 to 170 Ω. That is a saline contact measurement, not a human electrode qualification.

## Charge and power measurements

The circuit generates programmed biphasic currents, but measured asymmetry leaves a worst-case 6.5-nC charge imbalance at 1.5 mA and 512 µs. The paper describes post-stimulation contact shorting as removing residual charge. That circuit mechanism is retained alongside the measured imbalance, not converted into unconditional chronic safety.

Chip power is 23.7 µW, with an approximately 90% chip-efficiency claim. End-to-end figures are much smaller: 0.435% at the coil center and 0.064% at 30 mm. The saline power test gives 2.22-mW peak harvested power at center and 1.35 mW at 30-mm transmitter separation. The latter is not a demonstrated 30-mm in-vivo spinal implant.

A seven-day PBS soak at the coil center retained operation with peak recovered power of 2.16-2.25 mW. This is short bench endurance, not seven days of chronic animal stimulation. Agar and air were tested separately.

## Safety boundary

The paper models exposure using its cited IEEE limits. Its MRI-safety discussion compares material mass with another device and anticipates artifacts; it does not report completed MagNI MRI qualification. Lead-containing PZT needs a suitable barrier for chronic use. Multi-year packaging, full tissue response and clinical safety remain unestablished here.

No full model is supplied. Figure 3 and component dimensions establish scale, but complete flex outline, circuit placement, contact spacing and encapsulation geometry are not fully specified. Proposed spinal pain therapy is not a demonstrated application of this paper.

## References

1. [Published primary manuscript, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC8712272/), DOI 10.1109/TBCAS.2020.3037862, Figures 3, 22-28, saline testing and Tables II-III.
