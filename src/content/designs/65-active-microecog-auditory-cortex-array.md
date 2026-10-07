---
title: "Active micro-ECoG array (196 sites, auditory cortex)"
order: 65
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0044"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "A 14 × 14 multiplexed surface array with 196 platinum sites on 250 µm center pitch, 29 interface wires and a roughly 25 µm flexible film. Rat auditory-cortex recordings, 2014."
modality: "Cortical surface"
successRank: 65
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4137255/"
tags: ["micro-ECoG", "multiplexed", "active electronics", "auditory cortex", "Connecticut", "Pennsylvania", "NYU", "academic"]
draft: false
---

# Active micro-ECoG array for auditory-cortex recordings

A flexible surface array with switching electronics at each recording site. Multiplexing reduces the external wiring: this 196-site device uses 29 interface wires instead of a separate wire for every site.

## Published geometry

| Field | 2014 paper |
| --- | --- |
| Site arrangement | 14 × 14 matrix, 196 electrodes |
| Site size | 200 × 200 µm |
| Gap between sites | 50 µm |
| Center-to-center pitch | 250 µm |
| Recording area | Approximately 3.5 × 3.5 mm |
| Multilayer thickness | Approximately 25 µm |
| Interface wires | 29 |
| Recording surface | Platinum, approximately 50 nm deposited layer |
| Site impedance | Approximately 45 kΩ at 1 kHz |

The paper distinguishes this active array from the passive NeuroNexus E32-300-20-50 used in a comparison group. That passive array has 32 sites and is not the hardware described here.

## What was shown

The team used the custom active array in three anesthetized rats and the passive array in three other rats. The active array mapped sound responses across auditory cortex. Frequency-response maps were compared with intrinsic optical imaging from the same cortical locations.

This is an acute experiment, not chronic implant evidence. The paper's discussion of scaling to thousands of sites is a design argument, not a demonstrated thousand-site implant.

## Place in surface-array history

This device follows the actively multiplexed flexible arrays described by Viventi and colleagues in 2010 and 2011. The 2014 paper uses smaller pitch and a different 196-site layout. It belongs in Devices because it specifies a distinct hardware configuration, even though auditory mapping is the experiment used to validate it.

## Organizations

The paper lists University of Connecticut, New York University, University of Pennsylvania, University of Illinois at Urbana-Champaign and Northwestern University among its US affiliations, alongside collaborators in South Korea and China. These are paper affiliations, not claims about who manufactured a commercial product.

## Sources and model limits

- Escabí MA, Read HL, Viventi J, et al. *A high-density, high-channel count, multiplexed μECoG array for auditory-cortex recordings.* Journal of Neurophysiology 112:1566-1583 (2014). DOI: 10.1152/jn.00179.2013. [Primary manuscript, fabrication and recording methods](https://pmc.ncbi.nlm.nih.gov/articles/PMC4137255/).

A recording-patch reference model can preserve the published site geometry and film thickness. The full flexible outline, interface cable and switching layers need separate reconstruction; they should not be guessed from the recording-area size.
