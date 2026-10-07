---
title: "StimDust ultrasonic nerve stimulator,2020"
order: 111
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0070"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Published 1.7-mm³ battery-free stimulation mote, ultrasound-powered with backscatter status. Acute rat sciatic-nerve stimulation and 55-mm ex-vivo tissue link, not chronic clinical safety or neural recording."
modality: "Peripheral nerve"
website: "https://www.nature.com/articles/s41551-020-0518-9"
tags: ["StimDust", "ultrasound", "stimulation", "Berkeley", "battery-free", "peripheral nerve", "preclinical"]
draft: false
---

# StimDust

The February 19, 2020 paper reports a wireless, leadless, battery-free 1.7-mm³ stimulation mote powered by ultrasound. It combines a piezoceramic transducer, energy-storage capacitor and integrated circuit with an external ultrasonic transceiver. Its primary affiliations include UC Berkeley/UCSF bioengineering, Berkeley EECS, Boise State and Chan Zuckerberg Biohub.

This is stimulation hardware, not the earlier [neural-dust recording mote](/devices/22-neural-dust-ultrasonic-backscatter-mote/). Backscatter reports stimulation status; it is not a demonstrated extracellular neural-recording stream. The [acute rat application](/applications/112-stimdust-acute-rat-sciatic-stimulation-2020/) separates physiological tests from link benchmarks.

## Published system

Downlink timing encodes stimulation parameters on the fly rather than storing a full protocol in mote memory. The circuit harvests ultrasonic energy, decodes commands and produces current-controlled stimulation. Uplink backscatter indicates whether stimulation occurs.

The animal configuration mounts the mote with a sciatic-nerve cuff. The reported 1.7-mm³ volume is not the volume of the cuff, external transducer or a complete implanted system. This entry does not derive a rectangular envelope or electrode map from volume alone.

Figure 4's 55-mm link is through ex-vivo porcine tissue, not an in-vivo rat implant depth. Figure 5's 7.8% diagnostic-ultrasound intensity comparison is a measured test condition, not blanket authorization for chronic neural exposure.

## Version boundary

Earlier StimDust reports use 6.5-mm³ or 2.2-mm³ descriptions. Those prototype versions are not averaged into the 2020 paper's 1.7-mm³ result or treated as a source conflict over one identical device. The 2018 preprint record now links an updated manuscript; its initial date alone does not prove every displayed configuration existed in that first version.

## Reliability and stimulation limits

The published reporting summary records rare erroneous decoding in identifying changes of ultrasound state. In-vivo recruitment analyses excluded five pulses with wrong stimulation duration: one in animal C and four in animal F. Material-characterization plots omitted 26 timing-aberrant pulses among 1,076. These are separate experiments, not one universal failure rate.

The supplement's charge-balance analysis uses fitted circuit simulations as well as empirical electrode measurements. Table S2 shows that modeled peak discharge current can exceed the commanded stimulation current. Passive charge balance is not evidence of zero transient current or automatic safety as electrode area shrinks.

The updated preprint also reports tissue discoloration following an erroneously long pulse in an early animal pilot. That safety signal is attributed to the preprint; the accessible published reporting summary confirms timing errors but does not describe that injury.

No chronic implanted lifetime, hermetic-package qualification or clinical efficacy is established here. The external acoustic path, available power, orientation, cuff/electrode behavior and waveform details matter.

## Model boundary

No full model is supplied. The fetched published abstract and supplements do not supply a complete assembled CAD/contact map. An earlier preprint's dimensions are not silently promoted to a fabrication-ready published model.

## Primary sources

- [Published primary article](https://www.nature.com/articles/s41551-020-0518-9),February19,2020. Public abstract and figure titles were accessible; the main full text was not.
- [Published supplement](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-020-0518-9/MediaObjects/41551_2020_518_MOESM1_ESM.pdf),including recruitment,charge balance and controls.
- [Published reporting summary](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41551-020-0518-9/MediaObjects/41551_2020_518_MOESM2_ESM.pdf),including sample scope and exclusions.
- [Muller lab publication list](https://www.rikkymuller.com/publications),which links the paper and separate earlier StimDust report.
- [Earlier/updated preprint record](https://arxiv.org/abs/1807.07590).
