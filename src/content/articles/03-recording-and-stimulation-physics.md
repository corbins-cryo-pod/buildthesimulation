---
title: "03 — Recording & stimulation physics (fields, SNR, artifacts, charge)"
order: 3
description: "The minimum physics you need to reason about electrodes, fields, artifacts, and safe stimulation."
tags: ["physics", "stimulation", "recording", "electrodes"]
draft: true
---

> **Reader promise:** You’ll be able to reason about why one electrode design beats another *for a specific goal*, and what measurements matter.

## TL;DR

- Recording and stimulation are dominated by geometry + impedance + noise + tissue interface.
- Artifact management is not “cleanup”; it is *co-design* of stimulation waveform, electrode, and measurement.
- Safety constraints are real: charge injection, heating, and electrochemistry bound what you can do.

## Definitions

- **SNR:** Signal-to-noise ratio.
- **Impedance:** Frequency-dependent opposition to current; sets noise and coupling.
- **Charge injection limit:** How much charge an electrode can deliver safely per phase.

## Outline

### 1) Electric fields in tissue (intuitive model)
- Why distance dominates
- Simple scaling laws you can keep in your head

### 2) What electrodes actually “measure”
- Extracellular potentials
- Why reference choice matters

### 3) Noise + drift
- Thermal noise, 1/f, motion, biological noise
- Practical: what to log to diagnose your system

### 4) Stimulation basics
- Current vs voltage control
- Biphasic pulses, charge balance

### 5) Artifacts and how to think about them
- Saturation, recovery, blanking
- Co-design loop

## References

- Add core electrode physics + stimulation safety references.
