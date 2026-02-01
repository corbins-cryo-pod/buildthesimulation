---
title: "06 — Decoding & closed-loop control (from toy problems to reality)"
order: 6
description: "Decoding basics, nonstationarity, and what closed-loop systems require in practice."
tags: ["decoding", "control", "closed-loop", "ml"]
draft: true
---

> **Reader promise:** You’ll be able to design decoding experiments that survive contact with reality (drift, artifacts, user adaptation) and know what to measure.

## TL;DR

- Decoding is easier than *deployment*.
- Closed-loop performance depends on latency, adaptation, and robust feedback.
- You need metrics that capture stability, not just best-case accuracy.

## Definitions

- **Decoder:** Mapping from neural features → control signals.
- **Closed-loop:** Output affects the next inputs (user and system co-adapt).
- **Calibration:** Collecting labeled data to fit or update the decoder.

## Outline

### 1) The decoding stack
- Features → model → control signal

### 2) Nonstationarity and drift
- What changes and why

### 3) Closed-loop control basics
- Latency budget
- Feedback design

### 4) Practical evaluation
- Stability metrics
- Calibration burden

### 5) Where stimulation enters
- Co-adaptation with stimulation strategies

## References

- Add key decoding + closed-loop references.
