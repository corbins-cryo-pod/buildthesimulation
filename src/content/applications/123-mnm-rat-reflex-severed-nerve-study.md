---
title: "MNM: rat reflex and severed-nerve bridge, 2023"
order: 123
pubDate: 2026-10-07
updatedDate: 2026-10-07
application_id: "BTSD-APP-0041"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Six rats across distinct ME-metamaterial nerve assays, including anesthesia-suppressed reflex triggering, acute severed-nerve electronic bridging and one closed-wound animal. Trace counts and histology are not cohort sizes."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10972531/"
devices: ["122-self-rectifying-magnetoelectric-metamaterial"]
tags: ["MNM", "rat", "sciatic nerve", "reflex", "closed wound", "electronic bridge", "preclinical"]
draft: false
---

# Rat MNM experiments

The published Methods reports six rats across nerve-stimulation experiments with [self-rectifying ME material](/devices/122-self-rectifying-magnetoelectric-metamaterial/). Adult Long Evans animals were 2-5 months old. This is not six animals in every assay.

Rats A-C supplied frequency tests. Rat D supplied reflex and severed-nerve assays; rat E supplied the closed-wound test; rat F repeated reflex and severed-nerve work in supplementary videos. Trials could be repeated more than three times, but trial repetitions are not independent animals. Methods reports no sample-size calculation, randomization or blinded collection, and no excluded animals/data points.

## Anesthesia-suppressed reflex

A force sensor on the foot triggered an external magnetic driver when the anesthetized animal was pinched. A 1.5-mT, 1-ms field pulse drove the material at resonance, evoking a leg kick and EMG. This substitutes an electronic sensor-to-stimulator pathway for a reflex suppressed by anesthesia; it is not recovery of an injured sensory system or voluntary walking.

The force sensor, amplifier, microcontroller and field generator are part of the loop. Methods acknowledges occasional toe pinches without MNM voltage because of transmitter misalignment. Demonstrations at 1, 2 and 10 Hz do not establish perfect event capture.

Off-resonance and unmodified-ME controls lacked the corresponding motor response. The authors separately tested a commercial diode with a wired ME film to support the rectification mechanism.

## Acute severed-nerve bridge

A pulse generator stimulated proximal sciatic nerve with 1-mA, 1-ms pulses. A recording cuff detected that signal and triggered the external magnetic driver; the MNM then powered a distal cuff to evoke downstream muscle activity. This is an instrumented electronic bridge, not regeneration or an autonomous implanted repair.

The reported pulse-generator-to-EMG latency is 4.06 ± 0.21 ms. Figure 4's 29 traces are measurements, not 29 rats. The approximately 175-µs generator-to-MNM delay is a different latency from the complete muscle-response delay.

## Closed wound and material response

One rat supplied the closed-wound test with a p-Si/ZnO variant, two laminates in series, Parylene-C insulation and a nerve clip. EMG was measured at 1 Hz. Figure 3 shows feedback wires, suture and EMG leads; "fully implanted material" does not mean a fully untethered measurement system or a chronic implant trial.

A separate three-rat biocompatibility assay placed MNM and PDMS sham subcutaneously on opposite sides of the back. One animal was sacrificed each week, with third-week tissue showing a foreign-body response at both material sites. This does not establish a three-week operational nerve-stimulation lifetime, especially given five-day soak degradation.

## Boundary

The animals were euthanized after the acute stimulation experiments. No human outcome, long-term nerve recovery, at-home rehabilitation or chronic wireless reliability is established. The material's yield and cell assays remain hardware-development evidence, not clinical qualification.

## Primary source

- [Published primary manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC10972531/), Figures 3-4, nerve-testing Methods, reflex Methods and biocompatibility Methods.
