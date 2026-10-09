---
title: "NeuroXess 256-channel flexible ECoG BCI"
order: 179
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-STUP-0006"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-08
description: "NeuroXess's 256-channel flexible cortical-surface array used for real-time motor and Mandarin speech decoding at Huashan Hospital. Reported in temporarily implanted epilepsy and tumor patients; some figures are company announcements."
modality: "Cortical surface"
website: "https://en.neuroxess.com/news/major-breakthrough/"
tags: ["NeuroXess", "flexible ECoG", "speech decoding", "Mandarin", "China", "investigational", "human"]
draft: false
---

# NeuroXess 256-channel flexible ECoG BCI

NeuroXess has described a 256-channel flexible cortical array that decoded motor intent and Mandarin speech in patients who were implanted for clinical epilepsy or tumor work. The hardware details here come from the Science Advances paper; accuracy claims beyond the paper come from the company. A secondary source called the array penetrating; the paper and Chinese state reporting describe a surface ECoG grid under the dura. This sheet covers the earlier wired research array. NeuroXess's fully implanted wireless Triple-F system, now in registration trials, has [its own sheet](/devices/180-neuroxess-triple-f-fully-implanted-subdural-bci/).

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | NeuroXess 256-channel high-density flexible ECoG array with a skull-fixed headstage, used with the XessOS decoding software [1][2][3] |
| Manufacturer | Shanghai NeuroXess Technology Co., Ltd. (脑虎科技), founder Tiger H. Tao [1][4] |
| Interface class | Flexible cortical-surface (ECoG) array; the peer-reviewed paper calls it a 256-channel microelectrocorticographic BCI [2]. Chinese reporting from Jiefang Daily places the 256-channel electrode on the cortical surface under the dura (subdural) and not penetrating the brain [6] |
| Origin | Company device with Huashan Hospital, Fudan University, supported by the Tianqiao and Chrissy Chen Institute and Shanghai and national grants [1][2] |
| First demonstrated | August 2024: real-time motor decoding in a 21-year-old epilepsy patient at Huashan Hospital (company announcement) [1] |
| First human implant | August 2024 per NeuroXess's January 2025 announcement. Secondary coverage dates a company disclosure to April 17, 2025; the company's own announcement dates the implant earlier, so that date is used [1]. A Chinese-language release in April 2025 describes a third patient, 19 years old with right frontal lobe epilepsy, who used the 256-channel array for cursor control [7] |
| Species studied | Human; NeuroXess also sells flexible depth electrodes for animal research, with single-unit recording in mice reported up to 10 months (company claim) [1][5] |
| Regulatory status | Investigational; implanted in epilepsy patients undergoing clinical seizure or lesion monitoring under hospital IRB approval. No market approval found [1][2]. NeuroXess's later fully implanted wireless system is a different product in registration trials; see [its own sheet](/devices/180-neuroxess-triple-f-fully-implanted-subdural-bci/) |
| Function | Record high-gamma cortical activity (70 to 150 Hz) and decode motor intent and Mandarin syllables in real time [1][2] |
| Target tissue | Cortical surface; in the Mandarin study the array covered the middle and superior temporal gyri, ventral sensorimotor cortex and part of the pars opercularis [2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Flexible high-density ECoG grid on the cortical surface, headstage fixed to the skull [2] |
| Array layout | 256 electrodes; layout beyond count and pitch unreported [2] |
| Electrode count | 256 channels [1][2] |
| Pitch | 3 mm center to center [2] |
| Electrode lengths |  |
| Shank width and thickness |  |
| Tip and exposed site geometry | Each recording contact 1.3 mm in diameter [2] |
| Contact coating |  |
| Insulation |  |
| Insertion method | Placed on the cortical surface during surgery, in the cases reported as part of epilepsy localization [2] |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR | The paper reports generally high SNR with minimal drift across days and no significant new bad channels over 11 days; no numeric SNR extracted [2] |
| Recording modality | Cortical surface potentials; features taken from the high-gamma band (70 to 150 Hz) [1][2] |
| Sampling rate | 15 kHz raw, downsampled to 400 Hz for offline processing [2] |
| Stimulation capability |  |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Cortical surface, over temporal and ventral sensorimotor regions in the Mandarin study [2] |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes | Not reported in the sources read; the array performed reliably over 11 days of monitoring [2] |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics |  |
| Data path | Headstage fixed to the skull; the downstream link to the acquisition system is not described in the sections read, and wireless fully implanted operation is not described for this array [2]. Jiefang Daily (January 2025) says the array was wired at that time, with a thin metal braid, and that a semi-implanted wireless version was planned around Chinese New Year 2025 and a fully implanted wireless version for the second half of 2025 [6] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power |  |
| Thermal management |  |
| Packaging and hermeticity |  |
| MRI compatibility |  |
| Surgical complexity | Craniotomy placement of a surface grid as part of epilepsy monitoring; electrode placement guided by clinical need [2] |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Over 11 days of monitoring about 9 hours of data were collected; no new bad channels emerged [2] |
| Chronic yield |  |
| Stability over time |  |
| Longevity | 11 days of intracranial monitoring in the Mandarin paper; chronic duration unreported [2] |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Peer-reviewed: median offline accuracy of 71.2% over 394 Mandarin syllables in a single-character reading task (Science Advances 2025). Company announcement: 71.2% accuracy across 142 common syllables within five days, decoding latency under 100 ms per character, and motor decoding with system latency under 60 ms [1][2]. Timing conflict: the company's English announcement says the 142-syllable result came within five days [1]; Jiefang Daily says 142 syllables at about 71 percent 7 days after surgery [6]. Chinese release for the 19-year-old patient: 4.07 bits per second cursor control after 19.87 hours of training, from local field potentials with a position-velocity Kalman filter [7] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | One 21-year-old epilepsy patient with a motor-cortex lesion (motor decoding) and one epilepsy patient with a language-cortex tumor (December 2024), per the company; the Science Advances paper reports one 43-year-old woman [1][2]. Chinese-language reports add a third case: a 19-year-old with right frontal lobe epilepsy, 256-channel, April 2025 [7]. Jiefang Daily describes the first two as a 21-year-old with a motor-area lesion in August 2024 and a tumor-epilepsy patient with a language-area lesion in December 2024 [6] |
| Preclinical cohort |  |
| Follow-up duration | Days to about two weeks of in-hospital monitoring in the reported cases [1][2] |
| Indications | Motor, language and visual function restoration are listed as company goals; reported cases were epilepsy and tumor patients [1][5] |
| Trials and registries | Huashan Hospital IRB approval KY2024-842 for the paper; no registry identifier found [2]. Jiefang Daily put the fastest path to clinical use at about three years from January 2025 [6] |
| Primary outcomes | Syllable and sentence decoding accuracy and latency; see Notable demonstrations [1][2] |
| Key limitations | Reported patients were temporarily implanted for clinical epilepsy or tumor care, not paralyzed users with a chronic implant. Few subjects. Company announcements are not peer reviewed [1][2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | High channel count of 256 over a 3 mm grid allowed fast functional mapping and decoding of both motor and Mandarin speech in days [1][2] |
| Limitations | Surface potentials have lower spatial resolution than penetrating arrays; reported use was short-term [2] |
| Scaling constraints |  |

## Version boundary

The 256-channel array in the January 2025 announcement and the Science Advances paper. NeuroXess's separate animal-research depth electrodes (4 um thick) are not this device.

## References

1. [NeuroXess, Major Breakthrough in Clinical Trials of High-Throughput Implantable Flexible BCI, January 2, 2025](https://en.neuroxess.com/news/major-breakthrough/).
2. [Real-time decoding of full-spectrum Chinese using brain-computer interface, Science Advances](https://www.science.org/doi/10.1126/sciadv.adz9968).
3. [NeuroXess clinical trials page](https://en.neuroxess.com/clinical-medicine/).
4. [NeuroXess data sheets](https://en.neuroxess.com/product-description/).
5. [NeuroXess multiple-region flexible electrodes (research products)](https://en.neuroxess.com/research-product/duonaoqurouxingdianji/).
6. Shanghai Municipal Government, from Jiefang Daily (Chinese). [Flexible BCI decodes Chinese speech, 5 January 2025](https://www.shanghai.gov.cn/nw4411/20250105/ed3f7f31ad1f4671a6cff5cc5b07a1b7.html).
7. Sina Finance (Chinese). [NeuroXess third patient release, 17 April 2025](https://finance.sina.com.cn/roll/2025-04-17/doc-inetmzcx9219142.shtml).
