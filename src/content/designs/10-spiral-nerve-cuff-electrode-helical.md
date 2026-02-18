---
title: "Spiral nerve cuff electrode (self-sizing / helical cuff)"
order: 10
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0001"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "A foundational, non-penetrating, self-sizing peripheral nerve cuff electrode design family (spiral/helical cuff) widely used for chronic stimulation and sometimes low-SNR recording."
modality: "Peripheral nerve"
successRank: 6
website: "https://pubmed.ncbi.nlm.nih.gov/3198136/"
tags: ["PNI", "cuff", "spiral cuff", "helical cuff", "self-sizing", "stimulation", "recording", "peripheral nerve", "bidirectional"]
draft: false
---

# Spiral nerve cuff electrode (self-sizing / helical cuff)

> *One-line verdict:* A non-penetrating, self-sizing peripheral nerve cuff design family that prioritizes safety and chronic stability over fine fascicle-level selectivity.

*Quick tags:* Recording (sometimes) · Stimulation (primary) · Channels: typically 1–8+ (variant-dependent) · Species: Human · First described: 1988

---

### How we handle “device families” in the catalog

This entry is intentionally written as a *design family / interface class* rather than a single vendor SKU. The catalog will treat:
- *Family entry (this page):* the shared mechanical/electrical ideas and canonical citations.
- *Child entries (later):* specific clinical products or notable variants (e.g., multi-contact CWRU spiral cuff variants, vendor-specific manufacturing, nerve targets, IPG ecosystems), each with their own channel count, dimensions, and evidence.

This keeps the index clean while still giving you a canonical place to link the foundational paper.

---

### Overview

*What it is:* A spiral (helical) cuff electrode is a non-penetrating peripheral nerve interface made from a self-curling insulating substrate (classically silicone) that wraps around a nerve and holds embedded metal contacts against the epineurium. The defining feature is “self-sizing,” reducing the need to suture a fixed-diameter cylinder closed and accommodating modest nerve size variation.

*Why it matters:* Spiral cuffs are a workhorse interface class because they can provide reliable stimulation (and sometimes low-SNR recordings such as CAP/LFP) over long durations with comparatively low surgical and biological risk relative to penetrating PNI designs. The original spiral cuff paper is a foundational reference for modern cuff engineering.

*Most comparable devices:* split-cylinder cuffs, FINE/C-FINE (reshaping cuffs for better selectivity), intraneural LIFE/USEA (higher selectivity, higher risk).

---

### Spec Card Grid

### Identity
- *Device name:* Spiral nerve cuff electrode (self-sizing / helical cuff)
- *Canonical ID:* BTSD-PNI-0001
- *Inventor / key authors:* Naples; Mortimer; Scheiner; Sweeney (foundational spiral cuff design)
- *Org / manufacturer:* design family (many research groups and vendors; not a single company device)
- *First demonstrated (year):* 1988
- *First implanted (year):* late 1980s–1990s era (reported; varies by application)
- *Species:* human (clinical + research usage)
- *Regulatory / trial status:* varies by application and vendor
- *Primary use:* hybrid (stimulation primary; recording sometimes)
- *Primary target:* peripheral nerves (application-dependent)

---

### Geometry & Architecture
- *Interface type:* peripheral nerve cuff
- *Penetrating?:* no
- *Form factor:* self-curling spiral/helical wrap
- *Array layout:* 1–multiple contacts distributed circumferentially and/or longitudinally (variant-dependent)
- *Footprint (mm):* typically mm-diameter cuffs with mm–cm lengths (application-dependent)
- *Insertion depth (mm):* epineurial surface (no penetration)
- *Shank / lead dimensions:* lead routing strain relief is often a dominant mechanical design consideration (variant-dependent)
- *Site spacing (µm):* not a fixed value; typically mm-scale spacing for multi-contact cuffs
- *Tip geometry:* flat contacts
- *Insertion method:* surgical exposure; wrap cuff around nerve
- *Anchoring method:* mechanical conformity + strain relief; chronic encapsulation contributes to stability
- *Packaging location:* lead routed to IPG or percutaneous connector depending on application

