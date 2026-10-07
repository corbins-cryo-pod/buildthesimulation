---
title: "Neurograins (wireless microimplant network)"
order: 25
pubDate: 2026-10-06
updatedDate: 2026-10-07
device_id: "BTSD-ACAD-0004"
interface_class: "other"
status: "preclinical"
last_updated: 2026-10-07
description: "Distributed RF-powered neurograins: 650 × 650 × 250 µm chiplets, 1-kHz/8-bit recording, 48-node acute rat ensemble. Clear low-noise recordings came from a fraction of those channels; 770 is a projected network capacity."
modality: "Cortical surface"
successRank: 25
website: "https://doi.org/10.1038/s41928-021-00631-8"
tags: ["wireless", "distributed", "microimplant", "network", "Brown", "Nurmikko", "academic", "preclinical", "bidirectional"]
draft: false
---

# Neurograins (wireless microimplant network)

All rows follow the shared implant-device template. Measurements belong to the named configuration or experiment. Unreported means the reviewed sources do not establish a value; acute recordings, radio activation and later stimulation hardware are not treated as equivalent.

## Identity

| Field | Value and source scope |
| --- | --- |
| Device | 2021 neurograin recording network, with separate stimulation ASIC variant |
| Manufacturer | Academic research fabrication; not a commercial SKU |
| Interface class | Epicortical recording chiplets; stimulation variant may add intracortical microwires |
| Origin | Lee and colleagues; Brown, Baylor, Seoul National University, UC San Diego and Qualcomm affiliations in supplement |
| First demonstrated | 2021 Nature Electronics report; 2020 preprint precedes journal publication |
| First human implant | Unreported; rat study |
| Species studied | Anesthetized rat acute cortical experiments |
| Regulatory status | Preclinical research; RF SAR comparison is not clinical clearance |
| Function | RF-powered addressed recording or stimulation chiplets; separate circuits, not universal dual-function implants |
| Target tissue | Cortical surface for ECoG; added microwires for stimulation |

## Geometry and architecture

| Field | Value and source scope |
| --- | --- |
| Interface type | Distributed surface chips, optional post-process penetrating stimulation microwires |
| Array layout | Spatially distributed chiplets with relay coil on polyimide carrier, not one monolithic electrode array |
| Electrode count | One differential recording input between two gold electrodes per recording chip; 48-chip acute ensemble. Separate stimulation ASIC/assemblies |
| Pitch | No universal array pitch; chip placement/contact spacing not assigned from reviewed sources |
| Electrode lengths | Recording chips have no shanks; optional tungsten stimulation wire length unreported here |
| Shank width and thickness | Figure 1 chiplet 650 x 650 x 250 µm; Figure 2 stimulating ASIC 500 x 500 µm is a different scope |
| Tip and exposed site geometry | Two on-chip gold contacts; numerical pad shape/area unreported here. Microwires not reconstructed from package envelope |
| Contact coating | Gold recording electrodes; tungsten stimulation electrodes in separate variant |
| Insulation | PDMS around chips/relay-coil assembly for acute in vivo use; ALD discussion concerns separate packaging work |
| Insertion method | Cortical placement following craniotomy; separate intracortical stimulation template |
| Anchoring and fixation | Polyimide carrier and PDMS-encapsulated chips/relay coil; specific long-term fixation unreported |

## Electrode and channel physics

| Field | Value and source scope |
| --- | --- |
| Exposed site area | Unreported in reviewed sources |
| Electrode material | Gold recording contacts; tungsten microwire in separate stimulation variant |
| Impedance (with measurement frequency) | Standard electrode impedance unreported in reviewed figure/supplement text |
| Noise floor or SNR | No universal noise rating assigned; supplement states low-noise activity came from a fraction of 48 channels, showing 12 |
| Recording modality | Epicortical ECoG, including low-frequency oscillations and evoked responses; not broadband single-neuron acquisition |
| Sampling rate | 1 kHz, 8-bit ADC per recording chip |
| Stimulation capability | Separate biphasic current-source chips; Figure 4 protocol up to 25 µA/device, Figure 2 100/200/400 µs phases into 20 kΩ load |
| Charge injection limit | Validated charge-density limit unreported; example waveform/current is not a safety rating |
| Reference and ground | Recording differential between two on-chip electrodes; no distal wired reference required for this configuration |

## Tissue interface and bioresponse

