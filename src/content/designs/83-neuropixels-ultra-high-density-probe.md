---
title: "Neuropixels Ultra"
order: 83
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0056"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "6,144-site silicon probe with 5 x 5 µm TiN contacts at 6 µm pitch and 384 simultaneous channels. Dense sampling trades recording span for waveform detail; channel selections and study results are kept separate."
modality: "Intracortical"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/"
tags: ["Neuropixels Ultra", "intracortical", "recording", "silicon", "TiN", "University of Washington", "Allen Institute", "imec", "academic", "preclinical"]
draft: false
---

# Neuropixels Ultra

Ye and colleagues' 2025 Neuron paper describes Neuropixels Ultra (NP Ultra), a silicon probe with much denser sites than earlier Neuropixels probes. Each value is scoped to NP Ultra or to the named experiment. A blank cell means not established by the reviewed primary paper.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neuropixels Ultra (NP Ultra), 6,144-site dense silicon probe |
| Manufacturer | Developed with imec; authors from University of Washington, Allen Institute, Columbia, Janelia and others. Not a commercial release specification |
| Interface class | Penetrating silicon CMOS recording probe |
| Origin | Ye and colleagues; Neuron, online September 30, 2025, issue December 3, 2025. Preprint on bioRxiv April 10, 2024 |
| First demonstrated | 2025 paper |
| First human implant | The paper's references to human Neuropixels recordings concern other work, not NP Ultra |
| Species studied | Mouse (acute head-fixed), macaque monkey, lizard and electric fish recordings. No chronic implants reported in the reviewed text |
| Regulatory status | Preclinical research tool. No human clearance established |
| Function | Extracellular recording with dense sampling for yield, small-footprint waveforms and interneuron classification |
| Target tissue | Mouse visual cortex plus diverse mouse regions (cortex, striatum, thalamus, midbrain, cerebellum, medulla), monkey visual cortex, lizard medial cortex and electric fish cerebellum |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating silicon shank with dense TiN site field, switchable to 384 channels |
| Array layout | 768 x 8 grid of sites with 6 µm center pitch; readout configurations 48 x 8, 96 x 4, 192 x 2 and 384 x 1 |
| Electrode count | 6,144 physical sites; 384 simultaneously recorded channels selected from them |
| Pitch | 6 µm center to center with 1 µm gap between 5 x 5 µm sites |
| Electrode lengths |  |
| Shank width and thickness | Identical to NP 1.0 per the paper; dimensions not restated. Dense site field about 4.6 mm x 48 µm |
| Tip and exposed site geometry | Not given beyond identical-to-NP 1.0 form factor. The 384 x 1 configuration spans 3,840 µm while the dense 48 x 8 configuration spans 288 µm vertically |
| Contact coating | Titanium nitride (TiN) |
| Insulation |  |
| Insertion method | Inserted through craniotomy; mouse recordings used 1-2 mm or 2 mm craniotomies, monkey craniotomy plus durotomy, lizard 3 x 2 mm craniotomy with probe implanted 500 µm deep at about 100 µm/s |
| Anchoring and fixation | Acute head-fixed mice with titanium headpost and cement chamber. Lizard probe lowered by up to 280 µm per day; fixation for lizard otherwise unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 5 x 5 µm (25 µm2) per site, versus 144 µm2 for NP 1.0/2.0 sites |
| Electrode material | TiN sites on silicon CMOS |
| Impedance (with measurement frequency) | About 500 kΩ estimated from test structures for the 25 µm2 sites versus about 100 kΩ for NP 1.0/2.0 sites. Measurement frequency not stated in the reviewed text |
| Noise floor or SNR | Saline noise slightly higher than NP 1.0 (small but significant RMS difference). In vivo median-absolute-deviation noise 20% ± 2% higher than NP 1.0. Modeled electrode noise about doubles but total recording noise rises 23% in saline and 32% in brain tissue; NP 1.0 amplifier noise 5.4 µV RMS |
| Recording modality | Extracellular spikes including small-footprint (under 20 µm) waveforms, axonal and dendritic signals |
| Sampling rate | Uses the Neuropixels 1.0 acquisition chain via SpikeGLX |
| Stimulation capability | Not demonstrated. Photo-artifact and light sensitivity were tested using a 200 µm core fiber in saline |
| Charge injection limit |  |
| Reference and ground | Self-referenced single-ended configuration with ground and reference tied together. Either an external Ag wire above the skull in a Ringer's or cortex-buffer bath, or the tip reference site. Lizard used a silver wire in CSF |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Mouse, monkey, lizard and electric fish neural tissue, region-specific |
| Insertion trauma and BBB disruption | Craniotomy required. Insertion-related injury is not quantified for NP Ultra in the reviewed text |
| Vascular disruption risk |  |
| Micromotion sensitivity | Acute head-fixed recordings with imposed probe motion as ground truth; chronic micromotion not tested |
| Gliosis and encapsulation | Not assessed |
| Neuron loss near sites | Not assessed. Muscimol control confirmed identities of small-footprint waveforms |
| Foreign-body response mitigation | None described |
| Typical failure modes | Higher noise from smaller sites; narrow span of 288 µm in the densest configuration; unit drift under motion; no chronic failure data |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Same CMOS base as Neuropixels 1.0 with switch memory shared among grouped sites |
| Data path | Same acquisition path as Neuropixels 1.0 using SpikeGLX; reviewed text gives no probe-specific link rate |
| Telemetry bandwidth | Not applicable: wired |
| Sampling rate |  |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity | Identical to NP 1.0 form factor; construction details unreported |
| MRI compatibility |  |
| Surgical complexity | Craniotomy and acute head-fixed insertion; animal surgery with headplate. Human workflow not applicable |
| Output connectors | Identical to NP 1.0 base and cable per the paper; connector specifics unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Mouse V1 visually responsive neuron yield more than 2-fold versus NP 1.0-like resampling; 1.7 times higher yield of well-isolated neurons than NP 1.0-like on average |
| Chronic yield | Not demonstrated. Sessions lasted about 1.5 to 2 h, repeated across up to three consecutive days per animal |
| Stability over time | Stability ratio measured under imposed slow probe motion during visual fingerprint sessions; not chronic stability |
| Longevity | Not demonstrated. Daily sessions of about 2 h and at most three consecutive days per animal in acute studies |
| Revision and explant experience | Not applicable: no chronic explant reported |
| Adverse events |  |
| Notable demonstrations | Dense sampling raised amplitude, SNR and localization; small-footprint waveforms (under 20 µm) found in all four species, about 10% in mouse V1 (36/359) and monkey V1 (13/124); optotagged PV, SST and VIP interneuron classification (89%, 82%, 83% correct with balanced sampling) |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mouse cohorts included three VGAT-ChR2-EYFP male mice aged 6 months for acute head-fixed recordings; 175 units in 3 mice and 6 sessions for muscimol footprint test; plus monkey, lizard and electric fish animals |
| Follow-up duration | Acute sessions only; at most three consecutive days per animal |
| Indications | Preclinical neuroscience recording, not a clinical indication |
| Trials and registries | Animal ethics approvals per laboratory; no human registry |
| Primary outcomes | Higher neuron yield, small-footprint detection and cell-type classification |
| Key limitations | Smaller recording span, higher noise, acute rodent and animal data only, resampling-based comparisons for part of the yield result |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Dense 1.3 sites per µm; very high site density with one probe |
| Limitations | Only 384 of 6,144 sites record at once, with 288 µm coverage in the densest layout; higher site impedance and noise |
| Scaling constraints | Grouped switching shares switch memory, so not every site pattern is selectable; coverage trades directly against density |

## References

- Ye Z et al. [Ultra-high density electrodes improve detection, yield, and cell type identification in neuronal recordings](https://pmc.ncbi.nlm.nih.gov/articles/PMC12981004/). Neuron 2025. Publisher: [Cell Press](https://www.cell.com/neuron/fulltext/S0896-6273(25)00665-8).
- [Author-hosted publisher PDF](https://www.yezhiwen.com/assets/pdf/ye2025_neuropixels_ultra.pdf).
- [NP 1.0 manufacturer datasheet](https://www.neuropixels.org/_files/ugd/832f20_4a14406ba1204e60ae8534b09e201b49.pdf), used for the reference model silicon thickness only.

Related: [animal recording and classification study](/applications/84-neuropixels-ultra-animal-recordings-2025/).

The viewer model is a cropped 48 x 8 dense window: 384 contact faces at 6 µm center pitch, each 5 x 5 µm. It is not the whole 6,144-site probe. Full shank, tip origin, switch groups, channel map and electronics are omitted.
