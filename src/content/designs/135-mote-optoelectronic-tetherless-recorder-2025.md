---
title: "MOTE optical tetherless recorder, 2025"
order: 135
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0081"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "Subnanolitre electrical recorder with AlGaAs optical power and PPM uplink. Mouse evidence uses a cranial window and head fixation; day-365 LFP is weakened and averaged."
website: "https://www.nature.com/articles/s41928-025-01484-1"
modality: "Other"
tags: ["MOTE", "Cornell", "optical", "wireless", "recording", "preclinical"]
draft: false
---

# MOTE optical tetherless recorder

Lee and colleagues report the microscale optoelectronic tetherless electrode (MOTE) in Nature Electronics on November 3, 2025. It records extracellular voltage electrically, then communicates optically. It is not an optogenetic stimulator or a fluorescent activity reporter.

The [Cornell-linked collaboration](/companies/44-cornell-mote-neurotechnology-collaboration/) includes NTU, KAIST, Boston University and University of Arizona affiliations in the primary paper. Its [mouse cortical application](/applications/136-mote-mouse-cortical-recording-2025/) retains both successes and failed devices.

## Hardware

| Part | Published value |
| --- | --- |
| Envelope | Figure 1: 370 × 70 × 20 µm |
| Area | Supplement and Extended Data Table 2: 24,675 µm² |
| CMOS | TSMC 180-nm mixed-signal; 97 circuits arrayed per die |
| Optical interface | One AlGaAs photovoltaic/LED diode, time-multiplexed between power harvesting and emission |
| Power light | External 623-nm LED |
| Uplink | 825-nm pulse-position-modulated optical pulses |
| Nominal electrical power | 1 µW, approximately 1 V and 1 µA |
| Amplifier | 500 nW; bandwidth below 10 Hz to above 10 kHz; 14.8-µV rms reported noise |
| Pt contacts | 28.5 × 30.5 µm and 12.5 × 23 µm, 294.25-µm centre spacing |
| Encapsulation | ALD SiO₂, Si₃N₄ and Al₂O₃, total below 1.5 µm; Pt light shield with outer Al₂O₃ |

The stated rectangular envelope and reported area are not identical quantities. They are retained without replacing the measured area with length × width. The conclusion names 186 transistors, while Figure 3, Extended Data Table 2 and Supplementary Section 5 give 307. Table 2 includes 121 bias transistors; no assumption about the reason for the difference is used to erase either count.

Two contacts provide a differential recording interface, not two independent recording channels. PPM encodes voltage in pulse timing. An external photodetector, oscilloscope and computer decode the data. The oscilloscope's 12.8-ns timing interval is not the neural sample interval or an on-implant ADC specification. No neural-stimulation output, wireless command decoder or closed-loop policy is demonstrated.

## Optical and fabrication limits

The same PVLED harvests power for 93.4% of time and emits for 0.06%, with the remainder in transitions. Main-text incident irradiance is below 70 mW/mm². This is the reported optical setup, not a general human safety limit for every wavelength, exposure or tissue.

High-vacuum annealing removes transfer residues before ALD encapsulation. Pt shields the CMOS against light-induced leakage and forms recording contacts. Fabrication arrays and potential scaling to thousands of devices per square centimetre are not a demonstrated implanted network or a production-yield statistic.

Demonstrated cortical depth is roughly 100-400 µm. Supplementary Section 1's possible 6-mm operation uses a larger assumed photovoltaic area and 160-mW/mm² illumination, not the same measured implant and exposure. It is a theoretical projection, not a six-millimetre chronic recording result.

The implant is untethered, but the demonstrated animals are head-fixed beneath an optical measurement system and a surgical cranial window. Freely moving tracking optics are future work. Possible MRI compatibility is a proposal, not qualification.

## Geometry boundary

No 3D model is added in this cycle. Figure 1 supplies the envelope and the two contacts have measured sizes and spacing, but the exact outline, contact coordinates, PVLED footprint and encapsulation shape are not fully defined by those measurements. A complete-looking rectangular model would conceal those gaps. The published geometry remains available in the table without invented layer placement.

## Primary sources

- [Full primary paper](https://www.nature.com/articles/s41928-025-01484-1): Figures 1-3 and fabrication/recording methods.
- [Extended Data Table 2](https://www.nature.com/articles/s41928-025-01484-1/tables/2): area, power and transistor counts.
- [Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-025-01484-1/MediaObjects/41928_2025_1484_MOESM1_ESM.pdf): theoretical depth, power and day-365 limits.
