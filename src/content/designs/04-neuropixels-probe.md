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

## Primary sources

- [Manufacturer 1.0 datasheet](https://www.neuropixels.org/_files/ugd/832f20_4a14406ba1204e60ae8534b09e201b49.pdf).
- [Jun et al. 2017, full primary report](https://pmc.ncbi.nlm.nih.gov/articles/PMC5955206/).
- [Publisher article](https://www.nature.com/articles/nature24636).
