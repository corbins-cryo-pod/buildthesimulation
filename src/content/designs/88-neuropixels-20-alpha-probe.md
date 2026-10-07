---
title: "Neuropixels 2.0 alpha single/four-shank probes"
order: 88
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0058"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "The 2021 alpha hardware has 1,280 sites per shank, one or four shanks and 384 channels per probe. Vertical alignment and miniaturized packaging support motion correction and small-animal chronic recording."
modality: "Intracortical"
website: "https://www.science.org/doi/10.1126/science.abf4588"
tags: ["Neuropixels", "2.0", "alpha", "intracortical", "recording", "silicon", "chronic", "preclinical"]
draft: false
---

# Neuropixels 2.0 alpha probes

Steinmetz and colleagues' 2021 paper reports the alpha version of Neuropixels 2.0. Its authors include UCL, University of Washington, Janelia, imec and other institutions. The paper's planned beta ADC improvements are not results from the alpha hardware.

This hardware differs from [1.0](/devices/04-neuropixels-probe/) in site arrangement, base, readout and packaging. A version label matters: the original study is not a specification for every later commercial 2.0 revision.

## Published alpha geometry

| Feature | Reported specification |
| --- | --- |
| Shanks | One or four |
| Sites per shank | 1,280 |
| Four-shank total | 5,120 |
| Channels per probe | 384 simultaneous |
| Shank length / section | 10 mm / 70 × 24 µm |
| Sites | 12 × 12 µm porous TiN |
| Along-shank pitch | 15 µm |
| Column separation | 32 µm; two vertically aligned columns |
| Four-shank center spacing | 250 µm |
| As-fabricated tip taper | 175 µm long, approximately 20° in the shank plane |
| Base | 2.2 × 8.7 mm² |
| Two probes plus shared headstage | Approximately 1.1 g |

Four shanks do not supply four independent 384-channel streams. Two probes on one headstage provide 768 simultaneous channels from 10,240 available sites when both probes are four-shank versions.

## Electronics and signal trade-offs

The alpha base supplies 384 full-band signals, 0.5 Hz-10 kHz, at 30 kHz and 14-bit resolution. It reports 36.5 mW base power. The paper gives 7.2 µV RMS recording-channel noise without electrode noise and 8.2 µV RMS including electrode noise. These describe different measurement boundaries, not a contradiction to erase.

Software-controlled analog switches choose sites. The authors report a transient lasting less than one second after a switch change. Some experiments combine multiple sites onto a channel to increase coverage of large signals; those mixed signals are not independent readout from every site.

## Chronic recording and recovery

The linked [motion-corrected chronic rodent study](/applications/89-neuropixels-20-chronic-tracking-2021/) combines aligned site columns, implantation hardware and analysis. Recoverable mounting hardware supports probe removal and reuse, not a guarantee that every device or recording survives.

## Model boundary

No full model is supplied here. The paper grounds shank, site and taper dimensions, but exact first-site origin, base-to-shank joins, reference geometry and package construction need separate reconstruction. The 1.0 model is not relabeled as 2.0.

## Primary sources

- [2021 full text, including alpha electronics and methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/).
- [Publisher paper](https://www.science.org/doi/10.1126/science.abf4588).
- [UCL-hosted manuscript PDF](https://discovery.ucl.ac.uk/id/eprint/10122912/1/Steinmetz%20et%20al%20-%20Science%202021%20in%20press.pdf).
