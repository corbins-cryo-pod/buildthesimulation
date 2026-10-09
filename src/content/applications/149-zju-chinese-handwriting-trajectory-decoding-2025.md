---
title: "Zhejiang University: Chinese handwriting trajectory decoding from motor cortex, 2025"
order: 149
pubDate: 2026-10-09
updatedDate: 2026-10-09
application_id: "BTSD-APP-0056"
interface_class: "intracortical"
status: "human"
last_updated: 2026-10-09
description: "One participant with C4 spinal cord injury, two Utah arrays in left hand-area motor cortex, attempted writing of 180 Chinese characters decoded with an LSTM and a DILATE loss. 81.7% template recognition on 180 characters; 91.1% on a 1,000-character set after six sessions were fused."
modality: "Intracortical"
website: "http://www.en.cs.zju.edu.cn/2025/1016/c55705a3092288/page.htm"
tags: ["Zhejiang University", "Utah array", "handwriting", "Chinese characters", "decoding", "human", "China", "institutional source"]
devices: ["01-utah-microelectrode-array"]
orgs: []
draft: false
---

# Zhejiang University: Chinese handwriting trajectory decoding, 2025

The State Key Laboratory of Brain-Computer Intelligence at Zhejiang University (Wang Yueming and Hao Yaoyao, co-corresponding authors; Xu Guangxiang, first author) decoded attempted handwriting of Chinese characters from intracortical signals. The study is in Advanced Science (DOI 10.1002/advs.202505492) and was a finalist for the 2025 International BCI Award. This entry rests on the university's English summary page (16 October 2025); the paper was not read.

## Participant and hardware

One participant with a C4 spinal cord injury and complete paralysis of both hands. Two [Utah arrays](/devices/01-utah-microelectrode-array/) were implanted in the hand area of left motor cortex. The participant watched handwriting animations and attempted to write 180 commonly used Chinese characters with the right hand. The page does not give the array manufacturer, implant date or channel yield.

## Decoding

Signals recorded included local field potentials, single-unit, multi-unit and entire spiking activity. An LSTM network decoded writing velocity, and trajectories were rebuilt by integration. A DILATE loss (soft dynamic time warping shape term plus a time-alignment term) replaced mean squared error to handle the timing mismatch that occurs when a paralyzed participant attempts movement.

## Results as stated

| Condition | DTW distance | Recognition |
| --- | --- | --- |
| Single day, MSE loss | 5.73 | 27.2% (general handwriting software) |
| Single day, DILATE | 5.35 | 37.2% general software; 81.7% template matching on 180 characters; 70.6% on 1,000 characters |
| Six sessions fused, DILATE | 4.35 | 52.2% general software; 91.1% template matching on 1,000 characters |

Pseudo-online tests ran at 250 Hz or faster. On a public English handwriting dataset, DILATE reached 36.47% single-trial recognition versus 22.93% for MSE.

## Limits

One participant. The recognition rates use template libraries of 180 or 1,000 characters, not free text, and the figures are the university's summary of the paper. Real-time closed-loop use was tested pseudo-online only.

## Primary sources

- [Zhejiang University College of Computer Science (English), 2025-10-16](http://www.en.cs.zju.edu.cn/2025/1016/c55705a3092288/page.htm).
- [Paper DOI: 10.1002/advs.202505492](https://doi.org/10.1002/advs.202505492).
