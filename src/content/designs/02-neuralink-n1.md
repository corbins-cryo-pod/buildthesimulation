---
title: "Neuralink N1 (flexible-thread implant)"
order: 2
pubDate: 2026-02-03
updatedDate: 2026-10-07
device_id: "BTSD-0002"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-07
description: "Neuralink’s fully implanted, wireless intracortical BCI, with a 3D reference for the documented 2024 N1 configuration: 64 flexible threads and 1,024 sites."
modality: "Intracortical"
successRank: 4
website: "https://neuralink.com/"
tags: ["BCI", "intracortical", "penetrating", "Neuralink", "wireless", "robotic surgery", "cortex", "recording", "microelectrode", "flexible threads"]
draft: false
---

# Neuralink N1 Implant

N1 combines independently placed flexible electrode threads with a skull-mounted enclosure containing electronics, a rechargeable battery and wireless telemetry. The R1 robot inserts the threads; an external application decodes the recorded activity into computer actions. [1]

### Which N1 is modeled?

This is the **64-thread, 16-sites-per-thread configuration described in 2024**, totaling 1,024 physical sites. [1, 2] The dated name matters: UCLH’s July 2025 GB-PRIME description instead specifies **128 threads with 8 electrodes each**. [3] Both total 1,024 sites, but they have different physical layouts. The newer description is linked for comparison and is not silently folded into the 2024 model.

### Geometry and evidence

| Parameter | Evidence for the selected revision | Treatment in the model |
| --- | --- | --- |
| Threads / electrodes | 64 / 1,024 [1] | 64 separately drawn ribbons, 16 sites each |
| Along-thread site pitch | 200 µm, reported by DJ Seo in 2024 [2] | 200 µm center to center |
| Thread width | 16–84 µm in the same interview [2] | Linear taper between those limits; progression is illustrative |
| Thread thickness | Two 2 µm polymer layers and a 0.4 µm metal stack [2] | 4.4 µm total derived from the described stack |
| Enclosure | Approximately quarter-sized and 9 mm thick [2] | Nominal 24 mm diameter × 9 mm thickness |
| Contact shape and exposed area | Not established in the reviewed sources | 12 × 20 µm visual markers; exposed area is exported as unknown |
| Thread placement | Independently placed by the surgical robot [1] | Unfurled display fan, not a cortical insertion map |

### Using the 3D reference

The model shows the enclosure envelope and all 64 flexible ribbons in a schematic unfurled pose. **Thread detail** shows a terminal recording section; **Contact detail** reveals the tiny site markers. Both change the camera only. Gold is a visual highlight, not a claim about the exposed contact’s actual appearance.

Fan length, thread-to-thread spacing, bends, taper progression and enclosure trim are reconstruction choices. Internal chips, the charging coil, surgical insertion loops and individual metal traces are omitted. ClinicalTrials.gov describes the N1 as a skull-mounted, wireless, rechargeable implant [4], so a coil exists, but no cited source gives its size or position and none is drawn. No patient-specific trajectory or cortical insertion depth is encoded in this display pose.

JSON exports use millimeters and identify both thread and site index. Each physical site has a unique geometric ID; acquisition channel assignments and contact areas stay null. GLB uses meters and includes the full assembly even when viewing contacts only. Transforming the display fan into an implanted configuration requires independently specified trajectories and a validated electrical model.

### Interface and operation

The engineering interview describes a polyimide-insulated thin-film metal stack and iridium-oxide recording sites, with electrodes distributed along the thread rather than only at its endpoint. It also discusses stimulation capability; that does not establish clinical efficacy or stimulation limits for this geometric model. [2]

Inductive charging and wireless data allow the implant to operate without a percutaneous connector. [1] The relevant human programs are investigational studies. UCLH describes the GB-PRIME study as evaluating safety and functionality, with an initial study period and longer follow-up. [3]

### Identity

| Field | Value and source scope |
| --- | --- |
| Device | N1 implant, flexible-thread intracortical BCI |
| Manufacturer | Neuralink |
| Interface class | Intracortical, penetrating flexible threads |
| First human implant | First PRIME participant reported in company updates beginning 2024 [1] |
| Species studied | Human (investigational) and preclinical animals; preclinical detail unreported here |
| Regulatory status | Investigational: PRIME (NCT06429735) [4] and GB-PRIME [3]; not commercially approved |
| Function | Recording; stimulation capability discussed in the engineering interview [2] |
| Target tissue | Motor cortex in the reported human program |

### Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating flexible polymer threads |
| Configuration modeled | 64 threads x 16 sites (2024 description) [1, 2]; the 128 x 8 variant is documented separately [3] |
| Site pitch along thread | 200 µm [2] |
| Thread width / thickness | 16-84 µm width; 4.4 µm thickness derived from the described layer stack [2] |
| Enclosure | Approximately quarter-sized, 9 mm thick [2]; nominal 24 mm diameter in the model |
| Contact shape and area | Unreported; visual markers are illustrative |
| Insertion method | R1 surgical robot [1] |
| Anchoring / fixation | Skull-mounted enclosure [1, 4] |
| Insulation | Polyimide over a thin-film metal stack [2] |

### Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported; exported as unknown |
| Electrode material | Iridium-oxide recording sites on a thin-film metal stack [2] |
| Impedance | Unreported in reviewed sources |
| Noise floor | Unreported in reviewed sources |
| Recording modality / bands | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Stimulation capability | Discussed publicly [2]; parameters and limits unreported |
| Charge injection limit | Unreported |
| Reference and ground | Unreported in reviewed sources |

### Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cerebral cortex |
| Insertion trauma / vascular disruption | Threads are placed to avoid vasculature per company descriptions [1]; quantitative trauma data unreported |
| Micromotion sensitivity | Flexible threads are designed to move with tissue [1]; independent quantitative data unreported |
| Gliosis / encapsulation | Unreported in reviewed sources |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Thread flexibility and small cross-section are the design approach; measured outcomes unreported |
| Typical failure modes | Thread retraction after implantation was reported for the first participant in company updates [1] |

### System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Enclosure contains electronics for recording, processing and wireless telemetry [1] |
| Data path | Wireless; no percutaneous connector [1] |
| Telemetry bandwidth | Unreported in reviewed sources |
| Sampling rate | Unreported in reviewed sources |
| Power | Rechargeable battery, inductive charging [1, 4] |
| Thermal management | Unreported in reviewed sources |
| Packaging / hermeticity | Sealed skull-mounted enclosure; hermeticity specifications unreported |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | R1 robot insertion with skull-mounted enclosure placement [1] |

### Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported in reviewed sources |
| Chronic yield | Company reports cursor and device control in study participants [1]; independent datasets unreported |
| Stability over time | Thread retraction affected early recordings in the first participant [1]; long-term stability unreported |
| Longevity | Unreported; battery and packaging lifetime not publicly specified |
| Revision / explant experience | Unreported in reviewed sources |
| Adverse events | No independently audited rates in reviewed sources |
| Notable demonstrations | Company-reported cursor control and computer use by study participants [1] |

### Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | PRIME and GB-PRIME investigational studies; company-reported participant counts change over time and are not pinned here |
| Follow-up duration | Initial study period with longer follow-up per UCLH [3] |
| Indications | Severe motor impairment and paralysis |
| Trials / registries | NCT06429735 (PRIME) [4]; GB-PRIME [3] |
| Primary outcomes | Safety and functionality [3, 4] |
| Key limitations | Evidence is largely company statements and interviews; peer-reviewed human data remain sparse |

### Engineering tradeoffs

| Aspect | Assessment |
| --- | --- |
| Strengths | High site count, fully implanted wireless operation, flexible threads, robotic insertion, no percutaneous connector |
| Limitations | Sparse peer-reviewed data, reported thread retraction, dependence on a novel surgical robot, unpublished longevity |
| Scaling constraints | Surgical throughput, hermetic packaging, telemetry bandwidth, power and heat, chronic tissue response |

### Sources and images

1. [Neuralink — PRIME Study Progress Update; April 12, 2024](https://neuralink.com/updates/prime-study-progress-update/). Includes the manufacturer’s [exploded N1 reference image](https://cdn.buttercms.com/HsyAIkHURhOFMwmjO16q).
2. [DJ Seo — Neuralink engineering interview, Lex Fridman podcast #438 (2024)](https://lexfridman.com/elon-musk-and-neuralink-team-transcript/). See 02:03:33 for electrode layout, 02:07:03 for enclosure, 02:08:58 for width and 02:12:48 for the layer stack. These are public engineering descriptions, not released fabrication drawings.
3. [UCLH — GB-PRIME study description; July 31, 2025](https://www.uclh.nhs.uk/news/uclh-evaluate-safety-and-functionality-neuralinks-brain-computer-interface-bci-technology). Documents a separate 128 × 8 arrangement and investigational study status.
4. [ClinicalTrials.gov NCT06429735 — PRIME study](https://clinicaltrials.gov/study/NCT06429735). Describes the N1 Implant as skull-mounted, wireless and rechargeable.
