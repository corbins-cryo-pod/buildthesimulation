---
title: "Two-film PVDF ME headstage, 2020"
order: 128
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0078"
interface_class: "dbs"
status: "preclinical"
last_updated: 2026-10-07
description: "Discrete 2020 ME stimulator uses two PVDF/Metglas films and a bias magnet for head-mounted rat STN stimulation. It is not the fully implanted PZT configuration."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/"
tags: ["magnetoelectric", "Rice", "two-film", "stimulation", "preclinical"]
draft: false
---

# Two-film PVDF ME headstage

Singer and colleagues report two discrete-component ME configurations in Neuron in 2020. This entry is the head-mounted PVDF/Metglas version used in the [hemi-Parkinsonian rotation study](/applications/130-singer-stn-parkinsonian-rat-rotation-2020/). The separate [PZT version](/devices/129-singer-pzt-fully-implanted-stimulator-2020/) is fully implanted for medial-forebrain-bundle place preference. Neither is the later single-film MagNI ASIC implant.

Primary affiliations include Rice and UTHealth Houston. The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links the later ME platforms separately.

## Hardware and magnetic drive

| Part | Reported configuration |
| --- | --- |
| ME receiver | Two PVDF/Metglas films with distinct resonances |
| Biphasic circuit | Separate full-wave rectifiers generate positive and negative pulses; transistors isolate the inactive half |
| Bias source | Permanent magnet below 0.25 g; the paper uses roughly 8-9 mT bias for its ME devices |
| Assembly | 0.5-g head-mounted stimulator connected to an implanted commercial array |
| Table 1 envelope | Demo 1: 500 mm³ whole assembly, 20 mm³ power source, 500 mg, 0.1-0.2 mW maximum reported in-animal power |
| Carrier | Table 1 gives 100-170 kHz; rotation methods specify 130/160 kHz ON and 120/170 kHz OFF |
| Stimulation | 200-Hz biphasic pulses |
| External system | Wire-wrapped 30-cm-diameter behavioral enclosure; Table 1 reports 30-W required power and 1-2 mT alternating field |

The alternating field is superimposed on a bias field, not the complete magnetic exposure. Each film drives one phase of the same stimulation output. Two films are not two independent neural channels. No neural-recording uplink or closed-loop controller is demonstrated.

## Output calibration and charge balance

Before animal testing, a 56-kΩ resistor and 440-pF capacitor in parallel approximated the electrode-brain impedance. The reported approximately ±1.5 V and ±100 µA waveforms come from this equivalent-circuit calibration, not continuous implanted telemetry. The paper describes 400-µs phases at roughly 50% carrier duty cycle, corresponding to 200 µs of overall current per phase.

The general two-film circuit test reports less than 1 nC residual charge, dissipating in less than 2 ms. Methods balance the phase amplitudes by adjusting each film's distance from the bias magnet. This is a calibrated discrete circuit, not an ASIC that automatically measures tissue impedance or guarantees balance after arbitrary movement.

## Limits retained

The films are bonded Metglas and piezoelectric layers. Results state 8-10 µm parylene-C; fabrication methods state 5-10 µm. Both ranges are retained rather than silently reconciled. The broader film experiments use 28-110 µm piezoelectric layers and 50-150 µm total films, not a complete headstage thickness specification.

Saline bubble tests at 2 V and 400 µs/phase found biphasic operation through at least 800 Hz, while monophasic operation was limited to about 50 Hz. These are electrode- and waveform-dependent electrolysis tests, not chronic brain safety certification. The two-film device's high-frequency carrier is rectified into a slower envelope: direct carrier-frequency stimulation failed to evoke spikes in the cultured HEK experiment.

The discussion reports a 14-day, 37°C saline test of polyimide-coated films, about 20% voltage loss in tissue-like agarose and no measured temperature increase in one five-minute pulsed film test. These do not establish chronic implanted assembly survival. Foreign-body response, pressure-wave effects, magnetic-imaging compatibility and wearable transmitter size remain open.

No 3D model is added. Figure 4 shows the headstage on a coin, but the 500-mm³ volume alone does not define its board outline, film placement, magnet geometry or enclosure.

## Primary source

- [Singer and colleagues, Neuron 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/): Table 1, Figures 3-4, fabrication/circuit/rotation methods and Discussion.
