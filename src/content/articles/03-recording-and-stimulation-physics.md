---
title: "03 — Recording & stimulation physics (fields, SNR, artifacts, charge)"
order: 3
description: "The minimum physics you need to reason about electrodes, fields, artifacts, and safe stimulation."
tags: ["physics", "stimulation", "recording", "electrodes"]
draft: true
---

> **Reader promise:** You’ll be able to explain what an electrode is measuring, why geometry dominates, how to reason about stimulation safety, and how to design around artifacts instead of hoping they go away.

## TL;DR

- Most practical outcomes are dominated by: **distance/geometry**, **impedance**, **noise**, and the **electrode–tissue interface**.
- Artifact handling is not “post-processing.” It’s **co-design** of waveform + electrode + amplifier + timing.
- Safety bounds are real: **charge injection**, **electrochemistry**, and **heating** constrain what you can do chronically.

## Definitions

- **SNR:** Signal-to-noise ratio.
- **Impedance:** Frequency-dependent opposition to current; shapes coupling and noise.
- **Charge per phase (Q):** current × pulse width; the key stimulation “dose” for many waveforms.
- **Charge density:** charge per phase divided by electrode area (roughly); a safety-relevant quantity.
- **Compliance voltage:** the maximum voltage a current source can apply to push the desired current through the load.

## 1) Electric fields in tissue (the mental model)

You don’t need a full FEM solver to reason about first-order behavior.

### The key idea: geometry wins

- In extracellular recording, sources decay with distance; small changes in geometry can dominate everything.
- In stimulation, your field distribution determines which fibers cross threshold.

**Practical heuristics:**
- If you’re not getting signal: first suspect **distance**, then **impedance/noise**, then everything else.
- If stimulation “hits everything”: suspect **field spread**; you need geometry, multipolar strategies, or closer placement.

## 2) What electrodes actually measure

Most neural electrodes measure **extracellular potentials**. Those are shaped by:

- where the sources are (axons vs somas)
- where your electrode is
- how you reference
- how you filter

### Why referencing matters

You’re always measuring differences. A “bad” reference can turn motion and common-mode interference into fake neural signal.

**Practical lens:** record and inspect:
- raw (wideband) traces
- referenced vs unreferenced
- impedance spectra (when possible)

## 3) Noise, drift, and the messy real world

Noise sources you can’t ignore:

- **thermal/electronic noise** (amplifier + impedance)
- **1/f noise**
- **motion artifact** (micro-slip, strain, triboelectric effects in cables)
- **biological background** (muscle EMG, local fields)

Drift/nonstationarity comes from:
- tissue remodeling (encapsulation, inflammation)
- electrode movement or micromotion
- changes in contact impedance

**Practical lens (what to log):**
- impedance over time
- noise floor (RMS) in band
- artifact statistics (e.g., stimulation-triggered saturation frequency)
- temperature / duty cycle (for implants)

## 4) Stimulation basics (how engineers get burned)

### Current-controlled vs voltage-controlled

- **Current control** is common because it makes delivered charge more predictable across impedance changes.
- But current control demands enough **compliance voltage**; otherwise you clip.

### Waveforms and charge balance

- Biphasic, charge-balanced pulses are the default starting point.
- Real electrodes aren’t ideal capacitors; polarization and Faradaic reactions matter.

**Practical lens:** treat stimulation like dosing:
- pick a target effect
- define hard safety bounds
- ramp carefully
- monitor artifacts and tissue response

## 5) Artifacts: the co-design loop

Stimulation artifacts can saturate amplifiers and create blind windows.

Typical causes:
- electrode polarization
- amplifier recovery time
- inadequate blanking/sync
- common-mode coupling

Mitigation strategies:
- waveform shaping (shorter pulses, multipolar patterns)
- better referencing and shielding
- synchronized blanking
- front-end design choices (input range, recovery behavior)

**Practical lens:** if your system is “stimulation + recording,” you need an explicit artifact budget:
- how long are you blind after each pulse?
- does that break your control loop?

## 6) Where this connects to peripheral nerve vs cortex

Peripheral nerve vs cortex changes the dominant terms:

- **Nerve:** motion + geometry + fascicular organization → selectivity and stability are constrained by biomechanics.
- **Cortex:** micromotion + tissue response → stability and unit yield dominate.

Same physics, different operating regime.

## References

Inline links will be added as we build the reading list:

- Electrode–tissue interface and stimulation safety reviews
- Classic charge injection and polarization literature
- Practical amplifier/recording system references
