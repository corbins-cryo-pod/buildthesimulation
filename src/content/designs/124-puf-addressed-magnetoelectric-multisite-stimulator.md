---
title: "PUF-addressed ME multisite stimulator, 2021-2022"
order: 124
pubDate: 2026-10-07
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0076"
interface_class: "pni"
status: "preclinical"
last_updated: 2026-10-07
description: "Rice-led 180-nm CMOS ME stimulation configuration with eight-bit PUF addresses and a shared transmitter. Bench and Hydra multisite demonstrations stay separate from rat nerve stimulation and proposed cardiac/spinal use."
modality: "Other"
website: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9581110/"
tags: ["magnetoelectric", "PUF", "Rice", "CMOS", "multisite", "stimulation", "preclinical"]
draft: false
---

# Individually addressed ME stimulation

Yu and colleagues' IEEE Journal of Solid-State Circuits paper appeared online in December 2021, with a March 2022 issue date. It reports a shared-transmitter, individually programmable stimulation platform with physical unclonable function (PUF) IDs. Primary affiliations include Rice and Baylor.

This is the paper-specific 330-kHz, PUF-addressed configuration. The [2022 endovascular ME-BIT](/devices/113-mebit-magnetoelectric-endovascular-stimulator/) is related hardware, but its larger film, transmitter frequencies and endovascular packaging are not substituted here. The 2025 off-the-shelf spinal network is another configuration, not this ASIC.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | PUF-addressed magnetoelectric multisite stimulator, 330 kHz configuration [1] |
| Manufacturer | Academic research device; Rice and Baylor [1] |
| Interface class | Wireless battery-free stimulator with individually addressable ASIC |
| Origin | Yu and colleagues, IEEE JSSC, online December 2021, issue March 2022 [1] |
| First demonstrated | December 2021 [1] |
| First human implant | None |
| Species studied | Hydra (synchronized contractions) and acute rat sciatic [1] |
| Regulatory status | Research device; no clearance |
| Function | Stimulation; no neural-data uplink [1] |
| Target tissue | Excitable tissue; sciatic nerve in rat [1] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type |  |
| Array layout |  |
| Electrode count | Electrode count not extracted; animal-specific stereotrode not specified [1] |
| Pitch |  |
| Electrode lengths |  |
| Shank width and thickness | Implant 6.2 mm³, 30 mg; ASIC 1 × 0.8 mm (0.8 mm²); ME film 2 × 3 mm, 0.2 mm thick per table [1] |
| Tip and exposed site geometry |  |
| Contact coating |  |
| Insulation |  |
| Insertion method |  |
| Anchoring and fixation |  |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area |  |
| Electrode material |  |
| Impedance (with measurement frequency) |  |
| Noise floor or SNR |  |
| Recording modality |  |
| Sampling rate |  |
| Stimulation capability | Voltage-controlled monophasic or biphasic pulses; 4-bit amplitude 0.3 V (intro) or 0.25-3.5 V (functional measurement) and pulse width 0.15-1.2 ms; 5-bit delay to 0.8 ms; electrodes shorted after each stimulus [1] |
| Charge injection limit |  |
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
| Onboard electronics | TSMC 180 nm CMOS ASIC, off-chip storage capacitor, eight-bit CMOS PUF ID with temporal majority voting [1] |
| Data path | ASK downlink, 64 resonance cycles per bit, 5.16 kbps; PUF ID selects a device, not encryption or authentication [1] |
| Telemetry bandwidth | 5.16 kbps downlink [1] |
| Sampling rate |  |
| Power | Battery-free; about 330 kHz resonance; stimulation circuit about 90% efficient above 1.5 V (not end to end); peak transfer 1.03% at coil center under ideal alignment; 9 µW idle [1] |
| Thermal management |  |
| Packaging and hermeticity | Chronic packaging not established [1] |
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
| Notable demonstrations | Two bench implants at 15 and 25 mm individually programmed; ex-vivo 2 cm porcine tissue with reliable operation to 3.5 cm total separation (not implanted tissue); 40 mm in air; 60 mm depth is a COMSOL simulation; 50° and 40° tolerance in two planes at 30 mm for complete devices [1] |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None |
| Preclinical cohort | Hydra and acute rat sciatic; spinal cord and cardiac pacing are proposed only [1] |
| Follow-up duration |  |
| Indications |  |
| Trials and registries |  |
| Primary outcomes | Individually addressed stimulation of multiple devices from one transmitter [1] |
| Key limitations | Bit distributions and supply regulation are simulated, not a clinical reliability dataset; chronic tissue response unestablished [1] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Individual addressing from a shared transmitter, 1 mm ASIC [1] |
| Limitations | Low end-to-end efficiency; eight-bit address only [1] |
| Scaling constraints |  |

