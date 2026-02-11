---
title: "02 — A brief history of BCIs (what worked, what didn’t, why)"
order: 2
description: "Milestones across invasive/noninvasive approaches, decoding paradigms, and the recurring bottlenecks."
tags: ["history", "bci", "interfaces", "decoding"]
draft: false
---

BCIs have improved for the same reason most engineering systems improve: *better sensors*, *better tasks*, and *better models* arrived at the same time. What didn’t automatically improve was everything that turns a lab demo into a day-to-day tool: chronic stability, packaging, surgical workflow, and how much time the user must spend calibrating and babysitting the system.

If you want one organizing idea for the field, it’s this: the bottleneck moves. When you solve one layer of the stack, another becomes dominant.

<details class="def">
  <summary>Translation gap</summary>
  <div class="defBody">
    The translation gap is the distance between a compelling lab demo and a usable real-world product. It’s usually dominated by
    chronic stability, calibration time, packaging failures, surgical workflow, and whether the user gets reliable value on an average day.
  </div>
</details>

### A useful decomposition: the BCI stack

Most BCIs can be decomposed into five interacting layers:

*Biology → interface → electronics → algorithms → user/task.*

History is mostly the story of which layer dominated the failure mode in a given era.

### Early feasibility: yes, neural signals can be volitionally controlled

Classic experiments showed that neural activity could be shaped by feedback and reinforcement, which mattered for two reasons. First, it proved that brain signals are not just passive readouts; they can be *trained*. Second, it foreshadowed a theme that still matters: the user and the algorithm co-adapt.

In the early invasive decoding era, results were strong in controlled settings, but translation was slow because stability, connectors, and calibration were not “details”—they were the product.

### EEG/ECoG: the usability trade

Noninvasive (and less invasive) approaches intentionally accept reduced spatial specificity and bandwidth in exchange for easier deployment. For many applications, usability is a performance multiplier: a worse signal that is stable and easy can beat a better signal that is fragile.

What historically worked best were paradigms that tolerate low bandwidth, have robust feedback, and can be learned reliably.

### Modern era: scale + ML + better implants (and the same old walls)

The last decade improved tooling: higher channel counts, better electronics, wireless systems, and better machine learning infrastructure. But the dominant constraints often remain mechanical and biological: tissue response, micromotion, packaging, and the realities of human time.

A useful anti-hype question is: *are we increasing stable information rate, or just increasing channel count?* Those are not the same.

### The recurring bottlenecks (a checklist)

When evaluating a new claim, you can usually predict its fate by walking through these constraints:

- *Signal quality:* what’s the real SNR and artifact environment outside a demo?
- *Stability:* what happens over weeks to months (and across daily context changes)?
- *Safety:* what failure modes can harm the user?
- *Calibration burden:* minutes/day? who does it? how fragile is it?
- *Packaging:* connectors, breaks, infection risk, hermetics.
- *Power/telemetry:* bandwidth, heating, charging workflow.
- *User value:* what daily function improves, and is it worth the burden?

### Where peripheral nerve + biohybrid fits (keeping the lens open)

This project is biased toward *biohybrid peripheral nerve interfaces*, but the point is to explore a wide design space.

Peripheral nerve and regenerative/biohybrid concepts may offer wins (especially for bidirectional prosthetics and closed-loop neuromodulation), but they do not remove constraints; they shift them. Compared to cortex, you inherit different anatomy and different biomechanics (glide, stretch, compression), plus different risks (pain, irritation, neuroma). Biohybrid approaches add additional biology, manufacturing, and validation complexity.

The upside is that peripheral nerve targets can sometimes be more accessible, may allow faster iteration cycles, and align naturally with sensory feedback loops. Whether that wins depends on whether chronic safety and stability are genuinely better in practice.

### What “new” should mean in 2026

For something to be meaningfully new, it should demonstrate at least one of:

- improved chronic stability at the same invasiveness,
- similar performance at lower burden,
- a step-change in usability (setup, calibration, reliability), or
- a new capability with acceptable safety (for example, stable sensory feedback).

### References (starter)

- E. E. Fetz (1969). *Operant conditioning of cortical unit activity.* Journal of Neurophysiology. https://pubmed.ncbi.nlm.nih.gov/4974291/
- A. P. Georgopoulos et al. (1986). *Neuronal population coding of movement direction.* Science. https://pubmed.ncbi.nlm.nih.gov/3749885/
- J. R. Wolpaw et al. (2002). *Brain–computer interfaces for communication and control.* Clinical Neurophysiology. https://www.sciencedirect.com/science/article/pii/S1388245702000573
- L. R. Hochberg et al. (2006). *Neuronal ensemble control of prosthetic devices by a human with tetraplegia.* Nature. https://www.nature.com/articles/nature04970
- Overview + pointers: https://en.wikipedia.org/wiki/Brain%E2%80%93computer_interface
