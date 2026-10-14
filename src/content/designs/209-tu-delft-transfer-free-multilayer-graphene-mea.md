---
title: "TU Delft transfer-free multilayer graphene MEA (DBI2 TS4)"
order: 209
pubDate: 2026-10-14
updatedDate: 2026-10-14
device_id: "BTSD-ACAD-0110"
interface_class: "other"
status: "research"
last_updated: 2026-10-14
description: "Transparent multilayer graphene microelectrode arrays grown directly on fused silica, with 10, 30 and 50 µm electrodes, tested on acute mouse cerebellar slices. From the Delft group of Vasiliki Giagka within the Dutch Brain Interface Initiative; the DBI2 annual report credits a collaboration with the Battaglia lab at Radboud."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC13067786/"
axis: ["other"]
function: ["recording"]
form: ["array"]
origin: "Netherlands"
tags: ["graphene", "transparent electrode", "MEA", "in vitro", "brain slice", "DBI2"]
draft: false
---

# TU Delft transfer-free multilayer graphene MEA (DBI2 TS4)

A transparent microelectrode array whose recording sites are multilayer graphene grown in place on the substrate, instead of transferred from a pre-grown sheet. It is an in vitro research tool for combining electrical recording with optical imaging, tested on brain slices. It is not an implant.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Transfer-free multilayer graphene MEA on transparent fused silica [1] |
| Origin | Delft University of Technology (Department of Microelectronics), with Fraunhofer IZM Berlin and Erasmus MC Rotterdam listed among author affiliations [1] |
| Programme | Dutch Brain Interface Initiative, task TS4 (PI Vasiliki Giagka, TU Delft); the paper states it is part of the DBI2 project [1][3] |
| Radboud and Donders link | The DBI2 annual report says graphene electrode designs were developed in collaboration with the Battaglia lab at Radboud University [3]. No Radboud or Donders author appears on the paper's author list [1] |
| Species | Mouse (acute cerebellar slices) [1] |
| Regulatory status | Research device, in vitro [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Substrate | Transparent fused silica wafer; the 4 in wafer carried 12 MEAs of different designs [1] |
| Array layout | Three primary designs: 60 electrodes of 10 µm in an 8 x 8 grid at 100 µm pitch; 60 electrodes of 50 µm in an 8 x 8 grid at 200 µm pitch; 32 electrodes of 30 µm in a 6 x 6 grid at 100 µm pitch. A further design spans 10 to 500 µm diameters [1] |
| Electrode diameters | 10, 30 and 50 µm tested on slices [1] |
| Tracks and pads | Inner tracks inside the imaging region are a graphene and molybdenum bilayer; outer tracks and pads are Ti/Au [1] |
| Insulation | Parylene-C, 1 to 2 µm [1] |
| Interface | Custom PCB sized for Multichannel Systems 60-electrode MEA recording systems, also compatible with a TDT MZ60 interface [1] |

## Materials and fabrication

| Field | Value and source scope |
| --- | --- |
| Conductor | Multilayer turbostratic graphene grown by CVD on a molybdenum catalyst layer on the fused silica, so no transfer step is needed [1] |
| Layer count | Estimated at roughly 20 to 25 layers from 47.5% transmittance at 550 nm, assuming about 2.3% absorption per layer; the authors call this a linear approximation [1] |
| Transparency | About 50% across the spectrum; 47.5% at 550 nm [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Impedance | 5.68 ± 1.37 MΩ at 1 kHz for 10 µm electrodes (n = 42); other sizes in the paper's supplementary table, not extracted here [1] |
| Noise | Baseline rms noise 2 to 7 µV [1] |
| Spike amplitude | Up to about 140 µV [1] |
| Signal to noise | Published article: 18.6 ± 2.7 dB (10 µm), 24.4 ± 6.2 dB (30 µm), 24.2 ± 4.3 dB (50 µm); abstract states up to about 25 dB. The 2025 preprint abstract states up to 30 to 40 dB [1][2] |
| Recording result | Spontaneous extracellular spiking from acute mouse cerebellar slices, which the authors attribute to Purkinje cells; the paper says signal quality was limited more by electrode-tissue coupling than by the MEA technology [1] |
| First claimed | The published abstract says it is the first demonstration that transparent graphene electrodes as small as 10 µm record extracellular spiking at these signal-to-noise ratios [1] |
| Annual-report status | Year 2 report: graphene MEAs with 30 µm electrodes on transparent substrates recorded spikes from brain slices; two-photon tests confirmed graphene sheet transparency [3] |

## Limits

In vitro slice recordings only; no implantation, animal in vivo recording or chronic data. The DBI2 task TS4 aims at flexible, stretchable, freely floating active arrays; the device here is on rigid fused silica. The paper says a flexible-substrate version of the transfer-free process was reported earlier; that version is not catalogued here. Charge injection, long-term stability and biocompatibility testing are blank.

## References

1. Alvarez de Eulate N, Pavlou C, León González G, Camarena Pérez M, Holzapfel L, Gao Z, Vollebregt S, Giagka V. Transparent transfer-free ultrasmall multilayer graphene microelectrodes enable high quality recordings in brain slices. Advanced Science 13(20):e17524 (2026), CC BY. [DOI 10.1002/advs.202517524](https://doi.org/10.1002/advs.202517524); full text [PMC13067786](https://pmc.ncbi.nlm.nih.gov/articles/PMC13067786/).
2. Preprint of the same work, bioRxiv 2025, DOI 10.1101/2025.06.13.657566, listed on the [DBI2 publications page](https://dbi2.nl/publications/scientific-publications/transparent-transfer-free-multilayer-graphene-microelectrodes-enable-high-quality-recordings-in-brain-slices-2).
3. [DBI2 Annual Report, Year 2](https://dbi2.nl/images/reports/DBI2_Annual%20Report%20Year%202_final-public.pdf), Work Package 3, task TS4.
4. [DBI2 project page: graphene-based neural interfaces](https://www.dbi2.nl/dbi-2-research/research-projects/fabrication-and-characterization-of-graphene-based-neural-interfaces) (TU Delft postdoc project, September 2023 to August 2027, owner Christos Pavlou).
