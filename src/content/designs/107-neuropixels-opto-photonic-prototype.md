---
title: "Neuropixels Opto photonic prototype"
order: 107
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0068"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "June 2026 published prototype: 384 simultaneous recording channels from 960 TiN sites, with 14 blue and 14 red photonic emitters. Blue-switch instability, optical losses and a tip-deflection unit conflict remain explicit."
modality: "Intracortical"
website: "https://www.nature.com/articles/s41592-026-03076-z"
tags: ["Neuropixels", "Opto", "photonics", "optogenetics", "Allen", "UCL", "Washington", "imec", "prototype", "preclinical"]
draft: false
---

# Neuropixels Opto

The June 1, 2026 Nature Methods paper reports a prototype integrating Neuropixels recording electronics with silicon-nitride photonics. Its primary affiliations include the Allen Institute, University of Washington, UCL, Janelia, Johns Hopkins and imec. This is distinct hardware from standard Neuropixels 1.0, Quad Base and NXT. The [mouse application](/applications/108-neuropixels-opto-mouse-optotagging-2026/) separates the experiments and their cohorts.

## Published geometry and readout

| Feature | Published prototype |
| --- | --- |
| Shank | 10 mm long, 70 µm wide, 33 µm thick |
| Recording sites | 960 TiN sites, 12 × 12 µm each |
| Simultaneous recording channels | 384, not 960 |
| Site layout | Two columns 48 µm apart, 20 µm vertical pitch |
| Optical outputs | 14 emitters per color, 28 total; reported area 16-25 µm² |
| Emitter pitch | 100 µm along the center axis |
| Wavelengths | 450 nm blue and 638 nm red |
| Optical routing | 150-nm SiN waveguides; programmable switching trees |
| Current simultaneous illumination | One emitter per color at a time |
| AP/LFP acquisition | AP 0.3-10 kHz sampled 30 kHz; LFP below 1 kHz sampled 2.5 kHz |

Light comes from external fiber-coupled lasers, not implanted LEDs. The recording/photonic base, flex cable, headstage, optical fiber cable and PXI recording/laser modules are part of the system. The paper extends a 5-mm base with 2- and 3-mm wings, but this does not fully specify the assembled package envelope.

## Conflicts retained

The introduction calls the illuminated span 1.4 mm; the design paragraph says the emitter arrangement covers 1.5 mm from the tip. Those descriptions are retained without replacing them with an invented array origin.

The main Results paragraph reports tip deflection below 200 µm. Methods instead says below± 200 nm, while Extended Data Figure 1 again states a± 200 µm specification. The unit conflict is unresolved. No model is presented as a verified fabrication mask or complete package.

## Measured performance and limits

- AP noise 5.45 ± 0.02 µV and LFP noise 5.33 ± 0.03 µV (mean ± s.e.; 20, 097 site measurements, 957 sites across 21 probes). Impedance 138 ± 27 kΩ is reported separately.
- Mean emitted/input optical power:2.07% ± 0.02% red and 0.24% ± 0.01% blue (434 emitters from 31 probes per color). A 100-µW output requires about 5 mW red or 40 mW blue input in the reported system. Output is not input power.
- Sharp red-light onsets produce a roughly 30-µV electrical artifact. It is not an artifact-free probe; preprocessing and tapered pulses matter.
- High-intensity blue light caused material instability and leakage from unintended emitters, requiring recalibration. The authors limited blue power and used red light when high intensity and precise spatial addressing were needed.
- Tissue scattering, neuronal morphology and opsin distribution limit the localization of activation. The paper does not establish single-cell targeting or a safe chronic human stimulation protocol.

## Prototype status

The paper says mass production requires more fabrication and testing. Separate blue photonic layers, integrated power-monitoring photodetectors, smaller packaging and more emitters are proposed improvements, not demonstrated features of this prototype. No completed commercialization or human therapeutic result is claimed here.

## Primary sources

- [Published Nature Methods article](https://www.nature.com/articles/s41592-026-03076-z), June 1, 2026.
- [Published paper PDF in UCL's repository](https://discovery.ucl.ac.uk/id/eprint/10226427/1/2026%20-%20Nature%20Methods%20-%20Neuropixels%20Opto.pdf), including Methods and Extended Data.
- [Earlier preprint record](https://pubmed.ncbi.nlm.nih.gov/39975326/), February 2025. It is not substituted for the published version.
