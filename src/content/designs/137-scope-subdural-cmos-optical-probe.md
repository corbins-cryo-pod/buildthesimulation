---
title: "SCOPe subdural CMOS optical probe"
order: 137
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0082"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
modality: "Other"
description: "Wired CMOS fluorescence imager and microLED stimulator with lensless reconstruction. Published abstract, supplement and 2023 preprint are distinguished; no wireless or single-cell claim."
website: "https://www.nature.com/articles/s41928-024-01209-w"
tags: ["SCOPe", "Columbia", "CMOS", "SPAD", "optical", "preclinical"]
draft: false
---

# SCOPe optical neural interface

SCOPe combines fluorescence imaging with optogenetic stimulation on a thin CMOS assembly. The published 2024 abstract reports mouse optical tests and NHP reach-speed decoding. Detailed evidence is drawn from the separately accessible published supplement and full 2023 preprint, with their boundaries retained.

The [Columbia collaboration brief](/companies/45-columbia-shepard-optical-and-electrical-interfaces/) links this optical interface separately from electrical BISC. Applications cover [mouse bidirectional tests](/applications/138-scope-mouse-bidirectional-optical-tests/) and [macaque movement-speed decoding](/applications/139-scope-macaque-reach-speed-decoding/).

## Hardware configuration

| Part | Source-grounded value |
| --- | --- |
| CMOS die | 2023 preprint: 6.4 × 7.8 mm, 130-nm high-voltage process, thinned below 15 µm |
| Sensor | 192 × 256 nominal SPAD array, 25-µm pitch; 12.5% removed for LED pads and drivers |
| Light sources | 24 blue and 24 red microLEDs, arranged in pairs |
| Pixel integration | Global shutter, 10-bit counters |
| Frame rates | Published supplement: 200 fps full array, 400 fps half array; in-vivo tests use 40 fps |
| Optical stack | Excitation/emission filters, absorbing epoxy, polyimide spacer and coded amplitude mask |
| Controller | Wired flex PCB to FPGA, power board and host computer |
| Geometry table | Published Table S1: 6.4 × 7.8 × 0.15 mm, 0.107 g, 5.1 × 6.8 × 0.5-mm field of view, 60-µm resolution |

The nominal array dimensions do not mean every location is an active photodetector. The two LEDs per pair are different optical functions, not electrical recording contacts. The 2023 preprint describes 470-nm blue excitation and 590-nm red light; spectral overlap with the opsin matters more than a color label alone.

The published abstract states total thickness below 200 µm, while published Table S1 uses 150 µm and Figure S5 describes a packaging stack below 250 µm. These descriptions are all retained, not collapsed into one exact layer thickness. Table S1's volume ratio compares device displacement with a defined imaged volume, not a patient benefit or comparison of tissue damage.

## Wired and computational, not a wireless camera

A flexible interposer routes supplies, a reference clock, scan-chain configuration and raw data to an FPGA. Wireless power and telemetry are proposed future work in the preprint. The implantable form factor does not make the demonstrated system fully self-contained.

The supplement's full-array 200-fps link is 98.3 Mb/s. That is raw digital transport at the maximum full-array configuration, not 98.3 million independent neural spikes per second. In-vivo imaging at 40 fps is a different mode.

The coded mask supports off-chip computational reconstruction, not conventional lens focusing or single-cell microscopy. The supplement says low-contrast biological scenes and scattering amplify noise, and further mask/working-distance improvements are needed. Mesoscopic fluorescence sums signals from somata and neuropil over depth; it is not single-unit electrophysiology.

## Power, crosstalk and failed components

Published Table S5 gives six blue LEDs at 4.5 µW optical each for mouse experiment 1, four at 3 µW for mouse experiment 2, and 22 at 9 µW for NHP experiment 1. The 2023 preprint instead reports 27 µW optical per blue LED in its electrical-stimulation mouse test. These are version-specific numbers, not silently substituted. Table S5 gives a red LED with 193 µW optical output and 12.25 mW electrical input for the second mouse experiment.

The supplement's general power discussion says below 10 mW for the sensor and below 110 µW per LED; Table S5's NHP blue electrical input is 123 µW and its red electrical input is much higher. The general statement is not extended to every illumination mode. A slice-overlay thermal test stays below a 1°C rise at its tested powers, not chronic human thermal certification.

Blue imaging light can activate ChRmine because of its broad spectrum. Imaging illumination must therefore stay below the relevant stimulation threshold. The supplement identifies dead blue LEDs 02B and 22B. They are retained as hardware limits rather than reported as 24 functioning excitation sites in that experiment.

No complete 3D model is added. Die dimensions alone do not specify the flex outline, optical mask, LED geometry or conflicting full-stack thickness. Chronic containment, clinical genetic delivery and long-term implanted safety are not established by these acute tests.

## Sources and version boundary

- [2024 published abstract](https://www.nature.com/articles/s41928-024-01209-w): bidirectional optical interface, thickness below 200 µm, mouse testing and NHP reach-speed decoding. The published main text was not accessible; its PDF fetch timed out.
- [2023 full primary preprint](https://www.biorxiv.org/content/10.1101/2023.02.07.527500v1.full): detailed hardware and animal methods. Preprint-specific values are not treated as verified final-publication values.
- [2024 published Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-024-01209-w/MediaObjects/41928_2024_1209_MOESM1_ESM.pdf): circuit, packaging, optical limits, decoder and Tables S1-S6. This supplement is accessible separately from the published main text.