| Field | Value and source scope |
| --- | --- |
| Target tissue | Epicortical tissue for recording; intracortical microwires for separate stimulation experiments |
| Insertion trauma and BBB disruption | Large craniotomy required; supplement says skin and skull not replaced during surgery for large stimulation construct. Closed-tissue attenuation simulation is not closed-skull demonstration |
| Vascular disruption risk | Unreported in reviewed sources |
| Micromotion sensitivity | Poor electrode-tissue contact/practical placement identified among reasons for noisy channels; quantified chronic motion tolerance unreported |
| Gliosis and encapsulation | Chronic histological response not established for 2021 acute configuration |
| Neuron loss near sites | Unreported in reviewed sources |
| Foreign-body response mitigation | Miniature distributed form factor and encapsulation are design features, not observed absence of foreign-body response |
| Typical failure modes | Higher-noise channels linked to imperfect tissue contact, cortical activity and ensemble placement limits; chronic hardware failure rates unreported |

## System architecture

| Field | Value and source scope |
| --- | --- |
| Onboard electronics | Recording ASIC: low-power amplifier, 8-bit ADC, address/state-machine/RF circuits and integrated coil. Stimulation ASIC has current-source circuit |
| Data path | Battery-free RF harvest; BPSK backscatter uplink with PUF chip addresses and TDMA; external SDR/power amplifier/duplexer and relay coil |
| Telemetry bandwidth | 10 Mbit/s uplink packet rate in timing budget; 8 kbit/s neural payload per recording chip. Not 10 Mbit/s neural content per chip |
| Sampling rate | 1 kHz per recording chip; 100 samples buffered as 800 bits/100 ms |
| Power | Less than 30 µW per chip budget in supplement; external transmitter power is separate. Approximately 1 GHz carrier, 915 MHz design selection |
| Thermal management | RF SAR simulations reported; measured chronic tissue heating unreported. Modeled exposures do not establish clinical safety |
| Packaging and hermeticity | Acute PDMS assembly; conformal ALD/thinned 0.01 mm³ earlier work is not the demonstrated 650 x 650 x 250 µm configuration or a multi-year recording lifetime |
| MRI compatibility | Unreported in reviewed sources |
| Surgical complexity | Craniotomy, distributed-chip placement, relay-coil/carrier positioning and optional intracortical wires; closed-skin/skull modeled link not assumed surgically demonstrated |
| Output connectors | No wired chip output to hub; wireless backscatter. External benchtop SDR/amplifier/duplexer connectors are not implanted chip connectors |

## Performance envelope

| Field | Value and source scope |
| --- | --- |
| Acute yield | All 48 recording chips activated/transmitted in PUF analysis; clear low-noise brain signals from only a fraction, 12 illustrated. Radio activation is not useful neural-channel yield |
| Chronic yield | Not established for 2021 recording ASIC; 2024 three-month stimulation branch is separate |
| Stability over time | Acute recordings; standardized chronic recording stability unreported |
| Longevity | Acute 2021 configuration, maximum implanted recording service life unreported |
| Revision and explant experience | Unreported in reviewed sources |
| Adverse events | No clinical adverse-event series or standardized chronic tissue safety assessment for 2021 configuration |
| Notable demonstrations | 48-chip acute rat recording; 64 autonomous TDMA chips and 32 call-and-response chips in distinct bench tests; 69-chip two-coil power/network demonstration is not 69 neural recording sites |

## Clinical and preclinical evidence

| Field | Value and source scope |
| --- | --- |
| Human subjects | None in reviewed 2021 study |
| Preclinical cohort | Acute rat cortical recording and separate stimulation experiments; unique animal count unreported in reviewed figures/supplement |
| Follow-up duration | Acute anesthetized recordings, not a chronic cohort |
| Indications | Preclinical distributed neural recording/stimulation platform |
| Trials and registries | Human registry not applicable to reported study |
| Primary outcomes | Individually addressed wireless ECoG, separate electrical microstimulation, RF powering/network scalability |
| Key limitations | Main body access-restricted in this audit; figures and full supplement reviewed. 425/588/770 are timing-budget estimates, not implanted animal counts; primate closed-tissue model is not primate recording |

## Engineering tradeoffs

| Field | Value and source scope |
| --- | --- |
| Strengths | Distributed placement, battery-free RF power and chip-level addressing |
| Limitations | Contact quality reduces usable-channel yield; external RF hardware and relay coil, acute packaging and unknown chronic recording lifetime |
| Scaling constraints | Timing, packet overhead, power uniformity, coil geometry and anatomy constrain network. 770-node optimized estimate is not measured 770-node in vivo system |

## Core interface specifications

The 12 fields follow the Blackrock Utah table for comparison, not a manufacturer-issued datasheet. Missing values remain unreported; inapplicable fields are marked. Configuration-specific details and limits follow below.

