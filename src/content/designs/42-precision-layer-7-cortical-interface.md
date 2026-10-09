---
title: "Precision Layer 7 Cortical Interface"
order: 42
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0021"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-07
description: "Precision's thin-film cortical array. The 2025 paper reports a 1,024-channel version with 977 recording, 42 stimulation-optimized and five reference electrodes; FDA Layer 7-T clearance is separate from the future wireless BCI."
modality: "Cortical surface"
successRank: 42
website: "https://www.precisionneuro.io/articles/company-news/precision-neuroscience-receives-fda-clearance-for-high-resolution-cortical-electrode-array"
tags: ["Precision Neuroscience", "Layer 7", "thin film", "ECoG", "FDA 510(k)", "cortical surface", "human", "company"]
draft: false
---

# Precision Layer 7 Cortical Interface

A thin-film cortical-surface electrode interface from Precision Neuroscience, with research configurations and a cleared temporary-use product. A permanent wireless BCI is a separate system, not an outcome established by the array's clearance. Values below are scoped to the 2025 paper's two research versions and the cleared Layer 7-T record; they are not merged into one device. A [2025 feasibility study](/applications/72-precision-cortical-array-feasibility-2025/) covers the pig and cadaver work and the five-patient pilot.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Layer 7 cortical interface; research versions with 529 and 1,024 channels [1], and the cleared Layer 7-T [3, 4] |
| Manufacturer | Precision Neuroscience [1, 3] |
| Interface class | Thin-film cortical surface array (ECoG class) |
| Origin | Precision Neuroscience; primary paper published October 2, 2025 [1] |
| First demonstrated | Delivery in pigs and human cadaver heads, with human intraoperative recordings in the same paper [1] |
| First human implant | Five-patient intraoperative recording pilot reported in the paper [1]; Precision's report of 37 patients tested by April 2025 is a company-wide program figure, not this cohort [3] |
| Species studied | Pigs and human cadaver heads for delivery; humans for intraoperative recording [1] |
| Regulatory status | FDA 510(k) K242618 for Layer 7-T, cortical electrode (21 CFR 882.1310), decision dated March 30, 2025, covering implantation up to 30 days [3, 4]. The wireless BCI is a separate system still in development [3] |
| Function | Recording and stimulation of the cortical surface [1, 3] |
| Target tissue | Cortical surface, subdural [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thin-film, subdural surface array [1] |
| Array layout | Uniform grid pitch in each research version [1]; site coordinates are not |
| Electrode count | 529 channels (groups of 20, 50, 100 and 200 µm electrodes) [1]; 1,024 channels, made of 977 recording, 42 stimulation-optimized and five reference electrodes [1]. The 1,024 total is not 1,024 identical recording sites |
| Pitch | 300 µm (529-channel) and 400 µm (1,024-channel) [1] |
| Electrode lengths | Not applicable: surface film, no penetrating shafts [1] |
| Shank width and thickness | Approximately 10 µm per polyimide layer, two layers around a Ti/Pt/Ti metal stack in the first fabrication [1]; complete film, pocket, connector and assembly thickness not fixed by the paper |
| Tip and exposed site geometry | Electrode diameters 20, 50, 100 and 200 µm (529-channel); 50 µm recording, 380 µm stimulation-optimized and 500 µm reference (1,024-channel) [1]; film outline not reported |
| Contact coating | Platinum at the tissue interface [1] |
| Insulation | Polyimide layers around the metal stack [1] |
| Insertion method | Subdural delivery through narrow cranial slits; a removable stylet in a polyimide pocket is withdrawn after placement [1] |
| Anchoring and fixation | The paper does not describe chronic fixation |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Diameters only: 20, 50, 100 and 200 µm (529-channel); 50, 380 and 500 µm (1,024-channel) [1]; areas not given |
| Electrode material | Platinum at the surface; Ti/Pt/Ti stack, with gold added to the traces in the 1,024-channel process [1] |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality | Surface neural recording; the paper reports multimodal decoding [1] |
| Sampling rate |  |
| Stimulation capability | Electrodes can be used for recording or stimulation; the 42 larger sites are stimulation-optimized, not the only stimulating sites [1] |
| Charge injection limit |  |
| Reference and ground | Five dedicated 500 µm reference electrodes in the 1,024-channel array [1]; ground configuration not reported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortical surface, subdural [1] |
| Insertion trauma and BBB disruption | Minimally invasive slit delivery [1]; trauma and barrier disruption data not reported |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites | Not applicable to a surface film; no histology reported |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics |  |
| Data path |  |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity | Cranial-slit delivery with a stylet in pigs and cadaver heads [1]; not demonstrated as a chronic procedure in living patients |
| Output connectors | Interposer and connector details are not fixed [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time | Not reported as a chronic dataset; temporary 30-day clearance only [3, 4] |
| Longevity | Cleared for implantation up to 30 days [3]; chronic and wireless performance not established |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Slit delivery in pigs and cadaver heads [1]; 529- and 1,024-channel fabrication [1]; five-patient intraoperative recordings [1]; FDA clearance of Layer 7-T [4] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Five patients with intraoperative recordings [1]; Precision's 37-patient figure is a company-wide program count, not this cohort [3] |
| Preclinical cohort | Pigs and human cadaver heads [1]; group sizes not pinned in this sheet |
| Follow-up duration | Intraoperative only; chronic follow-up not reported [1] |
| Indications | Recording, monitoring and stimulation for implantation up to 30 days (cleared product) [3] |
| Trials and registries | None cited |
| Primary outcomes | Delivery feasibility and intraoperative human recording [1] |
| Key limitations | Slit delivery not shown as a chronic human procedure; clearance does not establish wireless BCI performance [1, 3] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Minimally invasive surface delivery, high channel count in a thin film, cleared temporary-use product [1, 3, 4] |
| Limitations | Chronic performance not reported; research versions are not assumed identical to the cleared assembly [1, 4] |
| Scaling constraints | Dense multi-size layout, reference sites, film outline and interposer all need configuration-specific geometry [1] |

## References

1. Hettick M, Ho E, et al. [Minimally invasive implantation of scalable high-density cortical microelectrode arrays for multimodal neural decoding and stimulation](https://www.nature.com/articles/s41551-025-01501-w). Published online 2 October 2025.
2. [Publisher PDF of the same paper](https://www.nature.com/articles/s41551-025-01501-w.pdf). Primary affiliation and hardware record.
3. Precision Neuroscience. [Clearance announcement](https://www.precisionneuro.io/articles/company-news/precision-neuroscience-receives-fda-clearance-for-high-resolution-cortical-electrode-array), 17 April 2025.
4. FDA. [K242618, Layer 7-T](https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K242618).
