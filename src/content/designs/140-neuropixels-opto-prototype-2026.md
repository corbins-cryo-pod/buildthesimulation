---
title: "Neuropixels Opto prototype, 2026"
order: 140
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0083"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
modality: "Intracortical"
description: "960-site, 384-channel electrical probe with two sets of 14 laser-fed photonic emitters. Prototype blue-light leakage and tethered operation remain explicit."
website: "https://www.nature.com/articles/s41592-026-03076-z"
tags: ["Neuropixels Opto", "photonics", "optogenetics", "Allen Institute", "UCL", "IMEC", "prototype"]
draft: false
---

# Neuropixels Opto prototype

Lakunina, Socha, Ladd and colleagues combine electrical recording with dual-color photonic stimulation in a Nature Methods paper published June 1, 2026. Neuropixels Opto is a distinct hardware configuration, not a renamed [Neuropixels 2.0 probe](/devices/36-neuropixels-2-0/). Its recording backend derives from Neuropixels 1.0, while the optical routing and two-column site layout have separate specifications.

The [Allen/UCL collaboration](/companies/46-allen-ucl-neuropixels-opto-collaboration/) links US recording teams with UK and Belgian development partners. Applications separate [cortical activation and synaptic inhibition](/applications/141-neuropixels-opto-cortical-activation-inhibition/) from [parallel cell-type optotagging](/applications/142-neuropixels-opto-parallel-optotagging/).

## Sites, channels and emitters

| Part | Published prototype value |
| --- | --- |
| Shank | 10 mm long, 70 µm wide, 33 µm thick |
| Recording sites | 960 TiN sites, each 12 × 12 µm, in two columns of 480 |
| Site pitch | 20 µm along the shank, 48 µm between columns |
| Simultaneous channels | 384 selectable electrical sites |
| Optical emitters | 14 blue and 14 red, spaced 100 µm along the distal region |
| Input light | External 450-nm and 638-nm lasers, coupled by fibers |
| Waveguides | 150-nm SiN layer integrated with the 130-nm SOI CMOS backend |
| AP recording | 0.3-10-kHz band, 30-kHz digitization |
| LFP recording | Below 1 kHz, 2.5-kHz digitization |
| Silicon base | Supplement Table 2: 9.6 × 10.2 mm; package base thickness 1.1 mm |

960 physical sites are not 960 simultaneous electrical channels. Two optical sets do not mean 28 independent electrical channels or 28 emitters illuminated at once. The prototype addresses one emitter per color at a time through two four-level thermo-optic switching trees. Future combinations are proposed, not demonstrated hardware behavior.

Results describe 16-25-µm² emitter areas. Supplement Table 2 gives blue 0.45 × 32 µm and red 0.60 × 42 µm, so the blue listed dimensions multiply to 14.4 µm² rather than the stated lower area bound. Both descriptions are retained. The introduction names a 1.4-mm illumination span, while Results describe emitters covering 1.5 mm from the tip; these reference descriptions are not substituted for a precise tip coordinate.

## Tethered lasers and electrical data

The integrated device guides externally generated light, rather than generating light with implanted microLEDs. Fibers connect the probe to a laser PXI module. A flex cable connects the recording device to a headstage and data cable. Another PXI module handles acquisition; SpikeGLX and Open Ephys control the system.

The optical switch's approximately 12-µs physical transition in Table 2 is not user-visible real-time feedback. The supplement says software control takes multiple milliseconds. No wireless link or closed-loop controller is inferred.

## Loss, leakage and artifact correction

Electrical characterization reports mean AP/LFP noise of 5.45/5.33 µV rms across tested sites. Optical characterization gives 2.07% red and 0.24% blue output relative to fiber input. Delivering 100 µW at an emitter takes roughly 5 mW red or 40 mW blue input. Those losses do not represent conversion efficiency for an implanted LED.

High-intensity blue light produces material instability and leaks from unintended emitters. The authors limit blue power and use red for higher-intensity, precise-addressing experiments. Recalibration and revised photonic layers are future improvements, not a completed fix in these prototypes.

Sharp red-light onsets leave an approximately 30-µV electrical artifact, much smaller than surface illumination artifacts but not zero. Common-average referencing and tapered pulses reduce it. The manuscript's statement that signals are unaffected is read in the context of this preprocessing, not as raw artifact-free recording.

Supplement Table 2 reports below 1°C probe/tissue temperature difference in its prototype tests. Genetic expression, light scattering, neural processes and local tissue conditions still limit selectivity. Illumination footprint is not identical to the set of directly activated neurons.

## Prototype and geometry boundary

The paper describes about 740 processing steps, compared with roughly 400 for earlier Neuropixels platforms. It explicitly says mass production requires more fabrication and testing. [UCL's program page](https://www.ucl.ac.uk/brain-sciences/neuropixels/neuropixels-opto) expects community availability in 2028; that is a forecast, not an in-stock product or delivery guarantee.

The interactive 3D reference models only the electrical recording window: 960 contacts in two columns, 20-µm along-shank pitch, 48-µm column spacing, 12 × 12-µm contacts and 33-µm thickness. The 9.6-mm length is a half-pitch-margin crop, not the full 10-mm probe. Its coordinate origin is the crop center, not the unknown tip origin.

No optical emitters, waveguides, tip, package base, internal layer arrangement, fibers or cables are modeled. Gold means electrical contacts only. A complete model would conceal the remaining geometry gaps. No human implant, chronic optical-device lifetime or therapy outcome is established here.

## Primary sources

- [2026 peer-reviewed full paper](https://www.nature.com/articles/s41592-026-03076-z): methods, recording/illumination architecture and animal results. Published June 1, 2026. This is used instead of carrying forward the 2025 preprint as a separate device.
- [Published supplement](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM1_ESM.pdf): Tables 1-2 and additional control/field-potential data. Table 2 distinguishes 2019 design targets from 2023 prototype results.
- [Reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41592-026-03076-z/MediaObjects/41592_2026_3076_MOESM2_ESM.pdf): randomized stimulus conditions, no blinding and no planned sample-size calculation; it says no data were excluded, while the paper still applies unit-quality and optotagging criteria.
