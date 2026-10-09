---
title: "StairMed WRS02 256-channel wireless BCI"
order: 181
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-STUP-0008"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-08
description: "StairMed's second-generation 256-channel wireless BCI, launched in December 2025 and implanted from early 2026. Specifications are sparse and come from Chinese-language company disclosures and trade reporting."
modality: "Intracortical"
website: "https://www.stairmed.com/"
tags: ["StairMed", "WRS02", "wireless", "256-channel", "China", "investigational", "human"]
draft: false
---

# StairMed WRS02 256-channel wireless BCI

WRS02 is the successor to the 64-channel WRS01 described on [the WRS sheet](/devices/178-stairmed-wrs-ultraflexible-wireless-bci/). Chinese-language sources give the channel count, launch date and a few company-reported performance figures. Nearly everything else is unreported, and the entries below say so.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | StairMed WRS02, second-generation 256-channel wireless implantable BCI system, upgraded from the 64-channel WRS01 [1, 2] |
| Manufacturer | Shanghai StairMed Technology Co., Ltd. (上海阶梯医疗科技有限公司) [1] |
| Interface class | Invasive wireless BCI; the Chinese reports call it an upgrade of the high-throughput wireless invasive WRS01 [2]. Electrode details for WRS02 are not restated in the sources read |
| Origin | StairMed, with Huashan Hospital as the clinical partner of the earlier WRS01 trials [2] |
| First demonstrated | Launched at the 2025 BCI Conference in Shanghai on December 4, 2025 [1]. A trade report of company disclosures says the 256-channel WRS02 was implanted in early 2026 and its brain-control function verified [3] |
| First human implant | Early 2026 per a secondary trade report of company disclosures [3]. As of December 18, 2025 a STAR Market Daily report said the first prospective WRS02 clinical trial was planned soon [2] |
| Species studied | Human |
| Regulatory status | Investigational. The WRS01 system is in NMPA's innovative-device special review since November 2025 [1, 3]; no source read states a separate regulatory status for WRS02. No market approval |
| Function | Records neural signals and decodes motor intent for cursor and device control; the company says it connects to more devices and offers smoother control than WRS01 [1] |
| Target tissue | Near the motor cortex per the trade report [3] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Ultra-flexible electrodes implanted through minimally invasive surgery near the motor cortex, with a wireless implant [3] |
| Array layout | Unreported |
| Electrode count | 256 channels [1, 2, 3] |
| Pitch | Unreported |
| Electrode lengths | Unreported |
| Shank width and thickness | Unreported |
| Tip and exposed site geometry | Unreported |
| Contact coating | Unreported |
| Insulation | Unreported |
| Insertion method | Minimally invasive surgery [3]; steps unreported |
| Anchoring and fixation | Unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported |
| Electrode material | Unreported |
| Impedance (with measurement frequency) | Unreported |
| Noise floor or SNR | Unreported |
| Recording modality | Single-neuron signals collected with ultra-flexible electrodes, per the trade report [3] |
| Sampling rate | Unreported |
| Stimulation capability | Unreported |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Unreported |
| Data path | Wireless implant; the system connects to Windows and iOS as input devices [3] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Unreported |
| Thermal management | Unreported |
| Packaging and hermeticity | In May 2025 StairMed said the next-generation 256-channel system would be one third smaller than the then-current implant (26 mm diameter, under 6 mm thick); the sizes of the delivered WRS02 are unreported [4] |
| MRI compatibility | Unreported |
| Surgical complexity | Unreported |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Company-disclosed information-transfer efficiency of 380 bits per minute, about 6.3 bits per second, and command latency under 50 ms [3] |
| Stability over time | Unreported |
| Longevity | Patients operated a computer for 3 to 4 hours continuously, per the company [3] |
| Revision and explant experience | Unreported |
| Adverse events | Unreported |
| Notable demonstrations | Company disclosure reported in a trade article on July 30 to August 2, 2026: several patients with high spinal cord injury work full-time through the system, including e-commerce logistics coordination and data labeling [3] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Number of WRS02 patients not stated in the sources read; the trade report says implanted in early 2026 and that several patients now use the system for work [3] |
| Preclinical cohort | Unreported |
| Follow-up duration | Unreported |
| Indications | Unreported |
| Trials and registries | No WRS02 registry entry identified. StairMed's WRS01 trials are on ClinicalTrials.gov, see the [WRS sheet](/devices/178-stairmed-wrs-ultraflexible-wireless-bci/) |
| Primary outcomes | Unreported |
| Key limitations | Little published detail. Specifications and results are company disclosures relayed by a trade site, with no peer-reviewed or regulator-held data. WRS02 may or may not share the first generation's electrodes; that is not stated |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Four times the channel count of WRS01 in a planned smaller package, per the company [1, 4] |
| Limitations | No published hardware dimensions, no registry data and few patients reported |
| Scaling constraints | Unreported |

## Version boundary

WRS02 is the 256-channel second generation. The WRS01 and the registered WRS64 are 64-channel first-generation devices. The 256-channel arrays in the Nature Communications intraoperative study are research arrays, not this implant.

## References

1. Science and Technology Daily (Chinese). [Seven BCI products launched in Shanghai, 5 December 2025](https://www.stdaily.com/web/gdxw/2025-12/05/content_443037.html).
2. STAR Market Daily via Tencent News (Chinese). [StairMed second patient and 3D control, 18 December 2025](https://news.qq.com/rain/a/20251218A008LL00).
3. Yixiu Qixie trade site (Chinese). [StairMed 256-channel BCI clinical progress, 2 August 2026](https://www.yixiuqixie.com/article/1141.html); a secondary report of company disclosures.
4. Shanghai Municipal Government, from Jiefang Daily (Chinese). [Ultra-flexible BCI trial, 11 May 2025](https://www.shanghai.gov.cn/nw4411/20250511/0f79d0d747174361bc3566946a4f7c57.html).
