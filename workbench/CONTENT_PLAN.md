# Content Plan (Draft)

## News (weekly)
**Cadence:** weekly

**Medium-format template**
- **Headline (1–2 sentences):** what happened + why it matters.
- **Links (3–8 items):** each with 1–3 sentences of commentary.
- **Deep take (1–3 paragraphs):** pick the most important item and unpack it.
- **What I’m watching next week (2–4 bullets)**

**Tag taxonomy (starter)**
- modality: `electrical`, `optogenetics`, `ultrasound`, `chemical`
- target: `peripheral-nerve`, `cortex`, `spinal`
- topic: `interfaces`, `materials`, `implantation`, `decoding`, `stimulation`, `regeneration`
- org-type: `startup`, `paper`, `regulatory`, `open-source`

## Articles (sequenced curriculum)
Goal: **existing tech & fundamentals first**, then **future-facing biohybrid + peripheral regenerative interfaces**, then **simulation-backed design thinking**.

### Phase 1 — Fundamentals + existing tech
1. **Neuroscience background** (signals, excitability, constraints across PN vs cortex)
2. **History of BCIs** (milestones, what worked, what didn’t, why)
3. **Recording & stimulation physics (v1)** (fields, SNR, artifacts, charge injection basics)
4. **Peripheral nerve interfaces (survey)** (cuff, FINE, TIME, intrafascicular, regenerative concepts)
5. **Cortical interfaces (survey)** (ECoG, Utah-like, SEEG, limitations and failure modes)
6. **Decoding & closed-loop control (practical)** (toy problems → real constraints)

### Phase 2 — Materials, mechanics, and biology of chronic implants
7. **Biomaterials primer for interfaces** (polymers, metals, coatings, hydrogels)
8. **Mechanics + micromotion** (why implants fail; design for compliance)
9. **Foreign body response & encapsulation** (models; how to measure success)
10. **Regeneration + guidance** (scaffolds, conduits, signaling; what’s plausible)

### Phase 3 — Biohybrid peripheral regenerative nerve interfaces (your direction)
11. **Biohybrid interface concepts** (living electrodes, engineered tissues, conductive scaffolds)
12. **Novel implantation strategies** (complex geometry, multi-site, minimally invasive constraints)
13. **Stimulation modalities** (electrical vs optical; what each buys you)
14. **Manufacturing / microfabrication reality check** (processes, tolerances, packaging)

### Phase 4 — Simulation-led design
15. **What to simulate (and what not to)** (model fidelity vs utility)
16. **2D nerve cross-section sandbox** (electrodes, fields, constraints)
17. **Extending to cortex** (layers, columnar structure, vasculature constraints)
18. **Optimization loops** (parameter search; stimulation strategy design)

## Simulation (product roadmap)
**v0 (fast):** 2D cross-section viewer + electrode overlay + export/import settings.

**v1 (credible):** simple field model + stimulation constraints + basic metrics (coverage, selectivity proxy).

**v2 (bio-mech):** tissue deformation / implant mechanics (even simplified) + injury/strain heuristics.

**v3 (multi-modal):** optogenetics channel + light propagation approximations.

---
If you want, we can convert this plan into GitHub Issues with milestones.
