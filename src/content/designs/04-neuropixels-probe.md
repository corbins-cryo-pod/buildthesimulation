---
title: "Neuropixels 1.0 recording probe"
order: 4
pubDate: 2026-02-03
updatedDate: 2026-10-07
device_id: "BTSD-0004"
interface_class: "intracortical"
status: "research"
last_updated: 2026-10-07
description: "Single-shank Neuropixels 1.0: 960 selectable recording sites and 384 simultaneous channels. The manufacturer specification and 2017 prototype geometry are distinguished."
modality: "Intracortical"
successRank: 5
website: "https://www.neuropixels.org/probe1-0"
tags: ["intracortical", "Neuropixels", "recording", "CMOS", "imec", "UCL", "Allen Institute", "Janelia", "research"]
draft: false
---

# Neuropixels 1.0 recording probe

This entry is the single-shank Neuropixels 1.0 recording probe, not every member of the family. [Ultra](/devices/83-neuropixels-ultra-high-density-probe/) and [NHP](/devices/85-neuropixels-10-nhp-long-shank/) have separate hardware entries. Neuropixels 2.0 has different site geometry and single/four-shank configurations; its counts must not be assigned to 1.0.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neuropixels 1.0, single-shank recording probe [1, 2] |
| Manufacturer | imec, with HHMI Janelia, Allen Institute and UCL in the 2017 collaboration [2] |
| Interface class | Intracortical, penetrating silicon shank |
| Origin | imec with HHMI Janelia, Allen Institute and UCL collaboration [2] |
| First demonstrated | 2017 publication (Jun et al.) [2, 3] |
| First human implant | None reported; research-only device |
| Species studied | Rodent and other research animals; research-only device [2] |
| Regulatory status | Research tool; no clinical approval claimed |
| Function | Recording only [1] |
| Target tissue | Cortical and deep brain structures along the shank |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating single shank |
| Array layout | Checkerboard with four column positions, two sites per row [1] |
| Electrode count | 960 selectable physical sites, 384 simultaneous channels [1] |
| Pitch | 16 µm across column positions, 20 µm between rows [1] |
| Electrode lengths | Shank 10 mm long [1] |
| Shank width and thickness | 70 µm wide; 20 µm thick in the 2017 paper, 24 µm in the later datasheet; both retained [1, 2] |
| Tip and exposed site geometry | 12 x 12 µm titanium nitride contacts [1]; the model tip outline and 200 µm first-row offset are approximations, not manufacturer drawings |
| Contact coating | Titanium nitride [1] |
| Insulation | Unreported in the reviewed sources |
| Insertion method | Stereotaxic placement in research surgery |
| Anchoring and fixation | Skull or headstage fixation in chronic preparations; configuration dependent |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 144 µm² nominal from 12 x 12 µm contacts [1] |
| Electrode material | Titanium nitride contacts [1] |
| Impedance (with measurement frequency) | Unreported in the reviewed sources; earlier mixed-generation values were removed |
| Noise floor or SNR | Unreported as a single figure here; the 2017 paper reports low-noise performance [2] |
| Recording modality | Action potential and local field potential bands [1] |
| Sampling rate | 30 kHz AP / 2.5 kHz LFP, datasheet [1] |
| Stimulation capability | Not applicable; recording-only probe |
| Charge injection limit | Not applicable |
| Reference and ground | Configuration dependent on the headstage setup |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Brain parenchyma along the insertion track |
| Insertion trauma and BBB disruption | Inherent to penetrating silicon shanks; quantitative values unreported in reviewed sources |
| Vascular disruption risk | Unreported in the reviewed sources |
| Micromotion sensitivity | Rigid shank; qualitative concern, quantitative data not extracted here |
| Gliosis and encapsulation | Not extracted in this sheet |
| Neuron loss near sites | Not extracted in this sheet |
| Foreign-body response mitigation | Unreported in the reviewed sources |
| Typical failure modes | Recording failures documented in the 2017 study; see the linked application entry [2] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | On-base signal conditioning, amplification, multiplexing and digitization; the preferred design was passive switched, not one amplifier per site [2] |
| Data path | Wired external headstage |
| Telemetry bandwidth | Wired; configuration dependent |
| Sampling rate | 30 kHz AP / 2.5 kHz LFP, datasheet [1] |
| Power | External |
| Thermal management | Low dissipation; specifics unreported here |
| Packaging and hermeticity | Non-hermetic research probe |
| MRI compatibility | Unreported in the reviewed sources |
| Surgical complexity | Stereotaxic research surgery |
| Output connectors | Unreported in the reviewed sources |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Large simultaneous neuronal populations reported in the 2017 paper; see the application entry [2] |
| Chronic yield | Durability limits and failures documented in the linked 2017 study entry [2] |
| Stability over time | Weeks-scale research recordings; not a lifetime implant |
| Longevity | Not specified as an implant-lifetime figure |
| Revision and explant experience | Not applicable to research use |
| Adverse events | Not applicable as a clinical device |
| Notable demonstrations | Two-probe population recordings in the 2017 study [2] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None; research-only device |
| Preclinical cohort | 2017 rodent study and follow-on literature [2] |
| Follow-up duration | Unreported in the reviewed sources |
| Indications | Neuroscience research |
| Trials and registries | None |
| Primary outcomes | Unreported in the reviewed sources |
| Key limitations | Research-only; chronic durability limited per the linked study |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Very high site density on one shank, on-probe conditioning and digitization, mature research ecosystem |
| Limitations | 384 simultaneous channels against 960 sites, rigid tethered shank, research-only packaging |
| Scaling constraints | Multiplexing and readout bandwidth, shank cross-section versus tissue displacement, chronic packaging |

