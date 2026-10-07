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

Quad Base keeps the four-shank Neuropixels 2.0 recording geometry while expanding the electronics to 1,536 simultaneous channels. The July 27, 2026 primary manuscript is a preprint, not peer-reviewed evidence. Its affiliations include Johns Hopkins University, HHMI Janelia and imec.

This is distinct hardware from the [384-channel 2.0 alpha probe](/devices/88-neuropixels-20-alpha-probe/). It is also not NXT/NP 3.0: equal advertised channel counts do not make the base architecture or channel mapping identical.

## Geometry and capacity

| Feature | Source-reported value |
| --- | --- |
| Shanks / shank length | Four / 10 mm |
| Total physical sites | 5,120 low-impedance titanium-nitride sites |
| Simultaneous channels | 1,536 |
| Assignment per shank | 384 channels selectable from 1,280 sites, per Neuropixels Central |
| Probe-base width | 10.2 mm, compared with 3.5 mm for standard 2.0 in the preprint |
| Headstage | 14 ×18 mm, compared with 10 ×14 mm for standard 2.0 in the preprint |

Two probes supply 3,072 channels in the [mouse recording application](/applications/105-neuropixels-quad-base-mouse-sequences-2026/). That is two probes and eight shanks, not the capacity of one device. Nor are all 5,120 physical sites sampled at once on one probe.

## Noise and excluded channels

The preprint describes noise and gain as comparable with standard 2.0's 6.8 µV RMS specification. Its actual Supplementary Figure S1 table reports mean noise of 7.83, 7.88 and 8.03 µV for three Quad Base probes. Figure 1's measurement band is 300-10,000 Hz. A comparator specification should not replace the measured Quad Base values.

Channels with less than 50% of average gain were excluded from other measurements. Reported low-gain fractions were 0.26%, 0.85% and 0.13% for probes A-C; fractions above 10 µV noise were 2.08%, 1.30% and 2.41%. This is a characterized array with imperfect channels, not an assertion that every channel met identical performance.

## Availability and generation boundary

Neuropixels Central's current technology page says Quad Base has been available for purchase since August 2025. This is a source-reported availability statement, not a verified stock, price or delivery quote.

The same source describes NXT prototypes as 1,536-channel four-shank devices with up to 912 channels mapped to one shank and expected purchase availability in 2027. Its August 2026 access announcement calls NXT the development name and NP 3.0 the planned purchase name. Those mapping and schedule claims belong to NXT, not Quad Base.

## Model boundary

No full model is supplied. The primary manuscript gives base width and headstage plan dimensions but not full enclosure heights, connector geometry, exact site-field origins or a complete fabrication/package model. Existing 2.0 shank reference geometry does not define the larger Quad Base assembly.

## Primary sources

- [July 27, 2026 preprint full text](https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full).
- [Preprint PDF, Figure 1, Supplementary Figure S1 and methods](https://www.biorxiv.org/content/10.64898/2026.07.23.740388v1.full.pdf).
- [Neuropixels Central technology page](https://www.neuropixelscentral.org/technology).
- [Official NXT/NP 3.0 access announcement](https://www.neuropixelscentral.org/post/neuropixels-nxt-3-0-probe-access-challenge-pac).
