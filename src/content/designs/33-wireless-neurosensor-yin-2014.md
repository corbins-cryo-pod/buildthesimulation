---
title: "Head-mounted wireless neurosensor (Brown, 2014)"
order: 33
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0012"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "External Brown2014 neurosensor: 96 neural channels plus auxiliary paths, 20 kS/s per channel, 46.1-g headstage and over48-hour reported runtime. Battery chemistry wording conflict retained; not a fully implanted package."
modality: "Intracortical"
successRank: 33
website: "https://pubmed.ncbi.nlm.nih.gov/25482026/"
tags: ["wireless", "head-mounted", "broadband", "freely behaving", "Brown", "Nurmikko", "academic", "preclinical"]
draft: false
---

# Head-mounted wireless neurosensor (Brown, 2014)

An external, head-mounted recording transmitter connected to implanted electrodes. It frees the animal from a cable to the acquisition equipment, but the transmitter itself is not a fully implanted package. The paper explicitly distinguishes this platform from the [2013 subcutaneous Brown implant](/devices/32-brown-implantable-wireless-neural-interface-borton/).

## Core interface specifications

The 12 fields follow the Blackrock Utah table for comparison, not a manufacturer-issued datasheet. Missing values remain unreported; inapplicable fields are marked. Configuration-specific details and limits follow below.

