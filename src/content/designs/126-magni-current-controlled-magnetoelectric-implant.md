---
title: "MagNI current-controlled ME implant, 2020"
order: 126
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0077"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Published 8.2-mm³, 28-mg MagNI research stimulator: 250-kHz ME power, 1.5-mm² ASIC and programmable biphasic current. Hydra activation and a seven-day saline test are not spinal pain treatment."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8712272/"
tags: ["MagNI", "magnetoelectric", "Rice", "CMOS", "current stimulation", "Hydra", "preclinical"]
draft: false
---

# MagNI research stimulator

The 2020 IEEE Transactions on Biomedical Circuits and Systems paper reports MagNI, a magnetoelectrically powered and controlled stimulation implant. Primary affiliations include Rice and Baylor. Its [Hydra application](/applications/127-magni-hydra-muscle-stimulation-2020/) is excitable-tissue evidence, not a spinal-cord pain-treatment result.

This is a current-controlled design with a 1.5-mm² die. It is distinct from the later [0.8-mm² PUF-addressed voltage stimulator](/devices/124-puf-addressed-magnetoelectric-multisite-stimulator/) and endovascular ME-BIT configuration. The [Rice lab brief](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links the laboratories.

## Published configuration

| Part | Specification |
| --- | --- |
| Implant | 8.2 mm³; 28 mg |
| SoC | 1.5 mm²; 180-nm CMOS |
| ME transducer | 4 × 2 × 0.12 mm; approximately 250 kHz; Metglas and nickel-coated PZT |
| Substrate and contacts | Flexible polyimide; 1-mm² on-board contacts |
| Storage | One off-chip 4.7-µF capacitor |
| Output | Biphasic current; 0.05-1.5 mA in 50-µA steps; 64-512 µs; 0-200 Hz |
| Timing | Fixed 32-µs interphase pause; contacts shorted after stimulation |
| Saline-test packaging | ME film in a printed enclosure with 0.4-mm thickness, then nonconductive epoxy encapsulation |

The contact test compares bare gold with porous platinum coating: impedance at 2 kHz fell from 2,100 to 170 Ω. That is a saline contact measurement, not a human electrode qualification.

## Charge and power measurements

The circuit generates programmed biphasic currents, but measured asymmetry leaves a worst-case 6.5-nC charge imbalance at 1.5 mA and 512 µs. The paper describes post-stimulation contact shorting as removing residual charge. That circuit mechanism is retained alongside the measured imbalance, not converted into unconditional chronic safety.

Chip power is 23.7 µW, with an approximately 90% chip-efficiency claim. End-to-end figures are much smaller: 0.435% at the coil center and 0.064% at 30 mm. The saline power test gives 2.22-mW peak harvested power at center and 1.35 mW at 30-mm transmitter separation. The latter is not a demonstrated 30-mm in-vivo spinal implant.

A seven-day PBS soak at the coil center retained operation with peak recovered power of 2.16-2.25 mW. This is short bench endurance, not seven days of chronic animal stimulation. Agar and air were tested separately.

## Safety boundary

The paper models exposure using its cited IEEE limits. Its MRI-safety discussion compares material mass with another device and anticipates artifacts; it does not report completed MagNI MRI qualification. Lead-containing PZT needs a suitable barrier for chronic use. Multi-year packaging, full tissue response and clinical safety remain unestablished here.

No full model is supplied. Figure 3 and component dimensions establish scale, but complete flex outline, circuit placement, contact spacing and encapsulation geometry are not fully specified. Proposed spinal pain therapy is not a demonstrated application of this paper.

## Primary source

- [Published primary manuscript, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC8712272/), DOI 10.1109/TBCAS.2020.3037862, Figures 3, 22-28, saline testing and Tables II-III.
