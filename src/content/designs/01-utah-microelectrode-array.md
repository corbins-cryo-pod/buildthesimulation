---
title: "Utah Microelectrode Array (UEA)"
order: 1
pubDate: 2026-02-03
updatedDate: 2026-10-07
device_id: "BTSD-0001"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-07
description: "Silicon penetrating arrays with 400 µm electrode pitch. Separates the Utah research family from the 100-electrode, 96-connected NeuroPort configuration and records conflicting manufacturer counts."
modality: "Intracortical"
successRank: 2
website: "https://blackrockneurotech.com/products/utah-array/"
tags: ["BCI", "intracortical", "Utah array", "UEA", "NeuroPort", "silicon", "recording", "stimulation", "human"]
draft: false
---

# Utah Microelectrode Array (UEA)

A silicon array of penetrating electrodes for recording cortical neural activity. The Utah research family and the NeuroPort clinical product share an array architecture, but their configurations, labeling and permitted uses are not interchangeable.

For the early manufacturing geometry and commercial lineage, see [Utah array origins](/devices/59-utah-array-origins/). The [BrainGate pilot](/applications/37-braingate-pilot-2006/) used a 96-microelectrode sensor for a human neural cursor and device control.

## Published geometry

| Field | Source and configuration |
| --- | --- |
| Electrode pitch | 400 µm, current Utah and NeuroPort product pages |
| Utah research lengths | 0.5 to 1.5 mm, current product page |
| NeuroPort lengths | 1.0 or 1.5 mm, current product page and April 2022 IFU |
| NeuroPort layout | 10 x 10, current product page |
| NeuroPort electrode count | 100 physical electrodes, 96 connected to the percutaneous connector, April 2022 IFU |
| Utah substrate | 4 x 4 mm footprint and 0.2 mm thickness, current Utah FAQ |
| Tip coatings | Platinum or sputtered iridium oxide film (SIROF), current product pages |
| NeuroPort wire bundle | 13 cm long, 0.55 mm wide, current product page |

The manufacturer does not give one consistent electrode count for the whole Utah family. Its current overview says "up to 96 electrodes per array"; the FAQ says "up to 128", "100 - 128" microneedles and "96 - 128" electrodes. Those figures are preserved rather than treated as the same configuration. Connector names such as CerePort 128 do not, by themselves, establish the number of connected recording sites.

The [1991 manufacturing geometry](/devices/59-utah-array-origins/) describes a 4.2 mm substrate. That is historical geometry, not a replacement for the current manufacturer's 4 mm FAQ figure.

## Recording and stimulation

The Utah research page describes recording and stimulation. NeuroPort labeling needs its own distinction: the April 2022 NeuroPort Electrode IFU lists temporary recording and monitoring for less than 30 days, and says this recording device should not be used in applications involving stimulation. The current NeuroPort marketing page describes recording and stimulation. This entry does not erase that conflict or treat a marketing page as clinical authorization. Long-term research use and individual clinical protocols are separate from the IFU's labeled use.

The NeuroPort product page lists platinum impedance of 100 to 800 kΩ and SIROF impedance of at most 50 kΩ at 1 kHz. The 2022 IFU lists 100 to 800 kΩ for its platinum configurations and 1 to 80 kΩ for its iridium-oxide configurations. These are source- and configuration-specific figures, not one generic Utah impedance range.

## Long-term evidence and failures

The [2013 retrospective failure study](/applications/70-utah-array-failure-analysis-barrese-2013/) followed 78 arrays in 27 rhesus macaques. Recording duration ranged from 0 to 2,104 days, with a median of 182 days across all arrays. Sixty-two failed completely; nine experiments ended electively and seven were still active at study close. Connector failures, meningeal reactions and insulation degradation were important findings. These are cohort results, not a service-life warranty or a direct estimate of modern human implant survival.

The current NeuroPort page claims recording and stimulation for more than eight years in one patient. That manufacturer claim is not the same evidence as the historical macaque cohort. The older study's approximately eight-year complete-signal-loss estimate was a prediction from trends, not an observed eight-year survival result.

## Model limits

The site's Utah model is a reference array geometry, not a reconstruction of every sold configuration or a clinical implant assembly. The sources above do not specify a complete current shank profile, tip exposure geometry or every packaging component. No new geometry is inferred here.

## Sources

- Blackrock Neurotech. [Utah Array, current product page](https://blackrockneurotech.com/products/utah-array/). Read 7 October 2026.
- Blackrock Neurotech. [NeuroPort Electrode 96, current product page](https://blackrockneurotech.com/products/neuroport-electrode/). Read 7 October 2026.
- Blackrock Microsystems. [NeuroPort Electrode IFU, revision 3.00, April 2022](https://blackrockneurotech.com/wp-content/uploads/2023/04/LB-0612_NeuroPort_Array_IFU.pdf).
- Barrese JC et al. [Failure mode analysis of silicon-based intracortical microelectrode arrays in non-human primates](https://pubmed.ncbi.nlm.nih.gov/24216311/). Journal of Neural Engineering, 2013.
