---
title: "Paradromics Connexus (acute first-in-human recording)"
order: 9
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-IMBCI-0010"
interface_class: "intracortical"
status: "human"
last_updated: 2026-02-06
description: "Paradromics’ Connexus intracortical BCI platform, validated in a short intraoperative first-in-human recording and positioned to scale into a chronic, fully implantable communication/speech system."
modality: "Intracortical"
successRank: 15
website: "https://www.paradromics.com/news/paradromics-completes-first-in-human-recording-with-the-connexus-brain-computer-interface"
tags: ["BCI", "intracortical", "Paradromics", "Connexus", "acute", "intraoperative", "speech restoration", "cortex", "recording", "array"]
draft: false
---

# Paradromics Connexus (acute first-in-human recording)

> *One-line verdict:* A high-channel-count intracortical implant platform validated in a short intraoperative human recording, designed to scale into chronic, fully implantable speech/communication BCIs.

*Quick tags:* Recording · Intracortical · Acute intraoperative validation · Species: Human · First in-human recording: 2025

---

### Overview

*What it is:* Connexus is Paradromics’ intracortical BCI implant platform. In a first-in-human milestone, the device was temporarily implanted during an epilepsy resection surgery to verify that it can be safely implanted, record human neural signals, and be removed intact in a short intraoperative window.

*Why it matters:* This is a canonical example of the modern “acute intraoperative validation → chronic feasibility study” pathway for high-density intracortical BCIs: de-risk the mechanics of implantation/explant and basic signal acquisition before committing to chronic implants.

*Most comparable devices:* Neuralink N1 (intracortical), BrainGate Utah-array systems (intracortical), high-density surface systems (contrast).

---

### Spec Card Grid

### Identity
- *Device name:* Connexus
- *Canonical ID:* BTSD-IMBCI-0010
- *Org / manufacturer:* Paradromics (Austin, TX, USA)
- *First demonstrated (year):* 2025 (first in-human recording announced)
- *First implanted (year):* 2025 (acute intraoperative placement)
- *Species:* human (acute intraoperative)
- *Regulatory / trial status:* acute intraoperative test reported (2025); chronic feasibility efforts/IDE announcements reported subsequently
- *Primary use:* recording
- *Primary target:* cortex (case-specific; intraoperative epilepsy surgery context)

---

### Geometry & Architecture
- *Interface type:* intracortical microelectrode array (penetrating)
- *Penetrating?:* yes
- *Form factor:* “cortical module” (described publicly as smaller than a dime)
- *Array layout:* dense multi-electrode implant (exact geometry not fully specified in public sources)
- *Footprint (mm):* ~dime-scale module (reported)
- *Insertion depth (mm):* ~1–2 mm class reported in secondary sources for similar implants (treat as estimate until a primary technical source is cited)
- *Shank / lead dimensions:* not publicly standardized in a peer-reviewed technical spec
- *Site spacing (µm):* not publicly standardized
- *Tip geometry:* microelectrode tips (intracortical)
- *Insertion method:* surgical intracortical placement (intraoperative)
- *Anchoring method:* system-dependent
- *Packaging location:* marketed as a fully implantable platform at the system level (implant + leads/transceivers)

---

### Electrode & Channel Physics
- *Channel / electrode count (single implant, reported):* ~420–421 electrodes (reported across outlets)
- *Scalability (company claim):* multi-implant linking to reach higher channel counts (exact numbers vary by statement)
- *Electrode material:* platinum–iridium electrodes reported in secondary sources
- *Site area (µm²):* not disclosed
- *Impedance @ 1 kHz:* not disclosed
- *Noise floor / SNR:* not disclosed
- *Recording modality:* spikes / single-neuron activity emphasized in public reporting
- *Stimulation capability:* not described as primary in public first-in-human reporting (treat as recording-focused)
- *Charge injection limit / safe stim range:* N/A

---

### Tissue Interface & Bioresponse
- *Target tissue:* cortical gray matter
- *BBB disruption:* moderate–high (penetrating)
- *Vascular disruption risk:* moderate (implant-dependent)
- *Micromotion sensitivity:* potentially significant (general issue for intracortical arrays)
- *Gliosis / encapsulation:* expected over chronic timescales for penetrating interfaces; chronic data not yet publicly characterized for Connexus
- *Neuron loss (if reported):* not disclosed
- *Foreign-body response mitigation:* not disclosed
- *Typical failure mode:* chronic stability/yield limitations typical of intracortical interfaces; hardware/connector/lead failures; infection risk if any percutaneous elements are used (goal is full implantation)

---

### System Architecture
- *Onboard electronics:* not fully specified in first-in-human reporting
- *Data path (acute test):* intraoperative recording with external equipment implied
- *Telemetry (chronic concept):* described as a fully implantable system with implanted transceiver(s) and external link in secondary sources
- *Sampling rate:* not disclosed
- *Power:* not disclosed
- *Thermal management:* not disclosed
- *Hermeticity:* not disclosed
- *MRI compatibility:* unknown/conditional
- *Surgical complexity:* intracortical placement during open cranial surgery
- *Implant/removal time (reported):* removed intact in <20 minutes (press release)

---

### Performance Envelope
- *Typical yield (acute):* not disclosed quantitatively
- *Typical yield (chronic):* not yet publicly reported (as of this entry)
- *Stability over time:* not yet publicly reported (as of this entry)
- *Longevity (median / max):* not yet publicly reported (as of this entry)
- *Revision / explant:* acute explant demonstrated; chronic revision experience not yet publicly detailed
- *Adverse events (high-level):* acute procedure reported as successful; chronic safety outcomes not yet publicly detailed
- *Notable demos / tasks:* acute human neural recording during epilepsy surgery

---

### Clinical / Preclinical Evidence
- *First-in-human context:* temporary implant during epilepsy surgery; device implanted, recorded, and removed intact within minutes
- *N implanted subjects:* at least one reported for acute test
- *Follow-up duration:* acute only (minutes)
- *Indications (intended, chronic program):* severe motor impairment / speech restoration (reported)
- *Trial registry links:* not pinned here (ID not confirmed in-session)
- *Primary outcomes (acute):* surgical feasibility, ability to record human neural signals, intact explant
- *Key limitations of evidence:* acute-only public evidence; chronic performance and long-term safety require peer-reviewed and/or registry documentation

---

### Engineering Verdict

*Strengths:*
- high electrode count per implant (reported ~420–421)
- demonstrated rapid implant + intact explant intraoperatively
- clear translational pathway toward chronic, fully implantable communication systems

*Limitations / failure modes:*
- acute-only human data disclosed so far; chronic stability/yield not yet published
- detailed technical specs (geometry, impedances, yields) not yet available in a single primary technical paper

---

### References
- Paradromics (press release). *Paradromics Completes First-In-Human Recording with the Connexus® Brain-Computer Interface.* <https://www.paradromics.com/news/paradromics-completes-first-in-human-recording-with-the-connexus-brain-computer-interface>
- UPI. *Paradromics implants brain-computer interface into first human patient.* (June 2, 2025). <https://www.upi.com/Health_News/2025/06/02/paradromics-brain-computer-interface-implanted-human/4661748897835/>
- New Atlas. *Speech-restoring brain chip gets FDA approval for human trial.* (Nov 2025; summarizes IDE/Connect-One claims). <https://newatlas.com/medical-devices/human-trial-experimental-brain-chip-connexus/>
