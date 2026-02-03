---
title: "Utah Microelectrode Array (UEA)"
order: 1
pubDate: 2026-02-03
updatedDate: 2026-02-03
description: "The classic intracortical silicon microelectrode array: 10×10 shank bed (typically 96 wired channels), high-quality spikes early, but challenging long-term stability."
modality: "Intracortical"
website: "https://blackrockneurotech.com/"
tags: ["BCI", "intracortical", "penetrating", "microelectrode array", "Utah Array", "UEA"]
draft: false
---

The **Utah Microelectrode Array (UEA)** (often called the **Utah Array**) is one of the most influential invasive BCI hardware designs ever built: a **penetrating, intracortical** silicon microelectrode array that has powered many landmark demonstrations in human BCI (cursor control, typing, robotic arm control).

This entry is an engineering-focused **device/design brief**: what it is, how it’s built, what it measures, and why it works (and fails) in chronic use.

## Identity

- **Device:** Utah Microelectrode Array (UEA)
- **Introduced:** ~1992 (prototype), ~1998 (human)
- **Inventor:** Richard Normann (University of Utah)
- **Manufacturer (modern):** Blackrock Neurotech
- **Interface type:** Intracortical, penetrating
- **Species:** Human, NHP, rodent
- **Regulatory posture:** Human research (IDE)
- **Use:** Recording + stimulation

## Physical architecture

- **Substrate:** Silicon
- **Form factor:** 10×10 needle bed
- **Footprint:** ~4 × 4 mm
- **Shank length (typical human motor cortex):** ~1.0–1.5 mm
- **Shank width:** ~80 µm
- **Shank spacing:** 400 µm
- **Tip geometry:** Sharpened silicon
- **Insertion:** Pneumatic impactor

## Electrode physics / signals

- **Channels (typical wired):** 96–128
- **Electrode material:** Platinum / iridium
- **Site area:** ~200–400 µm²
- **Impedance:** ~100–500 kΩ @ 1 kHz
- **Recording:** Single‑unit spikes + LFP
- **Stimulation:** Yes

## Tissue interaction (why chronic is hard)

- **Penetration → BBB disruption** (and local vascular/tissue trauma)
- **Micromotion mismatch**: rigid silicon vs soft brain → chronic shear at the interface
- **Gliosis/encapsulation** tends to increase over months
- **Neuron loss** near the shanks over time (often cited as substantial within ~100 µm)

**Practical consequence:** signal quality can be excellent early, but long-term stability and yield are often limiting.

## System architecture

- **Implant electronics:** None on‑chip (classic UEA)
- **Signal routing:** ~100 wires through skull
- **Connector:** Percutaneous pedestal
- **Wireless:** No
- **Power:** External
- **MRI safe:** No (assume not MRI compatible unless a specific system/configuration is explicitly cleared)

## Performance snapshot (typical narrative)

- **Spikes (early):** excellent
- **Long‑term stability:** poor to variable
- **Channel yield at ~1 year:** often reported around ~30–60% (highly context‑dependent)
- **Explantable:** yes
- **Revision surgeries:** not uncommon in long studies

## Clinical history

- **First human:** ~1998
- **BrainGate:** yes (a major early clinical research pipeline)
- **Humans implanted (order‑of‑magnitude):** >30 reported across programs
- **Applications:** paralysis, ALS, stroke
- **Famous results enabled:** robotic arms, typing, cursor control

## Notes / next upgrades

This entry is seeded from your structured spec. Next we’ll add:
- primary citations (Normann’s early UEA papers; chronic response reviews; BrainGate methods papers)
- a "variants" section (shank lengths, materials, coatings, wireless/packaging evolutions)
- clearer separation between *UEA hardware* vs the broader *NeuroPort/recording stack* used in studies
