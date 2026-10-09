---
title: "StairMed WRS ultra-flexible wireless BCI"
order: 178
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-STUP-0005"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-08
description: "StairMed's Wireless Recording System, a skull-mounted battery-free implant with ultra-flexible penetrating electrodes, in early human trials at Huashan Hospital in Shanghai. Implant counts and several specifications are company disclosures."
modality: "Intracortical"
website: "https://clinicaltrials.gov/study/NCT06829212"
tags: ["StairMed", "WRS", "HNE", "uFINE", "flexible electrode", "wireless", "China", "investigational", "human"]
draft: false
---

# StairMed WRS ultra-flexible wireless BCI

StairMed's WRS pairs ultra-flexible penetrating electrodes with a wireless implant. This sheet separates three kinds of source: the ClinicalTrials.gov records, the Nature Communications 2026 intraoperative paper, and company or press statements. The chronic implant's channel count is not in the registry beyond the model name WRS64, so a widely repeated 256-channel figure is shown as unconfirmed.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | StairMed Wireless Recording System (WRS): implanted signal collector WRS64, external data and energy transmitter DTC01/02, and software SW01, with ultra-flexible penetrating electrodes. The electrodes are called HNE by StairMed; the academic papers call the same family uFINE [1][2][3][4] |
| Manufacturer | Shanghai StairMed Technology Co., Ltd. (上海阶梯医疗科技有限公司), Shanghai; incorporated August 2021 per a secondary report [1][2][5] |
| Interface class | Penetrating ultra-flexible thin-film electrodes with a wireless, battery-free skull-mounted implant [1][3] |
| Origin | Company device from StairMed with the CAS Center for Excellence in Brain Science and Intelligence Technology (CEBSIT) and Huashan Hospital, Fudan University [2][5] |
| First demonstrated | Human intraoperative recordings in a Nature Communications 2026 study (16 patients); first chronic wireless implant reported March 25, 2025 [2][5][6] |
| First human implant | March 25, 2025, an amputee patient at Huashan Hospital, per StairMed as reported by MedPath (company statement) [5][6] |
| Species studied | Human (acute intraoperative and chronic wireless implant); the HNE research electrode is sold for rodents and non-human primates per the company [2][3] |
| Regulatory status | Investigational. Registered early studies are recruiting or not yet recruiting; no market approval found. Company-reported plan is about 40 patients in a registration trial from mid-2026 and launch in 2028 (secondary source, not a regulator statement) [1][5] |
| Function | Record neural activity and decode it to control a cursor and other devices in paralyzed or amputee patients [1] |
| Target tissue | Motor cortex per the investigator-initiated trial reporting; registry text does not name the cortical target [5][1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Penetrating thin-film flexible shanks inserted through a small cranial opening, with a skull-mounted wireless implant [2][3][6] |
| Array layout | uFINE research arrays: shanks with 64 recording sites each, typical 1 mm spacing between shanks, 65 um site pitch typical; one case used 90 um pitch [2] |
| Electrode count | Not stated in the registry beyond the model name WRS64. The Nature Communications intraoperative study used 128-channel arrays in its first 10 successful cases and one 256-channel, 4-shank array. A 256-channel figure for the chronic implant appears only in a secondary report and is not confirmed [1][2][5] |
| Pitch | 65 um typical site pitch along a shank in the intraoperative arrays [2] |
| Electrode lengths | Intraoperative shanks 20 mm long (35 mm for the 256-channel array) [2] |
| Shank width and thickness | Intraoperative shanks 80 to 245 um wide, tapered, and 2 um thick per the Nature Communications methods. StairMed's own implant page states electrode thickness of only 1 um. Both are listed because the sources differ and may describe different versions [2][4] |
| Tip and exposed site geometry | Unreported |
| Contact coating | Unreported |
| Insulation | Unreported; the paper describes a Ti/Ni/Au (50/800/200 nm) I/O layer but the insulating film material was not extracted [2] |
| Insertion method | Intraoperative arrays were guided by tungsten shuttle needles 75 um in diameter to 5 to 6 mm depth, then the needles were removed. StairMed reports a 3 to 5 mm cranial puncture with sensor depth of 5 to 8 mm for the implant (company statement via MedPath) [2][6] |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Unreported |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Company states ultra-low background noise and high signal-to-noise ratio without figures [4] |
| Recording modality | Single-unit action potentials and local field potentials [3][2] |
| Sampling rate | Unreported |
| Stimulation capability | Unreported |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortex, inserted 5 to 8 mm deep [2][6] |
| Insertion trauma and BBB disruption | Tungsten shuttle needles created an insertion track much larger than the shank; a small superficial pia incision was made in all patients. No histology reported [2] |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Flexible shanks followed brain pulsation; spike position drift was lower after the shuttle needle was removed than with the needle in place [2] |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Ultra-thin flexible shank mechanics, per the company and paper; no chronic tissue data in humans [2][4] |
| Typical failure modes | In the intraoperative study, 5 early cases produced no valid single-unit data, mainly from operating-room electrical noise and damaged shuttle needle tips [2] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Implant electronics paired with the flexible electrodes for single-cell resolution recording [4] |
| Data path | Wireless; implant has no visible external components, with an external data and energy transmitter (DTC01/02) [1][4] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Wireless power supply, no internal battery, integrated power and communication coil [4] |
| Thermal management | Unreported |
| Packaging and hermeticity | Titanium alloy and zirconia ceramic enclosure with a high-vacuum seal, per the company; implant about 26 mm in diameter and under 6 mm thick (company statement via MedPath) [4][6] |
| MRI compatibility | Unreported |
| Surgical complexity | Company-reported 3 to 5 mm cranial puncture [6] |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | 719 single neurons isolated from 1,302 valid channels across 11 of 16 patients, maximum 135 neurons simultaneously in one patient, recordings up to 36.5 minutes (secondary summary of the Nature Communications study) [2][7] |
| Chronic yield | Unreported |
| Stability over time | The HNE research electrode page claims stable recording of 300 days or more in animals (company claim) [3] |
| Longevity | Unreported |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Company-disclosed: after implantation an amputee patient controlled a computer and played games within 2 to 3 weeks of training; later a patient scored 6.19 bits per second on a one-minute cursor test on CCTV in July 2026, which StairMed itself described as a marketing figure and which is not task-matched to published benchmarks [5][6] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Company-disclosed 18 cumulative implants at July 20, 2026, not an audited registry figure. Registries estimate 4 (NCT06829212), 5 (NCT06944834) and 4 (NCT07647315) participants. Intraoperative study: 16 patients [1][2][5][8][9] |
| Preclinical cohort | Unreported |
| Follow-up duration | NCT06829212 primary completion February 2027, average follow-up about 7 months for the primary outcome [1] |
| Indications | Paraplegia or quadriplegia, spinal cord injury, brainstem stroke, ALS and bilateral upper-limb amputation (NCT06829212); a separate registered study targets Mandarin speech neuroprosthesis [1][9] |
| Trials and registries | NCT06829212 (RISE, recruiting, start 2025-03, completion 2027-02); NCT06944834 (motor rehabilitation, not yet recruiting, start 2025-04); NCT07647315 (Mandarin speech, recruiting, start 2026-09-01) [1][8][9] |
| Primary outcomes | NCT06829212 primary outcome is device-related adverse events; results not posted. Intraoperative single-unit yield is published [1][2] |
| Key limitations | No peer-reviewed chronic safety or performance data on the implant. Channel count, sampling rate and impedance of the chronic implant are unpublished. Many figures are company disclosures [1][2][5] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Very thin flexible shanks that move with the brain, small skull-mounted battery-free implant, and published human single-unit yield [2][4] |
| Limitations | Intraoperative arrays needed rigid tungsten shuttles; five early cases failed; chronic human data are not published [2] |
| Scaling constraints | Channel count grows by adding shanks; the paper moved from 128 to 256 channels with 4 shanks and notes further iterations are planned [2] |

## Version boundary

The registered chronic implant is the WRS64. The Nature Communications arrays (128 and 256 channels, 2 um shanks) were used intraoperatively and may differ from the implant. The 1 um electrode thickness is from StairMed's product page and the 2 um shank thickness is from the paper.

## References

1. [ClinicalTrials.gov NCT06829212, RISE](https://clinicaltrials.gov/study/NCT06829212).
2. [Large-scale single-neuron recording in the human cortex using an ultra-flexible electrode array, Nature Communications 2026](https://www.nature.com/articles/s41467-026-71443-7).
3. [StairMed, HNE ultra-flexible micro-nano electrode](https://www.stairmed.com/en/hnechaorouxingweinadianji.html).
4. [StairMed company site](https://www.stairmed.com/en/).
5. [Inside BCI, StairMed trial reaches 18 cumulative implants, July 20, 2026 (secondary source)](https://insidebci.com/news/2026-07-20-stairmed-18-patients-huashan-shanghai-penetrating-bci-trial/).
6. [MedPath, StairMed clinical milestone in amputee patient, May 14, 2025](https://trial.medpath.com/news/stairmed-achieves-clinical-milestone-with-invasive-brain-computer-interface-system-in-amputee-patient).
7. [BCIwiki summary of the Nature Communications study (secondary)](https://bciwiki.com/en/item/stairmed-reports-chinas-best-publicly-disclosed-speech-decoding/).
8. [ClinicalTrials.gov NCT06944834](https://clinicaltrials.gov/study/NCT06944834).
9. [ClinicalTrials.gov NCT07647315](https://clinicaltrials.gov/study/NCT07647315).
