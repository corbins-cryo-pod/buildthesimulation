---
title: "Fully implanted two-film PZT ME stimulator, 2020"
order: 129
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0079"
interface_class: "dbs"
status: "preclinical"
last_updated: 2026-10-07
description: "Two PZT/Metglas films, discrete rectifiers and a bias magnet in a 175-mm³ package drive rat MFB place preference. Acute behavioral evidence is separate from the PVDF Parkinson headstage."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/"
tags: ["magnetoelectric", "Rice", "two-film", "stimulation", "preclinical"]
draft: false
---

# Fully implanted PZT ME stimulator

The 2020 Neuron paper miniaturizes its discrete two-film circuit for [rat medial-forebrain-bundle place preference](/applications/131-singer-mfb-rat-place-preference-2020/). This PZT/Metglas configuration replaces the [PVDF head-mounted version](/devices/128-singer-pvdf-two-film-headstage-2020/) used for Parkinsonian rotations. It is not evidence that the fully implanted package treated Parkinson's disease.

The [Rice lab brief](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links the later ASIC-based ME devices separately.

## Package and output

| Part | Published detail |
| --- | --- |
| Films | PZT/Metglas, 4.3 × 2 mm and 5.4 × 2 mm |
| Power conversion | Two distinct resonances; positive and negative full-wave rectifier branches with transistor isolation |
| Assembly | Components soldered together directly without a circuit board; films attached with conductive epoxy |
| Bias | Small permanent magnet positioned to balance the two phases |
| Encapsulation | Parylene-coated films/circuit in a rounded 3D-printed plastic case; outer Flow-It ALC and epoxy |
| Interface | Case channel holds a 9-mm platinum-iridium bipolar stereotrode; nominal impedance 10 kΩ at 1 kHz |
| Whole assembly | Table 1: 175 mm³, 500 mg; power-source volume 2-4 mm³ |
| Wireless drive | Table 1: 250-400-kHz carrier, 1-2-mT alternating field, 7-W required power |
| Stimulation | Table 1: 150 Hz, maximum reported in-animal power 2 mW |

The separate resonant-coil methods describe 300-400-kHz drive for miniature devices. This narrower methods range is retained alongside Table 1, without inventing an exact pair of carrier frequencies for every implant. The place-preference experiment uses 1.5-mT fields at both ends of its track.

The case is fixed to skull screws and dental materials, with the skin sutured over it and the stereotrode entering the brain. Fully implanted means no exposed headstage during the experiment, not a freely floating injectable grain or a lead-free device. Methods include ethylene-oxide sterilization followed by degassing.

## What the paper establishes

The 2020 study demonstrates acute reward-circuit behavior in three rats, tested 1-3 days after surgery. It does not establish chronic functional performance, human therapy, a recording channel or an autonomous feedback loop. The output is electrical stimulation, not optogenetics, and the behavioral rats do not require genetic modification.

The general two-film circuit characterization reports less than 1 nC residual charge and discharge within 2 ms. That result is not a device-by-device chronic safety qualification of every packaged implant. Films, external coils, the permanent bias field and the implanted electrode each have separate safety constraints.

The paper's 14-day saline lifetime experiment concerns coated films. Methods say skin sutures held for at least one month; intact sutures are not evidence of a month of functional stimulation or histological tolerance. The discussion calls for chronic packaging and foreign-body-response tests and notes magnetic-imaging and possible pressure-wave limits. PZT is lead-containing; this study does not establish lifetime containment of that material.

No 3D model is added. Figure 5 confirms the separate films, compact circuit and buried assembly, but the published film rectangles and total volume do not define the rounded case, magnet, contact spacing or component arrangement closely enough.

## Primary source

- [Singer and colleagues, Neuron 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/): Table 1, Figure 5, two-film circuit, place-preference implant design, surgery and Discussion. Exact supplement-only geometry is omitted because the PDF download was not readable.
