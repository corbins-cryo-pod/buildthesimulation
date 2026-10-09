---
title: "Ultra-Flexible Tentacle Electrodes (UFTE)"
order: 92
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0060"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Swiss secondary coverage: 256 contacts on independent polyimide fibers in four bundles. Mechanical loop tethering separates shuttle removal from glue dissolution; the separate 512-channel logger stores data on SD rather than transmitting it."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41467-024-49226-9"
tags: ["UFTE", "flexible", "polyimide", "ETH Zurich", "University of Zurich", "Switzerland", "Europe", "secondary", "preclinical"]
draft: false
---

# Ultra-Flexible Tentacle Electrodes

The 2024 UFTE paper reports independently flexible polyimide electrode fibers, bundled for insertion and released inside the brain. Its affiliations include ETH Zurich and the University of Zurich. This is Swiss research, included as secondary coverage alongside the US-first catalog.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Ultra-Flexible Tentacle Electrodes (UFTE) [1] |
| Manufacturer | Academic research device; ETH Zurich and University of Zurich affiliations [1] |
| Interface class | Intracortical bundles of independent polyimide electrode fibers [1] |
| Origin | 2024 Nature Communications paper [1] |
| First demonstrated | 2024 paper [1] |
| First human implant | None |
| Species studied | Rat (main array) and mouse (tetrode variant) [1] |
| Regulatory status | Research device; no clinical approval [1] |
| Function | Recording [1] |
| Target tissue | Rodent brain, insertion to at least 6.5 mm from the dorsal surface [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Independent fibers, one contact per fiber, bundled and released inside the brain [1] |
| Array layout | Four bundles of 64 contacts. Mouse variant with four contacts per fiber (tetrode) kept separate [1] |
| Electrode count | 256 recording contacts in the main rat array [1] |
| Pitch |  |
| Electrode lengths | Other fibers extend 500 µm beyond contacts; the discussion describes a version intended to reach 3 cm into the human brain [1] |
| Shank width and thickness | Fiber 7 µm wide, 2.4 µm thick [1] |
| Tip and exposed site geometry | Recording contact 13 × 13 µm exposed area; primary tether loop 25 µm inner diameter on the longest fiber [1] |
| Contact coating | PEDOT:PSS on exposed gold contacts [1] |
| Insulation | Polyimide layers around Ti/Au conductors [1] |
| Insertion method | 50 µm tungsten shuttle attached by a mechanical loop; PEG and silk fibroin hold fibers together and need not dissolve before shuttle removal [1] |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 13 × 13 µm [1] |
| Electrode material | Gold contacts with Ti/Au conductors, PEDOT:PSS coating [1] |
| Impedance (with measurement frequency) | Mean 54 ± 16 kΩ (s.d., n = 243 contacts) at 1 kHz for PEDOT:PSS-coated functional contacts [1] |
| Noise floor or SNR |  |
| Recording modality | Broadband extracellular recording [1] |
| Sampling rate | 20 kHz per channel, 16-bit [1] |
| Stimulation capability |  |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Rodent brain [1] |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Custom headstage with four 64-channel Intan RHD2164 chips (256 channels per headstage) [1] |
| Data path | Wired headstage; a separate 512-channel logger saved data to an SD card and did not transmit wirelessly [1] |
| Telemetry bandwidth | No wireless telemetry; the logger stored data on SD [1] |
| Sampling rate | 20 kHz per channel [1] |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity | Shuttle insertion to at least 6.5 mm; the authors note 50 µm tungsten shuttles may lack stiffness for large-animal or human subcortical targets [1] |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | About 1.6% broken channels in vitro; 3% to 6% of contacts excluded from spike sorting for recording neither LFP nor spikes [1] |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | 256-channel rat recording; 512-channel logger connected to 256 implanted channels for up to one hour; longitudinal rodent tracking in the tetrode variant, kept separate [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None; no completed human implant outcome reported [1] |
| Preclinical cohort | Rat main array and a separate mouse tetrode variant; animal counts not extracted here [1] |
| Follow-up duration | Logger sessions up to one hour in final sessions; long-term results belong to the mouse variant and are not assigned to the rat array [1] |
| Indications | Future epilepsy work described in the discussion [1] |
| Trials and registries |  |
| Primary outcomes |  |
| Key limitations | No lifelong reliability or human outcome claimed; full assembly geometry not reconstructed [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Mechanically independent ultra-thin fibers with shuttle removal separated from glue dissolution [1] |
| Limitations | Wired headstage or SD logger; shuttle stiffness for large animals [1] |
| Scaling constraints | Headstages stack to record up to 1,024 channels, which is not a 1,024-contact implanted array [1] |

## Recording fibers and insertion

The main rat array has 256 recording contacts, distributed over four bundles of 64. Each fiber has one contact and is mechanically independent after the insertion coating dissolves. Ti/Au conductors lie between polyimide layers; exposed gold contacts are coated with PEDOT:PSS.

| Structure | Published dimensions or count |
| --- | --- |
| Individual main-array fiber | 7 µm wide, 2.4 µm thick |
| Recording contact | 13 × 13 µm exposed area |
| Primary tether loop | 25 µm inner diameter on the longest fiber |
| Other fibers' extension beyond contacts | 500 µm |
| Current-study tungsten shuttle | 50 µm diameter |
| Main array | 256 contacts, four bundles of 64 |

A loop mechanically attaches each bundle to its shuttle. PEG and silk fibroin hold the fibers together, but do not have to dissolve before shuttle removal. The paper reports insertion to at least 6.5 mm from the dorsal brain surface. That result is not a guarantee of unlimited depth in humans: the authors note that their 50 µm tungsten shuttles may lack sufficient stiffness for large-animal or human subcortical targets.

## Electronics are separate from contact counts

The custom headstage uses four 64-channel Intan RHD2164 chips, for 256 channels per headstage. The methods describe stacking headstages to record up to 1,024 channels, not a 1,024-contact implanted array in every experiment. Rat broadband data were sampled at 20 kHz/channel with 16-bit resolution.

The authors also tested a **512-channel logger**, connected to the implanted animals' **256 channels**, for up to one hour in final recording sessions. Although described as wireless, it **saved data to an SD card and did not transmit it wirelessly**. Logger capacity, implanted contacts and remote telemetry are different claims.

## Yield, variants and limits

In vitro impedance measurements found approximately 1.6% broken channels. Between 3% and 6% of contacts were excluded from spike sorting because they recorded neither local field potentials nor spikes. PEDOT:PSS-coated functional contacts had a mean 1 kHz impedance of 54 ± 16 kΩ (mean ± s.d., n = 243 contacts).

A separate mouse variant has four contacts per fiber in a tetrode configuration. Its long-term results are not assigned to the main one-contact-per-fiber rat array. See the [rodent tracking application](/applications/93-ufte-rodent-longitudinal-tracking-2024/).

The discussion describes a version intended to reach 3 cm into the human brain and future epilepsy work. It does not report a completed human implant outcome. No clinical approval or lifelong reliability is claimed here.

## Model boundary

No complete model is supplied. Fiber width/thickness and contact area alone do not define every fiber length, contact distribution, three-dimensional bundle path, ribbon cable, loop or headstage. The published micrographs are retained as evidence rather than converted into an invented full assembly.

## References

1. [2024 Nature Communications paper](https://www.nature.com/articles/s41467-024-49226-9).
2. [Full primary text, including methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC11156863/).
3. [ETH-hosted publisher PDF, Figures 1 and 2](https://ethz.ch/content/dam/ethz/special-interest/itet/biomedical-engineering/yaniklab-dam/documents/Yasar24_UFTE%20technology.pdf).
