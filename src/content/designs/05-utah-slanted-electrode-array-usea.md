---
title: "Utah Slanted Electrode Array (USEA)"
order: 5
pubDate: 2026-02-03
updatedDate: 2026-02-03
device_id: "BTSD-0005"
interface_class: "pni"
status: "human"
last_updated: 2026-02-03
description: "A penetrating intrafascicular peripheral-nerve array with 100 slanted silicon shanks for high selectivity; enables bi-directional recording/stimulation in human amputees, but with chronic tissue response and percutaneous burden."
modality: "Peripheral nerve"
successRank: 7
tags: ["BCI", "PNI", "intrafascicular", "USEA", "stimulation", "recording", "prosthetics", "sensory feedback", "peripheral nerve", "bidirectional", "regenerative", "array", "microelectrode"]
draft: false
---

# Utah Slanted Electrode Array (USEA)

> *One-line verdict:* A penetrating intrafascicular peripheral-nerve array that can achieve extremely high spatial selectivity in human nerves for both motor decoding and sensory feedback, but pays for it with insertion trauma, micromotion/fibrosis, and (in many deployments) percutaneous connector burden.

*Quick tags:* Recording · Stimulation · Closed-loop · Channels: 100 · Species: Human/NHP/rodent · First implanted: ~2010–2012

---

### Overview

*What it is:* A 10×10 silicon microelectrode array with *slanted* shanks of varying lengths designed to penetrate into a peripheral nerve and access signals from multiple fascicles in 3D (e.g., median/ulnar/sciatic targets in different programs).

*Why it matters:* USEA is one of the most clinically demonstrated high-selectivity intrafascicular PNIs and has been used to evoke large sets of finger-related percepts and to decode intended movements for prosthetic control in human amputees.

*Most comparable devices:* TIME, LIFE/tfLIFE, regenerative sieve electrodes, multi-contact cuffs.

---

### Spec Card Grid

### Identity
- *Device name:* Utah Slanted Electrode Array (USEA)
- *Canonical ID:* BTSD-0005
- *Inventor / key authors:* Utah neuroengineering ecosystem (slanted variant of the Utah array concept); clinical translation often associated with Clark Lab / DARPA programs
- *Org / manufacturer:* Blackrock Neurotech (commercial manufacturing for Utah-array family hardware)
- *First demonstrated (year):* ~2005 era (varies by paper)
- *First implanted (year):* ~2010–2012 (varies by program)
- *Species:* human, NHP, rodent
- *Regulatory / trial status:* human research
- *Primary use:* recording + stimulation
- *Primary target:* peripheral nerve fascicles (e.g., median/ulnar)

---

### Geometry & Architecture
- *Interface type:* peripheral nerve (intrafascicular)
- *Penetrating?:* yes
- *Form factor:* 10×10 slanted silicon shanks
- *Needle/shank count:* 100
- *Needle length (mm):* ~0.5–1.5 (slanted gradient; reported ranges vary)
- *Site spacing (µm):* 400
- *Tip geometry:* sharpened silicon
- *Insertion method:* pneumatic impactor
- *Anchoring method:* nerve tissue (mechanical stability depends on local anatomy + lead management)
- *Packaging location:* commonly percutaneous connector in classic research stacks (program-dependent)

---

### Electrode & Channel Physics
- *Channel count:* 100
- *Active sites used (vs total):* often many/all; functional yield varies by placement + chronic response
- *Electrode material:* platinum / iridium (device-family typical)
- *Site area (µm²):* ~200–400 (typical Utah-array class numbers; varies)
- *Impedance @ 1 kHz:* ~100–500 kΩ (varies)
- *Noise floor / SNR:* system-dependent
- *Recording modality:* peripheral neural signals (CAPs and other features); some work reports finer unit-like activity depending on conditions
- *Stimulation capability:* yes
- *Charge injection limit / safe stim range:* not standardized in a single public spec (material + waveform dependent)

---

### Tissue Interface & Bioresponse
- *Target tissue:* peripheral nerve fascicles
- *BBB disruption:* N/A
- *Vascular disruption risk:* moderate (nerve microvasculature + insertion trauma)
- *Micromotion sensitivity:* high (nerve motion + lead forces)
- *Gliosis / encapsulation:* fibrosis/encapsulation is a major chronic constraint
- *Axon loss (if reported):* progressive near shanks can occur over time
- *Foreign-body response mitigation:* limited by rigid silicon geometry; careful surgical technique and lead routing help
- *Typical failure mode:* fibrosis/encapsulation → signal loss, shank fracture, connector/lead issues, infection risk with percutaneous components

---

### System Architecture
- *Onboard electronics:* none (electrode only)
- *Data path:* wired
- *Connector:* commonly percutaneous pedestal (program-dependent)
- *Power:* external
- *Telemetry bandwidth:* N/A
- *Hermeticity:* system-dependent
- *MRI compatibility:* unknown/conditional (assume no unless explicitly documented)
- *Surgical complexity:* microsurgery + nerve dissection + impact insertion

---

### Performance Envelope
- *Motor decoding:* finger-/DOF-level features demonstrated in some programs (task dependent)
- *Sensory restoration:* multi-site/finger-related percept sets reported in humans
- *Selectivity:* very high (relative to cuffs; among the highest in PNIs)
- *Longevity (median / max):* months to years (variable; program-dependent)
- *Stability over time:* variable; often declines with encapsulation and micromotion
- *Revision / explant:* possible; outcomes depend on fibrosis and lead routing

---

### Clinical / Preclinical Evidence
- *Human subjects:* reported across multiple amputee studies/programs (counts vary)
- *Follow-up duration:* weeks to months in some studies; longer in others (program-dependent)
- *Indications:* prosthetic control, sensory feedback
- *Programs:* DARPA efforts have supported some clinical translation work
- *Primary outcomes:* decoded control + evoked percept sets
- *Key limitations of evidence:* heterogeneous systems and reporting; many deployments are short-to-medium term and involve percutaneous hardware

---

### Engineering Verdict

*Strengths:*
- extremely high selectivity in peripheral nerve
- supports bi-directional interfaces (recording + stimulation)
- strong human demonstration literature (relative to many PNIs)

*Limitations / failure modes:*
- penetrating rigid shanks → tissue disruption and chronic fibrosis
- percutaneous connector burden in many systems
- mechanical fragility + lead forces

*Scaling constraints:*
- nerve injury risk envelope
- wiring/connector complexity
- surgical complexity and repeatability

*What newer designs try to fix:*
- move to flexible intrafascicular thin-film designs (e.g., TIME)
- cuff-based strategies for lower risk (lower selectivity)
- regenerative scaffolds/sieves for longer-term integration

---

### References
- Wendelken S, et al. “Restoration of motor control and proprioceptive and cutaneous sensation in humans with prior upper-limb amputation via multiple Utah Slanted Electrode Arrays (USEAs) implanted in residual peripheral arm nerves.” *J NeuroEngineering Rehabil* (2017). PubMed: <https://pubmed.ncbi.nlm.nih.gov/29178940/> (DOI: 10.1186/s12984-017-0320-4)
- George JA, et al. “Intuitive neuromyoelectric control of a dexterous bionic arm using a modified Kalman filter.” *J Neurosci Methods* (2020). PubMed: <https://pubmed.ncbi.nlm.nih.gov/31711883/>
- (Add: Dhillon et al., J Neural Eng; DARPA HAPTIX program docs)
