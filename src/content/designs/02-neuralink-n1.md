---
title: "Neuralink N1 (flexible-thread implant)"
order: 2
pubDate: 2026-02-03
updatedDate: 2026-10-05
device_id: "BTSD-0002"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-05
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

### Sources and images

1. [Neuralink — PRIME Study Progress Update; April 12, 2024](https://neuralink.com/updates/prime-study-progress-update/). Includes the manufacturer’s [exploded N1 reference image](https://cdn.buttercms.com/HsyAIkHURhOFMwmjO16q).
2. [DJ Seo — Neuralink engineering interview, Lex Fridman podcast #438 (2024)](https://lexfridman.com/elon-musk-and-neuralink-team-transcript/). See 02:03:33 for electrode layout, 02:07:03 for enclosure, 02:08:58 for width and 02:12:48 for the layer stack. These are public engineering descriptions, not released fabrication drawings.
3. [UCLH — GB-PRIME study description; July 31, 2025](https://www.uclh.nhs.uk/news/uclh-evaluate-safety-and-functionality-neuralinks-brain-computer-interface-bci-technology). Documents a separate 128 × 8 arrangement and investigational study status.
4. [ClinicalTrials.gov NCT06429735 — PRIME study](https://clinicaltrials.gov/study/NCT06429735). Describes the N1 Implant as skull-mounted, wireless and rechargeable.
