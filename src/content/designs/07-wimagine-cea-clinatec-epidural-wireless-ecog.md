---
title: "WIMAGINE (CEA-Clinatec) epidural wireless ECoG implant"
order: 7
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-IMBCI-0004"
interface_class: "ecog"
status: "human"
last_updated: 2026-02-06
description: "A fully implanted, wireless epidural ECoG system developed by CEA-Clinatec for human motor BCI research, emphasizing clinical robustness and long-term stability over single-unit precision."
modality: "Cortical surface"
successRank: 14
website: "https://clinatec.fr/"
tags: ["BCI", "ECoG", "epidural", "wireless", "CEA", "Clinatec", "WIMAGINE", "motor decoding", "cortex", "recording"]
draft: false
---

# WIMAGINE (CEA-Clinatec) epidural wireless ECoG implant

The tables use the same field framework as the other implant-device sheets. Values belong to the named study or configuration. A blank cell means the reviewed sources do not establish a value, not that the device lacks that property.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | WIMAGINE |
| Manufacturer | CEA-Clinatec, France; Sauter-Starace 2019 and 2015 development report |
| Interface class | Fully implanted wireless epidural ECoG recorder |
| Origin | CEA development; primary design published before the reviewed 2019 sheep study |
| First demonstrated | 2013 device conference report cited by the development literature; not a first implantation date |
| First human implant | June 2017 and November 2019 for the two patients in the 2021 stability study |
| Species studied | Sheep in 2019; humans in 2021 |
| Regulatory status | Research clinical protocol; conformity testing is not a claim of general market authorization |
| Function | Recording for motor BCI |
| Target tissue | Epidural surface above sensorimotor cortex |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Non-penetrating epidural ECoG |
| Array layout | 64 electrodes fixed beneath titanium cranial housing, 2019 Methods |
| Electrode count | 64 recording electrodes per implant, 2019 Methods |
| Pitch | 4 mm lateral and 4.5 mm anteroposterior, 2019 Methods |
| Electrode lengths | Not applicable; surface contacts |
| Shank width and thickness | Not applicable; implant fits a 50 mm craniotomy with 90 mm upper-surface curvature, 2019 Methods |
| Tip and exposed site geometry | 2.3 mm diameter contacts, 2019 Methods |
| Contact coating | Platinum-iridium 90/10 contact material, 2019 Methods |
| Insulation |  |
| Insertion method | 50 mm craniotomy; contacts above intact dura, implant replaces removed bone, 2019 Methods |
| Anchoring and fixation | Four titanium wings protect against pressure or shocks, 2019 Methods; fixation details beyond these unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material | Platinum-iridium 90/10, 2019 Methods |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR | 2015 development abstract: less than 0.7 µV RMS input-referred noise over 0.5-300 Hz; not a chronic in-vivo SNR |
| Recording modality | ECoG population field potentials |
| Sampling rate | 976 Hz, 12-bit ADC in 2019 sheep protocol; contacts recorded in successive 16-contact phases |
| Stimulation capability | Recording device; no therapeutic stimulation capability established |
| Charge injection limit | Not applicable to the reviewed recording use |
| Reference and ground | Reference electrodes shown in 2019 Figure 9; electrical topology unreported in this audit |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Dura over sensorimotor cortex |
| Insertion trauma and BBB disruption | Epidural placement without cortical penetration; quantitative BBB disruption unreported |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation | 2019 sheep histology: increased GFAP reactivity in glia limitans and layer I under implant; do not describe as no gliosis |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes | General failure rates unreported; 2021 measures signal stability, not lifetime reliability |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Amplification and digitization beneath titanium housing, 2019/2015 descriptions |
| Data path | Wireless implant to external base station and laptop |
| Telemetry bandwidth | About 250 kb/s in 2-FSK mode, 2019 sheep protocol; MICS band 402-405 MHz |
| Sampling rate | 976 Hz in 2019 sheep protocol; 16 contacts at a time |
| Power | Remote inductive power at 13.56 MHz, 2019 Methods; not a rechargeable implanted battery claim |
| Thermal management |  |
| Packaging and hermeticity | Hermetic titanium housing in 2015 development abstract |
| MRI compatibility |  |
| Surgical complexity | 50 mm cranial opening and epidural module placement, 2019 Methods |
| Output connectors | Wireless base station to computer; no percutaneous electrode connector in described system |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield | No single yield percentage; two sheep retained relatively stable ECoG and SSEP over 10 months, 2019 |
| Stability over time | 2021 two-patient study: limited decline in RMS, band power and SNR; effective bandwidth and spectral edge frequency stable |
| Longevity | 32 and 14 months observed in two patients, 2021; not a maximum service life |
| Revision and explant experience | Postmortem explant and histology in two sheep, 2019; human revision rate unreported |
| Adverse events | Human adverse-event rate unreported in reviewed stability abstract; no generic safety claim |
| Notable demonstrations | Task-related motor imagery discrimination maintained beyond two years in 2021 study |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Two bilaterally implanted quadriplegic patients, 2021 stability study |
| Preclinical cohort | Two sheep, 2019 study |
| Follow-up duration |  |
| Indications | Motor BCI for paralysis research |
| Trials and registries | NCT02550522 is retained as the linked protocol record; current recruitment status not asserted |
| Primary outcomes | Longitudinal ECoG stability, effective bandwidth and evoked responses |
| Key limitations | Small cohorts, species-specific skull/contact geometry, 16-contact phased acquisition in sheep protocol |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Wireless fully implanted epidural acquisition with chronic human signal evidence |
| Limitations | Population recording, not single-unit access; histological reaction still documented in sheep |
| Scaling constraints | Wireless throughput, power and cranial footprint; no quantitative maximum channel count established beyond reviewed configuration |

## References

- Sauter-Starace et al. 2019. [Long-Term Sheep Implantation of WIMAGINE, a Wireless 64-Channel Electrocorticogram Recorder](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2019.00847/full).
- [Long-term stability of the chronic epidural wireless recorder WIMAGINE in tetraplegic patients](https://iopscience.iop.org/article/10.1088/1741-2552/ac2003). 2021.
- [WIMAGINE development report](https://www.frontiersin.org/10.3389/conf.fnhum.2015.218.00028/event_abstract). 2015 conference abstract, used only for explicitly scoped hardware descriptions.
- [Clinical protocol NCT02550522](https://clinicaltrials.gov/study/NCT02550522). No current recruitment status asserted.