| Field | Specification and source scope |
| --- | --- |
| Electrode Pitch | Connected electrode-array pitch not extracted for this system; no current Utah geometry assigned backward |
| Channel Count | 100 amplifier inputs allocated to 96 neural inputs, three accelerometer axes and one calibration reference |
| Output Connectors | Screw-on pedestal interconnect; amplifier PCB land-grid pads matched to MEA pedestal through anisotropic conductive polymer |
| Output Conn. dimensions L x W x H | Complete connector envelope not assigned. Interface polymer 0.3 mm thick, 15 mm diameter; whole headstage 52 × 44 × 30 mm is separate |
| Standard Electrode Lengths | Connected electrode shank lengths not assigned from reviewed source; headstage dimensions are not shank lengths |
| Impedance | No electrode impedance range assigned here; 2.83 µV RMS is amplifier input-referred noise, not electrode impedance |
| Array Dimensions | Connected array footprint not assigned; external headstage 52 × 44 × 30 mm |
| Multi-Port Options | Not a manufacturer multi-port option. Spatially distributed receivers extend wireless coverage, not intracortical electrode count |
| Metalization | Paper discusses platinum-coated electrode safety; pedestal-interface copper LGA pads are a different component |
| Wire Bundle Length | Electrode-to-pedestal bundle length not assigned here; wireless headstage-to-receiver link does not eliminate intracranial wires |
| Reference and Ground | One amplifier input tied to reference for calibration; input protection references a low-impedance ground electrode. Full array reference routing not reconstructed |
| Insulation | Static-dissipative carbon-fiber-reinforced PEEK enclosure and anisotropic conductive polymer interface; no full electrode insulation stack assigned |

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Head-mounted wireless neurosensor with spatially distributed receiver network [1] |
| Manufacturer | Brown University research system; authors Ming Yin, David Borton, Jacob Komar and colleagues; senior author Arto Nurmikko [1] |
| Interface class | External head-mounted transmitter wired to implanted neural probes; not fully implanted |
| Origin | Brown University, Neuron 84:1170-1182, 2014 [1] |
| First demonstrated | 2014 paper, freely behaving nonhuman primates [1] |
| First human implant | None established by the animal demonstrations |
| Species studied | Nonhuman primates; the locomotion analysis describes three monkeys [1] |
| Regulatory status | Research device; the paper's safety analyses are not a general approval of the headstage or any compatible probe [1] |
| Function | Broadband neural recording, not implanted electrical stimulation [1] |
| Target tissue | Cortex, through connected implanted neural probes [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Wired connection to implanted neural probes; wireless link from headstage to receivers [1] |
| Array layout | Unreported in the reviewed sources |
| Electrode count | 100 amplifier inputs: 96 neural, three accelerometer axes and one calibration reference; connected array count not assigned [1] |
| Pitch | Not extracted for this system; no Utah geometry assigned backward |
| Electrode lengths | Not assigned; headstage dimensions are not shank lengths |
| Shank width and thickness | Headstage envelope 52 × 44 × 30 mm, which is not an implanted array size [1] |
| Tip and exposed site geometry | Unreported in the reviewed sources |
| Contact coating | Paper discusses platinum-coated electrode safety; copper LGA pads on the pedestal interface are a different component [1] |
| Insulation | Static-dissipative carbon-fiber-reinforced PEEK enclosure and anisotropic conductive polymer interface; no full electrode insulation stack assigned [1] |
| Insertion method | Unreported in the reviewed sources |
| Anchoring and fixation | Screw-on pedestal interconnect; interface polymer 0.3 mm thick, 15 mm diameter [1] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in the reviewed sources |
| Electrode material | Unreported in the reviewed sources |
| Impedance (with measurement frequency) | No electrode impedance assigned; 2.83 µV RMS is amplifier input-referred noise, not electrode impedance [1] |
| Noise floor or SNR | Preamplifier input-referred noise 2.83 µV RMS; noise-efficiency factor 3.3 [1] |
| Recording modality | Broadband neural population activity, with locomotion and sleep-wake recordings [1] |
| Sampling rate | 20 kS/s per channel [1] |
| Stimulation capability | Not applicable; recording only |
| Charge injection limit | Unreported in the reviewed sources |
| Reference and ground | One amplifier input tied to reference for calibration; input protection references a low-impedance ground electrode; full array reference routing not reconstructed [1] |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortex through the connected array; the headstage adds enclosure, connector, motion and radio-link constraints [1] |
| Insertion trauma and BBB disruption | Unreported in the reviewed sources |
| Vascular disruption risk | Unreported in the reviewed sources |
| Micromotion sensitivity | Unreported in the reviewed sources |
| Gliosis and encapsulation | Unreported in the reviewed sources |
| Neuron loss near sites | Unreported in the reviewed sources |
| Foreign-body response mitigation | Unreported in the reviewed sources |
| Typical failure modes | Unreported in the reviewed sources |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Three custom ASICs plus external components; preamplifier pass band with tunable lower edge much less than 0.1 Hz and upper edge 7.8 kHz [1] |
| Data path | On-off-keyed radio, transmitter tunable over 3-4 GHz; four receiving antennas in the tested network; link up to 5 m [1] |
| Telemetry bandwidth | Transmitter chip capable of up to 200 Mbit/s over 1-2 m; not substituted for a measured neural payload rate at 5 m [1] |
| Sampling rate | 20 kS/s per channel [1] |
| Power | Single 1.2-Ah half-AA Li-SOCl₂ primary battery per Methods (Results text says Li-ion; conflict retained); headstage current 17 mA at low-RF or 27 mA at high-RF output [1] |
| Thermal management | Unreported in the reviewed sources |
| Packaging and hermeticity | Headstage 52 × 44 × 30 mm, 46.1 g (battery 8.7 g, PEEK enclosure 33.8 g, electronics 3.6 g) [1] |
| MRI compatibility | Unreported in the reviewed sources |
| Surgical complexity | Unreported in the reviewed sources |
| Output connectors | Screw-on pedestal interconnect; amplifier PCB land-grid pads matched to the array pedestal through anisotropic conductive polymer [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in the reviewed sources |
| Chronic yield | Unreported in the reviewed sources |
| Stability over time | Unreported in the reviewed sources |
| Longevity | More than 48 hours of continuous runtime on the battery [1] |
| Revision and explant experience | Unreported in the reviewed sources |
| Adverse events | Unreported in the reviewed sources |
| Notable demonstrations | Population recordings in freely moving monkeys during treadmill locomotion and sleep-wake transitions [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None established; human use is discussed as a prospective application [1] |
| Preclinical cohort | Freely behaving nonhuman primates; three monkeys in the locomotion analysis [1] |
| Follow-up duration | Unreported in the reviewed sources |
| Indications | Neural recording research |
| Trials and registries | Unreported in the reviewed sources |
| Primary outcomes | Wireless broadband recording of population activity, with decoded brain states, in freely moving monkeys [1] |
| Key limitations | External transmitter, not an implanted package; compatibility with other probes does not establish their qualification; ADC resolution and clinical reliability period not populated [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Cable-free recording in freely moving animals, spatially distributed receivers mitigate multipath fading [1] |
| Limitations | Headstage still sits on a wired connection to the implanted probe; Li-SOCl₂ primary battery chemistry [1] |
| Scaling constraints | Unreported in the reviewed sources |

## Identity and configuration

| Property | Published configuration |
| --- | --- |
| Primary authors | Ming Yin, David Borton, Jacob Komar and colleagues; senior author Arto Nurmikko |
| Primary paper | Neuron 84:1170-1182, 2014 |
| Hardware | Head-mounted neurosensor and spatially distributed receiver network |
| Function | Broadband neural recording, not implanted electrical stimulation |
| Interface | Wired connection to implanted neural probes; wireless link from headstage to receivers |
| Evidence | Freely behaving nonhuman primates, locomotion and sleep-wake recording |
| Human clinical status | Not established by the animal demonstrations |

## Geometry and packaging

| Property | Published specification |
| --- | --- |
| Headstage envelope | 52 × 44 × 30 mm |
| Whole headstage mass | 46.1 g |
| Mass components | Battery 8.7 g; PEEK enclosure 33.8 g; electronics 3.6 g |
| Enclosure | Static-dissipative, carbon-fiber-reinforced PEEK |
| Integrated electronics | Three custom ASICs plus external components |
| Sensor versus tissue implant | Headstage dimensions are not the size of the implanted electrode array |

The platform can connect to different neural probes; compatibility does not make every possible probe part of the tested assembly or establish its surgical/clinical qualification.

## Electrical and system specifications

| Property | Published specification and condition |
| --- | --- |
| Amplifier capacity | 100 input paths |
| Neural recording paths | 96; three paths carry accelerometer signals and one is a noise-calibration reference |
| Per-channel sampling | 20 kS/s |
| Preamplifier input-referred noise | 2.83 µV RMS; noise-efficiency factor 3.3 |
| Preamplifier pass band | Tunable lower edge reported as much less than 0.1 Hz; upper edge 7.8 kHz |
| Radio | On-off-keyed link; transmitter tunable over 3-4 GHz |
| Tested receiver network | Four receiving antennas, expandable architecture |
| Reported link distance | Up to 5 m for the described SIMO link |
| Headstage current | 17 mA at low-RF output or 27 mA at high-RF output |
| Methods battery | Single 1.2-Ah half-AA Li-SOCl₂ primary battery |
| Reported runtime | More than 48 hours continuously |

The introductory Results text calls the battery "Li-ion," while the detailed Methods specifies a Li-SOCl₂ primary battery. That chemistry conflict is retained; no rechargeable battery is inferred. The transmitter chip's up-to-200-Mbit/s capability over 1-2 m is not substituted for a measured end-to-end neural payload rate at 5 m. Amplifier capacity, neural channels and auxiliary channels remain separate.

## Tissue interface and reliability

The tissue interface belongs to the connected electrode array, while the headstage introduces enclosure, connector, motion and radio-link constraints. Spatially distributed receivers mitigate multipath fading in a moving environment. That link design does not eliminate electrode tissue response or prove chronic implanted enclosure safety.

The paper's electrical-safety and RF-exposure analyses concern the stated device and tests. They are not a general MRI label, unrestricted human-use authorization or approval of every compatible neural probe.

## Evidence and regulatory boundary

The study recorded population activity in freely moving monkeys, including treadmill locomotion and sleep-wake transitions. The locomotion analysis describes three monkeys and multiple walking speeds. Selected recordings and decoded brain states are experimental results, not proof of an implanted therapeutic system.

Human use is discussed as a prospective application; no human implantation of this headstage is established here. The earlier sheet omitted mass, channel allocation and battery life because they had not been extracted. Those values now come from the inspected full primary paper rather than a generic wireless-system assumption.

## Model and missing specifications

No full 3D model is supplied. The headstage envelope does not define PCB placement, connector pinout, receiver layout or the implanted array's geometry. ADC resolution and a universal clinical reliability period are not populated here without a verified source-specific extraction.

## Primary sources

- Yin M et al. [Full primary paper and Methods](https://www.sciencedirect.com/science/article/pii/S0896627314010101), 2014, DOI 10.1016/j.neuron.2014.11.010.
- [Primary abstract and authorship](https://pubmed.ncbi.nlm.nih.gov/25482026/).
