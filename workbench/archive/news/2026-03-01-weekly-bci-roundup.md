---
title: "Weekly BCI roundup — Week of 2026-03-01"
pubDate: 2026-03-01
description: "A shift toward real infrastructure: clinical stacks, publishable decoding results, and device platforms built for trials."
tags: ["bci", "neurotech"]
links:
  - title: "Science Corp. and Neurosoft Bioelectronics Announce BCI Ecosystem Partnership"
    url: "https://www.businesswire.com/news/home/20260220875211/en/Science-Corp.-and-Neurosoft-Bioelectronics-Announce-Novel-BCI-Ecosystem-Partnership"
    note: "A push toward shared clinical-grade BCI stacks instead of every startup rebuilding hardware and software from scratch."
  - title: "Smart Dura: a functional artificial dura for multi-modal neural recording and modulation"
    url: "https://www.nature.com/articles/s41378-026-01166-8"
    note: "Large-area transparent cortical interface integrating µECoG recording and stimulation."
  - title: "Initial experience with the Precision Neuroscience Layer 7 µECoG interface"
    url: "https://pubmed.ncbi.nlm.nih.gov/41621103/"
    note: "Intraoperative human decoding results using high-density cortical surface arrays."
draft: false
---

Theme of the week: Implantable BCIs are beginning to look less like bespoke experiments and more like clinical platforms — reusable hardware stacks, publishable decoding metrics, and device architectures designed to survive regulatory scrutiny.

## The week in links

### 1. Science Corp. and Neurosoft Bioelectronics Announce BCI Ecosystem Partnership
https://www.businesswire.com/news/home/20260220875211/en/Science-Corp.-and-Neurosoft-Bioelectronics-Announce-Novel-BCI-Ecosystem-Partnership

Science Corporation is proposing a shared infrastructure model for implantable BCIs. Their “BCI Ecosystem” aims to provide clinical-grade recording electronics, software, and data tooling that partner companies can build on instead of developing everything themselves.

The key claim: developing a full clinical BCI stack traditionally costs $75–100M, but a shared platform could enable first-in-human studies for under $5M. If that estimate holds even partially true, it could dramatically lower the barrier for new implantable interface companies.

### 2. Smart Dura: a functional artificial dura for multi-modal neural recording and modulation
https://www.nature.com/articles/s41378-026-01166-8

This paper describes a transparent artificial dura integrating a 256-channel µECoG array capable of recording and stimulation while maintaining optical access to cortex.

That combination matters. Many chronic neural interfaces force a trade-off between electrical recording and optical imaging. Smart Dura shows a path toward large-area cortical interfaces that remain compatible with optical neuroscience methods — potentially useful for both translational research and future clinical systems.

### 3. Initial experience with the Precision Neuroscience Layer 7 µECoG interface
https://pubmed.ncbi.nlm.nih.gov/41621103/

Precision Neuroscience reports intraoperative human decoding experiments using their high-density cortical surface array. In awake craniotomy patients the system demonstrated:

- ~77% accuracy for 4-word speech classification
- ~78–84% accuracy for 4-direction motor classification

These are acute recordings, not chronic implants, but they provide something the field increasingly needs: publishable human decoding metrics using clinically compatible hardware.

## Deep take

The interesting shift this week is not a single breakthrough device. It’s the emergence of platform thinking in implantable BCI development.

Historically, every neurotech startup built its own complete stack: electrodes, electronics, software, surgical workflow, and decoding pipeline. That approach works for research but scales poorly into regulated medical devices.

Science Corp.’s ecosystem proposal suggests the industry may move toward something closer to semiconductor foundries or biotech CROs — shared infrastructure that multiple companies can build on.

The real bottleneck now isn’t recording neural signals. That problem is largely solved in acute settings. The harder problems are:

- long-term reliability
- regulatory trial design
- clinically meaningful endpoints
- scalable manufacturing

Evidence that the ecosystem approach works would look like multiple independent devices launching clinical trials using the same core infrastructure.

If that happens, implantable BCIs could move from artisanal lab systems to something closer to a true medical device industry.
