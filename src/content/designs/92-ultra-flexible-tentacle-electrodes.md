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

## Primary sources

- [2024 Nature Communications paper](https://www.nature.com/articles/s41467-024-49226-9).
- [Full primary text, including methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC11156863/).
- [ETH-hosted publisher PDF, Figures 1 and 2](https://ethz.ch/content/dam/ethz/special-interest/itet/biomedical-engineering/yaniklab-dam/documents/Yasar24_UFTE%20technology.pdf).
