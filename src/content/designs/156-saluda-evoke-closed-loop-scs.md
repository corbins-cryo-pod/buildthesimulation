---
title: "Saluda Evoke closed-loop SCS"
order: 156
pubDate: 2026-10-08
updatedDate: 2026-10-08
device_id: "BTSD-FDA-0007"
interface_class: "scs"
status: "human"
last_updated: 2026-10-08
description: "FDA-approved closed-loop spinal cord stimulator that records ECAPs through two 12-contact leads, approved February 2022. Values come from the FDA summary of safety and effectiveness."
modality: "Other"
website: "https://www.fda.gov/medical-devices/recently-approved-devices/evoke-spinal-cord-stimulation-scs-system-p190002"
tags: ["SCS", "spinal cord stimulation", "Saluda", "Evoke", "closed loop", "ECAP", "FDA approved", "human"]
draft: false
---

# Saluda Evoke closed-loop SCS

The Saluda Evoke System records evoked compound action potentials from the spinal cord after every pulse. This sheet comes from the FDA summary for PMA P190002. Clinical result values were not read and stay Unreported.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | Saluda Medical Evoke SCS System: Closed Loop Stimulator (CLS), external closed loop stimulator, 12-contact percutaneous leads, Clinical Interface, Pocket Console and charger [1][2] |
| Manufacturer | Saluda Medical Pty Ltd, Artarmon, New South Wales, Australia [1][2] |
| Interface class | Rechargeable 25-channel SCS pulse generator that records evoked compound action potentials and runs in closed-loop or open-loop mode [2] |
| Origin | Commercial FDA-approved device, PMA P190002 [1] |
| First demonstrated | Unreported |
| First human implant | Unreported |
| Species studied | Unreported |
| Regulatory status | PMA P190002 approved February 28, 2022, with no panel recommendation. The SSED states it was approved in Europe and not yet marketed in the United States at the time of the summary [1][2] |
| Function | Measures ECAPs after every stimulation pulse and adjusts stimulation to a target ECAP in closed-loop mode, or delivers fixed output in open-loop mode [2] |
| Target tissue | Dorsal column spinal cord fibers via epidural leads [2] |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Percutaneous leads introduced through an epidural needle; ECAPs are measured on the non-stimulating contacts [2] |
| Array layout | Two 12-contact leads; 80 mm electrode span [2] |
| Electrode count | 12 electrodes per lead; the CLS connects to two leads (24 epidural electrodes) plus the case [2] |
| Pitch | 4 mm edge-to-edge spacing [2] |
| Electrode lengths | Lead length 60 or 90 cm [2] |
| Shank width and thickness | Lead diameter 1.32 mm [2] |
| Tip and exposed site geometry | Unreported |
| Contact coating | Unreported |
| Insulation | Unreported |
| Insertion method | Epidural needle with straight or bent stylets; subcutaneous tunneling to the CLS pocket [2] |
| Anchoring and fixation | Suture anchors and active anchors secure the lead to the supraspinous ligament or deep fascia [2] |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | 12.44 mm2 per electrode [2] |
| Electrode material | Platinum/iridium [2] |
| Impedance (with measurement frequency) | Lead conductor resistance under 16 ohm; measurement frequency not given. This is lead resistance, not electrode-tissue impedance [2] |
| Noise floor or SNR | Unreported |
| Recording modality | ECAPs recorded on non-stimulating contacts after each stimulation pulse; the CLS case may be used for recording only [2] |
| Sampling rate | Unreported |
| Stimulation capability | 25 channels; symmetrical rectangular biphasic or triphasic pulses; 10-1500 Hz open loop and 10-250 Hz closed loop; bipolar or multipolar paths [2] |
| Charge injection limit | Unreported |
| Reference and ground | Unreported |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Unreported |
| Insertion trauma and BBB disruption | Unreported |
| Vascular disruption risk | Unreported |
| Micromotion sensitivity | Unreported |
| Gliosis and encapsulation | Unreported |
| Neuron loss near sites | Unreported |
| Foreign-body response mitigation | Unreported |
| Typical failure modes | Unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | CLS generates stimulation and measures ECAPs; lithium-ion rechargeable battery [2] |
| Data path | Clinical Interface tablet with a Clinical System Transceiver (USB) wirelessly programs the CLS; Pocket Console for patient adjustments within clinician limits [2] |
| Telemetry bandwidth | Unreported |
| Sampling rate | Unreported |
| Power | Lithium-ion rechargeable battery charged transcutaneously by a charger; Pocket Console uses disposable batteries [2] |
| Thermal management | Unreported |
| Packaging and hermeticity | CLS hermetic helium leak limit 6.6 x 10^-8 std cc/s per acceptance criteria [2] |
| MRI compatibility | Not established in the SSED text read; the pivotal exclusion criteria excluded patients likely to need MRI or diathermy [2] |
| Surgical complexity | Percutaneous lead placement, lead extension if needed, and a CLS pocket [2] |
| Output connectors | Unreported |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | Unreported |
| Chronic yield | Unreported |
| Stability over time | Unreported |
| Longevity | Unreported |
| Revision and explant experience | Unreported |
| Adverse events | SSED lists labeled risks including infection, CSF leak, epidural hemorrhage, lead migration and loss of pain relief; study event rates are in section X.D.1, not extracted here [2] |
| Notable demonstrations | Unreported |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | Evoke pivotal study: prospective, multicenter, randomized (1:1), double-blind trial of closed-loop versus open-loop stimulation; enrollment count not extracted here [2] |
| Preclinical cohort | 27 sheep in an acute study of dorsal column neurophysiology and evoked-potential recording [2] |
| Follow-up duration | Unreported |
| Indications | Aid in the management of chronic intractable pain of the trunk and/or limbs, including failed back surgery syndrome, intractable low back pain and leg pain [2] |
| Trials and registries | Evoke pivotal study per the SSED; registry ID not extracted here [2] |
| Primary outcomes | Primary objective: non-inferiority of closed-loop to open-loop SCS on trunk and limb pain; result values were not read here [2] |
| Key limitations | Efficacy numbers, enrollment and event rates sit in SSED sections not extracted for this sheet [2] |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Records ECAPs after each pulse to hold stimulation at a target neural response [2] |
| Limitations | Unreported |
| Scaling constraints | 25 channels (24 electrodes plus case) [2] |

## Version boundary

The sheet describes the CLS and lead specifications as they appear in the 2022 SSED. Later supplements, if any, were not reviewed.

## References

1. [FDA overview, Evoke SCS System, P190002](https://www.fda.gov/medical-devices/recently-approved-devices/evoke-spinal-cord-stimulation-scs-system-p190002).
2. [FDA summary of safety and effectiveness data, P190002](https://www.accessdata.fda.gov/cdrh_docs/pdf19/P190002B.pdf).
