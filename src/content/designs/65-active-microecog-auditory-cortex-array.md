---
title: "Active micro-ECoG array (196 sites, auditory cortex)"
order: 65
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0044"
interface_class: "ecog"
status: "preclinical"
last_updated: 2026-10-07
description: "A 14 x 14 multiplexed surface array with 196 platinum sites on 250 µm pitch and 29 interface wires on a roughly 25 µm film. Acute anesthetized rat auditory-cortex recordings, 2014."
modality: "Cortical surface"
successRank: 65
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4137255/"
tags: ["micro-ECoG", "multiplexed", "active electronics", "auditory cortex", "Connecticut", "Pennsylvania", "NYU", "academic"]
draft: false
---

# Active micro-ECoG array (196 sites, auditory cortex)

A flexible surface array with switching electronics at each site, used in anesthetized rat auditory cortex in 2014. Values are scoped to the active array unless a row names the passive comparison array. Unreported means not established by the reviewed primary paper.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Active multiplexed 196-site micro-ECoG array, 14 x 14 |
| Manufacturer | Academic fabrication, not a commercial product. Paper affiliations include University of Connecticut, NYU, University of Pennsylvania, University of Illinois at Urbana-Champaign and Northwestern, with collaborators in South Korea and China |
| Interface class | Non-penetrating cortical-surface micro-ECoG with on-array active electronics |
| Origin | Escabí, Read, Viventi, Kim and colleagues; Journal of Neurophysiology 112:1566-1583 (2014). Follows the active flexible arrays of Viventi and colleagues |
| First demonstrated | 2014 primary paper, for this 196-site configuration |
| First human implant | Unreported. No human implantation |
| Species studied | Six adult male Brown Norwegian rats: three recorded with the active array and three separate rats with a passive 32-site comparator. Not six active-array subjects |
| Regulatory status | Preclinical research. No human clearance established |
| Function | Electrical recording of sound-evoked cortical activity with active multiplexing |
| Target tissue | Rat auditory cortex surface after dura and skull removal, mapped against intrinsic optical imaging |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Flexible multilayer film with a transistor switching matrix and surface electrodes |
| Array layout | 14 x 14 matrix with row select and column readout; 29 interface wires |
| Electrode count | 196 recording sites; 392 transistors |
| Pitch | 250 µm center-to-center pitch, 50 µm gap between sites |
| Electrode lengths | Not applicable: surface contacts, no shank |
| Shank width and thickness | Not applicable: no shank. Overall multilayer film about 25 µm thick. Sampled area about 3.5 x 3.5 mm |
| Tip and exposed site geometry | 200 x 200 µm square surface sites |
| Contact coating | Platinum, about 50 nm, evaporated onto the electrode surfaces |
| Insulation | Polyimide about 1.2 µm interlayer, with polyimide and epoxy encapsulation layers of about 1.2 µm and 4 µm |
| Insertion method | Imaging first, then array placed on the exposed surface of auditory cortex. Placement method details beyond this are unreported here |
| Anchoring and fixation | Unreported. Acute anesthetized preparation |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 200 x 200 µm (0.04 mm2) per site, geometric |
| Electrode material | Platinum on metal contacts, transistor switching in silicon |
| Impedance (with measurement frequency) | About 45 kΩ at 1 kHz, reported with the platinum deposition step. Measurement medium and sample scope not detailed here |
| Noise floor or SNR | Unreported as a numeric RMS floor in the reviewed methods. Multiple samples (30) averaged per site to reduce recording noise |
| Recording modality | Extracellular surface field potentials for tone responses, frequency response areas, spectrotemporal receptive fields and dynamic moving ripple responses |
| Sampling rate | 125 kS/s multiplexed acquisition; 30 samples averaged per site; 14 row selections at 8.928 kHz gives 297.6 Hz per site. Circuit speeds above 10 kS/s and a proposed 14 kS/s are not actual recording rates |
| Stimulation capability | Not demonstrated. Recording only |
| Charge injection limit | Unreported |
| Reference and ground | Reference electrode attached to each animal; exact placement and material unreported. Not inherited from the 2011 cat experiment |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Rat auditory cortex surface |
| Insertion trauma and BBB disruption | Dura and skull were removed. Tissue effects of the array are not assessed |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported for an implanted case; acute anesthetized recording only |
| Gliosis and encapsulation | Not assessed; acute experiments |
| Neuron loss near sites | Not assessed |
| Foreign-body response mitigation | Thin flexible film is the design direction. Biological mitigation outcome is unreported |
| Typical failure modes | Unreported failure modes. The scaling discussion to thousands of sites is a design argument, not a demonstrated device |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Per-site switching transistors, multiplexed analog output |
| Data path | Custom acquisition system with four PXI-6289 cards (National Instruments), LabVIEW, connected through Elform anisotropic conductive film. Analog high-pass 0.007 Hz |
| Telemetry bandwidth | Not applicable: wired |
| Sampling rate | Per-site 297.6 Hz after multiplexing and averaging; total 125 kS/s |
| Power | External acquisition electronics; no implanted power source |
| Thermal management | Unreported |
| Packaging and hermeticity | Encapsulation layers are described. Chronic hermeticity unreported |
| MRI compatibility | Unreported |
| Surgical complexity | Skull and dura removal under anesthesia plus optical imaging beforehand. Human workflow unreported |
| Output connectors | Elform anisotropic conductive film to the data-acquisition system; connector model unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Tonotopic mapping across auditory cortex in the three active-array rats, compared with optical imaging. Per-animal channel yield is unreported in the reviewed methods |
| Chronic yield | Not demonstrated. Acute experiments only |
| Stability over time | Unreported |
| Longevity | Not applicable beyond session duration. A 13.5 s acquisition is a mapping protocol, not device lifetime |
| Revision and explant experience | Not applicable: no explant study |
| Adverse events | Unreported |
| Notable demonstrations | Sound-evoked cortical mapping with high site count on 29 wires; frequency maps compared with intrinsic optical imaging |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in the paper |
| Preclinical cohort | Three active-array rats and three separate passive-array comparison rats; anesthetized, acute |
| Follow-up duration | Acute sessions. Chronic follow-up unreported |
| Indications | Preclinical auditory-cortex mapping research. Not an approved clinical device |
| Trials and registries | None established; animal procedures |
| Primary outcomes | Spatial maps of auditory responses and functional relationships between sites at small spacing |
| Key limitations | Acute rats only; active and passive groups used different animals; impedance and yield details sparse; no chronic evidence |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Small pitch with 196 sites on few wires; flexible 25 µm film; comparison against optical imaging |
| Limitations | No implanted-lifetime data; acquisition cards and cable bulk; reference details unreported |
| Scaling constraints | More sites per wire is the design aim, but only 196 sites are demonstrated and wiring, switching speed and acquisition limit larger arrays |

## References

- Escabí MA, Read HL, Viventi J, et al. [A high-density, high-channel count, multiplexed μECoG array for auditory-cortex recordings](https://pmc.ncbi.nlm.nih.gov/articles/PMC4137255/). Journal of Neurophysiology 112:1566-1583 (2014). DOI 10.1152/jn.00179.2013.
- [Lab-hosted PDF of the same paper](https://escabilab.uconn.edu/wp-content/uploads/sites/557/2022/08/Escabi-et-al-ECoG-Array-J-Neurphys-2014-1.pdf).

Earlier active configuration with 360 larger sites: [Active-matrix flexible ECoG array (Viventi, 2011)](/devices/29-active-matrix-flexible-ecog-array-viventi/). The two share an approach, not geometry or acquisition.

The passive comparator was a commercially available 32-site NeuroNexus array (E32-300-20-50) and is not the hardware described on this sheet.
