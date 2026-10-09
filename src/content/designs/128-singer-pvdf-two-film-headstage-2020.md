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

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Two-film PVDF/Metglas ME headstage (Demo 1) [1] |
| Manufacturer | Academic research device; Rice and UTHealth Houston [1] |
| Interface class | Head-mounted wireless stimulator connected to an implanted commercial array |
| Origin | Singer and colleagues, Neuron 2020 [1] |
| First demonstrated | 2020 [1] |
| First human implant | None |
| Species studied | Rat, hemi-Parkinsonian rotation study [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation; no recording uplink or closed loop [1] |
| Target tissue | Brain (subthalamic nucleus in the rotation study) [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Head-mounted stimulator to an implanted commercial array [1] |
| Array layout |  |
| Electrode count | Two films drive one phase each of the same output, not two channels [1] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness | Whole assembly 500 mm³, 20 mm³ power source, 500 mg (Table 1); broader film tests 28-110 µm piezo layers, 50-150 µm total films [1] |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation | Parylene-C 8-10 µm (Results) or 5-10 µm (Methods), both kept [1] |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) | Calibration load 56 kΩ in parallel with 440 pF approximating electrode-brain impedance [1] |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | 200 Hz biphasic, 400 µs phases at about 50% carrier duty; about ±1.5 V and ±100 µA from the equivalent-circuit calibration; biphasic to at least 800 Hz in saline bubble tests, monophasic about 50 Hz [1] |
| Charge injection limit | Less than 1 nC residual charge dissipating in under 2 ms in the general two-film circuit test [1] |
| Reference and ground |  |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue |  |
| Insertion trauma and BBB disruption |  |
| Vascular disruption risk |  |
| Micromotion sensitivity |  |
| Gliosis and encapsulation |  |
| Neuron loss near sites |  |
| Foreign-body response mitigation |  |
| Typical failure modes |  |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Discrete circuit with separate full-wave rectifiers per phase and isolating transistors; no ASIC [1] |
| Data path | No neural-recording uplink [1] |
| Telemetry bandwidth |  |
| Sampling rate |  |
| Power | Table 1: 100-170 kHz carrier (rotation 130/160 kHz ON, 120/170 kHz OFF), 1-2 mT AC field, 30 W required, 0.1-0.2 mW maximum in-animal; bias about 8-9 mT [1] |
| Thermal management | No measured temperature rise in one five-minute pulsed film test [1] |
| Packaging and hermeticity | 14-day 37 °C saline test of polyimide-coated films, about 20% voltage loss in agarose; chronic assembly survival unestablished [1] |
| MRI compatibility |  |
| Surgical complexity |  |
| Output connectors |  |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield |  |
| Chronic yield |  |
| Stability over time |  |
| Longevity |  |
| Revision and explant experience |  |
| Adverse events |  |
| Notable demonstrations | Hemi-Parkinsonian rat rotation control; 30 cm wire-wrapped behavioral enclosure [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Hemi-Parkinsonian rats [1] |
| Follow-up duration |  |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Wireless ME-driven rotation behavior [1] |
| Key limitations | Foreign-body response, pressure-wave effects, magnetic-imaging compatibility and wearable transmitter size open [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | 0.5 g headstage, no battery [1] |
| Limitations | Calibration by magnet distance; large wire-wrapped enclosure and 30 W drive [1] |
| Scaling constraints |  |

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

## References

1. [Singer and colleagues, Neuron 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7818389/): Table 1, Figures 3-4, fabrication/circuit/rotation methods and Discussion.