## Manufacturer specification

| Feature | Neuropixels 1.0 datasheet |
| --- | --- |
| Available recording sites | 960 |
| Simultaneous recording channels | 384 |
| Shank | 10 mm long, 70 µm wide, 24 µm thick |
| Recording contacts | 12 × 12 µm titanium nitride |
| Contact arrangement | Checkerboard, four column positions; two sites per row |
| Pitch | 16 µm across column positions, 20 µm between rows |
| Bands | Action potential and local field potential |
| AP / LFP sample rates | 30 kHz / 2.5 kHz |

A site is a physical electrode. A channel is a signal-processing and readout path. Selecting 384 sites does not turn the other 576 sites into simultaneous channels. The external wired headstage and acquisition system remain part of the setup.

## Original paper versus later datasheet

Jun and colleagues' 2017 paper reports a 10 mm shank with **70 × 20 µm** cross-section. The manufacturer datasheet gives **70 × 24 µm**. Both figures are retained as source-specific descriptions, not averaged or silently treated as interchangeable.

The viewer uses the datasheet's 24 µm shank thickness, 960 sites, 12 µm square contacts and checkerboard pitch. Its tip outline and 200 µm first-row offset are approximations. It omits base electronics, headstage and acquisition mapping; contact IDs are geometric labels, not actual channel assignments.

## Recording circuitry

The original development compared passive, active, switched and active-switched designs. The preferred design was passive switched. The paper's on-base signal conditioning, amplification, multiplexing and digitization must not be simplified to a universal claim that every 1.0 electrode has an on-site amplifier.

## Demonstrated recordings and failures

The [2017 rodent study and durability limits](/applications/87-neuropixels-2017-rodent-recordings-limits/) separate two-probe population recordings from chronic event-rate results. The paper reports failures as well as stable recordings. These experiments do not establish a permanent human implant or clinical BCI indication.

## References

1. [Manufacturer 1.0 datasheet](https://www.neuropixels.org/_files/ugd/832f20_4a14406ba1204e60ae8534b09e201b49.pdf).
2. [Jun et al. 2017, full primary report](https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/).
3. [Publisher article](https://www.nature.com/articles/nature24636).
