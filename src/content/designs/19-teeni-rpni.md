---
title: "TEENI-RPNI (tissue-engineered electronic nerve interface – regenerative peripheral nerve interface)"
order: 19
pubDate: 2026-02-06
updatedDate: 2026-02-06
device_id: "BTSD-PNI-0010"
interface_class: "pni"
status: "human"
last_updated: 2026-02-06
description: "A muscle-mediated peripheral nerve interface (RPNI) used as a biological signal amplifier: reinnervated muscle grafts generate stable, high-SNR EMG for long-term prosthetic control without chronic intraneural electrodes."
modality: "Peripheral nerve"
website: "https://pubmed.ncbi.nlm.nih.gov/37023743/"
tags: ["PNI", "RPNI", "TEENI", "biohybrid", "EMG", "amputation", "prosthetic control", "neuroma prevention", "peripheral nerve", "recording", "stimulation", "bidirectional", "regenerative"]
draft: false
---

# TEENI-RPNI (tissue-engineered electronic nerve interface – regenerative peripheral nerve interface)

> *One-line verdict:* A biological neural amplifier that converts peripheral nerve efferent activity into stable, high-SNR EMG by reinnervating a free muscle graft, enabling long-term control without chronic intraneural electrodes.

*Quick tags:* Recording (EMG) · Stimulation (not primary) · Species: Human · Status: early translation / research

---

### Overview

*What it is:* A regenerative peripheral nerve interface (RPNI) is a bio-hybrid construct where a transected peripheral nerve end is implanted into a free (devascularized) muscle graft. The graft revascularizes and becomes reinnervated, producing EMG signals that can be recorded with standard intramuscular or epimysial electrodes.

*Why it matters:* Instead of putting an electrode at the nerve (and fighting micromotion, fibrosis, and chronic stability), an RPNI uses biology to do the transduction and amplification. EMG is large-amplitude and robust relative to CAP-scale nerve recordings, making it attractive for long-term prosthetic control.

*Most comparable devices:* intraneural electrodes (LIFE/TIME/USEA) for higher selectivity but harder chronic stability; extraneural cuffs (spiral/FINE) for lower risk but lower selectivity; targeted muscle reinnervation (TMR) as another signal acquisition pathway.

---

### Spec Card Grid

### Identity
- *Device name:* TEENI-RPNI
- *Canonical ID:* BTSD-PNI-0010
- *Key lineage:* RPNI program (Cederna / Kung / Urbanchek and collaborators)
- *Org / manufacturer:* academic translational programs (construct + electrode system are program-dependent)
- *First demonstrated (year):* preclinical demonstrations in the 2010s; ongoing human translation through the 2020s
- *First implanted (year):* human RPNI surgeries reported in the 2010s–2020s (program-dependent)
- *Species:* human
- *Regulatory / trial status:* research / early translation (study-dependent)
- *Primary use:* recording (EMG for control)
- *Primary target:* transected peripheral motor nerves (amputation context)

---

### Geometry & Architecture
- *Interface type:* regenerative, muscle-mediated PNI
- *Penetrating neural tissue:* no (electrode interfaces with muscle; nerve is implanted into graft)
- *Surgical construct:* free muscle graft (size varies by target anatomy and program)
- *Electrode placement:* intramuscular or epimysial electrodes embedded in/over the graft
- *Anchoring method:* biological integration (revascularization + reinnervation) + lead strain relief
- *Mechanical compliance:* native tissue compliance (high)

---

### Electrode & Channel Physics
- *Neural transduction:* nerve action potentials → motor unit activation → EMG
- *Channel count:* 1–multiple EMG channels per RPNI (depends on electrode placement); multiple RPNIs can be implanted
- *Signal type:* EMG (high amplitude, low impedance relative to nerve microelectrodes)
- *SNR:* high in reported human work (see references)
- *Stimulation capability:* possible but not the core purpose in most RPNI control work

---

### Tissue Interface & Bioresponse
- *Target tissue for electrodes:* skeletal muscle (reinnervated)
- *Foreign-body response:* occurs primarily at electrode–muscle interface, not at a chronic nerve–electrode boundary
- *Micromotion sensitivity:* lower than intraneural electrodes (muscle is mechanically forgiving)
- *Nerve health considerations:* RPNI is also used as a strategy to mitigate neuroma formation and post-amputation pain (program-dependent)
- *Failure modes:* muscle atrophy or poor reinnervation; lead/electrode failures; infection (system-dependent)

---

### System Architecture
- *Electronics location:* external or implanted (system-dependent)
- *Data path:* EMG → amplifier → decoder → prosthetic control
- *Telemetry:* optional (system-dependent)
- *Hermeticity:* not required at the nerve interface itself; depends on any implanted electronics

---

### Performance Envelope
- *Signal stability:* multi-year-class stability reported in human participants in the literature
- *Control fidelity:* supports multi-DOF prosthetic control in published work
- *Latency:* physiologic motor-unit timescale
- *Scaling constraints:* surgical footprint (multiple grafts take space) and complexity scale with channel count

---

### Clinical / Preclinical Evidence
- *Human evidence:* implanted EMG electrodes in RPNIs used for long-term upper-extremity prosthetic control in humans (see references)
- *Key limitations:* heterogeneous implementations (graft size, electrode type, decoding pipeline) mean performance should be tied to specific studies

---

### Engineering Verdict

*Strengths:*
- avoids chronic nerve-electrode failure modes
- high-SNR signals without intraneural penetration
- biologically self-maintaining interface when reinnervation is successful

*Limitations / failure modes:*
- requires transection/amputation context for typical deployment
- bandwidth is EMG-limited (not single-unit)
- less direct for pure sensory afferent recording

---

### Simulation Hooks (for BuildTheSimulation)
- nerve firing → motor unit recruitment → EMG generation
- reinnervation fraction vs EMG amplitude and separability across multiple RPNIs
- stability vs muscle health (atrophy) and electrode placement

---

### References
- Vu PP, Vaskov AK, Lee C, et al. *Long-term upper-extremity prosthetic control using regenerative peripheral nerve interfaces and implanted EMG electrodes.* J Neural Eng. 2023;20(2):026039. doi: 10.1088/1741-2552/accb0c. PubMed: <https://pubmed.ncbi.nlm.nih.gov/37023743/>
- Frost CM, et al. *Regenerative peripheral nerve interfaces for real-time, proportional control of a neuroprosthetic hand.* J Neuroeng Rehabil. 2018;15(1):108. doi: 10.1186/s12984-018-0452-1. PubMed: <https://pubmed.ncbi.nlm.nih.gov/30458876/>
