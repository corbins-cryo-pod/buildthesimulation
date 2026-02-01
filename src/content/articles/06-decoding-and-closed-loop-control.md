---
title: "06 — Decoding & closed-loop control (from toy problems to reality)"
order: 6
description: "Decoding basics, nonstationarity, and what closed-loop systems require in practice."
tags: ["decoding", "control", "closed-loop", "ml"]
draft: false
---

Decoding is the part of BCIs that looks like software, so it’s the part people expect to scale quickly. In practice, decoding is often the easiest piece to get working in a controlled demo and one of the hardest pieces to keep reliable in the real world.

The reason is simple: **BCIs are closed-loop systems with drifting sensors**. The brain adapts, the user adapts, the tissue interface changes, and the environment changes. A decoder that is “accurate” at noon may be mediocre by 6 p.m. if you haven’t designed for nonstationarity.

This article is a practical guide to thinking about decoders as control systems rather than classifiers.

## What a decoder is (and isn’t)

A decoder maps neural features to a control signal. In many systems the control signal might be cursor velocity, intended hand trajectory, a discrete selection, or a stimulation command.

What a decoder is not is a static model you train once and forget. In nearly every practical system, the decoder exists inside a loop that includes:

- the user’s strategy,
- the feedback channel,
- the device dynamics,
- and the stability of the neural features.

## Nonstationarity is the default

Nonstationarity can come from biology (state changes, learning), mechanics (electrode shift, motion artifact), and long-term tissue response (encapsulation, impedance changes). It is not a bug; it is the environment.

This is why “offline accuracy” is an unreliable predictor of closed-loop usability. If you want a decoder that survives reality, you need to track stability metrics, not just peak performance.

## Closed-loop design: latency, feedback, and adaptation

Closed-loop performance depends on a few variables that dominate everything else.

First, latency. If your loop is too slow, the user experiences instability and must compensate cognitively. Second, feedback. A user with good feedback can often outperform a better algorithm with poor feedback because humans are powerful adaptive controllers. Third, adaptation. The system must decide when (and how) to update the decoder without destabilizing the loop.

A useful design stance is to treat the human and decoder as a coupled adaptive system. You are not extracting a fixed “truth” from the brain; you are building a co-adaptive channel.

## Evaluation that isn’t a lie

If you care about translation, you need evaluation protocols that expose fragility:

- performance across days (not just sessions),
- calibration time required per day,
- failure modes when artifacts appear,
- performance under fatigue and distraction,
- and the user’s subjective workload.

If the system requires constant expert tuning, it’s not a product.

## Why this matters to peripheral nerve and biohybrid strategies

If you build a peripheral nerve interface that is mechanically robust but the decoding pipeline is fragile, you still lose. Conversely, if you build a brilliant decoder on top of an interface whose geometry changes unpredictably with motion, you also lose.

Biohybrid and regenerative strategies may, in the long run, improve stability by using biology to enforce geometry and coupling. But until that is proven, decoding must be designed to tolerate drift.

## Where we’re going next

Phase 2 shifts from “what is the signal?” to “what survives chronic implantation?” We’ll go deeper into biomaterials, mechanics, and the foreign body response, because those are often the real limiting factors for long-lived interfaces (cortex or nerve).

## References (starter)

- Translation challenges and practical constraints (review):
  - M. D. Murphy, D. J. Guggenmos, D. T. Bundy, R. J. Nudo (2016). *Current Challenges Facing the Translation of Brain Computer Interfaces from Preclinical Trials to Use in Human Patients.* Front Cell Neurosci. https://pubmed.ncbi.nlm.nih.gov/26778962/

- Closed-loop reorganization and adaptation perspective (review):
  - H. Ito, S. Fujiki, Y. Mori, K. Kansaku (2020). *Self-reorganization of neuronal activation patterns in the cortex under brain-machine interface and neural operant conditioning.* Neurosci Res. https://pubmed.ncbi.nlm.nih.gov/32243900/

- Overview + pointers (decoder basics): https://en.wikipedia.org/wiki/Brain%E2%80%93computer_interface
