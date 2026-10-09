---
title: "Neuropixels 2.0 alpha single/four-shank probes"
order: 88
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0058"
interface_class: "intracortical"
status: "preclinical"
last_updated: 2026-10-07
description: "The 2021 alpha hardware has 1,280 sites per shank, one or four shanks and 384 channels per probe. Vertical alignment and miniaturized packaging support motion correction and small-animal chronic recording."
modality: "Intracortical"
website: "https://www.science.org/doi/10.1126/science.abf4588"
tags: ["Neuropixels", "2.0", "alpha", "intracortical", "recording", "silicon", "chronic", "preclinical"]
draft: false
---

# Neuropixels 2.0 alpha single/four-shank probes

Steinmetz and colleagues' 2021 paper reports the alpha version of Neuropixels 2.0. Each value is scoped to that alpha hardware or to the named cohort. The planned beta ADC is not a result of the alpha probes. A blank cell means not established by the reviewed primary paper.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Neuropixels 2.0 alpha probe, single-shank and four-shank versions, with miniaturized base and headstage |
| Manufacturer | Fabricated as a one-piece CMOS probe with imec; study by a multi-institution team including UCL, University of Washington and Janelia. Not a commercial release specification |
| Interface class | Penetrating silicon CMOS recording probe |
| Origin | Steinmetz, Aydin, Lebedeva, Okun, Pachitariu and a multi-lab team; Science 2021 |
| First demonstrated | 2021 paper. Alpha hardware only; later commercial 2.0 revisions are not described |
| First human implant | Rodents only |
| Species studied | Mice and rats: 21 chronic implants in 6 laboratories; acute head-fixed mouse recordings for motion-correction ground truth |
| Regulatory status | Preclinical research tool. No human clearance established |
| Function | Extracellular multi-neuron recording with post-hoc motion correction. The tip site can be configured as a reference |
| Target tissue | Rodent brain, laboratory-chosen regions including visual cortex and dorsal striatum |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Rigid silicon shank(s) on a CMOS base, rigid PCB and flexible ribbon cable |
| Array layout | One or four shanks; two vertically aligned columns of sites per shank; arrow-shaped rigid PCB and 43.5 mm flex cable |
| Electrode count | 1,280 sites per shank: 1,280 on single-shank, 5,120 on four-shank. 384 channels per probe. Two four-shank probes give 10,240 sites and 768 simultaneous channels |
| Pitch | 15 µm along the shank, 32 µm between the two columns, 250 µm center spacing between shanks on the four-shank probe |
| Electrode lengths | Site field about 10 mm along the shank (two columns, 15 µm pitch, 1,280 sites per shank, four-shank plane stated as about 1 x 10 mm). Full shank length not reported in the reviewed full text |
| Shank width and thickness | Shank section 70 x 24 µm. Base 2.2 x 8.7 mm2. PCB about 14 mm long, 3.5 mm wide at the thin end and 6.9 mm at the thick end, about 1.2 mm thick. Flex cable 43.5 mm x 4.0 mm x 80 µm |
| Tip and exposed site geometry | As-fabricated tip taper 175 µm long at about 20 degrees in the shank plane. The triangular tip area is one large electrode site configurable as internal reference |
| Contact coating | Porous titanium nitride on the sites |
| Insulation | Insulation material and thickness not reported in the reviewed text |
| Insertion method | Rigid shank inserted into brain; chronic implants used custom 3D printed fixtures for 7 of 21 implants, enabling probe recovery and re-use |
| Anchoring and fixation | Seven of 21 implants used recoverable 3D-printed fixtures protecting probe and headstage. The other 14 anchoring methods follow each laboratory and are not itemized here |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 12 x 12 µm (144 µm2) per recording site, geometric |
| Electrode material | Porous TiN recording sites; silicon CMOS substrate |
| Impedance (with measurement frequency) | 148 ± 8 kΩ at 1 kHz for the 12 x 12 µm porous TiN sites |
| Noise floor or SNR | Recording channel noise 7.2 µV RMS without electrode noise; 8.2 µV RMS in the 300 Hz to 10 kHz action-potential band including electrode noise. NP 1.0 comparison channel noise 5.4 µV RMS |
| Recording modality | Extracellular spikes and local signals, 0.5 Hz to 10 kHz full-band |
| Sampling rate | 30 kHz per channel, 14 bit |
| Stimulation capability | Recording only. The headstage has a solder pad wired to the tip site that can deliver current, but no stimulation rating is reported |
| Charge injection limit | The tip pad is not rated for charge injection |
| Reference and ground | Internal reference at the tip or optional external reference and ground solder pads on the PCB and flex-cable wings; four shank sites can serve as references but are not recommended because of higher impedance |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Rodent brain |
| Insertion trauma and BBB disruption | Rigid 70 x 24 µm shanks insert through craniotomy. Tissue injury and blood-brain barrier disruption are not quantified in the reviewed text |
| Vascular disruption risk | No vessel-avoidance data in the reviewed text |
| Micromotion sensitivity | Rigid silicon with brain motion relative to the probe handled by post-hoc motion correction; shared motion appeared at fast (under 1 minute) and slow (about 10 minute) timescales |
| Gliosis and encapsulation | No histological gliosis measurement in the reviewed text |
| Neuron loss near sites | The paper tracks unit stability but does not count neuron loss |
| Foreign-body response mitigation | Smaller probe and headstage to lower implant burden; no biological coating or stiffness mitigation described |
| Typical failure modes | One of 21 chronic implants did not succeed. In one mouse a discontinuity lost almost all tracked units, speculated to be a non-coaxial probe shift. Probe recovery succeeded for 7 of 8 recoverable-fixture probes |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | 130 nm CMOS base with filtering, amplification, multiplexing, digitization and power management |
| Data path | Probe base to flex cable to headstage via 27-pin ZIF, then 5 m cable (two twisted strands, 5 g) to a PXIe base station, using SpikeGLX or OpenEphys |
| Telemetry bandwidth | Not applicable: wired |
| Sampling rate | 30 kHz per channel, 384 channels per probe, 768 with two probes on one headstage |
| Power | Base consumes 36.5 mW. Headstage and cable powered from the base station; optional battery supply for isolation |
| Thermal management |  |
| Packaging and hermeticity | Epoxy and wire bonding of base to PCB. Chronic hermeticity beyond the reported recordings is not reported |
| MRI compatibility |  |
| Surgical complexity | Craniotomy and implantation in rodents, with optional recoverable fixture. Human surgery not applicable |
| Output connectors | 27-pin ZIF on the headstage side; 4-pin Omnetics connector from headstage to cable; USB-C at the base station |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Motion-corrected acute head-fixed mouse recordings: stable units rose from 156, 103, 22 to 181, 201, 108 in three recordings. 6,144 of 10,240 sites recorded across a pair of probes in a freely moving mouse, 768 at a time |
| Chronic yield | 20 of 21 implants succeeded and recorded until the experimenter ended the study. Most gave good recordings for at least 8 weeks by stable firing rate and sorted neuron count |
| Stability over time | Across-session tracking by visual fingerprint: 93% ± 9% of well-isolated units tracked within 16 days, 85% ± 19% across 3 to 9 weeks. Combined-bank readout lowers SNR by a factor of 2 and cut sortable neurons, e.g. 75, 44, 20 combined versus 215, 139, 40 separate banks |
| Longevity | One laboratory recorded for more than 150 days in all implants (n=3), maximum time from implant to recording 309 days |
| Revision and explant experience | Seven of 8 probes in recoverable hardware were recovered in working condition and re-implanted in new subjects |
| Adverse events | Not given for adverse events other than the failed implant and tracking discontinuity described |
| Notable demonstrations | Same-neuron tracking over weeks, recoverable chronic implants, and combining sites onto one channel to extend coverage |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | 21 mice and rats in 6 laboratories for chronic implants, plus acute head-fixed mice for ground truth. Table S1 lists implants; the 3 mice used for tracking are a subset |
| Follow-up duration | At least 8 weeks for most implants; one laboratory more than 150 days |
| Indications | Preclinical neuroscience recording, not a clinical indication |
| Trials and registries | Animal ethics approvals per laboratory; no human registry |
| Primary outcomes | Stable chronic recording, motion correction and unit tracking across days and weeks |
| Key limitations | Alpha hardware only; combined-site recording reduces yield; regions and implant methods differed by laboratory; rodents only |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Dense linear site geometry for motion correction; 384 channels per probe at about 0.19 g per probe; recoverable implants |
| Limitations | Rigid probe, wired 5 m cable, alpha noise higher than NP 1.0, only 384 of 1,280 or 5,120 sites per probe recorded at once |
| Scaling constraints | Sites exceed channels, so coverage depends on site switching or combining sites on one channel, which lowers signal-to-noise per neuron |

## References

- Steinmetz NA et al. [Neuropixels 2.0: a miniaturized high-density probe for stable, long-term brain recordings](https://www.science.org/doi/10.1126/science.abf4588). Science 2021. Full text: [PMC8244810](https://pmc.ncbi.nlm.nih.gov/articles/PMC8244810/).
- [UCL-hosted manuscript PDF](https://discovery.ucl.ac.uk/id/eprint/10122912/1/Steinmetz%20et%20al%20-%20Science%202021%20in%20press.pdf).

Related: [motion-corrected chronic rodent study](/applications/89-neuropixels-20-chronic-tracking-2021/); compare [Neuropixels 1.0](/devices/04-neuropixels-probe/).

No full 3D model is supplied. The paper grounds shank, site and taper dimensions, but first-site origin, base-to-shank joins, reference geometry and package construction need separate reconstruction. The 1.0 model is not relabeled as 2.0.
