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
tags: ["cortex", "recording", "stimulation", "bidirectional", "SCOPe", "Columbia", "CMOS", "SPAD", "optical", "preclinical"]
draft: false
---

# SCOPe optical neural interface

SCOPe combines fluorescence imaging with optogenetic stimulation on a thin CMOS assembly. The published 2024 abstract reports mouse optical tests and NHP reach-speed decoding. Detailed evidence is drawn from the separately accessible published supplement and full 2023 preprint, with their boundaries retained.

The [Columbia University, Shepard lab](/companies/45-columbia-shepard-optical-and-electrical-interfaces/) links this optical interface separately from electrical BISC. Applications cover [mouse bidirectional tests](/applications/138-scope-mouse-bidirectional-optical-tests/) and [macaque movement-speed decoding](/applications/139-scope-macaque-reach-speed-decoding/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | SCOPe subdural CMOS optical neural interface [1, 2] |
| Manufacturer | Academic research device; Columbia University Shepard lab [1] |
| Interface class | Subdural CMOS optical imaging and optogenetic stimulation |
| Origin | 2023 bioRxiv preprint; 2024 Nature Electronics paper [1, 2] |
| First demonstrated | 2023 preprint; published 2024 [1, 2] |
| First human implant | None |
| Species studied | Mouse (bidirectional tests) and nonhuman primate (reach-speed decoding) [1] |
| Regulatory status | Research device; no clearance |
| Function | Fluorescence imaging and optogenetic stimulation; wired [2] |
| Target tissue | Cortical surface, subdural [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Thinned CMOS die with SPAD array, microLEDs, filters, absorbing epoxy and coded amplitude mask [2, 3] |
| Array layout | 192 × 256 nominal SPAD array, 12.5% removed for LED pads and drivers; 24 blue and 24 red microLEDs in pairs [2] |
| Electrode count | No electrodes; 24 blue and 24 red microLEDs, 192 × 256 nominal SPADs [2] |
| Pitch | 25 µm SPAD pitch [2] |
| Electrode lengths | Unreported |
| Shank width and thickness | Table S1: 6.4 × 7.8 × 0.15 mm, 0.107 g; abstract says below 200 µm, Figure S5 stack below 250 µm (all kept); field of view 5.1 × 6.8 × 0.5 mm, 60 µm resolution; die thinned below 15 µm (preprint) [1, 2, 3] |
| Tip and exposed site geometry | Blue 470 nm and red 590 nm microLEDs (preprint) [2] |
| Contact coating | Unreported |
| Insulation | Polyimide spacer, filters and absorbing epoxy [2, 3] |
| Insertion method | Subdural placement in acute animals [1] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Unreported |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Mesoscopic fluorescence imaging with coded-mask computational reconstruction; not single-unit electrophysiology [2, 3] |
| Sampling rate | 200 fps full array and 400 fps half array (supplement); in-vivo 40 fps; 10-bit global-shutter counters [3] |
| Stimulation capability | Optical: Table S5 six blue LEDs at 4.5 µW each (mouse 1), four at 3 µW (mouse 2), 22 at 9 µW (NHP 1), red LED 193 µW optical at 12.25 mW electrical; preprint 27 µW per blue LED in its electrical-stimulation mouse test [2, 3] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | 130 nm high-voltage CMOS, 6.4 × 7.8 mm; flex PCB to FPGA, power board and host computer [2] |
| Data path | Wired flexible interposer; wireless power and telemetry proposed only; full-array 200 fps raw link 98.3 Mb/s [2, 3] |
| Telemetry bandwidth | 98.3 Mb/s raw digital link at full array, 200 fps [3] |
| Sampling rate | Unreported |
| Power | Supplement: sensor below 10 mW, below 110 µW per LED generally; Table S5 NHP blue electrical input 123 µW [3] |
| Thermal management | Slice-overlay test stayed below 1 °C rise at tested powers [3] |
| Packaging and hermeticity | Chronic containment not established [3] |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Unreported |
| Stability over time | Acute tests only [1] |
| Longevity | Unreported |
| Revision and explant experience | Unreported |
| Adverse events | Dead blue LEDs 02B and 22B identified in the supplement [3] |
| Notable demonstrations | Mouse bidirectional optical tests and macaque reach-speed decoding [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Mouse and macaque acute experiments [1, 3] |
| Follow-up duration | Unreported |
| Indications | Unreported |
| Trials and registries | Unreported |
| Primary outcomes | Bidirectional optical interface; reach-speed decoding in macaque [1] |
| Key limitations | Published main text not accessible; blue imaging light can activate ChRmine; low-contrast scenes and scattering amplify noise; clinical gene delivery and long-term safety unestablished [1, 3] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Thin CMOS stack combining imaging and stimulation [1] |
| Limitations | Tethered, computational reconstruction, two dead LEDs in one experiment [3] |
| Scaling constraints | Unreported |

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

## References

1. [2024 published abstract](https://www.nature.com/articles/s41928-024-01209-w): bidirectional optical interface, thickness below 200 µm, mouse testing and NHP reach-speed decoding. The published main text was not accessible; its PDF fetch timed out.
2. [2023 full primary preprint](https://www.biorxiv.org/content/10.1101/2023.02.07.527500v1.full): detailed hardware and animal methods. Preprint-specific values are not treated as verified final-publication values.
3. [2024 published Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-024-01209-w/MediaObjects/41928_2024_1209_MOESM1_ESM.pdf): circuit, packaging, optical limits, decoder and Tables S1-S6. This supplement is accessible separately from the published main text.