| Field | Specification and source scope |
| --- | --- |
| Electrode Pitch | No universal regular-array pitch: distributed chip placement; contact spacing not assigned here |
| Channel Count | One differential input per recording chip; 48-chip acute ensemble, clear low-noise signals from a fraction (12 illustrated) |
| Output Connectors | Wireless RF backscatter; no wired implant output connector. External SDR, power amplifier and duplexer are separate components |
| Output Conn. dimensions L x W x H | Not applicable to chip output connector; full external hub connector dimensions not reported here |
| Standard Electrode Lengths | Recording chip: no penetrating shank. Separate stimulation variant has optional intracortical tungsten microwires; length not assigned here |
| Impedance | No universal electrode impedance assigned from reviewed text; noise quality and impedance are separate fields |
| Array Dimensions | One Figure 1 chiplet 650 × 650 × 250 µm. Distributed ensemble area is not the footprint of one chip |
| Multi-Port Options | Not applicable as a multi-port order option; TDMA estimates 425/588/770 are scoped network-capacity calculations |
| Metalization | Recording interface: two gold electrodes. Stimulation variant: intracortical tungsten electrodes, not substituted for recording contacts |
| Wire Bundle Length | No implant-to-hub bundle. Optional stimulation microwires are tissue contacts, not a data cable |
| Reference and Ground | Recording differential between two on-chip electrodes; no distal wired reference required for that configuration |
| Insulation | PDMS encapsulation in acute assembly; ALD hermetic-packaging discussion is distinct and not proof of chronic operation |

## Identity and configuration

| Property | Published configuration |
| --- | --- |
| Primary authors | Jihun Lee, Vincent Leung, Ah-Hyoung Lee and colleagues; senior author Arto Nurmikko |
| Institutions | Brown University, Baylor University, Seoul National University, UC San Diego and Qualcomm |
| Primary paper | Nature Electronics 4:604-614, 2021 |
| Recording interface | Differential signal between two on-chip gold electrodes on the cortical surface |
| Stimulation interface | Separate current-source chips, with post-process tungsten microwires for intracortical access |
| Power | Battery-free RF harvesting from an external hub through a relay coil |
| Data | Backscatter uplink; individual chip addresses and TDMA networking |
| Animal evidence | Acute anesthetized rat cortical experiments |

## Geometry and contacts

| Property | Published specification and scope |
| --- | --- |
| Chiplet envelope | 650 × 650 × 250 µm in Figure 1 |
| Diced die footprint | Nominal 650 × 650 µm, including 75 µm between chip edge and coil for the seal ring, Supplementary Figure 1 |
| Stimulating ASIC image | 500 × 500 µm outer dimensions in Figure 2; not interchangeable with the Figure 1 package envelope |
| On-chip RF coil | Three turns; occupies 30% of a 500 × 500 µm footprint, Supplementary Figure 1 |
| Recording contacts | Two gold electrodes; no contact-area or pitch value assigned here |
| Intracortical access | Optional post-process microwire; its placement is not represented by the package box |
| Experimental assembly | Recording chips encapsulated in PDMS with a relay coil on a polyimide board, Figure 4 |
| External hub | Software-defined radio, power amplifier and duplexer on the benchtop; head-mounted coil components in vivo |

The institutional report describes a thumbprint-size scalp patch. The primary figures show the larger supporting RF electronics separately. Patch dimensions are not the size or weight of the complete experimental acquisition system. The supplement discusses approximately 0.1 mm³ chips and an earlier approximately 0.01 mm³ thinning/ALD-packaging result; the smaller number is not substituted for the demonstrated Figure 1 envelope.

## Electrical and system specifications

| Property | Published specification and condition |
| --- | --- |
| Carrier | Approximately 1 GHz; 915 MHz selected in the supplement's RF design discussion |
| Recording sample rate | 1 kHz per recording chip, Supplementary TDMA design |
| ADC resolution | 8 bits |
| Neural payload | 8 kbit/s per recording chip; 100 samples buffered as 800 bits per 100 ms |
| Uplink | BPSK backscatter; 10 Mbit/s communication rate in the packet-budget analysis, not a per-chip neural sample rate |
| Recording packet | Supplementary Figure 1 lists 32 LFSR test bits, 20 PUF-address bits and 800 ADC bits; TDMA analysis separately budgets address plus neural payload |
| Chip power budget | Less than 30 µW per chip in the supplement; not the external transmitter power |
| Stimulation waveform | Biphasic; Figure 2 shows 100, 200 and 400 µs per phase into a 20 kΩ load |
| Tissue stimulation | Up to 25 µA from each device in the Figure 4 protocol |
| Recording noise/impedance | No universal RMS noise or electrode impedance assigned from the reviewed source text |

