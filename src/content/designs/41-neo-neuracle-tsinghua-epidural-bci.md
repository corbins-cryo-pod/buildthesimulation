---
title: "NEO wireless epidural BCI (Neuracle, Tsinghua)"
order: 41
pubDate: 2026-10-06
updatedDate: 2026-10-06
device_id: "BTSD-ACAD-0020"
interface_class: "ecog"
status: "human"
last_updated: 2026-10-06
description: "A battery-free epidural ECoG implant for hand function in cervical spinal cord injury, developed at Tsinghua and commercialized by Neuracle. Reported as the first implantable BCI to receive market approval, in China in 2026. China entry, secondary region."
modality: "Cortical surface"
successRank: 41
website: "https://www.tsinghua.edu.cn/en/info/1420/12707.htm"
tags: ["NEO", "Neuracle", "Tsinghua", "epidural", "ECoG", "wireless", "spinal cord injury", "China", "market approval", "human"]
draft: false
---

# NEO wireless epidural BCI (Neuracle, Tsinghua)

> *One-line verdict:* The first implantable BCI reported to clear a national market approval. It does it with epidural electrodes and no battery, not with penetrating arrays.

*Quick tags:* Recording · Epidural ECoG · Human · China (secondary region) · Approved 2026

---

### Overview

*What it is:* NEO (Neural Electronic Opportunity), an implantable wireless BCI built around epidural electrodes over the sensorimotor area. Prof. Bo Hong's team at Tsinghua proposed the minimally invasive design in 2013. Neuracle Medical Technology (Shanghai) developed the product.

*Design:* Tsinghua describes a miniaturized epidural implant 25 mm in diameter that fits in the skull and carries no battery. Power comes from an external high-frequency inductive antenna, and the epidural ECoG is sent wirelessly to a receiver attached outside the scalp. The electrodes stay outside the dura, so cortical tissue is left intact.

*Use:* A hand motor function compensation system for patients with cervical spinal cord injury. In the reported home-use case, decoded signals drove a pneumatic glove for grasping.

*Timeline:* First human implant 24 October 2023 at Xuanwu Hospital, Beijing; second 19 December 2023 at Tiantan Hospital. A multi-center confirmatory trial (NCT06990412, started 28 May 2025, completed 10 January 2026) enrolled 32 patients. Fudan University reported on 17 March 2026 that China's NMPA approved the registration, calling NEO the world's first implantable BCI Class III medical device to receive market approval.

*What to read carefully:* The 100% grasp-function improvement rate comes from the trial leads' press account, not a peer-reviewed paper that we have checked. Tsinghua says the design balances intracranial BCI performance against invasiveness; this catalog has not compared signal quality with penetrating arrays.

---

### Spec Card Grid

### Identity
- *Developers:* Tsinghua University (Bo Hong's team); Neuracle Medical Technology (Shanghai) Co., Ltd.
- *Registry:* NCT06990412, phase N/A, 32 enrolled, status completed

### Architecture
- *Implant:* skull-embedded unit, 25 mm diameter, no battery
- *Electrodes:* epidural array over the functionally localized area
- *Link:* inductive power and wireless data through the scalp to an external receiver
- *Electrode count and spacing:* not given in the sources used here

### Evidence and limits
- *Compare with:* the epidural wireless [WIMAGINE implant](/devices/07-wimagine-cea-clinatec-epidural-wireless-ecog/) from France
- *No 3D model yet:* only the 25 mm implant diameter is published in the sources used here

---

### References
- Tsinghua University. *Minimally Invasive Brain Computer Interface helps tetraplegia restore hand functions.* <https://www.tsinghua.edu.cn/en/info/1420/12707.htm>
- Fudan University. *World's First BCI for Hand Movement Approved in China.* 17 Mar 2026. <https://www.fudan.edu.cn/en/2026/0317/c1092a148424/page.htm>
- Tsinghua University (Chinese). *NEO system approved for market.* <https://www.tsinghua.edu.cn/info/1182/124902.htm>
- ClinicalTrials.gov. *NEO in patients with tetraplegia, NCT06990412.* <https://clinicaltrials.gov/study/NCT06990412>
