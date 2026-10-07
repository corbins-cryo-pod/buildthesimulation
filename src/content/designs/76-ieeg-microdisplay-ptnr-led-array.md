---
title: "iEEG microdisplay with PtNR recording grid"
order: 76
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0052"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "PtNR surface electrodes laminated with GaN microLEDs to display cortical activity in the surgical field. Rat and pig proof of concept, including a 2,048-pixel display over 1,024 recording contacts and documented electrical interference."
modality: "Cortical surface"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11093107/"
tags: ["iEEG", "microdisplay", "PtNRGrid", "microLED", "GaN", "UCSD", "Dayeh", "mapping", "academic", "preclinical"]
draft: false
---

# iEEG microdisplay with PtNR recording grid

An intraoperative display and recording assembly that places a light map of neural activity directly over the corresponding brain surface. Tchoe and colleagues' 2024 Science Translational Medicine paper laminates GaN microLED arrays onto the back of [PtNRGrid recording electrodes](/devices/74-ptnrgrid-platinum-nanorod-surface-arrays/).

The light is a display for the surgical field. This is not an optogenetic stimulation implant or a demonstrated visual prosthesis.

## Pixels are not recording channels

| Configuration | Display | Recording grid | Coverage |
| --- | --- | --- | --- |
| Single-colour | 1,024 GaN microLED pixels | 1,024 PtNR contacts | 32 x 32 mm at 1 mm pitch for pig brain, or 5 x 5 mm at 0.15 mm pitch for rat brain |
| Dual-colour | 2,048 quantum-dot-converted pixels; 0.4 mm vertical and 0.5 mm horizontal pitch | 1,024 contacts; 0.8 mm vertical and 0.5 mm horizontal pitch | 12.8 x 32 mm |

The PtNR recording contacts are 30 µm in diameter, with average impedance around 30 kΩ at 1 kHz in this paper. GaN microLEDs have 220 µm diameter in the 1 mm-pitch display, or 100 µm diameter in the denser rat and dual-colour configurations. The GaN/InGaN emitters produce blue light near 450 nm; inkjet-printed indium-phosphide quantum-dot conversion enables other colours.

These are multiple assemblies, not one universal footprint. In the dual-colour device, twice as many pixels do not mean twice as many recording electrodes.

## What was shown

Rat and pig proof-of-concept experiments recorded cortical electrical activity and displayed corresponding light patterns in real time. The authors demonstrated cortical landmarks and pathological activity, including co-registration of functional boundaries and epileptic activity with a dual-colour display.

The paper does not show improved human surgical outcomes or chronic clinical use. Its primary affiliations include UC San Diego's Integrated Electronics and Biointerfaces Laboratory, alongside other collaborators.

## Interference and safety limits

The authors report that proximity of the LED driver and ECoG grid added high-frequency noise when the display system was powered, even without light emission. Noise peaks began around 98.63 Hz and its harmonics. This is a documented engineering limit, not an omitted footnote.

One pig experiment found no temperature change above the infrared camera's 0.1°C measurement resolution during 30 minutes of continuous operation of all 2,048 LEDs. But the denser rat display heated by up to 6°C in less than five minutes when all 1,024 LEDs were on at maximum brightness. Adjusting the LED duty cycle produced acceptable brightness with less than 1°C temperature rise in the reported follow-up tests. Pixel density and operating conditions matter; the pig result is not a universal thermal-safety claim.

Another electrical-safety measurement followed impedance relative to tissue over 3.7 hours on one pig brain. These bounded tests do not establish years of thermal, electrical or tissue safety. The authors say the complete assembled display still needs biocompatibility, sterility and packaging tests for human use, as well as more sensitive continuous leakage-current monitoring. Tests of the recording grid alone do not qualify the assembled display.

The system requires recording, analysis and display-driver equipment. No fully implanted wireless package, human-use clearance or chronic assistive function is claimed here.

## Model limits

No model is added from pixel count alone. The laminated grid, perforations, full outline, leads and display/electrode layer placement are not reconstructed in this entry. A recording-contact model alone would leave out the device's main hardware distinction.

## Source

- Tchoe Y et al. [An electroencephalogram microdisplay to visualize neuronal activity on the brain surface](https://pmc.ncbi.nlm.nih.gov/articles/PMC11093107/). Science Translational Medicine 16:eadj7257, 24 April 2024. Primary full text, Figure 1, results and Discussion.
