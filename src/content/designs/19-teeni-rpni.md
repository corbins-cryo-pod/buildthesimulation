---
title: "RPNI with implanted bipolar EMG electrodes (Vu 2023 configuration)"
order: 19
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0010"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "A muscle-mediated peripheral nerve interface (RPNI) used as a biological signal amplifier: reinnervated muscle grafts generate stable, high-SNR EMG for long-term prosthetic control without chronic intraneural electrodes."
modality: "Peripheral nerve"
successRank: 16
website: "https://pubmed.ncbi.nlm.nih.gov/37023743/"
tags: ["PNI", "RPNI", "biohybrid", "EMG", "amputation", "prosthetic control", "neuroma prevention", "peripheral nerve", "recording", "stimulation", "bidirectional", "regenerative"]
draft: false
---

# RPNI with implanted bipolar EMG electrodes (Vu 2023 configuration)

All rows follow the shared implant-device template. Measurements belong to the named study or configuration. Unreported means the reviewed sources do not establish a value. Proposed architectures, optical behavior and validated electronic recording systems are kept separate.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | RPNI muscle graft plus implanted bipolar EMG electrodes, Vu 2023 configuration. Not TEENI |
| Manufacturer | University of Michigan research system; electrode manufacturer not specified in reviewed 2023 Methods |
| Interface class | Regenerative muscle-mediated peripheral interface |
| Origin | University of Michigan RPNI program |
| First demonstrated | Earlier RPNI studies cited by Vu 2023; earliest demonstration not independently established here |
| First human implant | Not dated by reviewed 2023 Methods; electrodes implanted one year after RPNI surgery in two participants |
| Species studied | Two human participants with transradial amputations, Vu 2023 |
| Regulatory status | University of Michigan IRB HUM00124839 research approval; not general clinical device authorization |
| Function | Record muscle EMG to decode prosthetic movements; RPNI graft biologically amplifies efferent nerve signals |
| Target tissue | Reinnervated skeletal muscle grafts plus residual innervated muscles |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Intramuscular bipolar recording electrodes in reinnervated muscle, not intrafascicular nerve electrodes |
| Array layout | P1: median and ulnar RPNIs plus six residual muscles; P2: median and two divided-ulnar RPNIs plus five residual muscles |
| Electrode count | Eight indwelling bipolar electrodes per participant, distributed between RPNIs and residual muscles. Not eight RPNIs |
| Pitch | No fixed array pitch; grafts and muscle electrodes individually placed |
| Electrode lengths | Unreported in reviewed sources |
| Shank width and thickness | Unreported in reviewed sources |
| Tip and exposed site geometry | Bipolar intramuscular electrode; contact geometry not specified in reviewed 2023 Methods |
| Contact coating | Unreported in reviewed sources |
| Insulation | Unreported in reviewed sources |
| Insertion method | RPNI surgery for neuroma/phantom pain followed one year later by muscle electrode implantation |
| Anchoring and fixation | Intramuscular implantation with percutaneous connectors; exact lead fixation not specified in reviewed 2023 Methods |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in reviewed sources |
| Electrode material | Unreported in reviewed sources |
| Impedance (with measurement frequency) | Unreported in reviewed sources |
| Noise floor or SNR | RPNI SNR 15-250 across sessions. Median (IQR): P1 47.61 (103.89), P2 24.49 (18.53). RMS voluntary EMG divided by RMS resting noise, Vu 2023 |
| Recording modality | EMG from RPNI and residual muscles, not direct neural spikes |
| Sampling rate | NeuroPort acquisition 30 ksps; decoded after downsampling to 1 kSps, Vu 2023 |
| Stimulation capability | Not demonstrated by this motor-control recording study |
| Charge injection limit | Not applicable to demonstrated recording task; stimulation limit unreported |
| Reference and ground | Bipolar electrode recordings; separate reference/ground details not given in reviewed 2023 Methods |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Muscle grafts revascularized and reinnervated by transected nerves; electrodes in muscle |
| Insertion trauma and BBB disruption | BBB: not applicable. Peripheral surgery neurotizes free muscle graft and later implants muscle electrodes |
| Vascular disruption risk | Free graft initially devascularized, then revascularizes; quantitative surgical complication rate unreported here |
| Micromotion sensitivity | Day-to-day EMG variation observed; paper does not find substantial cluster centroid shifts across arm positions. Not a mechanical motion measurement |
| Gliosis and encapsulation | Peripheral muscle interface; CNS gliosis not applicable. Electrode-muscle fibrosis not quantified in reviewed 2023 report |
| Neuron loss near sites | Not quantified; interface records muscle rather than placing contacts among CNS neurons |
| Foreign-body response mitigation | Biological amplification avoids a direct nerve-contact recording interface; not proof that electrode-muscle foreign-body response is absent |
| Typical failure modes | Session-to-session EMG amplitude variation and degraded nine-movement decoding without recalibration reported; hardware failure rates unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Implanted electrodes wired to external acquisition; active implanted processor not reported |
| Data path | Percutaneous connectors to Blackrock NeuroPort; Matlab target xPC decodes movements |
| Telemetry bandwidth | Not applicable to wired research configuration |
| Sampling rate | 30 ksps raw, 1 kSps decoder input; raw 3-7000 Hz filter, decoder 100-500 Hz filter |
| Power | External acquisition, computer and prosthesis; implant power draw unreported |
| Thermal management | Unreported in reviewed sources |
| Packaging and hermeticity | Percutaneous research electrode system; hermetic lifetime qualification unreported |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | RPNI muscle graft surgery followed by separate indwelling electrode surgery; graft number/targets differ between participants |
| Output connectors | Percutaneous connectors to external NeuroPort; exact connector part unreported in 2023 Methods |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Per-contact acute manufacturing/implant yield unreported |
| Chronic yield | RPNI SNR at least 15 across sampled sessions through 276 d (P1) and 1054 d (P2); not a contact-survival percentage |
| Stability over time | Monthly recordings interrupted by COVID-19 pauses. P2 four-grip performance above 94% across 604 d without recalibration; nine-movement offline performance often declined |
| Longevity | 1054 d post-electrode implantation signal observation in P2; not continuous acquisition or maximum service life |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | Quantitative adverse-event accounting unreported in reviewed 2023 Methods/Results; not evidence of zero complications |
| Notable demonstrations | P2 coffee-making sequence 99% accuracy over 611 d without decoder recalibration; uses RPNI plus residual-muscle channels |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Two transradial-amputation participants: P1 two RPNIs; P2 three RPNIs |
| Preclinical cohort | Not applicable to the audited 2023 human study |
| Follow-up duration | Signal quality: 12 sessions over one year for P1, 27 over three years for P2; last signal recordings 276 and 1054 d after electrode implantation |
| Indications | Experimental upper-limb prosthetic motor control; RPNI surgeries initially for neuroma and phantom pain |
| Trials and registries | IRB HUM00124839 given; trial registry identifier unreported in reviewed report |
| Primary outcomes | EMG SNR, movement decoding, arm-position robustness and physical coffee-making task |
| Key limitations | Small cohort; physical/prolonged decoder tasks in P2 only. Mixed RPNI/residual-muscle signals, not RPNI-only accuracy. TEENI is a different hydrogel-thread platform |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Large muscle-amplified signals and multi-year sampled signal follow-up |
| Limitations | Graft and electrode surgery, percutaneous leads, small cohort and session variability |
| Scaling constraints | More independent graft/muscle channels require surgery and lead routing; nine-movement results do not inherit four-grip accuracy |

## References

- Vu et al. 2023. [Long-term upper-extremity prosthetic control using regenerative peripheral nerve interfaces and implanted EMG electrodes](https://beta.iopscience.iop.org/article/10.1088/1741-2552/accb0c). Methods and Results; RPNI plus residual-muscle channels.
- Spearman et al. 2020. [Integration of Flexible Polyimide Arrays into Soft Extracellular Matrix-based Hydrogel Materials for a Tissue-Engineered Electronic Nerve Interface](https://pmc.ncbi.nlm.nih.gov/articles/PMC8086190/). TEENI is a separate hydrogel/polyimide-thread device, not a name for RPNI.
- [University of Florida TEENI project](https://www.eng.ufl.edu/nimet/research/projects/the-tissue-engineered-electronic-nerve-interface-teeni/). Institutional context for the separate platform.