## Published components

| Part | Specification |
| --- | --- |
| Implant | 6.2 mm³; 30 mg |
| ASIC | TSMC 180-nm CMOS; 1 × 0.8-mm die, 0.8 mm² |
| ME film | 2 × 3 mm; table gives 0.2-mm thickness; approximately 330-kHz resonance |
| Power storage | Off-chip energy-storage capacitor |
| Individual address | Eight-bit CMOS PUF ID with temporal majority voting |
| Downlink | Amplitude-shift keying; 64 resonance cycles per bit, 5.16 kbps |
| Output | Voltage-controlled monophasic/biphasic pulses; electrodes shorted after each stimulus |
| Programmability | 4-bit amplitude and pulse width; 5-bit delay up to 0.8 ms |

The introductory amplitude range starts at 0.3 V, while functional measurements give 0.25-3.5 V. The introductory pulse-width range is 0.15-1.2 ms. These specifications are not replaced with the different endovascular paper's payload or pulse-width range.

## Bench performance is not implant depth

Two bench implants at 15 and 25 mm from one transmitter were individually programmed without changing the other's output. Ex-vivo tests used 2-cm porcine tissue, with additional air gap when transmitter separation exceeded 2 cm; reliable operation reached 3.5-cm total separation. That is not 3.5 cm of implanted tissue.

The paper demonstrates up to 40-mm transmitter separation in air. Its 60-mm depth is a COMSOL human-tissue/IEEE-exposure simulation, not an animal implantation result. Film-only characterization gives less than 20% voltage loss below 60° rotation, but complete-device tests at 30-mm separation tolerate 50° in one plane and 40° in the other. The abstract's 60° must not become an all-plane operating guarantee.

## Efficiency and addressing limits

The 90% figure is stimulation-circuit efficiency above 1.5 V, not end-to-end wireless power efficiency. The functional section gives a peak measured transfer efficiency of 1.03% at the coil center under ideal alignment, while comparison-table conditions list other transfer figures. The SoC's 9-µW idle consumption is separate from stimulation power.

PUF IDs select a device; the accessible paper does not turn an eight-bit address into encryption, authentication or a neural-data uplink. Simulated bit distributions and supply regulation are not a clinical reliability dataset.

## Biological evidence and open work

The [application](/applications/125-puf-me-hydra-rat-stimulation-study/) separates synchronized Hydra contractions from acute rat sciatic stimulation. Proposed spinal cord stimulation and cardiac pacing appear as target applications, not demonstrated pig/human therapies in this paper. Chronic packaging, long-term tissue response and full model geometry are not established here.

No full model is supplied. Die/film dimensions and total volume do not locate every component, contact, encapsulation boundary or animal-specific stereotrode. The [Rice University, Robinson lab](/companies/43-rice-magnetoelectric-bioelectronics-labs/) links the research groups.

## References

1. [Published primary manuscript, JSSC 2021-2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9581110/), DOI 10.1109/JSSC.2021.3129993, system/circuit sections, Figures 19-26 and Tables I-II.
