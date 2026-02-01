---
title: "03 — Recording & stimulation physics (fields, SNR, artifacts, charge)"
order: 3
description: "The minimum physics you need to reason about electrodes, fields, artifacts, and safe stimulation."
tags: ["physics", "stimulation", "recording", "electrodes"]
draft: false
---

This article is the “minimum viable physics” for interfaces: enough to reason about why one design wins over another *for a specific goal*, and why so many projects fail for reasons that aren’t glamorous (geometry, impedance drift, packaging, artifacts).

The main theme is simple: **geometry dominates**. If you remember that, you can usually debug the rest.

## A usable mental model

Electrodes don’t “read neurons.” They measure **extracellular potentials** shaped by distance, conductivity, referencing, and filtering. Likewise, stimulation doesn’t “activate a neuron” directly; it creates an electric field that biases membrane potential, and you recruit whichever fibers cross threshold under that field.

In both cases, you are working in an analog, messy medium: tissue moves, impedance changes, and your electronics have limits.

## Recording: what you’re actually measuring

Extracellular voltages are often small (tens to hundreds of microvolts for many signals). That makes you sensitive to things that look like afterthoughts:

- how you reference (you always measure differences),
- how stable your contact impedance is,
- how much motion you induce in cables/leads,
- and whether your amplifier noise is small relative to your electrode noise.

A practical diagnostic habit is to keep a way to view wideband raw signals and to track impedance over time (when your hardware allows it). If you can’t measure it, you can’t improve it.

## Noise and drift (the chronic reality)

Noise is not just electronic; it is often mechanical and biological. Motion artifact can dominate when interfaces flex, slip, or experience microfractures. Drift happens when the geometry changes (micromotion), when tissue encapsulates the electrode, or when the electrode surface changes.

If you plan to do closed-loop work, you should treat drift as a design requirement, not a surprise.

## Stimulation: dosing with constraints

Stimulation is ultimately constrained by electrochemistry and heating. Engineers tend to think in terms of waveform parameters; biology forces you to think in terms of safety bounds.

<details class="def">
  <summary>Charge per phase vs charge density (why both matter)</summary>
  <div class="defBody">
    <p>
      <b>Charge per phase</b> (Q) is current × pulse width. It’s a convenient way to compare waveforms.
      <b>Charge density</b> is Q divided by electrode area and is often closer to what matters for electrode damage and irreversible electrochemistry.
    </p>
    <p>
      In practice, you care about both: Q relates to neural recruitment thresholds; charge density relates to safety bounds.
    </p>
  </div>
</details>

Current-controlled stimulation is common because it makes delivered charge more predictable across impedance changes, but it introduces a non-negotiable constraint:

<details class="def">
  <summary>Compliance voltage</summary>
  <div class="defBody">
    A current source can only push the requested current if it has enough voltage headroom to overcome the load (electrode impedance + tissue).
    If you run out of compliance, the delivered current clips, which can silently break both stimulation dose and artifact expectations.
  </div>
</details>

A safe default philosophy is charge-balanced biphasic pulses with conservative charge density, then iterative tuning with explicit monitoring.

## Artifacts: co-design, not cleanup

If you stimulate and record, artifacts will often be larger than your signals by orders of magnitude. Pretending you can “filter it out later” is how you end up with blind windows that break control loops.

Artifact mitigation usually requires co-design across:

- waveform (pulse width, amplitude, multipolar patterns),
- electrode geometry and placement,
- front-end input range and recovery behavior,
- synchronized blanking and timing,
- grounding/shielding/reference strategy.

## Peripheral nerve vs cortex: same physics, different operating regime

Cortex and peripheral nerve share the same core physics, but different terms dominate.

In cortex, micromotion and foreign body response often dominate chronic unit yield and stability. In peripheral nerve, anatomy and biomechanics (fascicles, connective tissue layers, glide/stretch/compression) often dominate selectivity and long-term reliability. The consequence is that “clever decoding” cannot rescue a fragile mechanical design in either location.

## References (starter)

- Overview + pointers: https://en.wikipedia.org/wiki/Extracellular_recording
- D. R. Merrill, M. Bikson, J. G. R. Jefferys (2005). *Electrical stimulation of excitable tissue: design of efficacious and safe protocols.* Journal of Neuroscience Methods. https://www.sciencedirect.com/science/article/pii/S0165027005002536
- S. F. Cogan (2008). *Neural stimulation and recording electrodes.* Annual Review of Biomedical Engineering. https://www.annualreviews.org/doi/10.1146/annurev.bioeng.10.061807.160518