The packet-content example includes test overhead while the TDMA capacity calculation treats an optimized payload. These are distinct accounting scopes, not evidence that every reported packet contains exactly the same bits. Do not equate the high-speed uplink with broadband single-neuron recording: the demonstrated recording chip samples at 1 kHz.

## Tissue interface and reliability

The recording chips measure epicortical ECoG; stimulation can penetrate using added tungsten wires. In Supplementary Figure 10, the authors say clear low-noise activity typically came from a fraction of the 48 channels, with 12 illustrated. Other channels had higher noise associated with tissue contact, cortical activity and practical ensemble placement. A 48-chip ensemble is not a claim of 48 equally usable simultaneous neural channels.

PDMS placement in the acute experiment and discussion of conformal hermetic ALD packaging do not establish multi-year implanted reliability. Chronic human tissue response and a clinical service life remain unknown for this 2021 configuration.

## Evidence and regulatory boundary

| Demonstration or estimate | Scope |
| --- | --- |
| 48 chips | Individually addressed acute rat cortical recording ensemble; channel-quality limitation retained above |
| 64 autonomous TDMA chips | Benchtop networking test within a 20.4 × 20.4 mm relay coil and 8 mm Tx-to-relay separation in air |
| 32 call-and-response chips | Separate benchtop networking test in Figure 3 |
| 69 chips | Two adjacent relay coils, Figure 5 power/network-area demonstration; not 69 recorded brain sites |
| 425 / 588 / 770 nodes | Supplementary call-and-response timing estimates: current exploratory timing, reduced gap without circuit changes, and more efficient packet/timeslot design respectively |
| Primate coil model | Proposed 8 mm link with 4 mm skin and 4 mm skull; not an implanted primate recording study |
| Rodent coil model | Targets 5 mm separation with 2.5 mm skin and 2.5 mm skull in the modeled link |

The abstract's potential 770-node scale is a calculation supported by link measurements, not a 770-device animal implant. SAR simulation and comparison with RF-exposure standards do not grant regulatory clearance. No implanted human use or cleared clinical neurograin system is established by these sources.

## Later stimulation branch

The same group's [2024 patterned-stimulation paper](https://www.nature.com/articles/s41467-024-54542-1) describes a later, remotely programmable microstimulator class with a new collision-free register-mapping downlink. It reports 30 stimulators implanted in a freely moving rat for three months. It uses 300, 400 and 500 µm die designs, mainly 500 µm chips in animal work, and up to 120 µA peak-to-peak stimulation.

That is later stimulation-only hardware, not an upgrade proving chronic operation of the 2021 recording ASIC. Its implanted population, current convention and packaging must not overwrite the 2021 sheet or its model. It is discussed here as a later branch, not silently counted as the same device or presented as a complete combined recording/stimulation generation.

## Model and missing specifications

The linked model is one 650 × 650 × 250 µm package envelope from Figure 1. It does not reconstruct contact pads, internal coil, optional microwires, relay coil or network layout. Zero exported model sites means contact coordinates were not reconstructed, not that the physical chip has no electrodes.

Contact area and spacing, full packaged electrode geometry, standardized chronic noise/impedance, complete external-system mass and clinical lifetime are not supplied here. The 2024 branch is not modeled by this 2021 cuboid.

## References

### Primary sources

- Lee J et al. [Neural recording and stimulation using wireless networks of microimplants](https://www.nature.com/articles/s41928-021-00631-8), Nature Electronics, 2021. Abstract and Figures [1](https://www.nature.com/articles/s41928-021-00631-8/figures/1), [2](https://www.nature.com/articles/s41928-021-00631-8/figures/2), [3](https://www.nature.com/articles/s41928-021-00631-8/figures/3), [4](https://www.nature.com/articles/s41928-021-00631-8/figures/4), [5](https://www.nature.com/articles/s41928-021-00631-8/figures/5).
- Lee J et al. [2021 Supplementary Information](https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41928-021-00631-8/MediaObjects/41928_2021_631_MOESM1_ESM.pdf), circuit variants, TDMA budget, chip power, recording-channel limitations and link models. The main article body is access-restricted; the figures and full supplement were reviewed directly.
- Brown University. [Institutional report](https://www.brown.edu/news/2021-08-12/neurograins), 12 August 2021.
- Lee AH et al. [Patterned electrical brain stimulation by a wireless network of implantable microdevices](https://www.nature.com/articles/s41467-024-54542-1), Nature Communications, 2024. Separate later stimulation branch.
