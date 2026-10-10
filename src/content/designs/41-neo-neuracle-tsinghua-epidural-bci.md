---
title: "NEO wireless epidural BCI (Neuracle, Tsinghua)"
order: 41
pubDate: 2026-10-06
updatedDate: 2026-10-08
device_id: "BTSD-ACAD-0020"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-08
description: "A battery-free epidural ECoG implant for hand function in cervical spinal cord injury, developed at Tsinghua and commercialized by Neuracle. Reported as the first implantable BCI to receive market approval, in China in 2026. China entry, secondary region."
modality: "Cortical surface"
successRank: 41
website: "https://www.tsinghua.edu.cn/en/info/1420/12707.htm"
tags: ["NEO", "Neuracle", "Tsinghua", "epidural", "ECoG", "wireless", "spinal cord injury", "China", "market approval", "human"]
draft: false
---

# NEO wireless epidural BCI (Neuracle, Tsinghua)

NEO (Neural Electronic Opportunity) is a battery-free epidural ECoG implant for hand function after cervical spinal cord injury. Prof. Bo Hong's team at Tsinghua proposed the minimally invasive design in 2013, and Neuracle Medical Technology (Shanghai) developed the product. It was reported as the first implantable BCI to receive market approval, in China in 2026. China is a secondary region in this catalog. The 100% grasp-function improvement rate comes from the trial leads' press account, not a peer-reviewed paper checked here. Compare the epidural wireless [WIMAGINE implant](/devices/07-wimagine-cea-clinatec-epidural-wireless-ecog/) from France.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | NEO wireless epidural BCI. Registered in China as 植入式脑机接口手部运动功能代偿系统 (implantable BCI hand motor function compensation system); the company's English product name in its prospectus is NEO-ONE SCI. Approved models NEO-M and NEO-M Pro with electrode kits K1014-15, K1014-25 and K1014-35 [1, 2, 5, 6, 7, 9] |
| Manufacturer | Neuracle Medical Technology (Shanghai) Co., Ltd., with Tsinghua University (Bo Hong's team) [1, 2] |
| Interface class | Epidural ECoG, wireless, battery-free |
| Origin | Tsinghua University, design proposed in 2013; Neuracle developed the product [1] |
| First demonstrated | Minimally invasive design proposed in 2013 [1]; trial dates below |
| First human implant | October 24, 2023 at Xuanwu Hospital, Beijing; a second implant December 19, 2023 at Tiantan Hospital [1, 2] |
| Species studied | Human |
| Regulatory status | Regulator: NMPA approved the innovative-product registration (Class III), announced by NMPA in March 2026, first of its kind worldwide per NMPA; innovation special-review number CQTS2400209 [5, 6]. NMPA database record (retrieved October 9, 2026): the system is registered as 国械注准20263120537, 植入式脑机接口手部运动功能代偿系统, Class III, models NEO-M and NEO-M Pro, registrant 博睿康医疗科技（上海）有限公司, approved and effective 2026-03-13, valid to 2031-03-12; the separate electrode kit 植入式脑电电极套件 is registered as 国械注准20263120536, models K1014-15, K1014-25 and K1014-35 [13]. Intended use in the record: tetraplegia from C2 to C6 spinal cord injury (ASIA A to C), ages 18 to 60, hand grasp compensation with the pneumatic glove [13]. The record lists the electrode set as cortical electrodes, blank electrodes, electrode expander, tunneler, torque wrench, wire fixing buckle, fixing screws and electrode protective sleeve [13]. The third-party list also gave these numbers [12]. Fudan reported the approval on March 17, 2026 [2, 3]. Approved components per NMPA: BCI implant, epidural electrode kit, EEG signal transceiver, pneumatic glove device, disposable surgical kit, decoding software, test software and clinical management software [5]. Post-market follow-up of at least 2 years is required per the technical review summary [7] |
| Function | Records epidural ECoG over the sensorimotor area; decoded signals drive a pneumatic glove for grasp [1, 5]. Approved label (regulator): adults 18 to 60 years with C2 to C6 cervical spinal cord injury graded ASIA A to C, quadriplegia, diagnosed more than 1 year ago and stable for at least 6 months after standard treatment, unable to grasp, with some upper-arm function remaining [5] |
| Target tissue | Sensorimotor cortex, recorded from outside the dura [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Epidural, skull-embedded implant with electrodes outside the dura [1] |
| Array layout | Epidural array over the functionally localized area [1]; layout not published in the sources used here |
| Electrode count | 8 channels, per Neuracle's September 2026 reply to the Shanghai Stock Exchange (company statement, not a regulator figure) [11]. The NMPA review summary lists electrode kit models K1014-15, K1014-25 and K1014-35 but no contact count [7]. The June prospectus and the review summary were read for a count earlier and gave none; an 8-sensor figure in English-language press is now matched by the company filing |
| Pitch |  |
| Electrode lengths | Not applicable: epidural surface electrodes, no penetrating shafts [1] |
| Shank width and thickness | Skull-embedded implant 25 mm in diameter [1]; no electrode shaft dimensions published |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method | Minimally invasive epidural implantation, implant seated in the skull [1]. The company prospectus states only about 2 mm of deep bone grinding is needed [9]. Tsinghua reports the first patient left hospital 10 days after surgery [10] |
| Anchoring and fixation | Implant fits in the skull [1]; electrode fixation not described |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR | Input-referred noise 2 uV peak-to-peak, common-mode rejection at least 80 dB, 24-bit resolution, per the company filing [11]. The same table cites a 2019 Neuralink N1 paper at about 5.9 uV RMS and 10 bit; peak-to-peak and RMS values are not directly comparable, as the filing itself notes |
| Recording modality | Epidural ECoG. The NMPA review summary states the usable low and high frequency signals reach up to 200 Hz and can be collected epidurally; whether this is bandwidth or sampling rate is not specified [7] |
| Sampling rate | 1 kHz for the epidural ECoG channel, per the company filing [11] |
| Stimulation capability | The approved component list names no stimulation module [5]. The ChiCTR scientific title calls the trial system an acquisition and stimulation system [8], and the prospectus describes the NEO platform as bidirectional closed-loop [9]; these describe the platform or trial system, not the approved indication |
| Charge injection limit |  |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Sensorimotor cortex, epidural placement; the electrodes stay outside the dura so cortical tissue is left intact [1] |
| Insertion trauma and BBB disruption | Cortical tissue left intact because the electrodes stay outside the dura [1]; quantitative data not given |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | BCI implant plus EEG signal transceiver worn outside the scalp; details not reported [5] |
| Data path | Wireless link through the scalp between the skull-embedded implant and the external transceiver [1, 7]; the prospectus describes wireless power and signal transmission as integrated, with no battery [9] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | No battery; near-field wireless power from the external unit, per Tsinghua and the company prospectus [1, 9, 10] |
| Thermal management |  |
| Packaging and hermeticity | Skull-embedded unit, 25 mm diameter [1]; hermeticity not described |
| MRI compatibility |  |
| Surgical complexity | Minimally invasive; epidural placement leaves the dura intact [1]. About 2 mm of bone grinding per the company prospectus [9] |
| Output connectors | Wireless; no percutaneous connector described [1] |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield | Mean decoding accuracy 87% in the confirmatory trial, 90% in the feasibility study and 83% in long-term use, per the NMPA technical review summary [7]. Tsinghua reported home-use grasp decoding above 90% in the first patients [10]. Mean device use in months 2 to 6 was 44.61 hours per month (SD 22.43) [7] |
| Stability over time |  |
| Longevity | Design life per the review summary: implant and electrode kit 10 years, transceiver 2 years, pneumatic glove device 8 years, glove 1 year or 100,000 cycles; shelf life 3 years. These are labeled design values, not measured durability [7] |
| Revision and explant experience |  |
| Adverse events | Confirmatory trial per the NMPA review summary: any adverse event 81.25 percent and serious adverse events 6.25 percent (bacterial pneumonia, lumbar fracture), with no device-related adverse event and no device defect reported [7]. The company said at a December 2025 conference there were no device-related serious adverse events [11] |
| Notable demonstrations | Home-use case in which decoded signals drove a pneumatic glove for grasping, reported by Tsinghua [1]; first implantable BCI reported to receive market approval [2]; BCI-assisted ARAT gain +8.03 (SD 3.78) at 2 months and +9.06 (SD 3.60) at 6 months; unassisted ARAT gain in the implanted hand +5.72 at 3 months and +6.53 at 6 months [7] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Confirmatory trial: 32 subjects at 11 institutions per the NMPA review summary [7]. ClinicalTrials.gov and ChiCTR list 12 collaborating hospitals [4, 8]; the figures disagree and both are listed. Earlier feasibility study: 3 subjects with follow-up beyond 12 months per the NMPA review summary [7], while English coverage has described 4 feasibility patients; the first two implants were October 24, 2023 (Xuanwu) and December 19, 2023 (Tiantan) [1, 10]. The company reported 32 implanted patients at the December 2025 conference [11] |
| Preclinical cohort | 7 white pigs: 2 followed for 1 month and 5 for 6 months, per the NMPA review summary [7] |
| Follow-up duration | Confirmatory trial: 6 months of follow-up per the NMPA review summary [7]; ChiCTR lists the primary outcome at 3 months [8]. ClinicalTrials.gov dates: started May 28, 2025, completed January 10, 2026 [4] |
| Indications | Regulator label: hand grasp compensation in cervical spinal cord injury, ages 18 to 60, C2 to C6, ASIA A to C [5]. The ChiCTR registration lists ages 18 to 65 [8]; the approved label range is narrower |
| Trials and registries | NCT06990412 (ClinicalTrials.gov, confirmatory, 32 enrolled, completed) [4]. ChiCTR2500102814 (registered 2025-05-20, prospective, 12 hospitals, ethics approval by Huashan and Xuanwu committees on 2025-05-16, device phase listed as III, primary outcome at 3 months) [8]. Feasibility study: NCT05920174 and Shanghai device filing 沪械临备20230175 per Tsinghua [10]. Conflicts: the NMPA review says the trial began at 11 institutions, the registries list 12; the registries allow ages up to 65, the label caps at 60; a company statement dated December 2025 puts the start of the registration trial in May 2025, matching ClinicalTrials.gov [4, 11] |
| Primary outcomes | Per the NMPA technical review summary, as reposted: BCI-assisted ARAT grasp subscale response rate 100 percent at 3 and 6 months (95% CI 89.1 to 100) in the 32-subject confirmatory trial [7]. This is a regulator document summary reproduced on a news platform, not the trial paper; no peer-reviewed report was found |
| Key limitations | Single-arm design with a performance target; primary outcome data are from the regulator review summary and company statements, not a peer-reviewed paper. The review summary text was read from a repost, not from the NMPA site. The NMPA registration database page was not retrieved. Electrode count, spacing, impedance and sampling rate are unpublished |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Battery-free, intact cortical tissue, market approval reported in China [1, 2, 3] |
| Limitations | Electrode count, spacing and signal quality not reported; epidural recording versus penetrating arrays not compared in this catalog [1] |
| Scaling constraints |  |

## References

1. Tsinghua University. [Minimally Invasive Brain Computer Interface helps tetraplegia restore hand functions](https://www.tsinghua.edu.cn/en/info/1420/12707.htm).
2. Fudan University. [World's First BCI for Hand Movement Approved in China](https://www.fudan.edu.cn/en/2026/0317/c1092a148424/page.htm). 17 March 2026.
3. Tsinghua University (Chinese). [NEO system approved for market](https://www.tsinghua.edu.cn/info/1182/124902.htm).
4. ClinicalTrials.gov. [NEO in patients with tetraplegia, NCT06990412](https://clinicaltrials.gov/study/NCT06990412).
5. NMPA via Xinhua (Chinese). [首款侵入式脑机接口医疗器械获批上市](http://www.news.cn/health/20260316/51633f2682b04b168c54e976eb4330be/c.html). 16 March 2026; source line: National Medical Products Administration.
6. NMPA announcement as posted by Shanghai Medical Products Administration (Chinese). [NMPA approval notice, 13 March 2026](https://yjj.sh.gov.cn/zjyw/20260313/04985a5fbe284e9c806ff5f370cb00b2.html).
7. CMDE technical review summary, reposted on Tencent News by a community account (Chinese; a repost, not an NMPA URL). [博睿康获批三类证的植入式脑机接口审评报告公开](https://news.qq.com/rain/a/20260402A01I6300). 2 April 2026.
8. ChiCTR (Chinese Clinical Trial Registry). [ChiCTR2500102814](https://www.chictr.org.cn/showproj.html?proj=273107).
9. Neuracle prospectus, Shanghai Stock Exchange (Chinese). [PDF, 11 June 2026](https://static.sse.com.cn/stock/disclosure/announcement/c/202606/002198_20260611_0RN0.pdf).
10. Tsinghua University (Chinese). [First implants, 30 January 2024](https://www.tsinghua.edu.cn/info/1175/109595.htm).
11. Neuracle (博睿康) reply to the Shanghai Stock Exchange inquiry letter, STAR Market IPO, September 2026 (Chinese). [PDF](https://static.sse.com.cn/stock/disclosure/announcement/c/202609/002198_20260929_9IJE.pdf). It names NEO-ONE SCI (approved, epidural, 8 channels), NEO-ONE ANS (8 channels as clinical-stage subdural in one table, described elsewhere in the same document as a pipeline cortical-attached or penetrating product; both statements are in the filing) and pipeline NEO-AXIS and NEO-AURA at 8 to 128 channels.
11. Shanghai Observer / Jiefang Daily (Chinese). [Huashan director on BCI trials, 5 December 2025](https://www.shobserver.cn/wx/detail.do?id=1030636); includes company statements by Neuracle.
12. runhugemedical.com (Chinese). [NMPA March 2026 approvals list, third-party reproduction](https://www.runhugemedical.com/Index/show/catid/24/id/4637.html).
13. NMPA medical device registration database (Chinese). [datasearch.nmpa.gov.cn, 境内医疗器械（注册）](https://datasearch.nmpa.gov.cn/datasearch/home-index.html#category=ylqx), searches for 国械注准20263120537 and 国械注准20263120536, retrieved 9 October 2026 (record pages have session-bound addresses).
