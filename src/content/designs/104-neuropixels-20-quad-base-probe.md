---
title: "Neuropixels 2.0 Quad Base probe"
order: 104
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0066"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Four-shank, 1,536-channel Neuropixels 2.0 Quad Base: 5,120 TiN sites, larger base/headstage and July 2026 mouse preprint evidence. Not standard 384-channel 2.0 or NXT/NP 3.0."
modality: "Intracortical"
website: "https://www.neuropixelscentral.org/technology"
tags: ["Neuropixels", "Quad Base", "silicon", "TiN", "JHU", "Janelia", "imec", "preclinical", "preprint"]
draft: false
---

# Neuropixels 2.0 Quad Base

Quad Base keeps the four-shank Neuropixels 2.0 recording geometry while expanding the electronics to 1,536 simultaneous channels. The July 27, 2026 manuscript is a preprint, not peer-reviewed evidence. A blank cell means not established by the reviewed sources: the manufacturer datasheet and manual, the preprint and Neuropixels Central.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neuropixels 2.0 Quad Base, four-shank, 1,536-channel probe |
| Manufacturer | Manufacturer datasheet from the Neuropixels program with imec; preprint affiliations include Johns Hopkins University, HHMI Janelia and imec |
| Interface class | Penetrating silicon CMOS recording probe |
| Origin | Johns Hopkins, Janelia and imec; July 27, 2026 bioRxiv preprint |
| First demonstrated | Preprint dated July 27, 2026. Neuropixels Central states purchase availability since August 2025, a source-reported statement not verified as stock or delivery |
| First human implant | Research-use-only in non-human subjects; not manufactured or approved for human or clinical use |
| Species studied | Mouse recordings in the preprint; two probes (eight shanks) gave 3,072 channels in the mouse application |
| Regulatory status | Research use only, non-human subjects. No clinical clearance |
| Function | High-channel extracellular recording across four shanks |
| Target tissue | Rodent brain; targets per preprint experiments |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Four-shank silicon CMOS probe with enlarged base and headstage |
| Array layout | Four shanks, two-column site layout per the manufacturer datasheet; 384 channels selectable from 1,280 sites per shank |
| Electrode count | 5,120 physical TiN sites (1,280 per shank); 1,536 simultaneous channels per probe, 384 per shank |
| Pitch | 15 µm column pitch and 32 µm row pitch per the manufacturer datasheet |
| Electrode lengths | 10 mm per shank |
| Shank width and thickness | Shank cross-section 70 x 24 µm. Probe base 10.2 mm wide versus 3.5 mm for standard 2.0 in the preprint. Headstage 14 x 18 mm versus 10 x 14 mm for standard 2.0 |
| Tip and exposed site geometry | Tip geometry not reported |
| Contact coating | Titanium nitride |
| Insulation |  |
| Insertion method | Not given beyond rodent implantation methods in the preprint |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 12 x 12 µm (144 µm2) per site, geometric, per the manufacturer datasheet |
| Electrode material | Titanium nitride on silicon |
| Impedance (with measurement frequency) | Not given as a Quad Base impedance |
| Noise floor or SNR | Preprint Supplementary Figure S1: mean noise 7.83, 7.88 and 8.03 µV for three probes, 300 to 10,000 Hz band. Standard 2.0 comparator specification 6.8 µV RMS is not a Quad Base value. Channels under 50% of average gain excluded; low-gain fractions 0.26%, 0.85% and 0.13% for probes A to C; above 10 µV noise 2.08%, 1.30%, 2.41% |
| Recording modality | Extracellular spikes and local signals |
| Sampling rate |  |
| Stimulation capability | Recording only |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Rodent brain |
| Insertion trauma and BBB disruption | Rigid four-shank insertion; injury and blood-brain barrier disruption not reported |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes | Low-gain and high-noise channels (see noise row) remain in the array; no failure analysis beyond that |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | CMOS probe base with 1,536 readout channels |
| Data path | Probe to headstage to acquisition system; details beyond headstage dimensions not reported |
| Telemetry bandwidth | Not applicable: wired |
| Sampling rate |  |
| Power | Datasheet lists package mass 0.51 to 0.55 g, which excludes cable and acquisition |
| Thermal management |  |
| Packaging and hermeticity | Silicon-spacer or metal-cap package alternatives exist per the manufacturer; they are not one universal enclosure |
| MRI compatibility |  |
| Surgical complexity | Rodent craniotomy and four-shank insertion; human surgery not applicable |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Two probes gave 3,072 channels in mouse sequence recordings per the application page; per-probe yield not reported here |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience | Not applicable |
| Adverse events |  |
| Notable demonstrations | Large-scale simultaneous mouse recording with 3,072 channels from two probes (preprint, not peer reviewed) |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mouse cohort in the preprint; size not itemized in this sheet |
| Follow-up duration |  |
| Indications | Research recording, not a clinical indication |
| Trials and registries | None |
| Primary outcomes | Characterization of noise and gain on three probes and mouse recordings |
| Key limitations | Preprint, not peer reviewed; noise comparisons use a spec for the standard 2.0 and measured values for Quad Base; channels with defects remain |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Four shanks and 1,536 simultaneous channels from one probe |
| Limitations | Larger base and headstage (10.2 mm base, 14 x 18 mm headstage); excluded channels |
| Scaling constraints | Larger base limits packing and implantation space; channel count does not equal 5,120 simultaneous sites |

## References

- [Manufacturer Quad Base datasheet, including research-use restriction](https://www.neuropixels.org/_files/ugd/328966_4e39ab2e46424dc9b3efa446d286ab0f.pdf).
- [Manufacturer Quad Base user manual](https://www.neuropixels.org/_files/ugd/328966_ae4bf1dc4ccd4be6bc55faa19dc02631.pdf).
- [July 27, 2026 preprint full text](https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full) and [PDF with Figure 1 and Supplementary Figure S1](https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full.pdf).
- [Neuropixels Central technology page](https://www.neuropixelscentral.org/technology) and [NXT/NP 3.0 access announcement](https://www.neuropixelscentral.org/post/neuropixels-nxt-3-0-probe-access-challenge-pac).

Boundaries: distinct from the [384-channel 2.0 alpha probe](/devices/88-neuropixels-20-alpha-probe/) and from NXT/NP 3.0, whose mapping of up to 912 channels to one shank is a different capability. Related: [mouse recording application](/applications/105-neuropixels-quad-base-mouse-sequences-2026/). No full 3D model is supplied.
