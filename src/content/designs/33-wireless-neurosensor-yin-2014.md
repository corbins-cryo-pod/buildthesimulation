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