---

### Electrode & Channel Physics
- *Channel count:* variable (classic designs often 1–4; multi-electrode versions exist)
- *Electrode material:* commonly platinum or platinum–iridium contacts in an elastomeric substrate (variant-dependent)
- *Site area (µm²):* large relative to intraneural sites (EPNI-scale; exact varies)
- *Impedance @ 1 kHz:* typically low relative to microelectrodes (exact varies)
- *Recording modality:* CAP/LFP possible but typically low SNR; stimulation is the primary modality in most deployments
- *Stimulation capability:* yes (core use case)
- *Charge injection limit / safe stim range:* contact- and waveform-dependent; not fixed for the family

---

### Tissue Interface & Bioresponse
- *Target tissue:* epineurium-adjacent nerve trunk (non-penetrating)
- *BBB disruption:* N/A (peripheral nerve)
- *Vascular disruption risk:* low–moderate (compression risk if poorly sized/placed)
- *Micromotion sensitivity:* low relative to intraneural interfaces
- *Encapsulation:* fibrotic encapsulation occurs; often manageable but affects thresholds/selectivity
- *Typical failure mode:* lead failure, cuff migration/rotation, threshold drift due to encapsulation; infection risk if percutaneous connectors are used

---

### System Architecture
- *Onboard electronics:* none in the cuff; electronics reside in IPG or external stim/record system
- *Data path:* lead to IPG/external unit
- *Power:* IPG battery / recharge (therapy-dependent) or external research stimulator
- *MRI compatibility:* application/device-specific (treat as conditional)
- *Surgical complexity:* moderate; requires nerve exposure and careful sizing to avoid compression

---

### Performance Envelope
- *Typical yield (acute):* high for stimulation recruitment; selectivity improves with more contacts but is geometry-limited
- *Stability over time:* good in chronic implanted neuroprosthesis contexts (reported)
- *Longevity (median / max):* multi-year function reported in human neuroprosthesis cohorts (specific values depend on the implementation)
- *Notable demos / tasks:* chronic FES/neuroprosthesis stimulation; selective muscle recruitment; long-term implanted cuff performance studies

---

### Clinical / Preclinical Evidence
- *Evidence base:* foundational design paper (1988) plus chronic human follow-up literature
- *Indications / applications:* broad; later split by application (FES neuroprostheses, sensory feedback, neuromodulation)
- *Key limitations of evidence:* class-level heterogeneity (contact count, nerve target, packaging) makes cross-study comparisons difficult

---

### Engineering Verdict

*Strengths:*
- clinically mature non-penetrating safety profile
- self-sizing geometry reduces suturing/sizing burden vs fixed split-cylinder cuffs

*Limitations / failure modes:*
- limited fascicle selectivity vs intraneural approaches
- chronic compression risk if improperly sized or if tissue changes occur

*Scaling constraints:*
- selectivity increases slowly with added contacts
- mechanical complexity and lead count increase with channel count

*What newer designs try to fix:*
- better selectivity without penetration (FINE/C-FINE)
- softer/stretchable self-closing cuffs
- higher-density contact patterning with manageable lead routing

---

### References
- Naples GG, Mortimer JT, Scheiner A, Sweeney JD. *A spiral nerve cuff electrode for peripheral nerve stimulation.* IEEE Trans Biomed Eng. 1988;35(11):905–916. doi: 10.1109/10.8670. PubMed: <https://pubmed.ncbi.nlm.nih.gov/3198136/>
- Christie BP, Freeberg M, Memberg WD, et al. *Long-term stability of stimulating spiral nerve cuff electrodes on human peripheral nerves.* J Neuroeng Rehabil. 2017;14:70. doi: 10.1186/s12984-017-0285-3. PubMed: <https://pubmed.ncbi.nlm.nih.gov/28693584/> (Open access: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5504677/>)
- Polasek KH, Hoyen HA, Keith MW, Tyler DJ. *Intraoperative evaluation of the spiral nerve cuff electrode on the femoral nerve trunk.* J Neural Eng. 2009. PubMed: <https://pubmed.ncbi.nlm.nih.gov/19901448/>
